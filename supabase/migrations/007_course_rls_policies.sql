-- ============================================================
-- VYREN — Migration 007: Course Enrollments RLS Policies
-- Run this in Supabase SQL Editor
-- Enables authenticated learners to insert and update their own course enrollments
-- ============================================================

DROP POLICY IF EXISTS "Learners can insert own enrollments" ON public.course_enrollments;
CREATE POLICY "Learners can insert own enrollments" ON public.course_enrollments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Learners can update own enrollments" ON public.course_enrollments;
CREATE POLICY "Learners can update own enrollments" ON public.course_enrollments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
