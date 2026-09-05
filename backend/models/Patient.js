import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema(
  {
    userId: {
      type: String, // Firebase UID or local user ID
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    age: {
      type: Number,
      required: true,
      min: 0,
      max: 130,
    },
    sex: {
      type: String,
      enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
      default: 'Male',
    },
    dateOfBirth: {
      type: String,
      trim: true,
    },
    symptoms: {
      type: [String],
      default: [],
    },
    conditions: {
      type: [String],
      default: [],
    },
    allergies: {
      type: [String],
      default: [],
    },
    medications: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    source: {
      type: String,
      default: 'USER_PROVIDED', // USER_PROVIDED or AI_EXTRACTED
    },
    fieldProvenance: {
      name: { type: String, default: 'USER_PROVIDED' },
      age: { type: String, default: 'USER_PROVIDED' },
      sex: { type: String, default: 'USER_PROVIDED' },
      dateOfBirth: { type: String, default: 'USER_PROVIDED' },
    },
  },
  {
    timestamps: true,
  }
);

patientSchema.index({ name: 'text', notes: 'text' });

export default mongoose.model('Patient', patientSchema);
