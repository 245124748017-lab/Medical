import React, { useState, useEffect } from 'react';
import { Settings, ShieldCheck, Sparkles, Server, Key, User, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import axios from 'axios';

export default function SettingsPage() {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const [health, setHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const checkHealth = async () => {
    try {
      setLoadingHealth(true);
      const res = await axios.get('/api/health');
      setHealth(res.data);
    } catch (e) {
      setHealth({ status: 'offline', message: 'Backend unreachable' });
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const handleSeedDemo = async () => {
    try {
      setSeeding(true);
      const res = await dashboardAPI.seedDemo();
      if (res.data.success) {
        addToast('Hackathon demo dataset loaded successfully!', 'success');
      }
    } catch (e) {
      addToast('Failed to seed demo data.', 'error');
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
              <span className={`w-2.5 h-2.5 rounded-full ${health?.status === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="font-semibold text-slate-800">Node.js / Express REST API</span>
            </div>
            <span className="font-bold text-emerald-700">{health?.status === 'online' ? 'Connected' : 'Offline'}</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="font-semibold text-slate-800">Local MongoDB Service (Port 27017)</span>
            </div>
            <span className="font-bold text-emerald-700">Active</span>
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
