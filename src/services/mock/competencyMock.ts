import { CompetencyScore, SkillGap } from '@/types';

export const mockCompetencyScores: CompetencyScore[] = [
  { competencyId: 'c1', competencyName: 'Statistical Inference', score: 82, confidence: 0.9, lastAssessed: '2026-09-01' },
  { competencyId: 'c2', competencyName: 'Data Pipeline Design', score: 68, confidence: 0.85, lastAssessed: '2026-09-05' },
  { competencyId: 'c3', competencyName: 'Machine Learning Ops', score: 54, confidence: 0.78, lastAssessed: '2026-09-08' },
  { competencyId: 'c4', competencyName: 'Data Governance', score: 90, confidence: 0.95, lastAssessed: '2026-08-28' },
];

export const mockSkillGaps: SkillGap[] = [
  { competencyId: 'c3', competencyName: 'Machine Learning Ops', currentLevel: 2, requiredLevel: 4, gapSize: 2, priority: 'high' },
  { competencyId: 'c2', competencyName: 'Data Pipeline Design', currentLevel: 3, requiredLevel: 4, gapSize: 1, priority: 'medium' },
];
