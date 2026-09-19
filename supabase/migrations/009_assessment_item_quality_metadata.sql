-- ============================================================
-- VYREN — Migration 009: Assessment Item Quality Metadata & Anchor Pool Expansion
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Extend assessment_items table with quality and lineage metadata
ALTER TABLE public.assessment_items
  ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'APPLIED'
    CHECK (question_type IN ('CONCEPTUAL', 'APPLIED', 'SCENARIO')),
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'seed'
    CHECK (source IN ('seed', 'domain_authored', 'trainer_created', 'gemini_generated', 'test_artifact')),
  ADD COLUMN IF NOT EXISTS quality_status TEXT NOT NULL DEFAULT 'unreviewed'
    CHECK (quality_status IN ('validated', 'unreviewed', 'rejected', 'deprecated')),
  ADD COLUMN IF NOT EXISTS generation_model TEXT,
  ADD COLUMN IF NOT EXISTS generation_version TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS rationale TEXT,
  ADD COLUMN IF NOT EXISTS competency_alignment TEXT,
  ADD COLUMN IF NOT EXISTS validation_result JSONB,
  ADD COLUMN IF NOT EXISTS target_proficiency INTEGER CHECK (target_proficiency BETWEEN 0 AND 4),
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- 2. Tag the 14 verified baseline items as 'validated' domain-authored anchors
UPDATE public.assessment_items
SET 
  source = 'domain_authored',
  quality_status = 'validated',
  question_type = CASE 
    WHEN id IN ('e1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000002', 'f7a3593b-c9d3-40aa-a945-e1dc0558c530') THEN 'CONCEPTUAL'
    WHEN id IN ('bff03e8d-07b3-4013-91cf-ebe4ef5de611', 'e1000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000013') THEN 'SCENARIO'
    ELSE 'APPLIED'
  END,
  target_proficiency = CASE
    WHEN difficulty = 'EASY' THEN 1
    WHEN difficulty = 'MEDIUM' THEN 2
    WHEN difficulty = 'HARD' THEN 3
    ELSE 2
  END
WHERE id IN (
  'e1000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000002',
  'e1000000-0000-0000-0000-000000000003',
  'e1000000-0000-0000-0000-000000000004',
  'e1000000-0000-0000-0000-000000000005',
  'e1000000-0000-0000-0000-000000000010',
  'e1000000-0000-0000-0000-000000000011',
  'e1000000-0000-0000-0000-000000000012',
  'e1000000-0000-0000-0000-000000000013',
  'e1000000-0000-0000-0000-000000000014',
  'e1000000-0000-0000-0000-000000000015',
  'bff03e8d-07b3-4013-91cf-ebe4ef5de611',
  'f7a3593b-c9d3-40aa-a945-e1dc0558c530',
  'c3d83ced-8f97-4969-9aa0-9c75986e65e8'
);

-- 3. Soft-deprecate the 3 automated test artifacts
UPDATE public.assessment_items
SET 
  source = 'test_artifact',
  quality_status = 'deprecated'
WHERE id IN (
  '551a72fc-d340-4779-b420-1c5e74dd09ef',
  '6c50190f-81df-4359-8ff4-ef771a384769',
  '62d3647b-987b-4a47-9f54-69f65610af20'
);

-- 4. Soft-deprecate duplicate PLFS item (preserving canonical c3d83ced)
UPDATE public.assessment_items
SET 
  source = 'domain_authored',
  quality_status = 'deprecated'
WHERE id = '32506f3c-fc9e-4218-a526-66b077b1196a';

