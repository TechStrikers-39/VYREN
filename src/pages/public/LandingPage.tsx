import React from 'react';
import { HeroSection } from '@/components/landing/HeroSection';
import { ProblemSection } from '@/components/landing/ProblemSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { WhyVyrenSection } from '@/components/landing/WhyStatiqSection';
import { CtaSection } from '@/components/landing/CtaSection';

export const LandingPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-full">
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <WhyVyrenSection />
      <CtaSection />
    </div>
  );
};

export default LandingPage;
