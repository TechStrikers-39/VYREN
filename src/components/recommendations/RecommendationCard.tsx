import React from 'react';

export interface RecommendationCardProps {
  title: string;
  description: string;
  matchScore: number;
  provider?: string;
  isExternal?: boolean;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  title,
  description,
  matchScore,
  provider = 'Local Catalog (FRAC Aligned)',
  isExternal = false,
}) => {
  return (
    <div className="p-5 rounded-xl border border-border bg-surface flex items-start justify-between gap-4">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-base font-semibold text-text-primary">{title}</h4>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-alt border border-border text-text-secondary">
            {provider}
          </span>
          {isExternal && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 font-bold">
              Live Gateway
            </span>
          )}
        </div>
        <p className="text-sm text-text-secondary">{description}</p>
      </div>
      <div className="shrink-0 px-3 py-1 rounded-full bg-primary-navy/10 text-primary-navy text-xs font-bold font-mono">
        {matchScore}% Match
      </div>
    </div>
  );
};

export default RecommendationCard;
