-- Migration: 013_add_igot_metadata_to_courses.sql
-- Description: Add iGOT / Sunbird external metadata columns to public.courses and backfill seeded iGOT course.

ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS external_id TEXT NULL,
ADD COLUMN IF NOT EXISTS external_url TEXT NULL,
ADD COLUMN IF NOT EXISTS provider TEXT NULL;

UPDATE public.courses
SET external_id = 'do_113812384910298112115',
    external_url = 'https://portal.igotkarmayogi.gov.in/public/toc/do_113812384910298112115/overview',
    provider = 'iGOT Karmayogi Bharat / NSSTA'
WHERE id = 'b0100000-0000-0000-0000-000000000001';
