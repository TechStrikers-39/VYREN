import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/constants/routes';
import VyrenLogo from '@/components/brand/VyrenLogo';
import { AlertCircle, CheckCircle2, ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('SecurePassword123!');
  const [role, setRole] = useState<'learner' | 'trainer'>('learner');
  const [organization, setOrganization] = useState('Ministry of Statistics & Programme Implementation (MoSPI)');
  const [department, setDepartment] = useState('National Statistical Systems Training Academy (NSSTA)');
  const [designation, setDesignation] = useState('Junior Statistical Officer');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const user = await register({
        email,
        password,
        fullName,
        role,
        organization,
        department,
        designation,
      });

      if (user.role === 'trainer') {
        navigate(ROUTES.TRAINER.STUDIO, { replace: true });
      } else {
        navigate(ROUTES.LEARNER.ONBOARDING, { replace: true });
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-surface-alt flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex justify-center mb-1">
            <VyrenLogo size="lg" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-navy/5 border border-primary-navy/15 text-[11px] font-mono font-semibold text-primary-navy uppercase tracking-wider">
            <UserCheck className="w-3 h-3" />
            Official Profile Registration
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
            Register Official Account
          </h1>
          <p className="text-xs text-text-secondary max-w-md mx-auto leading-relaxed">
            Establish your statistical competency profile on the MoSPI &amp; NSSTA intelligence network.
          </p>
        </div>

        {/* Form Container */}
        <div className="p-6 sm:p-8 rounded-2xl border border-border bg-surface shadow-xs space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-semibold uppercase text-text-secondary mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Priya Sharma"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface-alt text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-action-blue focus:ring-1 focus:ring-action-blue focus:bg-surface transition shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold uppercase text-text-secondary mb-1.5">
                Official Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. priya.sharma@gov.in"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface-alt text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-action-blue focus:ring-1 focus:ring-action-blue focus:bg-surface transition shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold uppercase text-text-secondary mb-1.5">
                Password *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface-alt text-sm text-text-primary focus:outline-none focus:border-action-blue focus:ring-1 focus:ring-action-blue focus:bg-surface transition shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold uppercase text-text-secondary mb-1.5">
                System Role Intent *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setRole('learner')}
                  className={`p-3 rounded-xl border text-left transition ${
                    role === 'learner'
                      ? 'border-primary-navy bg-primary-navy/5 text-primary-navy ring-1 ring-primary-navy shadow-2xs font-semibold'
                      : 'border-border bg-surface-alt text-text-secondary hover:border-border-strong hover:bg-surface'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-text-primary">Government Official</span>
                    {role === 'learner' && <CheckCircle2 className="w-3.5 h-3.5 text-primary-navy" />}
                  </div>
                  <div className="text-[10px] text-text-secondary mt-0.5 font-mono">Statistical Cadre &amp; Diagnostic Path</div>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('trainer')}
                  className={`p-3 rounded-xl border text-left transition ${
                    role === 'trainer'
                      ? 'border-primary-navy bg-primary-navy/5 text-primary-navy ring-1 ring-primary-navy shadow-2xs font-semibold'
                      : 'border-border bg-surface-alt text-text-secondary hover:border-border-strong hover:bg-surface'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-text-primary">Trainer / Assessor</span>
                    {role === 'trainer' && <CheckCircle2 className="w-3.5 h-3.5 text-primary-navy" />}
                  </div>
                  <div className="text-[10px] text-text-secondary mt-0.5 font-mono">MCQ Authoring Studio &amp; Cohorts</div>
                </button>
              </div>
              <p className="text-[11px] text-text-secondary/80 mt-2 flex items-center gap-1.5 font-mono">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                Administrative roles require direct superadmin provisioning.
              </p>
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold uppercase text-text-secondary mb-1.5">
                Organization / Ministry
              </label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface-alt text-sm text-text-primary focus:outline-none focus:border-action-blue focus:ring-1 focus:ring-action-blue focus:bg-surface transition shadow-2xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono font-semibold uppercase text-text-secondary mb-1.5">
                  Department / Cadre
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface-alt text-sm text-text-primary focus:outline-none focus:border-action-blue focus:ring-1 focus:ring-action-blue focus:bg-surface transition shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-xs font-mono font-semibold uppercase text-text-secondary mb-1.5">
                  Designation / Post
                </label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface-alt text-sm text-text-primary focus:outline-none focus:border-action-blue focus:ring-1 focus:ring-action-blue focus:bg-surface transition shadow-2xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-primary-navy text-on-primary font-bold text-sm hover:bg-primary-navy/90 transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
            >
              {isSubmitting ? (
                <span>Registering profile...</span>
              ) : (
                <>
                  <span>Create Account &amp; Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-text-secondary pt-3 border-t border-border">
            Already registered?{' '}
            <Link to={ROUTES.AUTH.LOGIN} className="text-action-blue font-semibold hover:underline">
              Sign In Here
            </Link>
          </div>
        </div>

        {/* Security / Compliance Footnote */}
        <div className="text-center text-[11px] text-text-secondary/70 font-mono">
          MoSPI Cadre Administration &bull; National Statistical Systems Training Academy (NSSTA)
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
