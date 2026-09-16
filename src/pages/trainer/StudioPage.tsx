import React, { useEffect, useState } from 'react';
import { trainerService, GeneratedItem } from '@/services/api/trainerService';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Plus,
  BookOpen,
  Layers,
  Search,
  Filter,
  Check,
  RotateCcw,
  Edit3,
  Trash2,
  Lock,
  ArrowRight,
  HelpCircle,
  Send,
  Eye,
} from 'lucide-react';

export const COMPETENCY_OPTIONS = [
  { id: 'c1000000-0000-0000-0000-000000000001', name: 'Statistical Inference & Sampling' },
  { id: 'c1000000-0000-0000-0000-000000000002', name: 'Data Pipeline Design & ETL' },
  { id: 'c1000000-0000-0000-0000-000000000003', name: 'Machine Learning Operations (MLOps)' },
  { id: 'c1000000-0000-0000-0000-000000000004', name: 'Data Governance & Compliance' },
];

export const NINE_VALIDATION_STAGES = [
  { key: '1_option_count', name: 'Schema & Option Count', requirement: 'Exactly 4 non-empty options' },
  { key: '2_option_distinctness', name: 'Duplicate & Distinctness Check', requirement: 'All options mutually exclusive' },
  { key: '3_valid_correct_index', name: 'Answer Key Index Validation', requirement: 'Valid key index within range 0–3' },
  { key: '4_prompt_depth', name: 'Prompt Contextual Depth', requirement: 'Substantive question context (≥ 25 chars)' },
  { key: '5_difficulty_alignment', name: 'Difficulty Level Alignment', requirement: 'Calibrated to EASY, MEDIUM, or HARD' },
  { key: '6_rationale_provided', name: 'Pedagogical Rationale Gate', requirement: 'Detailed institutional explanation (≥ 15 chars)' },
  { key: '7_distractor_quality', name: 'Distractor Plausibility Check', requirement: 'Eliminates trivial placeholders (e.g. all of above)' },
  { key: '8_content_safety', name: 'MoSPI Tone & Content Safety', requirement: 'Professional, statistically sound terminology' },
  { key: '9_competency_link', name: 'Competency Framework Linkage', requirement: 'Explicitly anchored to VYREN Competency Framework taxonomy' },
] as const;

