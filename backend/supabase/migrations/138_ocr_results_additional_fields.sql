-- Migration 138: OCR Results Additional Fields
-- Description: Add char_count, is_scanned, and warnings columns to ocr_results table
-- Required for enhanced OCR agent with pdf-parse integration

-- Add char_count column for character count tracking
ALTER TABLE ocr_results
ADD COLUMN IF NOT EXISTS char_count INTEGER;

-- Add is_scanned column to flag scanned/image-based PDFs
ALTER TABLE ocr_results
ADD COLUMN IF NOT EXISTS is_scanned BOOLEAN DEFAULT false;

-- Add warnings column for extraction warnings (stored as JSONB array)
ALTER TABLE ocr_results
ADD COLUMN IF NOT EXISTS warnings JSONB DEFAULT '[]'::jsonb;

-- Update constraint for ocr_job_id to allow null (for single document processing without a job)
-- First drop the existing constraint if it requires NOT NULL
ALTER TABLE ocr_results
ALTER COLUMN ocr_job_id DROP NOT NULL;

-- Add comment for new columns
COMMENT ON COLUMN ocr_results.char_count IS 'Character count of extracted text';
COMMENT ON COLUMN ocr_results.is_scanned IS 'Whether the document appears to be a scanned/image-based PDF';
COMMENT ON COLUMN ocr_results.warnings IS 'Array of warning messages generated during OCR processing';
