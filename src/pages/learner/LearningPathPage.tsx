import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/i18n';
import { learnerService } from '@/services/api/learnerService';
import { competencyService } from '@/services/api/competencyService';
import IgotSearchCatalog from '@/components/catalog/IgotSearchCatalog';
import { LearningPathData, LearningPathStepData, CompetencyScore, SkillGap } from '@/types';
import { ROUTES } from '@/constants/routes';
import {
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  ChevronRight,
  AlertCircle,
  ExternalLink,
  Layers,
  Compass,
} from 'lucide-react';

export const LearningPathPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [learningPath, setLearningPath] = useState<LearningPathData | null>(null);
  const [scores, setScores] = useState<CompetencyScore[]>([]);
  const [gaps, setGaps] = useState<SkillGap[]>([]);
  const [activeTab, setActiveTab] = useState<'timeline' | 'catalog'>('timeline');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.allSettled([
      learnerService.getLearningPath(),
      competencyService.getScores(),
      competencyService.getSkillGaps(),
    ]).then(([pathRes, scoresRes, gapsRes]) => {
      if (!isMounted) return;
      if (pathRes.status === 'fulfilled') setLearningPath(pathRes.value);
      if (scoresRes.status === 'fulfilled') setScores(scoresRes.value);
      if (gapsRes.status === 'fulfilled') setGaps(gapsRes.value);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Safe fallback steps strictly aligned to VYREN 5-stage progression if backend array is empty
  const fallbackSteps: LearningPathStepData[] = [
    {
      id: 'step-diagnostic',
      title: 'Initial Competency Diagnostic',
      category: 'Diagnostic Assessment',
      duration: '15 mins',
      status: scores.length > 0 ? 'completed' : 'in_progress',
      description: 'Baseline adaptive assessment establishing capability scores across official statistical and technical domains.',
      link: ROUTES.LEARNER.ASSESSMENT('a1000000-0000-0000-0000-000000000001'),
      action_text: scores.length > 0 ? 'Review Results' : 'Start Assessment',
      provider: 'VYREN Diagnostic Engine',
      integration_mode: 'STANDARD',
    },
    {
      id: 'step-course-default',
      title: 'Data Pipeline Design: Enterprise Patterns',
      category: 'Targeted iGOT Learning Module',
      duration: '90 mins',
      status: scores.length > 0 ? 'in_progress' : 'upcoming',
      description: 'Foundational curriculum addressing data infrastructure, schema verification, and statistical pipeline reliability.',
      link: ROUTES.LEARNER.COURSE('b0100000-0000-0000-0000-000000000001'),
      action_text: 'Start Course',
      provider: 'iGOT Karmayogi Bharat (MoSPI Aligned)',
      integration_mode: 'LIVE / SUNBIRD',
    },
    {
      id: 'step-core-survey',
      title: 'Statistical Survey Quality Controls & Sampling',
      category: 'Core Statistical Survey',
      duration: '45 mins',
      status: 'upcoming',
      description: 'Official MoSPI standards for National Sample Surveys, price indices, and stratified estimator validation.',
      link: '#',
      action_text: 'Scheduled',
      provider: 'MoSPI / NSSTA',
      integration_mode: 'STANDARD',
    },
    {
      id: 'step-skill-assessment',
      title: 'Post-Module Capability Evaluation',
      category: 'Skill Assessment',
      duration: '20 mins',
      status: 'upcoming',
      description: 'Competency assessment evaluating score improvement and updating item-level mastery evidence.',
      link: '#',
      action_text: 'Scheduled',
      provider: 'VYREN Assessment Studio',
      integration_mode: 'STANDARD',
    },
    {
      id: 'step-recalibration',
      title: 'Deterministic Competency Recalibration',
      category: 'Score Recalibration',
      duration: 'Instantaneous',
      status: 'upcoming',
      description: 'Deterministic competency recalibration updating verified Level 0–4 scores and reducing recorded cadre gap deltas.',
      link: '#',
      action_text: 'Pending Validation',
      provider: 'VYREN Competency Engine',
      integration_mode: 'STANDARD',
    },
  ];

  const steps = learningPath?.steps && learningPath.steps.length > 0 ? learningPath.steps : fallbackSteps;
  const totalSteps = steps.length;
  const completedSteps = steps.filter((s) => s.status === 'completed').length;
  const progressPercent =
    learningPath?.completion_percentage || (totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0);

  // Identify highest priority skill gap to ground the page in real diagnostic evidence
  const primaryGap =
    gaps.find((g) => g.priority.toUpperCase() === 'CRITICAL' || g.priority.toUpperCase() === 'HIGH') ||
    gaps[0] ||
    null;

  // Identify the currently active in-progress or next upcoming step
  const activeStep =
    steps.find((s) => s.status === 'in_progress') ||
    steps.find((s) => s.status === 'upcoming') ||
    steps[0];

  const getStepStatusBadge = (status: string) => {
    if (status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono font-bold uppercase">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Completed
        </span>
      );
    }
    if (status === 'in_progress') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-action-blue/10 text-action-blue border border-action-blue/20 text-[10px] font-mono font-bold uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-action-blue animate-pulse" />
          In Progress
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-alt text-text-secondary border border-border text-[10px] font-mono font-semibold uppercase">
        <Clock className="w-3 h-3 text-text-secondary/50" />
        Scheduled
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-16">
      {/* ========================================================================= */}
      {/* 01 — DEVELOPMENT OBJECTIVE (Restrained Analytical Header)                 */}
      {/* ========================================================================= */}
      <section className="border-b border-border pb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary-navy/5 border border-primary-navy/15 text-[11px] font-mono font-bold text-primary-navy uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              PERSONALIZED DEVELOPMENT PATH &bull; MoSPI NSSTA
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
              {t('learningPath.title')}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
              <span className="font-bold text-text-primary">{user?.name || 'Authorized Officer'}</span>
              <span>&bull;</span>
              <span className="font-mono text-text-primary">{user?.designation || 'Statistical Cadre'}</span>
              <span>&bull;</span>
              <span>{user?.department || 'National Statistical Systems Training Academy'}</span>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-surface border border-border shrink-0 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'timeline'
                  ? 'bg-primary-navy text-on-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Assigned Timeline</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'catalog'
                  ? 'bg-primary-navy text-on-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Supplemental Catalog</span>
            </button>
          </div>
        </div>

        {/* Primary Competency Objective Summary Strip */}
        {primaryGap && (
          <div className="p-4 rounded-xl bg-surface border border-border shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary font-semibold">
                PRIMARY COMPETENCY OBJECTIVE
              </span>
              <div className="text-sm font-bold text-text-primary">{primaryGap.competencyName}</div>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono">
              <div>
                <span className="text-text-secondary text-[10px] block uppercase">Measured Level</span>
                <span className="text-sm font-extrabold text-primary-navy">Level {primaryGap.currentLevel}</span>
              </div>
              <div className="text-text-secondary/40 font-normal">&rarr;</div>
              <div>
                <span className="text-text-secondary text-[10px] block uppercase">Required Cadre</span>
                <span className="text-sm font-extrabold text-text-primary">Level {primaryGap.requiredLevel}</span>
              </div>
              <div className="border-l border-border pl-6">
                <span className="text-text-secondary text-[10px] block uppercase">Identified Gap</span>
                <span className="text-sm font-extrabold text-red-700">
                  &minus;{primaryGap.gapSize} Level{primaryGap.gapSize > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 02 — WHY THIS PATH (System Diagnosis & Evidence)                          */}
      {/* ========================================================================= */}
      <section className="space-y-3">
        <div className="border-b border-border/80 pb-2 flex items-baseline justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-text-secondary font-semibold block">
            02 &mdash; WHY THIS PATH &bull; SYSTEM DIAGNOSIS
          </span>
          <span className="text-[11px] font-mono text-action-blue font-semibold">Algorithmic Sequencing</span>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-action-blue/10 text-action-blue flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5 border border-action-blue/20">
              i
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Your measured competency state reflects an active gap relative to the official cadre benchmark for{' '}
              <strong className="text-text-primary font-semibold">{user?.designation || 'Statistical Cadre'}</strong>.
              VYREN has algorithmically constructed this development pathway to sequence targeted Karmayogi modules,
              practical exercises, and post-module assessments to bridge these deltas deterministically.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-border/70 text-xs font-mono">
            <div className="p-3 rounded-xl bg-surface-alt border border-border">
              <span className="text-[10px] text-text-secondary uppercase block">Assessment Engine</span>
              <strong className="text-text-primary text-xs">Competency Item Bank</strong>
            </div>
            <div className="p-3 rounded-xl bg-surface-alt border border-border">
              <span className="text-[10px] text-text-secondary uppercase block">Intervention Source</span>
              <strong className="text-text-primary text-xs">iGOT Karmayogi Bharat</strong>
            </div>
            <div className="p-3 rounded-xl bg-surface-alt border border-border">
              <span className="text-[10px] text-text-secondary uppercase block">Recalibration Logic</span>
              <strong className="text-text-primary text-xs">Deterministic Competency Model</strong>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 03 & 04 — ADAPTIVE PATH TIMELINE & ACTIVE LEARNING ITEM                  */}
      {/* ========================================================================= */}
      {activeTab === 'timeline' ? (
        <section className="space-y-4">
          <div className="border-b border-border/80 pb-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-secondary font-semibold block">
              03 &mdash; ADAPTIVE PATH TIMELINE &bull; VISUAL FOCAL POINT
            </span>
            {/* Section 08: Meaningful Step Progression State */}
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-text-secondary">
                Progress: <strong className="text-text-primary">{completedSteps}</strong> / {totalSteps} Steps
              </span>
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {progressPercent}% Track Completion
              </span>
            </div>
          </div>

          {/* Sequential Step Timeline */}
          <div className="space-y-4">
            {steps.map((st, idx) => {
              const isCurrentActive = st.id === activeStep?.id && st.status === 'in_progress';
              const isCompleted = st.status === 'completed';
              const stepNumber = `0${idx + 1}`;

              return (
                <div
                  key={st.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isCurrentActive
                      ? 'border-primary-navy bg-white ring-1 ring-primary-navy/20 shadow-xs'
                      : isCompleted
                      ? 'border-border bg-surface shadow-2xs opacity-95'
                      : 'border-border bg-surface shadow-2xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    {/* Left: Sequence Number & Details */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      {/* Step Indicator */}
                      <div
                        className={`w-9 h-9 rounded-xl font-mono text-xs font-bold flex items-center justify-center shrink-0 transition ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                            : isCurrentActive
                            ? 'bg-primary-navy text-on-primary shadow-xs ring-2 ring-primary-navy/20'
                            : 'bg-surface-alt border border-border text-text-secondary'
                        }`}
                      >
                        {isCompleted ? '✓' : stepNumber}
                      </div>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary font-semibold bg-surface-alt px-2 py-0.5 rounded border border-border">
                            {st.category}
                          </span>
                          <span className="text-[11px] font-mono text-text-secondary">
                            &bull; {st.duration}
                          </span>
                          {st.provider && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-action-blue/10 text-action-blue border border-action-blue/20 flex items-center gap-1 font-semibold">
                              <Sparkles className="w-3 h-3" />
                              {st.provider.includes('iGOT') || st.provider.includes('Sunbird')
                                ? 'Live Sunbird iGOT'
                                : st.provider}
                            </span>
                          )}
                          {getStepStatusBadge(st.status)}
                        </div>

                        <h3 className="text-base font-bold text-text-primary leading-snug">
                          {st.title}
                        </h3>

                        <p className="text-xs text-text-secondary leading-relaxed max-w-2xl">
                          {st.description}
                        </p>

                        {isCurrentActive && (
                          <div className="pt-2 text-[11px] font-mono text-action-blue font-semibold flex items-center gap-1">
                            <span>Currently Active Milestone &bull; Complete this activity to unlock next evaluation</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Explicit Action CTA */}
                    <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-center">
                      {st.status === 'completed' ? (
                        <Link
                          to={st.link !== '#' ? st.link : ROUTES.LEARNER.DASHBOARD}
                          className="px-3.5 py-2 rounded-xl border border-border bg-surface-alt hover:bg-surface text-text-secondary hover:text-text-primary text-xs font-mono font-semibold transition w-full sm:w-auto text-center shadow-2xs"
                        >
                          Review Activity &rarr;
                        </Link>
                      ) : st.status === 'in_progress' ? (
                        <Link
                          to={st.link !== '#' ? st.link : ROUTES.LEARNER.ASSESSMENT('a1000000-0000-0000-0000-000000000001')}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary-navy hover:bg-primary-navy/90 text-on-primary text-xs font-bold transition shadow-xs w-full sm:w-auto"
                        >
                          <span>{st.action_text || 'Continue Module'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <span className="px-3 py-1.5 rounded-lg text-xs font-mono text-text-secondary/60 bg-surface-alt border border-border/50 cursor-not-allowed">
                          Scheduled
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        /* Secondary Tab: Supplemental iGOT Catalog Discovery */
        <section className="space-y-4">
          <div className="border-b border-border/80 pb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-secondary font-semibold block">
              SUPPLEMENTAL NATIONAL CATALOG DISCOVERY
            </span>
            <h2 className="text-lg font-bold text-text-primary">Live Sunbird iGOT Course Search</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Query official Mission Karmayogi learning assets outside your assigned core pathway.
            </p>
          </div>
          <IgotSearchCatalog />
        </section>
      )}

      {/* ========================================================================= */}
      {/* 05 — LEARNING → ASSESSMENT CONNECTION (Adaptive Closed-Loop)              */}
      {/* ========================================================================= */}
      <section className="space-y-3 pt-4 border-t border-border">
        <div className="border-b border-border/80 pb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-text-secondary font-semibold block">
            05 &mdash; THE ADAPTIVE FEEDBACK LOOP &bull; SYSTEM MECHANICS
          </span>
          <h2 className="text-sm font-bold text-text-primary">
            Continuous Closed-Loop Competency Recalibration
          </h2>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono font-bold text-primary-navy uppercase">1. Complete Learning</span>
              <p className="text-text-secondary leading-relaxed">
                Learner completes prioritized iGOT module addressing the measured skill gap.
              </p>
            </div>
            <div className="space-y-1.5 border-t sm:border-t-0 sm:border-l border-border pt-3 sm:pt-0 sm:pl-4">
              <span className="text-[10px] font-mono font-bold text-action-blue uppercase">2. Take Assessment</span>
              <p className="text-text-secondary leading-relaxed">
                Competency assessment tests practical understanding and problem-solving.
              </p>
            </div>
            <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-border pt-3 md:pt-0 md:pl-4">
              <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase">3. Recalibrate Score</span>
              <p className="text-text-secondary leading-relaxed">
                Deterministic assessment model recalibrates verified Level 0&ndash;4 score in real time.
              </p>
            </div>
            <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-border pt-3 md:pt-0 md:pl-4">
              <span className="text-[10px] font-mono font-bold text-text-primary uppercase">4. Next Priority</span>
              <p className="text-text-secondary leading-relaxed">
                Gap matrix updates dynamically, surfacing the next career milestone.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LearningPathPage;
