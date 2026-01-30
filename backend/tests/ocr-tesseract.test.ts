/**
 * Tesseract OCR Integration Tests
 *
 * Tests for the Tesseract OCR processor and its integration with the OCR agent.
 * Note: Some tests require actual Tesseract.js to be available.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import the tesseract processor utilities
import {
  isSupportedImageFormat,
  getLanguageCode,
  estimateOcrQuality,
  SUPPORTED_IMAGE_FORMATS,
  type TesseractResult,
} from '../supabase/functions/local-agents/utils/tesseract-processor.ts';

// =============================================================================
// UTILITY FUNCTION TESTS
// =============================================================================

describe('Tesseract Processor - Utility Functions', () => {
  describe('isSupportedImageFormat', () => {
    it('should return true for PNG', () => {
      expect(isSupportedImageFormat('image/png')).toBe(true);
    });

    it('should return true for JPEG', () => {
      expect(isSupportedImageFormat('image/jpeg')).toBe(true);
    });

    it('should return true for JPG', () => {
      expect(isSupportedImageFormat('image/jpg')).toBe(true);
    });

    it('should return true for GIF', () => {
      expect(isSupportedImageFormat('image/gif')).toBe(true);
    });

    it('should return true for TIFF', () => {
      expect(isSupportedImageFormat('image/tiff')).toBe(true);
    });

    it('should return true for BMP', () => {
      expect(isSupportedImageFormat('image/bmp')).toBe(true);
    });

    it('should return true for WebP', () => {
      expect(isSupportedImageFormat('image/webp')).toBe(true);
    });

    it('should return false for PDF', () => {
      expect(isSupportedImageFormat('application/pdf')).toBe(false);
    });

    it('should return false for text', () => {
      expect(isSupportedImageFormat('text/plain')).toBe(false);
    });

    it('should handle case-insensitive MIME types', () => {
      expect(isSupportedImageFormat('IMAGE/PNG')).toBe(true);
      expect(isSupportedImageFormat('Image/Jpeg')).toBe(true);
    });
  });

  describe('getLanguageCode', () => {
    it('should convert English to eng', () => {
      expect(getLanguageCode('english')).toBe('eng');
      expect(getLanguageCode('English')).toBe('eng');
      expect(getLanguageCode('ENGLISH')).toBe('eng');
    });

    it('should convert Spanish to spa', () => {
      expect(getLanguageCode('spanish')).toBe('spa');
      expect(getLanguageCode('Spanish')).toBe('spa');
    });

    it('should convert French to fra', () => {
      expect(getLanguageCode('french')).toBe('fra');
    });

    it('should convert German to deu', () => {
      expect(getLanguageCode('german')).toBe('deu');
    });

    it('should convert Italian to ita', () => {
      expect(getLanguageCode('italian')).toBe('ita');
    });

    it('should convert Portuguese to por', () => {
      expect(getLanguageCode('portuguese')).toBe('por');
    });

    it('should convert ISO 639-1 codes', () => {
      expect(getLanguageCode('en')).toBe('eng');
      expect(getLanguageCode('es')).toBe('spa');
      expect(getLanguageCode('fr')).toBe('fra');
      expect(getLanguageCode('de')).toBe('deu');
      expect(getLanguageCode('zh')).toBe('chi_sim');
      expect(getLanguageCode('ja')).toBe('jpn');
    });

    it('should return original for unknown languages', () => {
      expect(getLanguageCode('xyz')).toBe('xyz');
      expect(getLanguageCode('customlang')).toBe('customlang');
    });

    it('should handle whitespace', () => {
      expect(getLanguageCode('  english  ')).toBe('eng');
      expect(getLanguageCode(' en ')).toBe('eng');
    });
  });

  describe('estimateOcrQuality', () => {
    it('should return high quality for confident results with text', () => {
      const result: TesseractResult = {
        text: 'This is a sample text with enough content.',
        confidence: 0.95,
        language: 'eng',
        processingTimeMs: 1000,
        wordCount: 10,
        charCount: 100,
        hasTables: false,
        warnings: [],
      };
      const quality = estimateOcrQuality(result);
      expect(quality).toBeGreaterThan(0.9);
    });

    it('should reduce quality for short text', () => {
      const result: TesseractResult = {
        text: 'Short',
        confidence: 0.9,
        language: 'eng',
        processingTimeMs: 500,
        wordCount: 1,
        charCount: 5,
        hasTables: false,
        warnings: [],
      };
      const quality = estimateOcrQuality(result);
      expect(quality).toBeLessThan(0.9);
    });

    it('should reduce quality for warnings', () => {
      const result: TesseractResult = {
        text: 'Text with enough characters for analysis',
        confidence: 0.9,
        language: 'eng',
        processingTimeMs: 1000,
        wordCount: 10,
        charCount: 100,
        hasTables: false,
        warnings: ['Low quality image'],
      };
      const quality = estimateOcrQuality(result);
      expect(quality).toBeLessThan(0.9);
    });

    it('should slightly boost quality for tables', () => {
      const resultWithTable: TesseractResult = {
        text: 'A table was found in the document content here',
        confidence: 0.85,
        language: 'eng',
        processingTimeMs: 1000,
        wordCount: 10,
        charCount: 100,
        hasTables: true,
        warnings: [],
      };
      const resultWithoutTable: TesseractResult = {
        ...resultWithTable,
        hasTables: false,
      };
      expect(estimateOcrQuality(resultWithTable)).toBeGreaterThan(
        estimateOcrQuality(resultWithoutTable),
      );
    });

    it('should clamp quality between 0 and 1', () => {
      const lowConfResult: TesseractResult = {
        text: 'x',
        confidence: 0.1,
        language: 'eng',
        processingTimeMs: 100,
        wordCount: 1,
        charCount: 1,
        hasTables: false,
        warnings: ['Error 1', 'Error 2'],
      };
      const quality = estimateOcrQuality(lowConfResult);
      expect(quality).toBeGreaterThanOrEqual(0);
      expect(quality).toBeLessThanOrEqual(1);
    });
  });

  describe('SUPPORTED_IMAGE_FORMATS', () => {
    it('should include all common image formats', () => {
      expect(SUPPORTED_IMAGE_FORMATS).toContain('image/png');
      expect(SUPPORTED_IMAGE_FORMATS).toContain('image/jpeg');
      expect(SUPPORTED_IMAGE_FORMATS).toContain('image/gif');
      expect(SUPPORTED_IMAGE_FORMATS).toContain('image/tiff');
      expect(SUPPORTED_IMAGE_FORMATS).toContain('image/bmp');
    });

    it('should not include non-image formats', () => {
      expect(SUPPORTED_IMAGE_FORMATS).not.toContain('application/pdf');
      expect(SUPPORTED_IMAGE_FORMATS).not.toContain('text/plain');
    });
  });
});

// =============================================================================
// MOCK-BASED INTEGRATION TESTS
// =============================================================================

describe('Tesseract Processor - Integration', () => {
  // Note: These tests verify the structure and behavior without requiring
  // actual Tesseract.js to be installed, which would be heavyweight for CI.

  describe('extractTextWithTesseract input validation', () => {
    // Import dynamically to allow mocking
    it('should export extractTextWithTesseract function', async () => {
      const mod = await import(
        '../supabase/functions/local-agents/utils/tesseract-processor.ts'
      );
      expect(typeof mod.extractTextWithTesseract).toBe('function');
    });

    it('should export combineOcrResults function', async () => {
      const mod = await import(
        '../supabase/functions/local-agents/utils/tesseract-processor.ts'
      );
      expect(typeof mod.combineOcrResults).toBe('function');
    });

    it('should export extractTextFromMultipleImages function', async () => {
      const mod = await import(
        '../supabase/functions/local-agents/utils/tesseract-processor.ts'
      );
      expect(typeof mod.extractTextFromMultipleImages).toBe('function');
    });
  });

  describe('combineOcrResults', () => {
    it('should combine multiple results correctly', async () => {
      const { combineOcrResults } = await import(
        '../supabase/functions/local-agents/utils/tesseract-processor.ts'
      );

      const results: TesseractResult[] = [
        {
          text: 'Page 1 content',
          confidence: 0.9,
          language: 'eng',
          processingTimeMs: 1000,
          wordCount: 3,
          charCount: 14,
          hasTables: false,
          warnings: [],
        },
        {
          text: 'Page 2 content',
          confidence: 0.8,
          language: 'eng',
          processingTimeMs: 1200,
          wordCount: 3,
          charCount: 14,
          hasTables: true,
          warnings: ['Low quality'],
        },
      ];

      const combined = combineOcrResults(results);

      expect(combined.text).toContain('Page 1 content');
      expect(combined.text).toContain('Page 2 content');
      expect(combined.processingTimeMs).toBe(2200);
      expect(combined.wordCount).toBe(6);
      expect(combined.charCount).toBe(28);
      expect(combined.hasTables).toBe(true);
      expect(combined.warnings).toContain('Low quality');
    });

    it('should handle empty results array', async () => {
      const { combineOcrResults } = await import(
        '../supabase/functions/local-agents/utils/tesseract-processor.ts'
      );

      const combined = combineOcrResults([]);

      expect(combined.text).toBe('');
      expect(combined.confidence).toBe(0);
      expect(combined.warnings).toContain('No results to combine');
    });

    it('should calculate weighted confidence', async () => {
      const { combineOcrResults } = await import(
        '../supabase/functions/local-agents/utils/tesseract-processor.ts'
      );

      const results: TesseractResult[] = [
        {
          text: 'Lots of text here',
          confidence: 0.9,
          language: 'eng',
          processingTimeMs: 1000,
          wordCount: 4,
          charCount: 100, // More chars = more weight
          hasTables: false,
          warnings: [],
        },
        {
          text: 'Short',
          confidence: 0.5,
          language: 'eng',
          processingTimeMs: 200,
          wordCount: 1,
          charCount: 5, // Less chars = less weight
          hasTables: false,
          warnings: [],
        },
      ];

      const combined = combineOcrResults(results);

      // Weighted confidence should be closer to 0.9 than to 0.5
      expect(combined.confidence).toBeGreaterThan(0.7);
    });
  });
});

// =============================================================================
// OCR AGENT INTEGRATION TESTS
// =============================================================================

describe('OCR Agent - Tesseract Integration', () => {
  it('should import Tesseract processor in OCR agent', async () => {
    // Verify the import exists and doesn't throw
    const ocrModule = await import(
      '../supabase/functions/local-agents/agents/ocr.ts'
    );
    expect(ocrModule.OcrAgent).toBeDefined();
  });

  // Note: Full integration tests with actual image processing would require
  // test fixtures and Tesseract.js to be available in the test environment.
  // These are better suited for E2E testing.
});

// =============================================================================
// ERROR HANDLING TESTS
// =============================================================================

describe('Tesseract Processor - Error Handling', () => {
  it('should handle empty buffer gracefully', async () => {
    const { extractTextWithTesseract } = await import(
      '../supabase/functions/local-agents/utils/tesseract-processor.ts'
    );

    // This will throw because buffer is empty
    await expect(
      extractTextWithTesseract(new Uint8Array(0)),
    ).rejects.toThrow('Image buffer is empty or invalid');
  });
});
