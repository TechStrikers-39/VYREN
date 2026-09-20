import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import VyrenLogo from '../brand/VyrenLogo';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/constants/routes';
import { useTranslation } from '@/i18n';
import LanguageSelector from '@/components/ui/LanguageSelector';
import LandingNavbar from './LandingNavbar';
import AuthHeader from './AuthHeader';

export const Header: React.FC = () => {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();

  const isLanding = location.pathname === '/' || location.pathname === ROUTES.PUBLIC.HOME;
  if (isLanding) {
    return <LandingNavbar />;
  }

  const isLoginPage = location.pathname === ROUTES.AUTH.LOGIN || location.pathname === '/auth/login';
  if (isLoginPage) {
    return <AuthHeader />;
  }

  const getWorkspaceRoute = () => {
    if (!user) return ROUTES.AUTH.LOGIN;
    if (user.role === 'admin') return ROUTES.ADMIN.DASHBOARD;
    if (user.role === 'trainer') return ROUTES.TRAINER.STUDIO;
    return ROUTES.LEARNER.DASHBOARD;
  };

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50 bg-surface/90 backdrop-blur-md border-b border-border transition-all">
      <div className="h-16 max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 group" aria-label="VYREN">
            <VyrenLogo size="md" />
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-text-secondary">
          <a className="text-primary-navy font-semibold transition-colors" href="/#overview">
            {t('navigation.overview', {}, 'Overview')}
          </a>
          <a className="hover:text-primary-navy transition-colors" href="/#problem">
            {t('navigation.theParadox', {}, 'The Paradox')}
          </a>
          <a className="hover:text-primary-navy transition-colors" href="/#how-it-works">
            {t('navigation.howItWorks', {}, 'How It Works')}
          </a>
          <a className="hover:text-primary-navy transition-colors" href="/#why-vyren">
            {t('navigation.whyVyren', {}, 'Why VYREN')}
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSelector variant="compact" />

          {isAuthenticated && user ? (
            <Link
              to={getWorkspaceRoute()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-navy text-on-primary text-sm font-medium hover:opacity-95 transition-opacity"
            >
              <span>{user.name} ({user.role})</span>
              <span>→</span>
            </Link>
          ) : (
            <>
              <Link
                to={ROUTES.AUTH.LOGIN}
                className="px-3.5 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                {t('common.signIn', {}, 'Sign In')}
              </Link>
              <Link
                to={ROUTES.AUTH.LOGIN}
                className="px-4 py-2 rounded-lg bg-primary-navy text-on-primary font-medium text-sm hover:opacity-95 transition-opacity"
              >
                {t('common.getStarted', {}, 'Get Started')}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
