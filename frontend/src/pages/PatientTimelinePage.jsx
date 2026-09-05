import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Clock,
  ArrowLeft,
  Calendar,
  FileText,
  ShieldCheck,
  Edit3,
  UserPlus,
  Sparkles,
  Loader2,
  ChevronRight,
  Database,
  CheckCircle2,
} from 'lucide-react';
import { patientAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function PatientTimelinePage() {
  const { id } = useParams();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        setLoading(true);
        const res = await patientAPI.getTimeline(id);
        if (res.data.success) {
          setPatient(res.data.patient);
          setTimeline(res.data.timeline || []);
        }
      } catch (err) {
        addToast(err.message || 'Failed to load timeline events.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchTimeline();
  }, [id]);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Assembling chronological clinical timeline...</p>
      </div>
    );
  }

  const getEventIcon = (type) => {
    switch (type) {
      case 'PATIENT_CREATED':
        return <UserPlus className="w-4 h-4 text-sky-600" />;
      case 'REPORT_UPLOADED':
        return <FileText className="w-4 h-4 text-indigo-600" />;
      case 'SUMMARY_GENERATED':
        return <Sparkles className="w-4 h-4 text-purple-600" />;
      case 'REPORT_VERIFIED':
        return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
      case 'VALUE_EDITED':
        return <Edit3 className="w-4 h-4 text-amber-600" />;
      default:
        return <Clock className="w-4 h-4 text-teal-600" />;
    }
  };

  const getBadgeStyle = (badge) => {
    switch (badge) {
      case 'Human Verified':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'AI Generated':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Audit Trail':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'User Provided':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={`/app/patients/${id}/record`}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Clinical Event Timeline</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological history of document uploads, AI extractions, modifications, and human approvals for{' '}
              <strong className="text-slate-700">{patient?.name}</strong>.
            </p>
          </div>
        </div>

        <Link
          to={`/app/patients/${id}/record`}
          className="text-xs font-semibold text-teal-600 hover:text-teal-700"
        >
          View Structured Record
        </Link>
      </div>

      {/* Timeline Stream */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-subtle">
        {timeline.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No events logged yet for this patient profile.
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-100 ml-4 space-y-8 py-2">
            {timeline.map((event, index) => (
              <div key={event.id || index} className="relative pl-6 group">
                {/* Node marker icon */}
                <div className="absolute -left-3 top-1 w-6 h-6 rounded-full bg-white border-2 border-slate-300 group-hover:border-teal-500 flex items-center justify-center shadow-xs transition-colors">
                  {getEventIcon(event.type)}
                </div>

                <div className="bg-slate-50/80 group-hover:bg-slate-50 rounded-xl p-4 border border-slate-200/80 transition shadow-2xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-900">{event.title}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadgeStyle(
                        event.badge
                      )}`}
                    >
                      {event.badge}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{event.description}</p>

                  {/* Audit delta detail if value edited */}
                  {event.type === 'VALUE_EDITED' && event.oldValue !== undefined && (
                    <div className="mt-2 p-2 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-500 flex items-center gap-3">
                      <span>
                        Old:{' '}
                        <strong className="text-slate-800">
                          {typeof event.oldValue === 'object' ? JSON.stringify(event.oldValue) : String(event.oldValue)}
                        </strong>
                      </span>
                      <span>→</span>
                      <span>
                        New:{' '}
                        <strong className="text-teal-700">
                          {typeof event.newValue === 'object' ? JSON.stringify(event.newValue) : String(event.newValue)}
                        </strong>
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(event.date).toLocaleDateString()} at{' '}
                      {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span>Actor: {event.actor || 'Clinical System'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
