import { apiClient } from '../apiClient';
import { LearningPathData } from '@/types';

export interface LearnerProfile {
  id: string;
  email: string;
  full_name: string;
  organization: string;
  department: string;
  designation: string;
  role: string;
  created_at?: string;
}

export interface UpdateProfileRequest {
  full_name?: string;
  organization?: string;
  department?: string;
  designation?: string;
}

export interface IgotStatus {
  mode: string;
  is_real: boolean;
  provider: string;
  endpoint?: string | null;
  authenticated: boolean;
  blocker_summary?: string | null;
  blocker_details?: string | null;
  capabilities: string[];
  timestamp: string;
}

export const learnerService = {
  async getProfile(): Promise<LearnerProfile> {
    return apiClient<LearnerProfile>('/learner/profile');
  },

  async updateProfile(data: UpdateProfileRequest): Promise<LearnerProfile> {
    return apiClient<LearnerProfile>('/learner/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getIgotStatus(): Promise<IgotStatus> {
    return apiClient<IgotStatus>('/igot/status');
  },

  async getIgotPassport(): Promise<any> {
    return apiClient<any>('/igot/passport');
  },

  async getIgotFracMapping(): Promise<any[]> {
    return apiClient<any[]>('/igot/frac-mapping');
  },

  async getLearningPath(): Promise<LearningPathData> {
    return apiClient<LearningPathData>('/learner/learning-path');
  },
};

