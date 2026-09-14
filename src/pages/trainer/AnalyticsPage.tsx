import React, { useEffect, useState } from 'react';
import { trainerService, TrainerCohortStats, LearnerCohortItem } from '@/services/api/trainerService';
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
  Clock
} from 'lucide-react';

export const TrainerAnalyticsPage: React.FC = () => {
  const [cohortStats, setCohortStats] = useState<TrainerCohortStats | null>(null);
  const [learners, setLearners] = useState<LearnerCohortItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter state for Learner Roster
  const [searchQuery, setSearchQuery] = useState('');
  const [cadreFilter, setCadreFilter] = useState('all');
  const [gapFilter, setGapFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, learnersRes] = await Promise.allSettled([
        trainerService.getCohort(),
        trainerService.getLearners(),
      ]);

      if (statsRes.status === 'fulfilled') setCohortStats(statsRes.value);
      if (learnersRes.status === 'fulfilled') setLearners(learnersRes.value);
    } catch (e) {
      console.warn('Failed to fetch trainer cohort stats:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = cohortStats || {
    total_cohort_size: learners.length || 1,
    avg_score: 84.0,
    high_priority_gaps_count: 2,
    top_gap_competency: 'Data Pipeline Design & ETL Architecture',
  };

  const filteredLearners = learners.filter((l) => {
    const matchesSearch =
      !searchQuery.trim() ||
      l.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.designation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.department?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCadre =
      cadreFilter === 'all' ||
      (l.designation && l.designation.toLowerCase().includes(cadreFilter.toLowerCase()));

    const matchesGap =
      gapFilter === 'all' ||
      (gapFilter === 'has_gap' ? !!l.highest_gap_competency : !l.highest_gap_competency);

    return matchesSearch && matchesCadre && matchesGap;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Trainer Cohort Analytics</h1>
          <p className="text-sm text-text-secondary">
            Monitor cohort competency development, skill gap resolution velocity, and individual learner readiness.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-border text-xs font-semibold text-text-secondary hover:bg-surface-alt transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-text-secondary uppercase">Active Cohort Learners</span>
            <Users className="w-4 h-4 text-primary-navy" />
          </div>
          <div className="text-2xl font-bold text-primary-navy">
            {isLoading ? '...' : (cohortStats?.total_cohort_size ?? learners.length)}
          </div>
          <p className="text-[11px] text-text-secondary font-mono">Designated Government Analysts</p>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-text-secondary uppercase">Avg Cohort Competency Index</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-primary-navy">
            {isLoading ? '...' : `${stats.avg_score}%`}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold font-mono">Level 3 (Advanced Proficiency)</p>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-text-secondary uppercase">Critical / High Skill Gaps</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600">
            {isLoading ? '...' : stats.high_priority_gaps_count}
          </div>
          <p className="text-[11px] text-text-secondary font-mono">Prioritized for targeted training modules</p>
        </div>
      </div>

      {/* Cohort Profile Card */}
      <div className="p-6 sm:p-8 rounded-2xl border border-border bg-surface shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-base font-bold text-text-primary">MoSPI National Data Analytics Cohort (2026)</h2>
            <p className="text-xs text-text-secondary">Official competency cohort tracked under Capacity Building Commission.</p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 font-bold border border-emerald-500/20">
            Active Batch
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl border border-border bg-surface-alt space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary-navy" />
              <h3 className="text-sm font-bold text-text-primary">Competency Gap Priority Breakdown</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-border">
                <span className="font-semibold text-text-primary">Data Pipeline Design & ETL</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20">
                  Target: Level 4 • Current: Level 3 (Gap: 1)
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-border">
                <span className="font-semibold text-text-primary">Statistical Inference & Sampling</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                  Target: Level 4 • Current: Level 4 (Compliant)
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-border">
                <span className="font-semibold text-text-primary">Machine Learning Operations</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-700 border border-blue-500/20">
                  Target: Level 3 • Current: Level 3 (Compliant)
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl border border-border bg-surface-alt space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-text-primary">Training Intervention Recommendations</h3>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Based on the latest diagnostic evaluation, <strong>Data Pipeline Design & ETL Architecture</strong> is the highest return-on-investment training module for this cohort.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-primary-navy/5 border border-primary-navy/20 text-xs text-primary-navy font-medium flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-primary-navy shrink-0 mt-0.5" />
              <span>Recommended Action: Assign <em>Data Pipeline Design & ETL Architecture</em> course to all learners with High/Medium gaps.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cohort Learner Roster Table */}
      <div className="p-6 sm:p-8 rounded-2xl border border-border bg-surface shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h3 className="text-base font-bold text-text-primary">Cohort Learner Readiness Roster</h3>
            <p className="text-xs text-text-secondary">Enrolled government officials, measured competency index, and top priority gaps.</p>
          </div>
          <span className="text-xs font-mono text-text-secondary bg-surface-alt px-2.5 py-1 rounded-lg border border-border self-start sm:self-auto">
            Showing {filteredLearners.length} of {learners.length} Officers
          </span>
        </div>

        {/* Search & Filtering Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-text-secondary absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search officer, designation, or email..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-border bg-surface text-xs text-text-primary focus:outline-none focus:border-primary-navy"
            />
          </div>

          <select
            value={cadreFilter}
            onChange={(e) => setCadreFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border bg-surface text-xs text-text-primary focus:outline-none focus:border-primary-navy"
          >
            <option value="all">All Cadres & Designations</option>
            <option value="director">Director / Senior Level</option>
            <option value="officer">Statistical Officer</option>
            <option value="analyst">Data Analyst</option>
          </select>

          <select
            value={gapFilter}
            onChange={(e) => setGapFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border bg-surface text-xs text-text-primary focus:outline-none focus:border-primary-navy"
          >
            <option value="all">All Readiness Statuses</option>
            <option value="has_gap">Active Skill Gaps Present</option>
            <option value="no_gap">Target Benchmark Achieved</option>
          </select>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-text-secondary text-sm">Loading learner roster...</div>
        ) : filteredLearners.length === 0 ? (
          <div className="py-8 text-center text-text-secondary text-sm">
            {learners.length === 0 ? 'No learners found in active cohort.' : 'No officers match the selected filter criteria.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-text-secondary font-mono uppercase text-[11px]">
                  <th className="py-3 px-3">Officer / Learner</th>
                  <th className="py-3 px-3">Cadre & Designation</th>
                  <th className="py-3 px-3">Competency Index</th>
                  <th className="py-3 px-3">Highest Priority Gap</th>
                  <th className="py-3 px-3">Onboarding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLearners.map((learner) => (
                  <tr key={learner.id} className="hover:bg-surface-alt/50 transition">
                    <td className="py-3 px-3">
                      <div className="font-bold text-text-primary text-sm">{learner.name}</div>
                      <div className="text-[11px] font-mono text-text-secondary">{learner.email}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-text-primary">{learner.designation || 'Statistical Officer'}</div>
                      <div className="text-[11px] text-text-secondary">{learner.department || 'MoSPI'}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-sm text-primary-navy">
                          {learner.competency_index}%
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                          Level {Math.min(4, Math.floor(learner.competency_index / 25))}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      {learner.highest_gap_competency ? (
                        <div className="space-y-0.5">
                          <span className="font-semibold text-text-primary block">{learner.highest_gap_competency}</span>
                          <span className="text-[10px] font-mono text-amber-700 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            Gap Size: {learner.highest_gap_size ?? 1} Level
                          </span>
                        </div>
                      ) : (
                        <span className="text-emerald-700 font-mono text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> All Met
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {learner.onboarding_completed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Complete
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200">
                          Pending Intake
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainerAnalyticsPage;
