# Secretary Agent Production-Ready Upgrade

**Date:** 2026-01-26
**Goal:** Upgrade Secretary Agent from 55/100 to 95/100
**Status:** Approved, Ready for Implementation

---

## Overview

The Secretary Agent is a core component of Pactwise responsible for document processing, data extraction, and contract analysis. This upgrade addresses critical gaps in test coverage, OCR implementation, error handling, input validation, and configuration.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECRETARY AGENT v2.0                         │
├─────────────────────────────────────────────────────────────────┤
│  1. INPUT VALIDATION      │  Zod schemas for all inputs        │
│  2. OCR ENGINE            │  pdf-parse for text extraction     │
│  3. ERROR HANDLING        │  Try-catch + structured logging    │
│  4. EXTRACTION METHODS    │  Hardened with edge case handling  │
│  5. CONFIGURATION         │  Enterprise-configurable thresholds│
│  6. TEST SUITE            │  80%+ coverage, real Supabase      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `agents/secretary.ts` | Modify | Add validation, error handling, fix issues |
| `schemas/secretary.ts` | Create | Zod schemas for Secretary inputs |
| `agents/ocr.ts` | Modify | Implement real pdf-parse extraction |
| `tests/local-agents.test.ts` | Modify | Add 50+ comprehensive tests |
| `config/secretary-config.ts` | Create | Configurable thresholds |

---

## 1. Input Validation (Zod Schemas)

**Location:** `backend/supabase/functions/local-agents/schemas/secretary.ts`

### Schemas

```typescript
// Core input schemas
SecretaryInputSchema        // Base input validation
ContractDocumentSchema      // Contract-specific fields
VendorDocumentSchema        // Vendor-specific fields
GeneralDocumentSchema       // Generic document fields

// Extraction result schemas
ExtractedDateSchema         // Validates date extraction results
ExtractedAmountSchema       // Validates amount extraction results
ExtractedPartySchema        // Validates party extraction results
ClauseAnalysisSchema        // Validates clause analysis results
```

### Validation Points

| Entry Point | What Gets Validated |
|-------------|---------------------|
| `process()` | All incoming data before processing |
| `processContractDocument()` | contractId format, content length |
| `processVendorDocument()` | vendorId format, required fields |
| `extractAmounts()` | Output validation (no NaN, valid currency) |
| `extractDates()` | Output validation (valid ISO dates) |

---

## 2. OCR Implementation (pdf-parse)

**Location:** `backend/supabase/functions/local-agents/agents/ocr.ts`

### Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Document   │────▶│  Supabase    │────▶│   pdf-parse     │
│  Upload     │     │  Storage     │     │   Extraction    │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                  │
                    ┌──────────────┐              │
                    │  ocr_results │◀─────────────┘
                    │    table     │
                    └──────────────┘
```

### Confidence Scoring

| Condition | Confidence |
|-----------|------------|
| Native PDF with clean text | 0.95 |
| PDF with some extraction issues | 0.75 |
| Very short extraction (<100 chars) | 0.50 |
| Empty extraction | 0.10 |
| Image file (unsupported) | 0.00 |

---

## 3. Error Handling Strategy

### Error Categories

| Category | Example | Handling |
|----------|---------|----------|
| **Input Error** | Empty content, invalid ID | Return `success: false` with validation error |
| **Extraction Error** | Malformed date, NaN amount | Skip item, add warning to `insights[]`, continue |
| **Database Error** | Query failed, timeout | Retry once, then return error with context |
| **External Error** | Storage unavailable | Return partial result with degraded flag |

### Implementation Pattern

```typescript
// Tracked failure with context
private parseDate(dateStr: string, context?: string): ParseResult<string> {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return { success: false, error: `Invalid date: "${dateStr}"`, context };
    }
    return { success: true, value: date.toISOString().split('T')[0] };
  } catch (e) {
    return { success: false, error: e.message, context };
  }
}
```

---

## 4. Configuration System

**Location:** `backend/supabase/functions/local-agents/config/secretary-config.ts`

### Configurable Thresholds

```typescript
export interface SecretaryConfig {
  // Value thresholds
  highValueContractThreshold: number;      // Default: 100000
  criticalValueContractThreshold: number;  // Default: 500000

  // Completeness thresholds
  minCompletenessScore: number;            // Default: 0.7
  minReadabilityScore: number;             // Default: 30

  // Extraction settings
  maxDocumentLength: number;               // Default: 5000000 (5MB text)
  minPartyCount: number;                   // Default: 2

  // Risk patterns (enterprise-customizable)
  riskyClausePatterns: string[];           // Default: standard patterns

  // Expiration warnings
  expirationWarningDays: number;           // Default: 90
  criticalExpirationDays: number;          // Default: 30
}
```

### Enterprise Override

- Stored in `enterprise_settings` table with key `secretary_agent_config`
- Loaded once per agent instantiation, cached for 5 minutes
- Falls back to defaults if no custom config exists

---

## 5. Test Suite

**Location:** `backend/tests/local-agents.test.ts`

### Test Enterprise

- ID: `test-enterprise-secretary-agent`
- Seeded with controlled test data
- Real Supabase integration (no mocks)

### Test Categories (50+ tests)

| Category | Tests | Coverage Target |
|----------|-------|-----------------|
| **Input Validation** | 8 tests | Empty, null, malformed, oversized |
| **Date Extraction** | 6 tests | Valid, invalid, edge formats, timezone |
| **Amount Extraction** | 6 tests | USD, other currencies, negative, NaN |
| **Party Extraction** | 5 tests | Single, multiple, malformed names |
| **Clause Analysis** | 6 tests | Risky, standard, empty, mixed |
| **Document Classification** | 5 tests | All 9 contract types |
| **OCR Integration** | 4 tests | PDF success, empty, large, unsupported |
| **Error Recovery** | 5 tests | DB failure, timeout, partial data |
| **Configuration** | 3 tests | Custom thresholds, defaults, override |
| **End-to-End** | 4 tests | Full contract workflow, vendor workflow |

### Test Fixtures

```typescript
const TEST_CONTRACTS = {
  highValue: { title: 'High Value MSA', value: 500000 },
  expiringSoon: { title: 'Expiring Contract', end_date: '30 days from now' },
  missingDates: { title: 'Incomplete Contract', end_date: null },
  riskyClause: { content: 'unlimited liability...' },
  multiLanguage: { content: 'Contrato de Servicios...' },
};
```

---

## Implementation Order

1. **Create Zod schemas** (`schemas/secretary.ts`)
2. **Create configuration system** (`config/secretary-config.ts`)
3. **Implement OCR with pdf-parse** (`agents/ocr.ts`)
4. **Harden Secretary Agent** (`agents/secretary.ts`)
5. **Create test fixtures and comprehensive tests** (`tests/local-agents.test.ts`)
6. **Run tests and fix issues**

---

## Success Criteria

- [ ] All 50+ tests passing
- [ ] 80%+ code coverage on Secretary Agent
- [ ] Zero silent failures
- [ ] OCR extracts text from PDFs successfully
- [ ] Configuration is enterprise-customizable
- [ ] All extraction methods have input validation
- [ ] Grade improved from 55/100 to 95/100
