import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { learnerService } from '@/services/api/learnerService';
import { LearningPathData, LearningPathStepData } from '@/types';
import { ROUTES } from '@/constants/routes';

export const LearningPathTimeline: React.FC = () => {
  const [learningPath, setLearningPath] = useState<LearningPathData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    learnerService
      .getLearningPath()
      .then((data) => {
        if (isMounted) {
          setLearningPath(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Could not load dynamic learning path, using baseline fallback:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Baseline fallback steps if backend fails or returns empty
  const fallbackSteps: LearningPathStepData[] = [
    {
      id: 'step-diagnostic',
      title: 'Initial Competency Diagnostic',
      category: 'Diagnostic Assessment',
      duration: '15 mins',
      status: 'in_progress',
      description: 'Baseline adaptive assessment establishing current capability scores across statistical inference and MLOps.',
      link: ROUTES.LEARNER.ASSESSMENT('a1000000-0000-0000-0000-000000000001'),
      action_text: 'Start Assessment',
      provider: 'VYREN Diagnostic Engine',
      integration_mode: 'STANDARD',
    },
    {
      id: 'step-course-default',
      title: 'Data Pipeline Design: Enterprise Patterns',
      category: 'Targeted iGOT Learning Module',
      duration: '90 mins',
      status: 'upcoming',
      description: 'Foundational curriculum addressing data infrastructure and statistical pipeline reliability.',
      link: ROUTES.LEARNER.COURSE('b0100000-0000-0000-0000-000000000001'),
      action_text: 'Start Course',
      provider: 'iGOT Karmayogi Bharat (MoSPI Aligned)',
      integration_mode: 'FALLBACK / LOCAL',
    },
    {
      id: 'step-recalibration',
      title: 'Post-Module Capability Evaluation',
      category: 'Recalibration Assessment',
      duration: '10 mins',
      status: 'upcoming',
      description: 'Practice quiz evaluating score improvement and updating skill gap measurements.',
      link: '#',
      action_text: 'Locked',
      provider: 'VYREN Adaptive Engine',
      integration_mode: 'STANDARD',
    },
  ];

  const steps = learningPath?.steps && learningPath.steps.length > 0 ? learningPath.steps : fallbackSteps;
  const completionPercentage = learningPath ? learningPath.completion_percentage : 0;

  return (
    <div className="p-6 sm:p-8 rounded-2xl border border-border bg-surface shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-text-primary">Adaptive Learning Pathway</h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary-navy/10 text-primary-navy dark:text-blue-300 font-semibold">
              Sunbird / iGOT Aligned
            </span>
          </div>
          <p className="text-xs text-text-secondary">
            Dynamically sequenced based on measured skill gaps and national civil service curriculum standards.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isLoading && (
            <span className="text-xs text-text-secondary animate-pulse">Syncing pathway...</span>
          )}
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20">
            {completionPercentage}% Complete
          </span>
        </div>
      </div>

      <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
        {steps.map((st) => (
          <div
            key={st.id}
            className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-alt p-5 rounded-xl border border-border transition-all hover:border-primary-navy/40"
          >
            <div
              className={`absolute -left-[31px] sm:-left-[39px] top-5 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-surface ${
                st.status === 'completed'
                  ? 'border-emerald-500 text-emerald-500'
                  : st.status === 'in_progress'
                  ? 'border-primary-navy bg-primary-navy text-on-primary'
                  : 'border-border text-text-secondary'
              }`}
            >
              {st.status === 'completed' ? (
                <span className="material-symbols-outlined text-[12px] font-bold">check</span>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-surface border border-border text-text-secondary font-medium">
                  {st.category}
                </span>
                <span className="text-xs font-mono text-text-secondary">• {st.duration}</span>
                {st.provider && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                    🏛️ {st.provider}
                  </span>
                )}
                {st.integration_mode && (
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                      st.integration_mode.includes('REAL')
                        ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                    }`}
                  >
                    {st.integration_mode}
                  </span>
                )}
              </div>
              <h4 className="text-base font-semibold text-text-primary">{st.title}</h4>
              <p className="text-xs text-text-secondary max-w-xl leading-relaxed">{st.description}</p>
            </div>

            {st.status !== 'upcoming' && st.link !== '#' ? (
              <Link
                to={st.link}
                className="px-4 py-2 rounded-lg bg-primary-navy text-on-primary text-xs font-semibold hover:opacity-95 transition-opacity shrink-0 text-center shadow-xs"
              >
                {st.action_text} →
              </Link>
            ) : (
              <button
                disabled
                className="px-4 py-2 rounded-lg bg-surface border border-border text-text-secondary text-xs font-medium opacity-60 cursor-not-allowed shrink-0"
              >
                {st.action_text}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LearningPathTimeline;
