import { apiClient } from '../apiClient';

export interface IgotCourse {
  id: string;
  do_id?: string;
  external_id?: string;
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

/**
 * Robustly constructs the canonical public Karmayogi Bharat course overview URL.
 * Automatically avoids obsolete internal '/app/toc/' SPA routes that return 404.
 */
export const getIgotCourseUrl = (c: Partial<IgotCourse>): string => {
  // 1. Extract pure Sunbird DO_ID if available
  const rawId = c.do_id || c.external_id || '';
  const match = rawId.match(/(do_[0-9]+)/i);
  const doId = match ? match[1] : (rawId.startsWith('do_') ? rawId.trim() : null);

  if (doId) {
    // Canonical public TOC route on Karmayogi Bharat portal (works reliably for public anonymous & authenticated learners)
    return `https://portal.igotkarmayogi.gov.in/public/toc/${doId}/overview`;
  }

  // 2. If external_url is already provided, sanitize obsolete /app/toc/ and domain
  if (c.external_url && c.external_url.trim()) {
    let url = c.external_url.trim();
    if (url.includes('/app/toc/')) {
      url = url.replace('/app/toc/', '/public/toc/');
    }
    if (url.includes('https://igotkarmayogi.gov.in/public/toc/')) {
      url = url.replace('https://igotkarmayogi.gov.in/public/toc/', 'https://portal.igotkarmayogi.gov.in/public/toc/');
    }
    const urlMatch = url.match(/(do_[0-9]+)/i);
    if (urlMatch) {
      return `https://portal.igotkarmayogi.gov.in/public/toc/${urlMatch[1]}/overview`;
    }
    return url;
  }

  // 3. Graceful fallback: search course title on official iGOT Karmayogi explore portal
  if (c.title && c.title.trim()) {
    return `https://portal.igotkarmayogi.gov.in/page/explore?query=${encodeURIComponent(c.title.trim())}`;
  }

  // 4. Default portal explore URL
  return 'https://portal.igotkarmayogi.gov.in/page/explore';
};

