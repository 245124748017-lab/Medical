import fs from 'fs';
import path from 'path';
import MedicalReport from '../models/MedicalReport.js';
import Patient from '../models/Patient.js';
import LabResult from '../models/LabResult.js';
import AuditLog from '../models/AuditLog.js';
import { extractReportWithGemini, extractPatientDemographicsOnly } from '../services/geminiService.js';
import { detectConflicts } from '../services/conflictService.js';
import { generatePatientSummary } from '../services/summaryService.js';
import { validateReferenceRange } from '../utils/referenceValidator.js';

// Internal processor function
export const processReportInternal = async (reportId, userId) => {
  const report = await MedicalReport.findById(reportId);
  if (!report) throw new Error('Report not found');

  const patient = await Patient.findById(report.patientId);
  if (!patient) throw new Error('Patient not found');

  // Verify file exists on server disk
  if (!report.filePath || !fs.existsSync(report.filePath)) {
    report.processingStatus = 'FAILED';
    await report.save();
    const missingErr = new Error('Report document file is not found on disk. It may have been cleared by ephemeral storage. Please re-upload the report.');
    missingErr.code = 'FILE_NOT_FOUND';
    throw missingErr;
  }

  // Update status stepper
  report.processingStatus = 'ANALYZING';
  await report.save();

  // Extraction
  report.processingStatus = 'EXTRACTING';
  await report.save();

  let extraction;
  try {
    extraction = await extractReportWithGemini(
      report.filePath,
      report.fileType,
      report.fileName
    );
  } catch (aiErr) {
    if (aiErr.code === 'AI_PROCESSING_UNAVAILABLE' || aiErr.message?.includes('AI extraction is temporarily unavailable')) {
      report.processingStatus = 'AI_PROCESSING_UNAVAILABLE';
      report.isDemoFallback = false;
      report.demoFallbackReason = aiErr.safeReason || aiErr.message || null;
      await report.save();

      // Clear any prior lab results for this report
      await LabResult.deleteMany({ reportId: report._id });

      await AuditLog.create({
        userId: userId || 'system',
        patientId: patient._id,
        reportId: report._id,
        action: 'AI_PROCESSING_UNAVAILABLE',
        fieldChanged: 'processingStatus',
        newValue: 'AI_PROCESSING_UNAVAILABLE',
        comment: aiErr.safeReason || 'AI extraction temporarily unavailable. Clinician may review report manually.',
      });

      return {
        report,
        labResults: [],
        conflicts: [],
        summary: {
          text: '',
          keyObservations: [],
          abnormalFindings: [],
          missingInformation: [],
          disclaimer: aiErr.safeReason || 'AI extraction is temporarily unavailable. Please try again or review the uploaded report manually.',
        },
        error: 'AI_PROCESSING_UNAVAILABLE',
        message: aiErr.safeReason || 'AI extraction is temporarily unavailable. Please try again or review the uploaded report manually.',
      };
    }
    throw aiErr;
  }

  report.processingStatus = 'VALIDATING';
  await report.save();

  report.isDemoFallback = false;
  report.demoFallbackReason = null;

  const pInfo = extraction.patientInfo || {};
  const extractedName = pInfo.patientName || pInfo.name || null;
  const extractedAge = pInfo.age != null ? pInfo.age : null;
  const extractedSex = pInfo.sex || null;
  const extractedDob = pInfo.dob || null;

  report.extractedPatientInfo = {
    patientName: extractedName,
    name: extractedName,
    age: extractedAge,
    sex: extractedSex,
    dob: extractedDob,
    date: pInfo.reportDate || null,
  };
  if (pInfo.reportDate) {
    report.reportDate = pInfo.reportDate;
  }

  // Clear any existing results for re-processing
  await LabResult.deleteMany({ reportId: report._id });

  // Save extracted tests
  const testsToInsert = extraction.tests.map((t) => ({
    reportId: report._id,
    patientId: patient._id,
    testName: t.testName,
    value: t.value,
    numericValue: t.numericValue,
    unit: t.unit || '',
    referenceRange: t.referenceRange,
    status: t.status === 'UNKNOWN' ? 'CANNOT_DETERMINE' : t.status,
    observation: t.observation || '',
    confidence: t.confidence || 0.95,
    source: 'AI_EXTRACTED',
    provenanceTrail: [
      {
        stage: 'AI_EXTRACTED',
        actor: 'MedLens Gemini (gemini-3.1-flash-lite)',
        note: `Extracted from ${report.fileName}`,
      },
    ],
    verified: false,
  }));

  const savedLabResults = await LabResult.insertMany(testsToInsert);

  // Detect conflicts between patient profile and extracted report data
  const conflicts = await detectConflicts(patient, extraction, report._id);

  // Identity Check: if name mismatch detected, flag as MISMATCH_PENDING
  const hasIdentityMismatch = conflicts.some((c) => c.type === 'PATIENT_NAME_MISMATCH');
  if (hasIdentityMismatch) {
    report.identityStatus = 'MISMATCH_PENDING';
  } else {
    report.identityStatus = 'MATCHED';
    // If patient profile was missing demographics and report has them, safely autofill with provenance
    let profileUpdated = false;
    if (!patient.name && extractedName) {
      patient.name = extractedName;
      patient.fieldProvenance = patient.fieldProvenance || {};
      patient.fieldProvenance.name = 'Medical Report → AI Extracted';
      patient.source = 'AI_EXTRACTED';
      profileUpdated = true;
    }
    if ((patient.age === null || patient.age === undefined) && extractedAge != null) {
      patient.age = extractedAge;
      patient.fieldProvenance = patient.fieldProvenance || {};
      patient.fieldProvenance.age = 'Medical Report → AI Extracted';
      profileUpdated = true;
    }
    if ((!patient.sex || patient.sex === 'Prefer not to say') && extractedSex) {
      patient.sex = extractedSex;
      patient.fieldProvenance = patient.fieldProvenance || {};
      patient.fieldProvenance.sex = 'Medical Report → AI Extracted';
      profileUpdated = true;
    }
    if (!patient.dateOfBirth && extractedDob) {
      patient.dateOfBirth = extractedDob;
      patient.fieldProvenance = patient.fieldProvenance || {};
      patient.fieldProvenance.dateOfBirth = 'Medical Report → AI Extracted';
      profileUpdated = true;
    }
    if (profileUpdated) {
      await patient.save();
    }
  }

  // Generate patient-friendly AI summary with safety guardrails
  const summary = await generatePatientSummary(savedLabResults, patient.name);
  report.summary = summary;
  report.processingStatus = 'READY_FOR_REVIEW';
  report.verificationStatus = 'PENDING';
  await report.save();

  // Record audit log
  await AuditLog.create({
    userId: userId || 'system',
    patientId: patient._id,
    reportId: report._id,
    action: 'EXTRACT',
    fieldChanged: 'labResults',
    newValue: `${savedLabResults.length} test parameters extracted`,
    comment: 'Gemini AI automated extraction and reference validation completed',
  });

  return { report, labResults: savedLabResults, conflicts, summary };
};

