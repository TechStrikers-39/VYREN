import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from '@/components/navigation/Header';
import { Footer } from '@/components/navigation/Footer';
import { ROUTES } from '@/constants/routes';

export const PublicLayout: React.FC = () => {
  const location = useLocation();
  const isLanding = location.pathname === '/' || location.pathname === ROUTES.PUBLIC.HOME;
  const isLoginPage = location.pathname === ROUTES.AUTH.LOGIN || location.pathname === '/auth/login';

  return (
    <div className="flex flex-col min-h-screen bg-surface-alt text-text-primary font-sans">
      <Header />
      <main className={`flex-1 ${isLanding || isLoginPage ? 'pt-0' : 'pt-16'}`}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default PublicLayout;
