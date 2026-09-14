import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CompetencyRadar from '@/components/competency/CompetencyRadar';
import SkillGapHeatmap from '@/components/competency/SkillGapHeatmap';
import LearningPathTimeline from '@/components/learning/LearningPathTimeline';
import CompetencyGauge from '@/components/competency/CompetencyGauge';
import RecommendationCard from '@/components/recommendations/RecommendationCard';
import { competencyService } from '@/services/api/competencyService';
import { recommendationService } from '@/services/api/recommendationService';
import IgotSearchCatalog from '@/components/catalog/IgotSearchCatalog';
import { CompetencyScore, SkillGap, Recommendation } from '@/types';
import { ROUTES } from '@/constants/routes';

export const LearnerDashboardPage: React.FC = () => {
  const [scores, setScores] = useState<CompetencyScore[]>([]);
  const [gaps, setGaps] = useState<SkillGap[]>([]);
  const [recs, setRecs] = useState<Recommendation[]>([]);

  useEffect(() => {
    competencyService.getScores().then(setScores);
    competencyService.getSkillGaps().then(setGaps);
    recommendationService.getRecommendations().then(setRecs);
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Learner Competency Intelligence</h1>
          <p className="text-sm text-text-secondary">Deterministic assessment scores, skill gap measurements, and adaptive learning recommendations.</p>
        </div>
        <Link
          to={ROUTES.LEARNER.ASSESSMENT('a1000000-0000-0000-0000-000000000001')}
          className="inline-flex items-center px-4 py-2.5 rounded-lg bg-primary-navy text-on-primary font-medium text-sm hover:opacity-95 transition-opacity shrink-0 shadow-sm"
        >
          Start Baseline Assessment →
        </Link>
      </div>

      {/* Gauges row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {scores.map((sc) => (
          <CompetencyGauge
            key={sc.competencyId}
            label={sc.competencyName}
            score={sc.score}
            confidence={sc.confidence}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CompetencyRadar />
        <SkillGapHeatmap />
      </div>

      {/* Recommendations */}
      {recs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">Personalized Skill Gap Recommendations</h2>
            <span className="text-xs text-text-secondary">Driven by measured competency gaps & MoSPI role requirements</span>
          </div>
          <div className="space-y-3">
            {recs.map((rec) => (
              <RecommendationCard
                key={rec.id}
                title={rec.title}
                description={rec.description}
                matchScore={rec.matchScore}
                provider={rec.title.includes('MoSPI') ? 'MoSPI / NSSTA (Sunbird API)' : 'iGOT Karmayogi'}
                isExternal={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Live Sunbird iGOT Course Search Catalog */}
      <div className="pt-4 border-t border-border">
        <IgotSearchCatalog />
      </div>

      <LearningPathTimeline />
    </div>
  );
};

export default LearnerDashboardPage;
