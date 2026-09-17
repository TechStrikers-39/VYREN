import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/i18n';
import { ROUTES } from '@/constants/routes';
import GridScan from '@/components/ui/GridScan';
import { ShieldCheck, BookOpen, Wrench, BarChart2, Target, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';

const STANDARD_DESIGNATIONS = [
  'Assistant Director (Data Analytics)',
  'Junior Statistical Officer',
  'Senior Statistical Officer',
  'Data Governance Lead',
  'Statistical Investigator',
  'Deputy Director (Economics)',
  'Other / Custom Role',
];

const STANDARD_TOOLS = [
  'Python (pandas, numpy, scikit-learn)',
  'R / RStudio',
  'SPSS / SAS',
  'SQL / PostgreSQL',
  'Advanced Excel / VBA',
  'Power BI / Tableau',
  'Airflow / Data Pipelines',
  'Git / Version Control',
];

const TARGET_COMPETENCY_OPTIONS = [
  { id: 'c1000000-0000-0000-0000-000000000001', name: 'Statistical Inference & Sampling', desc: 'MoSPI National Survey sampling, hypothesis testing, survey estimators' },
  { id: 'c1000000-0000-0000-0000-000000000002', name: 'Data Pipeline Design & ETL', desc: 'Enterprise data pipelines, schema validation, data warehousing' },
  { id: 'c1000000-0000-0000-0000-000000000003', name: 'Machine Learning Operations (MLOps)', desc: 'Model deployment, pipeline monitoring, artifact tracking' },
  { id: 'c1000000-0000-0000-0000-000000000004', name: 'Data Governance & Compliance', desc: 'DPDP Act 2023 compliance, MoSPI data standards, privacy safeguards' },
];

export const OnboardingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, submitOnboarding } = useAuth();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [department, setDepartment] = useState(user?.department || 'National Statistical Systems Training Academy (NSSTA)');
  const [designation, setDesignation] = useState(user?.designation || 'Junior Statistical Officer');
  const [customDesignation, setCustomDesignation] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [selectedTools, setSelectedTools] = useState<string[]>(['Python (pandas, numpy, scikit-learn)', 'SQL / PostgreSQL']);
  const [selfReportedLevel, setSelfReportedLevel] = useState<number>(2);
  const [targetCompetencies, setTargetCompetencies] = useState<string[]>([
    'c1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000004',
  ]);

  const toggleTool = (tool: string) => {
    if (selectedTools.includes(tool)) {
      setSelectedTools(selectedTools.filter(t => t !== tool));
    } else {
      setSelectedTools([...selectedTools, tool]);
    }
  };

  const toggleCompetency = (id: string) => {
    if (targetCompetencies.includes(id)) {
      setTargetCompetencies(targetCompetencies.filter(c => c !== id));
    } else {
      setTargetCompetencies([...targetCompetencies, id]);
    }
  };

  const effectiveDesignation = designation === 'Other / Custom Role' ? customDesignation : designation;

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await submitOnboarding({
        department: department.trim(),
        designation: effectiveDesignation.trim() || 'Statistical Officer',
        responsibilities: responsibilities.trim() || 'Official statistical data management and analysis.',
        tools_experience: selectedTools,
        self_reported_level: selfReportedLevel,
        target_competencies: targetCompetencies,
      });

      navigate(ROUTES.LEARNER.DASHBOARD, { replace: true });
    } catch (err: any) {
      console.error('Onboarding failed:', err);
      setError(err.message || 'Failed to complete onboarding. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-alt text-text-primary flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Diagnostic GridScan Layer */}
      <GridScan
        linesColor="#1B3A6B"
        scanColor="#2563EB"
        scanOpacity={0.12}
        gridScale={0.14}
        lineThickness={0.8}
        scanDuration={4.5}
        scanDelay={2.5}
        lightMode={true}
      />

      {/* Central Radial Vignette Mask: Keeps form area quiet & 100% readable */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_45%,rgba(248,250,252,0.96)_30%,rgba(248,250,252,0.7)_100%)] z-0" />

      <div className="max-w-3xl mx-auto w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-navy/10 border border-primary-navy/20 text-primary-navy text-xs font-mono font-bold mb-3 uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            {t('onboarding.title')} • Step {step} of 5
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
            {t('onboarding.title')}
          </h1>
          <p className="mt-2 text-sm text-text-secondary max-w-xl mx-auto leading-relaxed">
            {t('onboarding.subtitle')}
          </p>
        </div>

        {/* 5-Step Progress Stepper */}
        <div className="flex items-center justify-between max-w-xl mx-auto mb-8 px-4">
          {[
            { num: 1, id: '01', label: t('onboarding.step1Title') },
            { num: 2, id: '02', label: t('onboarding.step2Title') },
            { num: 3, id: '03', label: t('onboarding.step3Title') },
            { num: 4, id: '04', label: t('onboarding.step4Title') },
            { num: 5, id: '05', label: t('onboarding.step5Title') },
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all duration-150 ${
                    step === s.num
                      ? 'bg-primary-navy text-on-primary ring-4 ring-primary-navy/20 shadow-xs'
                      : step > s.num
                      ? 'bg-action-blue text-white'
                      : 'bg-surface border border-border text-text-secondary'
                  }`}
                >
                  {step > s.num ? '✓' : s.id}
                </div>
                <span className={`text-[10px] font-mono tracking-wider uppercase ${step === s.num ? 'text-primary-navy font-bold' : 'text-text-secondary'}`}>
                  {s.label}
                </span>
              </div>
              {idx < 4 && (
                <div className={`flex-1 h-0.5 mx-2 -mt-4 transition-colors ${step > idx + 1 ? 'bg-action-blue' : 'bg-border'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Informational Banner: Context != Measurement */}
        <div className="mb-6 p-4 rounded-2xl bg-surface border border-border text-xs text-text-secondary flex items-start gap-3 shadow-2xs">
          <div className="w-5 h-5 rounded-full bg-action-blue/10 text-action-blue flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5 border border-action-blue/20">
            i
          </div>
          <div className="leading-relaxed">
            <strong className="text-text-primary font-semibold">Context Intake Notice:</strong> This intake customizes your role requirements and recommendations. In strict compliance with VYREN competency architecture, <span className="text-action-blue font-medium">context is distinct from measurement</span>; your verified competency levels are established solely through diagnostic assessments.
          </div>
        </div>

        {/* Main Form Surface Container */}
        <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* STEP 1: Department & Designation */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 border-b border-border pb-3">
                <BookOpen className="w-5 h-5 text-primary-navy" />
                <h2 className="text-lg font-bold text-text-primary">1. Department & Official Designation</h2>
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Ministry / Department / Cadre
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Ministry of Statistics and Programme Implementation (MoSPI)"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-alt border border-border text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-action-blue focus:ring-1 focus:ring-action-blue text-sm shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Designation / Post
                </label>
                <select
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-alt border border-border text-text-primary focus:outline-none focus:border-action-blue focus:ring-1 focus:ring-action-blue text-sm shadow-2xs"
                >
                  {STANDARD_DESIGNATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {designation === 'Other / Custom Role' && (
                <div>
                  <label className="block text-xs font-mono font-semibold text-text-secondary uppercase tracking-wider mb-2">
                    Enter Exact Designation
                  </label>
                  <input
                    type="text"
                    value={customDesignation}
                    onChange={(e) => setCustomDesignation(e.target.value)}
                    placeholder="e.g. Joint Director (Economic Statistics)"
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-alt border border-border text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-action-blue focus:ring-1 focus:ring-action-blue text-sm shadow-2xs"
                  />
                </div>
              )}

              <p className="text-xs text-text-secondary/80 font-mono">
                * Note: Standard MoSPI designations automatically link to designated competency requirement matrices.
              </p>
            </div>
          )}

          {/* STEP 2: Work Responsibilities */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 border-b border-border pb-3">
                <Target className="w-5 h-5 text-primary-navy" />
                <h2 className="text-lg font-bold text-text-primary">2. Primary Responsibilities & Functional Domain</h2>
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Describe Your Primary Statistical & Data Responsibilities
                </label>
                <textarea
                  rows={4}
                  value={responsibilities}
                  onChange={(e) => setResponsibilities(e.target.value)}
                  placeholder="e.g. Overseeing National Sample Survey (NSS) round execution, compiling Consumer Price Index (CPI), developing data pipelines for economic census returns..."
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-alt border border-border text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-action-blue focus:ring-1 focus:ring-action-blue text-sm shadow-2xs"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-xs text-text-secondary mr-2 self-center font-mono">Quick inserts:</span>
                {[
                  'National Accounts Compilation',
                  'Sample Survey Design & Stratification',
                  'Price Index & Inflation Tracking',
                  'Administrative Data Governance',
                  'Automated Pipeline Validation',
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setResponsibilities(prev => prev ? `${prev}, ${tag}` : tag)}
                    className="px-2.5 py-1 rounded-lg bg-surface-alt hover:bg-surface border border-border text-text-secondary hover:text-text-primary text-xs transition shadow-2xs"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Current Technical Tools */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 border-b border-border pb-3">
                <Wrench className="w-5 h-5 text-primary-navy" />
                <h2 className="text-lg font-bold text-text-primary">3. Technical Tools & Technologies Used</h2>
              </div>

              <p className="text-xs text-text-secondary">
                Select the analytical tools and platforms you currently work with or have basic familiarity with:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {STANDARD_TOOLS.map((tool) => {
                  const isSelected = selectedTools.includes(tool);
                  return (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => toggleTool(tool)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border text-left text-sm transition ${
                        isSelected
                          ? 'bg-primary-navy/5 border-primary-navy text-primary-navy font-semibold ring-1 ring-primary-navy shadow-2xs'
                          : 'bg-surface-alt border-border text-text-secondary hover:border-border-strong hover:bg-surface'
                      }`}
                    >
                      <span>{tool}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-primary-navy shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Self-Reported Experience Level */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 border-b border-border pb-3">
                <BarChart2 className="w-5 h-5 text-primary-navy" />
                <h2 className="text-lg font-bold text-text-primary">4. Self-Reported Technical Experience Level</h2>
              </div>

              <p className="text-xs text-text-secondary">
                Indicate your general comfort level with automated data workflows and statistical computation:
              </p>

              <div className="space-y-3 pt-2">
                {[
                  { level: 1, label: 'Level 1: Foundational / Novice', desc: 'Familiar with basic concepts, spreadsheets, and routine manual reports.' },
                  { level: 2, label: 'Level 2: Intermediate / Operational', desc: 'Regularly execute SQL queries, write structured scripts, or conduct standard statistical tests.' },
                  { level: 3, label: 'Level 3: Advanced / Specialized', desc: 'Design automated pipelines, validate sampling algorithms, or architect analytics solutions.' },
                  { level: 4, label: 'Level 4: Expert / Master', desc: 'Formulate ministry data governance policies, lead enterprise data architecture, or train officers.' },
                ].map((opt) => (
                  <button
                    key={opt.level}
                    type="button"
                    onClick={() => setSelfReportedLevel(opt.level)}
                    className={`w-full p-4 rounded-xl border text-left transition ${
                      selfReportedLevel === opt.level
                        ? 'bg-primary-navy/5 border-primary-navy text-text-primary ring-1 ring-primary-navy shadow-xs'
                        : 'bg-surface-alt border-border text-text-secondary hover:border-border-strong hover:bg-surface'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-bold text-sm ${selfReportedLevel === opt.level ? 'text-primary-navy' : 'text-text-primary'}`}>
                        {opt.label}
                      </span>
                      {selfReportedLevel === opt.level && <CheckCircle2 className="w-4 h-4 text-primary-navy" />}
                    </div>
                    <p className="text-xs text-text-secondary">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: Target Competency Areas */}
          {step === 5 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 border-b border-border pb-3">
                <Target className="w-5 h-5 text-primary-navy" />
                <h2 className="text-lg font-bold text-text-primary">5. Target Priority Competencies</h2>
              </div>

              <p className="text-xs text-text-secondary">
                Choose the competencies you want your personalized iGOT Karmayogi learning path to prioritize:
              </p>

              <div className="space-y-3 pt-2">
                {TARGET_COMPETENCY_OPTIONS.map((c) => {
                  const isSelected = targetCompetencies.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCompetency(c.id)}
                      className={`w-full p-4 rounded-xl border text-left transition ${
                        isSelected
                          ? 'bg-primary-navy/5 border-primary-navy text-text-primary ring-1 ring-primary-navy shadow-xs'
                          : 'bg-surface-alt border-border text-text-secondary hover:border-border-strong hover:bg-surface'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-text-primary">{c.name}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-primary-navy" />}
                      </div>
                      <p className="text-xs text-text-secondary">{c.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-border">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-alt text-text-secondary text-sm font-semibold transition shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4" /> {t('common.previous')}
              </button>
            ) : (
              <div />
            )}

            {step < 5 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-navy hover:bg-primary-navy/90 text-on-primary text-sm font-bold transition shadow-xs"
              >
                {t('common.next')} <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-navy hover:bg-primary-navy/90 text-on-primary text-sm font-bold transition shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Saving Profile...' : t('onboarding.completeIntakeBtn')}
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
