import Patient from '../models/Patient.js';
import MedicalReport from '../models/MedicalReport.js';
import LabResult from '../models/LabResult.js';
import AuditLog from '../models/AuditLog.js';
import { detectConflicts } from '../services/conflictService.js';

// GET all patients for logged-in user
export const getPatients = async (req, res) => {
  try {
    const { search } = req.query;
    const query = { userId: req.user.uid };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { symptoms: { $regex: search, $options: 'i' } },
        { conditions: { $regex: search, $options: 'i' } },
      ];
    }

    const patients = await Patient.find(query).sort({ updatedAt: -1 });

    // Attach report counts
    const patientIds = patients.map((p) => p._id);
    const reportCounts = await MedicalReport.aggregate([
      { $match: { patientId: { $in: patientIds } } },
      { $group: { _id: '$patientId', count: { $sum: 1 }, pendingCount: { $sum: { $cond: [{ $eq: ['$verificationStatus', 'PENDING'] }, 1, 0] } } } },
    ]);

    const countMap = {};
    reportCounts.forEach((r) => {
      countMap[r._id.toString()] = { count: r.count, pending: r.pendingCount };
    });

    const enriched = patients.map((p) => ({
      ...p.toObject(),
      reportCount: countMap[p._id.toString()]?.count || 0,
      pendingReports: countMap[p._id.toString()]?.pending || 0,
    }));

    res.json({ success: true, count: enriched.length, patients: enriched });
  } catch (error) {
    console.error('getPatients Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve patient directory.' });
  }
};

// GET single patient
export const getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findOne({ _id: req.params.id, userId: req.user.uid });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    // Fetch reports
    const reports = await MedicalReport.find({ patientId: patient._id }).sort({ reportDate: -1, uploadedAt: -1 });

    // Fetch active lab results
    const labResults = await LabResult.find({ patientId: patient._id, isRejected: false })
      .populate('reportId', 'fileName reportDate verificationStatus')
      .sort({ createdAt: -1 });

    // Detect conflicts across latest data
    let conflicts = [];
    if (reports.length > 0) {
      const latestReport = reports[0];
      const latestTests = labResults.filter(
        (l) => l.reportId && l.reportId._id.toString() === latestReport._id.toString()
      );
      conflicts = await detectConflicts(
        patient,
        {
          patientInfo: latestReport.extractedPatientInfo,
          tests: latestTests,
          fileName: latestReport.fileName,
        },
        latestReport._id
      );
    }

    res.json({
      success: true,
      patient,
      reports,
      labResults,
      conflicts,
    });
  } catch (error) {
    console.error('getPatientById Error:', error);
    res.status(500).json({ success: false, message: 'Failed to load patient record.' });
  }
};

// CREATE new patient
export const createPatient = async (req, res) => {
  try {
    const {
      name,
      age,
      sex,
      dateOfBirth,
      symptoms,
      conditions,
      allergies,
      medications,
      notes,
      source,
      fieldProvenance,
    } = req.body;

    if (!name || age === undefined || age === null) {
      return res.status(400).json({ success: false, message: 'Patient name and age are required.' });
    }

    const patient = await Patient.create({
      userId: req.user.uid,
      name,
      age: Number(age),
      sex: sex || 'Male',
      dateOfBirth: dateOfBirth || '',
      symptoms: Array.isArray(symptoms) ? symptoms : symptoms ? symptoms.split(',').map((s) => s.trim()) : [],
      conditions: Array.isArray(conditions) ? conditions : conditions ? conditions.split(',').map((s) => s.trim()) : [],
      allergies: Array.isArray(allergies) ? allergies : allergies ? allergies.split(',').map((s) => s.trim()) : [],
      medications: Array.isArray(medications) ? medications : medications ? medications.split(',').map((s) => s.trim()) : [],
      notes: notes || '',
      source: source || 'USER_PROVIDED',
      fieldProvenance: fieldProvenance || {
        name: source === 'AI_EXTRACTED' ? 'Medical Report → AI Extracted' : 'USER_PROVIDED',
        age: source === 'AI_EXTRACTED' ? 'Medical Report → AI Extracted' : 'USER_PROVIDED',
        sex: source === 'AI_EXTRACTED' ? 'Medical Report → AI Extracted' : 'USER_PROVIDED',
        dateOfBirth: source === 'AI_EXTRACTED' ? 'Medical Report → AI Extracted' : 'USER_PROVIDED',
      },
    });

    await AuditLog.create({
      userId: req.user.uid,
      patientId: patient._id,
      action: 'CREATE',
      fieldChanged: 'patientProfile',
      newValue: { name: patient.name, age: patient.age },
      comment: `Patient profile intake created (Source: ${source || 'User Provided'})`,
    });

    res.status(201).json({ success: true, patient });
  } catch (error) {
    console.error('createPatient Error:', error);
    res.status(500).json({ success: false, message: 'Failed to create patient intake.' });
  }
};

