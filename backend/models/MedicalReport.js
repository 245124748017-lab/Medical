import mongoose from 'mongoose';

const medicalReportSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    reportDate: {
      type: String, // Extracted or fallback upload date
      default: () => new Date().toISOString().split('T')[0],
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    processingStatus: {
      type: String,
      enum: [
        'PENDING',
        'UPLOADING',
        'ANALYZING',
        'EXTRACTING',
        'VALIDATING',
        'READY_FOR_REVIEW',
        'VERIFIED',
        'FAILED',
        'AI_PROCESSING_UNAVAILABLE',
      ],
      default: 'PENDING',
    },
    identityStatus: {
      type: String,
      enum: ['MATCHED', 'MISMATCH_PENDING', 'MISMATCH_RESOLVED', 'UNVERIFIED'],
      default: 'MATCHED',
    },
    extractedPatientInfo: {
      patientName: { type: String, default: null },
      name: { type: String, default: null },
      age: { type: Number, default: null },
      sex: { type: String, default: null },
      dob: { type: String, default: null },
      date: { type: String, default: null },
      rawTextSnippet: { type: String, default: '' },
    },
    summary: {
      text: { type: String, default: '' },
      keyObservations: { type: [String], default: [] },
      abnormalFindings: { type: [String], default: [] },
      missingInformation: { type: [String], default: [] },
      disclaimer: {
        type: String,
        default:
          'AI-generated summary — verify important information with a qualified healthcare professional. Not for medical diagnosis or treatment.',
      },
      generatedAt: { type: Date, default: null },
    },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'PARTIALLY_VERIFIED', 'VERIFIED', 'REJECTED'],
      default: 'PENDING',
    },
    isDemoFallback: {
      type: Boolean,
      default: false,
    },
    demoFallbackReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('MedicalReport', medicalReportSchema);
