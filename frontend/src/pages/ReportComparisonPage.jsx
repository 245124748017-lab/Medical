import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BarChart3,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Activity,
  Calendar,
  AlertCircle,
  FileText,
  Loader2,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { patientAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';

export default function ReportComparisonPage() {
  const { id } = useParams();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [comparisons, setComparisons] = useState([]);
  const [totalReports, setTotalReports] = useState(0);
  const [selectedTestName, setSelectedTestName] = useState(null);

  useEffect(() => {
    const fetchComparison = async () => {
      try {
        setLoading(true);
        const res = await patientAPI.getComparison(id);
        if (res.data.success) {
          setPatient(res.data.patient);
          setComparisons(res.data.comparisons || []);
          setTotalReports(res.data.totalReports || 0);
          if (res.data.comparisons?.length > 0) {
            setSelectedTestName(res.data.comparisons[0].testName);
          }
        }
      } catch (err) {
        addToast(err.message || 'Failed to load report comparison.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchComparison();
  }, [id]);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Computing longitudinal comparison data...</p>
      </div>
    );
  }

  const selectedComparison = comparisons.find((c) => c.testName === selectedTestName);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/app/patients/${id}/record`}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Longitudinal Report Comparison
            </h2>
            <p className="text-xs text-slate-500">
              Comparing diagnostic parameters across {totalReports} uploaded medical documents for{' '}
              <strong className="text-slate-700">{patient?.name}</strong>.
            </p>
          </div>
        </div>

        <Link
          to={`/app/upload?patientId=${id}`}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm self-start sm:self-auto"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Upload Another Report</span>
        </Link>
      </div>

      {/* Safety Notice for Comparison */}
      <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-950 flex items-center gap-2.5">
        <ShieldCheck className="w-4 h-4 text-sky-700 shrink-0" />
        <span>
          <strong>Clinical Caution:</strong> Trend comparisons illustrate mathematical deltas across report dates. MedLens does not infer pathological progression from isolated test changes.
        </span>
      </div>

      {comparisons.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-subtle">
          <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No Historical Comparisons Available</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Upload at least two medical reports for this patient to view side-by-side longitudinal trends.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Parameter List & Deltas */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Diagnostic Parameters ({comparisons.length})
            </h3>

            <div className="space-y-2">
              {comparisons.map((item) => {
                const isSelected = item.testName === selectedTestName;
                const hasDelta = item.delta !== null;

                return (
                  <button
                    key={item.testName}
                    type="button"
                    onClick={() => setSelectedTestName(item.testName)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-teal-50/70 border-teal-400 shadow-xs ring-2 ring-teal-100'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-subtle'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-slate-900">{item.testName}</span>
                      <StatusBadge status={item.current.status} size="xs" />
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400 text-[11px] block">Current:</span>
                        <span className="font-bold text-slate-800">
                          {item.current.value} {item.unit}
                        </span>
                      </div>

                      {item.previous && (
                        <div>
                          <span className="text-slate-400 text-[11px] block">Previous:</span>
                          <span className="text-slate-600 font-medium">
                            {item.previous.value} {item.unit}
                          </span>
                        </div>
                      )}

                      {hasDelta && (
                        <div className="text-right">
                          <span className="text-slate-400 text-[11px] block">Delta:</span>
                          <span
                            className={`font-bold flex items-center justify-end gap-0.5 ${
                              item.delta > 0
                                ? 'text-amber-700'
                                : item.delta < 0
                                ? 'text-sky-700'
                                : 'text-slate-600'
                            }`}
                          >
                            {item.delta > 0 ? (
                              <TrendingUp className="w-3.5 h-3.5" />
                            ) : item.delta < 0 ? (
                              <TrendingDown className="w-3.5 h-3.5" />
                            ) : (
                              <Minus className="w-3.5 h-3.5" />
                            )}
                            {item.delta > 0 ? `+${item.delta}` : item.delta} {item.unit}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Trend Visualizer & Clinical Statement */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-subtle flex flex-col justify-between space-y-6">
            {selectedComparison ? (
              <>
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {selectedComparison.testName} Longitudinal Trend
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Source Reference Range:{' '}
                        {selectedComparison.referenceRange?.rawText || 'Not specified in report'}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Current Value
                      </span>
                      <span className="text-lg font-extrabold text-slate-900">
                        {selectedComparison.current.value} {selectedComparison.unit}
                      </span>
                    </div>
                  </div>

                  {/* Objective Neutral Statement */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                    <strong className="text-slate-900 font-semibold block mb-1">
                      Objective Finding:
                    </strong>
                    {selectedComparison.changeText}
                  </div>

                  {/* Recharts Chart */}
                  <div className="mt-6 h-64 w-full">
                    {selectedComparison.trendData.length > 1 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={selectedComparison.trendData}
                          margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            tickLine={false}
                            domain={['auto', 'auto']}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs shadow-lg space-y-1">
                                    <div className="font-semibold">{data.date}</div>
                                    <div>
                                      Value: {data.value} {data.unit}
                                    </div>
                                    <div>Status: {data.status}</div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#0d9488"
                            strokeWidth={2.5}
                            dot={{ fill: '#0d9488', r: 5 }}
                            activeDot={{ r: 7 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        Single baseline observation. Additional uploaded reports will render multi-point timeline trends.
                      </div>
                    )}
                  </div>
                </div>

                {/* Measurement History Table */}
                <div className="border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Measurement History Across Documents
                  </h4>
                  <div className="divide-y divide-slate-100 text-xs">
                    {selectedComparison.trendData.map((pt, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between">
                        <span className="font-medium text-slate-800">{pt.date}</span>
                        <span className="font-bold text-slate-900">
                          {pt.value} {pt.unit}
                        </span>
                        <StatusBadge status={pt.status} size="xs" />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-20 text-slate-400 text-xs">
                Select a diagnostic parameter from the left panel to inspect longitudinal progression.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
