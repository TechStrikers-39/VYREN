-- ============================================================
-- VYREN — Migration 008: Learner Onboarding & Designation Requirements
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Extend profiles table with contextual onboarding columns
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS responsibilities TEXT,
  ADD COLUMN IF NOT EXISTS tools_experience TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS self_reported_level INTEGER CHECK (self_reported_level BETWEEN 0 AND 4),
  ADD COLUMN IF NOT EXISTS target_competencies TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Create designation competency requirements table
CREATE TABLE IF NOT EXISTS public.designation_competency_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  designation TEXT NOT NULL,
  competency_id UUID NOT NULL REFERENCES public.competencies(id) ON DELETE CASCADE,
  required_level INTEGER NOT NULL CHECK (required_level BETWEEN 0 AND 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (designation, competency_id)
);

-- Enable Row Level Security
ALTER TABLE public.designation_competency_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view designation requirements"
  ON public.designation_competency_requirements FOR SELECT
  USING (auth.role() = 'authenticated');

-- 3. Seed demonstration mappings for standard MoSPI roles
-- NOTE: Explicitly tagged as "VYREN demonstration mappings"
INSERT INTO public.designation_competency_requirements (designation, competency_id, required_level)
VALUES
  -- Assistant Director (Data Analytics)
  ('Assistant Director (Data Analytics)', 'c1000000-0000-0000-0000-000000000001', 3),
  ('Assistant Director (Data Analytics)', 'c1000000-0000-0000-0000-000000000002', 3),
  ('Assistant Director (Data Analytics)', 'c1000000-0000-0000-0000-000000000003', 3),
  ('Assistant Director (Data Analytics)', 'c1000000-0000-0000-0000-000000000004', 3),
  -- Junior Statistical Officer (JSO)
  ('Junior Statistical Officer', 'c1000000-0000-0000-0000-000000000001', 3),
  ('Junior Statistical Officer', 'c1000000-0000-0000-0000-000000000002', 2),
  ('Junior Statistical Officer', 'c1000000-0000-0000-0000-000000000003', 1),
  ('Junior Statistical Officer', 'c1000000-0000-0000-0000-000000000004', 2),
  -- Senior Statistical Officer (SSO)
  ('Senior Statistical Officer', 'c1000000-0000-0000-0000-000000000001', 4),
  ('Senior Statistical Officer', 'c1000000-0000-0000-0000-000000000002', 3),
  ('Senior Statistical Officer', 'c1000000-0000-0000-0000-000000000003', 2),
  ('Senior Statistical Officer', 'c1000000-0000-0000-0000-000000000004', 3)
ON CONFLICT (designation, competency_id) DO UPDATE 
SET required_level = EXCLUDED.required_level;
