import { apiClient } from '../apiClient';
import { APP_CONFIG } from '@/config/appConfig';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  organization: string;
  department: string;
  designation: string;
  competency_index: number;
}

export interface AdminAnalytics {
  total_learners: number;
  avg_competency_index: number;
  gap_distribution: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  active_assessments_count: number;
  active_courses_count: number;
}

export interface SystemStatus {
  status: string;
  service: string;
  environment: string;
  database: {
    status: string;
    connected: boolean;
    latency_ms: number;
  };
  timestamp: string;
}

export interface TrainingEffectivenessItem {
  course_id: string;
  title: string;
  category: string;
  level: string;
  enrolled_count: number;
  completed_count: number;
  completion_rate: number;
  avg_progress: number;
}

export interface TrainingEffectivenessResponse {
  total_courses: number;
  total_enrollments: number;
  programs: TrainingEffectivenessItem[];
}

export const adminService = {
  async getUsers(): Promise<AdminUser[]> {
    return apiClient<AdminUser[]>('/admin/users');
  },

  async getAnalytics(): Promise<AdminAnalytics> {
    return apiClient<AdminAnalytics>('/admin/analytics');
  },

  async getTrainingEffectiveness(): Promise<TrainingEffectivenessResponse> {
    return apiClient<TrainingEffectivenessResponse>('/admin/training-effectiveness');
  },

  async getSystemStatus(): Promise<SystemStatus> {
    return apiClient<SystemStatus>('/system/status');
  },

  async exportWorkforceMatrixCsv(): Promise<string> {
    const token = localStorage.getItem(APP_CONFIG.tokenKey);
    const response = await fetch(`${APP_CONFIG.apiBaseUrl}/admin/export/workforce-matrix`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to export CSV: ${response.statusText}`);
    }
    return response.text();
  },
};
