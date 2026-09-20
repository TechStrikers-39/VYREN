import React, { useState, useRef } from 'react';
import VyrenLogo from '../brand/VyrenLogo';
import { useTranslation } from '@/i18n';
import { HelpGuideOverlay } from '../help/HelpGuideOverlay';

export const Footer: React.FC = () => {
  const { t } = useTranslation();
  const [isHelpGuideOpen, setIsHelpGuideOpen] = useState(false);
  const helpGuideTriggerRef = useRef<HTMLButtonElement>(null);

  return (
    <footer className="w-full bg-surface-alt border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-border text-sm text-text-secondary">
          <div className="flex items-center gap-2.5">
            <VyrenLogo size="sm" />
            <span className="text-text-muted text-xs">| {t('navigation.platformSubtitle', {}, 'Competency Intelligence Platform')}</span>
          </div>

          <nav className="flex flex-wrap items-center gap-6 text-xs sm:text-sm font-medium">
            <a className="hover:text-primary-navy transition-colors" href="#overview">
              {t('navigation.overview', {}, 'Overview')}
            </a>
            <a className="hover:text-primary-navy transition-colors" href="#problem">
              {t('navigation.theParadox', {}, 'The Paradox')}
            </a>
            <a className="hover:text-primary-navy transition-colors" href="#how-it-works">
              {t('navigation.howItWorks', {}, 'How It Works')}
            </a>
            <a className="hover:text-primary-navy transition-colors" href="#why-vyren">
              {t('navigation.whyVyren', {}, 'Why VYREN')}
            </a>
            <a className="hover:text-primary-navy transition-colors" href="#">
              Accessibility (WCAG AA)
            </a>
            <button
              ref={helpGuideTriggerRef}
              type="button"
              onClick={() => setIsHelpGuideOpen(true)}
              className="hover:text-primary-navy transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-navy rounded text-left font-medium"
            >
              {t('helpGuide.trigger', {}, 'Help & Guide')}
            </button>
          </nav>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
          <p>© 2026 VYREN. Built for India's Official Statistical System. {t('landing.allRightsReserved', {}, 'All rights reserved.')}</p>
          <p className="font-mono text-[11px] uppercase tracking-wider text-text-secondary">
            MoSPI • NSSTA • DIID Architecture
          </p>
        </div>
      </div>

      <HelpGuideOverlay
        isOpen={isHelpGuideOpen}
        onClose={() => {
          setIsHelpGuideOpen(false);
          helpGuideTriggerRef.current?.focus();
        }}
        triggerRef={helpGuideTriggerRef}
      />
    </footer>
  );
};

