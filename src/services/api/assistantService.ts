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
  configured?: boolean;
  live_test?: string;
  thinking_config?: string;
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
        integration_mode: res.integration_mode || res.mode,
        model_name: res.model_name,
      };
    } catch (e: any) {
      console.warn('AI Assistant API call error:', e);
      const errMsg = e?.message || e?.detail?.message || "Gemini AI is currently unavailable. Please verify the AI provider configuration.";
      return {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: typeof errMsg === 'string' ? errMsg : "Gemini AI is currently unavailable. Please verify the AI provider configuration.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: 'google-gemini',
        integration_mode: 'AI_PROVIDER_UNAVAILABLE',
        model_name: 'gemini-3.8-flash',
      };
    }
  },
};
