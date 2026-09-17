import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/navigation/Sidebar';
import TopNavHeader from '@/components/navigation/TopNavHeader';
import { useTranslation } from '@/i18n';

export const LearnerLayout: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen bg-surface-alt text-text-primary font-sans antialiased">
      <Sidebar role="learner" />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavHeader
          roleBadge={t('navigation.learnerRoleBadge', {}, 'Statistical Officer / Learner')}
          roleBadgeColor="bg-primary-navy/10 text-primary-navy border-primary-navy/20"
          subTitle={t('navigation.learnerSubTitle', {}, 'Competency Intelligence')}
        />
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default LearnerLayout;
