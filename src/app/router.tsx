import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';

import PublicLayout from '@/layouts/PublicLayout';
import LearnerLayout from '@/layouts/LearnerLayout';
import TrainerLayout from '@/layouts/TrainerLayout';
import AdminLayout from '@/layouts/AdminLayout';
import { ProtectedRoute } from '@/components/navigation/ProtectedRoute';

import LandingPage from '@/pages/public/LandingPage';
import RegisterPage from '@/pages/public/RegisterPage';
import LoginPage from '@/pages/auth/LoginPage';
import OAuthCallbackPage from '@/pages/auth/OAuthCallbackPage';
import OnboardingPage from '@/pages/learner/OnboardingPage';

import LearnerDashboardPage from '@/pages/learner/DashboardPage';
import LearningPathPage from '@/pages/learner/LearningPathPage';
import CourseDetailPage from '@/pages/learner/CourseDetailPage';
import AssessmentPage from '@/pages/learner/AssessmentPage';
import AssessmentResultPage from '@/pages/learner/AssessmentResultPage';
import ProfilePage from '@/pages/learner/ProfilePage';
import AssistantPage from '@/pages/learner/AssistantPage';

import TrainerStudioPage from '@/pages/trainer/StudioPage';
import TrainerAnalyticsPage from '@/pages/trainer/AnalyticsPage';

import AdminDashboardPage from '@/pages/admin/DashboardPage';
import AdminTrainingPage from '@/pages/admin/TrainingPage';
import AdminLearnersPage from '@/pages/admin/LearnersPage';
import AdminSettingsPage from '@/pages/admin/SettingsPage';

const router = createBrowserRouter([
  {
    path: ROUTES.PUBLIC.HOME,
    element: <PublicLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: ROUTES.PUBLIC.REGISTER, element: <RegisterPage /> },
      { path: ROUTES.AUTH.LOGIN, element: <LoginPage /> },
      { path: '/auth/login', element: <LoginPage /> },
      { path: ROUTES.AUTH.CALLBACK, element: <OAuthCallbackPage /> },
      { path: '/auth/callback', element: <OAuthCallbackPage /> },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={['learner']} />,
    children: [
      { path: ROUTES.LEARNER.ONBOARDING, element: <OnboardingPage /> },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={['learner', 'trainer', 'admin']} />,
    children: [
      {
        path: '/learner',
        element: <LearnerLayout />,
        children: [
          { path: 'dashboard', element: <LearnerDashboardPage /> },
          { path: 'learning-path', element: <LearningPathPage /> },
          { path: 'course/:courseId', element: <CourseDetailPage /> },
          { path: 'assessment/:assessmentId', element: <AssessmentPage /> },
          { path: 'assessment/:assessmentId/result', element: <AssessmentResultPage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'assistant', element: <AssistantPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={['trainer', 'admin']} />,
    children: [
      {
        path: '/trainer',
        element: <TrainerLayout />,
        children: [
          { path: 'studio', element: <TrainerStudioPage /> },
          { path: 'analytics', element: <TrainerAnalyticsPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={['admin']} />,
    children: [
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          { path: 'dashboard', element: <AdminDashboardPage /> },
          { path: 'training', element: <AdminTrainingPage /> },
          { path: 'learners', element: <AdminLearnersPage /> },
          { path: 'settings', element: <AdminSettingsPage /> },
        ],
      },
    ],
  },
]);

export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
