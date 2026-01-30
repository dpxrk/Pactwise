/**
 * Tesseract OCR Processor
 *
 * Provides text extraction from images using Tesseract.js.
 * Supports multiple languages and confidence scoring.
 *
 * @module tesseract-processor
 */

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

/**
 * Result from Tesseract OCR processing
 */
export interface TesseractResult {
  /** Extracted text from the image */
  text: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Detected or specified language */
  language: string;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Word count in extracted text */
  wordCount: number;
  /** Character count in extracted text */
  charCount: number;
  /** Whether tables were detected */
  hasTables: boolean;
  /** Any warnings during processing */
  warnings: string[];
}

/**
 * Options for Tesseract OCR processing
 */
export interface TesseractOptions {
  /** Language code (default: 'eng') */
  language?: string;
  /** Enable table detection heuristics */
  detectTables?: boolean;
  /** Timeout in milliseconds (default: 60000) */
  timeoutMs?: number;
  /** Preprocessing options */
  preprocessing?: {
    /** Grayscale conversion */
    grayscale?: boolean;
    /** Contrast enhancement */
    enhanceContrast?: boolean;
  };
}

/**
 * Supported image formats
 */
export const SUPPORTED_IMAGE_FORMATS = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/tiff',
  'image/bmp',
  'image/webp',
];

// =============================================================================
// TESSERACT WORKER MANAGEMENT
// =============================================================================

/**
 * Lazy-loaded Tesseract module reference
 */
let TesseractModule: typeof import('npm:tesseract.js@5.0.4') | null = null;

/**
 * Load Tesseract.js dynamically to minimize initial bundle size.
 * The module is cached after first load.
 */
async function loadTesseract(): Promise<typeof import('npm:tesseract.js@5.0.4')> {
  if (TesseractModule) {
    return TesseractModule;
  }

  try {
    // Dynamic import for Deno runtime
    TesseractModule = await import('npm:tesseract.js@5.0.4');
    console.log('[TesseractProcessor] Tesseract.js loaded successfully');
    return TesseractModule;
  } catch (error) {
    console.error('[TesseractProcessor] Failed to load Tesseract.js:', error);
    throw new Error(
      'Tesseract.js could not be loaded. Ensure npm:tesseract.js@5.0.4 is available.',
    );
  }
}

// =============================================================================
// MAIN EXTRACTION FUNCTION
// =============================================================================

/**
 * Extract text from an image using Tesseract OCR.
 *
 * @param imageBuffer - The image data as Uint8Array
 * @param options - OCR processing options
 * @returns Promise resolving to TesseractResult with extracted text and metadata
 *
 * @example
 * ```typescript
 * const result = await extractTextWithTesseract(imageBuffer, { language: 'eng' });
 * console.log(result.text);
 * console.log(`Confidence: ${result.confidence * 100}%`);
 * ```
 */
export async function extractTextWithTesseract(
  imageBuffer: Uint8Array,
  options: TesseractOptions = {},
): Promise<TesseractResult> {
  const startTime = Date.now();
  const warnings: string[] = [];
  const language = options.language || 'eng';
  const timeoutMs = options.timeoutMs || 60000;

  // Validate input
  if (!imageBuffer || imageBuffer.byteLength === 0) {
    throw new Error('Image buffer is empty or invalid');
  }

  // Warn about large images
  const imageSizeMB = imageBuffer.byteLength / (1024 * 1024);
  if (imageSizeMB > 10) {
    warnings.push(`Large image (${imageSizeMB.toFixed(1)}MB) may slow processing`);
  }

  try {
    const Tesseract = await loadTesseract();

    // Create worker with specified language
    console.log(`[TesseractProcessor] Creating worker for language: ${language}`);
    const worker = await Tesseract.createWorker(language, 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          // Log progress for long operations
          if (m.progress && m.progress > 0 && m.progress % 0.25 < 0.01) {
            console.log(`[TesseractProcessor] Progress: ${(m.progress * 100).toFixed(0)}%`);
          }
        }
      },
    });

    // Process with timeout
    const recognizePromise = worker.recognize(imageBuffer);

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Tesseract OCR timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    const result = await Promise.race([recognizePromise, timeoutPromise]);

    // Terminate worker to free resources
    await worker.terminate();

    const extractedText = result.data.text || '';
    const confidence = (result.data.confidence || 0) / 100; // Convert to 0-1 scale

    // Calculate word and character counts
    const wordCount = countWords(extractedText);
    const charCount = extractedText.length;

    // Detect tables using heuristics
    const hasTables = options.detectTables !== false && detectTables(extractedText);

    // Add quality warnings
    if (confidence < 0.5) {
      warnings.push(`Low OCR confidence (${(confidence * 100).toFixed(0)}%) - text may be inaccurate`);
    }

    if (extractedText.trim().length === 0) {
      warnings.push('No text was extracted from the image');
    }

    const processingTimeMs = Date.now() - startTime;
    console.log(
      `[TesseractProcessor] Completed in ${processingTimeMs}ms, ` +
      `confidence: ${(confidence * 100).toFixed(0)}%, ` +
      `words: ${wordCount}`,
    );

    return {
      text: extractedText,
      confidence,
      language,
      processingTimeMs,
      wordCount,
      charCount,
      hasTables,
      warnings,
    };
  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`[TesseractProcessor] OCR failed after ${processingTimeMs}ms:`, errorMessage);

    // Return partial result on error
    return {
      text: '',
      confidence: 0,
      language,
      processingTimeMs,
      wordCount: 0,
      charCount: 0,
      hasTables: false,
      warnings: [...warnings, `OCR extraction failed: ${errorMessage}`],
    };
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Count words in text
 */
