import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { assistantService, ChatMessage, AIStatus } from '@/services/api/assistantService';
import { competencyService } from '@/services/api/competencyService';
import { learnerService } from '@/services/api/learnerService';
import { recommendationService } from '@/services/api/recommendationService';
import { useTranslation } from '@/i18n';
import { CompetencyScore, SkillGap, Recommendation, LearningPathData } from '@/types';
import { IntegrationModeBadge } from '@/components/ui/IntegrationModeBadge';
import { ROUTES } from '@/constants/routes';
import {
  ShieldCheck,
  Send,
  Lightbulb,
  Info,
  Compass,
  TrendingUp,
  BookOpen,
  Award,
  AlertCircle,
  RotateCcw,
  Layers,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';

export const AssistantPage: React.FC = () => {
  const { t, locale } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'ai',
      text: "Welcome to the VYREN Competency Assistant. I am calibrated against the National Statistical Systems Training Academy (NSSTA) and Capacity Building Commission (CBC) competency frameworks. My responses are strictly grounded in your verified assessment records, active cadre skill gaps, and assigned iGOT Karmayogi learning modules.\n\nInquire below regarding your measured competency state, why specific modules were recommended, or statistical methodologies relevant to your cadre.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      provider: 'google-gemini',
      integration_mode: 'LIVE',
      model_name: 'gemini-3.8-flash',
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [scores, setScores] = useState<CompetencyScore[]>([]);
  const [gaps, setGaps] = useState<SkillGap[]>([]);
  const [learningPath, setLearningPath] = useState<LearningPathData | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [lastFailedQuery, setLastFailedQuery] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;

    competencyService.getScores()
      .then((data) => { if (isMounted) setScores(data); })
      .catch(() => []);

    competencyService.getSkillGaps()
      .then((data) => { if (isMounted) setGaps(data); })
      .catch(() => []);

    learnerService.getLearningPath()
      .then((data) => { if (isMounted) setLearningPath(data); })
      .catch(() => null);

    recommendationService.getRecommendations()
      .then((data) => { if (isMounted) setRecommendations(data); })
      .catch(() => []);

    assistantService.getAIStatus()
      .then((data) => { if (isMounted) setAiStatus(data); })
      .catch(() => null);

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Derive primary context items
  const activeGaps = gaps.filter((g) => {
    const p = String(g.priority).toUpperCase();
    return p === 'HIGH' || p === 'MEDIUM' || (g.gapSize && g.gapSize > 0);
  });

  const topGap = activeGaps.length > 0 ? activeGaps[0] : gaps[0] || null;
  const primaryScore = scores.find((s) => topGap && s.competencyId === topGap.competencyId) || scores[0] || null;

  const measuredLevel = topGap?.currentLevel ?? primaryScore?.measuredLevel ?? 1;
  const requiredLevel = topGap?.requiredLevel ?? 3;
  const gapSize = topGap?.gapSize ?? Math.max(0, requiredLevel - measuredLevel);
  const priority = topGap?.priority ? String(topGap.priority).toUpperCase() : 'NONE';

  const currentModuleTitle =
    gapSize === 0
      ? 'No Active Remedial Modules Required (Benchmark Satisfied)'
      : (learningPath?.steps?.find((s) => s.status === 'in_progress' || s.status === 'recommended')?.title ||
        recommendations[0]?.title ||
        'Statistical Inference Fundamentals (iGOT)');

  // Dynamic context-aware suggested questions (max 4)
  const suggestedQuestions: string[] = [];
  if (topGap && gapSize > 0) {
    suggestedQuestions.push(`Why is ${topGap.competencyName} flagged as my priority skill gap?`);
    suggestedQuestions.push(`What learning modules address my ${topGap.competencyName} gap?`);
  } else {
    suggestedQuestions.push("Explain how my recent assessment closed my skill gaps.");
    suggestedQuestions.push("What advanced learning modules should I pursue next?");
  }
  suggestedQuestions.push("How do my measured scores map to MoSPI cadre requirements?");
  suggestedQuestions.push("Explain the statistical inference principles evaluated in my assessment.");

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isTyping) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setLastFailedQuery(null);
    setIsTyping(true);

    try {
      const aiReply = await assistantService.sendMessage(query, scores, gaps, locale);
      let replyText = aiReply.text;
      if (gapSize === 0) {
        // Presentation grounding guard: if gapSize is 0, affirm benchmarks are met
        const lowerReply = replyText.toLowerCase();
        const lowerQuery = query.toLowerCase();
        if (
          lowerQuery.includes('gap') ||
          lowerQuery.includes('assessment') ||
          lowerQuery.includes('score') ||
          lowerQuery.includes('result') ||
          lowerQuery.includes('closed') ||
          (lowerReply.includes('skill gap') && !lowerReply.includes('no active') && !lowerReply.includes('benchmark'))
        ) {
          replyText = `Your measured competency state currently meets or exceeds the required cadre benchmark (Level ${measuredLevel} verified vs. Level ${requiredLevel} required) across all evaluated domains. You have no active remedial skill gaps recorded in your VYREN dossier. You may proceed with advanced reinforcement modules or schedule an executive re-assessment.\n\n${replyText}`;
        }
      }
      setMessages((prev) => [...prev, { ...aiReply, text: replyText }]);
    } catch (err) {
      console.error('Assistant response generation error:', err);
      setLastFailedQuery(query);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'ai',
          text: "I could not generate a response from the intelligence engine due to a transient connection failure. Your current competency and gap records remain securely saved. Please retry your inquiry.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          provider: 'VYREN Gateway Exception',
          integration_mode: 'ERROR / RETRY REQUIRED',
        },
      ]);
    } finally {
      setIsTyping(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleResetConversation = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        sender: 'ai',
        text: "Conversation reset. I am synchronized with your active MoSPI competency records and ready for your next inquiry.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: 'google-gemini',
        integration_mode: 'LIVE',
        model_name: 'gemini-3.8-flash',
      },
    ]);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* ========================================================================= */}
      {/* PAGE HEADER: Institutional Title & Engine Status                          */}
      {/* ========================================================================= */}
      <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-wider text-primary-navy">
            <ShieldCheck className="w-3.5 h-3.5 text-action-blue" />
            <span>NSSTA &bull; CAPACITY BUILDING COMMISSION ALIGNED</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">
            {t('assistant.title')}
          </h1>
          <p className="text-xs text-text-secondary leading-relaxed">
            {t('assistant.subtitle')}
          </p>
        </div>

        {aiStatus && (
          <div className="shrink-0">
            <IntegrationModeBadge
              serviceName="Gemini AI"
              mode={aiStatus.mode}
              isReal={aiStatus.is_real}
              providerName={aiStatus.provider}
              blockerSummary={aiStatus.blocker_summary}
              blockerDetails={aiStatus.blocker_details}
            />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 01 — COMPETENCY CONTEXT (Compact Context Strip)                           */}
      {/* ========================================================================= */}
      <section className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary font-bold">
              01 &mdash; CURRENT EVALUATED CONTEXT
            </span>
            <span className="inline-block w-1 h-1 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-mono text-emerald-700 font-semibold">Active Session Trace</span>
          </div>
          <span className="text-[11px] font-mono text-text-secondary">
            Role: <strong>Assistant Director (MoSPI)</strong>
          </span>
        </div>

        {/* Compact Metadata 5-Column Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-surface-alt border border-border">
            <span className="text-[10px] text-text-secondary uppercase block font-medium">Competency Focus</span>
            <strong className="text-text-primary text-xs truncate block mt-0.5" title={topGap?.competencyName || 'Statistical Inference'}>
              {topGap?.competencyName || 'Statistical Inference'}
            </strong>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-alt border border-border">
            <span className="text-[10px] text-text-secondary uppercase block font-medium">Measured State</span>
            <strong className="text-primary-navy text-xs block mt-0.5">
              Level {measuredLevel}
            </strong>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-alt border border-border">
            <span className="text-[10px] text-text-secondary uppercase block font-medium">Cadre Benchmark</span>
            <strong className="text-text-primary text-xs block mt-0.5">
              Level {requiredLevel}
            </strong>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-alt border border-border">
            <span className="text-[10px] text-text-secondary uppercase block font-medium">Identified Delta</span>
            <strong className="text-xs block mt-0.5">
              {gapSize > 0 ? (
                <span className="text-amber-700">-{gapSize} Level{gapSize > 1 ? 's' : ''} ({priority})</span>
              ) : (
                <span className="text-emerald-700">0 (Benchmark Met)</span>
              )}
            </strong>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-alt border border-border col-span-2 sm:col-span-1">
            <span className="text-[10px] text-text-secondary uppercase block font-medium">Assigned Learning</span>
            <strong className="text-text-primary text-xs truncate block mt-0.5" title={currentModuleTitle}>
              {currentModuleTitle}
            </strong>
          </div>
        </div>

        {/* Local Rule-Engine Note if applicable */}
        {aiStatus && !aiStatus.is_real && (
          <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200/70 text-blue-900 flex items-center justify-between gap-2 text-[11px] font-mono">
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-action-blue shrink-0" />
              <span>
                <strong>Deterministic Mode:</strong> Explanations are driven by direct injection of your active assessment data and official MoSPI syllabi.
              </span>
            </div>
            <span className="text-[10px] uppercase font-bold text-blue-700 shrink-0 bg-blue-100 px-2 py-0.5 rounded">
              {aiStatus.model_name}
            </span>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 02 — CONVERSATION AREA (Visual Focal Point)                               */}
      {/* ========================================================================= */}
      <section className="bg-surface border border-border rounded-2xl shadow-xs overflow-hidden flex flex-col h-[580px]">
        {/* Chat Control Toolbar */}
        <div className="px-5 py-3 border-b border-border bg-surface-alt flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary font-bold">
              02 &mdash; CONVERSATION LOG
            </span>
            <span className="text-text-secondary/50">&bull;</span>
            <span className="text-[11px] text-text-secondary font-mono">
              {messages.length} Interaction{messages.length === 1 ? '' : 's'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleResetConversation}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-surface hover:bg-surface-alt text-[11px] font-mono text-text-secondary hover:text-text-primary transition shadow-2xs"
            title="Reset conversation state"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Log</span>
          </button>
        </div>

        {/* Messages Scroll Area */}
        <div
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5"
          role="log"
          aria-live="polite"
          aria-label="Assistant Conversation History"
        >
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';

            return (
              <div
                key={msg.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl rounded-2xl p-4 sm:p-5 text-sm leading-relaxed transition-all ${
                    isUser
                      ? 'bg-primary-navy text-on-primary rounded-tr-xs shadow-xs'
                      : 'bg-surface border border-border text-text-primary rounded-tl-xs shadow-2xs space-y-3'
                  }`}
                >
                  {/* Message Sender Header */}
                  <div
                    className={`flex items-center justify-between gap-3 text-[11px] font-mono pb-2 border-b ${
                      isUser
                        ? 'border-on-primary/20 text-on-primary/80'
                        : 'border-border/80 text-text-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                      {!isUser ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-action-blue" />
                          <span>VYREN Intelligence</span>
                        </>
                      ) : (
                        <span>Learner</span>
                      )}
                    </div>
                    <span className="text-[10px]">{msg.timestamp}</span>
                  </div>

                  {/* Message Body Content */}
                  <div className={`space-y-2.5 text-xs sm:text-sm whitespace-pre-line leading-relaxed ${isUser ? 'text-on-primary' : 'text-text-primary'}`}>
                    {msg.text}
                  </div>

                  {/* 03 — GROUNDED EVIDENCE / PROVENANCE (For AI Messages) */}
                  {!isUser && (msg.provider || msg.integration_mode) && (
                    <div className="pt-2 border-t border-border/80 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-text-secondary bg-surface-alt/70 p-2.5 rounded-xl border border-border">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-primary-navy uppercase tracking-wider">Provenance:</span>
                        <span className="text-text-primary truncate max-w-xs">{msg.provider || 'MoSPI Cadre Baseline'}</span>
                      </div>
                      {msg.model_name && (
                        <span className="text-text-secondary">Engine: {msg.model_name}</span>
                      )}
                    </div>
                  )}

                  {/* Action Link shortcuts if relevant to the response */}
                  {!isUser && (
                    <div className="pt-1 flex flex-wrap gap-2 text-[11px] font-mono">
                      <Link
                        to={ROUTES.LEARNER.LEARNING_PATH}
                        className="inline-flex items-center gap-1 text-action-blue hover:underline"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>View Learning Path</span>
                      </Link>
                      <span className="text-border">&bull;</span>
                      <Link
                        to={ROUTES.LEARNER.ASSESSMENT('asm-001')}
                        className="inline-flex items-center gap-1 text-action-blue hover:underline"
                      >
                        <Award className="w-3 h-3" />
                        <span>View Assessment</span>
                      </Link>
                      <span className="text-border">&bull;</span>
                      <Link
                        to={ROUTES.LEARNER.DASHBOARD}
                        className="inline-flex items-center gap-1 text-action-blue hover:underline"
                      >
                        <TrendingUp className="w-3 h-3" />
                        <span>Dashboard Analytics</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Evaluating State */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-surface border border-border rounded-2xl rounded-tl-xs p-4 shadow-2xs space-y-2 max-w-md">
                <div className="flex items-center gap-2 text-xs font-mono text-primary-navy font-bold">
                  <div className="w-2 h-2 rounded-full bg-action-blue animate-ping" />
                  <span>Analyzing learner context...</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-text-secondary">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-navy animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-navy animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-navy animate-bounce" />
                  <span className="ml-1">Synthesizing MoSPI competency records &amp; learning syllabus...</span>
                </div>
              </div>
            </div>
          )}

          {/* Transient Error Retry Box */}
          {lastFailedQuery && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Engine query failed. You can re-attempt your last inquiry.</span>
              </div>
              <button
                type="button"
                onClick={() => handleSend(lastFailedQuery)}
                className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition"
              >
                Retry Query
              </button>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* ======================================================================= */}
        {/* 04 — SUGGESTED NEXT ACTIONS & GROUNDED PROMPT CHIPS                     */}
        {/* ======================================================================= */}
        <div className="border-t border-border bg-surface-alt/60 p-3 sm:px-5 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-text-secondary">
            <span className="uppercase tracking-wider font-bold">
              04 &mdash; GROUNDED CONTEXT QUESTIONS (MAX 4)
            </span>
            <span>Click any prompt to submit</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((sug, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isTyping}
                onClick={() => handleSend(sug)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-mono text-text-secondary hover:border-primary-navy hover:text-primary-navy transition-colors text-left shadow-2xs disabled:opacity-50"
              >
                <Lightbulb className="w-3 h-3 text-amber-500 shrink-0" />
                <span>{sug}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input Form Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 sm:p-4 border-t border-border bg-surface flex items-center gap-3"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isTyping}
            placeholder={t('assistant.inputPlaceholder')}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-surface text-xs sm:text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy transition"
            aria-label="Ask VYREN Competency Assistant"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isTyping}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-navy hover:bg-primary-navy/90 text-on-primary font-bold text-xs sm:text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs shrink-0"
            aria-label="Send message"
          >
            <span>{t('assistant.sendBtn')}</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </section>

      {/* ========================================================================= */}
      {/* 03 — GROUNDED EVIDENCE (Institutional Traceability Strip)                 */}
      {/* ========================================================================= */}
      <section className="p-4 rounded-2xl bg-surface-alt border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono text-text-secondary">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <span className="font-bold text-text-primary block">
              Response Grounding &amp; Provenance
            </span>
            <span className="text-[11px]">
              Responses are grounded in available VYREN competency records and connected learning sources.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to={ROUTES.LEARNER.DASHBOARD}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border hover:border-primary-navy text-text-primary text-xs font-semibold transition shadow-2xs"
          >
            <Layers className="w-3.5 h-3.5 text-primary-navy" />
            <span>View Cadre Matrix</span>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default AssistantPage;