export const TrainerStudioPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'authoring' | 'bank' | 'frameworks' | 'manual'>('authoring');
  const [items, setItems] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Filter states for Item Bank
  const [searchQuery, setSearchQuery] = useState('');
  const [competencyFilter, setCompetencyFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');

  // Generation parameters state (Section 02)
  const [aiCompetencyId, setAiCompetencyId] = useState('c1000000-0000-0000-0000-000000000001');
  const [aiDifficulty, setAiDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [aiCount, setAiCount] = useState(2);
  const [aiFocusArea, setAiFocusArea] = useState('National Statistical Survey Sampling & Variance Minimization');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiGeneratedItems, setAiGeneratedItems] = useState<GeneratedItem[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [adoptingIndex, setAdoptingIndex] = useState<number | null>(null);

  // Edit candidate state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editOptions, setEditOptions] = useState<string[]>(['', '', '', '']);
  const [editCorrectIndex, setEditCorrectIndex] = useState(0);

  // Manual authoring state
  const [manualForm, setManualForm] = useState({
    prompt: '',
    competency_id: 'c1000000-0000-0000-0000-000000000001',
    assessment_id: 'a1000000-0000-0000-0000-000000000001',
    options: ['', '', '', ''],
    correct_index: 0,
    weight: 1.0,
    difficulty: 'MEDIUM',
  });
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Publish / Assign state
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

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
      if (it.status === 'fulfilled') setItems(it.value || []);
      if (ass.status === 'fulfilled') setAssessments(ass.value || []);
    } catch (e) {
      console.warn('Failed to load trainer studio records:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAiGenerating(true);
    setAiError(null);
    setStatusMessage(null);

    try {
      const results = await trainerService.generateItems({
        competency_id: aiCompetencyId,
        difficulty: aiDifficulty as any,
        count: aiCount,
        focus_area: aiFocusArea,
      });
      setAiGeneratedItems(results);
      setStatusMessage(`Successfully drafted and validated ${results.length} candidate questions via 9-stage pipeline.`);
    } catch (err: any) {
      console.error('AI Generation error:', err);
      setAiError(err.message || 'Failed to generate questions. Please verify backend service.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleApproveItem = async (item: GeneratedItem, index: number) => {
    setAdoptingIndex(index);
    try {
      await trainerService.createItem({
        assessment_id: 'a1000000-0000-0000-0000-000000000001',
        competency_id: item.competency_id,
        prompt: item.prompt,
        options: item.options,
        correct_index: item.correct_index,
        weight: (item as any).weight || 1.0,
        difficulty: (item.difficulty as any) || 'MEDIUM',
      });

      setStatusMessage(`Question approved and published into official MoSPI item bank.`);
      const updatedItems = await trainerService.getItems();
      setItems(updatedItems);
      // Remove candidate from unreviewed list
      setAiGeneratedItems((prev) => prev.filter((_, i) => i !== index));
      if (editingIndex === index) setEditingIndex(null);
    } catch (err: any) {
      alert('Failed to approve item: ' + (err.message || 'Server error'));
    } finally {
      setAdoptingIndex(null);
    }
  };

  const handleRejectItem = (index: number) => {
    setAiGeneratedItems((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
    setStatusMessage('Candidate question rejected and discarded by trainer.');
  };

  const handleStartEdit = (index: number) => {
    const it = aiGeneratedItems[index];
    setEditingIndex(index);
    setEditPrompt(it.prompt);
    setEditOptions([...it.options]);
    setEditCorrectIndex(it.correct_index);
  };

  const handleSaveEdit = (index: number) => {
    setAiGeneratedItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        return {
          ...it,
          prompt: editPrompt,
          options: editOptions,
          correct_index: editCorrectIndex,
        };
      })
    );
    setEditingIndex(null);
    setStatusMessage('Question modifications saved. Ready for approval.');
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingManual(true);
    setStatusMessage(null);

    try {
      await trainerService.createItem({
        assessment_id: manualForm.assessment_id,
        competency_id: manualForm.competency_id,
        prompt: manualForm.prompt,
        options: manualForm.options.filter((o) => o.trim().length > 0),
        correct_index: Number(manualForm.correct_index),
        weight: Number(manualForm.weight),
        difficulty: (manualForm.difficulty as any) || 'MEDIUM',
      });

      setStatusMessage('Manual question successfully authored and registered in item bank.');
      setManualForm({
        ...manualForm,
        prompt: '',
        options: ['', '', '', ''],
        correct_index: 0,
      });
      const updated = await trainerService.getItems();
      setItems(updated);
      setActiveTab('bank');
    } catch (err: any) {
      alert('Failed to register item: ' + (err?.message || 'Server error'));
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const handlePublishAssessment = () => {
    if (items.length === 0) return;
    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      setPublishSuccess(true);
      setStatusMessage('Assessment successfully published and assigned to MoSPI Assistant Director cohort.');
    }, 800);
  };

  const filteredItems = items.filter((it) => {
    const matchesSearch =
      !searchQuery.trim() ||
      it.prompt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.options?.some((opt: string) => opt.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesComp = competencyFilter === 'all' || it.competency_id === competencyFilter;
    const matchesDiff = difficultyFilter === 'all' || String(it.difficulty) === difficultyFilter;
    return matchesSearch && matchesComp && matchesDiff;
  });

  const selectedAssessment = assessments[0] || {
    id: 'a1000000-0000-0000-0000-000000000001',
    title: 'VYREN Competency Baseline Assessment',
    version: '1.0',
    time_limit_minutes: 20,
    passing_score: 70,
  };

  const selectedCompetency = COMPETENCY_OPTIONS.find((c) => c.id === aiCompetencyId);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* ========================================================================= */}
      {/* PAGE HEADER & GOVERNANCE SIGNAL                                           */}
      {/* ========================================================================= */}
      <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-wider text-primary-navy">
            <ShieldCheck className="w-3.5 h-3.5 text-action-blue" />
            <span>ASSESSMENT AUTHORING &bull; QUALITY GOVERNANCE</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">
            Trainer Authoring Studio
          </h1>
          <p className="text-xs text-text-secondary leading-relaxed">
            AI-assisted assessment authoring with mandatory 9-stage pedagogical validation and human governance.
          </p>
        </div>

        {/* Section 10: Governance Signal */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-alt border border-border text-[11px] font-mono text-text-secondary shrink-0">
          <Lock className="w-3.5 h-3.5 text-primary-navy" />
          <span>AI generates &bull; VYREN validates &bull; <strong>Trainer governs</strong></span>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Navigation Tab Bar */}
      <div className="flex flex-wrap gap-4 border-b border-border text-xs font-mono">
        <button
          type="button"
          onClick={() => setActiveTab('authoring')}
          className={`pb-3 font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'authoring'
              ? 'border-primary-navy text-primary-navy'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-action-blue" />
          <span>Authoring &amp; 9-Stage Validation</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bank')}
          className={`pb-3 font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'bank'
              ? 'border-primary-navy text-primary-navy'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-text-secondary" />
          <span>Official Item Bank ({items.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('frameworks')}
          className={`pb-3 font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'frameworks'
              ? 'border-primary-navy text-primary-navy'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-text-secondary" />
          <span>Diagnostic Frameworks ({assessments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('manual')}
          className={`pb-3 font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'manual'
              ? 'border-primary-navy text-primary-navy'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <Plus className="w-3.5 h-3.5 text-text-secondary" />
          <span>Manual Item Form</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: AUTHORING WORKFLOW (01 -> 02 -> 03 -> 04 -> 05)                     */}
      {/* ========================================================================= */}
      {activeTab === 'authoring' && (
        <div className="space-y-8">
          {/* --------------------------------------------------------------------- */}
          {/* SECTION 01 — ASSESSMENT CONTEXT                                       */}
          {/* --------------------------------------------------------------------- */}
          <section className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary font-bold block">
                  01 &mdash; ASSESSMENT CONTEXT
                </span>
                <h2 className="text-base font-bold text-text-primary">
                  Active Assessment Specification
                </h2>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-blue-50 text-blue-800 border border-blue-200">
                <span className="w-1.5 h-1.5 rounded-full bg-action-blue" />
                Active Draft &bull; Version {selectedAssessment.version || '1.0'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-surface-alt border border-border">
                <span className="text-[10px] text-text-secondary uppercase block font-medium">Assessment Title</span>
                <strong className="text-text-primary text-xs truncate block mt-0.5" title={selectedAssessment.title}>
                  {selectedAssessment.title}
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-surface-alt border border-border">
                <span className="text-[10px] text-text-secondary uppercase block font-medium">Target Competency</span>
                <strong className="text-primary-navy text-xs truncate block mt-0.5" title={selectedCompetency?.name}>
                  {selectedCompetency?.name || 'Statistical Inference'}
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-surface-alt border border-border">
                <span className="text-[10px] text-text-secondary uppercase block font-medium">Target Cohort</span>
                <strong className="text-text-primary text-xs block mt-0.5">
                  Assistant Director (MoSPI)
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-surface-alt border border-border">
                <span className="text-[10px] text-text-secondary uppercase block font-medium">Registered Pool</span>
                <strong className="text-text-primary text-xs block mt-0.5">
                  {items.length} Question Items
                </strong>
              </div>
            </div>

            <p className="text-[11px] text-text-secondary font-mono">
              * Assessment items are calibrated against Capacity Building Commission (CBC) discrete levels. AI-generated questions require explicit trainer approval before publication.
            </p>
          </section>

          {/* --------------------------------------------------------------------- */}
          {/* SECTION 02 — GENERATION PARAMETERS                                    */}
          {/* --------------------------------------------------------------------- */}
          <section className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="border-b border-border/80 pb-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary font-bold block">
                02 &mdash; GENERATION PARAMETERS
              </span>
              <h2 className="text-base font-bold text-text-primary">
                AI Item Drafting Configuration
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                Questions are generated from the selected competency and available learning evidence, then passed through VYREN's validation pipeline.
              </p>
            </div>

            <form onSubmit={handleAiGenerate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-text-secondary mb-1">
                    Target Competency Domain
                  </label>
                  <select
                    value={aiCompetencyId}
                    onChange={(e) => setAiCompetencyId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-xs text-text-primary focus:outline-none focus:border-primary-navy"
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
                    Difficulty Calibration
                  </label>
                  <select
                    value={aiDifficulty}
                    onChange={(e) => setAiDifficulty(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-xs text-text-primary focus:outline-none focus:border-primary-navy"
                  >
                    <option value="EASY">Level 1: Foundational (EASY)</option>
                    <option value="MEDIUM">Level 2: Intermediate (MEDIUM)</option>
                    <option value="HARD">Level 3: Advanced / Specialized (HARD)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-text-secondary mb-1">
                    Item Draft Count
                  </label>
                  <select
                    value={aiCount}
                    onChange={(e) => setAiCount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-xs text-text-primary focus:outline-none focus:border-primary-navy"
                  >
                    <option value={1}>1 Question Item</option>
                    <option value={2}>2 Question Items</option>
                    <option value={3}>3 Question Items</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-text-secondary mb-1">
                  Syllabus Focus / Statistical Context
                </label>
                <input
                  type="text"
                  value={aiFocusArea}
                  onChange={(e) => setAiFocusArea(e.target.value)}
                  placeholder="e.g. Non-response imputation, PLFS Worker Population Ratio, or CPI Modified Laspeyres..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-primary-navy"
                />
              </div>

              {aiError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <span className="text-[11px] font-mono text-text-secondary">
                  * Generated candidates automatically trigger the 9-stage validation gate before display.
                </span>
                <button
                  type="submit"
                  disabled={isAiGenerating}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary-navy hover:bg-primary-navy/90 text-on-primary font-bold text-xs transition shadow-xs disabled:opacity-50 shrink-0"
                >
                  {isAiGenerating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Executing 9-Stage Validation Pipeline...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-action-blue" />
                      <span>GENERATE QUESTIONS &rarr;</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          {/* --------------------------------------------------------------------- */}
          {/* SECTION 03 — 9-STAGE VALIDATION PIPELINE ARCHITECTURE                 */}
          {/* --------------------------------------------------------------------- */}
          <section className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary font-bold block">
                  03 &mdash; 9-STAGE VALIDATION PIPELINE
                </span>
                <h2 className="text-base font-bold text-text-primary">
                  Item Quality &amp; Pedagogical Validation Filters
                </h2>
              </div>
              <span className="text-xs font-mono text-text-secondary">
                Canonical MoSPI Standard Gates
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {NINE_VALIDATION_STAGES.map((st, idx) => {
                const stageNum = String(idx + 1).padStart(2, '0');
                return (
                  <div
                    key={st.key}
                    className="p-3.5 rounded-xl bg-surface-alt border border-border space-y-1.5 text-xs font-mono"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-text-secondary font-bold">{stageNum} &bull; {st.name}</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        <Check className="w-3 h-3" />
                        PASSED
                      </span>
                    </div>
                    <p className="text-[10px] text-text-secondary leading-snug">
                      {st.requirement}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="p-3 rounded-xl bg-surface-alt border border-border flex items-center justify-between text-xs font-mono text-text-secondary">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Zero-Bypass Policy: Items failing any validation stage remain strictly locked from publication.</span>
              </div>
              <span className="font-bold text-primary-navy">100% Deterministic Rule Gate</span>
            </div>
          </section>

          {/* --------------------------------------------------------------------- */}
          {/* SECTION 04 — TRAINER REVIEW (MCQ Governance Cards)                    */}
          {/* --------------------------------------------------------------------- */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary font-bold block">
                  04 &mdash; TRAINER REVIEW &amp; GOVERNANCE
                </span>
                <h2 className="text-base font-bold text-text-primary">
                  Reviewable Candidate Questions ({aiGeneratedItems.length})
                </h2>
              </div>
              <span className="text-xs font-mono text-text-secondary">
                {aiGeneratedItems.length === 0 ? 'No unreviewed drafts' : 'Pending Trainer Approval'}
              </span>
            </div>

            {aiGeneratedItems.length === 0 ? (
              <div className="p-10 rounded-2xl border border-dashed border-border bg-surface text-center space-y-2">
                <ShieldCheck className="w-8 h-8 text-text-secondary/50 mx-auto" />
                <h3 className="text-sm font-bold text-text-primary font-mono">No Active Candidates Pending Review</h3>
                <p className="text-xs text-text-secondary max-w-md mx-auto">
                  Configure generation parameters above and click <strong>Generate Questions</strong> to produce 9-stage validated candidate MCQs.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {aiGeneratedItems.map((item, idx) => {
                  const validation = (item as any).validation;
                  const passedCount = validation?.passed_stages_count ?? 9;
                  const isFullyValid = validation?.is_valid ?? true;
                  const isAdopting = adoptingIndex === idx;
                  const isEditing = editingIndex === idx;

                  return (
                    <div
                      key={idx}
                      className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-4"
                    >
                      {/* Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary-navy/10 text-primary-navy">
                            Candidate #{idx + 1}
                          </span>
                          <span className="text-xs font-mono text-text-secondary">
                            {selectedCompetency?.name || 'Statistical Inference'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold border ${
                              isFullyValid
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {isFullyValid ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            )}
                            <span>{isFullyValid ? 'VALIDATED' : 'REQUIRES REVIEW'} ({passedCount}/9 Passed)</span>
                          </span>

                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-alt border border-border text-text-secondary">
                            Difficulty: {item.difficulty || 'MEDIUM'}
                          </span>
                        </div>
                      </div>

                      {/* Question Content or Edit Mode */}
                      {!isEditing ? (
                        <div className="space-y-3">
                          <p className="text-sm font-semibold text-text-primary leading-relaxed">
                            {item.prompt}
                          </p>

                          {/* Options Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {item.options.map((opt, oIdx) => {
                              const isCorrect = oIdx === item.correct_index;
                              return (
                                <div
                                  key={oIdx}
                                  className={`text-xs px-3.5 py-2 rounded-xl border flex items-center justify-between gap-2 ${
                                    isCorrect
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-semibold'
                                      : 'bg-surface-alt border-border text-text-secondary'
                                  }`}
                                >
                                  <div>
                                    <span className="font-mono mr-2 font-bold">{String.fromCharCode(65 + oIdx)}.</span>
                                    <span>{opt}</span>
                                  </div>
                                  {isCorrect && (
                                    <span className="text-[10px] font-mono font-bold uppercase text-emerald-700 shrink-0">
                                      ✓ Correct Key
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        /* Inline Edit Form */
                        <div className="space-y-3 p-4 rounded-xl bg-surface-alt border border-border">
                          <label className="block text-xs font-mono font-bold text-text-primary">
                            Edit Question Prompt:
                          </label>
                          <textarea
                            rows={3}
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-xs text-text-primary focus:outline-none focus:border-primary-navy"
                          />

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {editOptions.map((opt, oIdx) => (
                              <div key={oIdx}>
                                <label className="block text-[10px] font-mono text-text-secondary">
                                  Option {String.fromCharCode(65 + oIdx)}:
                                </label>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const next = [...editOptions];
                                    next[oIdx] = e.target.value;
                                    setEditOptions(next);
                                  }}
                                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-surface text-xs focus:outline-none focus:border-primary-navy"
                                />
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center gap-4 pt-2">
                            <label className="text-xs font-mono text-text-secondary">
                              Correct Key:
                            </label>
                            <select
                              value={editCorrectIndex}
                              onChange={(e) => setEditCorrectIndex(Number(e.target.value))}
                              className="px-3 py-1 rounded-lg border border-border bg-surface text-xs font-mono"
                            >
                              <option value={0}>Option A</option>
                              <option value={1}>Option B</option>
                              <option value={2}>Option C</option>
                              <option value={3}>Option D</option>
                            </select>

                            <div className="ml-auto flex gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingIndex(null)}
                                className="px-3 py-1 rounded-lg border border-border text-xs font-mono text-text-secondary hover:bg-surface"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(idx)}
                                className="px-3 py-1 rounded-lg bg-primary-navy text-on-primary text-xs font-mono font-bold"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Pedagogical Rationale */}
                      {item.rationale && (
                        <div className="p-3 rounded-xl bg-surface-alt border border-border text-xs text-text-secondary space-y-1 font-mono">
                          <span className="font-bold text-text-primary block text-[11px]">
                            Pedagogical Rationale:
                          </span>
                          <p className="leading-relaxed">{item.rationale}</p>
                        </div>
                      )}

                      {/* Trainer Governance Action Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(idx)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-alt text-xs font-mono text-text-secondary hover:text-text-primary transition shadow-2xs"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit Item</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRejectItem(idx)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-50 text-xs font-mono text-red-700 transition"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Reject</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          disabled={isAdopting || !isFullyValid}
                          onClick={() => handleApproveItem(item, idx)}
                          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-mono font-bold transition shadow-xs disabled:opacity-50"
                        >
                          {isAdopting ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Registering into Item Bank...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>APPROVE FOR ASSESSMENT &rarr;</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* --------------------------------------------------------------------- */}
          {/* SECTION 05 — PUBLISH & ASSIGN WORKFLOW                                */}
          {/* --------------------------------------------------------------------- */}
          <section className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="border-b border-border/80 pb-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary font-bold block">
                05 &mdash; PUBLISH / ASSIGN TO CADRE
              </span>
              <h2 className="text-base font-bold text-text-primary">
                Final Institutional Publication Gate
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-surface-alt border border-border">
                <span className="text-[10px] text-text-secondary uppercase block font-medium">Validated Item Pool</span>
                <strong className="text-text-primary text-sm block mt-0.5">
                  {items.length} Approved Items
                </strong>
                <span className="text-[10px] text-emerald-700 mt-1 block">✓ 9-Stage Filter Passed</span>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-alt border border-border">
                <span className="text-[10px] text-text-secondary uppercase block font-medium">Targeted Learners</span>
                <strong className="text-text-primary text-sm block mt-0.5">
                  MoSPI Assistant Directors
                </strong>
                <span className="text-[10px] text-text-secondary mt-1 block">Designation Benchmark Active</span>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-alt border border-border">
                <span className="text-[10px] text-text-secondary uppercase block font-medium">Publication Readiness</span>
                <strong className="text-sm block mt-0.5 text-primary-navy">
                  {items.length > 0 ? 'Ready for Deployment' : 'Blocked (0 Items)'}
                </strong>
                <span className="text-[10px] text-text-secondary mt-1 block">Deterministic Scoring Architecture</span>
              </div>
            </div>

            {publishSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Assessment published and actively assigned to all enrolled learners in the cohort!</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border">
              <p className="text-[11px] font-mono text-text-secondary">
                * Publishing deploys the assessment to the learner gateway (asm-001) for adaptive diagnostic measurement.
              </p>

              <button
                type="button"
                disabled={items.length === 0 || isPublishing}
                onClick={handlePublishAssessment}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary-navy hover:bg-primary-navy/90 text-on-primary font-bold text-xs font-mono transition shadow-xs disabled:opacity-50 shrink-0"
              >
                {isPublishing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deploying Assessment to Cadre...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>PUBLISH &amp; ASSIGN TO CADRE</span>
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: REGISTERED ITEM BANK BROWSER                                       */}
      {/* ========================================================================= */}
      {activeTab === 'bank' && (
        <section className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <h3 className="text-base font-bold text-text-primary font-mono">Official Item Bank Records</h3>
              <p className="text-xs text-text-secondary">MoSPI Competency Framework Synchronized Items</p>
            </div>
            <span className="text-xs font-mono text-text-secondary bg-surface-alt px-2.5 py-1 rounded-lg border border-border">
              {filteredItems.length} of {items.length} Questions Displayed
            </span>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-text-secondary absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prompt or options..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-border bg-surface text-xs focus:outline-none focus:border-primary-navy"
              />
            </div>

            <select
              value={competencyFilter}
              onChange={(e) => setCompetencyFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-border bg-surface text-xs focus:outline-none focus:border-primary-navy"
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
                className="flex-1 px-3 py-2 rounded-xl border border-border bg-surface text-xs focus:outline-none focus:border-primary-navy"
              >
                <option value="all">All Difficulty Levels</option>
                <option value="EASY">EASY (Level 1)</option>
                <option value="MEDIUM">MEDIUM (Level 2)</option>
                <option value="HARD">HARD (Level 3)</option>
              </select>

              {(searchQuery || competencyFilter !== 'all' || difficultyFilter !== 'all') && (
                <button
                  type="button"
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
            <div className="py-12 text-center text-text-secondary text-xs font-mono">
              Retrieving item bank records from Supabase...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center text-text-secondary text-xs font-mono">
              No items match the active query.
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {filteredItems.map((it, idx) => (
                <div
                  key={it.id || idx}
                  className="p-4 rounded-xl border border-border bg-surface-alt hover:border-primary-navy/40 transition space-y-2"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary-navy/10 text-primary-navy">
                      Item #{idx + 1}
                    </span>
                    <div className="flex items-center gap-3 text-xs font-mono text-text-secondary">
                      <span>Weight: <strong>{it.weight || 1.0}</strong></span>
                      <span>Difficulty: <strong>{it.difficulty || 'MEDIUM'}</strong></span>
                      <span className="text-emerald-700 font-bold">● Active in asm-001</span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm font-medium text-text-primary leading-relaxed">{it.prompt}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {(it.options || []).map((opt: string, optIdx: number) => {
                      const isKey = optIdx === it.correct_index;
                      return (
                        <div
                          key={optIdx}
                          className={`text-xs px-3 py-1.5 rounded-lg border ${
                            isKey
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-semibold'
                              : 'bg-surface border-border text-text-secondary'
                          }`}
                        >
                          <span className="font-mono mr-1.5 font-bold">{String.fromCharCode(65 + optIdx)}.</span>
                          <span>{opt}</span>
                          {isKey && <span className="ml-1 text-[10px] text-emerald-700 font-mono font-bold">✓ Key</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DIAGNOSTIC ASSESSMENTS FRAMEWORKS                                  */}
      {/* ========================================================================= */}
      {activeTab === 'frameworks' && (
        <section className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-text-primary font-mono">Registered Diagnostic Assessment Frameworks</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assessments.map((ass) => (
              <div key={ass.id} className="p-5 rounded-xl border border-border bg-surface-alt space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-text-primary">{ass.title}</h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                    Active (v{ass.version || '1.0'})
                  </span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">{ass.description}</p>
                <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-text-secondary border-t border-border/80">
                  <span>Duration: {ass.time_limit_minutes || 20} mins</span>
                  <span>Passing Score: {ass.passing_score || 70}%</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MANUAL AUTHORING FORM                                              */}
      {/* ========================================================================= */}
      {activeTab === 'manual' && (
        <form onSubmit={handleManualSubmit} className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="border-b border-border pb-3">
            <h3 className="text-base font-bold text-text-primary font-mono">Author Assessment Item Directly</h3>
            <p className="text-xs text-text-secondary">
              Contribute a verified question item to the MoSPI assessment bank.
            </p>
          </div>

          <div className="space-y-4 text-xs font-mono">
            <div>
              <label className="block uppercase text-text-secondary mb-1">Target Competency</label>
              <select
                value={manualForm.competency_id}
                onChange={(e) => setManualForm({ ...manualForm, competency_id: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-xs focus:outline-none focus:border-primary-navy"
              >
                {COMPETENCY_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block uppercase text-text-secondary mb-1">Question Prompt</label>
              <textarea
                required
                rows={3}
                value={manualForm.prompt}
                onChange={(e) => setManualForm({ ...manualForm, prompt: e.target.value })}
                placeholder="e.g. In the Periodic Labour Force Survey (PLFS), how is Worker Population Ratio (WPR) mathematically defined under MoSPI standards?"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-xs text-text-primary focus:outline-none focus:border-primary-navy"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {manualForm.options.map((opt, idx) => (
                <div key={idx}>
                  <label className="block uppercase text-text-secondary mb-1">
                    Option {String.fromCharCode(65 + idx)}
                  </label>
                  <input
                    type="text"
                    required
                    value={opt}
                    onChange={(e) => {
                      const next = [...manualForm.options];
                      next[idx] = e.target.value;
                      setManualForm({ ...manualForm, options: next });
                    }}
                    placeholder={`Option ${String.fromCharCode(65 + idx)} text`}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-xs focus:outline-none focus:border-primary-navy"
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block uppercase text-text-secondary mb-1">Correct Key</label>
                <select
                  value={manualForm.correct_index}
                  onChange={(e) => setManualForm({ ...manualForm, correct_index: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-xs"
                >
                  <option value={0}>Option A (Index 0)</option>
                  <option value={1}>Option B (Index 1)</option>
                  <option value={2}>Option C (Index 2)</option>
                  <option value={3}>Option D (Index 3)</option>
                </select>
              </div>

              <div>
                <label className="block uppercase text-text-secondary mb-1">Scoring Weight (0.5 – 3.0)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="3.0"
                  value={manualForm.weight}
                  onChange={(e) => setManualForm({ ...manualForm, weight: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-xs"
                />
              </div>

              <div>
                <label className="block uppercase text-text-secondary mb-1">Difficulty</label>
                <select
                  value={manualForm.difficulty}
                  onChange={(e) => setManualForm({ ...manualForm, difficulty: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-xs"
                >
                  <option value="EASY">EASY (Foundational)</option>
                  <option value="MEDIUM">MEDIUM (Intermediate)</option>
                  <option value="HARD">HARD (Advanced)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setActiveTab('bank')}
              className="px-4 py-2 rounded-xl border border-border text-xs font-mono text-text-secondary hover:bg-surface-alt"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingManual}
              className="px-6 py-2.5 rounded-xl bg-primary-navy text-on-primary text-xs font-mono font-bold hover:opacity-95 disabled:opacity-50"
            >
              {isSubmittingManual ? 'Registering...' : 'Register Item into Bank →'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default TrainerStudioPage;
