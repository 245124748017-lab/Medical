import React, { useEffect, useState, useMemo } from 'react';
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
  BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { dashboardAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

const STATUS_COLORS = {
  Verified: '#10b981', // emerald-500
  'Awaiting Review': '#f59e0b', // amber-500
  'In Processing': '#0ea5e9', // sky-500
};

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const { addToast } = useToast();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await dashboardAPI.getStats();
      if (res.data?.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err.message || err);
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
      if (res.data?.success) {
        addToast('Hackathon demonstration patient & reports generated!', 'success');
        await fetchDashboardData();
      }
    } catch (err) {
      addToast(err.message || 'Failed to seed demo data.', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const stats = data?.stats || {
    totalPatients: 0,
    totalReports: 0,
    totalLabResults: 0,
    awaitingReview: 0,
    verifiedReports: 0,
    aiProcessedReports: 0,
  };

  // Pie chart data: Reports by Verification Status (based ONLY on real data)
  const reportStatusData = useMemo(() => {
    if (!stats.totalReports) return [];
    const verified = stats.verifiedReports || 0;
    const pending = stats.awaitingReview || 0;
    const inProgress = Math.max(0, stats.totalReports - verified - pending);

    const items = [];
    if (verified > 0) items.push({ name: 'Verified', value: verified, color: STATUS_COLORS.Verified });
    if (pending > 0) items.push({ name: 'Awaiting Review', value: pending, color: STATUS_COLORS['Awaiting Review'] });
    if (inProgress > 0) items.push({ name: 'In Processing', value: inProgress, color: STATUS_COLORS['In Processing'] });
    return items;
  }, [stats]);

  // Bar chart data: Clinical Workflow Pipeline (based ONLY on real data)
  const pipelineData = useMemo(() => {
    if (!stats.totalReports && !stats.totalPatients) return [];
    return [
      { stage: 'Patients', count: stats.totalPatients || 0, fill: '#0d9488' },
      { stage: 'Uploaded', count: stats.totalReports || 0, fill: '#0284c7' },
      { stage: 'AI Processed', count: stats.aiProcessedReports || 0, fill: '#6366f1' },
      { stage: 'Lab Results', count: stats.totalLabResults || 0, fill: '#8b5cf6' },
      { stage: 'Verified', count: stats.verifiedReports || 0, fill: '#10b981' },
    ];
  }, [stats]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20" role="status" aria-live="polite">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-3" aria-hidden="true" />
        <p className="text-sm text-slate-500 font-medium">Loading clinical metrics...</p>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Patients',
      value: stats.totalPatients,
      icon: <Users className="w-5 h-5 text-teal-600" aria-hidden="true" />,
      bg: 'bg-teal-50 border-teal-200',
    },
    {
      label: 'Medical Reports',
      value: stats.totalReports,
      icon: <FileText className="w-5 h-5 text-sky-600" aria-hidden="true" />,
      bg: 'bg-sky-50 border-sky-200',
    },
    {
      label: 'Lab Results',
      value: stats.totalLabResults ?? 0,
      icon: <Activity className="w-5 h-5 text-indigo-600" aria-hidden="true" />,
      bg: 'bg-indigo-50 border-indigo-200',
    },
    {
      label: 'AI Processed',
      value: stats.aiProcessedReports ?? (stats.totalReports - stats.awaitingReview),
      icon: <Sparkles className="w-5 h-5 text-purple-600" aria-hidden="true" />,
      bg: 'bg-purple-50 border-purple-200',
    },
    {
      label: 'Awaiting Review',
      value: stats.awaitingReview,
      icon: <Clock className="w-5 h-5 text-amber-600" aria-hidden="true" />,
      bg: 'bg-amber-50 border-amber-200',
      highlight: stats.awaitingReview > 0,
    },
    {
      label: 'Verified Reports',
      value: stats.verifiedReports,
      icon: <FileCheck className="w-5 h-5 text-emerald-600" aria-hidden="true" />,
      bg: 'bg-emerald-50 border-emerald-200',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Welcome Banner & Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Clinical Overview & Analytics</h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time monitoring of patient records, automated extraction pipeline, and verification workflows.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSeedDemoData}
            disabled={seeding}
            aria-label="Seed Hackathon demonstration dataset"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 transition shadow-2xs cursor-pointer disabled:opacity-50"
            title="Populates complete realistic demo data for Robert Vance"
          >
            {seeding ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-teal-600" aria-hidden="true" />
            )}
            <span>{seeding ? 'Generating...' : 'Seed Hackathon Demo Data'}</span>
          </button>

          <Link
            to="/app/patients/new"
            aria-label="Create new patient intake"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>New Patient</span>
          </Link>
        </div>
      </div>

      {/* Metrics Stat Cards (6 Column Responsive Grid) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`p-4 rounded-2xl border shadow-subtle transition hover:shadow-card ${card.bg}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-600 tracking-tight">{card.label}</span>
              <div className="p-1.5 bg-white rounded-xl shadow-2xs">{card.icon}</div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reports Verification Status Donut */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-teal-600" aria-hidden="true" />
              <h3 className="text-sm font-bold text-slate-900">Reports by Verification Status</h3>
            </div>
            <span className="text-[11px] font-medium text-slate-400">Real-time status</span>
          </div>

          {reportStatusData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-slate-400">
              <FileText className="w-8 h-8 text-slate-300 mb-2" aria-hidden="true" />
              <p className="text-xs font-medium">No report data available yet.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Upload a report or click "Seed Hackathon Demo Data" to view status distribution.</p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reportStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {reportStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Clinical Workflow Pipeline Bar Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" aria-hidden="true" />
              <h3 className="text-sm font-bold text-slate-900">Clinical Workflow Pipeline</h3>
            </div>
            <span className="text-[11px] font-medium text-slate-400">Total record counts</span>
          </div>

          {pipelineData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-slate-400">
              <Activity className="w-8 h-8 text-slate-300 mb-2" aria-hidden="true" />
              <p className="text-xs font-medium">No workflow data available yet.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Metrics will populate as clinical documents are processed.</p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {pipelineData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
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
              aria-label="View all patients directory"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>

          {data?.recentPatients?.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" aria-hidden="true" />
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
                        {pt.name?.includes('DEMO') && (
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
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition" aria-hidden="true" />
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
              <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" aria-hidden="true" />
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
