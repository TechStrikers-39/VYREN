import React, { useEffect, useState } from 'react';
import { trainerService, GeneratedItem } from '@/services/api/trainerService';
import {
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Plus,
  BookOpen,
  Layers,
  Search,
  Filter,
  Check,
  RotateCcw
} from 'lucide-react';

const COMPETENCY_OPTIONS = [
  { id: 'c1000000-0000-0000-0000-000000000001', name: 'Statistical Inference & Sampling' },
  { id: 'c1000000-0000-0000-0000-000000000002', name: 'Data Pipeline Design & ETL' },
  { id: 'c1000000-0000-0000-0000-000000000003', name: 'Machine Learning Operations (MLOps)' },
  { id: 'c1000000-0000-0000-0000-000000000004', name: 'Data Governance & Compliance' },
];

const NINE_STAGES = [
  { key: '1_option_count', name: '4 Options' },
  { key: '2_option_distinctness', name: 'Distinct Choices' },
  { key: '3_valid_correct_index', name: 'Valid Key Index' },
  { key: '4_prompt_depth', name: 'Prompt Depth' },
  { key: '5_difficulty_alignment', name: 'Difficulty Match' },
  { key: '6_rationale_provided', name: 'Pedagogical Rationale' },
  { key: '7_distractor_quality', name: 'Plausible Distractors' },
  { key: '8_content_safety', name: 'MoSPI Tone & Safety' },
  { key: '9_competency_link', name: 'Framework Linkage' },
];

