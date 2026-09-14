import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/constants/routes';

interface ProtectedRouteProps {
  allowedRoles?: ('learner' | 'trainer' | 'admin')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Authenticating session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" replace />;
  }

  // Check onboarding for learners
  if (user.role === 'learner') {
    const isOnboardingRoute = location.pathname === ROUTES.LEARNER.ONBOARDING;
    if (!user.onboardingCompleted && !isOnboardingRoute) {
      return <Navigate to={ROUTES.LEARNER.ONBOARDING} replace />;
    }
    if (user.onboardingCompleted && isOnboardingRoute) {
      return <Navigate to={ROUTES.LEARNER.DASHBOARD} replace />;
    }
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect user to their role's natural landing page
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'trainer') return <Navigate to="/trainer/studio" replace />;
    return <Navigate to="/learner/dashboard" replace />;
  }

  return <Outlet />;
};
