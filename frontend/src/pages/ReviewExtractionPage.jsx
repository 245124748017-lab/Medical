import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Edit3,
  AlertTriangle,
  FileText,
  Clock,
  ArrowRight,
  ArrowLeft,
  Loader2,
  HelpCircle,
  Sparkles,
  Info,
  Check,
  X,
  RotateCcw,
  PlusCircle,
  UserCheck,
  AlertCircle,
} from 'lucide-react';
import { reportAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import ProvenanceBadge from '../components/ProvenanceBadge';

export default function ReviewExtractionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [report, setReport] = useState(null);
  const [patient, setPatient] = useState(null);
  const [results, setResults] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Modals for manual input and profile editing
  const [showManualAddModal, setShowManualAddModal] = useState(false);
  const [showManualEditProfileModal, setShowManualEditProfileModal] = useState(false);
  const [manualProfileForm, setManualProfileForm] = useState({ name: '', age: '', sex: 'Male', dateOfBirth: '' });
  const [newTestForm, setNewTestForm] = useState({ testName: '', value: '', unit: '', referenceRange: '', observation: '' });
  const [addingManualTest, setAddingManualTest] = useState(false);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await reportAPI.getById(id);
      if (res.data.success) {
        setReport(res.data.report);
        setPatient(res.data.patient);
        setResults(res.data.labResults || []);
        setConflicts(res.data.conflicts || []);
        if (res.data.patient) {
          setManualProfileForm({
            name: res.data.patient.name || '',
            age: res.data.patient.age ?? '',
            sex: res.data.patient.sex || 'Male',
            dateOfBirth: res.data.patient.dateOfBirth || '',
          });
        }
      }
    } catch (err) {
      addToast(err.message || 'Failed to load report for verification.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [id]);

  const handleStartEdit = (index) => {
    const item = results[index];
    setEditingIndex(index);
    setEditForm({
      testName: item.testName,
      value: item.value,
      unit: item.unit || '',
      referenceRange: item.referenceRange?.rawText || '',
      status: item.status,
    });
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditForm({});
  };

  const handleSaveEdit = (index) => {
    const updated = [...results];
    const rawRef = editForm.referenceRange.trim();
    const hasRef = rawRef && !rawRef.toLowerCase().includes('not provided') && rawRef.toLowerCase() !== 'none';

    let newStatus = editForm.status;
    if (!hasRef) {
      newStatus = 'CANNOT_DETERMINE';
    }

    updated[index] = {
      ...updated[index],
      testName: editForm.testName.trim(),
      value: editForm.value,
      numericValue: parseFloat(editForm.value) || null,
      unit: editForm.unit.trim(),
      referenceRange: hasRef
        ? { ...updated[index].referenceRange, rawText: rawRef }
        : null,
      status: newStatus,
      isEdited: true,
    };

    setResults(updated);
    setEditingIndex(null);
    addToast(`Updated ${editForm.testName}. Value will be finalized in audit record.`, 'info');
  };

  const handleToggleReject = (index) => {
    const updated = [...results];
    updated[index].isRejected = !updated[index].isRejected;
    setResults(updated);
    addToast(
      updated[index].isRejected
        ? `Marked ${updated[index].testName} as rejected.`
        : `Restored ${updated[index].testName}.`,
      'info'
    );
  };

  // Identity conflict resolution: useReport | keepExisting | manualEdit
  const handleResolveIdentity = async (action, manualData = null) => {
    try {
      setSubmitting(true);
      const res = await reportAPI.resolveIdentity(id, { action, manualData });
      if (res.data.success) {
        setPatient(res.data.patient);
        setReport(res.data.report);
        setShowManualEditProfileModal(false);
        addToast(res.data.message, 'success');
        fetchReport();
      }
    } catch (err) {
      addToast(err.message || 'Failed to update patient information.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Add manual diagnostic result
  const handleAddManualResult = async (e) => {
    e.preventDefault();
    if (!newTestForm.testName || newTestForm.value === '') {
      addToast('Test name and numeric value are required.', 'error');
      return;
    }
    try {
      setAddingManualTest(true);
      const res = await reportAPI.addManualResult(id, newTestForm);
      if (res.data.success) {
        setResults((prev) => [...prev, res.data.labResult]);
        setShowManualAddModal(false);
        setNewTestForm({ testName: '', value: '', unit: '', referenceRange: '', observation: '' });
        addToast(`Added ${res.data.labResult.testName} to report review.`, 'success');
      }
    } catch (err) {
      addToast(err.message || 'Failed to add manual result.', 'error');
    } finally {
      setAddingManualTest(false);
    }
  };

  // Retry processing
  const handleRetryProcessing = async () => {
    try {
      setSubmitting(true);
      const res = await reportAPI.process(id);
      if (res.data.success) {
        addToast('Report re-analyzed.', 'info');
        fetchReport();
      }
    } catch (err) {
      addToast(err.message || 'AI extraction is temporarily unavailable.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalizeVerification = async () => {
    // Check ownership / identity status
    if (report?.identityStatus === 'MISMATCH_PENDING') {
      addToast(
        'Patient identity mismatch detected. Please verify that this report belongs to the selected patient before finalizing.',
        'error'
      );
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        results: results.map((r) => ({
          _id: r._id,
          testName: r.testName,
          value: r.value,
          unit: r.unit,
          referenceRange: r.referenceRange,
          status: r.status,
          isRejected: r.isRejected || false,
        })),
        confirmIdentityMismatch: report?.identityStatus === 'MISMATCH_RESOLVED',
        notes: 'Clinical verification finalized by human reviewer. AI summary updated with approved findings.',
      };

      const res = await reportAPI.verify(id, payload);
      if (res.data.success) {
        addToast('Laboratory findings approved and verified! Record and AI summary updated.', 'success');
        navigate(`/app/patients/${report.patientId._id || report.patientId}/record`);
      }
    } catch (err) {
      addToast(err.message || 'Verification could not be finalized.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading extracted clinical parameters...</p>
      </div>
    );
  }

  const activeCount = results.filter((r) => !r.isRejected).length;
  const rejectedCount = results.filter((r) => r.isRejected).length;

  const isAiUnavailable = report?.processingStatus === 'AI_PROCESSING_UNAVAILABLE';
  const hasIdentityMismatch =
    report?.identityStatus === 'MISMATCH_PENDING' ||
    (report?.extractedPatientInfo?.name &&
      patient?.name &&
      report.extractedPatientInfo.name.toLowerCase().trim() !== patient.name.toLowerCase().trim());

  const extractedName = report?.extractedPatientInfo?.name || report?.extractedPatientInfo?.patientName;
  const extractedAge = report?.extractedPatientInfo?.age;
  const extractedSex = report?.extractedPatientInfo?.sex;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={patient ? `/app/patients/${patient._id}/record` : '/app/dashboard'}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Review & Human Verification
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                Pending Human Verification
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Review, edit extracted values or reference ranges, and approve or reject before creating permanent clinical records.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowManualAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition shadow-2xs"
          >
            <PlusCircle className="w-4 h-4 text-teal-600" />
            <span>Add Test Manually</span>
          </button>

          <button
            onClick={handleFinalizeVerification}
            disabled={submitting || (activeCount === 0 && !isAiUnavailable)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md transition disabled:opacity-50 self-start sm:self-auto cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            <span>{submitting ? 'Generating AI Summary...' : `Approve & Finalize (${activeCount} Tests)`}</span>
          </button>
        </div>
      </div>

      {/* Clean AI Unavailable Notice when Gemini is offline / 403 */}
      {isAiUnavailable && (
        <div className="p-5 bg-sky-50 border border-sky-200 rounded-2xl shadow-subtle space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-sky-950">AI Extraction Status</h3>
              <p className="text-xs text-sky-800 leading-relaxed">
                AI extraction is temporarily unavailable. Please try again or review the uploaded report manually.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1 pl-8">
            <button
              onClick={() => setShowManualAddModal(true)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Diagnostic Result Manually</span>
            </button>
            <button
              onClick={handleRetryProcessing}
              disabled={submitting}
              className="px-4 py-2 bg-white border border-sky-300 hover:bg-sky-100/80 text-sky-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry AI Extraction</span>
            </button>
          </div>
        </div>
      )}

      {/* Report Ownership Check & Identity Mismatch Card */}
      {hasIdentityMismatch && (
        <div className="p-6 rounded-2xl bg-amber-50 border-2 border-amber-400 text-xs text-amber-950 shadow-md space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-sm text-amber-950">
                Patient identity mismatch detected. Please verify that this report belongs to the selected patient.
              </div>
              <p className="text-amber-800 font-medium">
                Information from uploaded report differs from the current patient profile.
              </p>
            </div>
          </div>

          {/* Side by Side Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/90 p-4 rounded-xl border border-amber-200 shadow-2xs">
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block border-b border-slate-100 pb-1">
                Current profile:
              </span>
              <div className="space-y-1 text-slate-800 font-medium">
                <div><span className="text-slate-500">Name:</span> <strong className="text-slate-900">{patient?.name || '—'}</strong></div>
                <div><span className="text-slate-500">Age:</span> <strong className="text-slate-900">{patient?.age != null ? patient.age : '—'}</strong></div>
                <div><span className="text-slate-500">Sex:</span> <strong className="text-slate-900">{patient?.sex || '—'}</strong></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-teal-100 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 block">
                  Report:
                </span>
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                  Source: Medical Report → AI Extracted
                </span>
              </div>
              <div className="space-y-1 text-slate-800 font-medium">
                <div><span className="text-slate-500">Name:</span> <strong className="text-teal-900">{extractedName || '—'}</strong></div>
                <div><span className="text-slate-500">Age:</span> <strong className="text-teal-900">{extractedAge != null ? extractedAge : '—'}</strong></div>
                <div><span className="text-slate-500">Sex:</span> <strong className="text-teal-900">{extractedSex || '—'}</strong></div>
              </div>
            </div>
          </div>

          {/* Conflict Resolution Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={() => handleResolveIdentity('useReport')}
              disabled={submitting}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-xs transition"
            >
              Use Report Information
            </button>
            <button
              onClick={() => handleResolveIdentity('keepExisting')}
              disabled={submitting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs shadow-xs transition"
            >
              Keep Existing Information
            </button>
            <button
              onClick={() => setShowManualEditProfileModal(true)}
              disabled={submitting}
              className="px-4 py-2 bg-white border border-amber-300 hover:bg-amber-100/70 text-amber-950 font-bold rounded-xl text-xs shadow-xs transition"
            >
              Review Manually
            </button>
          </div>
        </div>
      )}

      {/* Reference Range Policy Banner */}
      <div className="p-3.5 bg-slate-900 text-slate-200 rounded-xl text-xs flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
          <span>
            <strong className="text-teal-300">Strict Source Range Rule:</strong> Reference ranges come strictly from the source document. If omitted, reference range is null and status is marked <strong>Cannot Determine</strong>.
          </span>
        </div>
        <span className="text-[11px] text-slate-400">Provenance: AI_EXTRACTED</span>
      </div>

      {/* Report Summary Details Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-subtle flex flex-wrap items-center justify-between gap-4 text-xs">
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Patient Profile</span>
          <span className="text-slate-900 font-bold text-sm">{patient?.name || 'Unknown Patient'}</span>
          <span className="text-slate-500 ml-2">Age: {patient?.age} • Sex: {patient?.sex}</span>
          {patient?.fieldProvenance?.name && (
            <span className="block text-[10px] text-teal-700 font-semibold mt-0.5">
              Source: {patient.fieldProvenance.name}
            </span>
          )}
        </div>

        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Document File</span>
          <span className="text-slate-900 font-medium">{report?.fileName}</span>
          <span className="text-slate-500 ml-2">Specimen: {report?.reportDate}</span>
        </div>

        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Review Summary</span>
          <span className="text-slate-700 font-semibold">
            {activeCount} to approve {rejectedCount > 0 ? `• ${rejectedCount} rejected` : ''}
          </span>
        </div>
      </div>

      {/* Extracted Parameters List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Diagnostic Test Results ({results.length})
          </h3>
          <span className="text-[11px] text-slate-500">
            Click <strong>Edit</strong> to correct values or reference ranges, or <strong>Reject</strong> to exclude.
          </span>
        </div>

        {results.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <p className="text-xs text-slate-500 font-medium">
              No diagnostic test parameters recorded for this report yet.
            </p>
            <button
              onClick={() => setShowManualAddModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Diagnostic Result Manually</span>
            </button>
          </div>
        ) : (
          results.map((res, index) => {
            const isEditing = editingIndex === index;

            return (
              <div
                key={res._id || index}
                className={`bg-white rounded-2xl border p-5 shadow-subtle transition-all ${
                  res.isRejected
                    ? 'border-rose-200 bg-rose-50/40 opacity-75'
                    : res.isEdited
                    ? 'border-teal-300 ring-2 ring-teal-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {isEditing ? (
                  /* Inline Edit Mode */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-teal-800 uppercase tracking-wider">
                        Modifying Diagnostic Parameter
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Changes will be logged in permanent Audit Trail
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-500 font-semibold mb-1">Test Name</label>
                        <input
                          type="text"
                          value={editForm.testName}
                          onChange={(e) => setEditForm({ ...editForm, testName: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-teal-500 font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-500 font-semibold mb-1">Numeric Value</label>
                        <input
                          type="text"
                          value={editForm.value}
                          onChange={(e) => setEditForm({ ...editForm, value: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-teal-500 font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-500 font-semibold mb-1">Unit</label>
                        <input
                          type="text"
                          value={editForm.unit}
                          onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                          placeholder="e.g. g/dL, mg/dL"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-500 font-semibold mb-1">
                          Source Reference Range (or leave blank)
                        </label>
                        <input
                          type="text"
                          value={editForm.referenceRange}
                          onChange={(e) => setEditForm({ ...editForm, referenceRange: e.target.value })}
                          placeholder="e.g. 12.0 - 16.0 g/dL"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500 font-semibold">Classification:</label>
                        <select
                          value={editForm.status}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                          className="text-xs px-2.5 py-1 border border-slate-300 rounded-md bg-white font-medium"
                        >
                          <option value="NORMAL">NORMAL</option>
                          <option value="LOW">LOW</option>
                          <option value="HIGH">HIGH</option>
                          <option value="CANNOT_DETERMINE">CANNOT DETERMINE (No Range)</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(index)}
                          className="px-4 py-1.5 text-xs font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition shadow-2xs"
                        >
                          Apply Edits
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Card View Mode */
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2.5">
                        <h4 className={`text-sm font-bold ${res.isRejected ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {res.testName}
                        </h4>
                        <StatusBadge status={res.status} />
                        {res.isEdited && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-200">
                            Edited by Reviewer
                          </span>
                        )}
                        {res.isRejected && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                            Rejected / Excluded
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600">
                        <div>
                          <strong className="text-slate-400 font-medium">Value:</strong>{' '}
                          <span className="font-bold text-slate-900 text-sm">
                            {res.value} {res.unit}
                          </span>
                        </div>
                        <div>
                          <strong className="text-slate-400 font-medium">Source Reference Range:</strong>{' '}
                          <span className={res.referenceRange ? 'text-slate-800 font-medium' : 'text-slate-400 italic'}>
                            {res.referenceRange?.rawText || 'Not provided in source report'}
                          </span>
                        </div>
                      </div>

                      {res.observation && (
                        <p className="text-[11px] text-slate-500 italic mt-0.5">
                          {res.observation}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
                      <ProvenanceBadge
                        source={res.source}
                        confidence={res.confidence}
                        verified={false}
                      />

                      <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                        <button
                          onClick={() => handleStartEdit(index)}
                          className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition"
                          title="Edit parameter or reference range"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleToggleReject(index)}
                          className={`p-1.5 rounded-lg transition ${
                            res.isRejected
                              ? 'text-teal-700 hover:bg-teal-50'
                              : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                          }`}
                          title={res.isRejected ? 'Restore Result' : 'Reject Result'}
                        >
                          {res.isRejected ? <RotateCcw className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Add Diagnostic Result Manually */}
      {showManualAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-teal-600" />
                <span>Add Diagnostic Result Manually</span>
              </h3>
              <button
                onClick={() => setShowManualAddModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddManualResult} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Test Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hemoglobin, Fasting Blood Sugar"
                  value={newTestForm.testName}
                  onChange={(e) => setNewTestForm({ ...newTestForm, testName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Numeric Value *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 13.5"
                    value={newTestForm.value}
                    onChange={(e) => setNewTestForm({ ...newTestForm, value: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Unit</label>
                  <input
                    type="text"
                    placeholder="e.g. g/dL, mg/dL"
                    value={newTestForm.unit}
                    onChange={(e) => setNewTestForm({ ...newTestForm, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Source Reference Range (Leave blank if missing from report)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 12.0 - 16.0 g/dL"
                  value={newTestForm.referenceRange}
                  onChange={(e) => setNewTestForm({ ...newTestForm, referenceRange: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Strict Rule: If omitted in source document, referenceRange will be null and status CANNOT_DETERMINE.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Observation / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Verified by manual reviewer from paper report"
                  value={newTestForm.observation}
                  onChange={(e) => setNewTestForm({ ...newTestForm, observation: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowManualAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingManualTest}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5"
                >
                  {addingManualTest && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Result</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Manual Profile Review / Adjustment */}
      {showManualEditProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-teal-600" />
                <span>Review & Adjust Patient Information</span>
              </h3>
              <button
                onClick={() => setShowManualEditProfileModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleResolveIdentity('manualEdit', manualProfileForm);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-slate-700 font-bold mb-1">Patient Full Name</label>
                <input
                  type="text"
                  required
                  value={manualProfileForm.name}
                  onChange={(e) => setManualProfileForm({ ...manualProfileForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Age</label>
                  <input
                    type="number"
                    min="0"
                    max="130"
                    required
                    value={manualProfileForm.age}
                    onChange={(e) => setManualProfileForm({ ...manualProfileForm, age: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Sex</label>
                  <select
                    value={manualProfileForm.sex}
                    onChange={(e) => setManualProfileForm({ ...manualProfileForm, sex: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-medium bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={manualProfileForm.dateOfBirth}
                  onChange={(e) => setManualProfileForm({ ...manualProfileForm, dateOfBirth: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowManualEditProfileModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Update Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}