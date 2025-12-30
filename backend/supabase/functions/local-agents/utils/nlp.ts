/**
 * NLP Utilities for Pactwise Agent System
 *
 * State-of-the-art non-LLM text processing utilities including:
 * - TF-IDF (Term Frequency-Inverse Document Frequency)
 * - Levenshtein Distance (Edit Distance) for fuzzy matching
 * - Chi-Squared Test for statistical pattern significance
 * - N-gram extraction for phrase-level analysis
 *
 * @module nlp
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

export interface TfIdfTerm {
  term: string;
  tf: number;
  idf: number;
  tfidf: number;
}

export interface ChiSquaredResult {
  chiSquared: number;
  pValue: number;
  significant: boolean;
  degreesOfFreedom: number;
}

export interface DocumentVector {
  [term: string]: number;
}

export interface NgramResult {
  ngram: string;
  count: number;
}

// ============================================================================
// STOPWORDS
// ============================================================================

const ENGLISH_STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
  'she', 'we', 'they', 'what', 'which', 'who', 'whom', 'where', 'when',
  'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there',
]);

// ============================================================================
// TF-IDF IMPLEMENTATION
// ============================================================================

/**
 * TF-IDF (Term Frequency-Inverse Document Frequency) implementation
 * for document similarity and term importance calculation.
 */
export class TfIdf {
  private documents: Map<string, string[]> = new Map();
  private documentFrequency: Map<string, number> = new Map();
  private termCache: Map<string, TfIdfTerm[]> = new Map();

  /**
   * Tokenize text into words, removing stopwords and normalizing
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word =>
        word.length > 2 &&
        !ENGLISH_STOPWORDS.has(word) &&
        !/^\d+$/.test(word)
      );
  }

  /**
   * Add a document to the corpus
   */
  addDocument(text: string, documentId: string): void {
    const tokens = this.tokenize(text);
    this.documents.set(documentId, tokens);

    // Update document frequency
    const uniqueTerms = new Set(tokens);
    uniqueTerms.forEach(term => {
      this.documentFrequency.set(
        term,
        (this.documentFrequency.get(term) || 0) + 1
      );
    });

    // Invalidate cache
    this.termCache.delete(documentId);
  }

  /**
   * Remove a document from the corpus
   */
  removeDocument(documentId: string): void {
    const tokens = this.documents.get(documentId);
    if (!tokens) return;

    // Update document frequency
    const uniqueTerms = new Set(tokens);
    uniqueTerms.forEach(term => {
      const freq = this.documentFrequency.get(term) || 0;
      if (freq <= 1) {
        this.documentFrequency.delete(term);
      } else {
        this.documentFrequency.set(term, freq - 1);
      }
    });

    this.documents.delete(documentId);
    this.termCache.delete(documentId);
  }

  /**
   * Calculate TF (Term Frequency) for a term in a document
   */
  private calculateTf(term: string, tokens: string[]): number {
    const count = tokens.filter(t => t === term).length;
    return count / tokens.length;
  }

  /**
   * Calculate IDF (Inverse Document Frequency) for a term
   */
  private calculateIdf(term: string): number {
    const docCount = this.documents.size;
    const termDocCount = this.documentFrequency.get(term) || 0;

    if (termDocCount === 0) return 0;

    // Add 1 to avoid division by zero and smooth the calculation
    return Math.log((docCount + 1) / (termDocCount + 1)) + 1;
  }

  /**
   * Get TF-IDF scores for all terms in a document
   */
  getTerms(documentId: string): TfIdfTerm[] {
    // Check cache
    if (this.termCache.has(documentId)) {
      return this.termCache.get(documentId)!;
    }

    const tokens = this.documents.get(documentId);
    if (!tokens) return [];

    const uniqueTerms = new Set(tokens);
    const terms: TfIdfTerm[] = [];

    uniqueTerms.forEach(term => {
      const tf = this.calculateTf(term, tokens);
      const idf = this.calculateIdf(term);
      terms.push({
        term,
        tf,
        idf,
        tfidf: tf * idf,
      });
    });

    // Sort by TF-IDF score descending
    terms.sort((a, b) => b.tfidf - a.tfidf);

    // Cache results
    this.termCache.set(documentId, terms);

    return terms;
  }

