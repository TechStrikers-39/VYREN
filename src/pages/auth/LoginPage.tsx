import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/constants/routes';
import VyrenLogo from '@/components/brand/VyrenLogo';
import { Shield, GraduationCap, BarChart3, AlertCircle, Info } from 'lucide-react';

type PersonaType = 'learner' | 'trainer' | 'admin';

const PERSONA_CONFIG: Record<PersonaType, { label: string; icon: any; defaultEmail: string; hint: string }> = {
  learner: {
    label: 'Government Official',
    icon: BarChart3,
    defaultEmail: 'alex.vance@gmail.com',
    hint: 'MoSPI Statistical Officer',
  },
  trainer: {
    label: 'Trainer / Assessor',
    icon: GraduationCap,
    defaultEmail: 'vyren.trainer@gmail.com',
    hint: 'Capacity Building Commission',
  },
  admin: {
    label: 'Administrator',
    icon: Shield,
    defaultEmail: 'vyren.admin@gmail.com',
    hint: 'System Telemetry & Matrix',
  },
};

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, login, googleLogin, logout } = useAuth();

  const [selectedPersona, setSelectedPersona] = useState<PersonaType>('learner');
  const [email, setEmail] = useState('alex.vance@gmail.com');
  const [password, setPassword] = useState('SecurePassword123!');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [roleMismatchNotice, setRoleMismatchNotice] = useState<string | null>(null);

  const handlePersonaSelect = (persona: PersonaType) => {
    setSelectedPersona(persona);
    setEmail(PERSONA_CONFIG[persona].defaultEmail);
    if (persona === 'trainer') setPassword('TrainerPassword123!');
    else if (persona === 'admin') setPassword('AdminPassword123!');
    else setPassword('SecurePassword123!');
  };

  const routeByRole = (authenticatedRole: string, onboardingCompleted?: boolean) => {
    if (authenticatedRole === 'admin') {
      navigate(ROUTES.ADMIN.DASHBOARD);
    } else if (authenticatedRole === 'trainer') {
      navigate(ROUTES.TRAINER.STUDIO);
    } else {
      if (!onboardingCompleted) {
        navigate(ROUTES.LEARNER.ONBOARDING);
      } else {
        navigate(ROUTES.LEARNER.DASHBOARD);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setRoleMismatchNotice(null);
    setIsSubmitting(true);

    try {
      const authenticatedUser = await login(email, password);

      // Verify selected persona vs verified database role
      if (authenticatedUser.role !== selectedPersona) {
        setRoleMismatchNotice(
          `Security Notice: You selected "${PERSONA_CONFIG[selectedPersona].label}", but your authenticated account is registered as "${authenticatedUser.role.toUpperCase()}". Redirecting to your authorized workspace...`
        );
        setTimeout(() => {
          routeByRole(authenticatedUser.role, authenticatedUser.onboardingCompleted);
        }, 1200);
      } else {
        routeByRole(authenticatedUser.role, authenticatedUser.onboardingCompleted);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Invalid email or password. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await googleLogin();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Google OAuth is currently initializing. Please sign in with email credentials.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] py-10 px-4 sm:px-6 lg:px-8 max-w-xl mx-auto space-y-8">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex justify-center mb-2">
          <VyrenLogo size="lg" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
          Sign In to VYREN Platform
        </h1>
        <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto">
          MoSPI Competency Intelligence Platform. Select your role intent below and authenticate.
        </p>
      </div>

      {/* Active Session Notice */}
      {isAuthenticated && user && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-left">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
              ✓
            </div>
            <div>
              <p className="text-xs font-semibold text-text-primary">
                Signed In: <span className="text-emerald-700">{user.name}</span> ({user.role})
              </p>
              <p className="text-[11px] text-text-secondary truncate">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => routeByRole(user.role, user.onboardingCompleted)}
              className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-primary-navy text-on-primary text-xs font-semibold hover:opacity-95"
            >
              Open Workspace →
            </button>
            <button
              onClick={() => logout()}
              className="px-2.5 py-1.5 rounded-lg border border-border text-text-secondary text-xs hover:bg-surface-alt"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Main Authentication Container */}
      <div className="p-6 sm:p-8 rounded-2xl border border-border bg-surface shadow-sm space-y-6">
        {/* Compact Persona Selector */}
        <div>
          <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-text-secondary mb-2.5">
            Who are you? (Role Intent)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {(Object.keys(PERSONA_CONFIG) as PersonaType[]).map((p) => {
              const cfg = PERSONA_CONFIG[p];
              const Icon = cfg.icon;
              const isSelected = selectedPersona === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePersonaSelect(p)}
                  className={`p-3 rounded-xl border text-left transition flex sm:flex-col items-center sm:items-start gap-2.5 sm:gap-1.5 min-w-0 w-full overflow-hidden ${
                    isSelected
                      ? 'border-primary-navy bg-primary-navy/5 text-text-primary ring-1 ring-primary-navy'
                      : 'border-border bg-surface-alt text-text-secondary hover:border-text-secondary/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-primary-navy' : 'text-text-secondary'}`} />
                  <div className="min-w-0 w-full">
                    <span className="text-xs font-bold block truncate">{cfg.label.split('/')[0].trim()}</span>
                    <span className="text-[10px] text-text-secondary block truncate leading-normal" title={cfg.hint}>
                      {cfg.hint}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Continue with Google */}
        <div>
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full py-2.5 px-4 rounded-xl border border-border bg-surface hover:bg-surface-alt text-text-primary text-xs sm:text-sm font-semibold flex items-center justify-center gap-2.5 transition shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-surface px-2 text-text-secondary font-mono text-[10px]">
              or sign in with password
            </span>
          </div>
        </div>

        {/* Error / Alert Banners */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {roleMismatchNotice && (
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 text-xs flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>{roleMismatchNotice}</span>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-text-secondary mb-1">
              Work Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. officer@mospi.gov.in"
              className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-primary-navy"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-text-secondary mb-1">
              Password
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl bg-primary-navy text-on-primary font-semibold text-sm hover:opacity-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span>Authenticating session...</span>
            ) : (
              <span>Sign In to {PERSONA_CONFIG[selectedPersona].label.split('/')[0]} →</span>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-text-secondary pt-2 border-t border-border">
          Need a new learner or trainer account?{' '}
          <Link to={ROUTES.PUBLIC.REGISTER} className="text-primary-navy font-semibold hover:underline">
            Register Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
