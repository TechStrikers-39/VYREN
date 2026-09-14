-- ============================================================
-- VYREN — Migration 001: Create All Tables
-- Run this first in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. PROFILES
-- Extended user data. Linked 1:1 to auth.users
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  full_name   TEXT,
  organization TEXT,
  department  TEXT,
  designation TEXT,
  igot_id     TEXT,
  role        TEXT        NOT NULL DEFAULT 'learner'
                          CHECK (role IN ('learner', 'trainer', 'admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. COMPETENCIES
-- Domain competency definitions with level descriptors
-- ============================================================
CREATE TABLE IF NOT EXISTS public.competencies (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT        NOT NULL,
  category            TEXT        NOT NULL,
  description         TEXT,
  level_0_descriptor  TEXT,
  level_1_descriptor  TEXT,
  level_2_descriptor  TEXT,
  level_3_descriptor  TEXT,
  level_4_descriptor  TEXT,
  required_level      INTEGER     NOT NULL DEFAULT 3
                                  CHECK (required_level BETWEEN 0 AND 4),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. COMPETENCY SCORES
-- Per-user measured performance score + confidence per competency
-- Score and confidence are SEPARATE — confidence never modifies score
-- ============================================================
CREATE TABLE IF NOT EXISTS public.competency_scores (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  competency_id    UUID          NOT NULL REFERENCES public.competencies(id) ON DELETE CASCADE,
  score            NUMERIC(5,2)  NOT NULL DEFAULT 0
                                 CHECK (score BETWEEN 0 AND 100),
  measured_level   INTEGER       NOT NULL DEFAULT 0
                                 CHECK (measured_level BETWEEN 0 AND 4),
  confidence       NUMERIC(4,3)  NOT NULL DEFAULT 0
                                 CHECK (confidence BETWEEN 0 AND 1),
  last_assessed_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, competency_id)
);

-- ============================================================
-- 4. SKILL GAPS
-- Measured gap between current and required competency level
-- ============================================================
CREATE TABLE IF NOT EXISTS public.skill_gaps (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  competency_id  UUID        NOT NULL REFERENCES public.competencies(id) ON DELETE CASCADE,
  current_level  INTEGER     NOT NULL CHECK (current_level BETWEEN 0 AND 4),
  required_level INTEGER     NOT NULL CHECK (required_level BETWEEN 0 AND 4),
  gap_size       INTEGER     NOT NULL,
  priority       TEXT        NOT NULL
                             CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW', 'NONE')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, competency_id)
);

-- ============================================================
-- 5. ASSESSMENTS
-- Assessment definitions (not items)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.assessments (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT        NOT NULL,
  description         TEXT,
  version             TEXT        NOT NULL DEFAULT '1.0',
  time_limit_minutes  INTEGER     NOT NULL DEFAULT 30,
  created_by          UUID        REFERENCES public.profiles(id),
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. ASSESSMENT ITEMS
-- MCQ items — correct_index NEVER exposed to learners via API
-- ============================================================
CREATE TABLE IF NOT EXISTS public.assessment_items (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id  UUID         NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  competency_id  UUID         NOT NULL REFERENCES public.competencies(id) ON DELETE CASCADE,
  prompt         TEXT         NOT NULL,
  options        JSONB        NOT NULL,
  correct_index  INTEGER      NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  weight         NUMERIC(3,2) NOT NULL DEFAULT 1.0,
  difficulty     TEXT         NOT NULL DEFAULT 'MEDIUM'
                              CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
  order_index    INTEGER      NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. ASSESSMENT RESULTS
-- Full evidence vector stored per submission — deterministic + auditable
-- ============================================================
CREATE TABLE IF NOT EXISTS public.assessment_results (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assessment_id         UUID         NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  assessment_version    TEXT         NOT NULL,
  overall_score         NUMERIC(5,2) NOT NULL,
  competency_breakdown  JSONB        NOT NULL,
  -- {competency_id: {score, confidence, item_count, measured_level}}
  item_log              JSONB        NOT NULL,
  -- [{item_id, learner_answer, correct_answer, is_correct, weight, target_competency_id}]
  resulting_gaps        JSONB        NOT NULL,
  -- snapshot of gap matrix at submission time
  submitted_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. COURSES
-- Course catalog
-- ============================================================
CREATE TABLE IF NOT EXISTS public.courses (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title                TEXT        NOT NULL,
  description          TEXT,
  category             TEXT,
  level                INTEGER     NOT NULL DEFAULT 1
                                   CHECK (level BETWEEN 1 AND 4),
  duration_minutes     INTEGER     NOT NULL DEFAULT 60,
  competencies_covered UUID[]      NOT NULL DEFAULT '{}',
  is_active            BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. COURSE MODULES
-- Individual modules within a course
-- ============================================================
CREATE TABLE IF NOT EXISTS public.course_modules (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id        UUID        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  competency_id    UUID        REFERENCES public.competencies(id),
  title            TEXT        NOT NULL,
  type             TEXT        NOT NULL DEFAULT 'reading'
                               CHECK (type IN ('reading', 'video', 'code_exercise', 'quiz')),
  content          TEXT,
  order_index      INTEGER     NOT NULL DEFAULT 0,
  duration_minutes INTEGER     NOT NULL DEFAULT 15,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 10. LEARNING PATHS
-- Adaptive ordered learning path per learner
-- ============================================================
CREATE TABLE IF NOT EXISTS public.learning_paths (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  modules    JSONB       NOT NULL DEFAULT '[]',
  -- [{course_id, module_id, status, order_index}]
  status     TEXT        NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active', 'completed', 'paused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 11. COURSE ENROLLMENTS
-- Enrolment + progress tracking per learner per course
-- ============================================================
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id           UUID         NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  progress_percentage NUMERIC(5,2) NOT NULL DEFAULT 0
                                   CHECK (progress_percentage BETWEEN 0 AND 100),
  completed_modules   UUID[]       NOT NULL DEFAULT '{}',
  status              TEXT         NOT NULL DEFAULT 'enrolled'
                                   CHECK (status IN ('enrolled', 'in_progress', 'completed')),
  enrolled_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  UNIQUE (user_id, course_id)
);

-- ============================================================
-- 12. RECOMMENDATIONS
-- Adaptive learning recommendations linked to skill gaps
-- ============================================================
CREATE TABLE IF NOT EXISTS public.recommendations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  competency_id UUID        REFERENCES public.competencies(id),
  course_id     UUID        REFERENCES public.courses(id),
  skill_gap_id  UUID        REFERENCES public.skill_gaps(id),
  title         TEXT        NOT NULL,
  description   TEXT,
  priority      TEXT        NOT NULL DEFAULT 'MEDIUM'
                            CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
  type          TEXT        NOT NULL DEFAULT 'course'
                            CHECK (type IN ('course', 'assessment', 'resource')),
  is_dismissed  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRIGGER: Auto-create profile on auth.users insert
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'learner')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
