import React from 'react';

export const MCQReviewCard: React.FC = () => {
  return (
    <div className="p-4 rounded-lg border border-border bg-surface space-y-2">
      <h4 className="text-sm font-semibold text-text-primary">MCQ Evidence Review</h4>
      <p className="text-xs text-text-secondary">Review response rationale and evidence vector scores.</p>
    </div>
  );
};

export default MCQReviewCard;
