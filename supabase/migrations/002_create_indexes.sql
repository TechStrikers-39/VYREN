-- ============================================================
-- VYREN — Migration 002: Create Indexes
-- Run this after 001_create_tables.sql
-- ============================================================

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles(role);

CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON public.profiles(email);

-- competency_scores
CREATE INDEX IF NOT EXISTS idx_competency_scores_user_id
  ON public.competency_scores(user_id);

CREATE INDEX IF NOT EXISTS idx_competency_scores_competency_id
  ON public.competency_scores(competency_id);

-- skill_gaps
CREATE INDEX IF NOT EXISTS idx_skill_gaps_user_id
  ON public.skill_gaps(user_id);

CREATE INDEX IF NOT EXISTS idx_skill_gaps_priority
  ON public.skill_gaps(user_id, priority);

-- assessment_items
CREATE INDEX IF NOT EXISTS idx_assessment_items_assessment_id
  ON public.assessment_items(assessment_id);

CREATE INDEX IF NOT EXISTS idx_assessment_items_competency_id
  ON public.assessment_items(competency_id);

-- assessment_results
CREATE INDEX IF NOT EXISTS idx_assessment_results_user_id
  ON public.assessment_results(user_id);

CREATE INDEX IF NOT EXISTS idx_assessment_results_user_assessment
  ON public.assessment_results(user_id, assessment_id);

CREATE INDEX IF NOT EXISTS idx_assessment_results_submitted_at
  ON public.assessment_results(submitted_at DESC);

-- course_modules
CREATE INDEX IF NOT EXISTS idx_course_modules_course_id
  ON public.course_modules(course_id);

CREATE INDEX IF NOT EXISTS idx_course_modules_order
  ON public.course_modules(course_id, order_index);

-- course_enrollments
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_id
  ON public.course_enrollments(user_id);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id
  ON public.course_enrollments(course_id);

-- learning_paths
CREATE INDEX IF NOT EXISTS idx_learning_paths_user_id
  ON public.learning_paths(user_id);

-- recommendations
CREATE INDEX IF NOT EXISTS idx_recommendations_user_id
  ON public.recommendations(user_id);

CREATE INDEX IF NOT EXISTS idx_recommendations_user_priority
  ON public.recommendations(user_id, priority)
  WHERE is_dismissed = FALSE;