-- 5. Seed 6 new MoSPI validated anchor items to expand clean anchor pool to 20
INSERT INTO public.assessment_items (
  id,
  assessment_id,
  competency_id,
  prompt,
  options,
  correct_index,
  weight,
  difficulty,
  question_type,
  source,
  quality_status,
  target_proficiency,
  rationale,
  order_index
)
VALUES
  -- Anchor 1: Data Pipeline Design (MEDIUM, Scenario)
  (
    'e1000000-0000-0000-0000-000000000020',
    'a1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000002',
    'In a state-level statistical survey data pipeline, which architecture pattern ensures that downstream aggregations are not corrupted when upstream district offices retransmit corrected survey batches multiple times?',
    '["At-least-once ingestion with idempotent database upserts keyed on survey unit identifiers", "Strict FIFO queueing without primary key constraints", "Appending incoming raw records to a flat table with auto-incrementing surrogate keys", "Dropping and recreating the target survey schema on every batch transmission"]'::jsonb,
    0,
    1.00,
    'MEDIUM',
    'SCENARIO',
    'domain_authored',
    'validated',
    2,
    'Idempotent upsert operations keyed on business/survey unit identifiers allow identical batch records to be processed repeatedly without producing duplicate rows or corrupted aggregate totals.',
    19
  ),
  -- Anchor 2: Data Pipeline Design (HARD, Applied)
  (
    'e1000000-0000-0000-0000-000000000021',
    'a1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000002',
    'When designing an ETL pipeline to compute the All-India Index of Industrial Production (IIP), what mechanism is essential to handle late-arriving data from non-responding factories without invalidating past published monthly series?',
    '["Overwriting historical production figures silently without version timestamps", "Imputing zero output for all late-reporting factories and closing the reporting period permanently", "Maintaining quick estimates and revised estimates using bi-temporal tracking (valid time vs. transaction time)", "Discarding late-arriving records if they arrive after the preliminary index release date"]'::jsonb,
    2,
    1.00,
    'HARD',
    'APPLIED',
    'domain_authored',
    'validated',
    3,
    'Bi-temporal data modeling records both the reference month (valid time) and the system processing timestamp (transaction time), enabling official revision tracking (Quick Estimates -> Revised Estimates -> Final Estimates) as mandated by statistical standards.',
    20
  ),
  -- Anchor 3: Machine Learning Ops (MEDIUM, Applied)
  (
    'e1000000-0000-0000-0000-000000000022',
    'a1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000003',
    'When deploying a computer vision model for automated crop area estimation from satellite imagery across Indian agricultural seasons, what is the primary operational cause of performance degradation between Kharif and Rabi seasons?',
    '["Data drift caused by changes in crop phenology, soil reflectance, and seasonal spectral signatures", "Hardware thermal throttling in edge inference servers during winter months", "Incompatibility of model ONNX runtime binaries between cloud hosting regions", "Degradation of satellite sensor resolution during low-temperature orbital passes"]'::jsonb,
    0,
    1.00,
    'MEDIUM',
    'APPLIED',
    'domain_authored',
    'validated',
    2,
    'Seasonal shifts in crop types, agricultural cycles, and ground reflectance cause input feature distribution drift (covariate shift), requiring seasonal calibration and domain-adapted retraining.',
    21
  ),
  -- Anchor 4: Machine Learning Ops (HARD, Scenario)
  (
    'e1000000-0000-0000-0000-000000000023',
    'a1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000003',
    'In an automated administrative data-matching pipeline using machine learning record linkage, what deployment strategy minimizes false-merge risk when rolling out an updated probabilistic linkage model?',
    '["Direct hot-swap deployment to production without baseline comparison", "Shadow deployment (dark launch) comparing predictions against the champion model on live traffic before promotion", "Retraining the model on 100% of newly ingested unverified records without manual auditing", "Lowering classification thresholds to maximize recall regardless of precision"]'::jsonb,
    1,
    1.00,
    'HARD',
    'SCENARIO',
    'domain_authored',
    'validated',
    3,
    'Shadow deployment executes the challenger model in parallel with the production model on real operational data without affecting downstream workflows, allowing precision/recall and false-merge rates to be audited safely.',
    22
  ),
  -- Anchor 5: Machine Learning Ops (HARD, Applied)
  (
    'e1000000-0000-0000-0000-000000000024',
    'a1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000003',
    'Under an MLOps governance framework for MoSPI predictive statistical indicators, which artifact repository practice ensures complete auditability and reproducibility of published figures?',
    '["Exporting final tabular forecasts to unversioned CSV spreadsheets", "Immutable versioning linking the exact training dataset hash, feature pipeline code, model weights, and hyperparameters", "Deleting historical training datasets after model convergence to optimize storage costs", "Relying exclusively on non-deterministic online learning with real-time gradient updates"]'::jsonb,
    1,
    1.00,
    'HARD',
    'APPLIED',
    'domain_authored',
    'validated',
    3,
    'Official statistics require strict reproducibility; binding dataset hashes, preprocessing pipelines, model weights, and evaluation metrics ensures any published estimate can be traced back and independently verified.',
    23
  ),
  -- Anchor 6: Data Governance (MEDIUM, Scenario)
  (
    'e1000000-0000-0000-0000-000000000025',
    'a1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000004',
    'Under the Digital Personal Data Protection (DPDP) Act and official statistical confidentiality standards, what technique allows MoSPI to release microdata from household consumer expenditure surveys without risking re-identification of respondents?',
    '["Publishing raw survey records with only names removed while keeping exact addresses and dates of birth intact", "Statistical disclosure control using k-anonymity, l-diversity, and top-coding of extreme expenditure values", "Storing survey microdata in public read-only cloud storage buckets", "Encrypting published datasets with a single symmetric key shared publicly"]'::jsonb,
    1,
    1.00,
    'MEDIUM',
    'SCENARIO',
    'domain_authored',
    'validated',
    2,
    'Statistical Disclosure Control (SDC) methods, such as k-anonymity, cell suppression, and top-coding, prevent linkage attacks and attribute disclosure while preserving the statistical utility of public microdata files.',
    24
  )
ON CONFLICT (id) DO UPDATE SET
  prompt = EXCLUDED.prompt,
  options = EXCLUDED.options,
  correct_index = EXCLUDED.correct_index,
  weight = EXCLUDED.weight,
  difficulty = EXCLUDED.difficulty,
  question_type = EXCLUDED.question_type,
  source = EXCLUDED.source,
  quality_status = EXCLUDED.quality_status,
  target_proficiency = EXCLUDED.target_proficiency,
  rationale = EXCLUDED.rationale,
  order_index = EXCLUDED.order_index;

-- 6. High-performance index for clean anchor candidate queries
CREATE INDEX IF NOT EXISTS idx_assessment_items_quality_competency
  ON public.assessment_items (quality_status, competency_id);
