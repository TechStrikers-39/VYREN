import React from 'react';

export const SkillGapHeatmap: React.FC = () => {
  return (
    <div className="p-6 rounded-xl border border-border bg-surface shadow-sm">
      <h3 className="text-base font-semibold text-text-primary mb-2">Skill Gap Heatmap</h3>
      <p className="text-sm text-text-secondary">Deterministic gap measurement comparing current vs target competency levels.</p>
    </div>
  );
};

export default SkillGapHeatmap;
