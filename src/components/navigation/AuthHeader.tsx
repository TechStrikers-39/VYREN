import React from 'react';
import { Link } from 'react-router-dom';
import VyrenLogo from '../brand/VyrenLogo';

export const AuthHeader: React.FC = () => {
  return (
    <header
      className="fixed top-3.5 sm:top-5 md:top-6 inset-x-0 z-50 pointer-events-none px-4 sm:px-6 lg:px-8 transition-all duration-200"
      role="banner"
    >
      <div className="max-w-7xl mx-auto relative flex items-center justify-between">
        {/* ============================================================ */}
        {/* CAPSULE 01 — VYREN BRAND (Top-Left Anchor)                   */}
        {/* Floating brand capsule matching LandingNavbar specification   */}
        {/* ============================================================ */}
        <div className="pointer-events-auto shrink-0">
          <Link
            to="/"
            className="inline-flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 h-10 sm:h-11 md:h-12 bg-white/95 backdrop-blur-xs border border-border/90 shadow-xs hover:shadow-sm rounded-full transition-all duration-150 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-navy"
            aria-label="VYREN Home"
          >
            <VyrenLogo size="sm" />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default AuthHeader;
