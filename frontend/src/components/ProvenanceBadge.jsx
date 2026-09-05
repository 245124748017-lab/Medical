import React, { useState } from 'react';
import { Database, Cpu, CheckCircle2, UserCheck, Sparkles, ShieldCheck, ChevronRight } from 'lucide-react';

export default function ProvenanceBadge({ source, confidence, verified, verifiedBy, onClick }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const getBadgeConfig = () => {
    if (verified || source === 'HUMAN_VERIFIED') {
      return {
        label: 'Human Verified',
        subtext: verifiedBy ? `Approved by ${verifiedBy}` : 'Clinically Approved',
        trail: ['Medical Report', 'AI Extracted', 'Human Verified'],
        bg: 'bg-teal-50 border-teal-300 text-teal-800',
        icon: <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />,
      };
    }

    if (source === 'AI_EXTRACTED') {
      return {
        label: 'AI Extracted',
        subtext: confidence ? `${Math.round(confidence * 100)}% confidence` : 'Pending Verification',
        trail: ['Medical Report', 'AI Extracted'],
        bg: 'bg-sky-50 border-sky-300 text-sky-800',
        icon: <Cpu className="w-3.5 h-3.5 text-sky-600" />,
      };
    }

    if (source === 'AI_GENERATED') {
      return {
        label: 'AI Generated',
        subtext: 'Clinical Summary Engine',
        trail: ['Source Data', 'AI Generated'],
        bg: 'bg-purple-50 border-purple-300 text-purple-800',
        icon: <Sparkles className="w-3.5 h-3.5 text-purple-600" />,
      };
    }

    return {
      label: 'User Provided',
      subtext: 'Direct Clinical Intake',
      trail: ['User Provided'],
      bg: 'bg-slate-100 border-slate-300 text-slate-800',
      icon: <Database className="w-3.5 h-3.5 text-slate-600" />,
    };
  };

  const config = getBadgeConfig();

  return (
    <div className="relative inline-block" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors hover:shadow-2xs cursor-pointer ${config.bg}`}
      >
        {config.icon}
        <span>{config.label}</span>
        {confidence && !verified && (
          <span className="text-sky-600 text-[10px] font-semibold ml-0.5">
            {Math.round(confidence * 100)}%
          </span>
        )}
      </button>

      {/* Provenance Tooltip */}
      {showTooltip && (
        <div className="absolute z-40 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-white rounded-lg shadow-xl text-xs space-y-2 pointer-events-none">
          <div className="font-semibold text-teal-300 flex items-center justify-between border-b border-slate-700 pb-1.5">
            <span>Data Lineage & Provenance</span>
            <span className="text-[10px] text-slate-400">{verified ? 'Verified' : 'Pending'}</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-300">
            {config.trail.map((step, idx) => (
              <React.Fragment key={step}>
                <span className={`px-1.5 py-0.5 rounded ${idx === config.trail.length - 1 ? 'bg-teal-900/80 text-teal-200 font-medium' : 'bg-slate-800 text-slate-400'}`}>
                  {step}
                </span>
                {idx < config.trail.length - 1 && <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />}
              </React.Fragment>
            ))}
          </div>

          <div className="text-[11px] text-slate-300 pt-1">
            <div><strong className="text-slate-400">Confidence:</strong> {confidence ? `${Math.round(confidence * 100)}%` : 'N/A'}</div>
            {verifiedBy && <div><strong className="text-slate-400">Reviewer:</strong> {verifiedBy}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
