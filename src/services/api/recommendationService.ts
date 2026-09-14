import { apiClient } from '../apiClient';
import { Recommendation } from '@/types';

export const recommendationService = {
  async getRecommendations(): Promise<Recommendation[]> {
    try {
      const res = await apiClient<any[]>('/learner/recommendations');
      if (res && res.length > 0) {
        return res.map(r => ({
          id: r.id,
          title: r.title,
          description: r.description || '',
          type: r.type as any,
          targetCompetency: r.competency_id || 'General',
          estimatedDuration: '45 mins',
          matchScore: r.priority === 'HIGH' ? 95 : 85,
          priority: r.priority,
        }));
      }
    } catch (e) {
      console.warn('Failed to fetch real recommendations:', e);
    }
    return [];
  },
};
