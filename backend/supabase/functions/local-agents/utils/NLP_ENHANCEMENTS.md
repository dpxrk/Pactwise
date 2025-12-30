# NLP Enhancements Documentation

## Overview

This document describes the Phase 1 NLP enhancements added to the Pactwise agent system to improve accuracy and move toward state-of-the-art non-LLM contract intelligence.

## Enhancements Implemented

### 1. TF-IDF (Term Frequency-Inverse Document Frequency)

**Purpose:** Calculate document similarity and term importance for contract analysis.

**Algorithm:**
```
TF(t,d) = count(t in d) / total_words(d)
IDF(t,D) = log(|D| / (1 + docs_containing(t)))
TF-IDF(t,d,D) = TF(t,d) × IDF(t,D)
```

**Use Cases:**
- Contract similarity detection
- Clause matching across documents
- Keyword importance ranking
- Policy comparison

**Files Modified:**
- `utils/nlp.ts` - Core implementation
- `agents/secretary.ts` - Document similarity
- `agents/legal.ts` - Clause matching

---

### 2. Levenshtein Distance (Edit Distance)

**Purpose:** Calculate string similarity for fuzzy matching and deduplication.

**Algorithm:**
```
levenshtein(a, b) =
  if min(len(a), len(b)) == 0: max(len(a), len(b))
  else: min(
    levenshtein(a[:-1], b) + 1,      // deletion
    levenshtein(a, b[:-1]) + 1,      // insertion
    levenshtein(a[:-1], b[:-1]) + cost // substitution
  )
```

**Similarity Score:**
```
similarity = 1 - (levenshtein(a, b) / max(len(a), len(b)))
```

**Use Cases:**
- Vendor name deduplication
- Typo detection in contract data
- Fuzzy search matching
- Address standardization

**Files Modified:**
- `utils/nlp.ts` - Core implementation
- `agents/data-quality.ts` - Enhanced fuzzy matching

---

### 3. Chi-Squared Test for Pattern Significance

**Purpose:** Statistically validate pattern significance in Donna AI learning.

**Algorithm:**
```
χ² = Σ((O - E)² / E)

where:
  O = observed frequency
  E = expected frequency
  df = degrees of freedom

p-value calculated from chi-squared distribution
```

**Use Cases:**
- Validate pattern significance in Donna AI
- Filter noise from learned patterns
- Ensure statistical rigor in recommendations
- Confidence scoring with p-values

**Files Modified:**
- `utils/nlp.ts` - Core implementation
- `donna/base.ts` - Pattern significance testing

---

### 4. N-gram Extraction (Bonus)

**Purpose:** Extract phrase-level patterns for better clause detection.

**Implementation:**
- Unigrams (single words)
- Bigrams (two-word phrases)
- Trigrams (three-word phrases)
- Configurable n-gram size

**Use Cases:**
- Legal phrase detection ("shall not", "liability cap")
- Contract clause identification
- Risk phrase extraction
- Compliance term detection

---

## API Reference

### `NLP` Class

```typescript
import { NLP } from './utils/nlp.ts';

// Create TF-IDF index
const tfidf = new NLP.TfIdf();
tfidf.addDocument('contract text here', 'doc1');
tfidf.addDocument('another contract', 'doc2');

// Get term importance
const terms = tfidf.getTopTerms('doc1', 10);
// Returns: [{ term: 'liability', score: 0.85 }, ...]

// Calculate document similarity
const similarity = tfidf.cosineSimilarity('doc1', 'doc2');
// Returns: 0.72 (0-1 scale)

// Levenshtein distance
const distance = NLP.levenshteinDistance('Acme Corp', 'Acme Corporation');
// Returns: 7 (edits needed)

const similarity = NLP.levenshteinSimilarity('Acme Corp', 'Acme Corporation');
// Returns: 0.56 (0-1 scale)

// Chi-squared test
const result = NLP.chiSquaredTest(observed, expected);
// Returns: { chiSquared: 12.5, pValue: 0.002, significant: true, df: 3 }

// N-gram extraction
const bigrams = NLP.extractNgrams('shall not exceed liability', 2);
// Returns: ['shall not', 'not exceed', 'exceed liability']
```

---

## Performance Characteristics

| Function | Time Complexity | Space Complexity |
|----------|-----------------|------------------|
| TF-IDF addDocument | O(n) | O(n) per document |
| TF-IDF similarity | O(v) | O(1) where v = vocab size |
| Levenshtein | O(m × n) | O(min(m, n)) optimized |
| Chi-squared | O(n) | O(1) |
| N-grams | O(n) | O(n × k) where k = n-gram size |

---

## Integration Points

### Secretary Agent
```typescript
// Document similarity for duplicate detection
const similarity = NLP.TfIdf.documentSimilarity(doc1, doc2);
if (similarity > 0.9) {
  // Flag as potential duplicate
}
```

### Legal Agent
```typescript
// Clause matching with TF-IDF
const clauseTerms = tfidf.getTopTerms(clauseId);
const riskPhrases = NLP.extractNgrams(text, 2)
  .filter(phrase => RISK_PHRASES.includes(phrase));
```

### Data Quality Agent
```typescript
// Fuzzy vendor matching
const similarity = NLP.levenshteinSimilarity(vendor1, vendor2);
if (similarity > 0.85) {
  // Potential duplicate vendor
}
```

### Donna AI
```typescript
// Pattern significance testing
const result = NLP.chiSquaredTest(observedFreq, expectedFreq);
if (result.significant && result.pValue < 0.05) {
  // Pattern is statistically significant
  pattern.confidence *= 1.1; // Boost confidence
}
```

---

## Expected Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Contract similarity accuracy | ~60% | ~75% | +15% |
| Vendor deduplication | ~70% | ~85% | +15% |
| Pattern significance | Heuristic | Statistical | Validated |
| Clause detection | Word-level | Phrase-level | +12% |

---

## Testing

```bash
# Run NLP utility tests
npm run test:nlp

# Test TF-IDF specifically
npm run test -- --grep "TF-IDF"

# Test Levenshtein
npm run test -- --grep "Levenshtein"
```

---

## Future Enhancements (Phase 2+)

1. **Seasonal Decomposition (STL)** - Time series forecasting
2. **Decision Tree Induction** - Automatic rule learning
3. **CRF-based NER** - Named entity recognition without regex
4. **Ensemble Methods** - Random Forest for risk scoring

---

## References

- [TF-IDF Wikipedia](https://en.wikipedia.org/wiki/Tf%E2%80%93idf)
- [Levenshtein Distance](https://en.wikipedia.org/wiki/Levenshtein_distance)
- [Chi-squared Test](https://en.wikipedia.org/wiki/Chi-squared_test)
- [2025 Construction Contract NLP Research](https://www.sciencedirect.com/science/article/pii/S0166361525000168)
