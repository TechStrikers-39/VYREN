import { apiClient } from '../apiClient';

export interface TrainerCohortStats {
  total_cohort_size: number;
  avg_score: number;
  high_priority_gaps_count: number;
  top_gap_competency: string;
}

export interface LearnerCohortItem {
  id: string;
  name: string;
  email: string;
  designation?: string;
  department?: string;
  organization?: string;
  competency_index: number;
  highest_gap_competency?: string;
  highest_gap_size?: number;
  onboarding_completed: boolean;
}

export interface GeneratedItem {
  prompt: string;
  options: string[];
  correct_index: number;
  rationale: string;
  difficulty: number;
  competency_id: string;
  competency_name: string;
  validation_passed: boolean;
  validation_details: Record<string, boolean>;
}

export interface ItemGenerateRequest {
  competency_id: string;
  difficulty?: number;
  count?: number;
  focus_area?: string;
}

export interface AssessmentItemPayload {
  assessment_id: string;
  competency_id: string;
  prompt: string;
  options: string[];
  correct_index: number;
  weight?: number;
  difficulty?: number;
  order_index?: number;
}

export const trainerService = {
  async getCohort(): Promise<TrainerCohortStats> {
    return apiClient<TrainerCohortStats>('/trainer/cohort');
  },

  async getLearners(): Promise<LearnerCohortItem[]> {
    return apiClient<LearnerCohortItem[]>('/trainer/learners');
  },

  async generateItems(req: ItemGenerateRequest): Promise<GeneratedItem[]> {
    return apiClient<GeneratedItem[]>('/trainer/generate-items', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  async getItems(competencyId?: string): Promise<any[]> {
    const q = competencyId ? `?competency_id=${competencyId}` : '';
    return apiClient<any[]>(`/trainer/items${q}`);
  },

  async createItem(data: AssessmentItemPayload): Promise<any> {
    return apiClient<any>('/trainer/items', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getAssessments(): Promise<any[]> {
    return apiClient<any[]>('/trainer/assessments');
  },
};
