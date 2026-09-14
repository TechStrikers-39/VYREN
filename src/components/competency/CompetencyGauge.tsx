import React from 'react';

export interface CompetencyGaugeProps {
  label: string;
  score: number;
  confidence?: number;
}

export const CompetencyGauge: React.FC<CompetencyGaugeProps> = ({ label, score, confidence = 0.9 }) => {
  return (
    <div className="p-4 rounded-lg border border-border bg-surface flex flex-col gap-1">
      <span className="text-xs font-mono text-text-secondary uppercase">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-primary-navy">{score}%</span>
        <span className="text-xs text-text-secondary">({Math.round(confidence * 100)}% confidence)</span>
      </div>
    </div>
  );
};

export default CompetencyGauge;