// POST /api/reports/upload
export const uploadReportFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a medical report file.' });
    }

    const { patientId, reportDate } = req.body;
    if (!patientId) {
      return res.status(400).json({ success: false, message: 'Patient selection is required for upload.' });
    }

    const patient = await Patient.findOne({ _id: patientId, userId: req.user.uid });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found or unauthorized.' });
    }

    const report = await MedicalReport.create({
      patientId: patient._id,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      filePath: req.file.path,
      fileSize: req.file.size,
      reportDate: reportDate || new Date().toISOString().split('T')[0],
      processingStatus: 'UPLOADING',
    });

    await AuditLog.create({
      userId: req.user.uid,
      patientId: patient._id,
      reportId: report._id,
      action: 'UPLOAD',
      fieldChanged: 'documentFile',
      newValue: req.file.originalname,
      comment: `Uploaded medical document: ${req.file.originalname}`,
    });

    // Process asynchronously or return report with processing begun
    try {
      const processed = await processReportInternal(report._id, req.user.uid);
      return res.status(201).json({
        success: true,
        message: 'Report uploaded and processed successfully.',
        report: processed.report,
        labResults: processed.labResults,
        conflicts: processed.conflicts,
      });
    } catch (procErr) {
      console.error('Report processing failed:', procErr);
      report.processingStatus = 'FAILED';
      await report.save();
      return res.status(200).json({
        success: true,
        message: "We couldn't process this report automatically. Please try again or review the report manually.",
        report,
      });
    }
  } catch (error) {
    console.error('uploadReportFile Error:', error);
    res.status(500).json({ success: false, message: 'File upload encountered an internal error.' });
  } finally {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupErr) {
        console.warn('Ephemeral upload cleanup notice:', cleanupErr.message);
      }
    }
  }
};

