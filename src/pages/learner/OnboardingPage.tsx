import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/constants/routes';
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            Official Government Intake • Step {step} of 5
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Welcome to VYREN Competency Platform
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-xl mx-auto">
            Please provide your official statistical context. This configures your role-based baseline requirements and tailoring.
          </p>
        </div>

        {/* Informational Banner: Context != Measurement */}
        <div className="mb-6 p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-indigo-500/20">
            i
          </div>
          <div>
            <strong className="text-slate-200">Context Intake Notice:</strong> This intake customizes your role requirements and recommendations. In strict compliance with VYREN competency architecture, <span className="text-emerald-400 font-medium">context is distinct from measurement</span>; your verified competency levels are established only through diagnostic assessments.
          </div>
        </div>

        {/* Card Container */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
              {error}
            </div>
          )}

          {/* STEP 1: Department & Designation */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-white">1. Department & Official Designation</h2>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Ministry / Department / Cadre
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Ministry of Statistics and Programme Implementation (MoSPI)"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Designation / Post
                </label>
                <select
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 text-sm"
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
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Enter Exact Designation
                  </label>
                  <input
                    type="text"
                    value={customDesignation}
                    onChange={(e) => setCustomDesignation(e.target.value)}
                    placeholder="e.g. Joint Director (Economic Statistics)"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
                  />
                </div>
              )}

              <p className="text-xs text-slate-500">
                * Note: Standard MoSPI designations automatically link to designated competency requirement matrices.
              </p>
            </div>
          )}

          {/* STEP 2: Work Responsibilities */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <Target className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-white">2. Primary Responsibilities & Functional Domain</h2>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Describe Your Primary Statistical & Data Responsibilities
                </label>
                <textarea
                  rows={4}
                  value={responsibilities}
                  onChange={(e) => setResponsibilities(e.target.value)}
                  placeholder="e.g. Overseeing National Sample Survey (NSS) round execution, compiling Consumer Price Index (CPI), developing ML models for anomaly detection in economic census returns..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-xs text-slate-400 mr-2 self-center">Quick inserts:</span>
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
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
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
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <Wrench className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-white">3. Technical Tools & Technologies Used</h2>
              </div>

              <p className="text-xs text-slate-400">
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
                      className={`flex items-center justify-between p-3 rounded-xl border text-left text-sm transition ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-medium'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span>{tool}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Self-Reported Experience Level */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <BarChart2 className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-white">4. Self-Reported Technical Experience Level</h2>
              </div>

              <p className="text-xs text-slate-400">
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
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-white shadow-lg'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-emerald-400">{opt.label}</span>
                      {selfReportedLevel === opt.level && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <p className="text-xs text-slate-400">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: Target Competency Areas */}
          {step === 5 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <Target className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-white">5. Target Priority Competencies</h2>
              </div>

              <p className="text-xs text-slate-400">
                Choose the competencies you want your personalized iGOT Karmayogi learning path to focus on:
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
                          ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm text-white">{c.name}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <p className="text-xs text-slate-400">{c.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-8 mt-6 border-t border-slate-800">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition"
              >
                <ArrowLeft className="w-4 h-4" /> Previous
              </button>
            ) : (
              <div />
            )}

            {step < 5 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition shadow-lg"
              >
                Next Step <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold transition shadow-lg disabled:opacity-50"
              >
                {submitting ? 'Saving Profile...' : 'Complete Intake & Enter Dashboard'}
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
