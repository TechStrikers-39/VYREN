import React, { useState } from 'react';

export interface IntegrationModeBadgeProps {
  serviceName: 'iGOT Karmayogi' | 'Gemini AI' | string;
  mode: string;
  isReal: boolean;
  providerName?: string;
  blockerSummary?: string | null;
  blockerDetails?: string | null;
  className?: string;
}

export const IntegrationModeBadge: React.FC<IntegrationModeBadgeProps> = ({
  serviceName,
  mode,
  isReal,
  providerName,
  blockerSummary,
  blockerDetails,
  className = '',
}) => {
  const [showModal, setShowModal] = useState(false);

  const isRealMode = isReal || mode.toUpperCase() === 'REAL';

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border tracking-wide transition-all ${
          isRealMode
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full animate-pulse ${
            isRealMode ? 'bg-emerald-500' : 'bg-amber-500'
          }`}
        />
        <span>{isRealMode ? `REAL ${serviceName.toUpperCase().split(' ')[0]}` : 'FALLBACK / LOCAL'}</span>
      </span>

      <button
        type="button"
        onClick={() => setShowModal(!showModal)}
        title="View Integration Diagnostics & Blocker Details"
        className="p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-alt transition-colors text-xs font-mono"
      >
        ℹ️
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-lg p-6 rounded-2xl bg-surface border border-border shadow-2xl space-y-4 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${isRealMode ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <h4 className="text-base font-bold text-text-primary">
                  {serviceName} Integration Status
                </h4>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-text-secondary hover:text-text-primary text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-surface-alt border border-border space-y-1">
                <span className="font-mono uppercase text-[10px] text-text-secondary">Current Active Mode</span>
                <p className="font-bold text-text-primary text-sm">
                  {isRealMode ? '🟢 LIVE EXTERNAL SERVICE' : '🟠 LOCAL FALLBACK PROVIDER'}
                </p>
              </div>

              {providerName && (
                <div className="p-3 rounded-xl bg-surface-alt border border-border space-y-1">
                  <span className="font-mono uppercase text-[10px] text-text-secondary">Engine Provider</span>
                  <p className="font-semibold text-text-primary">{providerName}</p>
                </div>
              )}

              {!isRealMode && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-100 space-y-2">
                  <span className="font-bold uppercase text-[10px] tracking-wider text-amber-700 dark:text-amber-300">
                    Integration Blocker & Safeguard Notice
                  </span>
                  {blockerSummary && (
                    <p className="font-semibold text-xs leading-relaxed">{blockerSummary}</p>
                  )}
                  {blockerDetails && (
                    <p className="text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed opacity-90 font-mono">
                      {blockerDetails}
                    </p>
                  )}
                  <p className="text-[11px] leading-relaxed pt-1 text-text-secondary italic">
                    Per VYREN architectural integrity rules: No mock data or fabricated responses are disguised as live external services.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg bg-primary-navy text-on-primary text-xs font-semibold hover:opacity-95 transition-opacity"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationModeBadge;
