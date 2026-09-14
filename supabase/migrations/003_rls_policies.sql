-- ============================================================
-- VYREN — Migration 003: Row Level Security Policies
-- Run this after 002_create_indexes.sql
-- ============================================================
-- RULES:
-- Learners: read/write their OWN rows only
-- Trainers: read their cohort's data (same org) — via service role for now
-- Admins: org-wide read — via service role for now
-- Service role: bypasses RLS entirely (backend FastAPI)
-- ============================================================

-- ============================================================
-- PROFILES
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Learners can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- COMPETENCIES
-- All authenticated users can read competency definitions
-- Only service role (backend) can insert/update/delete
-- ============================================================
ALTER TABLE public.competencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view competencies"
  ON public.competencies FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================
-- COMPETENCY SCORES
-- ============================================================
ALTER TABLE public.competency_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners can view own scores"
  ON public.competency_scores FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- SKILL GAPS
-- ============================================================
ALTER TABLE public.skill_gaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners can view own gaps"
  ON public.skill_gaps FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- ASSESSMENTS
-- All authenticated users can read assessments
-- ============================================================
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view assessments"
  ON public.assessments FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================
-- ASSESSMENT ITEMS
-- All authenticated users can read items (correct_index filtered in API)
-- ============================================================
ALTER TABLE public.assessment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view assessment items"
  ON public.assessment_items FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================
-- ASSESSMENT RESULTS
-- Learners can only view their own results
-- ============================================================
ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners can view own results"
  ON public.assessment_results FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- COURSES
-- All authenticated users can view active courses
-- ============================================================
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active courses"
  ON public.courses FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = TRUE);

-- ============================================================
-- COURSE MODULES
-- All authenticated users can view modules
-- ============================================================
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view course modules"
  ON public.course_modules FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================
-- COURSE ENROLLMENTS
-- Learners can only view their own enrollments
-- ============================================================
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners can view own enrollments"
  ON public.course_enrollments FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- LEARNING PATHS
-- ============================================================
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners can view own learning paths"
  ON public.learning_paths FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- RECOMMENDATIONS
-- ============================================================
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners can view own recommendations"
  ON public.recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Learners can dismiss own recommendations"
  ON public.recommendations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
