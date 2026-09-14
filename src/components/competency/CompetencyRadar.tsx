import React from 'react';

export interface CompetencyRadarProps {
  className?: string;
}

export const CompetencyRadar: React.FC<CompetencyRadarProps> = ({ className = '' }) => {
  return (
    <div className={`p-6 rounded-xl border border-border bg-surface shadow-sm ${className}`}>
      <h3 className="text-base font-semibold text-text-primary mb-2">Competency Radar</h3>
      <p className="text-sm text-text-secondary">Multi-dimensional capability visualization across domain competencies.</p>
    </div>
  );
};

export default CompetencyRadar;