// UPDATE patient
export const updatePatient = async (req, res) => {
  try {
    const patient = await Patient.findOne({ _id: req.params.id, userId: req.user.uid });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    const oldData = patient.toObject();
    const updatableFields = [
      'name',
      'age',
      'sex',
      'dateOfBirth',
      'symptoms',
      'conditions',
      'allergies',
      'medications',
      'notes',
      'source',
      'fieldProvenance',
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (['symptoms', 'conditions', 'allergies', 'medications'].includes(field) && typeof req.body[field] === 'string') {
          patient[field] = req.body[field].split(',').map((item) => item.trim()).filter(Boolean);
        } else {
          patient[field] = req.body[field];
        }
      }
    });

    await patient.save();

    await AuditLog.create({
      userId: req.user.uid,
      patientId: patient._id,
      action: 'EDIT',
      fieldChanged: 'patientProfile',
      oldValue: oldData,
      newValue: patient.toObject(),
      comment: 'Patient profile updated by reviewer',
    });

    res.json({ success: true, patient });
  } catch (error) {
    console.error('updatePatient Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update patient profile.' });
  }
};

// DELETE patient
export const deletePatient = async (req, res) => {
  try {
    const patient = await Patient.findOne({ _id: req.params.id, userId: req.user.uid });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    const reports = await MedicalReport.find({ patientId: patient._id });
    const reportIds = reports.map((r) => r._id);

    await LabResult.deleteMany({ reportId: { $in: reportIds } });
    await AuditLog.deleteMany({ patientId: patient._id });
    await MedicalReport.deleteMany({ patientId: patient._id });
    await Patient.deleteOne({ _id: patient._id });

    res.json({ success: true, message: 'Patient and associated records deleted.' });
  } catch (error) {
    console.error('deletePatient Error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete patient.' });
  }
};

// GET patient timeline
export const getPatientTimeline = async (req, res) => {
  try {
    const patient = await Patient.findOne({ _id: req.params.id, userId: req.user.uid });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    const auditLogs = await AuditLog.find({ patientId: patient._id }).sort({ timestamp: -1 });
    const reports = await MedicalReport.find({ patientId: patient._id }).sort({ reportDate: -1 });

    // Construct unified chronological timeline items
    const timelineEvents = [];

    // Patient created event
    timelineEvents.push({
      id: `intake-${patient._id}`,
      date: patient.createdAt,
      type: 'PATIENT_CREATED',
      title: 'Patient Intake Created',
      description: `Patient ${patient.name} (Age: ${patient.age}) registered with baseline clinical history.`,
      badge: 'User Provided',
      actor: 'Clinician / Intake Staff',
    });

    // Report upload & verification events
    reports.forEach((rep) => {
      timelineEvents.push({
        id: `upload-${rep._id}`,
        date: rep.uploadedAt,
        type: 'REPORT_UPLOADED',
        title: `Medical Report Uploaded: ${rep.fileName}`,
        description: `Source document uploaded for diagnostic extraction (${(rep.fileSize / 1024).toFixed(1)} KB).`,
        badge: 'Upload',
        reportId: rep._id,
        actor: 'Clinical Reviewer',
      });

      if (rep.summary?.generatedAt) {
        timelineEvents.push({
          id: `summary-${rep._id}`,
          date: rep.summary.generatedAt,
          type: 'SUMMARY_GENERATED',
          title: `AI Patient Summary Generated`,
          description: `Patient-friendly summary created with clinical non-diagnostic guardrails.`,
          badge: 'AI Generated',
          reportId: rep._id,
          actor: 'MedLens Clinical AI',
        });
      }

      if (rep.verificationStatus === 'VERIFIED') {
        timelineEvents.push({
          id: `verified-${rep._id}`,
          date: rep.updatedAt,
          type: 'REPORT_VERIFIED',
          title: `Clinical Report Verified`,
          description: `All laboratory findings reviewed and approved by certified clinical reviewer.`,
          badge: 'Human Verified',
          reportId: rep._id,
          actor: 'Clinician',
        });
      }
    });

    // Audit logs for edits
    auditLogs.forEach((log) => {
      if (log.action === 'EDIT') {
        timelineEvents.push({
          id: `audit-${log._id}`,
          date: log.timestamp,
          type: 'VALUE_EDITED',
          title: `Record Value Modified (${log.fieldChanged || 'Laboratory parameter'})`,
          description: log.comment || 'Value corrected during clinical verification process.',
          badge: 'Audit Trail',
          reportId: log.reportId,
          actor: 'Reviewer',
          oldValue: log.oldValue,
          newValue: log.newValue,
        });
      }
    });

    // Sort descending by date
    timelineEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ success: true, patient, timeline: timelineEvents });
  } catch (error) {
    console.error('getPatientTimeline Error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate clinical timeline.' });
  }
};

