import Patient from '../models/Patient.js';
import MedicalReport from '../models/MedicalReport.js';
import LabResult from '../models/LabResult.js';
import AuditLog from '../models/AuditLog.js';

export const seedDemoData = async (userId = 'demo_user_clinician_01') => {
  try {
    // Check if demo patient already exists for this user
    let patient = await Patient.findOne({ userId, name: 'Robert Vance (DEMO PATIENT)' });

    if (patient) {
      // Clean up previous demo data for fresh reload
      const oldReports = await MedicalReport.find({ patientId: patient._id });
      const reportIds = oldReports.map((r) => r._id);
      await LabResult.deleteMany({ reportId: { $in: reportIds } });
      await AuditLog.deleteMany({ patientId: patient._id });
      await MedicalReport.deleteMany({ patientId: patient._id });
      await Patient.deleteOne({ _id: patient._id });
    }

    // 1. Create Demo Patient (Age 42 in profile to demonstrate age conflict with 45 in current report)
    patient = await Patient.create({
      userId,
      name: 'Robert Vance (DEMO PATIENT)',
      age: 42, // Deliberate conflict: Profile is 42, report is 45
      sex: 'Male',
      dateOfBirth: '1984-06-14',
      symptoms: ['Mild fatigue', 'Postprandial sluggishness', 'Occasional dizziness'],
      conditions: ['Essential Hypertension (managed)', 'Prediabetes surveillance'],
      allergies: ['Penicillin', 'Sulfa drugs'],
      medications: ['Lisinopril 10mg daily', 'Multivitamin oral tablet'],
      notes: 'Follow-up visit for routine metabolic surveillance and anemia evaluation. Patient reports adhering to low-sodium diet.',
      source: 'USER_PROVIDED',
    });

    // Audit log for patient creation
    await AuditLog.create({
      userId,
      patientId: patient._id,
      action: 'CREATE',
      fieldChanged: 'patientProfile',
      oldValue: null,
      newValue: { name: patient.name, age: patient.age },
      comment: 'Demo patient profile created by clinician',
      timestamp: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
    });

    // 2. Report 1 (Historical baseline - 30 days ago)
    const report1 = await MedicalReport.create({
      patientId: patient._id,
      fileName: 'vance_metabolic_baseline_aug2026.pdf',
      fileType: 'application/pdf',
      filePath: 'uploads/demo_baseline.pdf',
      fileSize: 245760,
      reportDate: '2026-08-05',
      uploadedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      processingStatus: 'VERIFIED',
      verificationStatus: 'VERIFIED',
      extractedPatientInfo: {
        name: 'Robert Vance',
        age: 42,
        sex: 'Male',
        date: '2026-08-05',
      },
      summary: {
        text: 'Baseline metabolic panel consisting of 4 tests. All parameters were within expected reference intervals except for borderline elevated fasting glucose.',
        keyObservations: [
          'Fasting blood glucose slightly above reference limit (104 mg/dL)',
          'Hemoglobin normal at 12.8 g/dL',
          'Platelet count normal at 260 10^3/µL',
        ],
        abnormalFindings: ['Fasting Blood Glucose: 104 mg/dL (HIGH)'],
        missingInformation: [],
        disclaimer: 'AI-generated summary — verify important information with a qualified healthcare professional.',
        generatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Baseline Lab Results
    await LabResult.create([
      {
        reportId: report1._id,
        patientId: patient._id,
        testName: 'Hemoglobin',
        value: 12.8,
        numericValue: 12.8,
        unit: 'g/dL',
        referenceRange: { min: 12.0, max: 16.0, rawText: '12.0 - 16.0 g/dL' },
        status: 'NORMAL',
        observation: 'Within source reference range (12.0 - 16.0 g/dL).',
        confidence: 0.99,
        source: 'HUMAN_VERIFIED',
        verified: true,
        verifiedBy: 'Dr. Sarah Lin, MD',
        verifiedAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
      },
      {
        reportId: report1._id,
        patientId: patient._id,
        testName: 'Fasting Blood Glucose',
        value: 104,
        numericValue: 104,
        unit: 'mg/dL',
        referenceRange: { min: 70, max: 99, rawText: '70 - 99 mg/dL' },
        status: 'HIGH',
        observation: 'Above source reference range (70 - 99 mg/dL).',
        confidence: 0.98,
        source: 'HUMAN_VERIFIED',
        verified: true,
        verifiedBy: 'Dr. Sarah Lin, MD',
        verifiedAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
      },
      {
        reportId: report1._id,
        patientId: patient._id,
        testName: 'Platelet Count',
        value: 260,
        numericValue: 260,
        unit: '10^3/µL',
        referenceRange: { min: 150, max: 450, rawText: '150 - 450 10^3/µL' },
        status: 'NORMAL',
        observation: 'Within source reference range (150 - 450 10^3/µL).',
        confidence: 0.99,
        source: 'HUMAN_VERIFIED',
        verified: true,
        verifiedBy: 'Dr. Sarah Lin, MD',
        verifiedAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
      },
    ]);

    // 3. Report 2 (Current follow-up report - 3 days ago)
    const report2 = await MedicalReport.create({
      patientId: patient._id,
      fileName: 'vance_complete_panel_sep2026.pdf',
      fileType: 'application/pdf',
      filePath: 'uploads/demo_current.pdf',
      fileSize: 312400,
      reportDate: '2026-09-02',
      uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      processingStatus: 'READY_FOR_REVIEW',
      verificationStatus: 'PENDING',
      extractedPatientInfo: {
        name: 'Robert Vance',
        age: 45, // Conflict: 45 vs profile 42
        sex: 'Male',
        date: '2026-09-02',
      },
      summary: {
        text: 'The current follow-up report contains 5 diagnostic laboratory findings. Compared to previous evaluation, Hemoglobin has declined below stated laboratory reference thresholds, and Fasting Glucose exhibits upward progression. One test (Serum Ferritin) is reported without laboratory reference intervals.',
        keyObservations: [
          '5 total tests extracted from source report',
          'Hemoglobin is below source reference range (11.2 g/dL vs 12.0 - 16.0 g/dL)',
          'Fasting Glucose is above source reference range (128 mg/dL vs 70 - 99 mg/dL)',
          'Platelet Count remains within normal reference range (245 10^3/µL)',
          'Serum Ferritin was reported without reference intervals in source document (Status: Unknown)',
        ],
        abnormalFindings: [
          'Hemoglobin: 11.2 g/dL (LOW)',
          'Fasting Blood Glucose: 128 mg/dL (HIGH)',
        ],
        missingInformation: [
          'Serum Ferritin: Reference range not provided in source report',
        ],
        disclaimer: 'AI-generated summary — verify important information with a qualified healthcare professional. Not for medical diagnosis or treatment.',
        generatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      isDemoFallback: true,
    });

    // Current Lab Results (Low, High, Normal, Unknown, plus cholesterol)
    await LabResult.create([
      {
        reportId: report2._id,
        patientId: patient._id,
        testName: 'Hemoglobin',
        value: 11.2,
        numericValue: 11.2,
        unit: 'g/dL',
        referenceRange: { min: 12.0, max: 16.0, rawText: '12.0 - 16.0 g/dL' },
        status: 'LOW',
        observation: 'Below the reference range stated in the report (12.0 - 16.0 g/dL).',
        confidence: 0.98,
        source: 'AI_EXTRACTED',
        provenanceTrail: [
          {
            stage: 'AI_EXTRACTED',
            actor: 'MedLens Gemini Vision Model',
            note: 'Extracted from vance_complete_panel_sep2026.pdf',
          },
        ],
        verified: false,
      },
      {
        reportId: report2._id,
        patientId: patient._id,
        testName: 'Fasting Blood Glucose',
        value: 128,
        numericValue: 128,
        unit: 'mg/dL',
        referenceRange: { min: 70, max: 99, rawText: '70 - 99 mg/dL' },
        status: 'HIGH',
        observation: 'Above the reference range stated in the report (70 - 99 mg/dL).',
        confidence: 0.97,
        source: 'AI_EXTRACTED',
        provenanceTrail: [
          {
            stage: 'AI_EXTRACTED',
            actor: 'MedLens Gemini Vision Model',
            note: 'Extracted from vance_complete_panel_sep2026.pdf',
          },
        ],
        verified: false,
      },
      {
        reportId: report2._id,
        patientId: patient._id,
        testName: 'Platelet Count',
        value: 245,
        numericValue: 245,
        unit: '10^3/µL',
        referenceRange: { min: 150, max: 450, rawText: '150 - 450 10^3/µL' },
        status: 'NORMAL',
        observation: 'Within the reference range stated in the report (150 - 450 10^3/µL).',
        confidence: 0.99,
        source: 'AI_EXTRACTED',
        provenanceTrail: [
          {
            stage: 'AI_EXTRACTED',
            actor: 'MedLens Gemini Vision Model',
            note: 'Extracted from vance_complete_panel_sep2026.pdf',
          },
        ],
        verified: false,
      },
      {
        testName: 'Serum Ferritin',
        reportId: report2._id,
        patientId: patient._id,
        value: 18.5,
        numericValue: 18.5,
        unit: 'ng/mL',
        referenceRange: null, // Strictly null when not in source report
        status: 'CANNOT_DETERMINE',
        observation: 'Reference range not provided in source report. Status cannot be determined.',
        confidence: 0.94,
        source: 'AI_EXTRACTED',
        provenanceTrail: [
          {
            stage: 'AI_EXTRACTED',
            actor: 'MedLens Gemini Vision Model',
            note: 'Extracted without reference range',
          },
        ],
        verified: false,
      },
      {
        reportId: report2._id,
        patientId: patient._id,
        testName: 'Total Cholesterol',
        value: 192,
        numericValue: 192,
        unit: 'mg/dL',
        referenceRange: { min: null, max: 200, rawText: '< 200 mg/dL' },
        status: 'NORMAL',
        observation: 'Within source reference range (< 200 mg/dL).',
        confidence: 0.96,
        source: 'AI_EXTRACTED',
        provenanceTrail: [
          {
            stage: 'AI_EXTRACTED',
            actor: 'MedLens Gemini Vision Model',
            note: 'Extracted from vance_complete_panel_sep2026.pdf',
          },
        ],
        verified: false,
      },
    ]);

    // Timeline / Audit events
    await AuditLog.create([
      {
        userId,
        patientId: patient._id,
        reportId: report2._id,
        action: 'UPLOAD',
        fieldChanged: 'documentFile',
        newValue: report2.fileName,
        comment: 'Medical report uploaded for AI extraction',
        timestamp: report2.uploadedAt,
      },
      {
        userId,
        patientId: patient._id,
        reportId: report2._id,
        action: 'EXTRACT',
        fieldChanged: 'labResults',
        newValue: '5 tests extracted',
        comment: 'AI extraction completed with 97% average confidence',
        timestamp: new Date(report2.uploadedAt.getTime() + 15000),
      },
    ]);

    return { patient, report1, report2 };
  } catch (err) {
    console.error('Demo Seeder Error:', err);
    throw err;
  }
};