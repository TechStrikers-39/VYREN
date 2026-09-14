import React from 'react';

export interface CourseCardProps {
  title: string;
  description: string;
  category: string;
  duration: string;
}

export const CourseCard: React.FC<CourseCardProps> = ({ title, description, category, duration }) => {
  return (
    <div className="p-5 rounded-xl border border-border bg-surface shadow-sm hover:shadow-md transition-shadow space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-alt border border-border text-text-secondary uppercase">{category}</span>
        <span className="text-xs font-mono text-text-secondary">{duration}</span>
      </div>
      <h4 className="text-base font-semibold text-text-primary">{title}</h4>
      <p className="text-sm text-text-secondary line-clamp-2">{description}</p>
    </div>
  );
};

export default CourseCard;
