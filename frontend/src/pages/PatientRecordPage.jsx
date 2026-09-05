import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  User,
  Activity,
  FileText,
  Clock,
  ArrowLeft,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Search,
  Filter,
  BarChart3,
  ExternalLink,
  ChevronRight,
  Database,
  Loader2,
  Calendar,
} from 'lucide-react';
import { patientAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import ProvenanceBadge from '../components/ProvenanceBadge';

export default function PatientRecordPage() {
  const { id } = useParams();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [reports, setReports] = useState([]);
  const [labResults, setLabResults] = useState([]);
  const [conflicts, setConflicts] = useState([]);

  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedProvenance, setSelectedProvenance] = useState(null);

  const fetchRecord = async () => {
    try {
      setLoading(true);
      const res = await patientAPI.getById(id);
      if (res.data.success) {
        setPatient(res.data.patient);
        setReports(res.data.reports || []);
        setLabResults(res.data.labResults || []);
        setConflicts(res.data.conflicts || []);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load patient record.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecord();
  }, [id]);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Assembling structured patient record...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
        <h3 className="text-base font-bold text-slate-900">Patient Not Found</h3>
        <Link to="/app/patients" className="mt-3 inline-block text-xs font-semibold text-teal-600">
          Return to Patients Directory
        </Link>
      </div>
    );
  }

  // Filtered lab results
  const filteredResults = labResults.filter((item) => {
    const matchesSearch = item.testName.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' || item.status.toUpperCase() === statusFilter.toUpperCase() || ((statusFilter === 'CANNOT_DETERMINE' || statusFilter === 'UNKNOWN') && (item.status === 'UNKNOWN' || item.status === 'CANNOT_DETERMINE'));
    return matchesSearch && matchesStatus;
  });

  const latestReport = reports[0];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumbs & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/app/patients"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">{patient.name}</h2>
              {patient.name.includes('DEMO') && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                  DEMO PATIENT
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Structured Clinical Record • Registered on {new Date(patient.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to={`/app/patients/${patient._id}/compare`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition shadow-2xs"
          >
            <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
            <span>Compare Reports</span>
          </Link>

          <Link
            to={`/app/patients/${patient._id}/timeline`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition shadow-2xs"
          >
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Timeline</span>
          </Link>

          <Link
            to={`/app/upload?patientId=${patient._id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Upload New Report</span>
          </Link>
        </div>
      </div>

      {/* Conflict Warnings */}
      {conflicts.length > 0 && (
        <div className="space-y-2.5">
          {conflicts.map((conf, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-start gap-3 shadow-2xs"
            >
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-amber-900">
                  ⚠ Information Conflict Detected: {conf.title}
                </div>
                <p className="leading-relaxed">{conf.message}</p>
                <p className="text-[11px] text-amber-800 font-semibold">
                  Guidance: {conf.recommendation}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Patient Intake Information Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-subtle">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">Patient Baseline Profile</h3>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${
            patient.source === 'AI_EXTRACTED'
              ? 'bg-teal-50 text-teal-800 border-teal-200'
              : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}>
            <Database className="w-3 h-3" />
            {patient.source === 'AI_EXTRACTED' ? 'Source: Medical Report → AI Extracted' : 'Source: User Provided'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px] font-semibold">Age / Sex</span>
            <span className="text-slate-900 font-bold">{patient.age} years • {patient.sex}</span>
            {patient.fieldProvenance?.age && (
              <span className="block text-[10px] text-teal-700 font-medium mt-0.5">
                Source: {patient.fieldProvenance.age}
              </span>
            )}
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-semibold">Date of Birth</span>
            <span className="text-slate-900 font-bold">{patient.dateOfBirth || 'Not provided'}</span>
            {patient.fieldProvenance?.dateOfBirth && (
              <span className="block text-[10px] text-teal-700 font-medium mt-0.5">
                Source: {patient.fieldProvenance.dateOfBirth}
              </span>
            )}
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-semibold">Allergies</span>
            <span className="text-rose-700 font-bold">
              {patient.allergies?.length > 0 ? patient.allergies.join(', ') : 'No known allergies'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-semibold">Total Reports</span>
            <span className="text-slate-900 font-bold">{reports.length} document(s)</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px] font-semibold mb-1">Reported Symptoms</span>
            <div className="flex flex-wrap gap-1">
              {patient.symptoms?.length > 0 ? (
                patient.symptoms.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                    {s}
                  </span>
                ))
              ) : (
                <span className="text-slate-400">None reported</span>
              )}
            </div>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px] font-semibold mb-1">Current Medications</span>
            <div className="flex flex-wrap gap-1">
              {patient.medications?.length > 0 ? (
                patient.medications.map((m) => (
                  <span key={m} className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 font-medium">
                    {m}
                  </span>
                ))
              ) : (
                <span className="text-slate-400">No active medications recorded</span>
              )}
            </div>
          </div>
        </div>

        {patient.notes && (
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
            <span className="text-slate-400 block text-[11px] font-semibold mb-0.5">Clinical Intake Notes:</span>
            <p className="leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              {patient.notes}
            </p>
          </div>
        )}
      </div>

      {/* AI Patient-Friendly Summary Card */}
      {latestReport?.summary?.text && (
        <div className="bg-gradient-to-br from-teal-50/70 via-white to-sky-50/70 rounded-2xl border border-teal-200 p-6 shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-teal-900 font-bold text-sm">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span>AI Patient-Friendly Summary</span>
            </div>
            <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-200 uppercase tracking-wider">
              Source: AI Generated
            </span>
          </div>

          <p className="text-xs md:text-sm text-slate-800 leading-relaxed">
            {latestReport.summary.text}
          </p>

          {latestReport.summary.keyObservations?.length > 0 && (
            <div className="space-y-1 text-xs">
              <span className="font-semibold text-slate-700">Key Observations:</span>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600 text-xs pl-1">
                {latestReport.summary.keyObservations.map((obs, i) => (
                  <li key={i}>{obs}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Mandatory AI Safety Notice */}
          <div className="pt-3 border-t border-teal-200/60 text-[11px] text-teal-900/80 italic flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
            <span>{latestReport.summary.disclaimer}</span>
          </div>
        </div>
      )}

      {/* Structured Laboratory Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
        {/* Table Controls */}
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Laboratory Findings</h3>
            <p className="text-xs text-slate-500">
              Structured diagnostic results with strictly preserved reference ranges & source provenance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter tests..."
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-teal-500 w-44"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-teal-500 bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="LOW">LOW</option>
              <option value="NORMAL">NORMAL</option>
              <option value="HIGH">HIGH</option>
              <option value="CANNOT_DETERMINE">CANNOT DETERMINE</option>
            </select>
          </div>
        </div>

        {/* Results Table */}
        {filteredResults.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <Activity className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No laboratory results match the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Test Parameter</th>
                  <th className="py-3 px-4">Value</th>
                  <th className="py-3 px-4">Unit</th>
                  <th className="py-3 px-4">Source Reference Range</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Source Provenance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResults.map((res) => (
                  <tr key={res._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div>{res.testName}</div>
                      {res.observation && (
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5 truncate max-w-xs">
                          {res.observation}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                      {res.value}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {res.unit || '—'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      {res.referenceRange?.rawText || 'Not provided in source report'}
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={res.status} />
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">
                      {res.confidence ? `${Math.round(res.confidence * 100)}%` : '—'}
                    </td>

                    <td className="py-3.5 px-4">
                      <ProvenanceBadge
                        source={res.source}
                        confidence={res.confidence}
                        verified={res.verified}
                        verifiedBy={res.verifiedBy}
                        onClick={() => setSelectedProvenance(res)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provenance Detail Modal */}
      {selectedProvenance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
                <span>Clinical Provenance & Audit Trail</span>
              </h3>
              <button
                onClick={() => setSelectedProvenance(null)}
                className="text-slate-400 hover:text-slate-700 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] font-semibold">Test</span>
                <span className="font-bold text-slate-900 text-sm">{selectedProvenance.testName}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-semibold">Value</span>
                <span className="font-semibold text-slate-800">
                  {selectedProvenance.value} {selectedProvenance.unit}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-semibold">Source Reference Range</span>
                <span className="text-slate-800">
                  {selectedProvenance.referenceRange?.rawText || 'Not provided in source report'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-semibold text-slate-700">Verification Lifecycle:</div>
                <div className="space-y-1.5 text-[11px] text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-500" />
                    <span><strong>Document:</strong> Uploaded medical report</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    <span><strong>AI Extraction:</strong> {selectedProvenance.confidence ? `${Math.round(selectedProvenance.confidence * 100)}% confidence score` : 'Completed'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${selectedProvenance.verified ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                    <span><strong>Human Review:</strong> {selectedProvenance.verified ? `Approved by ${selectedProvenance.verifiedBy || 'Reviewer'}` : 'Pending review'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedProvenance(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
