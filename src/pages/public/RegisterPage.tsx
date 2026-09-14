import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/constants/routes';
import VyrenLogo from '@/components/brand/VyrenLogo';
import { AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

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
    <div className="min-h-[calc(100vh-4rem)] py-10 px-4 sm:px-6 lg:px-8 max-w-xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex justify-center mb-2">
          <VyrenLogo size="lg" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
          Register New Account
        </h1>
        <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto">
          Create an official profile on the MoSPI Competency Intelligence Platform.
        </p>
      </div>

      <div className="p-6 sm:p-8 rounded-2xl border border-border bg-surface shadow-sm space-y-6">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-text-secondary mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-primary-navy"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-text-secondary mb-1">
              Official Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. priya.sharma@gov.in"
              className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-primary-navy"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-text-secondary mb-1">
              Password *
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-primary-navy"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-text-secondary mb-1">
              System Role *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('learner')}
                className={`p-3 rounded-xl border text-left text-xs transition min-w-0 overflow-hidden ${
                  role === 'learner'
                    ? 'border-primary-navy bg-primary-navy/5 text-primary-navy font-semibold ring-1 ring-primary-navy'
                    : 'border-border bg-surface-alt text-text-secondary'
                }`}
              >
                <div className="font-bold text-sm truncate">Government Official</div>
                <div className="text-[11px] text-text-secondary mt-0.5 truncate">Learner & Diagnostic Path</div>
              </button>
              <button
                type="button"
                onClick={() => setRole('trainer')}
                className={`p-3 rounded-xl border text-left text-xs transition min-w-0 overflow-hidden ${
                  role === 'trainer'
                    ? 'border-primary-navy bg-primary-navy/5 text-primary-navy font-semibold ring-1 ring-primary-navy'
                    : 'border-border bg-surface-alt text-text-secondary'
                }`}
              >
                <div className="font-bold text-sm truncate">Trainer / Assessor</div>
                <div className="text-[11px] text-text-secondary mt-0.5 truncate">MCQ Authoring & Cohorts</div>
              </button>
            </div>
            <p className="text-[11px] text-text-secondary/80 mt-1.5 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-amber-500" />
              Administrative roles cannot be self-registered; they require platform superadmin provisioning.
            </p>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-text-secondary mb-1">
              Organization / Ministry
            </label>
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-primary-navy"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase text-text-secondary mb-1">
                Department / Cadre
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-primary-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-text-secondary mb-1">
                Designation / Post
              </label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-primary-navy"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl bg-primary-navy text-on-primary font-semibold text-sm hover:opacity-95 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
          >
            {isSubmitting ? 'Creating profile...' : 'Create Account & Continue →'}
          </button>
        </form>

        <div className="text-center text-xs text-text-secondary pt-2 border-t border-border">
          Already registered?{' '}
          <Link to={ROUTES.AUTH.LOGIN} className="text-primary-navy font-semibold hover:underline">
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
