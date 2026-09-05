import React from 'react';
import { Check, Loader2 } from 'lucide-react';

const STEPS = [
  { id: 'UPLOADING', label: 'Uploading' },
  { id: 'ANALYZING', label: 'Analyzing' },
  { id: 'EXTRACTING', label: 'Extracting' },
  { id: 'VALIDATING', label: 'Validating' },
  { id: 'READY_FOR_REVIEW', label: 'Ready for Review' },
];

export default function Stepper({ currentStatus }) {
  const getStepIndex = (status) => {
    switch (status) {
      case 'UPLOADING': return 0;
      case 'ANALYZING': return 1;
      case 'EXTRACTING': return 2;
      case 'VALIDATING': return 3;
      case 'READY_FOR_REVIEW':
      case 'VERIFIED': return 4;
      default: return 0;
    }
  };

  const activeIndex = getStepIndex(currentStatus);

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        {/* Background track line */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-slate-200 w-full z-0" />
        {/* Progress track line */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-teal-600 z-0 transition-all duration-500 ease-out"
          style={{ width: `${(activeIndex / (STEPS.length - 1)) * 100}%` }}
        />

        {STEPS.map((step, index) => {
          const isCompleted = index < activeIndex;
          const isCurrent = index === activeIndex;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center group">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-medium text-xs transition-all duration-300 ${
                  isCompleted
                    ? 'bg-teal-600 text-white shadow-sm'
                    : isCurrent
                    ? 'bg-white border-2 border-teal-600 text-teal-700 shadow-md ring-4 ring-teal-100'
                    : 'bg-white border-2 border-slate-300 text-slate-400'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span
                className={`text-xs mt-2 font-medium tracking-tight whitespace-nowrap transition-colors ${
                  isCompleted || isCurrent ? 'text-teal-900 font-semibold' : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
