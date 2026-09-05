import LabResult from '../models/LabResult.js';
import MedicalReport from '../models/MedicalReport.js';

/**
 * Detects conflicts between Patient Profile, Extracted Report Data, and Prior Records.
 */
export const detectConflicts = async (patient, extractedData, currentReportId = null) => {
  const conflicts = [];
  const extractedPatient = extractedData?.patientInfo || {};
  const extractedTests = extractedData?.tests || [];

  const extractedName = extractedPatient.patientName || extractedPatient.name || null;

  // 1. Name Discrepancy / Patient Identity Mismatch Detection
  if (extractedName && patient.name) {
    const normProfile = patient.name.toLowerCase().trim();
    const normExtracted = extractedName.toLowerCase().trim();
    if (!normProfile.includes(normExtracted) && !normExtracted.includes(normProfile)) {
      conflicts.push({
        type: 'PATIENT_NAME_MISMATCH',
        severity: 'HIGH',
        title: 'Patient Identity Mismatch Detected',
        message: 'Patient identity mismatch detected. Please verify that this report belongs to the selected patient.',
        details: 'Information from uploaded report differs from the current patient profile.',
        profileValue: patient.name,
        reportValue: extractedName,
        currentProfile: {
          name: patient.name,
          age: patient.age,
          sex: patient.sex,
        },
        reportData: {
          name: extractedName,
          age: extractedPatient.age,
          sex: extractedPatient.sex,
        },
        field: 'name',
        recommendation: 'Ensure this report belongs to the selected patient profile before merging into clinical records.',
      });
    }
  }

  // 2. Age Conflict Detection
  if (
    extractedPatient.age != null &&
    patient.age != null &&
    Math.abs(Number(extractedPatient.age) - Number(patient.age)) >= 1
  ) {
    conflicts.push({
      type: 'PATIENT_AGE_MISMATCH',
      severity: 'HIGH',
      title: 'Patient Age Inconsistency',
      message: `Patient profile says age is ${patient.age}, but the uploaded report states age ${extractedPatient.age}.`,
      details: 'Information from uploaded report differs from the current patient profile.',
      profileValue: patient.age,
      reportValue: extractedPatient.age,
      currentProfile: {
        name: patient.name,
        age: patient.age,
        sex: patient.sex,
      },
      reportData: {
        name: extractedName || patient.name,
        age: extractedPatient.age,
        sex: extractedPatient.sex,
      },
      field: 'age',
      recommendation: 'Verify date of birth with patient identity records before clinical review.',
    });
  }

  // 3. Duplicate Report Detection
  if (extractedData?.fileName) {
    const existingSameName = await MedicalReport.findOne({
      patientId: patient._id,
      fileName: extractedData.fileName,
      _id: { $ne: currentReportId },
    });
    if (existingSameName) {
      conflicts.push({
        type: 'DUPLICATE_REPORT_POSSIBLE',
        severity: 'MEDIUM',
        title: 'Possible Duplicate Report',
        message: `A report named "${extractedData.fileName}" was already uploaded on ${new Date(existingSameName.uploadedAt).toLocaleDateString()}.`,
        field: 'fileName',
        recommendation: 'Check if this report was already processed to avoid double-counting laboratory results.',
      });
    }
  }

  // 4. Reference Range Differences between Reports
  if (patient._id && extractedTests.length > 0) {
    const priorLabResults = await LabResult.find({
      patientId: patient._id,
      reportId: { $ne: currentReportId },
      isRejected: false,
    }).sort({ createdAt: -1 });

    const priorTestMap = {};
    priorLabResults.forEach((r) => {
      const key = r.testName.toLowerCase().trim();
      if (!priorTestMap[key]) {
        priorTestMap[key] = r;
      }
    });

    extractedTests.forEach((currentTest) => {
      const key = currentTest.testName.toLowerCase().trim();
      const prior = priorTestMap[key];
      if (prior) {
        // Compare reference ranges
        const priorRaw = (prior.referenceRange?.rawText || '').trim();
        const currentRaw = (currentTest.referenceRange?.rawText || '').trim();

        if (
          priorRaw &&
          currentRaw &&
          priorRaw !== 'Not provided in source report' &&
          currentRaw !== 'Not provided in source report' &&
          priorRaw !== currentRaw
        ) {
          conflicts.push({
            type: 'REFERENCE_RANGE_DIFFERENCE',
            severity: 'INFO',
            title: `Reference Range Variation: ${currentTest.testName}`,
            message: `Previous report used range "${priorRaw}", while this report uses "${currentRaw}". Different diagnostic laboratories often establish differing reference intervals.`,
            field: currentTest.testName,
            recommendation: 'Evaluate trends taking differing laboratory reference standards into consideration.',
          });
        }
      }
    });
  }

  return conflicts;
};
