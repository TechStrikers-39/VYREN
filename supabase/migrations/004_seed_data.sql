-- ============================================================
-- VYREN — Migration 004: Seed Data (Fixed UUIDs)
-- Run this in Supabase SQL Editor
-- All UUIDs use only valid hex characters (0-9, a-f)
-- ============================================================

-- ============================================================
-- 1. COMPETENCY FRAMEWORK
-- ============================================================
INSERT INTO public.competencies
  (id, name, category, description,
   level_0_descriptor, level_1_descriptor, level_2_descriptor,
   level_3_descriptor, level_4_descriptor, required_level)
VALUES
  (
    'c1000000-0000-0000-0000-000000000001',
    'Statistical Inference',
    'Data Analytics',
    'Ability to draw conclusions from data using statistical methods and hypothesis testing.',
    'No demonstrated understanding of statistical concepts.',
    'Recognises basic statistical terms; can read simple charts.',
    'Can apply basic statistical tests; understands probability and distributions.',
    'Proficient in hypothesis testing, regression, and confidence intervals.',
    'Designs rigorous inference frameworks; leads statistical methodology.',
    3
  ),
  (
    'c1000000-0000-0000-0000-000000000002',
    'Data Pipeline Design',
    'Data Engineering',
    'Ability to architect and implement reliable, scalable data pipelines.',
    'No understanding of data pipeline concepts.',
    'Understands ETL concepts; can describe pipeline stages.',
    'Can build simple pipelines using standard tools.',
    'Designs fault-tolerant pipelines with monitoring and error handling.',
    'Architects enterprise-grade, real-time streaming and batch pipeline systems.',
    3
  ),
  (
    'c1000000-0000-0000-0000-000000000003',
    'Machine Learning Ops',
    'AI & ML',
    'Ability to deploy, monitor, and maintain ML models in production environments.',
    'No exposure to ML deployment concepts.',
    'Understands model deployment lifecycle at a conceptual level.',
    'Can containerise and deploy ML models; understands drift detection.',
    'Manages ML pipelines, monitors model performance, and handles retraining cycles.',
    'Leads MLOps platform design; sets standards for model governance and observability.',
    3
  ),
  (
    'c1000000-0000-0000-0000-000000000004',
    'Data Governance',
    'Data Management',
    'Ability to implement data quality, lineage, cataloguing, and compliance frameworks.',
    'No awareness of data governance principles.',
    'Understands data governance concepts; familiar with cataloguing tools.',
    'Can implement basic data quality checks and metadata tagging.',
    'Designs governance frameworks; enforces data lineage and compliance policies.',
    'Leads org-wide data governance strategy; aligns with regulatory requirements.',
    3
  );

-- ============================================================
-- 2. ASSESSMENT DEFINITION
-- ============================================================
INSERT INTO public.assessments
  (id, title, description, version, time_limit_minutes, is_active)
VALUES
  (
    'a1000000-0000-0000-0000-000000000001',
    'VYREN Competency Baseline Assessment',
    'Establish your baseline competency profile across all four domains.',
    '1.0',
    20,
    TRUE
  );

-- ============================================================
-- 3. ASSESSMENT ITEMS (UUIDs use only a-f, 0-9)
-- correct_index is NEVER returned to the frontend
-- ============================================================
INSERT INTO public.assessment_items
  (id, assessment_id, competency_id, prompt, options, correct_index, weight, difficulty, order_index)
VALUES
  (
    'e1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'A p-value of 0.03 is obtained in a hypothesis test. Which of the following is the correct interpretation at α = 0.05?',
    '["There is a 3% probability the null hypothesis is true", "We reject the null hypothesis — the result is statistically significant", "The effect size is small", "The test has 97% statistical power"]'::jsonb,
    1,
    1.0,
    'MEDIUM',
    0
  ),
  (
    'e1000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'Which technique is most appropriate to reduce multicollinearity in a regression model?',
    '["Increase the sample size", "Apply Principal Component Analysis (PCA) before regression", "Remove the dependent variable", "Use a higher significance level"]'::jsonb,
    1,
    1.5,
    'HARD',
    1
  ),
  (
    'e1000000-0000-0000-0000-000000000003',
    'a1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000002',
    'In a data pipeline, what is the primary purpose of an idempotent operation?',
    '["Improve query performance", "Ensure the same result regardless of how many times the operation is executed", "Encrypt data at rest", "Enable horizontal scaling"]'::jsonb,
    1,
    1.0,
    'MEDIUM',
    2
  ),
  (
    'e1000000-0000-0000-0000-000000000004',
    'a1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000003',
    'What is model drift, and why does it matter in production ML systems?',
    '["A bug introduced during model deployment", "The gradual degradation of model performance due to changes in real-world data distribution", "An overfit model that performs poorly on training data", "A technique for reducing model file size"]'::jsonb,
    1,
    1.0,
    'MEDIUM',
    3
  ),
  (
    'e1000000-0000-0000-0000-000000000005',
    'a1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000004',
    'Which of the following best describes data lineage?',
    '["A method for compressing large datasets", "The tracking of data''s origins, transformations, and movement across systems", "A data encryption standard for secure storage", "A technique for de-duplicating records in a data warehouse"]'::jsonb,
    1,
    1.0,
    'EASY',
    4
  );

-- ============================================================
-- 4. SAMPLE COURSE + MODULES
-- ============================================================
INSERT INTO public.courses
  (id, title, description, category, level, duration_minutes, competencies_covered, is_active)
VALUES
  (
    'b0100000-0000-0000-0000-000000000001',
    'Data Pipeline Design: Enterprise Patterns',
    'Learn to design fault-tolerant, scalable data pipelines using industry-standard patterns.',
    'Data Engineering',
    2,
    90,
    ARRAY['c1000000-0000-0000-0000-000000000002'::uuid],
    TRUE
  );

INSERT INTO public.course_modules
  (id, course_id, competency_id, title, type, content, order_index, duration_minutes)
VALUES
  (
    'd0100000-0000-0000-0000-000000000001',
    'b0100000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000002',
    'Introduction to Pipeline Architecture',
    'reading',
    'This module covers the foundational patterns of modern data pipeline design, including batch vs streaming, ETL vs ELT, and idempotency principles.',
    0,
    20
  ),
  (
    'd0100000-0000-0000-0000-000000000002',
    'b0100000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000002',
    'Implementing Fault-Tolerant Pipelines',
    'code_exercise',
    'Build a fault-tolerant pipeline with retry logic, dead-letter queues, and checkpoint recovery.',
    1,
    40
  ),
  (
    'd0100000-0000-0000-0000-000000000003',
    'b0100000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000002',
    'Monitoring and Observability',
    'reading',
    'Learn how to instrument your pipelines with metrics, alerts, and data quality checks for production observability.',
    2,
    30
  );
