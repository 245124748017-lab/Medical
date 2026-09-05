import React, { useState, useEffect } from 'react';
import { Settings, ShieldCheck, Sparkles, Server, Key, User, CheckCircle2, AlertCircle, RefreshCw, Globe, Save, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import API, { dashboardAPI, getBaseURL } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function SettingsPage() {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const [health, setHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState(
    localStorage.getItem('medlens_custom_api_url') || ''
  );
  const isVercelMissingEnv =
    typeof window !== 'undefined' &&
    window.location.hostname.includes('vercel.app') &&
    !import.meta.env.VITE_API_URL &&
    !localStorage.getItem('medlens_custom_api_url');

  const checkHealth = async () => {
    try {
      setLoadingHealth(true);
      const res = await API.get('/health');
      setHealth(res.data);
    } catch (e) {
      setHealth({ status: 'offline', message: e.message || 'Backend unreachable' });
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const handleSaveApiUrl = async (e) => {
    e.preventDefault();
    const cleanUrl = customApiUrl.trim().replace(/\/+$/, '');
    if (cleanUrl) {
      localStorage.setItem('medlens_custom_api_url', cleanUrl);
      addToast(`Backend URL set to ${cleanUrl}. Reconnecting...`, 'info');
    } else {
      localStorage.removeItem('medlens_custom_api_url');
      addToast('Reset to default API URL.', 'info');
    }
    await checkHealth();
  };

  const handleSeedDemo = async () => {
    try {
      setSeeding(true);
      const res = await dashboardAPI.seedDemo();
      if (res.data.success) {
        addToast('Hackathon demo dataset loaded successfully!', 'success');
      }
    } catch (e) {
      addToast(e.message || 'Failed to seed demo data.', 'error');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">System Configuration & Health</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Review clinical AI model connectivity, database status, and demonstration settings.
        </p>
      </div>

      {/* Reviewer Profile */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <User className="w-4 h-4 text-teal-600" />
          <span>Active Reviewer Profile</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Name</span>
            <span className="font-bold text-slate-900">{currentUser?.displayName || 'Clinical Reviewer'}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Email</span>
            <span className="font-bold text-slate-900">{currentUser?.email}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Role</span>
            <span className="font-bold text-teal-700 uppercase">Certified Clinical Reviewer</span>
          </div>
        </div>
      </div>

      {/* Backend & AI Integration Status */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Server className="w-4 h-4 text-teal-600" />
            <span>Infrastructure Connectivity</span>
          </h3>
          <button
            onClick={checkHealth}
            disabled={loadingHealth}
            className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1 font-semibold"
          >
            <RefreshCw className={`w-3 h-3 ${loadingHealth ? 'animate-spin' : ''}`} />
            <span>Refresh Status</span>
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${health?.status === 'ok' || health?.status === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="font-semibold text-slate-800">Node.js / Express REST API</span>
            </div>
            <span className="font-bold text-emerald-700">{health?.status === 'ok' || health?.status === 'online' ? 'Connected' : 'Offline'}</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${health?.supabaseConfigured ? 'bg-emerald-500' : 'bg-sky-500'}`} />
              <span className="font-semibold text-slate-800">Supabase PostgreSQL</span>
            </div>
            <span className="font-bold text-slate-700">{health?.supabaseConfigured ? 'Production Connected' : 'Demo/Development Active'}</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${health?.geminiConfigured ? 'bg-emerald-500' : 'bg-sky-500'}`} />
              <span className="font-semibold text-slate-800">Google Gemini API</span>
            </div>
            <span className="font-bold text-slate-700">
              {health?.geminiConfigured ? 'Production Key Active' : 'Safe Demo Fallback Engine Active'}
            </span>
          </div>
        </div>
      </div>

      {/* Backend API URL Configuration */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Globe className="w-4 h-4 text-teal-600" />
          <span>Render Backend API Endpoint</span>
        </h3>

        {isVercelMissingEnv && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 space-y-1">
              <p className="font-semibold">Action Required for Vercel Deployment</p>
              <p className="text-amber-700 leading-relaxed">
                Your frontend is hosted on Vercel, but <code>VITE_API_URL</code> was not set at build time. Requests to <code>/api/*</code> are currently hitting Vercel static hosting and failing with <strong>405 Method Not Allowed</strong>.
              </p>
              <p className="text-amber-700 leading-relaxed">
                Paste your Render backend URL below and click <strong>Save & Reconnect</strong> to connect immediately without waiting for a rebuild.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSaveApiUrl} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Render Backend URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customApiUrl}
                onChange={(e) => setCustomApiUrl(e.target.value)}
                placeholder="https://your-backend.onrender.com"
                className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition flex items-center gap-1.5 shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save & Connect</span>
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Active Endpoint: <code className="text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded font-mono">{getBaseURL()}</code>
          </p>
        </form>
      </div>

      {/* Demo Dataset Controls */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-teal-600" />
          <span>Hackathon Demonstration Dataset</span>
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Instantly seeds a standardized clinical test case for "Robert Vance" with baseline evaluation, follow-up report with out-of-range findings, unprovided reference ranges, and profile conflict detection.
        </p>

        <button
          onClick={handleSeedDemo}
          disabled={seeding}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{seeding ? 'Generating...' : 'Seed / Reset Demo Data'}</span>
        </button>
      </div>
    </div>
  );
}