  /**
   * Get top N terms by TF-IDF score
   */
  getTopTerms(documentId: string, n: number = 10): TfIdfTerm[] {
    return this.getTerms(documentId).slice(0, n);
  }

  /**
   * Get document vector (term -> TF-IDF score)
   */
  getDocumentVector(documentId: string): DocumentVector {
    const terms = this.getTerms(documentId);
    const vector: DocumentVector = {};
    terms.forEach(t => {
      vector[t.term] = t.tfidf;
    });
    return vector;
  }

  /**
   * Calculate cosine similarity between two documents
   */
  cosineSimilarity(docId1: string, docId2: string): number {
    const vec1 = this.getDocumentVector(docId1);
    const vec2 = this.getDocumentVector(docId2);

    return cosineSimilarityVectors(vec1, vec2);
  }

  /**
   * Find most similar documents to a given document
   */
  findSimilar(documentId: string, topN: number = 5): Array<{ documentId: string; similarity: number }> {
    const results: Array<{ documentId: string; similarity: number }> = [];

    this.documents.forEach((_, otherId) => {
      if (otherId === documentId) return;

      const similarity = this.cosineSimilarity(documentId, otherId);
      results.push({ documentId: otherId, similarity });
    });

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topN);
  }

  /**
   * Get corpus statistics
   */
  getStats(): { documentCount: number; vocabularySize: number; avgDocLength: number } {
    let totalLength = 0;
    this.documents.forEach(tokens => {
      totalLength += tokens.length;
    });

    return {
      documentCount: this.documents.size,
      vocabularySize: this.documentFrequency.size,
      avgDocLength: this.documents.size > 0 ? totalLength / this.documents.size : 0,
    };
  }
}

/**
 * Calculate cosine similarity between two term vectors
 */
export function cosineSimilarityVectors(vec1: DocumentVector, vec2: DocumentVector): number {
  const allTerms = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  allTerms.forEach(term => {
    const v1 = vec1[term] || 0;
    const v2 = vec2[term] || 0;

    dotProduct += v1 * v2;
    norm1 += v1 * v1;
    norm2 += v2 * v2;
  });

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);

  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Quick TF-IDF similarity between two texts without building a corpus
 */
export function quickTfIdfSimilarity(text1: string, text2: string): number {
  const tfidf = new TfIdf();
  tfidf.addDocument(text1, 'doc1');
  tfidf.addDocument(text2, 'doc2');
  return tfidf.cosineSimilarity('doc1', 'doc2');
}

// ============================================================================
// LEVENSHTEIN DISTANCE IMPLEMENTATION
// ============================================================================

/**
 * Calculate Levenshtein distance (minimum edits) between two strings
 * Uses optimized space complexity O(min(m, n))
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  // Ensure s1 is the shorter string for space optimization
  if (s1.length > s2.length) {
    return levenshteinDistance(s2, s1);
  }

  const m = s1.length;
  const n = s2.length;

  // Base cases
  if (m === 0) return n;
  if (n === 0) return m;

  // Use two rows instead of full matrix for space optimization
  let prevRow = new Array(m + 1);
  let currRow = new Array(m + 1);

  // Initialize first row
  for (let i = 0; i <= m; i++) {
    prevRow[i] = i;
  }

  // Fill in the rest
  for (let j = 1; j <= n; j++) {
    currRow[0] = j;

    for (let i = 1; i <= m; i++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;

      currRow[i] = Math.min(
        prevRow[i] + 1,      // deletion
        currRow[i - 1] + 1,  // insertion
        prevRow[i - 1] + cost // substitution
      );
    }

    // Swap rows
    [prevRow, currRow] = [currRow, prevRow];
  }

  return prevRow[m];
}

/**
 * Calculate Levenshtein similarity (0-1 scale, 1 = identical)
 */
export function levenshteinSimilarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;

  const distance = levenshteinDistance(str1, str2);
  return 1 - (distance / maxLen);
}

/**
 * Check if two strings are similar within a threshold
 */
export function isSimilar(str1: string, str2: string, threshold: number = 0.8): boolean {
  return levenshteinSimilarity(str1, str2) >= threshold;
}

/**
 * Find best match for a string in a list of candidates
 */
