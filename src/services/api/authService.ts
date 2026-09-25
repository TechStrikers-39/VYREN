import { apiClient } from '../apiClient';
import { APP_CONFIG } from '@/config/appConfig';
import { User } from '@/types';

function mapUser(u: any): User {
  return {
    id: u.id,
    email: u.email,
    name: u.full_name || u.email?.split('@')[0] || 'User',
    role: u.role,
    organization: u.organization,
    department: u.department,
    designation: u.designation,
    avatarUrl: u.avatar_url,
    responsibilities: u.responsibilities,
    toolsExperience: u.tools_experience,
    selfReportedLevel: u.self_reported_level,
    targetCompetencies: u.target_competencies,
    onboardingCompleted: u.onboarding_completed ?? false,
  };
}

export interface DemoStatusResponse {
  is_demo: boolean;
  has_existing_session: boolean;
  onboarding_completed: boolean;
  assessment_exists: boolean;
}

export const authService = {
  async getCurrentUser(): Promise<User> {
    const res = await apiClient<any>('/auth/me');
    return mapUser(res);
  },

  async login(email: string, password?: string): Promise<{ user: User; token: string }> {
    const pass = password || 'SecurePassword123!';
    const res = await apiClient<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass }),
    });

    if (res.access_token) {
      localStorage.setItem(APP_CONFIG.tokenKey, res.access_token);
    }

    return {
      token: res.access_token,
      user: mapUser(res.user),
    };
  },

  async register(data: {
    email: string;
    password?: string;
    fullName?: string;
    role?: 'learner' | 'trainer' | 'admin';
    organization?: string;
    department?: string;
    designation?: string;
  }): Promise<{ user: User; token: string }> {
    const pass = data.password || 'SecurePassword123!';
    const res = await apiClient<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: data.email,
        password: pass,
        full_name: data.fullName,
        role: data.role || 'learner',
        organization: data.organization,
        department: data.department,
        designation: data.designation,
      }),
    });

    if (res.access_token) {
      localStorage.setItem(APP_CONFIG.tokenKey, res.access_token);
    }

    return {
      token: res.access_token,
      user: mapUser(res.user),
    };
  },

  async getGoogleAuthUrl(): Promise<string> {
    const res = await apiClient<{ url: string }>('/auth/google/url');
    return res.url;
  },

  async submitOnboarding(data: {
    department?: string;
    designation?: string;
    responsibilities?: string;
    tools_experience?: string[];
    self_reported_level?: number;
    target_competencies?: string[];
  }): Promise<User> {
    const res = await apiClient<any>('/learner/onboarding', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return mapUser(res);
  },

  async getDemoStatus(): Promise<DemoStatusResponse> {
    return apiClient<DemoStatusResponse>('/learner/demo-status');
  },

  async resetDemoLearner(): Promise<{ status: string; onboarding_completed: boolean }> {
    const res = await apiClient<any>('/learner/demo-reset', {
      method: 'POST',
    });
    return res;
  },

  async logout(): Promise<void> {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore logout network errors
    } finally {
      localStorage.removeItem(APP_CONFIG.tokenKey);
    }
  },
};

