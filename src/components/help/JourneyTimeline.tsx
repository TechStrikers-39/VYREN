import React from 'react';
import { useTranslation } from '@/i18n';
import { CornerDownRight } from 'lucide-react';

interface JourneyStepData {
  number: string;
  badgeKey: string;
  titleKey: string;
  descKey: string;
  distinctionKey?: string;
  badgeFallback: string;
  titleFallback: string;
  descFallback: string;
  distinctionFallback?: string;
}

const STEPS: JourneyStepData[] = [
  {
    number: '01',
    badgeKey: 'helpGuide.journey.step1.badge',
    titleKey: 'helpGuide.journey.step1.title',
    descKey: 'helpGuide.journey.step1.desc',
    distinctionKey: 'helpGuide.journey.step1.distinction',
    badgeFallback: '01 — CREATE YOUR PROFILE',
    titleFallback: 'Create your profile',
    descFallback: 'Tell VYREN about your role, department, responsibilities, tools, experience and learning goals.',
    distinctionFallback: 'This information provides professional context for personalization. It does NOT by itself establish your measured competency.',
  },
  {
    number: '02',
    badgeKey: 'helpGuide.journey.step2.badge',
    titleKey: 'helpGuide.journey.step2.title',
    descKey: 'helpGuide.journey.step2.desc',
    distinctionKey: 'helpGuide.journey.step2.distinction',
    badgeFallback: '02 — TAKE YOUR COMPETENCY DIAGNOSTIC',
    titleFallback: 'Take your competency diagnostic',
    descFallback: 'Complete your personalized baseline assessment. VYREN uses your professional context to determine which competencies and difficulty levels the diagnostic should target.',
    distinctionFallback: 'The diagnostic measures demonstrated performance.',
  },
  {
    number: '03',
    badgeKey: 'helpGuide.journey.step3.badge',
    titleKey: 'helpGuide.journey.step3.title',
    descKey: 'helpGuide.journey.step3.desc',
    badgeFallback: '03 — UNDERSTAND YOUR SKILL GAPS',
    titleFallback: 'Understand your skill gaps',
    descFallback: "Your assessment responses are evaluated using VYREN's deterministic competency model to identify measured competency levels and priority gaps against the requirements associated with your role.",
  },
  {
    number: '04',
    badgeKey: 'helpGuide.journey.step4.badge',
    titleKey: 'helpGuide.journey.step4.title',
    descKey: 'helpGuide.journey.step4.desc',
    badgeFallback: '04 — FOLLOW YOUR PERSONALIZED LEARNING PATH',
    titleFallback: 'Follow your personalized learning path',
    descFallback: 'VYREN recommends relevant learning based on your identified competency gaps, role requirements and available learning resources, including relevant iGOT Karmayogi resources where available.',
  },
  {
    number: '05',
    badgeKey: 'helpGuide.journey.step5.badge',
    titleKey: 'helpGuide.journey.step5.title',
    descKey: 'helpGuide.journey.step5.desc',
    distinctionKey: 'helpGuide.journey.step5.distinction',
    badgeFallback: '05 — LEARN & ASSESS',
    titleFallback: 'Learn & assess',
    descFallback: 'Complete assigned learning activities and demonstrate your knowledge through assessments and quizzes where applicable.',
    distinctionFallback: 'Completing a course alone does not automatically establish mastery. Demonstrated performance matters.',
  },
  {
    number: '06',
    badgeKey: 'helpGuide.journey.step6.badge',
    titleKey: 'helpGuide.journey.step6.title',
    descKey: 'helpGuide.journey.step6.desc',
    badgeFallback: '06 — RECALIBRATE & IMPROVE',
    titleFallback: 'Recalibrate & improve',
    descFallback: 'As you demonstrate new knowledge and skills through subsequent assessment performance, VYREN updates your competency profile and can refine future learning recommendations.',
  },
];

export const JourneyTimeline: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="w-full">
      <div className="relative pl-2 sm:pl-4">
        {STEPS.map((step, idx) => {
          const isLast = idx === STEPS.length - 1;

          return (
            <div key={step.number} className="relative flex items-start gap-4 sm:gap-6 pb-10 sm:pb-12 last:pb-2">
              {/* Connecting line between stages */}
              {!isLast && (
                <div
                  className="absolute left-4.5 sm:left-5 top-10 bottom-0 w-0.5 bg-border-strong -translate-x-1/2"
                  aria-hidden="true"
                />
              )}

              {/* Numbered node marker */}
              <div
                className="relative z-10 flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary-navy text-on-primary font-mono font-bold text-xs sm:text-sm shrink-0 border-2 border-surface shadow-xs"
                aria-hidden="true"
              >
                {step.number}
              </div>

              {/* Stage content */}
              <div className="flex-1 pt-0.5">
                <span className="inline-block text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider text-action-blue mb-1">
                  {t(step.badgeKey, {}, step.badgeFallback)}
                </span>

                <h4 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
                  {t(step.titleKey, {}, step.titleFallback)}
                </h4>

                <p className="text-sm text-text-secondary mt-1.5 leading-relaxed max-w-3xl">
                  {t(step.descKey, {}, step.descFallback)}
                </p>

                {/* Important distinction callout pill */}
                {step.distinctionKey && (
                  <div className="mt-3 p-3 sm:p-3.5 bg-surface-alt border-l-3 border-primary-navy rounded-r-md text-xs sm:text-xs text-text-secondary leading-relaxed max-w-3xl">
                    <span className="font-semibold text-text-primary block sm:inline mr-1.5">
                      {t('helpGuide.journey.importantDistinction', {}, 'Important distinction:')}
                    </span>
                    <span>
                      {t(step.distinctionKey, {}, step.distinctionFallback || '')}
                    </span>
                  </div>
                )}

                {/* Last stage loop indicator */}
                {isLast && (
                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-navy/5 border border-primary-navy/15 text-primary-navy text-xs font-mono font-semibold">
                    <CornerDownRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{t('helpGuide.journey.updatedJourney', {}, 'Updated journey')}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default JourneyTimeline;
