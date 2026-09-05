import React, { useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';

export default function ResponsibleAiBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-teal-950 text-white text-xs px-4 py-2.5 flex items-center justify-between shadow-sm border-b border-teal-800/40">
      <div className="flex items-center gap-2.5 max-w-5xl mx-auto text-center md:text-left">
        <ShieldAlert className="w-4 h-4 text-teal-400 shrink-0" />
        <span>
          <strong className="text-teal-300 font-semibold">Clinical Safety Notice:</strong> MedLens is an information organization tool and does not provide medical diagnosis or treatment. AI-generated extractions must always be verified by a qualified healthcare professional.
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-teal-300/70 hover:text-white p-1 rounded transition-colors"
        title="Dismiss notice"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
