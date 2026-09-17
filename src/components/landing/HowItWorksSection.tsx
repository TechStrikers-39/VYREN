import React from 'react';
import { useTranslation } from '@/i18n';

export const HowItWorksSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="w-full bg-surface-alt py-20 lg:py-28 border-b border-border" id="how-it-works">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-2xl mb-14">
          <span className="font-mono text-xs uppercase text-action-blue font-bold tracking-wider">
            [{t('landing.howBadge', {}, 'THE CONTINUOUS ADAPTIVE CYCLE')}]
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight mt-2 mb-3">
            {t('landing.howTitle', {}, 'How VYREN Works')}
          </h2>
          <p className="text-base sm:text-lg text-text-secondary leading-relaxed">
            {t('landing.howSubtitle', {}, 'From diagnostic measurement to proven capability. A living feedback cycle that continuously re-evaluates trajectories and updates curricula.')}
          </p>
        </div>

        {/* 5 Flowing Sequential Steps */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 lg:gap-5">
          {/* 01 Assess */}
          <div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex flex-col justify-between hover:border-action-blue transition-all duration-200">
            <div>
              <div className="w-10 h-10 rounded-lg bg-surface-alt border border-border flex items-center justify-center font-mono font-bold text-primary-navy mb-5">
                01
              </div>
              <h3 className="text-base font-bold text-text-primary mb-2">{t('landing.step1Title', {}, 'Assess')}</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {t('landing.step1Desc', {}, 'Adaptive baseline diagnostic adjusts question difficulty on-the-fly using Item Response Theory.')}
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-border flex items-center gap-1.5 text-xs text-text-muted font-mono">
              <span className="material-symbols-outlined text-sm text-action-blue">biotech</span>
              <span>IRT Calibration</span>
            </div>
          </div>

          {/* 02 Identify Gaps */}
          <div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex flex-col justify-between hover:border-action-blue transition-all duration-200">
            <div>
              <div className="w-10 h-10 rounded-lg bg-surface-alt border border-border flex items-center justify-center font-mono font-bold text-primary-navy mb-5">
                02
              </div>
              <h3 className="text-base font-bold text-text-primary mb-2">{t('landing.step2Title', {}, 'Identify Gaps')}</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {t('landing.step2Desc', {}, 'Algorithmic delta detection extracts exact capability deficits against national cadre benchmarks.')}
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-border flex items-center gap-1.5 text-xs text-text-muted font-mono">
              <span className="material-symbols-outlined text-sm text-critical-red">calculate</span>
              <span>Delta Calculus</span>
            </div>
          </div>

          {/* 03 Recommend */}
          <div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex flex-col justify-between hover:border-action-blue transition-all duration-200">
            <div>
              <div className="w-10 h-10 rounded-lg bg-surface-alt border border-border flex items-center justify-center font-mono font-bold text-primary-navy mb-5">
                03
              </div>
              <h3 className="text-base font-bold text-text-primary mb-2">{t('landing.step3Title', {}, 'Recommend')}</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {t('landing.step3Desc', {}, 'Precision learning modules synthesized directly targeting the diagnosed deficiency.')}
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-border flex items-center gap-1.5 text-xs text-text-muted font-mono">
              <span className="material-symbols-outlined text-sm text-action-blue">alt_route</span>
              <span>Dynamic Pathway</span>
            </div>
          </div>

          {/* 04 Learn */}
          <div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex flex-col justify-between hover:border-action-blue transition-all duration-200">
            <div>
              <div className="w-10 h-10 rounded-lg bg-surface-alt border border-border flex items-center justify-center font-mono font-bold text-primary-navy mb-5">
                04
              </div>
              <h3 className="text-base font-bold text-text-primary mb-2">{t('landing.step4Title', {}, 'Learn')}</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {t('landing.step4Desc', {}, 'Targeted skill acquisition through micro-pedagogical casework and interactive validation notebooks.')}
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-border flex items-center gap-1.5 text-xs text-text-muted font-mono">
              <span className="material-symbols-outlined text-sm text-primary-navy">menu_book</span>
              <span>Bite-Sized Modules</span>
            </div>
          </div>

          {/* 05 Improve */}
          <div className="bg-surface p-6 rounded-xl border border-border border-t-4 border-t-primary-navy shadow-sm flex flex-col justify-between hover:border-border-strong transition-all duration-200">
            <div>
              <div className="w-10 h-10 rounded-lg bg-primary-navy text-on-primary flex items-center justify-center font-mono font-bold mb-5">
                05
              </div>
              <h3 className="text-base font-bold text-text-primary mb-2">{t('landing.step5Title', {}, 'Improve')}</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {t('landing.step5Desc', {}, 'Score recalibration and continuous growth. Verification feeds immediately into the next cycle.')}
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-border flex items-center gap-1.5 text-xs text-success-green font-mono font-semibold">
              <span className="material-symbols-outlined text-sm">trending_up</span>
              <span>Verified Mastery</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
