import mongoose from 'mongoose';

const labResultSchema = new mongoose.Schema(
  {
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MedicalReport',
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    testName: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed, // number or formatted string (e.g. 11.2 or Negative)
      required: true,
    },
    numericValue: {
      type: Number,
      default: null,
    },
    unit: {
      type: String,
      default: '',
      trim: true,
    },
    referenceRange: {
      type: mongoose.Schema.Types.Mixed, // { min, max, rawText } or null
      default: null,
    },
    status: {
      type: String,
      enum: ['LOW', 'NORMAL', 'HIGH', 'UNKNOWN', 'CANNOT_DETERMINE'],
      default: 'CANNOT_DETERMINE',
    },
    observation: {
      type: String,
      default: '',
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.95,
    },
    source: {
      type: String,
      enum: ['USER_PROVIDED', 'AI_EXTRACTED', 'AI_GENERATED', 'HUMAN_VERIFIED'],
      default: 'AI_EXTRACTED',
    },
    provenanceTrail: [
      {
        stage: String,
        timestamp: { type: Date, default: Date.now },
        actor: String,
        note: String,
      },
    ],
    verified: {
      type: Boolean,
      default: false,
    },
    verifiedBy: {
      type: String,
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    isRejected: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('LabResult', labResultSchema);