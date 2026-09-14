import React, { useState, useEffect, useRef } from 'react';
import AIMessageBubble from '@/components/assistant/AIMessageBubble';
import { assistantService, ChatMessage, AIStatus } from '@/services/api/assistantService';
import { competencyService } from '@/services/api/competencyService';
import { CompetencyScore, SkillGap } from '@/types';
import { IntegrationModeBadge } from '@/components/ui/IntegrationModeBadge';
import { Bot, Sparkles, Send, Lightbulb, Info, ShieldCheck } from 'lucide-react';

const MOSPI_SUGGESTIONS = [
  "Explain my Statistical Inference score",
  "What is causing my highest-priority skill gap?",
  "What should I learn next on iGOT?",
  "What does DPDP Act 2023 require for our survey microdata?",
  "Show my overall competency breakdown",
];

export const AssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'ai',
      text: "Hello! I am your VYREN Competency Intelligence Assistant, calibrated against the Capacity Building Commission (CBC) framework. I am synchronized with your active diagnostic scores, skill gap measurements, and official MoSPI cadre requirements. How may I assist your professional development today?",
      timestamp: '10:00 AM',
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [scores, setScores] = useState<CompetencyScore[]>([]);
  const [gaps, setGaps] = useState<SkillGap[]>([]);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    competencyService.getScores().then(setScores).catch(() => []);
    competencyService.getSkillGaps().then(setGaps).catch(() => []);
    assistantService.getAIStatus().then(setAiStatus).catch(() => null);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsTyping(true);

    try {
      const aiReply = await assistantService.sendMessage(query, scores, gaps);
      setMessages(prev => [...prev, aiReply]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'ai',
          text: "I encountered a transient processing error connecting to the intelligence engine. Please try your question again.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-navy/10 text-primary-navy flex items-center justify-center shrink-0 mt-0.5">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">VYREN Competency Assistant</h1>
            <p className="text-sm text-text-secondary">Context-aware AI tutor grounded in your live MoSPI competency matrix.</p>
          </div>
        </div>
        {aiStatus && (
          <IntegrationModeBadge
            serviceName="Gemini AI"
            mode={aiStatus.mode}
            isReal={aiStatus.is_real}
            providerName={aiStatus.provider}
            blockerSummary={aiStatus.blocker_summary}
            blockerDetails={aiStatus.blocker_details}
          />
        )}
      </div>

      {aiStatus && !aiStatus.is_real && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Grounded Local Tutor Mode:</strong> {aiStatus.blocker_summary || 'GEMINI_API_KEY is not configured in backend environment.'} Guidance is powered by deterministic competency context injection.
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300 shrink-0 bg-amber-500/20 px-2 py-0.5 rounded">
            {aiStatus.model_name}
          </span>
        </div>
      )}

      {/* Chat Workspace */}
      <div className="p-6 rounded-2xl border border-border bg-surface shadow-sm flex flex-col h-[560px]">
        {/* Messages list */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map(msg => (
            <AIMessageBubble key={msg.id} message={msg.text} isUser={msg.sender === 'user'} />
          ))}
          {isTyping && (
            <div className="flex items-center gap-3 text-xs font-mono text-text-secondary pl-2 py-2">
              <div className="flex items-center gap-1 bg-surface-alt px-3 py-2 rounded-xl border border-border">
                <span className="w-2 h-2 rounded-full bg-primary-navy animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-primary-navy animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-primary-navy animate-bounce" />
                <span className="ml-2 text-[11px]">VYREN AI is evaluating...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Suggestion Chips */}
        <div className="py-3 border-t border-border flex flex-wrap gap-2">
          {MOSPI_SUGGESTIONS.map(sug => (
            <button
              key={sug}
              onClick={() => handleSend(sug)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-alt border border-border text-xs font-mono text-text-secondary hover:border-primary-navy hover:text-primary-navy hover:bg-surface transition-colors text-left"
            >
              <Lightbulb className="w-3 h-3 text-amber-500 shrink-0" />
              <span>{sug}</span>
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-3 pt-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask about your skill gaps, course recommendations, or MoSPI statistical concepts..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:border-primary-navy"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isTyping}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-navy text-on-primary font-medium text-sm hover:opacity-95 transition-opacity disabled:opacity-50"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AssistantPage;