// GET /api/reports/:id
export const getReportById = async (req, res) => {
  try {
    const report = await MedicalReport.findById(req.params.id).populate('patientId');
    if (!report) {
      return res.status(404).json({ success: false, message: 'Medical report not found.' });
    }

    const labResults = await LabResult.find({ reportId: report._id }).sort({ createdAt: 1 });
    const auditLogs = await AuditLog.find({ reportId: report._id }).sort({ timestamp: -1 });

    const conflicts = await detectConflicts(
      report.patientId,
      {
        patientInfo: report.extractedPatientInfo,
        tests: labResults,
        fileName: report.fileName,
      },
      report._id
    );

    res.json({
      success: true,
      report,
      patient: report.patientId,
      labResults,
      conflicts,
      auditLogs,
    });
  } catch (error) {
    console.error('getReportById Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve report.' });
  }
};

// POST /api/reports/:id/process (re-trigger processing)
export const processReport = async (req, res) => {
  try {
    const processed = await processReportInternal(req.params.id, req.user.uid);
    res.json({
      success: true,
      report: processed.report,
      labResults: processed.labResults,
      conflicts: processed.conflicts,
    });
  } catch (error) {
    console.error('processReport Error:', error);
    res.status(500).json({
      success: false,
      message: "We couldn't process this report automatically. Please try again or review the report manually.",
    });
  }
};

// POST /api/reports/:id/verify (Human verification and edit tracking)
export const verifyReport = async (req, res) => {
  try {
    const { results = [], notes, confirmIdentityMismatch } = req.body;
    const report = await MedicalReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    // Ownership check: Prevent merging into patient record if identity mismatch is unresolved
    if (report.identityStatus === 'MISMATCH_PENDING' && !confirmIdentityMismatch) {
      return res.status(400).json({
        success: false,
        code: 'IDENTITY_MISMATCH_UNRESOLVED',
        message: 'Patient identity mismatch detected. Please verify that this report belongs to the selected patient before merging into clinical records.',
      });
    }

    const reviewerName = req.user.name || 'Clinical Reviewer';

    // Process each result submitted
    for (const item of results) {
      const existing = await LabResult.findById(item._id);
      if (!existing) continue;

      if (item.isRejected) {
        existing.isRejected = true;
        existing.verified = false;
        await existing.save();

        await AuditLog.create({
          userId: req.user.uid,
          patientId: report.patientId,
          reportId: report._id,
          labResultId: existing._id,
          action: 'REJECT',
          fieldChanged: 'status',
          oldValue: existing.status,
          newValue: 'REJECTED',
          comment: `Result rejected by reviewer (${reviewerName})`,
        });
        continue;
      }

      // Check if values were modified
      let wasModified = false;
      const edits = [];

      if (item.testName && item.testName !== existing.testName) {
        edits.push({ field: 'testName', old: existing.testName, new: item.testName });
        existing.testName = item.testName;
        wasModified = true;
      }

      if (item.value !== undefined && item.value != existing.value) {
        edits.push({ field: 'value', old: existing.value, new: item.value });
        existing.value = item.value;
        existing.numericValue = typeof item.value === 'number' ? item.value : parseFloat(item.value) || null;
        wasModified = true;
      }

      if (item.unit !== undefined && item.unit !== existing.unit) {
        edits.push({ field: 'unit', old: existing.unit, new: item.unit });
        existing.unit = item.unit;
        wasModified = true;
      }

      if (item.referenceRange !== undefined) {
        const oldRef = existing.referenceRange?.rawText;
        const newRef = (typeof item.referenceRange === 'string' ? item.referenceRange : item.referenceRange?.rawText || '').trim();
        if (newRef && newRef !== oldRef) {
          const validated = validateReferenceRange(existing.value, { rawText: newRef });
          edits.push({ field: 'referenceRange', old: oldRef, new: newRef });
          existing.referenceRange = validated.referenceRange;
          existing.status = validated.status;
          wasModified = true;
        } else if (!newRef && existing.referenceRange !== null) {
          edits.push({ field: 'referenceRange', old: oldRef, new: null });
          existing.referenceRange = null;
          existing.status = 'CANNOT_DETERMINE';
          wasModified = true;
        }
      }

      if (item.status && item.status !== existing.status) {
        edits.push({ field: 'status', old: existing.status, new: item.status });
        existing.status = item.status;
        wasModified = true;
      }

      // Log edits to audit trail
      for (const edit of edits) {
        await AuditLog.create({
          userId: req.user.uid,
          patientId: report.patientId,
          reportId: report._id,
          labResultId: existing._id,
          action: 'EDIT',
          fieldChanged: `${existing.testName} -> ${edit.field}`,
          oldValue: edit.old,
          newValue: edit.new,
          comment: `Edited by ${reviewerName}`,
        });
      }

      // Mark verified
      existing.verified = true;
      existing.verifiedBy = reviewerName;
      existing.verifiedAt = new Date();
      existing.source = 'HUMAN_VERIFIED';
      existing.provenanceTrail.push({
        stage: 'HUMAN_VERIFIED',
        actor: reviewerName,
        note: wasModified ? 'Edited and verified by reviewer' : 'Verified as accurate by reviewer',
      });

      await existing.save();
    }

    report.verificationStatus = 'VERIFIED';
    report.processingStatus = 'VERIFIED';
    if (report.identityStatus === 'MISMATCH_PENDING' && confirmIdentityMismatch) {
      report.identityStatus = 'MISMATCH_RESOLVED';
    }
    await report.save();

    await AuditLog.create({
      userId: req.user.uid,
      patientId: report.patientId,
      reportId: report._id,
      action: 'VERIFY',
      fieldChanged: 'reportVerification',
      newValue: 'VERIFIED',
      comment: notes || `Report verified and approved by ${reviewerName}`,
    });

    const updatedLabResults = await LabResult.find({ reportId: report._id, isRejected: false });

    // Regenerate summary based on verified values
    const patient = await Patient.findById(report.patientId);
    if (patient) {
      report.summary = await generatePatientSummary(updatedLabResults, patient.name);
      await report.save();
    }

    res.json({
      success: true,
      message: 'Report and laboratory findings successfully verified.',
      report,
      labResults: updatedLabResults,
    });
  } catch (error) {
    console.error('verifyReport Error:', error);
    res.status(500).json({ success: false, message: 'Failed to finalize report verification.' });
  }
};

