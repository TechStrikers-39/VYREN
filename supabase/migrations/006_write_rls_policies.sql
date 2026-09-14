-- ============================================================
-- VYREN — Migration 006: Write & Service Role RLS Policies
-- Run this in Supabase SQL Editor
-- Enables full service_role access + learner write access for own rows
-- ============================================================

-- Service role full access policies (bypasses RLS for backend API)
DROP POLICY IF EXISTS "Service role full access on profiles" ON public.profiles;
CREATE POLICY "Service role full access on profiles" ON public.profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on competency_scores" ON public.competency_scores;
CREATE POLICY "Service role full access on competency_scores" ON public.competency_scores FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on skill_gaps" ON public.skill_gaps;
CREATE POLICY "Service role full access on skill_gaps" ON public.skill_gaps FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on assessment_results" ON public.assessment_results;
CREATE POLICY "Service role full access on assessment_results" ON public.assessment_results FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on learning_paths" ON public.learning_paths;
CREATE POLICY "Service role full access on learning_paths" ON public.learning_paths FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on course_enrollments" ON public.course_enrollments;
CREATE POLICY "Service role full access on course_enrollments" ON public.course_enrollments FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on recommendations" ON public.recommendations;
CREATE POLICY "Service role full access on recommendations" ON public.recommendations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated learners write policies for own rows
DROP POLICY IF EXISTS "Learners can insert own scores" ON public.competency_scores;
CREATE POLICY "Learners can insert own scores" ON public.competency_scores FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Learners can update own scores" ON public.competency_scores;
CREATE POLICY "Learners can update own scores" ON public.competency_scores FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Learners can insert own gaps" ON public.skill_gaps;
CREATE POLICY "Learners can insert own gaps" ON public.skill_gaps FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Learners can update own gaps" ON public.skill_gaps;
CREATE POLICY "Learners can update own gaps" ON public.skill_gaps FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Learners can insert own results" ON public.assessment_results;
CREATE POLICY "Learners can insert own results" ON public.assessment_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Learners can insert own recommendations" ON public.recommendations;
CREATE POLICY "Learners can insert own recommendations" ON public.recommendations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