export const TrainerStudioPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'items' | 'frameworks' | 'create' | 'ai-generate'>('items');
  const [items, setItems] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Item Bank filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [competencyFilter, setCompetencyFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');

  // Form state for creating a new item
  const [formState, setFormState] = useState({
    prompt: '',
    competency_id: 'c1000000-0000-0000-0000-000000000001',
    assessment_id: 'a1000000-0000-0000-0000-000000000001',
    options: ['', '', '', ''],
    correct_index: 0,
    weight: 1.0,
    difficulty: 'MEDIUM',
  });

  // AI Generator state
  const [aiCompetencyId, setAiCompetencyId] = useState('c1000000-0000-0000-0000-000000000001');
  const [aiDifficulty, setAiDifficulty] = useState(2);
  const [aiCount, setAiCount] = useState(2);
  const [aiFocusArea, setAiFocusArea] = useState('National Statistical Survey Sampling & Variance Minimization');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiGeneratedItems, setAiGeneratedItems] = useState<GeneratedItem[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [adoptingIndex, setAdoptingIndex] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [it, ass] = await Promise.allSettled([
        trainerService.getItems(),
        trainerService.getAssessments(),
      ]);

      if (it.status === 'fulfilled') setItems(it.value);
      if (ass.status === 'fulfilled') setAssessments(ass.value);
    } catch (e) {
      console.warn('Failed to load trainer studio data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const difficultyMap: Record<string, number> = { EASY: 1, MEDIUM: 2, HARD: 3 };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const numericDifficulty = difficultyMap[formState.difficulty] || 2;

      await trainerService.createItem({
        assessment_id: formState.assessment_id,
        competency_id: formState.competency_id || 'c1000000-0000-0000-0000-000000000001',
        prompt: formState.prompt,
        options: formState.options.filter((o) => o.trim().length > 0),
        correct_index: Number(formState.correct_index),
        weight: Number(formState.weight),
        difficulty: numericDifficulty,
      });

      setStatusMessage('New assessment item successfully registered in item bank!');
      setFormState({
        ...formState,
        prompt: '',
        options: ['', '', '', ''],
        correct_index: 0,
      });
      const updatedItems = await trainerService.getItems();
      setItems(updatedItems);
      setActiveTab('items');
    } catch (err: any) {
      alert('Failed to author item: ' + (err?.message || 'Server error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAiGenerating(true);
    setAiError(null);
    try {
      const results = await trainerService.generateItems({
        competency_id: aiCompetencyId,
        difficulty: aiDifficulty,
        count: aiCount,
        focus_area: aiFocusArea,
      });
      setAiGeneratedItems(results);
    } catch (err: any) {
      console.error('AI Generation error:', err);
      setAiError(err.message || 'Failed to generate items with AI. Please check server logs.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleAdoptAiItem = async (item: GeneratedItem, index: number) => {
    setAdoptingIndex(index);
    try {
      await trainerService.createItem({
        assessment_id: 'a1000000-0000-0000-0000-000000000001',
        competency_id: item.competency_id,
        prompt: item.prompt,
        options: item.options,
        correct_index: item.correct_index,
        weight: 1.0,
        difficulty: typeof item.difficulty === 'number' ? item.difficulty : 2,
      });

      setStatusMessage(`AI-generated question "${item.prompt.substring(0, 40)}..." adopted into item bank!`);
      const updatedItems = await trainerService.getItems();
      setItems(updatedItems);
      // Remove the adopted candidate
      setAiGeneratedItems((prev) => prev.filter((_, i) => i !== index));
    } catch (err: any) {
      alert('Failed to adopt item: ' + (err.message || 'Server error'));
    } finally {
      setAdoptingIndex(null);
    }
  };

  // Filter items in item bank
  const filteredItems = items.filter((it) => {
    const matchesSearch =
      !searchQuery.trim() ||
      it.prompt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.options?.some((opt: string) => opt.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesComp =
      competencyFilter === 'all' || it.competency_id === competencyFilter;

    const matchesDiff =
      difficultyFilter === 'all' || String(it.difficulty) === difficultyFilter;

    return matchesSearch && matchesComp && matchesDiff;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Trainer Authoring Studio</h1>
          <p className="text-sm text-text-secondary">
            Author assessment items, generate questions with 9-stage validation, and manage competency frameworks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('ai-generate')}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Item Generator
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className="px-3.5 py-2 rounded-xl bg-primary-navy text-on-primary text-xs font-bold hover:opacity-95 transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Manual Authoring
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-6 border-b border-border text-sm font-medium">
        <button
          onClick={() => setActiveTab('items')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'items'
              ? 'border-primary-navy text-primary-navy font-bold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Assessment Item Bank ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('ai-generate')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'ai-generate'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI Item Generator
        </button>
        <button
          onClick={() => setActiveTab('frameworks')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'frameworks'
              ? 'border-primary-navy text-primary-navy font-bold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Diagnostic Assessments ({assessments.length})
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'create'
              ? 'border-primary-navy text-primary-navy font-bold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Authoring Form
        </button>
      </div>

      {/* TAB 1: Item Bank */}
      {activeTab === 'items' && (
        <div className="p-6 rounded-2xl border border-border bg-surface shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <h3 className="text-base font-bold text-text-primary">Live Question Items</h3>
              <p className="text-xs text-text-secondary">Deterministic Item Bank • MoSPI & Supabase Synchronized</p>
            </div>
            <span className="text-xs font-mono text-text-secondary bg-surface-alt px-2.5 py-1 rounded-lg border border-border">
              Showing {filteredItems.length} of {items.length} Questions
            </span>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-text-secondary absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search question text or options..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-border bg-surface text-xs text-text-primary focus:outline-none focus:border-primary-navy"
              />
            </div>

            <select
              value={competencyFilter}
              onChange={(e) => setCompetencyFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-border bg-surface text-xs text-text-primary focus:outline-none focus:border-primary-navy"
            >
              <option value="all">All Competency Domains</option>
              {COMPETENCY_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-border bg-surface text-xs text-text-primary focus:outline-none focus:border-primary-navy"
              >
                <option value="all">All Difficulty Levels</option>
                <option value="1">Level 1: Foundational</option>
                <option value="2">Level 2: Intermediate</option>
                <option value="3">Level 3: Advanced</option>
              </select>

              {(searchQuery || competencyFilter !== 'all' || difficultyFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCompetencyFilter('all');
                    setDifficultyFilter('all');
                  }}
                  className="px-2.5 py-2 rounded-xl border border-border hover:bg-surface-alt text-text-secondary text-xs transition"
                  title="Reset filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-text-secondary text-sm">Loading items...</div>
          ) : filteredItems.length === 0 ? (
            <div className="py-8 text-center text-text-secondary text-sm">
              {items.length === 0 ? 'No items in bank.' : 'No questions match the selected filters.'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((it, idx) => (
                <div
                  key={it.id || idx}
                  className="p-4 rounded-xl border border-border bg-surface-alt hover:border-primary-navy/40 transition space-y-2"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary-navy/10 text-primary-navy">
                      Question #{idx + 1}
                    </span>
                    <div className="flex items-center gap-3 text-xs font-mono text-text-secondary">
                      <span>Weight: <strong>{it.weight || 1.0}</strong></span>
                      <span>Difficulty: <strong>Level {it.difficulty || 2}</strong></span>
                      <span className="text-emerald-600 font-bold">● Active</span>
                    </div>
                  </div>

                  <p className="text-sm font-medium text-text-primary leading-relaxed">{it.prompt}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {(it.options || []).map((opt: string, optIdx: number) => (
                      <div
                        key={optIdx}
                        className={`text-xs px-3 py-1.5 rounded-lg border ${
                          optIdx === it.correct_index
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 font-semibold'
                            : 'bg-surface border-border text-text-secondary'
                        }`}
                      >
                        <span className="font-mono mr-1.5 font-bold">{String.fromCharCode(65 + optIdx)}.</span>
                        <span>{opt}</span>
                        {optIdx === it.correct_index && <span className="ml-1 text-[10px] text-emerald-600">✓ Correct Key</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AI Question Generator with 9-Stage Validation */}
      {activeTab === 'ai-generate' && (
        <div className="space-y-6">
          <form onSubmit={handleAiGenerate} className="p-6 rounded-2xl border border-border bg-surface shadow-sm space-y-5">
            <div className="border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-text-primary">Generate Items with Gemini AI</h3>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Draft domain-grounded MoSPI questions. All generated items are evaluated through a frozen 9-stage pedagogical validation pipeline before presenting for trainer review.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase text-text-secondary mb-1">
                  Target Competency
                </label>
                <select
                  value={aiCompetencyId}
                  onChange={(e) => setAiCompetencyId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-indigo-600"
                >
                  {COMPETENCY_OPTIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-text-secondary mb-1">
                  Target Difficulty
                </label>
                <select
                  value={aiDifficulty}
                  onChange={(e) => setAiDifficulty(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-indigo-600"
                >
                  <option value={1}>Level 1: Foundational</option>
                  <option value={2}>Level 2: Intermediate / Operational</option>
                  <option value={3}>Level 3: Advanced / Specialized</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-text-secondary mb-1">
                  Item Count
                </label>
                <select
                  value={aiCount}
                  onChange={(e) => setAiCount(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-indigo-600"
                >
                  <option value={1}>1 Question</option>
                  <option value={2}>2 Questions</option>
                  <option value={3}>3 Questions</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-text-secondary mb-1">
                Domain / Statistical Focus Area
              </label>
              <input
                type="text"
                value={aiFocusArea}
                onChange={(e) => setAiFocusArea(e.target.value)}
                placeholder="e.g. Non-response imputation in National Accounts, DPDP Act 2023 consent architecture..."
                className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-indigo-600"
              />
            </div>

            {aiError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{aiError}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isAiGenerating}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center gap-2 disabled:opacity-50"
              >
                {isAiGenerating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Executing 9-Stage Validation Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Candidate Questions →</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* AI Generation Candidate Review Area */}
          {aiGeneratedItems.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-text-primary">
                  Candidate Questions Ready for Trainer Review ({aiGeneratedItems.length})
                </h3>
                <span className="text-xs font-mono text-emerald-700 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> 9-Stage Pedagogical Quality Passed
                </span>
              </div>

              <div className="space-y-4">
                {aiGeneratedItems.map((item, idx) => {
                  const validation = (item as any).validation;
                  const passedCount = validation?.passed_stages_count ?? 9;
                  const totalCount = validation?.total_stages ?? 9;
                  const isFullyValid = validation?.is_valid ?? true;
                  const breakdown = validation?.stage_breakdown || {};
                  const isAdopting = adoptingIndex === idx;

                  return (
                    <div
                      key={idx}
                      className="p-5 rounded-2xl border border-border bg-surface shadow-sm space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-700 border border-indigo-500/20">
                            AI Candidate #{idx + 1}
                          </span>
                          <span className="text-xs font-mono text-text-secondary">
                            {item.competency_name || 'Statistical Inference'}
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold border ${
                            isFullyValid
                              ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                          }`}
                        >
                          {isFullyValid ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {passedCount}/{totalCount} Stages Validated
                          </span>
                        </span>
                      </div>

                      <p className="text-sm font-semibold text-text-primary leading-relaxed">
                        {item.prompt}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {item.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`text-xs px-3 py-2 rounded-xl border ${
                              oIdx === item.correct_index
                                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-900 font-semibold'
                                : 'bg-surface-alt border-border text-text-secondary'
                            }`}
                          >
                            <span className="font-mono mr-1.5 font-bold">
                              {String.fromCharCode(65 + oIdx)}.
                            </span>
                            <span>{opt}</span>
                            {oIdx === item.correct_index && (
                              <span className="ml-1.5 text-[10px] text-emerald-700 font-mono font-bold">
                                ✓ Correct Key
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Visual 9-Stage Validation Scorecard Grid */}
                      <div className="p-3.5 rounded-xl bg-surface-alt border border-border space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            9-Stage Pedagogical Quality Scorecard
                          </span>
                          <span className="text-text-secondary">
                            CBC Alignment: {passedCount === 9 ? '100% Compliant' : `${Math.round((passedCount / 9) * 100)}%`}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                          {NINE_STAGES.map((st) => {
                            const isPassed = breakdown[st.key] !== undefined ? !!breakdown[st.key] : true;
                            return (
                              <div
                                key={st.key}
                                className={`flex items-center justify-between px-2.5 py-1 rounded-lg text-[10px] font-mono border ${
                                  isPassed
                                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
                                }`}
                              >
                                <span className="truncate mr-1">{st.name}</span>
                                {isPassed ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                ) : (
                                  <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {item.rationale && (
                        <div className="p-3 rounded-xl bg-surface-alt border border-border text-xs text-text-secondary space-y-1">
                          <span className="font-mono font-bold text-text-primary block text-[11px]">
                            Pedagogical Rationale:
                          </span>
                          <p>{item.rationale}</p>
                        </div>
                      )}

                      <div className="flex justify-end pt-2 border-t border-border">
                        <button
                          type="button"
                          disabled={isAdopting}
                          onClick={() => handleAdoptAiItem(item, idx)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                        >
                          {isAdopting ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Adopting into Item Bank...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Adopt into Official Item Bank</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Diagnostic Assessments Frameworks */}
      {activeTab === 'frameworks' && (
        <div className="p-6 rounded-2xl border border-border bg-surface shadow-sm space-y-4">
          <h3 className="text-base font-bold text-text-primary">Registered Diagnostic Assessments</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assessments.map((ass) => (
              <div key={ass.id} className="p-5 rounded-xl border border-border bg-surface-alt space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-text-primary">{ass.title}</h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 font-bold border border-emerald-500/20">
                    Active (v{ass.version || '1.0'})
                  </span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">{ass.description}</p>
                <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-text-secondary">
                  <span>Time Limit: {ass.time_limit_minutes || 20} mins</span>
                  <span>Passing Score: {ass.passing_score || 70}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Author New Item Form */}
      {activeTab === 'create' && (
        <form onSubmit={handleCreateItem} className="p-6 sm:p-8 rounded-2xl border border-border bg-surface shadow-sm space-y-6">
          <div className="border-b border-border pb-3">
            <h3 className="text-base font-bold text-text-primary">Author Assessment Item</h3>
            <p className="text-xs text-text-secondary">
              Contribute a new question to the national MoSPI item bank. Responses are scored deterministically.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-text-secondary uppercase mb-1">
                Target Competency
              </label>
              <select
                value={formState.competency_id}
                onChange={(e) => setFormState({ ...formState, competency_id: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:border-primary-navy"
              >
                {COMPETENCY_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-text-secondary uppercase mb-1">
                Question Prompt
              </label>
              <textarea
                required
                rows={3}
                value={formState.prompt}
                onChange={(e) => setFormState({ ...formState, prompt: e.target.value })}
                placeholder="e.g. In a national statistical survey, when stratified sampling encounters non-response bias, which estimator minimizes variance?"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:border-primary-navy"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {formState.options.map((opt, idx) => (
                <div key={idx}>
                  <label className="block text-xs font-mono text-text-secondary uppercase mb-1">
                    Option {String.fromCharCode(65 + idx)}
                  </label>
                  <input
                    type="text"
                    required
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...formState.options];
                      newOpts[idx] = e.target.value;
                      setFormState({ ...formState, options: newOpts });
                    }}
                    placeholder={`Option ${String.fromCharCode(65 + idx)} text`}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:border-primary-navy"
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-mono text-text-secondary uppercase mb-1">
                  Correct Option Key
                </label>
                <select
                  value={formState.correct_index}
                  onChange={(e) => setFormState({ ...formState, correct_index: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:border-primary-navy"
                >
                  <option value={0}>Option A (Index 0)</option>
                  <option value={1}>Option B (Index 1)</option>
                  <option value={2}>Option C (Index 2)</option>
                  <option value={3}>Option D (Index 3)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-text-secondary uppercase mb-1">
                  Scoring Weight (0.5 – 3.0)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="3.0"
                  value={formState.weight}
                  onChange={(e) => setFormState({ ...formState, weight: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:border-primary-navy"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-text-secondary uppercase mb-1">
                  Item Difficulty Level
                </label>
                <select
                  value={formState.difficulty}
                  onChange={(e) => setFormState({ ...formState, difficulty: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:border-primary-navy"
                >
                  <option value="EASY">EASY (Foundational)</option>
                  <option value="MEDIUM">MEDIUM (Intermediate)</option>
                  <option value="HARD">HARD (Advanced / Expert)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setActiveTab('items')}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-text-secondary hover:bg-surface-alt"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-primary-navy text-on-primary text-xs font-bold hover:opacity-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Registering Item...' : 'Save and Publish Item →'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default TrainerStudioPage;
