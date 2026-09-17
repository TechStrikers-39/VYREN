import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/navigation/Sidebar';
import TopNavHeader from '@/components/navigation/TopNavHeader';
import { useTranslation } from '@/i18n';

export const TrainerLayout: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen bg-surface-alt text-text-primary font-sans antialiased">
      <Sidebar role="trainer" />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavHeader
          roleBadge={t('navigation.trainerRoleBadge', {}, 'Trainer / Assessor')}
          roleBadgeColor="bg-action-blue/10 text-action-blue border-action-blue/20"
          subTitle={t('navigation.trainerSubTitle', {}, 'Assessment Studio')}
        />
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default TrainerLayout;