export function findBestMatch(
  target: string,
  candidates: string[]
): { match: string; similarity: number; index: number } | null {
  if (candidates.length === 0) return null;

  let bestMatch = candidates[0];
  let bestSimilarity = levenshteinSimilarity(target, candidates[0]);
  let bestIndex = 0;

  for (let i = 1; i < candidates.length; i++) {
    const similarity = levenshteinSimilarity(target, candidates[i]);
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = candidates[i];
      bestIndex = i;
    }
  }

  return { match: bestMatch, similarity: bestSimilarity, index: bestIndex };
}

/**
 * Find all matches above a similarity threshold
 */
export function findAllMatches(
  target: string,
  candidates: string[],
  threshold: number = 0.7
): Array<{ match: string; similarity: number; index: number }> {
  const matches: Array<{ match: string; similarity: number; index: number }> = [];

  candidates.forEach((candidate, index) => {
    const similarity = levenshteinSimilarity(target, candidate);
    if (similarity >= threshold) {
      matches.push({ match: candidate, similarity, index });
    }
  });

  return matches.sort((a, b) => b.similarity - a.similarity);
}

// ============================================================================
// CHI-SQUARED TEST IMPLEMENTATION
// ============================================================================

/**
 * Calculate chi-squared statistic for observed vs expected frequencies
 */
export function chiSquaredTest(
  observed: number[],
  expected: number[]
): ChiSquaredResult {
  if (observed.length !== expected.length) {
    throw new Error('Observed and expected arrays must have the same length');
  }

  if (observed.length === 0) {
    return { chiSquared: 0, pValue: 1, significant: false, degreesOfFreedom: 0 };
  }

  let chiSquared = 0;

  for (let i = 0; i < observed.length; i++) {
    if (expected[i] === 0) continue; // Skip zero expected values
    const diff = observed[i] - expected[i];
    chiSquared += (diff * diff) / expected[i];
  }

  const degreesOfFreedom = observed.length - 1;
  const pValue = chiSquaredPValue(chiSquared, degreesOfFreedom);

  return {
    chiSquared,
    pValue,
    significant: pValue < 0.05,
    degreesOfFreedom,
  };
}

/**
 * Calculate p-value from chi-squared statistic using approximation
 * Based on Wilson-Hilferty transformation
 */
function chiSquaredPValue(chiSquared: number, df: number): number {
  if (df <= 0) return 1;
  if (chiSquared <= 0) return 1;

  // Use Wilson-Hilferty approximation for chi-squared CDF
  // This provides a reasonable approximation without needing complex gamma functions
  const z = Math.pow(chiSquared / df, 1/3) - (1 - 2 / (9 * df));
  const sigma = Math.sqrt(2 / (9 * df));
  const standardized = z / sigma;

  // Convert to p-value using standard normal CDF approximation
  return 1 - standardNormalCdf(standardized);
}

/**
 * Standard normal CDF approximation (Abramowitz and Stegun)
 */
function standardNormalCdf(x: number): number {
  if (x < -8) return 0;
  if (x > 8) return 1;

  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Perform chi-squared test for pattern frequency validation
 * Useful for Donna AI pattern significance testing
 */
export function testPatternSignificance(
  patternFrequencies: Map<string, number>,
  totalObservations: number,
  expectedDistribution?: Map<string, number>
): Map<string, ChiSquaredResult> {
  const results = new Map<string, ChiSquaredResult>();

  // If no expected distribution provided, assume uniform
  const numPatterns = patternFrequencies.size;
  const uniformExpected = totalObservations / numPatterns;

  patternFrequencies.forEach((observed, pattern) => {
    const expected = expectedDistribution?.get(pattern) || uniformExpected;

    // Single category chi-squared (goodness of fit)
    const chiSquared = Math.pow(observed - expected, 2) / expected;
    const pValue = chiSquaredPValue(chiSquared, 1);

    results.set(pattern, {
      chiSquared,
      pValue,
      significant: pValue < 0.05,
      degreesOfFreedom: 1,
    });
  });

  return results;
}

// ============================================================================
// N-GRAM EXTRACTION
// ============================================================================

/**
 * Extract n-grams from text
 */
export function extractNgrams(
  text: string,
  n: number = 2,
  options: {
    removeStopwords?: boolean;
    lowercase?: boolean;
    minCount?: number;
  } = {}
): NgramResult[] {
  const {
    removeStopwords = false,
    lowercase = true,
    minCount = 1
  } = options;

  let processedText = lowercase ? text.toLowerCase() : text;

  // Tokenize
  let tokens = processedText
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0);

  // Remove stopwords if requested
  if (removeStopwords) {
    tokens = tokens.filter(t => !ENGLISH_STOPWORDS.has(t.toLowerCase()));
  }

  // Generate n-grams
  const ngramCounts = new Map<string, number>();

  for (let i = 0; i <= tokens.length - n; i++) {
    const ngram = tokens.slice(i, i + n).join(' ');
    ngramCounts.set(ngram, (ngramCounts.get(ngram) || 0) + 1);
  }

  // Convert to array and filter by minCount
  const results: NgramResult[] = [];
  ngramCounts.forEach((count, ngram) => {
    if (count >= minCount) {
      results.push({ ngram, count });
    }
  });

  // Sort by count descending
  return results.sort((a, b) => b.count - a.count);
}

