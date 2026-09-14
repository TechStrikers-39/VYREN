import React, { useState } from 'react';

export interface EvidenceItemLog {
  item_id: string;
  target_competency_id?: string;
  prompt?: string;
  options?: string[];
  learner_answer?: number;
  learner_answer_text?: string;
  correct_answer?: number;
  correct_answer_text?: string;
  is_correct: boolean;
  weight: number;
  difficulty?: string;
  explanation?: string;
}

export interface EvidenceBreakdownProps {
  itemLog?: EvidenceItemLog[];
}

export const EvidenceBreakdown: React.FC<EvidenceBreakdownProps> = ({ itemLog }) => {
  const [filter, setFilter] = useState<'ALL' | 'CORRECT' | 'INCORRECT'>('ALL');

  if (!itemLog || itemLog.length === 0) {
    return (
      <div className="p-5 rounded-xl border border-border bg-surface-alt space-y-2">
        <h4 className="text-sm font-semibold text-text-primary">Evidence Vector Audit Trail</h4>
        <p className="text-xs text-text-secondary">
          Deterministic evaluation vector is cryptographically bound to your learner profile.
        </p>
      </div>
    );
  }

  const correctCount = itemLog.filter(it => it.is_correct).length;
  const filteredItems = itemLog.filter(it => {
    if (filter === 'CORRECT') return it.is_correct;
    if (filter === 'INCORRECT') return !it.is_correct;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h3 className="text-base font-bold text-text-primary">
            Detailed Diagnostic Review & Cognitive Rationales
          </h3>
          <p className="text-xs text-text-secondary">
            Evaluation locked deterministically ({correctCount} of {itemLog.length} correct). Review item explanations below:
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-1.5 bg-surface-alt p-1 rounded-lg border border-border shrink-0">
          {(['ALL', 'CORRECT', 'INCORRECT'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-colors ${
                filter === f
                  ? 'bg-surface text-primary-navy shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredItems.map((item, idx) => (
          <div
            key={item.item_id || idx}
            className={`p-4 rounded-xl border transition-all ${
              item.is_correct
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-rose-500/30 bg-rose-500/5'
            } space-y-3`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    item.is_correct
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {item.is_correct ? '✓ CORRECT' : '✗ INCORRECT'}
                </span>
                {item.difficulty && (
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface border border-border text-text-secondary">
                    {item.difficulty}
                  </span>
                )}
                <span className="text-[10px] font-mono text-text-secondary">
                  Weight: {item.weight}x
                </span>
              </div>
            </div>

            <p className="text-sm font-medium text-text-primary leading-snug">
              {item.prompt || `Item ${idx + 1}`}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-surface border border-border space-y-1">
                <span className="text-[10px] font-mono uppercase text-text-secondary">Your Selected Answer:</span>
                <p className={`font-semibold ${item.is_correct ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {item.learner_answer_text || (item.learner_answer !== undefined ? `Option ${item.learner_answer + 1}` : 'None')}
                </p>
              </div>

              {!item.is_correct && (
                <div className="p-2.5 rounded-lg bg-surface border border-emerald-500/30 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-emerald-700 dark:text-emerald-400">Correct Answer:</span>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {item.correct_answer_text || (item.correct_answer !== undefined ? `Option ${item.correct_answer + 1}` : 'Key')}
                  </p>
                </div>
              )}
            </div>

            {item.explanation && (
              <div className="p-3 rounded-lg bg-surface/80 border border-border/80 text-xs text-text-secondary space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-text-primary text-[11px]">
                  <span>💡</span>
                  <span>Cognitive Rationale:</span>
                </div>
                <p className="leading-relaxed text-[11px]">
                  {item.explanation}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EvidenceBreakdown;
