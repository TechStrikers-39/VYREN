export const ROUTES = {
  PUBLIC: {
    HOME: '/',
    REGISTER: '/register',
  },
  AUTH: {
    LOGIN: '/login',
    CALLBACK: '/auth/callback',
  },
  LEARNER: {
    ONBOARDING: '/learner/onboarding',
    DASHBOARD: '/learner/dashboard',
    LEARNING_PATH: '/learner/learning-path',
    COURSE: (courseId = ':courseId') => `/learner/course/${courseId}`,
    ASSESSMENT: (assessmentId = ':assessmentId') => `/learner/assessment/${assessmentId}`,
    ASSESSMENT_RESULT: (assessmentId = ':assessmentId') => `/learner/assessment/${assessmentId}/result`,
    PROFILE: '/learner/profile',
    ASSISTANT: '/learner/assistant',
  },
  TRAINER: {
    STUDIO: '/trainer/studio',
    ANALYTICS: '/trainer/analytics',
  },
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    TRAINING: '/admin/training',
    LEARNERS: '/admin/learners',
    SETTINGS: '/admin/settings',
  },
} as const;
