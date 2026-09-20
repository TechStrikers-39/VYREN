import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/constants/routes';
import { useTranslation } from '@/i18n';
import LanguageSelector from '@/components/ui/LanguageSelector';
import { LogOut, RotateCcw } from 'lucide-react';

const DEMO_LEARNER_ID = '7912b349-a54d-4938-bf2e-23b0af8ae5d9';
const DEMO_LEARNER_EMAIL = 'alex.vance@gmail.com';

interface TopNavHeaderProps {
  roleBadge: string;
  roleBadgeColor: string;
  subTitle: string;
}

export const TopNavHeader: React.FC<TopNavHeaderProps> = ({
  roleBadge,
  roleBadgeColor,
  subTitle,
}) => {
  const { user, logout, resetDemo } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const isDemoLearner =
    user?.id === DEMO_LEARNER_ID && user?.email?.toLowerCase() === DEMO_LEARNER_EMAIL;

  const handleSignOut = async () => {
    await logout();
    navigate(ROUTES.AUTH.LOGIN);
  };

  const handleConfirmReset = async () => {
    setIsResetting(true);
    setResetError(null);
    try {
      await resetDemo();
      setShowResetModal(false);
      navigate(ROUTES.LEARNER.ONBOARDING, { replace: true });
    } catch (err: any) {
      console.error('Demo reset error:', err);
      setResetError(err.message || 'Failed to reset demo learner. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      <header className="h-16 border-b border-border bg-surface px-6 flex items-center justify-between shrink-0 shadow-2xs">
        {/* Left: Role & Workspace Indicator */}
        <div className="flex items-center gap-3">
          <span
            className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold border uppercase tracking-wider ${roleBadgeColor}`}
          >
            {roleBadge}
          </span>
          <div className="hidden sm:flex items-center gap-2 text-xs text-text-secondary border-l border-border pl-3">
            <span className="font-semibold text-text-primary">{subTitle}</span>
            <span className="text-text-secondary/50">•</span>
            <span className="text-[11px] font-mono text-text-secondary/80">MoSPI &amp; NSSTA</span>
          </div>
        </div>

        {/* Right: Language Selector, User Profile & Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          <LanguageSelector variant="compact" />

          {/* Demo Reset Trigger (Strictly Demo Learner Only) */}
          {isDemoLearner && (
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              title="Reset Demo Learner state to fresh onboarding"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold transition-colors duration-150 shadow-2xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Demo</span>
            </button>
          )}

          <div className="flex items-center gap-2.5 text-right">
            <div className="hidden md:block">
              <span className="block text-xs font-bold text-text-primary leading-tight">
                {user?.name || t('auth.governmentOfficial', {}, 'Authorized Officer')}
              </span>
              <span className="block text-[10px] text-text-secondary font-mono truncate max-w-[200px]">
                {user?.designation || 'Statistical Cadre'} &bull; {user?.department || 'MoSPI'}
              </span>
            </div>

            <div className="w-8 h-8 rounded-full bg-primary-navy/10 border border-primary-navy/20 text-primary-navy flex items-center justify-center font-mono font-bold text-xs shrink-0">
              {getInitials(user?.name)}
            </div>
          </div>

          <button
            onClick={handleSignOut}
            title={t('navigation.switchPersona', {}, 'Sign out or switch workspace')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-alt text-text-secondary hover:text-text-primary text-xs font-semibold transition-colors duration-150 shadow-2xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('navigation.switchPersona', {}, 'Switch Persona')}</span>
          </button>
        </div>
      </header>

      {/* Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">Reset Demo Learner?</h3>
                <p className="text-xs text-text-secondary">Return to fresh contextual onboarding</p>
              </div>
            </div>

            <div className="text-xs text-text-secondary mb-6 leading-relaxed bg-surface-alt p-3.5 rounded-xl border border-border/60">
              <p className="font-semibold text-text-primary mb-2">This will clear the current demo learner's:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Contextual onboarding answers</li>
                <li>Active &amp; past diagnostic assessment instances</li>
                <li>Competency scores &amp; skill gaps</li>
                <li>Adaptive learning path &amp; course progress</li>
                <li>Skill-gap linked recommendations</li>
              </ul>
              <p className="mt-2.5 text-text-secondary/90">
                You will return to the onboarding questionnaire to test fresh cadre parameters and generate a new calibrated diagnostic.
              </p>
            </div>

            {resetError && (
              <div className="mb-4 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium">
                {resetError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-border text-text-secondary hover:text-text-primary hover:bg-surface-alt transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleConfirmReset}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-colors flex items-center gap-1.5"
              >
                {isResetting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <span>Reset Demo</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TopNavHeader;
