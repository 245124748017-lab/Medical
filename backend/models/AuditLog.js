import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MedicalReport',
      default: null,
      index: true,
    },
    labResultId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LabResult',
      default: null,
    },
    action: {
      type: String,
      enum: ['CREATE', 'UPLOAD', 'EXTRACT', 'EDIT', 'VERIFY', 'REJECT', 'SUMMARY_GENERATED', 'RESOLVE_CONFLICT'],
      required: true,
    },
    fieldChanged: {
      type: String,
      default: null,
    },
    oldValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    comment: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

export default mongoose.model('AuditLog', auditLogSchema);
