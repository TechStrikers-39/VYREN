import { apiClient } from '../apiClient';

export interface IgotCourse {
  id: string;
  do_id?: string;
  title: string;
  description: string;
  provider: string;
  source: string;
  duration: string;
  competency_area?: string;
  competency_id?: string;
  external_url?: string;
  app_url?: string;
  is_verified?: boolean;
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

export interface KarmayogiPassport {
  passport_id: string;
  user_id: string;
  user_name: string;
  designation: string;
  organization: string;
  issued_at: string;
  issuer: {
    name: string;
    authority: string;
    framework: string;
  };
  provider_mode: string;
  claims: Array<{
    competency_id: string;
    competency_name: string;
    score: number;
    measured_level: number;
    confidence: number;
    status: string;
  }>;
}

export const igotService = {
  async searchCourses(query: string = ''): Promise<IgotCourse[]> {
    const q = encodeURIComponent(query.trim());
    return apiClient<IgotCourse[]>(`/igot/search?query=${q}`);
  },

  async getCourses(competencyArea?: string): Promise<IgotCourse[]> {
    const q = competencyArea ? `?competency_area=${encodeURIComponent(competencyArea)}` : '';
    return apiClient<IgotCourse[]>(`/igot/courses${q}`);
  },

  async getStatus(): Promise<IgotStatus> {
    return apiClient<IgotStatus>('/igot/status');
  },

  async getPassport(): Promise<KarmayogiPassport> {
    return apiClient<KarmayogiPassport>('/igot/passport');
  },
};
