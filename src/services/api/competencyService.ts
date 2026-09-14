import { apiClient } from '../apiClient';
import { CompetencyScore, SkillGap } from '@/types';

export const competencyService = {
  async getScores(): Promise<CompetencyScore[]> {
    try {
      const res = await apiClient<any[]>('/learner/scores');
      if (res && res.length > 0) {
        return res.map(s => ({
          competencyId: s.competency_id,
          competencyName: s.competency_name || 'Competency',
          score: s.score,
          confidence: s.confidence,
          measuredLevel: s.measured_level,
          lastAssessed: s.last_assessed_at || s.updated_at,
        }));
      }
    } catch (e) {
      console.warn('Failed to fetch real competency scores, returning fallback:', e);
    }
    return [];
  },

  async getSkillGaps(): Promise<SkillGap[]> {
    try {
      const res = await apiClient<any[]>('/learner/gaps');
      if (res && res.length > 0) {
        return res.map(g => ({
          competencyId: g.competency_id,
          competencyName: g.competency_name || 'Competency',
          currentLevel: g.current_level,
          requiredLevel: g.required_level,
          gapSize: g.gap_size,
          priority: (g.priority.toLowerCase() === 'none' ? 'low' : g.priority.toLowerCase()) as any,
        }));
      }
    } catch (e) {
      console.warn('Failed to fetch real skill gaps, returning fallback:', e);
    }
    return [];
  },

  async recalibrateScore(competencyId: string, newScore: number): Promise<void> {
    // Score recalibration is now driven server-side by backend completion endpoints!
    console.log(`Recalibration triggered for competency ${competencyId} with score ${newScore}`);
  },
};
