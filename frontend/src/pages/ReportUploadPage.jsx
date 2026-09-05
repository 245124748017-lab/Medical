import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { patientAPI, reportAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import Stepper from '../components/Stepper';

export default function ReportUploadPage() {
  const [searchParams] = useSearchParams();
  const preselectedPatientId = searchParams.get('patientId');

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(preselectedPatientId || '');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('UPLOADING');
  const [completedReportId, setCompletedReportId] = useState(null);

  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await patientAPI.getAll();
        if (res.data.success) {
          setPatients(res.data.patients);
          if (!selectedPatientId && res.data.patients.length > 0) {
            setSelectedPatientId(res.data.patients[0]._id);
          }
        }
      } catch (err) {
        addToast('Failed to load patient list.', 'error');
      }
    };
    fetchPatients();
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    if (!selectedFile) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(selectedFile.type)) {
      addToast('Unsupported file format. Please upload PDF, JPG, JPEG, or PNG.', 'error');
      return;
    }

    if (selectedFile.size > 15 * 1024 * 1024) {
      addToast('File exceeds 15MB limit. Please upload a smaller file.', 'error');
      return;
    }

    setFile(selectedFile);

    if (selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      addToast('Please select a report file to upload.', 'error');
      return;
    }
    if (!selectedPatientId) {
      addToast('Please select a patient profile.', 'error');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('UPLOADING');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('patientId', selectedPatientId);
    formData.append('reportDate', reportDate);

    // Simulate clinical stage stepper transitions cleanly
    const stageTimer1 = setTimeout(() => setProcessingStatus('ANALYZING'), 1200);
    const stageTimer2 = setTimeout(() => setProcessingStatus('EXTRACTING'), 2800);
    const stageTimer3 = setTimeout(() => setProcessingStatus('VALIDATING'), 4500);

    try {
      const res = await reportAPI.upload(formData, (percent) => {
        setUploadPercent(percent);
      });

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);

      if (res.data.success) {
        setProcessingStatus('READY_FOR_REVIEW');
        setCompletedReportId(res.data.report._id);
        if (res.data.report?.processingStatus === 'AI_PROCESSING_UNAVAILABLE') {
          addToast(res.data.message || 'Report uploaded. AI extraction is temporarily unavailable — please review manually.', 'info');
        } else {
          addToast('Medical report successfully analyzed and ready for verification!', 'success');
        }
        setTimeout(() => {
          navigate(`/app/reports/${res.data.report._id}/verify`);
        }, 1000);
      }
    } catch (err) {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);
      setIsProcessing(false);
      addToast(
        err.message || "We couldn't process this report automatically. Please verify the document format or try again.",
        'error'
      );
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Upload Medical Report</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Submit lab test reports or clinical documentation for automated structured extraction and clinician verification.
        </p>
      </div>

      {isProcessing && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-800">
              Processing Pipeline
            </span>
            <span className="text-xs font-medium text-slate-500">
              {processingStatus === 'READY_FOR_REVIEW' ? 'Complete' : 'In Progress...'}
            </span>
          </div>
          <Stepper currentStatus={processingStatus} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-subtle space-y-6">
        {/* Patient Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Select Patient *
            </label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              disabled={isProcessing}
              required
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
            >
              <option value="">-- Choose Patient --</option>
              {patients.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} (Age {p.age})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Report Specimen Date
            </label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              disabled={isProcessing}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Diagnostic Document (PDF, JPG, JPEG, PNG)
          </label>

          {!file ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-teal-500 bg-teal-50/50'
                  : 'border-slate-300 hover:border-teal-400 bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-3 stroke-[1.5]" />
              <p className="text-sm font-semibold text-slate-800">
                Click to browse or drag & drop medical document
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports standard laboratory panels up to 15MB
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                    <FileText className="w-6 h-6 text-teal-700" />
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 truncate max-w-xs md:max-w-md">
                    {file.name}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type || 'Document'}
                  </p>
                </div>
              </div>

              {!isProcessing && (
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Clinical Safety & Extraction Policy */}
        <div className="p-4 bg-teal-50/60 rounded-xl border border-teal-200 text-xs text-teal-900 space-y-1">
          <div className="flex items-center gap-2 font-semibold text-teal-950">
            <ShieldCheck className="w-4 h-4 text-teal-700" />
            <span>Strict Reference Range Policy</span>
          </div>
          <p className="leading-relaxed">
            MedLens will extract only reference ranges printed on the document. If no reference range is provided, the status is strictly labeled <strong>Cannot Determine</strong>. Never assumed or hallucinated.
          </p>
        </div>

        {/* Submit Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={!file || !selectedPatientId || isProcessing}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md transition disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Report...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Upload & Extract with AI</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
