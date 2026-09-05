import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  UserPlus,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Database,
  Loader2,
  UploadCloud,
  FileText,
  Sparkles,
  X,
} from 'lucide-react';
import { patientAPI, reportAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function PatientIntakePage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    sex: 'Male',
    dateOfBirth: '',
    symptoms: '',
    conditions: '',
    allergies: '',
    medications: '',
    notes: '',
  });

  const [fieldProvenance, setFieldProvenance] = useState({
    name: 'USER_PROVIDED',
    age: 'USER_PROVIDED',
    sex: 'USER_PROVIDED',
    dateOfBirth: 'USER_PROVIDED',
  });

  // Conflict state when report demographics differ from user-entered data
  const [pendingConflict, setPendingConflict] = useState(null);
  const [reportFileName, setReportFileName] = useState(null);

  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // If user manually types into a field, mark that specific field as USER_PROVIDED
    if (fieldProvenance[name] && fieldProvenance[name] !== 'USER_PROVIDED') {
      setFieldProvenance((prev) => ({ ...prev, [name]: 'USER_PROVIDED' }));
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) {
      addToast('Unsupported file type. Please upload a PDF, PNG, or JPG report.', 'error');
      return;
    }

    setExtracting(true);
    setReportFileName(file.name);

    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await reportAPI.extractPreview(fd);

      if (!res.data.success || res.data.code === 'AI_PROCESSING_UNAVAILABLE') {
        addToast(
          res.data.message || 'AI extraction is temporarily unavailable. Please try again or review the uploaded report manually.',
          'info'
        );
        return;
      }

      const pInfo = res.data.patientInfo || {};
      const repName = pInfo.patientName || pInfo.name;
      const repAge = pInfo.age;
      const repSex = pInfo.sex;
      const repDob = pInfo.dob;

      // Check if user already entered data that differs
      const hasExistingName = formData.name.trim().length > 0;
      const hasExistingAge = formData.age !== '' && formData.age !== null;

      const nameDiffers = hasExistingName && repName && formData.name.trim().toLowerCase() !== repName.trim().toLowerCase();
      const ageDiffers = hasExistingAge && repAge != null && Number(formData.age) !== Number(repAge);

      if (nameDiffers || ageDiffers) {
        // DO NOT silently overwrite! Prompt user with conflict options
        setPendingConflict({
          current: {
            name: formData.name,
            age: formData.age,
            sex: formData.sex,
          },
          report: {
            name: repName || '—',
            age: repAge != null ? repAge : '—',
            sex: repSex || '—',
            dob: repDob || '',
          },
          rawExtracted: pInfo,
        });
      } else {
        // Safe autofill: only populate fields explicitly present in report
        applyExtractedInformation(pInfo);
        addToast('Patient demographics automatically populated from uploaded report.', 'success');
      }
    } catch (err) {
      addToast(
        'AI extraction is temporarily unavailable. Please try again or review the uploaded report manually.',
        'error'
      );
    } finally {
      setExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const applyExtractedInformation = (pInfo) => {
    const updatedForm = { ...formData };
    const updatedProv = { ...fieldProvenance };

    if (pInfo.patientName || pInfo.name) {
      updatedForm.name = pInfo.patientName || pInfo.name;
      updatedProv.name = 'Medical Report → AI Extracted';
    }
    if (pInfo.age != null) {
      updatedForm.age = pInfo.age;
      updatedProv.age = 'Medical Report → AI Extracted';
    }
    if (pInfo.sex) {
      updatedForm.sex = pInfo.sex;
      updatedProv.sex = 'Medical Report → AI Extracted';
    }
    if (pInfo.dob) {
      updatedForm.dateOfBirth = pInfo.dob;
      updatedProv.dateOfBirth = 'Medical Report → AI Extracted';
    }

    setFormData(updatedForm);
    setFieldProvenance(updatedProv);
    setPendingConflict(null);
  };

  const handleConflictAction = (action) => {
    if (action === 'useReport' && pendingConflict) {
      applyExtractedInformation(pendingConflict.rawExtracted);
      addToast('Patient profile updated using report demographics.', 'info');
    } else if (action === 'keepExisting') {
      setPendingConflict(null);
      addToast('Kept existing patient intake information.', 'info');
    } else if (action === 'reviewManually') {
      setPendingConflict(null);
      addToast('Please review and adjust the fields below as needed.', 'info');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.age) {
      addToast('Patient name and age are required.', 'error');
      return;
    }

    setLoading(true);
    try {
      const isExtracted = Object.values(fieldProvenance).some((p) => p.includes('AI Extracted'));
      const payload = {
        name: formData.name.trim(),
        age: Number(formData.age),
        sex: formData.sex,
        dateOfBirth: formData.dateOfBirth,
        symptoms: formData.symptoms ? formData.symptoms.split(',').map((s) => s.trim()).filter(Boolean) : [],
        conditions: formData.conditions ? formData.conditions.split(',').map((c) => c.trim()).filter(Boolean) : [],
        allergies: formData.allergies ? formData.allergies.split(',').map((a) => a.trim()).filter(Boolean) : [],
        medications: formData.medications ? formData.medications.split(',').map((m) => m.trim()).filter(Boolean) : [],
        notes: formData.notes.trim(),
        source: isExtracted ? 'AI_EXTRACTED' : 'USER_PROVIDED',
        fieldProvenance,
      };

      const res = await patientAPI.create(payload);
      if (res.data.success) {
        addToast('Patient intake record successfully created.', 'success');
        navigate(`/app/patients/${res.data.patient._id}/record`);
      }
    } catch (err) {
      addToast(err.message || 'Failed to submit patient intake.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/app/patients"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Patient Information Intake
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Register baseline patient demographics, reported symptoms, and known medical conditions.
          </p>
        </div>
      </div>

      {/* Document Autofill Dropzone */}
      <div className="bg-gradient-to-r from-teal-50 to-sky-50 border border-teal-200 rounded-2xl p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm text-slate-900">Autofill from Medical Report</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Upload a diagnostic report (PDF, PNG, JPG, JPEG) to automatically extract patient name, age, and sex.
              </p>
            </div>
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={extracting}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {extracting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UploadCloud className="w-4 h-4" />
              )}
              <span>{extracting ? 'Extracting Demographics...' : 'Upload & Autofill'}</span>
            </button>
          </div>
        </div>

        {reportFileName && !extracting && (
          <div className="text-[11px] text-teal-800 flex items-center gap-1.5 font-medium">
            <FileText className="w-3.5 h-3.5" />
            <span>Document processed: {reportFileName}</span>
          </div>
        )}
      </div>

      {/* Conflict Warning when Report Differs from Existing Data */}
      {pendingConflict && (
        <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-400 text-xs text-amber-950 shadow-md space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-amber-950">
                Information from uploaded report differs from the current patient profile.
              </h4>
              <p className="text-amber-800 mt-0.5">
                Existing values were already entered. Please choose how to resolve this information conflict:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/90 p-4 rounded-xl border border-amber-200">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block border-b border-slate-100 pb-1">
                Current profile:
              </span>
              <div className="font-medium text-slate-800">
                <div><span className="text-slate-500">Name:</span> <strong className="text-slate-900">{pendingConflict.current.name || '—'}</strong></div>
                <div><span className="text-slate-500">Age:</span> <strong className="text-slate-900">{pendingConflict.current.age || '—'}</strong></div>
                <div><span className="text-slate-500">Sex:</span> <strong className="text-slate-900">{pendingConflict.current.sex || '—'}</strong></div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between border-b border-teal-100 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 block">
                  Report:
                </span>
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                  Source: Medical Report → AI Extracted
                </span>
              </div>
              <div className="font-medium text-slate-800">
                <div><span className="text-slate-500">Name:</span> <strong className="text-teal-900">{pendingConflict.report.name}</strong></div>
                <div><span className="text-slate-500">Age:</span> <strong className="text-teal-900">{pendingConflict.report.age}</strong></div>
                <div><span className="text-slate-500">Sex:</span> <strong className="text-teal-900">{pendingConflict.report.sex}</strong></div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => handleConflictAction('useReport')}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-xs transition"
            >
              Use Report Information
            </button>
            <button
              type="button"
              onClick={() => handleConflictAction('keepExisting')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs shadow-xs transition"
            >
              Keep Existing Information
            </button>
            <button
              type="button"
              onClick={() => handleConflictAction('reviewManually')}
              className="px-4 py-2 bg-white border border-amber-300 hover:bg-amber-100/70 text-amber-950 font-bold rounded-xl text-xs shadow-xs transition"
            >
              Review Manually
            </button>
          </div>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-subtle space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Patient Name */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Patient Full Name *
              </label>
              {fieldProvenance.name === 'Medical Report → AI Extracted' && (
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  Source: Medical Report → AI Extracted
                </span>
              )}
            </div>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Eleanor Vance"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none font-medium"
            />
          </div>

          {/* Age */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Age (Years) *
              </label>
              {fieldProvenance.age === 'Medical Report → AI Extracted' && (
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  Source: Medical Report → AI Extracted
                </span>
              )}
            </div>
            <input
              type="number"
              name="age"
              required
              min="0"
              max="130"
              value={formData.age}
              onChange={handleChange}
              placeholder="e.g. 42"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none font-medium"
            />
          </div>

          {/* Sex */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Sex
              </label>
              {fieldProvenance.sex === 'Medical Report → AI Extracted' && (
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  Source: Medical Report → AI Extracted
                </span>
              )}
            </div>
            <select
              name="sex"
              value={formData.sex}
              onChange={handleChange}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none bg-white font-medium"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>

          {/* Date of Birth */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Date of Birth
              </label>
              {fieldProvenance.dateOfBirth === 'Medical Report → AI Extracted' && (
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  Source: Medical Report → AI Extracted
                </span>
              )}
            </div>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Symptoms */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Reported Symptoms
            </label>
            <input
              type="text"
              name="symptoms"
              value={formData.symptoms}
              onChange={handleChange}
              placeholder="e.g. Fatigue, Dizziness, Night sweats (comma separated)"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">Separate multiple symptoms with commas.</p>
          </div>

          {/* Existing Conditions */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Existing Medical Conditions
            </label>
            <input
              type="text"
              name="conditions"
              value={formData.conditions}
              onChange={handleChange}
              placeholder="e.g. Hypertension, Type 2 Diabetes (comma separated)"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            />
          </div>

          {/* Known Allergies */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Allergies
            </label>
            <input
              type="text"
              name="allergies"
              value={formData.allergies}
              onChange={handleChange}
              placeholder="e.g. Penicillin, Sulfa, Peanuts (comma separated)"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            />
          </div>

          {/* Current Medications */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Current Medications
            </label>
            <input
              type="text"
              name="medications"
              value={formData.medications}
              onChange={handleChange}
              placeholder="e.g. Lisinopril 10mg, Metformin 500mg"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            />
          </div>
        </div>

        {/* Additional Clinical Notes */}
        <div className="border-t border-slate-100 pt-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Additional Clinical Intake Notes
          </label>
          <textarea
            name="notes"
            rows="3"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Document any relevant clinical context, reason for visit, or referral notes..."
            className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="border-t border-slate-100 pt-6 flex items-center justify-between">
          <Link
            to="/app/patients"
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{loading ? 'Creating Intake...' : 'Save Patient Intake'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
