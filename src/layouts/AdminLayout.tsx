import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/navigation/Sidebar';
import TopNavHeader from '@/components/navigation/TopNavHeader';

export const AdminLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-surface-alt text-text-primary font-sans antialiased">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavHeader
          roleBadge="Platform Administrator"
          roleBadgeColor="bg-slate-700/10 text-slate-800 border-slate-700/20"
          subTitle="Workforce Intelligence"
        />
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
