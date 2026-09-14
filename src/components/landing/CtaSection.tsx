import React from 'react';
import SpecularButton from '../ui/SpecularButton';

export const CtaSection: React.FC = () => {
  return (
    <section className="w-full bg-primary-navy py-20 lg:py-24 relative overflow-hidden">
      {/* Minimal Architectural Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.04]"></div>
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10 text-center sm:text-left">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-white font-mono text-xs uppercase tracking-wider mb-6">
            <span className="w-2 h-2 rounded-full bg-action-blue"></span>
            OFFICIAL CADRE ACCESS
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl text-on-primary font-bold tracking-tight mb-4 leading-tight">
            Start with what you know. <br />
            Grow toward what you need.
          </h2>

          <p className="text-base sm:text-lg text-white/80 leading-relaxed mb-8 max-w-xl">
            Transition from speculative course browsing to empirical competency intelligence. Built specifically for institutional statistical rigor.
          </p>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
            <SpecularButton
              href="#how-it-works"
              size="md"
              baseColor="#1B3A6B"
              lineColor="#BFDBFE"
              tint="#1B3A6B"
              tintOpacity={1}
              intensity={0.95}
              shineSize={14}
              shineFade={38}
              thickness={1.0}
              speed={0.22}
              radius={9}
              proximity={260}
            >
              <span>Get Started</span>
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </SpecularButton>

            <a 
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-white/25 text-on-primary font-medium hover:bg-white/10 transition-colors text-sm sm:text-base" 
              href="#"
            >
              Sign In
            </a>
          </div>

          <div className="mt-12 pt-6 border-t border-white/15 flex flex-wrap items-center justify-center sm:justify-start gap-6 text-white/70 font-mono text-xs">
            <span>WCAG 2.1 AA COMPLIANT</span>
            <span>•</span>
            <span>SOVEREIGN CLOUD READY</span>
            <span>•</span>
            <span>GOV-GRADE AUDITABILITY</span>
          </div>
        </div>
      </div>
    </section>
  );
};
