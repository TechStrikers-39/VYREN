import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export interface QuizQuestionProps {
  prompt: string;
  options: string[];
  selectedIndex?: number;
  onSelect?: (index: number) => void;
}

export const QuizQuestion: React.FC<QuizQuestionProps> = ({
  prompt,
  options,
  selectedIndex,
  onSelect,
}) => {
  return (
    <div className="space-y-6">
      <h3 className="text-base sm:text-lg font-semibold text-text-primary leading-relaxed">
        {prompt}
      </h3>
      <div className="space-y-3">
        {options.map((opt, idx) => {
          const isSelected = selectedIndex === idx;
          const letter = String.fromCharCode(65 + idx);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelect?.(idx)}
              className={`w-full text-left p-4 rounded-xl border text-xs sm:text-sm transition-all duration-150 flex items-center justify-between gap-3 ${
                isSelected
                  ? 'border-primary-navy bg-primary-navy/5 text-text-primary ring-1 ring-primary-navy font-medium shadow-2xs'
                  : 'border-border bg-surface text-text-secondary hover:border-text-secondary/50 hover:bg-surface-alt/50 hover:text-text-primary'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-6 h-6 rounded-full font-mono font-bold text-xs flex items-center justify-center shrink-0 border transition-colors ${
                    isSelected
                      ? 'bg-primary-navy text-on-primary border-primary-navy'
                      : 'bg-surface-alt text-text-secondary border-border'
                  }`}
                >
                  {letter}
                </span>
                <span className="leading-relaxed">{opt}</span>
              </div>
              {isSelected && (
                <CheckCircle2 className="w-4 h-4 text-primary-navy shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuizQuestion;
