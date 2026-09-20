import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/constants/routes';
import VyrenLogo from '../brand/VyrenLogo';
import { JourneyTimeline } from './JourneyTimeline';
import { FaqSection } from './FaqSection';
import { X, ArrowRight } from 'lucide-react';

export interface HelpGuideOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export const HelpGuideOverlay: React.FC<HelpGuideOverlayProps> = ({
  isOpen,
  onClose,
  triggerRef,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Background scroll lock & focus restoration
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Lock body scroll
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // Focus close button on open
      const focusTimer = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);

      // Escape key handler & focus trap
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
          return;
        }

        if (e.key === 'Tab' && dialogRef.current) {
          const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );

          if (focusableElements.length === 0) return;

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        clearTimeout(focusTimer);
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);

        // Restore focus to trigger element
        if (triggerRef?.current) {
          triggerRef.current.focus();
        } else if (previousActiveElement.current) {
          previousActiveElement.current.focus();
        }
      };
    }
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const handleGetStarted = () => {
    onClose();
    if (isAuthenticated && user) {
      if (user.role === 'admin') navigate(ROUTES.ADMIN.DASHBOARD);
      else if (user.role === 'trainer') navigate(ROUTES.TRAINER.STUDIO);
      else navigate(ROUTES.LEARNER.DASHBOARD);
    } else {
      navigate(ROUTES.AUTH.LOGIN);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-guide-dialog-title"
      ref={dialogRef}
    >
      {/* Dialog Shell */}
      <div className="bg-surface border border-border text-text-primary rounded-xl sm:rounded-2xl shadow-2xl flex flex-col w-full max-w-5xl h-[94vh] max-h-[94vh] overflow-hidden">
        {/* Sticky Header */}
        <header className="sticky top-0 z-20 bg-surface/95 backdrop-blur-xs border-b border-border px-5 sm:px-7 py-3.5 sm:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <VyrenLogo size="sm" />
            <span className="text-text-muted text-xs">|</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              {t('helpGuide.trigger', {}, 'Help & Guide')}
            </span>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t('helpGuide.close', {}, 'Close')}
            className="p-1.5 sm:p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-alt border border-border transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-navy"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </header>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-8 md:px-10 py-6 sm:py-10 space-y-10 sm:space-y-14">
          {/* Hero / Intro */}
          <section aria-labelledby="help-guide-dialog-title" className="max-w-3xl">
            <span className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider text-action-blue mb-1.5 block">
              {t('helpGuide.badge', {}, 'YOUR VYREN JOURNEY')}
            </span>
            <h2
              id="help-guide-dialog-title"
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary tracking-tight mb-2"
            >
              {t('helpGuide.title', {}, 'How to Use VYREN')}
            </h2>
            <p className="text-base sm:text-lg font-medium text-text-secondary mb-3 leading-snug">
              {t('helpGuide.supportingText', {}, 'From professional context to demonstrated competency.')}
            </p>
            <p className="text-sm text-text-secondary leading-relaxed">
              {t(
                'helpGuide.intro',
                {},
                'VYREN uses your professional context to personalize your competency diagnostic, identify measurable skill gaps, recommend relevant learning, and continuously update your competency profile as you demonstrate new capabilities.'
              )}
            </p>
          </section>

          {/* 6-Step Journey Timeline */}
          <section aria-label="Competency Journey Stages">
            <JourneyTimeline />
          </section>

          <hr className="border-border/80" aria-hidden="true" />

          {/* Common Questions / FAQ */}
          <FaqSection />

          {/* Closing Action CTA */}
          <section
            aria-label="Get Started with VYREN"
            className="bg-surface-alt border border-border rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
          >
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted block mb-1">
                {t('helpGuide.cta.subtitle', {}, 'Ready to begin?')}
              </span>
              <h4 className="text-base sm:text-lg font-bold text-text-primary">
                {t('helpGuide.cta.title', {}, 'Explore your competency journey with VYREN.')}
              </h4>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleGetStarted}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg bg-primary-navy text-on-primary font-semibold text-sm hover:bg-primary-navy/90 shadow-xs transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-navy focus-visible:ring-offset-2 w-full sm:w-auto"
              >
                <span>{t('helpGuide.cta.getStarted', {}, 'Get Started')}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-surface font-medium text-sm transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-navy w-full sm:w-auto"
              >
                {t('helpGuide.cta.closeGuide', {}, 'Close Guide')}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default HelpGuideOverlay;
