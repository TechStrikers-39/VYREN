import React from 'react';

export const WhyVyrenSection: React.FC = () => {
  return (
    <section className="w-full bg-surface py-20 lg:py-28 border-b border-border" id="why-vyren">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-2xl mb-14">
          <span className="font-mono text-xs uppercase text-action-blue font-bold tracking-wider">
            [ARCHITECTURAL CONTRAST]
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight mt-2 mb-3">
            VYREN doesn't just recommend courses.
          </h2>
          <p className="text-base sm:text-lg text-text-secondary leading-relaxed">
            Traditional enterprise training acts as a passive library. VYREN operates as an active competency engine.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Left: Conventional LMS */}
          <div className="p-8 rounded-2xl bg-surface border border-border shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
                <span className="font-mono text-xs font-semibold text-text-muted uppercase tracking-wider">
                  CONVENTIONAL TRAINING
                </span>
                <span className="px-2 py-0.5 rounded bg-surface-alt border border-border text-text-muted font-mono text-[11px]">
                  CATALOG-FIRST
                </span>
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-3">
                "Here are 4,000 courses. Search for what you think you need."
              </h3>
              <p className="text-sm text-text-secondary mb-6 leading-relaxed">
                Learners guess their own deficiencies based on subjective feeling. Systems measure video completion rather than proven applied capability.
              </p>
              <div className="space-y-4 text-sm text-text-secondary">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-critical-red text-lg shrink-0 mt-0.5">cancel</span>
                  <span><strong>Subjective self-reporting:</strong> Modules chosen at random without pre-diagnostic evidence.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-critical-red text-lg shrink-0 mt-0.5">cancel</span>
                  <span><strong>Zero diagnostic provenance:</strong> No paper trail explaining why a syllabus was mandated.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-critical-red text-lg shrink-0 mt-0.5">cancel</span>
                  <span><strong>Static completion badges:</strong> PDF certificates disconnected from actual job performance.</span>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-4 border-t border-border flex items-center justify-between font-mono text-xs text-text-muted">
              <span>METHODOLOGY</span>
              <span className="text-critical-red font-semibold">PASSIVE BROWSING</span>
            </div>
          </div>

          {/* Right: VYREN Intelligence */}
          <div className="p-8 rounded-2xl bg-surface border border-border border-t-4 border-t-primary-navy shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
                <span className="font-mono text-xs font-bold text-primary-navy uppercase tracking-wider">
                  VYREN INTELLIGENCE
                </span>
                <span className="px-2.5 py-0.5 rounded bg-primary-navy/10 border border-primary-navy/20 text-primary-navy font-mono text-[11px] font-semibold">
                  DIAGNOSTIC-FIRST
                </span>
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-3">
                "Here is your exact deficit, why it matters, and how to fix it."
              </h3>
              <p className="text-sm text-text-secondary mb-6 leading-relaxed">
                Objective psychometric telemetry isolates discrete skill gaps, dispatching targeted micro-interventions that adapt in real time.
              </p>
              <div className="space-y-3.5">
                <div className="p-3.5 rounded-xl bg-surface-alt border border-border">
                  <div className="text-[10px] font-mono text-critical-red font-bold uppercase mb-0.5">01 // PRECISE COMPETENCY GAP</div>
                  <div className="text-sm font-semibold text-text-primary">-1.40 Level Deficit in Stratified Sampling Variance</div>
                </div>
                <div className="p-3.5 rounded-xl bg-surface-alt border border-border">
                  <div className="text-[10px] font-mono text-primary-navy font-bold uppercase mb-0.5">02 // ROLE BENCHMARK RATIONALE</div>
                  <div className="text-sm font-semibold text-text-primary">Cadre Benchmark mandates L4.00 for primary field operations</div>
                </div>
                <div className="p-3.5 rounded-xl bg-surface-alt border border-border">
                  <div className="text-[10px] font-mono text-action-blue font-bold uppercase mb-0.5">03 // TARGETED INTERVENTION</div>
                  <div className="text-sm font-semibold text-text-primary">STAT-MOD-301: 45-minute focused unit resolving variance mechanics</div>
                </div>
                <div className="p-3.5 rounded-xl bg-surface-alt border border-border">
                  <div className="text-[10px] font-mono text-success-green font-bold uppercase mb-0.5">04 // VERIFIED PROOF OF MASTERY</div>
                  <div className="text-sm font-semibold text-text-primary">Empirical score recalibration (+0.80) upon interactive pass</div>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-4 border-t border-border flex items-center justify-between font-mono text-xs text-text-secondary">
              <span>METHODOLOGY</span>
              <span className="text-success-green font-semibold">100% EXPLAINABLE & VERIFIED</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
