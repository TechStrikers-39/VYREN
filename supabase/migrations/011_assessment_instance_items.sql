-- ============================================================
-- VYREN — Migration 011: Assessment Instance Items
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.assessment_instance_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id         UUID NOT NULL REFERENCES public.assessment_instances(id) ON DELETE CASCADE,
  source_item_id      UUID REFERENCES public.assessment_items(id),
  competency_id       UUID NOT NULL REFERENCES public.competencies(id),
  prompt              TEXT NOT NULL,
  options             JSONB NOT NULL,
  correct_index       INTEGER NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  weight              NUMERIC(3,2) NOT NULL DEFAULT 1.0,
  difficulty          TEXT NOT NULL CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
  question_type       TEXT NOT NULL DEFAULT 'APPLIED'
                      CHECK (question_type IN ('CONCEPTUAL', 'APPLIED', 'SCENARIO')),
  item_source         TEXT NOT NULL DEFAULT 'gemini_generated'
                      CHECK (item_source IN ('anchor', 'gemini_generated')),
  target_proficiency  INTEGER CHECK (target_proficiency BETWEEN 0 AND 4),
  rationale           TEXT,
  validation_result   JSONB,
  needs_review        BOOLEAN NOT NULL DEFAULT FALSE,
  presentation_order  INTEGER NOT NULL DEFAULT 0,
  language            TEXT NOT NULL DEFAULT 'en',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instance_items_instance_order
  ON public.assessment_instance_items (instance_id, presentation_order);

-- Row Level Security
ALTER TABLE public.assessment_instance_items ENABLE ROW LEVEL SECURITY;

-- Learners do NOT read directly via client key to prevent correct_index disclosure.
-- All client reads are filtered through backend FastAPI service_role gateway.
CREATE POLICY "Service role manages instance items"
  ON public.assessment_instance_items FOR ALL
  USING (true) WITH CHECK (true);
