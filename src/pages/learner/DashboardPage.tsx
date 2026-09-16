import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { competencyService } from '@/services/api/competencyService';
import { recommendationService } from '@/services/api/recommendationService';
import { learnerService } from '@/services/api/learnerService';
import { CompetencyScore, SkillGap, Recommendation, LearningPathData } from '@/types';
import { ROUTES } from '@/constants/routes';
import {
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export const LearnerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [scores, setScores] = useState<CompetencyScore[]>([]);
  const [gaps, setGaps] = useState<SkillGap[]>([]);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [learningPath, setLearningPath] = useState<LearningPathData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      competencyService.getScores(),
      competencyService.getSkillGaps(),
      recommendationService.getRecommendations(),
      learnerService.getLearningPath().catch(() => null),
    ]).then(([s, g, r, lp]) => {
      if (isMounted) {
        setScores(s || []);
        setGaps(g || []);
        setRecs(r || []);
        if (lp) setLearningPath(lp);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const getPriorityBadge = (priority: string) => {
    const p = (priority || '').toUpperCase();
    if (p === 'CRITICAL' || p === 'HIGH') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-red-50 text-red-700 border border-red-200">
          {p}
        </span>
      );
    }
    if (p === 'MEDIUM') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
          {p}
        </span>
      );
    }
    if (p === 'LOW') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
          {p}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
        MET
      </span>
    );
  };

  const getMeasuredLevel = (sc: CompetencyScore): number => {
    if (sc.measuredLevel !== undefined && sc.measuredLevel !== null) {
      return sc.measuredLevel;
    }
    if (sc.score >= 85) return 4;
    if (sc.score >= 65) return 3;
    if (sc.score >= 40) return 2;
    if (sc.score >= 20) return 1;
    return 0;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-16">
      {/* ========================================================================= */}
      {/* 01 — CADRE CONTEXT (Restrained Page Introduction)                         */}
      {/* ========================================================================= */}
      <section className="border-b border-border pb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary-navy/5 border border-primary-navy/15 text-[11px] font-mono font-bold text-primary-navy uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              CADRE BASELINE &bull; MoSPI &amp; NSSTA
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
              Competency Intelligence Workspace
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary pt-1">
              <span className="font-bold text-text-primary">{user?.name || 'Authorized Officer'}</span>
              <span>&bull;</span>
              <span className="font-mono text-text-primary">{user?.designation || 'Statistical Cadre'}</span>
              <span>&bull;</span>
              <span>{user?.department || 'National Statistical Systems Training Academy (NSSTA)'}</span>
            </div>
            <p className="text-xs text-text-secondary/80 max-w-2xl leading-relaxed">
              Deterministic competency baseline evaluated against official NSSTA job matrices and Mission Karmayogi standards. Diagnostic evaluations establish verified capability levels distinct from self-reported context.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to={ROUTES.LEARNER.ASSESSMENT('a1000000-0000-0000-0000-000000000001')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-navy hover:bg-primary-navy/90 text-on-primary font-bold text-xs sm:text-sm transition shadow-xs"
            >
              <span>Take Diagnostic Assessment</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 02 — MEASURED COMPETENCY STATE (Visual Focal Point: Scale 0-4)           */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="border-b border-border/80 pb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-text-secondary font-semibold block">
            02 &mdash; MEASURED COMPETENCY STATE
          </span>
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
            <h2 className="text-lg font-bold text-text-primary">Verified Competency Levels (Scale 0&ndash;4)</h2>
            <span className="text-xs text-text-secondary">
              Discrete competency levels with Evidence Confidence tracking
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center bg-surface border border-border rounded-2xl text-xs text-text-secondary font-mono">
            Loading verified competency scores...
          </div>
        ) : scores.length === 0 ? (
          <div className="p-8 text-center bg-surface border border-border rounded-2xl space-y-3">
            <AlertCircle className="w-8 h-8 text-text-secondary/60 mx-auto" />
            <p className="text-xs text-text-secondary">
              No verified competency assessments recorded yet. Complete the baseline diagnostic assessment to generate your discrete Level 0&ndash;4 ratings.
            </p>
            <Link
              to={ROUTES.LEARNER.ASSESSMENT('a1000000-0000-0000-0000-000000000001')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-action-blue hover:underline"
            >
              Launch Baseline Assessment &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scores.map((sc) => {
              const level = getMeasuredLevel(sc);
              const confPercent = Math.round((sc.confidence || 0.75) * 100);
              const confTier = confPercent >= 80 ? 'High' : confPercent >= 60 ? 'Moderate' : 'Initial';

              return (
                <div
                  key={sc.competencyId}
                  className="bg-surface border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-text-primary leading-tight">
                        {sc.competencyName}
                      </h3>
                      <p className="text-[11px] text-text-secondary font-mono mt-0.5">
                        MoSPI Official Statistical Competency
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-base font-extrabold font-mono text-primary-navy">
                        Level {level}
                      </span>
                      <span className="text-xs text-text-secondary font-mono font-normal"> / 4</span>
                    </div>
                  </div>

                  {/* Discrete 5-Step Segmented Bar L0 - L4 */}
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-5 gap-1.5">
                      {[0, 1, 2, 3, 4].map((stepIdx) => {
                        const isReached = stepIdx <= level;
                        const isCurrent = stepIdx === level;
                        return (
                          <div
                            key={stepIdx}
                            className={`h-2 rounded-sm transition-colors ${
                              isReached
                                ? isCurrent
                                  ? 'bg-primary-navy ring-1 ring-primary-navy'
                                  : 'bg-primary-navy/80'
                                : 'bg-slate-200'
                            }`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-text-secondary/70 px-0.5">
                      <span>L0 (Novice)</span>
                      <span>L1</span>
                      <span>L2</span>
                      <span>L3</span>
                      <span>L4 (Master)</span>
                    </div>
                  </div>

                  {/* Supporting Context & Evidence Confidence */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/70 text-[11px] font-mono text-text-secondary">
                    <span>
                      Evidence Confidence: <strong className="text-text-primary">{confPercent}%</strong> ({confTier})
                    </span>
                    <span>
                      Score: <strong className="text-text-primary">{Math.round(sc.score)}</strong>/100
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 03 — SKILL GAP PRIORITY (Tabular Comparison: Measured vs Required)        */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="border-b border-border/80 pb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-text-secondary font-semibold block">
            03 &mdash; SKILL GAP PRIORITY
          </span>
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
            <h2 className="text-lg font-bold text-text-primary">Cadre Requirement vs. Measured State</h2>
            <span className="text-xs text-text-secondary">
              Deterministic gap delta indicating priority intervention areas for career cadre progression
            </span>
          </div>
        </div>

        {gaps.length === 0 ? (
          <div className="p-6 text-center bg-surface border border-border rounded-2xl text-xs text-text-secondary font-mono">
            No skill gap deltas identified. All assessed competencies meet or exceed current cadre requirements.
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface-alt/70 font-mono text-[11px] uppercase tracking-wider text-text-secondary">
                    <th className="py-3 px-4 sm:px-6 font-semibold">Competency Domain</th>
                    <th className="py-3 px-4 font-semibold">Measured Level</th>
                    <th className="py-3 px-4 font-semibold">Cadre Required</th>
                    <th className="py-3 px-4 font-semibold">Skill Gap Delta</th>
                    <th className="py-3 px-4 sm:px-6 font-semibold text-right sm:text-left">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {gaps.map((g) => (
                    <tr key={g.competencyId} className="hover:bg-surface-alt/50 transition">
                      <td className="py-3.5 px-4 sm:px-6 font-medium text-text-primary">
                        <div className="font-semibold text-sm">{g.competencyName}</div>
                        <div className="text-[10px] font-mono text-text-secondary mt-0.5">
                          ID: {g.competencyId.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-text-primary">
                        Level {g.currentLevel}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-text-secondary">
                        Level {g.requiredLevel}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold">
                        {g.gapSize > 0 ? (
                          <span className="text-red-700">
                            &minus;{g.gapSize} Level{g.gapSize > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-emerald-700">0 (Met)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-right sm:text-left">
                        {getPriorityBadge(g.priority)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 04 — RECOMMENDED ACTION (Targeted Karmayogi Intervention)                  */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="border-b border-border/80 pb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-text-secondary font-semibold block">
            04 &mdash; RECOMMENDED ACTION
          </span>
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
            <h2 className="text-lg font-bold text-text-primary">Targeted Karmayogi Intervention</h2>
            <span className="text-xs text-text-secondary">
              Curated modules calibrated specifically to resolve verified skill gaps
            </span>
          </div>
        </div>

        {recs.length === 0 ? (
          <div className="p-6 text-center bg-surface border border-border rounded-2xl text-xs text-text-secondary font-mono">
            No active recommendations required at this time.
          </div>
        ) : (
          <div className="space-y-3">
            {recs.map((rec) => {
              const matchedGap = gaps.find(
                (g) =>
                  g.competencyId === rec.targetCompetency ||
                  g.competencyName.toLowerCase() === rec.targetCompetency.toLowerCase()
              );
              const providerName = rec.title.includes('MoSPI')
                ? 'MoSPI / NSSTA (Sunbird Gateway)'
                : 'iGOT Karmayogi Official Catalog';

              return (
                <div
                  key={rec.id}
                  className="bg-surface border border-border rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-border-strong transition"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-action-blue/10 text-action-blue border border-action-blue/20 text-[10px] font-mono font-semibold">
                        <Sparkles className="w-3 h-3" />
                        LIVE SUNBIRD iGOT
                      </span>
                      {rec.priority && getPriorityBadge(rec.priority)}
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-text-primary leading-snug">
                        {rec.title}
                      </h3>
                      {rec.description && (
                        <p className="text-xs text-text-secondary mt-1 line-clamp-2 leading-relaxed">
                          {rec.description}
                        </p>
                      )}
                    </div>

                    {/* Explainability Callout */}
                    <div className="text-[11px] font-mono text-text-secondary pt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>
                        Addresses:{' '}
                        <strong className="text-text-primary">
                          {matchedGap ? matchedGap.competencyName : rec.targetCompetency}
                        </strong>
                      </span>
                      <span>
                        Rationale:{' '}
                        <strong className="text-text-primary">
                          {matchedGap
                            ? `Level ${matchedGap.currentLevel} \u2192 Required Level ${matchedGap.requiredLevel} (Gap: \u2212${matchedGap.gapSize})`
                            : 'Identified core role capability requirement'}
                        </strong>
                      </span>
                      <span>
                        Source: <span className="text-text-secondary/90">{providerName}</span>
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex sm:flex-col items-center sm:items-end gap-2">
                    <Link
                      to={ROUTES.LEARNER.LEARNING_PATH}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-navy hover:bg-primary-navy/90 text-on-primary text-xs font-bold transition shadow-2xs w-full sm:w-auto justify-center"
                    >
                      <span>Start Module</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 05 — CURRENT LEARNING PATH (Connected Progression Timeline)              */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="border-b border-border/80 pb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-text-secondary font-semibold block">
            05 &mdash; CURRENT LEARNING PATH
          </span>
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
            <h2 className="text-lg font-bold text-text-primary">Adaptive Progression Sequence</h2>
            <span className="text-xs text-text-secondary">
              Diagnostic &bull; Recommended Course &bull; Core Module &bull; Validation &bull; Recalibration
            </span>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6 shadow-xs space-y-6">
          {/* Visual Sequence Pipeline */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {[
              {
                step: '01',
                title: 'Diagnostic Assessment',
                desc: 'Baseline capability evaluation',
                status: scores.length > 0 ? 'completed' : 'in_progress',
                link: ROUTES.LEARNER.ASSESSMENT('a1000000-0000-0000-0000-000000000001'),
              },
              {
                step: '02',
                title: 'Targeted iGOT Module',
                desc: 'Bridge highest priority gap',
                status: scores.length > 0 ? 'in_progress' : 'upcoming',
                link: ROUTES.LEARNER.LEARNING_PATH,
              },
              {
                step: '03',
                title: 'Core Statistical Survey',
                desc: 'MoSPI methodologies & standards',
                status: 'upcoming',
                link: ROUTES.LEARNER.LEARNING_PATH,
              },
              {
                step: '04',
                title: 'Skill Assessment',
                desc: 'Assessment item validation',
                status: 'upcoming',
                link: ROUTES.LEARNER.ASSESSMENT('a1000000-0000-0000-0000-000000000001'),
              },
              {
                step: '05',
                title: 'Score Recalibration',
                desc: 'Deterministic level update',
                status: 'upcoming',
                link: ROUTES.LEARNER.DASHBOARD,
              },
            ].map((item, idx) => (
              <div
                key={item.step}
                className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2 transition ${
                  item.status === 'completed'
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : item.status === 'in_progress'
                    ? 'border-primary-navy bg-primary-navy/5 ring-1 ring-primary-navy'
                    : 'border-border bg-surface-alt/70'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                        item.status === 'completed'
                          ? 'text-emerald-700'
                          : item.status === 'in_progress'
                          ? 'text-primary-navy'
                          : 'text-text-secondary'
                      }`}
                    >
                      Step {item.step}
                    </span>
                    {item.status === 'completed' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : item.status === 'in_progress' ? (
                      <span className="w-2 h-2 rounded-full bg-primary-navy animate-pulse" />
                    ) : (
                      <Clock className="w-3 h-3 text-text-secondary/50" />
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-text-primary leading-tight">{item.title}</h4>
                  <p className="text-[10px] text-text-secondary mt-1 leading-normal">{item.desc}</p>
                </div>

                <div className="pt-2 border-t border-border/60">
                  <Link
                    to={item.link}
                    className={`text-[11px] font-mono font-semibold flex items-center gap-1 ${
                      item.status === 'completed'
                        ? 'text-emerald-700 hover:underline'
                        : item.status === 'in_progress'
                        ? 'text-primary-navy hover:underline'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <span>{item.status === 'completed' ? 'Reviewed' : item.status === 'in_progress' ? 'Resume \u2192' : 'Pending'}</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border text-xs text-text-secondary">
            <span className="font-mono text-[11px]">
              Adaptive pathway dynamically recalculates after each validated assessment submission.
            </span>
            <Link
              to={ROUTES.LEARNER.LEARNING_PATH}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-action-blue hover:underline font-mono"
            >
              <span>Explore Full Adaptive Curriculum &amp; Catalog</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LearnerDashboardPage;