// GET report comparison data across time
export const getPatientComparison = async (req, res) => {
  try {
    const patient = await Patient.findOne({ _id: req.params.id, userId: req.user.uid });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    const reports = await MedicalReport.find({ patientId: patient._id }).sort({ reportDate: 1, uploadedAt: 1 });
    const labResults = await LabResult.find({ patientId: patient._id, isRejected: false })
      .populate('reportId', 'fileName reportDate')
      .sort({ createdAt: 1 });

    // Group lab results by standardized testName
    const testMap = {};

    labResults.forEach((r) => {
      const key = r.testName.trim();
      if (!testMap[key]) {
        testMap[key] = {
          testName: key,
          unit: r.unit,
          referenceRange: r.referenceRange,
          history: [],
        };
      }

      testMap[key].history.push({
        date: r.reportId?.reportDate || new Date(r.createdAt).toISOString().split('T')[0],
        value: r.value,
        numericValue: r.numericValue,
        unit: r.unit,
        status: r.status,
        referenceRange: r.referenceRange,
        reportFileName: r.reportId?.fileName || 'Report',
        verified: r.verified,
        source: r.source,
      });
    });

    // Calculate comparative deltas for common tests
    const comparisons = Object.values(testMap).map((testItem) => {
      const history = testItem.history;
      const latest = history[history.length - 1];
      const previous = history.length > 1 ? history[history.length - 2] : null;

      let delta = null;
      let changeText = 'Baseline measurement (no previous report)';

      if (previous && latest.numericValue != null && previous.numericValue != null) {
        delta = Number((latest.numericValue - previous.numericValue).toFixed(2));
        if (delta > 0) {
          changeText = `Value increased by +${delta} ${latest.unit} compared with the previous report (${previous.date}).`;
        } else if (delta < 0) {
          changeText = `Value decreased by ${delta} ${latest.unit} compared with the previous report (${previous.date}).`;
        } else {
          changeText = `Value remained identical (${latest.value} ${latest.unit}) compared with the previous report (${previous.date}).`;
        }
      }

      return {
        testName: testItem.testName,
        unit: testItem.unit,
        referenceRange: latest.referenceRange,
        current: latest,
        previous,
        delta,
        changeText,
        trendData: history.map((h) => ({
          date: h.date,
          value: h.numericValue != null ? h.numericValue : h.value,
          unit: h.unit,
          status: h.status,
        })),
        isMultiPoint: history.length > 1,
      };
    });

    res.json({
      success: true,
      patient,
      totalReports: reports.length,
      comparisons,
    });
  } catch (error) {
    console.error('getPatientComparison Error:', error);
    res.status(500).json({ success: false, message: 'Failed to construct comparison.' });
  }
};
