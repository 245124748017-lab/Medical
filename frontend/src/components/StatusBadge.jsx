import React from 'react';
import { ArrowDown, ArrowUp, CheckCircle, HelpCircle } from 'lucide-react';

export default function StatusBadge({ status, size = 'sm' }) {
  const norm = (status || 'CANNOT_DETERMINE').toUpperCase();

  const styles = {
    LOW: 'bg-amber-50 text-amber-800 border-amber-300 font-medium',
    HIGH: 'bg-rose-50 text-rose-800 border-rose-300 font-medium',
    NORMAL: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-medium',
    UNKNOWN: 'bg-slate-100 text-slate-700 border-slate-300 font-normal',
    CANNOT_DETERMINE: 'bg-slate-100 text-slate-700 border-slate-300 font-normal',
  };

  const icons = {
    LOW: <ArrowDown className="w-3.5 h-3.5 text-amber-600" />,
    HIGH: <ArrowUp className="w-3.5 h-3.5 text-rose-600" />,
    NORMAL: <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />,
    UNKNOWN: <HelpCircle className="w-3.5 h-3.5 text-slate-500" />,
    CANNOT_DETERMINE: <HelpCircle className="w-3.5 h-3.5 text-slate-500" />,
  };

  const labels = {
    LOW: 'LOW',
    HIGH: 'HIGH',
    NORMAL: 'NORMAL',
    UNKNOWN: 'CANNOT DETERMINE',
    CANNOT_DETERMINE: 'CANNOT DETERMINE',
  };

  const sizeClasses = size === 'xs' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border shadow-2xs whitespace-nowrap ${
        styles[norm] || styles.CANNOT_DETERMINE
      } ${sizeClasses}`}
    >
      {icons[norm] || icons.CANNOT_DETERMINE}
      <span>{labels[norm] || norm}</span>
    </span>
  );
}