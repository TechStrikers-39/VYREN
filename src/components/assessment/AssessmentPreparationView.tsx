import React from 'react';
import { useTranslation } from '@/i18n';
import {
  UserCheck,
  Layers,
  Target,
  ShieldCheck,
  Info,
  ArrowLeft,
  FileCheck2,
  Network,
  Cpu,
} from 'lucide-react';

interface AssessmentPreparationViewProps {
  onReturnToDashboard: () => void;
}

export const AssessmentPreparationView: React.FC<AssessmentPreparationViewProps> = ({
  onReturnToDashboard,
}) => {
  const { t } = useTranslation();

  const DIAGNOSTIC_SEQUENCE = [
    {
      id: 'context',
      icon: UserCheck,
      title: t('assessment.prepSeqContext', {}, 'Professional Context'),
      desc: t('assessment.prepSeqContextDesc', {}, 'Calibrated to your cadre & division'),
    },
    {
      id: 'coverage',
      icon: Layers,
      title: t('assessment.prepSeqCoverage', {}, 'Competency Coverage'),
      desc: t('assessment.prepSeqCoverageDesc', {}, '4 core national framework domains'),
    },
    {
      id: 'scenarios',
      icon: Target,
      title: t('assessment.prepSeqScenarios', {}, 'Applied Scenarios'),
      desc: t('assessment.prepSeqScenariosDesc', {}, 'Realistic administrative challenges'),
    },
    {
      id: 'validation',
      icon: ShieldCheck,
      title: t('assessment.prepSeqValidation', {}, 'Quality Validation'),
      desc: t('assessment.prepSeqValidationDesc', {}, 'Deterministic integrity & key check'),
    },
  ];

  const FACT_ITEMS = [
    {
      stat: t('assessment.prepFactQuestions', {}, '18 Questions'),
      desc: t('assessment.prepFactQuestionsDesc', {}, 'Scenario-based diagnostic items'),
      icon: FileCheck2,
    },
    {
      stat: t('assessment.prepFactDomains', {}, '4 Competency Domains'),
      desc: t('assessment.prepFactDomainsDesc', {}, 'Comprehensive national framework coverage'),
      icon: Network,
    },
    {
      stat: t('assessment.prepFactPersonalized', {}, 'Personalized to Profile'),
      desc: t('assessment.prepFactPersonalizedDesc', {}, 'Targeted to cadre & analytical toolstack'),
      icon: Cpu,
    },
  ];

  return (
    <div
      className="max-w-3xl mx-auto py-8 sm:py-12 px-4 sm:px-6 space-y-8"
      role="status"
      aria-live="polite"
    >
      {/* Top Header & Context Description */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-navy/5 border border-primary-navy/15 text-[11px] font-mono font-semibold text-primary-navy uppercase tracking-wider shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-action-blue animate-pulse motion-reduce:animate-none" />
          {t('assessment.prepBadge', {}, 'DIAGNOSTIC PREPARATION')}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
          {t('assessment.prepHeading', {}, 'Preparing Your Competency Diagnostic')}
        </h1>

        <p className="text-sm sm:text-base font-medium text-text-secondary max-w-xl mx-auto leading-relaxed">
          {t('assessment.prepPrimaryCopy', {}, 'VYREN is tailoring your assessment to your professional context.')}
        </p>

        <p className="text-xs text-text-muted max-w-lg mx-auto leading-relaxed">
          {t('assessment.prepSecondaryCopy', {}, 'Your profile helps determine what the diagnostic should measure. Your responses determine your measured competency.')}
        </p>
      </div>

      {/* Conceptual Diagnostic Sequence Representation */}
      <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-border/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <span className="text-[11px] font-mono uppercase tracking-wider text-text-secondary font-semibold">
            Diagnostic Architecture Matrix
          </span>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-action-blue">
            <span className="w-1.5 h-1.5 rounded-full bg-action-blue animate-ping motion-reduce:animate-none" />
            Active Synthesis
          </div>
        </div>

        {/* Diagnostic sequence nodes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative">
          {DIAGNOSTIC_SEQUENCE.map((stage, idx) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.id}
                className="p-3.5 rounded-xl bg-surface-alt border border-border flex flex-col justify-between space-y-2 relative transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-primary-navy/10 text-primary-navy flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-text-muted">
                    0{idx + 1}
                  </span>
                </div>
                <div>
                  <h2 className="text-xs font-bold text-text-primary">
                    {stage.title}
                  </h2>
                  <p className="text-[11px] text-text-secondary leading-snug mt-0.5">
                    {stage.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Truthful Assessment Facts Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {FACT_ITEMS.map((fact, idx) => {
          const Icon = fact.icon;
          return (
            <div
              key={idx}
              className="p-4 rounded-xl bg-surface border border-border/80 shadow-2xs flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-primary-navy/5 text-primary-navy shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-action-blue" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="text-xs font-bold text-text-primary font-mono tracking-tight">
                  {fact.stat}
                </div>
                <div className="text-[11px] text-text-secondary leading-tight">
                  {fact.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* How VYREN Evaluates You - Principle Callout */}
      <div className="p-4 rounded-xl bg-surface-alt/80 border border-border/90 space-y-1.5 text-left">
        <div className="flex items-center gap-2 text-primary-navy font-semibold text-xs uppercase tracking-wider font-mono">
          <Info className="w-3.5 h-3.5 text-action-blue shrink-0" />
          <span>{t('assessment.evaluationCalloutTitle', {}, 'How VYREN evaluates you')}</span>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          {t('assessment.evaluationCalloutBody', {}, 'Your professional context helps VYREN select relevant competency areas and scenarios. Your performance on the diagnostic determines your measured competency level.')}
        </p>
      </div>

      {/* Bottom Actions & Navigation */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/80">
        <div className="flex items-center gap-2 text-xs font-mono text-text-secondary">
          <div className="w-2 h-2 rounded-full bg-primary-navy/60 animate-pulse motion-reduce:animate-none" />
          <span>Synthesizing official diagnostic dossier...</span>
        </div>

        <button
          type="button"
          onClick={onReturnToDashboard}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface border border-border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-navy min-h-[44px]"
          aria-label={t('assessment.returnToDashboard', {}, 'Return to Dashboard')}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('assessment.returnToDashboard', {}, 'Return to Dashboard')}</span>
        </button>
      </div>
    </div>
  );
};

export default AssessmentPreparationView;
