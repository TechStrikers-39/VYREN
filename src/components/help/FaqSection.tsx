import React, { useState } from 'react';
import { useTranslation } from '@/i18n';
import { ChevronDown } from 'lucide-react';

interface FaqItemData {
  id: string;
  qKey: string;
  aKey: string;
  qFallback: string;
  aFallback: string;
}

const FAQ_ITEMS: FaqItemData[] = [
  {
    id: 'faq-1',
    qKey: 'helpGuide.faq.items.q1.question',
    aKey: 'helpGuide.faq.items.q1.answer',
    qFallback: 'What is VYREN?',
    aFallback: 'VYREN is a competency intelligence platform that helps identify workforce skill gaps, recommend relevant learning and track competency development over time.',
  },
  {
    id: 'faq-2',
    qKey: 'helpGuide.faq.items.q2.question',
    aKey: 'helpGuide.faq.items.q2.answer',
    qFallback: 'Why does VYREN ask about my role and responsibilities?',
    aFallback: 'Your professional context helps VYREN understand which competencies are relevant to your work and personalize your diagnostic and learning journey.',
  },
  {
    id: 'faq-3',
    qKey: 'helpGuide.faq.items.q3.question',
    aKey: 'helpGuide.faq.items.q3.answer',
    qFallback: 'Does my self-reported experience determine my competency level?',
    aFallback: 'No. Self-reported experience provides contextual information and helps calibrate assessment difficulty. Your measured competency is determined by demonstrated performance.',
  },
  {
    id: 'faq-4',
    qKey: 'helpGuide.faq.items.q4.question',
    aKey: 'helpGuide.faq.items.q4.answer',
    qFallback: 'How is my competency score calculated?',
    aFallback: "Your assessment responses are evaluated using VYREN's deterministic competency model. Scores are calculated from demonstrated performance across competency-linked assessment items.",
  },
  {
    id: 'faq-5',
    qKey: 'helpGuide.faq.items.q5.question',
    aKey: 'helpGuide.faq.items.q5.answer',
    qFallback: 'Why did VYREN recommend a particular course?',
    aFallback: 'Recommendations are based on identified competency gaps, required competency levels for your role and relevant learning resources available through the platform.',
  },
  {
    id: 'faq-6',
    qKey: 'helpGuide.faq.items.q6.question',
    aKey: 'helpGuide.faq.items.q6.answer',
    qFallback: 'What is iGOT Karmayogi?',
    aFallback: "iGOT Karmayogi is the Government of India's learning ecosystem. VYREN can use relevant iGOT learning resources as part of personalized learning recommendations.",
  },
  {
    id: 'faq-7',
    qKey: 'helpGuide.faq.items.q7.question',
    aKey: 'helpGuide.faq.items.q7.answer',
    qFallback: 'Will my competency level change after I complete a course?',
    aFallback: 'Learning completion itself does not automatically prove mastery. VYREN uses subsequent demonstrated assessment performance to recalibrate your competency profile.',
  },
  {
    id: 'faq-8',
    qKey: 'helpGuide.faq.items.q8.question',
    aKey: 'helpGuide.faq.items.q8.answer',
    qFallback: 'Can I retake an assessment?',
    aFallback: 'This depends on the assessment and workflow configured by your organization. When reassessment is available, VYREN can use new demonstrated performance to update your competency profile.',
  },
];

export const FaqSection: React.FC = () => {
  const { t } = useTranslation();
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setOpenFaqId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="w-full" aria-labelledby="faq-section-title">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <span className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider text-action-blue mb-1 block">
          {t('helpGuide.faq.eyebrow', {}, 'COMMON QUESTIONS')}
        </span>
        <h3 id="faq-section-title" className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
          {t('helpGuide.faq.title', {}, 'Frequently Asked Questions')}
        </h3>
        <p className="text-sm text-text-secondary mt-1 max-w-2xl">
          {t('helpGuide.faq.subtitle', {}, 'A quick guide to how VYREN measures competency, recommends learning and tracks progress.')}
        </p>
      </div>

      {/* Accordion List */}
      <div className="space-y-3">
        {FAQ_ITEMS.map((item) => {
          const isOpen = openFaqId === item.id;
          const questionText = t(item.qKey, {}, item.qFallback);
          const answerText = t(item.aKey, {}, item.aFallback);

          return (
            <div
              key={item.id}
              className={`border rounded-lg transition-colors duration-150 ${
                isOpen ? 'border-primary-navy/40 bg-surface' : 'border-border bg-surface hover:border-border-strong'
              }`}
            >
              <button
                type="button"
                id={`faq-btn-${item.id}`}
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${item.id}`}
                onClick={() => toggleFaq(item.id)}
                className="w-full flex items-center justify-between py-3.5 px-4 sm:px-5 text-left font-semibold text-text-primary hover:text-primary-navy transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-navy focus-visible:ring-inset rounded-lg text-sm sm:text-base gap-4"
              >
                <span>{questionText}</span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none ${
                    isOpen ? 'rotate-180 text-primary-navy' : 'text-text-muted'
                  }`}
                  aria-hidden="true"
                />
              </button>

              <div
                id={`faq-panel-${item.id}`}
                role="region"
                aria-labelledby={`faq-btn-${item.id}`}
                className={`transition-all duration-200 motion-reduce:transition-none ${
                  isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
                }`}
              >
                <div className="px-4 sm:px-5 pb-4 pt-1 text-xs sm:text-sm text-text-secondary leading-relaxed border-t border-border/50">
                  {answerText}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default FaqSection;
