import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  ArrowRight,
  FileText,
  Clock,
  Trash2,
  AlertCircle,
  Loader2,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { patientAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const { addToast } = useToast();

  const fetchPatients = async (searchTerm = '') => {
    try {
      setLoading(true);
      const res = await patientAPI.getAll(searchTerm);
      if (res.data.success) {
        setPatients(res.data.patients);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load patients.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchPatients(search);
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [search]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete patient "${name}" and all associated medical records?`)) {
      return;
    }

    try {
      setDeletingId(id);
      await patientAPI.delete(id);
      addToast('Patient record deleted successfully.', 'success');
      setPatients((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      addToast(err.message || 'Failed to delete patient.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Patient Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage clinical profiles, baseline intake records, and longitudinal history.
          </p>
        </div>

        <Link
          to="/app/patients/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Patient Intake</span>
        </Link>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search by patient name, symptoms, or medical conditions"
          placeholder="Search by patient name, symptoms, or medical conditions..."
          className="w-full text-sm bg-transparent outline-none placeholder-slate-400"
        />
      </div>

      {/* Patients List */}
      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-3" />
          <p className="text-xs text-slate-500">Retrieving patient directory...</p>
        </div>
      ) : patients.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-subtle">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">No Patients Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search
              ? 'No matching patient records found. Try adjusting your search query.'
              : 'Get started by creating a new clinical intake or generating the hackathon demo dataset from the Dashboard.'}
          </p>
          <div className="mt-5">
            <Link
              to="/app/patients/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Intake First Patient</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {patients.map((pt) => (
            <div
              key={pt._id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-subtle hover:shadow-card transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-200 text-teal-800 font-bold flex items-center justify-center text-sm">
                      {pt.name ? pt.name[0] : 'P'}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{pt.name}</span>
                        {pt.name.includes('DEMO') && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                            DEMO
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {pt.age} yrs • {pt.sex} {pt.dateOfBirth ? `• DOB: ${pt.dateOfBirth}` : ''}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(pt._id, pt.name)}
                    disabled={deletingId === pt._id}
                    aria-label={`Delete patient record for ${pt.name}`}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                    title={`Delete Patient ${pt.name}`}
                  >
                    {deletingId === pt._id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-rose-600" aria-hidden="true" />
                    ) : (
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </div>

                {/* Badges / Conditions */}
                <div className="mt-4 space-y-2">
                  {pt.conditions && pt.conditions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {pt.conditions.slice(0, 3).map((cond) => (
                        <span
                          key={cond}
                          className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] rounded-md font-medium"
                        >
                          {cond}
                        </span>
                      ))}
                    </div>
                  )}

                  {pt.allergies && pt.allergies.length > 0 && (
                    <div className="text-[11px] text-rose-700 font-medium">
                      Allergies: {pt.allergies.join(', ')}
                    </div>
                  )}
                </div>

                {/* Source marker */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-semibold tracking-tight uppercase">
                    Source: User Provided
                  </span>
                  <span>{pt.reportCount} Report{pt.reportCount !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <Link
                  to={`/app/upload?patientId=${pt._id}`}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-teal-700 hover:bg-teal-50 transition flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Upload</span>
                </Link>

                <Link
                  to={`/app/patients/${pt._id}/record`}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition flex items-center gap-1 shadow-2xs"
                >
                  <span>Open Record</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
