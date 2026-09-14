import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { APP_CONFIG } from '@/config/appConfig';
import { ROUTES } from '@/constants/routes';

export const OAuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { handleOAuthToken } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function processOAuth() {
      try {
        const hash = window.location.hash.replace(/^#/, '');
        const search = window.location.search.replace(/^\?/, '');
        const hashParams = new URLSearchParams(hash);
        const searchParams = new URLSearchParams(search);

        const errorParam =
          hashParams.get('error_description') ||
          hashParams.get('error') ||
          searchParams.get('error_description') ||
          searchParams.get('error');
        if (errorParam) {
          setError(decodeURIComponent(errorParam));
          return;
        }

        const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
        if (!accessToken) {
          setError('No access token received from authentication provider. Please try signing in again.');
          return;
        }

        localStorage.setItem(APP_CONFIG.tokenKey, accessToken);
        const user = await handleOAuthToken(accessToken);

        if (user.role === 'admin') {
          navigate(ROUTES.ADMIN.DASHBOARD, { replace: true });
        } else if (user.role === 'trainer') {
          navigate(ROUTES.TRAINER.STUDIO, { replace: true });
        } else {
          if (!user.onboardingCompleted) {
            navigate(ROUTES.LEARNER.ONBOARDING, { replace: true });
          } else {
            navigate(ROUTES.LEARNER.DASHBOARD, { replace: true });
          }
        }
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setError(err.message || 'Failed to authenticate session.');
      }
    }

    processOAuth();
  }, [handleOAuthToken, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900 border border-rose-800/40 text-center shadow-2xl">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold text-xl border border-rose-500/20">
            !
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Authentication Failed</h2>
          <p className="text-sm text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => navigate(ROUTES.AUTH.LOGIN, { replace: true })}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition text-sm"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        <p className="text-sm font-medium text-slate-300">Completing secure authentication...</p>
        <p className="text-xs text-slate-500">Establishing session with VYREN...</p>
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