// POST /api/reports/:id/resolve-identity
export const resolveReportIdentity = async (req, res) => {
  try {
    const { action, manualData } = req.body;
    const report = await MedicalReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    const patient = await Patient.findById(report.patientId);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    const reviewer = req.user?.name || 'Clinical Reviewer';
    const oldProfile = patient.toObject();

    if (action === 'useReport') {
      const extracted = report.extractedPatientInfo || {};
      if (extracted.name || extracted.patientName) {
        patient.name = extracted.patientName || extracted.name;
        patient.fieldProvenance = patient.fieldProvenance || {};
        patient.fieldProvenance.name = 'Medical Report → AI Extracted';
      }
      if (extracted.age != null) {
        patient.age = Number(extracted.age);
        patient.fieldProvenance = patient.fieldProvenance || {};
        patient.fieldProvenance.age = 'Medical Report → AI Extracted';
      }
      if (extracted.sex) {
        patient.sex = extracted.sex;
        patient.fieldProvenance = patient.fieldProvenance || {};
        patient.fieldProvenance.sex = 'Medical Report → AI Extracted';
      }
      if (extracted.dob) {
        patient.dateOfBirth = extracted.dob;
        patient.fieldProvenance = patient.fieldProvenance || {};
        patient.fieldProvenance.dateOfBirth = 'Medical Report → AI Extracted';
      }
      patient.source = 'AI_EXTRACTED';
      await patient.save();

      report.identityStatus = 'MISMATCH_RESOLVED';
      await report.save();

      await AuditLog.create({
        userId: req.user.uid,
        patientId: patient._id,
        reportId: report._id,
        action: 'EDIT',
        fieldChanged: 'patientProfile',
        oldValue: oldProfile,
        newValue: patient.toObject(),
        comment: `Profile updated using extracted report demographics by ${reviewer} (Source: Medical Report → AI Extracted)`,
      });

      return res.json({
        success: true,
        message: 'Patient profile successfully updated with report information.',
        patient,
        report,
      });
    } else if (action === 'keepExisting') {
      report.identityStatus = 'MISMATCH_RESOLVED';
      await report.save();

      await AuditLog.create({
        userId: req.user.uid,
        patientId: patient._id,
        reportId: report._id,
        action: 'IDENTITY_CONFIRMED',
        fieldChanged: 'identityStatus',
        newValue: 'MISMATCH_RESOLVED',
        comment: `Reviewer ${reviewer} confirmed keeping existing patient profile values. Identity discrepancy resolved.`,
      });

      return res.json({
        success: true,
        message: 'Existing patient profile preserved. Report identity verified.',
        patient,
        report,
      });
    } else if (action === 'manualEdit' && manualData) {
      if (manualData.name) {
        patient.name = manualData.name.trim();
        patient.fieldProvenance = patient.fieldProvenance || {};
        patient.fieldProvenance.name = 'USER_PROVIDED';
      }
      if (manualData.age != null) {
        patient.age = Number(manualData.age);
        patient.fieldProvenance = patient.fieldProvenance || {};
        patient.fieldProvenance.age = 'USER_PROVIDED';
      }
      if (manualData.sex) {
        patient.sex = manualData.sex;
        patient.fieldProvenance = patient.fieldProvenance || {};
        patient.fieldProvenance.sex = 'USER_PROVIDED';
      }
      if (manualData.dateOfBirth) {
        patient.dateOfBirth = manualData.dateOfBirth;
        patient.fieldProvenance = patient.fieldProvenance || {};
        patient.fieldProvenance.dateOfBirth = 'USER_PROVIDED';
      }
      patient.source = 'USER_PROVIDED';
      await patient.save();

      report.identityStatus = 'MISMATCH_RESOLVED';
      await report.save();

      await AuditLog.create({
        userId: req.user.uid,
        patientId: patient._id,
        reportId: report._id,
        action: 'EDIT',
        fieldChanged: 'patientProfile',
        oldValue: oldProfile,
        newValue: patient.toObject(),
        comment: `Patient profile manually adjusted by ${reviewer} during identity review.`,
      });

      return res.json({
        success: true,
        message: 'Patient profile manually updated.',
        patient,
        report,
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid action provided.' });
  } catch (error) {
    console.error('resolveReportIdentity Error:', error);
    res.status(500).json({ success: false, message: 'Failed to resolve identity conflict.' });
  }
};

// POST /api/reports/:id/manual-result
export const addManualLabResult = async (req, res) => {
  try {
    const { testName, value, unit, referenceRange, status, observation } = req.body;
    const report = await MedicalReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });

    if (!testName || value === undefined) {
      return res.status(400).json({ success: false, message: 'Test name and numeric value are required.' });
    }

    const validated = validateReferenceRange(value, { rawText: referenceRange });

    const newResult = await LabResult.create({
      reportId: report._id,
      patientId: report.patientId,
      testName: testName.trim(),
      value,
      numericValue: typeof value === 'number' ? value : parseFloat(value) || null,
      unit: (unit || '').trim(),
      referenceRange: validated.referenceRange,
      status: validated.status === 'UNKNOWN' ? 'CANNOT_DETERMINE' : (status || validated.status),
      observation: observation || validated.observation || '',
      confidence: 1.0,
      source: 'USER_PROVIDED',
      verified: false,
      provenanceTrail: [
        {
          stage: 'USER_PROVIDED',
          actor: req.user?.name || 'Clinician Reviewer',
          note: 'Manually entered diagnostic parameter',
        },
      ],
    });

    res.status(201).json({ success: true, labResult: newResult });
  } catch (error) {
    console.error('addManualLabResult Error:', error);
    res.status(500).json({ success: false, message: 'Failed to add manual result.' });
  }
};

// POST /api/reports/extract-preview
export const extractIntakePreview = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Medical report document file is required.' });
    }

    try {
      const patientInfo = await extractPatientDemographicsOnly(req.file.path, req.file.mimetype);
      return res.json({
        success: true,
        patientInfo,
      });
    } catch (aiErr) {
      if (aiErr.code === 'AI_PROCESSING_UNAVAILABLE' || aiErr.message?.includes('AI extraction is temporarily unavailable')) {
        return res.status(200).json({
          success: false,
          code: 'AI_PROCESSING_UNAVAILABLE',
          message: aiErr.safeReason || 'AI extraction is temporarily unavailable. Please try again or review the uploaded report manually.',
        });
      }
      throw aiErr;
    }
  } catch (error) {
    console.error('extractIntakePreview Error:', error);
    return res.status(200).json({
      success: false,
      code: 'AI_PROCESSING_UNAVAILABLE',
      message: error.safeReason || error.message || 'AI extraction is temporarily unavailable. Please try again or review the uploaded report manually.',
    });
  } finally {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupErr) {
        console.warn('Temporary intake file cleanup notice:', cleanupErr.message);
      }
    }
  }
};

