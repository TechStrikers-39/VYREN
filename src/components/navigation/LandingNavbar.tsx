import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import VyrenLogo from '../brand/VyrenLogo';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/constants/routes';
import { useTranslation } from '@/i18n';
import LanguageSelector from '@/components/ui/LanguageSelector';
import { Menu, X, ArrowRight } from 'lucide-react';

interface NavItem {
  id: string;
  hash: string;
  labelKey: string;
  fallback: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', hash: '#overview', labelKey: 'navigation.overview', fallback: 'Overview' },
  { id: 'problem', hash: '#problem', labelKey: 'navigation.theParadox', fallback: 'The Paradox' },
  { id: 'how-it-works', hash: '#how-it-works', labelKey: 'navigation.howItWorks', fallback: 'How It Works' },
  { id: 'why-vyren', hash: '#why-vyren', labelKey: 'navigation.whyVyren', fallback: 'Why VYREN' },
];

export const LandingNavbar: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState<string>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Determine dashboard route based on authenticated role
  const getWorkspaceRoute = () => {
    if (!user) return ROUTES.AUTH.LOGIN;
    if (user.role === 'admin') return ROUTES.ADMIN.DASHBOARD;
    if (user.role === 'trainer') return ROUTES.TRAINER.STUDIO;
    return ROUTES.LEARNER.DASHBOARD;
  };

  // Scroll Spy to detect currently visible section
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;
      for (let i = NAV_ITEMS.length - 1; i >= 0; i--) {
        const item = NAV_ITEMS[i];
        const el = document.getElementById(item.id);
        if (el) {
          const top = el.offsetTop;
          if (scrollPosition >= top) {
            setActiveSection(item.id);
            return;
          }
        }
      }
      setActiveSection('overview');
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  // Smooth scroll handler for nav items
  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
      window.history.pushState(null, '', `/#${targetId}`);
      setActiveSection(targetId);
    } else {
      navigate(`/#${targetId}`);
    }
  };

  const handleBrandClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const overviewEl = document.getElementById('overview');
    if (overviewEl) {
      overviewEl.scrollIntoView({ behavior: 'smooth' });
      window.history.pushState(null, '', '/');
      setActiveSection('overview');
    } else {
      navigate('/');
    }
  };

  return (
    <header
      className="fixed top-3.5 sm:top-5 md:top-6 inset-x-0 z-50 pointer-events-none px-4 sm:px-6 lg:px-8 transition-all duration-200"
      role="banner"
    >
      <div className="max-w-7xl mx-auto relative flex items-center justify-between">
        {/* ============================================================ */}
        {/* CAPSULE 01 — VYREN BRAND (Top-Left Anchor)                   */}
        {/* ============================================================ */}
        <div className="pointer-events-auto shrink-0">
          <a
            href="/#overview"
            onClick={handleBrandClick}
            className="inline-flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 h-10 sm:h-11 md:h-12 bg-white/95 backdrop-blur-xs border border-border/90 shadow-xs hover:shadow-sm rounded-full transition-all duration-150 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-navy"
            aria-label="VYREN Home"
          >
            <VyrenLogo size="sm" />
          </a>
        </div>

        {/* ============================================================ */}
        {/* CAPSULE 02 — PRIMARY NAVIGATION (Horizontally Centered)      */}
        {/* Visible on desktops/large screens (lg+), hidden on mobile    */}
        {/* ============================================================ */}
        <nav
          className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center h-11 md:h-12 bg-white/95 backdrop-blur-xs border border-border/90 shadow-xs hover:shadow-sm rounded-full px-2 gap-1 pointer-events-auto transition-all duration-150 whitespace-nowrap"
          aria-label="Primary Navigation"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.id}
                href={item.hash}
                onClick={(e) => handleScrollTo(e, item.id)}
                className={`px-3 xl:px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'text-primary-navy bg-primary-navy/8 font-bold shadow-2xs'
                    : 'text-text-secondary hover:text-primary-navy hover:bg-surface-alt/70'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {t(item.labelKey, {}, item.fallback)}
              </a>
            );
          })}
        </nav>

        {/* ============================================================ */}
        {/* CAPSULE 03 — ACTIONS (Top-Right: Language | Sign In | Action) */}
        {/* ============================================================ */}
        <div
          ref={mobileMenuRef}
          className="relative flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 h-10 sm:h-11 md:h-12 bg-white/95 backdrop-blur-xs border border-border/90 shadow-xs hover:shadow-sm rounded-full pointer-events-auto transition-all duration-150 shrink-0"
        >
          {/* Language Selector in compact capsule style */}
          <LanguageSelector variant="capsule" />

          {isAuthenticated && user ? (
            <Link
              to={getWorkspaceRoute()}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-primary-navy text-on-primary text-xs font-semibold hover:bg-primary-navy/90 shadow-2xs transition-all duration-150 shrink-0"
            >
              <span className="max-w-[100px] sm:max-w-[120px] truncate">{user.name}</span>
              <ArrowRight className="w-3 h-3 shrink-0" />
            </Link>
          ) : (
            <>
              {/* Sign In (Visually quieter link, visible on xl/large desktop) */}
              <Link
                to={ROUTES.AUTH.LOGIN}
                className="hidden xl:inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-semibold text-text-secondary hover:text-primary-navy hover:bg-surface-alt/70 transition-colors duration-150"
              >
                {t('common.signIn', {}, 'Sign In')}
              </Link>

              {/* Get Started (Stronger navy primary button, visible on sm+) */}
              <Link
                to={ROUTES.AUTH.LOGIN}
                className="hidden sm:inline-flex items-center gap-1 px-3.5 lg:px-4 py-1.5 rounded-full bg-primary-navy text-on-primary text-xs font-semibold hover:bg-primary-navy/90 shadow-2xs transition-all duration-150 shrink-0"
              >
                <span>{t('common.getStarted', {}, 'Get Started')}</span>
              </Link>
            </>
          )}

          {/* Mobile/Tablet Menu Toggle Button (Visible on screens < lg) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-full text-text-secondary hover:text-primary-navy hover:bg-surface-alt transition-colors duration-150 ml-0.5"
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          {/* ========================================================== */}
          {/* MOBILE/TABLET NAVIGATION DRAWER (Below Capsules on < lg)   */}
          {/* ========================================================== */}
          {mobileMenuOpen && (
            <div
              className="lg:hidden absolute top-12 sm:top-14 right-0 w-64 bg-white/98 backdrop-blur-md border border-border shadow-lg rounded-2xl p-3 z-50 animate-in fade-in-0 zoom-in-95 duration-150 pointer-events-auto"
              role="dialog"
              aria-label="Mobile Navigation"
            >
              <div className="px-2 py-1 mb-1 border-b border-border/60 text-[10px] font-mono uppercase tracking-wider text-text-secondary/70">
                {t('navigation.sections', {}, 'Sections')}
              </div>

              <div className="flex flex-col gap-1">
                {NAV_ITEMS.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <a
                      key={item.id}
                      href={item.hash}
                      onClick={(e) => handleScrollTo(e, item.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors duration-150 flex items-center justify-between ${
                        isActive
                          ? 'text-primary-navy bg-primary-navy/8 font-bold'
                          : 'text-text-primary hover:bg-surface-alt'
                      }`}
                    >
                      <span>{t(item.labelKey, {}, item.fallback)}</span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary-navy" />}
                    </a>
                  );
                })}
              </div>

              {!isAuthenticated && (
                <div className="mt-3 pt-2 border-t border-border/60 flex flex-col gap-1.5">
                  <Link
                    to={ROUTES.AUTH.LOGIN}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center px-3 py-2 rounded-xl text-xs font-semibold text-text-primary hover:bg-surface-alt transition-colors"
                  >
                    {t('common.signIn', {}, 'Sign In')}
                  </Link>
                  <Link
                    to={ROUTES.AUTH.LOGIN}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center px-3 py-2 rounded-xl bg-primary-navy text-on-primary text-xs font-semibold hover:bg-primary-navy/90 transition-colors shadow-2xs"
                  >
                    {t('common.getStarted', {}, 'Get Started')}
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default LandingNavbar;
