import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/navigation/Sidebar';
import TopNavHeader from '@/components/navigation/TopNavHeader';

export const TrainerLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-surface-alt text-text-primary font-sans antialiased">
      <Sidebar role="trainer" />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavHeader
          roleBadge="Trainer / Assessor"
          roleBadgeColor="bg-blue-500/10 text-blue-700 border-blue-500/20"
          subTitle="Authoring & Cohort Analytics Studio"
        />
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default TrainerLayout;
