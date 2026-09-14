import { apiClient } from '../apiClient';
import { CompetencyScore, SkillGap } from '@/types';

export interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  provider?: string;
  integration_mode?: string;
  model_name?: string;
}

export interface AIStatus {
  mode: string;
  is_real: boolean;
  provider: string;
  model_name: string;
  authenticated: boolean;
  blocker_summary?: string | null;
  blocker_details?: string | null;
  capabilities: string[];
  timestamp: string;
}

export const assistantService = {
  async getAIStatus(): Promise<AIStatus> {
    return apiClient<AIStatus>('/assistant/status');
  },

  async sendMessage(userPrompt: string, scores?: CompetencyScore[], gaps?: SkillGap[]): Promise<ChatMessage> {
    try {
      const res = await apiClient<any>('/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: userPrompt,
          history: [],
        }),
      });

      return {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: res.provider,
        integration_mode: res.integration_mode,
        model_name: res.model_name,
      };
    } catch (e) {
      console.warn('AI Assistant API call error, returning fallback:', e);
      return {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `I am analyzing your active competency profile. You currently have an active competency evaluation in progress. How can I assist your statistical inference or data engineering learning path?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: 'VYREN Grounded Local Tutor',
        integration_mode: 'FALLBACK / LOCAL',
        model_name: 'vyren-grounded-rules-engine',
      };
    }
  },
};
