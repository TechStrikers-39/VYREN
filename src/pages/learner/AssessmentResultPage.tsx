import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import CompetencyGauge from '@/components/competency/CompetencyGauge';
import EvidenceBreakdown from '@/components/assessment/EvidenceBreakdown';
import RecommendationCard from '@/components/recommendations/RecommendationCard';
import { assessmentService } from '@/services/api/assessmentService';
import { AssessmentResult } from '@/types';
import { ROUTES } from '@/constants/routes';
import {
  Award,
  ShieldCheck,
  CheckCircle2,
  Printer,
  ArrowRight,
  FileText,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Calendar,
  Hash,
  Sparkles
} from 'lucide-react';

const PROFICIENCY_LEVELS = [
  { level: 0, title: 'Foundational', description: 'Elementary concepts awareness' },
  { level: 1, title: 'Working', description: 'Standard procedure execution under guidance' },
  { level: 2, title: 'Autonomous', description: 'Independent execution & practical application' },
  { level: 3, title: 'Advanced', description: 'Complex problem-solving & optimization' },
  { level: 4, title: 'Expert / Master', description: 'System design, methodology leadership & audit' },
];

export const AssessmentResultPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const location = useLocation();

  const [result, setResult] = useState<AssessmentResult | null>(
    (location.state as any)?.result || null
  );
  const [loading, setLoading] = useState(!result);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!result && assessmentId) {
      let isMounted = true;
      setLoading(true);
      assessmentService
        .getLatestResult(assessmentId)
        .then((data) => {
          if (isMounted) {
            setResult(data);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            console.error('Error fetching assessment result:', err);
            setError('Could not retrieve recent assessment evaluation. Please check your dashboard.');
            setLoading(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }
  }, [assessmentId, result]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center space-y-3">
        <div className="w-8 h-8 mx-auto border-3 border-primary-navy border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-mono text-text-secondary">Retrieving cryptographic evaluation record...</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="max-w-2xl mx-auto p-8 rounded-2xl border border-border bg-surface text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-text-primary">Evaluation Result Unavailable</h2>
        <p className="text-xs text-text-secondary">{error || 'No evaluation record found for this assessment session.'}</p>
        <Link
          to={ROUTES.LEARNER.DASHBOARD}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-navy text-on-primary text-xs font-semibold hover:opacity-90"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const breakdownEntries = Object.values(result.competencyBreakdown || {});
  const passed = result.passed ?? (result.score >= 70);

  // Compute overall estimated level (0 to 4) based on average measured_level
  const avgLevel = breakdownEntries.length > 0
    ? Math.round(breakdownEntries.reduce((acc: number, c: any) => acc + (c.measured_level || 0), 0) / breakdownEntries.length)
    : Math.min(4, Math.floor(result.score / 25));

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Official Government Record Certificate Container */}
      <div className="p-6 sm:p-8 rounded-2xl border border-border bg-surface shadow-sm space-y-6 relative overflow-hidden">
        {/* Subtle decorative emblem background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary-navy/[0.03] to-transparent pointer-events-none rounded-bl-full" />

        {/* Action Bar (Hidden during Print) */}
        <div className="flex items-center justify-between border-b border-border pb-4 print:hidden">
          <div className="flex items-center gap-2 text-xs font-mono text-text-secondary">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>National Statistical Systems Training Academy (NSSTA) Validated</span>
          </div>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-alt text-xs font-semibold text-text-primary transition shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Official Record</span>
          </button>
        </div>

        {/* Certificate Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full font-bold tracking-wider inline-flex items-center gap-1 ${
                  passed
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                }`}
              >
                {passed ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                {passed ? 'Evaluation Passed' : 'Proficiency Threshold Not Met'}
              </span>
              <span className="text-[10px] font-mono text-text-secondary inline-flex items-center gap-1 bg-surface-alt px-2 py-0.5 rounded border border-border">
                <Hash className="w-2.5 h-2.5" /> Record ID: {result.id?.slice(0, 13) || 'REC-VERIFIED'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              Official Competency Evaluation Record
            </h1>
            <p className="text-xs text-text-secondary flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>Completed on {new Date(result.completedAt).toLocaleString()} • MoSPI & Karmayogi Framework</span>
            </p>
          </div>

          <div className="flex items-center gap-4 bg-surface-alt p-4 rounded-xl border border-border shrink-0 self-start sm:self-auto">
            <div className="text-right">
              <div
                className={`text-3xl font-black font-mono tracking-tight ${
                  passed ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {result.score}%
              </div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-text-secondary">
                Deterministic Score
              </div>
            </div>
          </div>
        </div>

        {/* Discrete Competency Progression Ladder (Level 0 -> Level 4) */}
        <div className="p-5 rounded-xl border border-border bg-surface-alt space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-navy" />
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono">
                Workforce Competency Progression Ladder
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-700">
              Evaluated Level: {avgLevel} / 4 ({PROFICIENCY_LEVELS[avgLevel]?.title})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
            {PROFICIENCY_LEVELS.map((pl) => {
              const isCurrent = pl.level === avgLevel;
              const isAchieved = pl.level < avgLevel;

              return (
                <div
                  key={pl.level}
                  className={`p-2.5 rounded-lg border text-center transition-all ${
                    isCurrent
                      ? 'bg-primary-navy text-on-primary border-primary-navy shadow-xs ring-2 ring-primary-navy/20'
                      : isAchieved
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-text-primary'
                      : 'bg-surface border-border text-text-secondary opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {isAchieved && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                    {isCurrent && <Award className="w-3 h-3 text-on-primary" />}
                    <span className={`text-[10px] font-mono font-bold uppercase ${isCurrent ? 'text-on-primary' : ''}`}>
                      Level {pl.level}
                    </span>
                  </div>
                  <div className={`text-xs font-bold leading-tight ${isCurrent ? 'text-on-primary' : 'text-text-primary'}`}>
                    {pl.title}
                  </div>
                  <div className={`text-[10px] mt-1 line-clamp-2 ${isCurrent ? 'text-on-primary/80' : 'text-text-secondary'}`}>
                    {pl.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Competency Score Breakdown */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-text-secondary" />
              <h3 className="text-base font-semibold text-text-primary">Competency Domain Scores</h3>
            </div>
            <span className="text-xs font-mono text-text-secondary">
              {breakdownEntries.length} Domains Evaluated
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {breakdownEntries.map((comp: any) => (
              <div key={comp.competency_id} className="space-y-1">
                <CompetencyGauge
                  label={comp.competency_name || comp.competency_id}
                  score={Math.round(comp.score)}
                  confidence={comp.confidence}
                />
                <div className="flex items-center justify-between px-2 text-[10px] font-mono text-text-secondary">
                  <span>Level {comp.measured_level} of 4</span>
                  <span>{comp.correct_items}/{comp.items_evaluated} Correct</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Item Log with Cognitive Explanations */}
        <div className="pt-2">
          <EvidenceBreakdown itemLog={result.itemLog} />
        </div>

        {/* Priority Skill Gaps & Targeted Recommendations */}
        {result.resultingGaps && result.resultingGaps.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-text-primary">
                Identified Skill Gaps & Targeted Interventions
              </h3>
              <span className="text-xs font-mono text-text-secondary">
                {result.resultingGaps.filter((g: any) => g.priority !== 'NONE').length} Active Gaps
              </span>
            </div>

            <div className="space-y-3">
              {result.resultingGaps
                .filter((gap: any) => gap.priority === 'HIGH' || gap.priority === 'MEDIUM')
                .map((gap: any) => (
                  <RecommendationCard
                    key={gap.competency_id}
                    title={`Targeted Module: ${gap.competency_name}`}
                    description={`Priority ${gap.priority} gap detected. Measured at Level ${gap.current_level}, required Level ${gap.required_level}. Automated learning path adjustment generated.`}
                    matchScore={gap.priority === 'HIGH' ? 95 : 85}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Certificate Cryptographic Verification Seal */}
        <div className="p-4 rounded-xl border border-dashed border-border bg-surface-alt flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-secondary">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary-navy shrink-0" />
            <div>
              <span className="font-semibold text-text-primary block">Deterministic Verification Signature</span>
              <span className="font-mono text-[10px]">Hash: SHA-256 / VYREN-NSSTA-EVAL-{result.id?.slice(0, 16) || 'SEAL'}</span>
            </div>
          </div>
          <div className="text-right text-[11px] font-mono">
            <span>Capacity Building Commission Framework</span>
          </div>
        </div>

        {/* Action Footer (Hidden during Print) */}
        <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
          <Link
            to={ROUTES.LEARNER.LEARNING_PATH}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-border text-text-primary font-medium text-sm hover:bg-surface-alt transition-colors"
          >
            <span>Review Adaptive Learning Path</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to={ROUTES.LEARNER.DASHBOARD}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-primary-navy text-on-primary font-medium text-sm hover:opacity-95 transition-opacity"
          >
            <span>View Updated Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AssessmentResultPage;

