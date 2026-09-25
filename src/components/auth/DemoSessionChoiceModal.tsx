import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n';
import { Play, RotateCcw, AlertCircle, ArrowRight } from 'lucide-react';

interface DemoSessionChoiceModalProps {
  isOpen: boolean;
  isResetting: boolean;
  resetError: string | null;
  onResume: () => void;
  onStartFresh: () => Promise<void>;
  onDismissError?: () => void;
}

export const DemoSessionChoiceModal: React.FC<DemoSessionChoiceModalProps> = ({
  isOpen,
  isResetting,
  resetError,
  onResume,
  onStartFresh,
  onDismissError,
}) => {
  const { t } = useTranslation();
  const [confirmStep, setConfirmStep] = useState(false);

  // Reset confirmation view if modal closes
  useEffect(() => {
    if (!isOpen) {
      setConfirmStep(false);
    }
  }, [isOpen]);

  // Keyboard accessibility: ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isResetting) {
        if (confirmStep) {
          setConfirmStep(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, confirmStep, isResetting]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-session-modal-title"
      aria-describedby="demo-session-modal-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-xl relative animate-in zoom-in-95 duration-150">
        {!confirmStep ? (
          /* ============================================================ */
          /* INITIAL CHOICE: Resume Existing Demo vs Start Fresh Demo    */
          /* ============================================================ */
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-primary-navy/10 border border-primary-navy/20 flex items-center justify-center text-primary-navy shrink-0">
                <Play className="w-5 h-5 fill-primary-navy/20" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-mono font-semibold uppercase tracking-wider mb-1.5">
                  Demo Learner Session
                </div>
                <h2
                  id="demo-session-modal-title"
                  className="text-lg sm:text-xl font-extrabold text-text-primary tracking-tight"
                >
                  {t('auth.demoSessionDetectedTitle', {}, 'Demo Session Detected')}
                </h2>
                <p
                  id="demo-session-modal-desc"
                  className="text-xs sm:text-sm text-text-secondary mt-1 leading-relaxed"
                >
                  {t(
                    'auth.demoSessionDetectedDesc',
                    {},
                    'An existing demo session was found. You can continue from where you left off or start a fresh demonstration.'
                  )}
                </p>
              </div>
            </div>

            {/* Choice Options Cards */}
            <div className="space-y-3">
              {/* Option 1: Resume Existing Demo (Primary) */}
              <button
                type="button"
                onClick={onResume}
                disabled={isResetting}
                className="w-full text-left p-4 rounded-xl border-2 border-primary-navy/30 bg-primary-navy/5 hover:bg-primary-navy/10 hover:border-primary-navy transition-all duration-150 flex items-center justify-between group focus:outline-none focus-visible:ring-2 focus-visible:ring-action-blue cursor-pointer"
              >
                <div className="space-y-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-primary-navy uppercase tracking-wider">
                      Recommended
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-text-primary group-hover:text-primary-navy transition-colors">
                    {t('auth.resumeDemoBtn', {}, 'Resume Existing Demo')}
                  </h3>
                  <p className="text-xs text-text-secondary">
                    {t(
                      'auth.resumeDemoHint',
                      {},
                      'Continue from your current progress and saved competencies.'
                    )}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-primary-navy text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>

              {/* Option 2: Start Fresh Demo (Secondary) */}
              <button
                type="button"
                onClick={() => setConfirmStep(true)}
                disabled={isResetting}
                className="w-full text-left p-4 rounded-xl border border-border bg-surface-alt hover:bg-surface hover:border-amber-500/40 transition-all duration-150 flex items-center justify-between group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
              >
                <div className="space-y-1 pr-4">
                  <h3 className="text-sm font-bold text-text-primary group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                    {t('auth.startFreshDemoBtn', {}, 'Start Fresh Demo')}
                  </h3>
                  <p className="text-xs text-text-secondary">
                    {t(
                      'auth.startFreshDemoHint',
                      {},
                      'Reset the demo learner and answer the 5 onboarding questions again.'
                    )}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg border border-border bg-surface text-text-secondary group-hover:text-amber-600 group-hover:border-amber-500/30 flex items-center justify-center shrink-0 transition-colors shadow-2xs">
                  <RotateCcw className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* CONFIRMATION STEP: Start Fresh Demo                         */
          /* ============================================================ */
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h2
                  id="demo-session-modal-title"
                  className="text-lg sm:text-xl font-extrabold text-text-primary tracking-tight"
                >
                  {t('auth.confirmFreshTitle', {}, 'Start Fresh Demo?')}
                </h2>
                <p
                  id="demo-session-modal-desc"
                  className="text-xs sm:text-sm text-text-secondary mt-1 leading-relaxed"
                >
                  {t(
                    'auth.confirmFreshDesc',
                    {},
                    'Your current demo progress will be cleared and the 5-step onboarding will start again.'
                  )}
                </p>
              </div>
            </div>

            <div className="text-xs text-text-secondary leading-relaxed bg-surface-alt p-4 rounded-xl border border-border/70 space-y-2">
              <p className="font-semibold text-text-primary">
                A fresh demonstration will:
              </p>
              <ul className="space-y-1 list-disc list-inside text-text-secondary/90">
                <li>Reset cadre profile attributes &amp; preferences</li>
                <li>Clear prior diagnostic assessment responses</li>
                <li>Allow answering the 5 onboarding questions with new parameters</li>
                <li>Generate a newly calibrated 18-question diagnostic blueprint</li>
              </ul>
            </div>

            {/* Error Message if Reset Failed */}
            {resetError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">
                    {t('auth.resetErrorTitle', {}, 'Reset Failed')}
                  </p>
                  <p>
                    {resetError ||
                      t(
                        'auth.resetErrorDesc',
                        {},
                        "We couldn't start a fresh demo. Your existing demo session has not been changed."
                      )}
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => {
                  if (onDismissError) onDismissError();
                  setConfirmStep(false);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-border text-text-secondary hover:text-text-primary hover:bg-surface-alt transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-action-blue cursor-pointer"
              >
                {t('auth.cancelBtn', {}, 'Cancel')}
              </button>

              <button
                type="button"
                disabled={isResetting}
                onClick={onStartFresh}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                {isResetting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{t('auth.preparingFresh', {}, 'Preparing fresh demo...')}</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('auth.confirmFreshBtn', {}, 'Start Fresh')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DemoSessionChoiceModal;
