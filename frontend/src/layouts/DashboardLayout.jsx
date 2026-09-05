import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ResponsibleAiBanner from '../components/ResponsibleAiBanner';
import { Menu, X, Plus, Upload, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentUser } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Universal Responsible AI Safety Banner */}
      <ResponsibleAiBanner />

      <div className="flex flex-1 relative">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Mobile drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative z-10 w-72 h-full bg-slate-900 flex flex-col">
              <div className="p-4 flex items-center justify-between border-b border-slate-800">
                <span className="text-white font-bold">MedLens Portal</span>
                <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <Sidebar />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar for Mobile & Desktop quick-actions */}
          <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-base font-semibold text-slate-800 tracking-tight">
                  Clinical Workspace
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                to="/app/patients/new"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Patient</span>
              </Link>
              <Link
                to="/app/upload"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-all"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Report</span>
              </Link>
            </div>
          </header>

          {/* Page Body */}
          <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
