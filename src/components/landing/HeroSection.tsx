import React from 'react';
import GradientWaves from '../ui/GradientWaves';
import SpecularButton from '../ui/SpecularButton';
import { useTranslation } from '@/i18n';

export const HeroSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="w-full min-h-screen flex flex-col justify-center bg-surface-alt py-12 lg:py-16 border-b border-border relative overflow-hidden" id="overview">
      {/* Full-bleed GradientWaves background layer */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-90">
        <GradientWaves
          horizonColor="#F8FAFC"
          waveColor="#1B3A6B"
          crestColor="#2563EB"
          speed={0.35}
          amplitude={2.8}
          waveScale={0.75}
          waveRatio={0.9}
          swell={35}
          turbulence={22}
          tilt={1.22}
          zoom={1.1}
          height={6.8}
          fogDepth={25}
          detail="medium"
          brightness={1.15}
          opacity={0.85}
          mouseInteraction={true}
          parallaxStrength={0.4}
          grain={true}
          grainIntensity={0.03}
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10 w-full">
        <div className="grid grid-cols-1 gap-12 lg:gap-16 items-center">
          {/* Editorial Column */}
          <div className="max-w-3xl mx-auto flex flex-col items-center text-center">
            <div className="inline-flex items-center justify-center gap-2 text-text-secondary font-mono text-xs uppercase tracking-[0.14em] mb-6 mx-auto select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-action-blue shrink-0"></span>
              <span>{t('landing.badge', {}, 'COMPETENCY INTELLIGENCE PLATFORM')}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[58px] leading-[1.1] font-bold text-text-primary tracking-[-0.03em] mb-6 text-center mx-auto">
              {t('landing.heroTitle1', {}, 'Turn Skills Into')}{' '}
              <br className="hidden sm:inline" />
              <span className="text-primary-navy">{t('landing.heroTitle2', {}, 'Intelligence.')}</span>
            </h1>

            <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mb-8 leading-relaxed font-normal text-center mx-auto">
              {t('landing.heroSubtitle', {}, 'Understand what you know, identify what you need, and get a learning path that adapts as you grow.')}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3.5 w-full sm:w-auto mb-10 mx-auto">
              <SpecularButton
                href="#how-it-works"
                variant="primary"
                size="md"
                radius={9}
              >
                <span>{t('landing.getStartedBtn', {}, 'Get Started')}</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </SpecularButton>

              <SpecularButton
                href="#problem"
                variant="secondary"
                size="md"
                radius={9}
              >
                <span className="material-symbols-outlined text-base text-text-secondary">play_circle</span>
                <span>{t('landing.howItWorksBtn', {}, 'How It Works')}</span>
              </SpecularButton>
            </div>

            <div className="pt-6 border-t border-border/80 w-full flex items-center justify-center gap-2 text-xs font-mono text-text-secondary mx-auto">
              <span className="material-symbols-outlined text-sm text-action-blue shrink-0">verified</span>
              <span>Built for India's Official Statistical System • MoSPI · DIID · NSSTA</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