function countWords(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  return words.length;
}

/**
 * Detect tables in extracted text using pattern matching
 */
function detectTables(text: string): boolean {
  if (!text) return false;

  const tablePatterns = [
    // Markdown-style tables
    /\|.*\|.*\|/,
    // Tab-separated data (multiple tabs in sequence)
    /\t.*\t.*\t/,
    // Numeric columns with consistent spacing
    /^\s*[\d,.]+\s{2,}[\d,.]+\s{2,}[\d,.]+/m,
    // Common table keywords followed by structured content
    /(?:total|subtotal|amount|qty|quantity|price|item)[\s:]*[\d,.]+/i,
  ];

  return tablePatterns.some((pattern) => pattern.test(text));
}

/**
 * Check if a MIME type is supported for OCR
 */
export function isSupportedImageFormat(mimeType: string): boolean {
  return SUPPORTED_IMAGE_FORMATS.includes(mimeType.toLowerCase());
}

/**
 * Get language code for Tesseract from common language names
 */
export function getLanguageCode(language: string): string {
  const languageMap: Record<string, string> = {
    english: 'eng',
    spanish: 'spa',
    french: 'fra',
    german: 'deu',
    italian: 'ita',
    portuguese: 'por',
    dutch: 'nld',
    russian: 'rus',
    chinese: 'chi_sim',
    japanese: 'jpn',
    korean: 'kor',
    arabic: 'ara',
    // ISO 639-1 codes
    en: 'eng',
    es: 'spa',
    fr: 'fra',
    de: 'deu',
    it: 'ita',
    pt: 'por',
    nl: 'nld',
    ru: 'rus',
    zh: 'chi_sim',
    ja: 'jpn',
    ko: 'kor',
    ar: 'ara',
  };

  const normalizedLang = language.toLowerCase().trim();
  return languageMap[normalizedLang] || normalizedLang;
}

/**
 * Estimate OCR quality based on confidence and text characteristics
 */
export function estimateOcrQuality(result: TesseractResult): number {
  let quality = result.confidence;

  // Reduce quality for very short extractions
  if (result.charCount < 50) {
    quality *= 0.7;
  }

  // Reduce quality for warnings
  if (result.warnings.length > 0) {
    quality *= 0.9;
  }

  // Boost quality for table detection (usually means structured content)
  if (result.hasTables) {
    quality = Math.min(1, quality * 1.05);
  }

  return Math.max(0, Math.min(1, quality));
}

// =============================================================================
// BATCH PROCESSING
// =============================================================================

/**
 * Process multiple images in sequence
 *
 * @param images - Array of image buffers
 * @param options - OCR processing options
 * @returns Array of TesseractResults
 */
export async function extractTextFromMultipleImages(
  images: Uint8Array[],
  options: TesseractOptions = {},
): Promise<TesseractResult[]> {
  const results: TesseractResult[] = [];

  for (const image of images) {
    const result = await extractTextWithTesseract(image, options);
    results.push(result);
  }

  return results;
}

/**
 * Combine multiple OCR results into a single document
 */
export function combineOcrResults(results: TesseractResult[]): TesseractResult {
  if (results.length === 0) {
    return {
      text: '',
      confidence: 0,
      language: 'eng',
      processingTimeMs: 0,
      wordCount: 0,
      charCount: 0,
      hasTables: false,
      warnings: ['No results to combine'],
    };
  }

  // Combine text with page separators
  const combinedText = results.map((r, i) => `--- Page ${i + 1} ---\n${r.text}`).join('\n\n');

  // Average confidence, weighted by character count
  const totalChars = results.reduce((sum, r) => sum + r.charCount, 0);
  const weightedConfidence = totalChars > 0
    ? results.reduce((sum, r) => sum + (r.confidence * r.charCount), 0) / totalChars
    : 0;

  return {
    text: combinedText,
    confidence: weightedConfidence,
    language: results[0].language,
    processingTimeMs: results.reduce((sum, r) => sum + r.processingTimeMs, 0),
    wordCount: results.reduce((sum, r) => sum + r.wordCount, 0),
    charCount: results.reduce((sum, r) => sum + r.charCount, 0),
    hasTables: results.some((r) => r.hasTables),
    warnings: [...new Set(results.flatMap((r) => r.warnings))],
  };
}
