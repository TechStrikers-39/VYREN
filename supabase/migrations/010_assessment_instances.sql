-- ============================================================
-- VYREN — Migration 010: Assessment Instances
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.assessment_instances (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_assessment_id UUID NOT NULL REFERENCES public.assessments(id),
  blueprint              JSONB NOT NULL,
  generation_mode        TEXT NOT NULL DEFAULT 'ai_personalized'
                         CHECK (generation_mode IN ('ai_personalized', 'anchor_padded', 'static_fallback')),
  generation_model       TEXT,
  generation_request_id  TEXT,
  status                 TEXT NOT NULL DEFAULT 'generating'
                         CHECK (status IN ('generating', 'ready', 'in_progress', 'submitted', 'expired', 'failed')),
  time_limit_minutes     INTEGER NOT NULL DEFAULT 20,
  started_at             TIMESTAMPTZ,
  expires_at             TIMESTAMPTZ,
  submitted_at           TIMESTAMPTZ,
  result_id              UUID REFERENCES public.assessment_results(id),
  fallback_reason        TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for active instances per learner (ensures fast query and prevents duplicate in-flight sessions)
CREATE INDEX IF NOT EXISTS idx_assessment_instances_user_status
  ON public.assessment_instances (user_id, status);

-- Row Level Security
ALTER TABLE public.assessment_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners can view their own assessment instances"
  ON public.assessment_instances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages assessment instances"
  ON public.assessment_instances FOR ALL
  USING (true) WITH CHECK (true);
