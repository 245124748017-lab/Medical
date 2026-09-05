import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  Upload,
  Sparkles,
  ChevronRight,
  Loader2,
  Calendar,
  Activity,
  FileCheck,
} from 'lucide-react';
import { dashboardAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const { addToast } = useToast();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await dashboardAPI.getStats();
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to load dashboard metrics.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleSeedDemoData = async () => {
    try {
      setSeeding(true);
      const res = await dashboardAPI.seedDemo();
      if (res.data.success) {
        addToast('Hackathon demonstration patient & reports generated!', 'success');
        await fetchDashboardData();
      }
    } catch (err) {
      addToast(err.message || 'Failed to seed demo data.', 'error');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-3" />
        <p className="text-sm text-slate-500 font-medium">Loading clinical metrics...</p>
      </div>
    );
  }

  const stats = data?.stats || {
    totalPatients: 0,
    totalReports: 0,
    awaitingReview: 0,
    verifiedReports: 0,
  };

  const statCards = [
    {
      label: 'Total Patients',
      value: stats.totalPatients,
      icon: <Users className="w-5 h-5 text-teal-600" />,
      bg: 'bg-teal-50 border-teal-200',
    },
    {
      label: 'Total Reports',
      value: stats.totalReports,
      icon: <FileText className="w-5 h-5 text-sky-600" />,
      bg: 'bg-sky-50 border-sky-200',
    },
    {
      label: 'Awaiting Review',
      value: stats.awaitingReview,
      icon: <Clock className="w-5 h-5 text-amber-600" />,
      bg: 'bg-amber-50 border-amber-200',
      highlight: stats.awaitingReview > 0,
    },
    {
      label: 'Verified Reports',
      value: stats.verifiedReports,
      icon: <FileCheck className="w-5 h-5 text-emerald-600" />,
      bg: 'bg-emerald-50 border-emerald-200',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Welcome Banner & Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Clinical Overview</h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time monitoring of patient records, automated extractions, and verification workflows.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSeedDemoData}
            disabled={seeding}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 transition shadow-2xs"
            title="Populates complete realistic demo data for Robert Vance"
          >
            {seeding ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            )}
            <span>{seeding ? 'Generating...' : 'Seed Hackathon Demo Data'}</span>
          </button>

          <Link
            to="/app/patients/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Patient</span>
          </Link>
        </div>
      </div>

      {/* Metrics Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`p-5 rounded-2xl border shadow-subtle transition hover:shadow-card ${card.bg}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-600 tracking-tight">{card.label}</span>
              <div className="p-2 bg-white rounded-xl shadow-2xs">{card.icon}</div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Two Column Layout: Recent Patients & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Patients */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-subtle p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Patients</h3>
              <p className="text-xs text-slate-500">Recently active clinical profiles</p>
            </div>
            <Link
              to="/app/patients"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {data?.recentPatients?.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              No patient profiles found. Click "Seed Hackathon Demo Data" above to load sample patient.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data?.recentPatients?.map((pt) => (
                <Link
                  key={pt._id}
                  to={`/app/patients/${pt._id}/record`}
                  className="py-3.5 px-3 -mx-3 flex items-center justify-between rounded-xl hover:bg-slate-50 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center">
                      {pt.name ? pt.name[0] : 'P'}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 group-hover:text-teal-700 transition-colors flex items-center gap-2">
                        <span>{pt.name}</span>
                        {pt.name.includes('DEMO') && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                            DEMO
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                        <span>Age: {pt.age}</span>
                        <span>•</span>
                        <span>Sex: {pt.sex}</span>
                        <span>•</span>
                        <span>{pt.reportCount} Report{pt.reportCount !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="hidden sm:inline">
                      Updated {new Date(pt.updatedAt || pt.createdAt).toLocaleDateString()}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Clinical Audit Activity</h3>
              <p className="text-xs text-slate-500">Chronological audit actions</p>
            </div>
          </div>

          {data?.recentActivity?.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              No activity logs recorded yet.
            </div>
          ) : (
            <div className="space-y-4">
              {data?.recentActivity?.slice(0, 6).map((act) => (
                <div key={act._id} className="flex items-start gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold text-slate-800">
                      {act.action === 'CREATE'
                        ? 'Intake Created'
                        : act.action === 'UPLOAD'
                        ? 'Report Uploaded'
                        : act.action === 'EXTRACT'
                        ? 'AI Extraction'
                        : act.action === 'VERIFY'
                        ? 'Verification Approved'
                        : act.action === 'EDIT'
                        ? 'Value Modified'
                        : act.action}
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">{act.comment || act.fieldChanged}</p>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                      {new Date(act.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
