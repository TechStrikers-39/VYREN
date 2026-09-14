import React from 'react';

export const ProblemSection: React.FC = () => {
  return (
    <section className="w-full bg-surface py-20 lg:py-28 border-b border-border" id="problem">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-3xl mb-12 lg:mb-14">
          <span className="font-mono text-xs uppercase text-action-blue font-semibold tracking-wider">
            [THE UP-SKILLING PARADOX]
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight mt-2 mb-4">
            Finding a course is easy. <br className="hidden sm:inline" />
            Knowing what you actually need is harder.
          </h2>
          <p className="text-base sm:text-lg text-text-secondary leading-relaxed">
            Generic LMS catalogs offer thousands of broad lectures. Without objective diagnostic measurement, workforce learning is speculative—trainees waste dozens of hours re-studying concepts they already know while critical operational deficits remain unaddressed.
          </p>
        </div>

        {/* 4-Step Pipeline Diagnostic Graphic */}
        <div className="bg-surface-alt rounded-2xl border border-border p-6 lg:p-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 relative">
            {/* Step 1 */}
            <div className="flex flex-col bg-surface p-5 rounded-xl border border-border shadow-sm transition-all duration-200 hover:border-border-strong">
              <div className="flex items-center justify-between text-text-muted font-mono text-[11px] mb-3">
                <span>STAGE 01</span>
                <span className="px-1.5 py-0.5 rounded bg-surface-alt border border-border text-text-secondary font-semibold">BASELINE</span>
              </div>
              <h3 className="text-sm font-bold text-text-primary mb-1">Evaluated Level</h3>
              <p className="text-xs text-text-secondary mb-4 leading-relaxed">
                Objective competency baseline derived from diagnostic item-response evaluation.
              </p>
              <div className="mt-auto pt-3 border-t border-border flex items-baseline justify-between">
                <span className="font-mono text-2xl font-bold text-text-primary">2.60</span>
                <span className="font-mono text-[11px] text-warning-amber font-semibold">Developing</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col bg-surface p-5 rounded-xl border border-border shadow-sm transition-all duration-200 hover:border-border-strong">
              <div className="flex items-center justify-between text-text-muted font-mono text-[11px] mb-3">
                <span>STAGE 02</span>
                <span className="px-1.5 py-0.5 rounded bg-surface-alt border border-border text-primary-navy font-semibold">BENCHMARK</span>
              </div>
              <h3 className="text-sm font-bold text-text-primary mb-1">Benchmark Target</h3>
              <p className="text-xs text-text-secondary mb-4 leading-relaxed">
                Authoritative capability threshold required for official cadre designation.
              </p>
              <div className="mt-auto pt-3 border-t border-border flex items-baseline justify-between">
                <span className="font-mono text-2xl font-bold text-primary-navy">4.00</span>
                <span className="font-mono text-[11px] text-primary-navy font-semibold">Cadre Target</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col bg-surface p-5 rounded-xl border border-border border-l-4 border-l-critical-red shadow-sm transition-all duration-200 hover:border-border-strong">
              <div className="flex items-center justify-between text-text-muted font-mono text-[11px] mb-3">
                <span>STAGE 03</span>
                <span className="px-1.5 py-0.5 rounded bg-critical-surface border border-critical-border text-critical-red font-semibold">DELTA</span>
              </div>
              <h3 className="text-sm font-bold text-text-primary mb-1">Diagnosed Deficit</h3>
              <p className="text-xs text-text-secondary mb-4 leading-relaxed">
                Mathematical gap isolated specifically in Multi-Stage Stratified Sampling.
              </p>
              <div className="mt-auto pt-3 border-t border-border flex items-baseline justify-between">
                <span className="font-mono text-2xl font-bold text-critical-red">-1.40</span>
                <span className="font-mono text-[11px] text-critical-red font-semibold">Isolated Gap</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col bg-surface p-5 rounded-xl border border-border border-l-4 border-l-action-blue shadow-sm transition-all duration-200 hover:border-border-strong">
              <div className="flex items-center justify-between text-text-muted font-mono text-[11px] mb-3">
                <span>STAGE 04</span>
                <span className="px-1.5 py-0.5 rounded bg-surface-container-low border border-border text-action-blue font-semibold">ACTION</span>
              </div>
              <h3 className="text-sm font-bold text-text-primary mb-1">Prescribed Focus</h3>
              <p className="text-xs text-text-secondary mb-4 leading-relaxed">
                Targeted micro-syllabus synthesized specifically to remediate the isolated deficit.
              </p>
              <div className="mt-auto pt-3 border-t border-border flex items-baseline justify-between">
                <span className="font-mono text-base font-bold text-action-blue">STAT-MOD-301</span>
                <span className="font-mono text-[11px] text-success-green font-semibold">0 Waste</span>
              </div>
            </div>
          </div>

          {/* Bottom Summary Strip */}
          <div className="mt-6 pt-5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-text-secondary">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-action-blue text-base shrink-0">precision_manufacturing</span>
              <span>VYREN replaces subjective self-assessment with deterministic delta calculus.</span>
            </div>
            <span className="text-primary-navy font-semibold shrink-0">Zero Speculative Learning</span>
          </div>
        </div>
      </div>
    </section>
  );
};