/**
 * Extract bigrams (2-grams)
 */
export function extractBigrams(text: string, options?: { removeStopwords?: boolean; minCount?: number }): NgramResult[] {
  return extractNgrams(text, 2, options);
}

/**
 * Extract trigrams (3-grams)
 */
export function extractTrigrams(text: string, options?: { removeStopwords?: boolean; minCount?: number }): NgramResult[] {
  return extractNgrams(text, 3, options);
}

/**
 * Extract common legal/contract phrases using n-grams
 */
export function extractLegalPhrases(text: string): string[] {
  const LEGAL_PATTERNS = [
    'shall not', 'shall be', 'must not', 'may not',
    'liability cap', 'limitation of liability', 'indemnification',
    'force majeure', 'governing law', 'dispute resolution',
    'confidential information', 'intellectual property',
    'termination for', 'breach of', 'material breach',
    'without prejudice', 'subject to', 'in accordance with',
    'notwithstanding', 'provided that', 'except as',
    'warranty disclaimer', 'as is', 'without warranty',
  ];

  const lowerText = text.toLowerCase();
  const found: string[] = [];

  // Check for known legal phrases
  LEGAL_PATTERNS.forEach(phrase => {
    if (lowerText.includes(phrase)) {
      found.push(phrase);
    }
  });

  // Also extract frequent bigrams that might be legal terms
  const bigrams = extractBigrams(text, { minCount: 2 });
  bigrams.slice(0, 20).forEach(({ ngram }) => {
    if (!found.includes(ngram) && ngram.split(' ').some(w => w.length > 4)) {
      found.push(ngram);
    }
  });

  return found;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Normalize text for comparison
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate Jaccard similarity between two sets of tokens
 */
export function jaccardSimilarity(text1: string, text2: string): number {
  const tokens1 = new Set(normalizeText(text1).split(' ').filter(t => t.length > 2));
  const tokens2 = new Set(normalizeText(text2).split(' ').filter(t => t.length > 2));

  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);

  if (union.size === 0) return 0;

  return intersection.size / union.size;
}

/**
 * Extract keywords from text using TF-IDF-like scoring
 */
export function extractKeywords(text: string, topN: number = 10): string[] {
  const tokens = normalizeText(text)
    .split(' ')
    .filter(t => t.length > 3 && !ENGLISH_STOPWORDS.has(t));

  // Count frequencies
  const freq = new Map<string, number>();
  tokens.forEach(t => {
    freq.set(t, (freq.get(t) || 0) + 1);
  });

  // Sort by frequency and return top N
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([term]) => term);
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export const NLP = {
  // TF-IDF
  TfIdf,
  cosineSimilarityVectors,
  quickTfIdfSimilarity,

  // Levenshtein
  levenshteinDistance,
  levenshteinSimilarity,
  isSimilar,
  findBestMatch,
  findAllMatches,

  // Chi-squared
  chiSquaredTest,
  testPatternSignificance,

  // N-grams
  extractNgrams,
  extractBigrams,
  extractTrigrams,
  extractLegalPhrases,

  // Utilities
  normalizeText,
  jaccardSimilarity,
  extractKeywords,

  // Constants
  ENGLISH_STOPWORDS,
};

export default NLP;
