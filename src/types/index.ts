export type Role = 'learner' | 'trainer' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  organization?: string;
  department?: string;
  designation?: string;
  avatarUrl?: string;
  responsibilities?: string;
  toolsExperience?: string[];
  selfReportedLevel?: number;
  targetCompetencies?: string[];
  onboardingCompleted?: boolean;
}

export interface Competency {
  id: string;
  name: string;
  category: string;
  description: string;
  currentLevel: number;
  targetLevel: number;
}

export interface CompetencyScore {
  competencyId: string;
  competencyName: string;
  score: number; // 0 - 100
  confidence: number; // 0 - 1
  measuredLevel?: number;
  lastAssessed: string;
}

export interface SkillGap {
  competencyId: string;
  competencyName: string;
  currentLevel: number;
  requiredLevel: number;
  gapSize: number;
  priority: 'low' | 'medium' | 'high' | 'critical' | 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  type: 'course' | 'assessment' | 'practice' | 'resource';
  targetCompetency: string;
  estimatedDuration: string;
  matchScore: number;
  priority?: string;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  totalModules: number;
  completedModules: number;
  progress: number;
  targetCompetencies: string[];
}

export interface LearningPathStepData {
  id: string;
  title: string;
  category: string;
  duration: string;
  status: 'completed' | 'in_progress' | 'upcoming' | 'recommended';
  description: string;
  link: string;
  action_text: string;
  course_id?: string | null;
  module_id?: string | null;
  competency_id?: string | null;
  competency_name?: string | null;
  provider?: string | null;
  integration_mode?: string | null;
}

export interface LearningPathData {
  learner_id: string;
  learner_name: string;
  completion_percentage: number;
  total_steps: number;
  completed_steps: number;
  active_step_id?: string | null;
  steps: LearningPathStepData[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  duration: string;
  thumbnail?: string;
  competenciesCovered: string[];
}

export interface Question {
  id: string;
  prompt: string;
  options: string[];
  correctOptionIndex?: number;
  explanation?: string;
}

export interface Assessment {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  questionsCount: number;
  competenciesEvaluated: string[];
}

export interface TopRecommendation {
  rank: number;
  competency_name: string;
  course_title: string;
  course_id: string | null;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  current_level: number;
  required_level: number;
  gap_size: number;
}

export interface AssessmentResult {
  id: string;
  assessmentId: string;
  score: number;
  passed: boolean;
  completedAt: string;
  competencyBreakdown: Record<string, any>;
  itemLog?: any[];
  resultingGaps?: any[];
  topRecommendation?: TopRecommendation | null;
}
