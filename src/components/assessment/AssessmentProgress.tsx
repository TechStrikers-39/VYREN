import React from 'react';

export interface AssessmentProgressProps {
  current: number;
  total: number;
}

export const AssessmentProgress: React.FC<AssessmentProgressProps> = ({ current, total }) => {
  const percentage = Math.round((current / total) * 100);
  return (
    <div className="w-full space-y-1.5">
      <div className="flex justify-between text-xs font-mono text-text-secondary">
        <span>Question {current} of {total}</span>
        <span>{percentage}% Complete</span>
      </div>
      <div className="w-full h-2 bg-surface-alt rounded-full overflow-hidden border border-border">
        <div className="h-full bg-primary-navy transition-all duration-300" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

export default AssessmentProgress;
