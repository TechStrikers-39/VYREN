import React from 'react';

export interface TaskStatusBadgeProps {
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export const TaskStatusBadge: React.FC<TaskStatusBadgeProps> = ({ status }) => {
  const styles = {
    pending: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    in_progress: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    completed: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    failed: 'bg-red-500/10 text-red-700 border-red-500/20',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${styles[status]}`}>
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
};

export default TaskStatusBadge;
