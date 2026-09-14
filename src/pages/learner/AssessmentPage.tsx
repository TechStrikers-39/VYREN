import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AssessmentContextProvider, useAssessment } from '@/contexts/AssessmentContext';
import QuizQuestion from '@/components/assessment/QuizQuestion';
import AssessmentProgress from '@/components/assessment/AssessmentProgress';
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
      <div className="p-16 text-center space-y-3">
        <div className="w-8 h-8 mx-auto border-2 border-primary-navy border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-text-secondary">Loading diagnostic assessment framework...</p>
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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Time Expired Modal */}
      {hasExpired && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="p-6 rounded-2xl bg-surface border border-border shadow-2xl max-w-md text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto border border-amber-500/20">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-text-primary">Time Limit Expired</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Assessment responses have been finalized and transmitted for deterministic evaluation. Generating cryptographic score records...
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
                <h3 className="text-base font-bold text-text-primary">Confirm Final Submission</h3>
                <p className="text-xs text-text-secondary">MoSPI Deterministic Evaluation Engine</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-surface-alt border border-border space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span className="text-text-secondary">Answered Questions:</span>
                  <span className="text-emerald-700 font-mono font-bold">{answeredCount} / {totalQuestions}</span>
                </div>
                {unansweredCount > 0 && (
                  <div className="flex justify-between font-semibold text-amber-700">
                    <span>Unattempted Questions:</span>
                    <span className="font-mono font-bold">{unansweredCount}</span>
                  </div>
                )}
              </div>

              {unansweredCount > 0 ? (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 flex items-start gap-2 text-[11px]">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>
                    Notice: You have <strong>{unansweredCount} unattempted</strong> question(s). Unanswered questions are scored as zero weight in competency evaluation.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 flex items-center gap-2 text-[11px]">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <p>All questions completed. Your answers are ready for mathematical evaluation.</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-text-secondary hover:bg-surface-alt transition"
              >
                Continue Reviewing
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="px-5 py-2 rounded-xl bg-primary-navy text-on-primary text-xs font-bold hover:opacity-95 transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {isSubmitting ? 'Evaluating...' : 'Confirm Submission'}
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Info & Real-Time Countdown Timer */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-primary-navy/10 text-primary-navy font-bold uppercase tracking-wider">
                {currentItem.targetCompetency}
              </span>
              <span className="text-xs font-mono text-text-secondary">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
              {assessment.title}
            </h1>
          </div>

          {/* Timer Card */}
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full font-mono text-xs font-bold border shrink-0 transition-all ${
              isUrgent
                ? 'bg-rose-500/10 text-rose-700 border-rose-500/40 animate-pulse'
                : 'bg-surface border-border text-text-primary shadow-2xs'
            }`}
          >
            {isUrgent ? (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-text-secondary" />
            )}
            <span>{formatTime(timeRemaining)}</span>
            {isUrgent && <span className="text-[10px] text-rose-600 font-semibold hidden sm:inline">(Hurry)</span>}
          </div>
        </div>

        {/* Question Navigation Palette (1..N) */}
        <div className="p-3 rounded-2xl bg-surface border border-border flex items-center justify-between gap-3 overflow-x-auto shadow-2xs">
          <div className="flex items-center gap-1.5 shrink-0">
            <ListOrdered className="w-4 h-4 text-text-secondary mr-1" />
            <span className="text-[11px] font-mono uppercase text-text-secondary font-semibold hidden sm:inline">
              Jump to:
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-1 overflow-x-auto py-0.5">
            {assessment.items.map((item, idx) => {
              const isAnswered = answers[item.id] !== undefined;
              const isCurrent = currentQuestionIndex === idx;
              return (
                <button
                  key={item.id || idx}
                  type="button"
                  onClick={() => goToQuestion(idx)}
                  className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center shrink-0 ${
                    isCurrent
                      ? 'bg-primary-navy text-on-primary ring-2 ring-primary-navy/40 shadow-xs'
                      : isAnswered
                      ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-500/30'
                      : 'bg-surface-alt text-text-secondary hover:border-text-secondary/40 border border-border'
                  }`}
                  title={`Question ${idx + 1}: ${isAnswered ? 'Answered' : 'Unattempted'}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="text-[11px] font-mono text-text-secondary shrink-0 pl-2 border-l border-border">
            <span className="font-bold text-emerald-700">{answeredCount}</span>/{totalQuestions} Done
          </div>
        </div>

        <AssessmentProgress current={currentQuestionIndex + 1} total={totalQuestions} />
      </div>

      {/* Main Question Card */}
      <div className="p-6 sm:p-8 rounded-2xl border border-border bg-surface shadow-sm space-y-6">
        <QuizQuestion
          prompt={currentItem.prompt}
          options={currentItem.options}
          selectedIndex={answers[currentItem.id]}
          onSelect={(idx) => selectAnswer(currentItem.id, idx)}
        />
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={prevQuestion}
          disabled={isFirst}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-border transition ${
            isFirst
              ? 'opacity-30 cursor-not-allowed bg-surface-alt'
              : 'hover:bg-surface-alt text-text-primary bg-surface shadow-2xs'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <div className="flex items-center gap-2">
          {isLast ? (
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-primary-navy text-on-primary font-bold text-xs sm:text-sm hover:opacity-95 transition shadow-sm"
            >
              <span>Review & Submit</span>
              <Send className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={nextQuestion}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary-navy text-on-primary font-semibold text-xs sm:text-sm hover:opacity-95 transition shadow-sm"
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
