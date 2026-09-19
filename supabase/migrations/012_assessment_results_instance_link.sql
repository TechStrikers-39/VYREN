-- ============================================================
-- VYREN — Migration 012: Link Assessment Results to Instances
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.assessment_results
  ADD COLUMN IF NOT EXISTS instance_id UUID REFERENCES public.assessment_instances(id),
  ADD COLUMN IF NOT EXISTS generation_mode TEXT DEFAULT 'legacy';

CREATE INDEX IF NOT EXISTS idx_assessment_results_instance_id
  ON public.assessment_results (instance_id) WHERE instance_id IS NOT NULL;
