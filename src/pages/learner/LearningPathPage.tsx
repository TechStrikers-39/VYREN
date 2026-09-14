import React, { useEffect, useState } from 'react';
import LearningPathTimeline from '@/components/learning/LearningPathTimeline';
import IgotSearchCatalog from '@/components/catalog/IgotSearchCatalog';
import { learnerService } from '@/services/api/learnerService';
import { competencyService } from '@/services/api/competencyService';
import { LearningPathData, CompetencyScore, SkillGap } from '@/types';
import { Map, CheckCircle2, TrendingUp, Target, Sparkles, BookOpen, ChevronRight, Award } from 'lucide-react';

export const LearningPathPage: React.FC = () => {
  const [learningPath, setLearningPath] = useState<LearningPathData | null>(null);
  const [scores, setScores] = useState<CompetencyScore[]>([]);
  const [gaps, setGaps] = useState<SkillGap[]>([]);
  const [activeTab, setActiveTab] = useState<'timeline' | 'catalog'>('timeline');
  const [isLoading, setIsLoading] = useState(true);

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

  const totalSteps = learningPath?.total_steps || 5;
  const completedSteps = learningPath?.completed_steps || 0;
  const progressPercent = learningPath?.completion_percentage || (totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0);

  const highPriorityGaps = gaps.filter(g => g.priority === 'HIGH' || g.priority === 'critical');
  const activeCompetencyNames = scores.map(s => s.competencyName);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="border-b border-border pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary-navy/10 text-primary-navy border border-primary-navy/20 uppercase tracking-wider">
              Adaptive Curriculum Engine
            </span>
            <span className="text-xs text-text-secondary font-mono">• MoSPI NSSTA Framework</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Official Competency Learning Path
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Sequenced diagnostic assessment, targeted iGOT Karmayogi modules, and deterministic score recalibrations.
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center p-1 rounded-xl bg-surface border border-border shrink-0 shadow-2xs">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'timeline'
                ? 'bg-primary-navy text-on-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Assigned Sequence</span>
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'catalog'
                ? 'bg-primary-navy text-on-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Explore iGOT Catalog</span>
          </button>
        </div>
      </div>

      {/* Top Section: Pathway Progression KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Overall Progress */}
        <div className="p-5 rounded-2xl border border-border bg-surface shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-text-secondary uppercase">Pathway Progress</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-primary-navy font-mono">
            {isLoading ? '...' : `${progressPercent}%`}
          </div>
          <div className="w-full h-1.5 rounded-full bg-surface-alt overflow-hidden border border-border">
            <div
              className="h-full bg-emerald-600 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, progressPercent)}%` }}
            />
          </div>
        </div>

        {/* KPI 2: Completed Modules */}
        <div className="p-5 rounded-2xl border border-border bg-surface shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-text-secondary uppercase">Curriculum Modules</span>
            <CheckCircle2 className="w-4 h-4 text-primary-navy" />
          </div>
          <div className="text-2xl font-bold text-text-primary font-mono">
            {isLoading ? '...' : `${completedSteps} / ${totalSteps}`}
          </div>
          <p className="text-[11px] text-text-secondary font-mono">
            {totalSteps - completedSteps} steps remaining to certification
          </p>
        </div>

        {/* KPI 3: Priority Gap Focus */}
        <div className="p-5 rounded-2xl border border-border bg-surface shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-text-secondary uppercase">Priority Skill Gaps</span>
            <Target className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700 font-mono">
            {isLoading ? '...' : highPriorityGaps.length}
          </div>
          <p className="text-[11px] text-text-secondary font-mono truncate">
            {highPriorityGaps[0]?.competencyName || 'Focused development in progress'}
          </p>
        </div>

        {/* KPI 4: Target Cadre Level */}
        <div className="p-5 rounded-2xl border border-border bg-surface shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-text-secondary uppercase">Cadre Target Level</span>
            <Award className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-700 font-mono">
            Level 3 / 4
          </div>
          <p className="text-[11px] text-text-secondary font-mono">
            MoSPI Designated Requirement
          </p>
        </div>
      </div>

      {/* Visual Metaphor Banner: Current State -> Skill Gap -> Priority -> Recommended Action -> Progress */}
      <div className="p-4 rounded-2xl bg-surface border border-border shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-700 font-mono font-bold flex items-center justify-center shrink-0 border border-emerald-500/20">
              1
            </span>
            <span className="font-semibold text-text-primary">Current Level</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-text-secondary/40 hidden md:block" />

          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-700 font-mono font-bold flex items-center justify-center shrink-0 border border-amber-500/20">
              2
            </span>
            <span className="font-semibold text-text-primary">Skill Gap Identified</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-text-secondary/40 hidden md:block" />

          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-700 font-mono font-bold flex items-center justify-center shrink-0 border border-rose-500/20">
              3
            </span>
            <span className="font-semibold text-text-primary">Priority Assigned</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-text-secondary/40 hidden md:block" />

          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-700 font-mono font-bold flex items-center justify-center shrink-0 border border-blue-500/20">
              4
            </span>
            <span className="font-semibold text-text-primary">Targeted iGOT Course</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-text-secondary/40 hidden md:block" />

          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary-navy/10 text-primary-navy font-mono font-bold flex items-center justify-center shrink-0 border border-primary-navy/20">
              5
            </span>
            <span className="font-semibold text-text-primary">Recalibration (+25 pts)</span>
          </div>
        </div>
      </div>

      {/* Main Content: Assigned Sequence vs Live iGOT Catalog */}
      {activeTab === 'timeline' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-text-primary">Adaptive Pathway Timeline</h2>
            <span className="text-xs font-mono text-emerald-700 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
              ● Deterministic Recalibration Enabled
            </span>
          </div>
          <LearningPathTimeline />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-text-primary">Supplemental National Catalog Discovery</h2>
            <span className="text-xs font-mono text-text-secondary">
              Direct Sunbird Content Discovery Gateway
            </span>
          </div>
          <IgotSearchCatalog />
        </div>
      )}
    </div>
  );
};

export default LearningPathPage;
