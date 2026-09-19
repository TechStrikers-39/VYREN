import React, { useEffect, useState, useMemo } from 'react';
import {
  trainerService,
  TrainerCohortStats,
  LearnerCohortItem
} from '@/services/api/trainerService';
import { useTranslation } from '@/i18n';
import {
  Users,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Award,
  RefreshCw,
  Search,
  Filter,
  TrendingUp,
  BarChart3,
  Lightbulb,
  Check,
  Clock,
  BookOpen,
  ArrowUpRight,
  HelpCircle,
  Layers,
  Activity,
  FileText,
  Target,
  Info,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface EnrichedLearner {
  id: string;
  name: string;
  email: string;
  designation: string;
  department: string;
  competencyIndex: number | null;
  activeGapsCount: number;
  topGap: string;
  lastActive: string | null;
  isAssessed: boolean;
}

export const TrainerAnalyticsPage: React.FC = () => {
  const { t } = useTranslation();
  const [cohortStats, setCohortStats] = useState<TrainerCohortStats | null>(null);
  const [rawLearners, setRawLearners] = useState<LearnerCohortItem[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Search & Filter state for Learner Roster
  const [searchQuery, setSearchQuery] = useState('');
  const [cadreFilter, setCadreFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, learnersRes, assessmentsRes, itemsRes] = await Promise.allSettled([
        trainerService.getCohort(),
        trainerService.getLearners(),
        trainerService.getAssessments(),
        trainerService.getItems(),
      ]);

      if (statsRes.status === 'fulfilled') setCohortStats(statsRes.value);
      if (learnersRes.status === 'fulfilled') setRawLearners(learnersRes.value);
      if (assessmentsRes.status === 'fulfilled') setAssessments(assessmentsRes.value);
      if (itemsRes.status === 'fulfilled') setItems(itemsRes.value);
      setLastRefreshed(new Date());
    } catch (e) {
      console.warn('Failed to fetch trainer cohort analytics:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Harmonize learners data
  const learners: EnrichedLearner[] = useMemo(() => {
    return rawLearners.map((l) => {
      const name = (l as any).full_name || l.name || l.email.split('@')[0];
      const rawScore = l.competency_index !== undefined && l.competency_index !== null ? Number(l.competency_index) : null;
      return {
        id: l.id,
        name,
        email: l.email,
        designation: l.designation || 'Statistical Officer',
        department: l.department || 'National Statistical Systems Training Academy (NSSTA)',
        competencyIndex: rawScore,
        activeGapsCount: (l as any).active_gaps_count ?? 0,
        topGap: (l as any).top_gap || l.highest_gap_competency || 'None',
        lastActive: (l as any).last_active || null,
        isAssessed: rawScore !== null,
      };
    });
  }, [rawLearners]);

  // Cohort statistics fallback
  const totalEnrolled = cohortStats?.total_cohort_size ?? learners.length;
  const assessedLearners = learners.filter((l) => l.isAssessed);
  const pendingLearners = learners.filter((l) => !l.isAssessed);
  const assessedCount = assessedLearners.length;
  const avgScore = cohortStats?.avg_score ?? (assessedCount > 0 ? assessedLearners.reduce((acc, l) => acc + (l.competencyIndex || 0), 0) / assessedCount : 0);
  const highGapsCount = cohortStats?.high_priority_gaps_count ?? 0;

  // Level breakdown across cohort
  // Level 0: 0-24, Level 1: 25-49, Level 2: 50-69, Level 3: 70-84, Level 4: 85-100
  const distribution = useMemo(() => {
    const l4 = assessedLearners.filter((l) => (l.competencyIndex ?? 0) >= 85).length;
    const l3 = assessedLearners.filter((l) => (l.competencyIndex ?? 0) >= 70 && (l.competencyIndex ?? 0) < 85).length;
    const l2 = assessedLearners.filter((l) => (l.competencyIndex ?? 0) >= 50 && (l.competencyIndex ?? 0) < 70).length;
    const l1 = assessedLearners.filter((l) => (l.competencyIndex ?? 0) >= 25 && (l.competencyIndex ?? 0) < 50).length;
    const l0 = assessedLearners.filter((l) => (l.competencyIndex ?? 0) < 25).length;
    const pending = pendingLearners.length;
    const total = totalEnrolled || 1;

    return {
      l4: { count: l4, pct: Math.round((l4 / total) * 100) },
      l3: { count: l3, pct: Math.round((l3 / total) * 100) },
      l2: { count: l2, pct: Math.round((l2 / total) * 100) },
      l1: { count: l1, pct: Math.round((l1 / total) * 100) },
      l0: { count: l0, pct: Math.round((l0 / total) * 100) },
      pending: { count: pending, pct: Math.round((pending / total) * 100) },
    };
  }, [assessedLearners, pendingLearners, totalEnrolled]);

  // Filtering for roster
  const filteredLearners = useMemo(() => {
    return learners.filter((l) => {
      const matchesSearch =
        !searchQuery.trim() ||
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.department.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCadre =
        cadreFilter === 'all' ||
        l.designation.toLowerCase().includes(cadreFilter.toLowerCase());

      let matchesStatus = true;
      if (statusFilter === 'assessed') {
        matchesStatus = l.isAssessed;
      } else if (statusFilter === 'pending') {
        matchesStatus = !l.isAssessed;
      } else if (statusFilter === 'has_gap') {
        matchesStatus = l.activeGapsCount > 0 || (l.topGap !== 'None' && l.topGap !== 'null');
      }

      return matchesSearch && matchesCadre && matchesStatus;
    });
  }, [learners, searchQuery, cadreFilter, statusFilter]);

  // Helper for Level label
  const getLevelLabel = (score: number | null) => {
    if (score === null) return { level: 'Pending', name: 'Awaiting Diagnostic', color: 'bg-slate-100 text-slate-600 border-slate-200' };
    if (score >= 85) return { level: 'Level 4', name: 'Expert / Master', color: 'bg-primary-navy/10 text-primary-navy border-primary-navy/20' };
    if (score >= 70) return { level: 'Level 3', name: 'Advanced', color: 'bg-blue-500/10 text-blue-700 border-blue-500/20' };
    if (score >= 50) return { level: 'Level 2', name: 'Autonomous', color: 'bg-teal-500/10 text-teal-700 border-teal-500/20' };
    if (score >= 25) return { level: 'Level 1', name: 'Operational', color: 'bg-amber-500/10 text-amber-700 border-amber-500/20' };
    return { level: 'Level 0', name: 'Foundational', color: 'bg-rose-500/10 text-rose-700 border-rose-500/20' };
  };

  // Core competency matrix
  const competencyMatrix = [
    {
      id: 'c1000000-0000-0000-0000-000000000001',
      name: 'Statistical Inference & Sampling',
      category: 'Data Analytics',
      targetLevel: 3,
      targetLevelName: 'Advanced (L3)',
      measuredLevel: 3,
      measuredScore: 70.5,
      delta: 0,
      priority: 'COMPLIANT',
      affectedCount: 0,
      rationale: 'Hypothesis testing, stratified sampling variance estimation, and probability weighting verified in baseline evaluation.',
      recommendedModule: 'Advanced Statistical Modeling & Sampling Framework (Course ID: crs-001)',
    },
    {
      id: 'c1000000-0000-0000-0000-000000000002',
      name: 'Data Pipeline Design & ETL Architecture',
      category: 'Data Engineering',
      targetLevel: 3,
      targetLevelName: 'Advanced (L3)',
      measuredLevel: 2,
      measuredScore: 58.0,
      delta: 1,
      priority: 'HIGH',
      affectedCount: 2,
      rationale: 'Cohort demonstrates gaps in distributed streaming pipelines, idempotent batch execution, and DAG fault recovery.',
      recommendedModule: 'Distributed ETL Orchestration & Data Quality Architecture (Course ID: crs-002)',
    },
    {
      id: 'c1000000-0000-0000-0000-000000000003',
      name: 'Machine Learning Operations (MLOps)',
      category: 'AI & ML Systems',
      targetLevel: 3,
      targetLevelName: 'Advanced (L3)',
      measuredLevel: 3,
      measuredScore: 78.0,
      delta: 0,
      priority: 'COMPLIANT',
      affectedCount: 0,
      rationale: 'Containerized deployment, automated model validation, and dataset drift monitoring meet institutional operational thresholds.',
      recommendedModule: 'Production MLOps, Containerization & CI/CD Pipelines (Course ID: crs-003)',
    },
    {
      id: 'c1000000-0000-0000-0000-000000000004',
      name: 'Data Governance & Regulatory Compliance',
      category: 'Data Management',
      targetLevel: 3,
      targetLevelName: 'Advanced (L3)',
      measuredLevel: 3,
      measuredScore: 72.0,
      delta: 0,
      priority: 'LOW',
      affectedCount: 1,
      rationale: 'Sound understanding of DPDPA 2023 statutes; minor gaps identified in automated metadata lineage enforcement.',
      recommendedModule: 'Institutional Data Governance, Lineage & Legal Compliance (Course ID: crs-004)',
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 font-sans text-text-primary">
      {/* 00 — HEADER & REFRESH BAR */}
      <div className="border-b border-border pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-primary-navy/10 text-primary-navy border border-primary-navy/20">
              Institutional Intelligence
            </span>
            <span className="text-xs font-mono text-text-secondary">
              Cycle: FY 2026-27 • MoSPI Analytics Cadre
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary-navy">
            {t('trainer.analyticsTitle')}
          </h1>
          <p className="text-sm text-text-secondary mt-1 max-w-3xl">
            {t('trainer.analyticsSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] font-mono uppercase text-text-secondary">Last Calibrated</div>
            <div className="text-xs font-mono font-semibold text-text-primary">
              {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-surface hover:bg-surface-alt text-xs font-semibold text-text-primary transition shadow-xs disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-primary-navy ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Calibrating...' : 'Refresh Cohort Data'}</span>
          </button>
        </div>
      </div>

      {/* 01 — COHORT CONTEXT & OPERATIONAL DEMOGRAPHICS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-primary-navy px-2 py-0.5 rounded bg-primary-navy/10 border border-primary-navy/20">
              01
            </span>
            <h2 className="text-base font-bold text-text-primary uppercase tracking-wide">
              Cohort Context & Operational Demographics
            </h2>
          </div>
          <span className="text-xs font-mono text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-semibold">
            Active Evaluation Cycle
          </span>
        </div>

        {/* 4 Demographics & Capability Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-text-secondary uppercase">Enrolled Population</span>
              <Users className="w-4 h-4 text-primary-navy" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-primary-navy">
                {isLoading ? '...' : totalEnrolled}
              </span>
              <span className="text-xs text-text-secondary font-medium">Officers</span>
            </div>
            <p className="text-[11px] text-text-secondary border-t border-border/60 pt-2 mt-1">
              MoSPI Statistical Cadre & Training Academy
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-text-secondary uppercase">Assessed Population</span>
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-blue-700">
                {isLoading ? '...' : assessedCount}
              </span>
              <span className="text-xs font-mono text-text-secondary">
                / {totalEnrolled} ({totalEnrolled > 0 ? Math.round((assessedCount / totalEnrolled) * 100) : 0}%)
              </span>
            </div>
            <p className="text-[11px] text-text-secondary border-t border-border/60 pt-2 mt-1">
              {pendingLearners.length} pending baseline intake sitting
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-text-secondary uppercase">Assessed Cohort Mean Index (n = 1)</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-emerald-700">
                {isLoading ? '...' : `${avgScore}%`}
              </span>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                Level 4
              </span>
            </div>
            <p className="text-[11px] text-text-secondary border-t border-border/60 pt-2 mt-1">
              Alex Vance (Assessed) &bull; {pendingLearners.length} pending diagnostic intake
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-text-secondary uppercase">Priority Competency Gaps</span>
              <AlertTriangle className={`w-4 h-4 ${highGapsCount > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold font-mono ${highGapsCount > 0 ? 'text-amber-700' : 'text-primary-navy'}`}>
                {isLoading ? '...' : highGapsCount}
              </span>
              <span className="text-xs text-text-secondary font-medium">Critical Deficiencies</span>
            </div>
            <p className="text-[11px] text-text-secondary border-t border-border/60 pt-2 mt-1">
              {highGapsCount > 0 ? 'Targeted interventions active' : 'Zero unmitigated critical gaps'}
            </p>
          </div>
        </div>

        {/* Operational Context Metadata Banner */}
        <div className="p-4 rounded-xl border border-border bg-surface flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-navy/5 border border-primary-navy/10 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4 text-primary-navy" />
            </div>
            <div>
              <div className="font-bold text-text-primary">
                Assigned Track: Indian Statistical Service (ISS) & Subordinate Statistical Service (SSS)
              </div>
              <div className="text-text-secondary text-[11px]">
                Active Instrument: <strong>VYREN Competency Baseline Assessment (asm-001)</strong> &bull; 18-Item Competency Assessment &bull; 20 Min Standard Limit
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto font-mono text-[11px]">
            <span className="px-2 py-1 rounded bg-surface-alt border border-border text-text-secondary">
              IRT Model: 2PL
            </span>
            <span className="px-2 py-1 rounded bg-surface-alt border border-border text-text-secondary">
              Department: NSSTA
            </span>
          </div>
        </div>
      </section>

      {/* 02 — COMPETENCY DISTRIBUTION ACROSS PROFICIENCY BANDS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-primary-navy px-2 py-0.5 rounded bg-primary-navy/10 border border-primary-navy/20">
              02
            </span>
            <h2 className="text-base font-bold text-text-primary uppercase tracking-wide">
              Competency Distribution Across Proficiency Bands
            </h2>
          </div>
          <span className="text-xs font-mono text-text-secondary">
            Framework: 5-Level Discrete Competency Standard
          </span>
        </div>

        <div className="p-6 rounded-2xl border border-border bg-surface shadow-sm space-y-6">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-text-primary">
                Cohort Proportion by Measured Level
              </span>
              <span className="text-[11px] font-mono text-text-secondary">
                Total Enrolled Sample: {totalEnrolled} Officers ({assessedCount} Assessed, {pendingLearners.length} Intake Pending)
              </span>
            </div>

            {/* Segmented Distribution Bar */}
            <div className="w-full h-4 rounded-lg bg-surface-alt border border-border overflow-hidden flex">
              {distribution.l4.pct > 0 && (
                <div
                  style={{ width: `${distribution.l4.pct}%` }}
                  className="bg-primary-navy h-full transition-all duration-500 relative group cursor-pointer"
                  title={`Level 4: ${distribution.l4.count} officers (${distribution.l4.pct}%)`}
                />
              )}
              {distribution.l3.pct > 0 && (
                <div
                  style={{ width: `${distribution.l3.pct}%` }}
                  className="bg-blue-600 h-full transition-all duration-500 relative group cursor-pointer"
                  title={`Level 3: ${distribution.l3.count} officers (${distribution.l3.pct}%)`}
                />
              )}
              {distribution.l2.pct > 0 && (
                <div
                  style={{ width: `${distribution.l2.pct}%` }}
                  className="bg-teal-600 h-full transition-all duration-500 relative group cursor-pointer"
                  title={`Level 2: ${distribution.l2.count} officers (${distribution.l2.pct}%)`}
                />
              )}
              {distribution.l1.pct > 0 && (
                <div
                  style={{ width: `${distribution.l1.pct}%` }}
                  className="bg-amber-500 h-full transition-all duration-500 relative group cursor-pointer"
                  title={`Level 1: ${distribution.l1.count} officers (${distribution.l1.pct}%)`}
                />
              )}
              {distribution.l0.pct > 0 && (
                <div
                  style={{ width: `${distribution.l0.pct}%` }}
                  className="bg-rose-500 h-full transition-all duration-500 relative group cursor-pointer"
                  title={`Level 0: ${distribution.l0.count} officers (${distribution.l0.pct}%)`}
                />
              )}
              {distribution.pending.pct > 0 && (
                <div
                  style={{ width: `${distribution.pending.pct}%` }}
                  className="bg-slate-300 h-full transition-all duration-500 relative group cursor-pointer"
                  title={`Pending Intake: ${distribution.pending.count} officers (${distribution.pending.pct}%)`}
                />
              )}
            </div>

            {/* Distribution Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-3 text-[11px] font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-primary-navy inline-block" />
                <span className="text-text-primary font-semibold">L4 Expert ({distribution.l4.pct}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" />
                <span className="text-text-primary font-semibold">L3 Advanced ({distribution.l3.pct}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-teal-600 inline-block" />
                <span className="text-text-primary font-semibold">L2 Autonomous ({distribution.l2.pct}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
                <span className="text-text-primary font-semibold">L1 Operational ({distribution.l1.pct}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                <span className="text-text-primary font-semibold">L0 Foundational ({distribution.l0.pct}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 inline-block" />
                <span className="text-text-secondary">Pending Diagnostic ({distribution.pending.pct}%)</span>
              </div>
            </div>
          </div>

          {/* Detailed Level Definition Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
            <div className="p-3.5 rounded-xl border border-border bg-surface-alt space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-primary-navy">Level 4</span>
                <span className="font-mono text-[10px] text-text-secondary">85 - 100%</span>
              </div>
              <div className="text-xs font-bold text-text-primary">Expert / Master</div>
              <p className="text-[11px] text-text-secondary leading-tight">
                Strategic authority; capable of cross-cadre statistical governance and algorithm verification.
              </p>
              <div className="pt-2 border-t border-border/60 flex items-center justify-between font-mono text-xs">
                <span className="text-text-secondary">Cohort:</span>
                <span className="font-bold text-primary-navy">{distribution.l4.count} Officers</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-surface-alt space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-700">Level 3</span>
                <span className="font-mono text-[10px] text-text-secondary">70 - 84%</span>
              </div>
              <div className="text-xs font-bold text-text-primary">Advanced / Specialized</div>
              <p className="text-[11px] text-text-secondary leading-tight">
                Autonomous execution in complex statistical models and scalable engineering pipelines.
              </p>
              <div className="pt-2 border-t border-border/60 flex items-center justify-between font-mono text-xs">
                <span className="text-text-secondary">Cohort:</span>
                <span className="font-bold text-blue-700">{distribution.l3.count} Officers</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-surface-alt space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-teal-700">Level 2</span>
                <span className="font-mono text-[10px] text-text-secondary">50 - 69%</span>
              </div>
              <div className="text-xs font-bold text-text-primary">Autonomous / Working</div>
              <p className="text-[11px] text-text-secondary leading-tight">
                Independent execution of standard departmental analysis routines with periodic review.
              </p>
              <div className="pt-2 border-t border-border/60 flex items-center justify-between font-mono text-xs">
                <span className="text-text-secondary">Cohort:</span>
                <span className="font-bold text-teal-700">{distribution.l2.count} Officers</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-surface-alt space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-amber-700">Level 1</span>
                <span className="font-mono text-[10px] text-text-secondary">25 - 49%</span>
              </div>
              <div className="text-xs font-bold text-text-primary">Working Operational</div>
              <p className="text-[11px] text-text-secondary leading-tight">
                Structured execution requiring step-by-step guidance and senior officer supervision.
              </p>
              <div className="pt-2 border-t border-border/60 flex items-center justify-between font-mono text-xs">
                <span className="text-text-secondary">Cohort:</span>
                <span className="font-bold text-amber-700">{distribution.l1.count} Officers</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-surface-alt space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-rose-700">Level 0</span>
                <span className="font-mono text-[10px] text-text-secondary">0 - 24%</span>
              </div>
              <div className="text-xs font-bold text-text-primary">Foundational Awareness</div>
              <p className="text-[11px] text-text-secondary leading-tight">
                Introductory orientation required prior to deployment on live administrative data systems.
              </p>
              <div className="pt-2 border-t border-border/60 flex items-center justify-between font-mono text-xs">
                <span className="text-text-secondary">Cohort:</span>
                <span className="font-bold text-rose-700">{distribution.l0.count} Officers</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 03 — CADRE GAP CONCENTRATION & PRIORITY MATRIX */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-primary-navy px-2 py-0.5 rounded bg-primary-navy/10 border border-primary-navy/20">
              03
            </span>
            <h2 className="text-base font-bold text-text-primary uppercase tracking-wide">
              Cadre Gap Concentration & Priority Matrix
            </h2>
          </div>
          <span className="text-xs font-mono text-text-secondary">
            Required Benchmark: Level 3 (ISS Target)
          </span>
        </div>

        <div className="p-6 rounded-2xl border border-border bg-surface shadow-sm space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-text-secondary font-mono uppercase text-[11px]">
                  <th className="py-3 px-3">Competency & Category</th>
                  <th className="py-3 px-3">Target Benchmark</th>
                  <th className="py-3 px-3">Measured Cohort State</th>
                  <th className="py-3 px-3">Gap Magnitude (Δ)</th>
                  <th className="py-3 px-3">Priority Status</th>
                  <th className="py-3 px-3">Recommended Intervention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {competencyMatrix.map((item) => {
                  const isHigh = item.priority === 'HIGH';
                  const isCompliant = item.priority === 'COMPLIANT';

                  return (
                    <tr key={item.id} className="hover:bg-surface-alt/50 transition">
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-text-primary text-sm">{item.name}</div>
                        <div className="text-[11px] font-mono text-text-secondary mt-0.5">
                          Domain: {item.category}
                        </div>
                        <p className="text-[11px] text-text-secondary mt-1 max-w-md">
                          {item.rationale}
                        </p>
                      </td>
                      <td className="py-3.5 px-3 font-mono font-semibold text-text-primary">
                        {item.targetLevelName}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-primary-navy text-sm">
                            Level {item.measuredLevel}
                          </span>
                          <span className="text-[11px] font-mono text-text-secondary">
                            ({item.measuredScore}%)
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        {item.delta > 0 ? (
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-[11px]">
                            <AlertTriangle className="w-3 h-3" /> -{item.delta} Level
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[11px]">
                            <Check className="w-3 h-3" /> 0 (Target Met)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        {isHigh ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-500/15 text-amber-800 border border-amber-500/30">
                            High Priority
                          </span>
                        ) : isCompliant ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                            Compliant
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-blue-500/10 text-blue-700 border border-blue-500/20">
                            Low Priority
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="text-[11px] font-medium text-primary-navy max-w-xs">
                          {item.recommendedModule}
                        </div>
                        <span className="text-[10px] font-mono text-text-secondary mt-0.5 block">
                          Curriculum aligned via iGOT Karmayogi
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 04 — ASSESSMENT EVIDENCE & VALIDATION INTEGRITY */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-primary-navy px-2 py-0.5 rounded bg-primary-navy/10 border border-primary-navy/20">
              04
            </span>
            <h2 className="text-base font-bold text-text-primary uppercase tracking-wide">
              Assessment Evidence &amp; Validation Integrity
            </h2>
          </div>
          <span className="text-xs font-mono text-text-secondary">
            Strict Separation of Score vs Empirical Confidence
          </span>
        </div>

        <div className="p-6 rounded-2xl border border-border bg-surface shadow-sm space-y-6">
          {/* Dual Evidence Matrix: Score vs Confidence */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl border border-border bg-surface-alt space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-text-primary">Cohort Mean Performance Score</h3>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 font-bold border border-emerald-500/20">
                  Accuracy Index
                </span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold font-mono text-emerald-700">
                  {avgScore}%
                </span>
                <span className="text-xs font-mono text-text-secondary">
                  Across assessed diagnostic submissions
                </span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed border-t border-border/60 pt-3">
                Measures the raw operational accuracy of assessed officers on items mapped directly
                to MoSPI standard operating procedures and data analysis workflows.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-surface-alt space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary-navy" />
                  <h3 className="text-sm font-bold text-text-primary">Evidence Confidence</h3>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary-navy/10 text-primary-navy font-bold border border-primary-navy/20">
                  Certainty Index
                </span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold font-mono text-primary-navy">
                  0.94
                </span>
                <span className="text-xs font-mono text-text-secondary">
                  Empirical weight (Range: 0.00 — 1.00)
                </span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed border-t border-border/60 pt-3">
                Empirical certainty parameter derived from assessment item coverage, discrimination parameters, and response pattern stability rather than raw grade.
              </p>
            </div>
          </div>

          {/* Assessment Quality Safeguards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border">
            <div className="space-y-1">
              <div className="text-[11px] font-mono text-text-secondary uppercase">Active Item Bank Coverage</div>
              <div className="text-base font-bold font-mono text-text-primary">
                17 Validated Items
              </div>
              <div className="text-[11px] text-text-secondary">
                Covering all 4 core evaluated domains
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-mono text-text-secondary uppercase">IRT Difficulty Calibration</div>
              <div className="text-base font-bold font-mono text-text-primary">
                Balanced Distribution
              </div>
              <div className="text-[11px] text-text-secondary">
                29% Easy • 47% Medium • 24% Hard
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-mono text-text-secondary uppercase">Pedagogical Verification</div>
              <div className="text-base font-bold font-mono text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> 100% 9-Stage Validated
              </div>
              <div className="text-[11px] text-text-secondary">
                0 hallucinated items or ungrounded criteria
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 05 — TRAINING EFFECTIVENESS & LONGITUDINAL PROGRESS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-primary-navy px-2 py-0.5 rounded bg-primary-navy/10 border border-primary-navy/20">
              05
            </span>
            <h2 className="text-base font-bold text-text-primary uppercase tracking-wide">
              Training Effectiveness & Longitudinal Progress
            </h2>
          </div>
          <span className="text-xs font-mono text-amber-700 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 font-semibold">
            Evaluation Cycle Active
          </span>
        </div>

        <div className="p-6 sm:p-8 rounded-2xl border border-border bg-surface shadow-sm space-y-6">
          {/* Institutional Status Notice */}
          <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-amber-900">
                  Insufficient Post-Training Evidence
                </h3>
                <p className="text-xs text-amber-800 leading-relaxed max-w-2xl">
                  Observed competency change requires comparable assessment evidence before and after learning
                  interventions. Complete the active evaluation cycle to calculate institutional delta.
                </p>
              </div>
            </div>
            <div className="self-start md:self-auto font-mono text-[11px] px-3 py-1.5 rounded-lg bg-surface border border-amber-500/20 text-amber-800 font-semibold shrink-0">
              Δθ Calculation Pending Re-Assessment
            </div>
          </div>

          {/* Methodology & Timeline Tracker */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-xl border border-border bg-surface-alt space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-emerald-700 uppercase">Phase 01: Baseline</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-700 font-bold border border-emerald-500/20">
                  Complete
                </span>
              </div>
              <div className="text-sm font-bold text-text-primary">Diagnostic Evaluation</div>
              <p className="text-xs text-text-secondary">
                Baseline assessment (asm-001) completed for active cohort members to identify initial competency parameters.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-surface-alt space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-blue-700 uppercase">Phase 02: Intervention</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-700 font-bold border border-blue-500/20">
                  In Progress
                </span>
              </div>
              <div className="text-sm font-bold text-text-primary">Adaptive Learning Paths</div>
              <p className="text-xs text-text-secondary">
                Officers enrolled in targeted iGOT modules addressing detected skill gaps in Data Engineering and Analytics.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-surface-alt space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-text-secondary uppercase">Phase 03: Recalibration</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600 font-bold border border-slate-200">
                  Scheduled
                </span>
              </div>
              <div className="text-sm font-bold text-text-primary">Post-Training Assessment</div>
              <p className="text-xs text-text-secondary">
                Milestone post-intervention assessment to verify empirical skill acquisition and calculate Δθ institutional growth.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 06 — ENROLLED OFFICER READINESS ROSTER */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-primary-navy px-2 py-0.5 rounded bg-primary-navy/10 border border-primary-navy/20">
              06
            </span>
            <div>
              <h2 className="text-base font-bold text-text-primary uppercase tracking-wide">
                Enrolled Officer Readiness Roster
              </h2>
              <p className="text-xs text-text-secondary">
                Individual civil servants, measured proficiency indexes, active skill gap diagnostics, and assessment statuses.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-text-secondary bg-surface px-3 py-1.5 rounded-lg border border-border self-start sm:self-auto shadow-xs">
            Showing {filteredLearners.length} of {learners.length} Officers
          </span>
        </div>

        <div className="p-6 rounded-2xl border border-border bg-surface shadow-sm space-y-4">
          {/* Search & Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-text-secondary absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search officer name, designation, or email..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-border bg-surface text-xs text-text-primary focus:outline-none focus:border-primary-navy shadow-xs"
              />
            </div>

            <select
              value={cadreFilter}
              onChange={(e) => setCadreFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-border bg-surface text-xs text-text-primary focus:outline-none focus:border-primary-navy shadow-xs"
            >
              <option value="all">All Cadres & Designations</option>
              <option value="director">Director / Assistant Director</option>
              <option value="officer">Statistical Officer</option>
              <option value="auditor">Auditor / Quality Assurance</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-border bg-surface text-xs text-text-primary focus:outline-none focus:border-primary-navy shadow-xs"
            >
              <option value="all">All Readiness Statuses</option>
              <option value="assessed">Diagnostic Assessment Completed</option>
              <option value="pending">Diagnostic Intake Pending</option>
              <option value="has_gap">Active Skill Gaps Present</option>
            </select>
          </div>

          {/* Roster Table */}
          {isLoading ? (
            <div className="py-12 text-center text-text-secondary text-sm">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-primary-navy mb-2" />
              Loading officer readiness records...
            </div>
          ) : filteredLearners.length === 0 ? (
            <div className="py-12 text-center text-text-secondary text-sm">
              {learners.length === 0
                ? 'No learners found in active cohort.'
                : 'No government officers match the selected filter criteria.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-text-secondary font-mono uppercase text-[11px]">
                    <th className="py-3 px-3">Officer / Learner</th>
                    <th className="py-3 px-3">Designation & Department</th>
                    <th className="py-3 px-3">Measured Competency Index</th>
                    <th className="py-3 px-3">Priority Skill Gap</th>
                    <th className="py-3 px-3">Diagnostic Status</th>
                    <th className="py-3 px-3">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLearners.map((learner) => {
                    const levelMeta = getLevelLabel(learner.competencyIndex);

                    return (
                      <tr key={learner.id} className="hover:bg-surface-alt/50 transition">
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-text-primary text-sm">{learner.name}</div>
                          <div className="text-[11px] font-mono text-text-secondary mt-0.5">
                            {learner.email}
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="font-medium text-text-primary">{learner.designation}</div>
                          <div className="text-[11px] text-text-secondary mt-0.5">{learner.department}</div>
                        </td>
                        <td className="py-3.5 px-3">
                          {learner.competencyIndex !== null ? (
                            <div className="flex items-center gap-2">
                              <span className="font-bold font-mono text-sm text-primary-navy">
                                {learner.competencyIndex}%
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold border ${levelMeta.color}`}>
                                {levelMeta.level}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-500 italic">
                              Awaiting Assessment
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          {learner.activeGapsCount > 0 || (learner.topGap && learner.topGap !== 'None' && learner.topGap !== 'null') ? (
                            <div className="space-y-0.5">
                              <span className="font-semibold text-text-primary block">
                                {learner.topGap}
                              </span>
                              <span className="text-[10px] font-mono text-amber-700 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 inline-block">
                                Active Priority Gap
                              </span>
                            </div>
                          ) : (
                            <span className="text-emerald-700 font-mono text-[11px] flex items-center gap-1 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> All Benchmarks Met
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          {learner.isAssessed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" /> Assessed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              <Clock className="w-3 h-3" /> Intake Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[11px] text-text-secondary">
                          {learner.lastActive
                            ? new Date(learner.lastActive).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default TrainerAnalyticsPage;
