import React from 'react';
import SpecularButton from '../ui/SpecularButton';
import VyrenLogo from '../brand/VyrenLogo';

export const Header: React.FC = () => {
  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50 bg-surface/90 backdrop-blur-md border-b border-border transition-all">
      <div className="h-16 max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a className="flex items-center gap-2.5 group" href="#" aria-label="VYREN">
            <VyrenLogo size="md" />
          </a>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-text-secondary">
          <a className="text-primary-navy font-semibold transition-colors" href="#overview">Overview</a>
          <a className="hover:text-primary-navy transition-colors" href="#problem">The Paradox</a>
          <a className="hover:text-primary-navy transition-colors" href="#how-it-works">How It Works</a>
          <a className="hover:text-primary-navy transition-colors" href="#why-vyren">Why VYREN</a>
        </nav>

        <div className="flex items-center gap-3">
          <a className="px-3.5 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary transition-colors" href="#">
            Sign In
          </a>
          <SpecularButton
            href="#how-it-works"
            variant="primary"
            size="sm"
            radius={8}
          >
            <span>Get Started</span>
          </SpecularButton>
        </div>
      </div>
    </header>
  );
};
