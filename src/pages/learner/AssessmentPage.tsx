import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AssessmentContextProvider, useAssessment } from '@/contexts/AssessmentContext';
import { ROUTES } from '@/constants/routes';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  ListOrdered,
  ArrowLeft,
  ArrowRight,
  Send,
  ShieldCheck,
  Info,
  HelpCircle,
} from 'lucide-react';

const AssessmentInner: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const {
    assessment,
    currentQuestionIndex,
    answers,
    isSubmitting,
    timeRemaining,
    isUrgent,
    hasExpired,
    result,
    loadAssessment,
    selectAnswer,
    nextQuestion,
    prevQuestion,
    goToQuestion,
    submitAssessment,
  } = useAssessment();

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (assessmentId) {
      loadAssessment(assessmentId);
    }
  }, [assessmentId]);

  useEffect(() => {
    if (hasExpired && result && assessment) {
      const timer = setTimeout(() => {
        navigate(`/learner/assessment/${assessment.id}/result`, { state: { result } });
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [hasExpired, result, assessment, navigate]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!assessment) {
    return (
      <div className="max-w-3xl mx-auto p-16 text-center space-y-4">
        <div className="w-8 h-8 mx-auto border-2 border-primary-navy border-t-transparent rounded-full animate-spin" />
        <div className="space-y-1">
          <p className="text-sm font-bold text-text-primary">Loading Skill Assessment</p>
          <p className="text-xs font-mono text-text-secondary">Retrieving 17-item competency assessment from MoSPI NSSTA gateway...</p>
        </div>
      </div>
    );
  }

  const currentItem = assessment.items[currentQuestionIndex];
  const isLast = currentQuestionIndex === assessment.items.length - 1;
  const isFirst = currentQuestionIndex === 0;
  const totalQuestions = assessment.items.length;
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = totalQuestions - answeredCount;

  const handleFinalSubmit = async () => {
    try {
      setShowConfirmModal(false);
      const res = await submitAssessment();
      navigate(`/learner/assessment/${assessment.id}/result`, { state: { result: res } });
    } catch (err) {
      console.error('Submission failed:', err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      {/* Time Expired Modal */}
      {hasExpired && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="p-6 sm:p-8 rounded-2xl bg-surface border border-border shadow-2xl max-w-md text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-700 flex items-center justify-center mx-auto border border-amber-500/20">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-text-primary">Time Limit Expired</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Assessment session time limit reached. Responses have been finalized and transmitted for deterministic evaluation.
            </p>
            <div className="flex justify-center pt-2">
              <div className="w-6 h-6 border-2 border-primary-navy border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        </div>
      )}

      {/* Review Before Submit Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="p-6 sm:p-8 rounded-2xl bg-surface border border-border shadow-2xl max-w-md w-full space-y-5">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <div className="w-10 h-10 rounded-full bg-primary-navy/10 text-primary-navy flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">Confirm Assessment Submission</h3>
                <p className="text-[11px] font-mono text-text-secondary">MoSPI Competency Evaluation Engine</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-surface-alt border border-border space-y-2">
                <div className="flex justify-between font-semibold">
                  <span className="text-text-secondary">Answered Items:</span>
                  <span className="text-emerald-700 font-mono font-bold">{answeredCount} / {totalQuestions}</span>
                </div>
                {unansweredCount > 0 && (
                  <div className="flex justify-between font-semibold text-amber-800">
                    <span>Unattempted Items:</span>
                    <span className="font-mono font-bold">{unansweredCount}</span>
                  </div>
                )}
              </div>

              {unansweredCount > 0 ? (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-2 text-[11px]">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <p>
                    Notice: You have <strong>{unansweredCount} unattempted</strong> item(s). Unanswered questions will receive zero weight during competency level recalibration.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 text-[11px]">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <p>All items answered. Your responses are ready for deterministic evaluation.</p>
                </div>
              )}

              {/* Section 04: Submission/Validation Explanation */}
              <div className="p-3 rounded-xl bg-surface-alt border border-border text-[11px] text-text-secondary flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-action-blue shrink-0 mt-0.5" />
                <p>
                  Your responses will be validated against the competency assessment model before your discrete Level 0–4 state is recalculated.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-text-secondary hover:bg-surface-alt transition shadow-2xs"
              >
                Continue Reviewing
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="px-5 py-2.5 rounded-xl bg-primary-navy hover:bg-primary-navy/90 text-on-primary text-xs font-bold transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <span>Validating assessment...</span>
                ) : (
                  <>
                    <span>Confirm &amp; Finalize</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 01 — ASSESSMENT CONTEXT (Concise Header & Metadata)                       */}
      {/* ========================================================================= */}
      <section className="space-y-4 border-b border-border pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary-navy/5 border border-primary-navy/15 text-[11px] font-mono font-bold text-primary-navy uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              SKILL ASSESSMENT &bull; MoSPI &amp; NSSTA
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-text-primary">
              {assessment.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary font-mono">
              <span>Competency: <strong className="text-text-primary">{currentItem.targetCompetency || 'Statistical Framework'}</strong></span>
              <span>&bull;</span>
              <span>Items: <strong className="text-text-primary">{totalQuestions} Questions</strong></span>
              <span>&bull;</span>
              <span>Framework: <strong className="text-text-primary">NSSTA Evaluated</strong></span>
            </div>
            <p className="text-xs text-text-secondary/80 pt-0.5 leading-relaxed">
              Validate competency after the assigned learning activity. Responses deterministically update your verified Level 0&ndash;4 mastery.
            </p>
          </div>

          {/* Restrained Countdown Timer */}
          <div
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-mono text-xs font-bold border shrink-0 transition-all ${
              isUrgent
                ? 'bg-red-50 text-red-700 border-red-300 animate-pulse'
                : 'bg-surface border-border text-text-primary shadow-2xs'
            }`}
          >
            {isUrgent ? (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            ) : (
              <Clock className="w-4 h-4 text-text-secondary" />
            )}
            <span>{formatTime(timeRemaining)}</span>
            {isUrgent && <span className="text-[10px] text-red-600 font-semibold hidden sm:inline">(Hurry)</span>}
          </div>
        </div>

        {/* 03 — Question Navigation Palette (1..N) */}
        <div className="p-3 rounded-2xl bg-surface border border-border flex items-center justify-between gap-3 shadow-2xs overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <ListOrdered className="w-4 h-4 text-text-secondary" />
            <span className="text-[11px] font-mono uppercase text-text-secondary font-semibold hidden sm:inline">
              Jump:
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-1 overflow-x-auto py-0.5">
            {assessment.items.map((item, idx) => {
              const isAnswered = answers[item.id] !== undefined;
              const isCurrent = currentQuestionIndex === idx;
              const label = String(idx + 1).padStart(2, '0');
              return (
                <button
                  key={item.id || idx}
                  type="button"
                  onClick={() => goToQuestion(idx)}
                  className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center shrink-0 ${
                    isCurrent
                      ? 'bg-primary-navy text-on-primary ring-2 ring-primary-navy/30 shadow-xs'
                      : isAnswered
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                      : 'bg-surface-alt text-text-secondary hover:border-border-strong border border-border'
                  }`}
                  title={`Question ${idx + 1}: ${isAnswered ? 'Answered' : 'Unattempted'}`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="text-[11px] font-mono text-text-secondary shrink-0 pl-3 border-l border-border">
            <span className="font-bold text-emerald-700">{answeredCount}</span> / {totalQuestions} Done
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 02 — QUESTION / RESPONSE (Visual Focal Point)                             */}
      {/* ========================================================================= */}
      <section className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-text-secondary">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </span>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-alt border border-border text-text-secondary">
            {(currentItem as any).difficulty || 'Standard'} Complexity
          </span>
        </div>

        {/* Prompt */}
        <h2 className="text-base sm:text-lg font-bold text-text-primary leading-relaxed">
          {currentItem.prompt}
        </h2>

        {/* Options List */}
        <div className="space-y-3" role="radiogroup" aria-label={`Question ${currentQuestionIndex + 1} Options`}>
          {currentItem.options.map((opt, idx) => {
            const isSelected = answers[currentItem.id] === idx;
            const letter = String.fromCharCode(65 + idx);

            return (
              <button
                key={idx}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => selectAnswer(currentItem.id, idx)}
                className={`w-full text-left p-4 rounded-xl border text-xs sm:text-sm transition-all flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'border-action-blue bg-action-blue/5 text-text-primary ring-1 ring-action-blue font-semibold shadow-2xs'
                    : 'border-border bg-surface text-text-secondary hover:border-border-strong hover:bg-surface-alt/60 hover:text-text-primary'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <span
                    className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 border transition ${
                      isSelected
                        ? 'bg-action-blue text-white border-action-blue shadow-2xs'
                        : 'bg-surface-alt text-text-secondary border-border'
                    }`}
                  >
                    {letter}
                  </span>
                  <span className="leading-relaxed text-text-primary font-normal">{opt}</span>
                </div>
                {isSelected && (
                  <CheckCircle2 className="w-4 h-4 text-action-blue shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* NAVIGATION CONTROLS (Previous, Next, Review & Submit)                     */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={prevQuestion}
          disabled={isFirst}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-border transition ${
            isFirst
              ? 'opacity-30 cursor-not-allowed bg-surface-alt text-text-secondary'
              : 'hover:bg-surface-alt text-text-primary bg-surface shadow-2xs'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Previous Item</span>
        </button>

        <div className="flex items-center gap-3">
          {isLast ? (
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-navy hover:bg-primary-navy/90 text-on-primary font-bold text-xs sm:text-sm transition shadow-xs disabled:opacity-50"
            >
              <span>Review &amp; Submit</span>
              <Send className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={nextQuestion}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-navy hover:bg-primary-navy/90 text-on-primary font-semibold text-xs sm:text-sm transition shadow-xs"
            >
              <span>Next Question</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const AssessmentPage: React.FC = () => {
  return (
    <AssessmentContextProvider>
      <AssessmentInner />
    </AssessmentContextProvider>
  );
};

export default AssessmentPage;
