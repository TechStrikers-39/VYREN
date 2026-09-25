-- Migration: 014_correct_igot_course_mappings.sql
-- Description: Correct iGOT Karmayogi metadata mapping.
-- 1. Revert Data Pipeline Design (b0100000-0000-0000-0000-000000000001) to FALLBACK / LOCAL as no live course exists.
-- 2. Map Data Foundations for Governance (1ac6bcb1-4d72-574a-8437-ca601beed9d8) to verified live iGOT course do_11452980177757798411.

UPDATE public.courses
SET external_id = NULL,
    external_url = NULL,
    provider = NULL
WHERE id = 'b0100000-0000-0000-0000-000000000001';

UPDATE public.courses
SET external_id = 'do_11452980177757798411',
    external_url = 'https://portal.igotkarmayogi.gov.in/public/toc/do_11452980177757798411/overview',
    provider = 'Wadhwani Foundation / iGOT Karmayogi Bharat'
WHERE id = '1ac6bcb1-4d72-574a-8437-ca601beed9d8';
