import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Activity,
  Users,
  FileText,
  Clock,
  BarChart3,
  Settings,
  LogOut,
  Sparkles,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: '/app/dashboard', label: 'Dashboard', icon: <Activity className="w-4 h-4" /> },
    { to: '/app/patients', label: 'Patients', icon: <Users className="w-4 h-4" /> },
    { to: '/app/upload', label: 'Upload Report', icon: <FileText className="w-4 h-4" /> },
    { to: '/app/analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { to: '/app/settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0 shrink-0 border-r border-slate-800">
      {/* Brand */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shadow-inner">
          <Stethoscope className="w-5 h-5 text-teal-400" />
        </div>
        <div>
          <div className="font-bold text-base text-white tracking-tight flex items-center gap-1.5">
            MedLens
            <span className="text-[10px] uppercase font-semibold tracking-wider bg-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded border border-teal-500/30">
              AI CI
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Clinical Intelligence</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 pb-2">
          Clinical Portal
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-teal-600/20 text-teal-300 border border-teal-500/30'
                  : 'hover:bg-slate-800/80 hover:text-slate-100 text-slate-400'
              }`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Safety badge in sidebar */}
      <div className="p-3 mx-3 mb-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-400 space-y-1">
        <div className="flex items-center gap-1.5 text-teal-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Clinical Verification</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          Source references preserved strictly. Human verification required.
        </p>
      </div>

      {/* User Profile & Logout */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-teal-700 text-white flex items-center justify-center font-semibold text-xs shrink-0">
            {currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : 'D'}
          </div>
          <div className="truncate">
            <div className="text-xs font-semibold text-white truncate">
              {currentUser?.displayName || 'Clinical Reviewer'}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {currentUser?.email || 'clinician@medlens.health'}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-md transition-colors"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
