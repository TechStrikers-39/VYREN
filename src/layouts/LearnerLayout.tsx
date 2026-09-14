import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/navigation/Sidebar';
import TopNavHeader from '@/components/navigation/TopNavHeader';

export const LearnerLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-surface-alt text-text-primary font-sans antialiased">
      <Sidebar role="learner" />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavHeader
          roleBadge="Government Official / Learner"
          roleBadgeColor="bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
          subTitle="MoSPI Competency Development Portal"
        />
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default LearnerLayout;
