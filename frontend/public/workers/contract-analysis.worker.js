/**
 * Web Worker for contract analysis and text processing
 * Handles heavy computations for contract analysis off the main thread
 */

// Calculate cosine similarity between two vectors
function cosineSimilarity(vec1, vec2) {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) return 0;
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  
  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);
  
  if (norm1 === 0 || norm2 === 0) return 0;
  return dotProduct / (norm1 * norm2);
}

// Analyze contract text and extract key information
async function analyzeContractText(text, options = {}) {
  const result = {
    wordCount: 0,
    sentences: 0,
    paragraphs: 0,
    readabilityScore: 0,
    keyTerms: [],
    clauses: [],
    risks: [],
    suggestions: []
  };

  // Basic text analysis
  result.wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
  result.sentences = (text.match(/[.!?]+/g) || []).length;
  result.paragraphs = (text.split(/\n\n+/).filter(p => p.trim().length > 0)).length;
  
  // Calculate readability score (Flesch Reading Ease approximation)
  const syllableCount = estimateSyllables(text);
  if (result.sentences > 0 && result.wordCount > 0) {
    result.readabilityScore = 206.835 - 1.015 * (result.wordCount / result.sentences) - 84.6 * (syllableCount / result.wordCount);
  }

  // Extract key terms
  result.keyTerms = extractKeyTerms(text);
  
  // Identify common clauses
  result.clauses = identifyClauses(text);
  
  // Risk analysis
  result.risks = analyzeRisks(text, result.clauses);
  
  // Generate suggestions
  result.suggestions = generateSuggestions(result);

  return result;
}

// Find similar clauses using embeddings
async function findSimilarClauses(targetClause, clauseDatabase, options = {}) {
  const { targetEmbedding, threshold = 0.7, topK = 10 } = options;
  
  if (!targetEmbedding) {
    return { error: 'Target embedding required for similarity search' };
  }

  const similarities = [];
  
  // Calculate similarities with progress reporting
  const total = clauseDatabase.length;
  let processed = 0;
  
  for (const clause of clauseDatabase) {
    if (clause.embedding) {
      const similarity = cosineSimilarity(targetEmbedding, clause.embedding);
      if (similarity >= threshold) {
        similarities.push({
          ...clause,
          similarity,
          matchPercentage: Math.round(similarity * 100)
        });
      }
    }
    
    processed++;
    if (processed % 100 === 0) {
      self.postMessage({
        type: 'PROGRESS',
        data: { processed, total, percentage: (processed / total) * 100 }
      });
    }
  }
  
  // Sort by similarity and return top K
  similarities.sort((a, b) => b.similarity - a.similarity);
  return similarities.slice(0, topK);
}

// Calculate contract risk score
async function calculateRiskScore(contract, vendorData = {}) {
  const risks = {
    overall: 0,
    categories: {
      legal: 0,
      financial: 0,
      operational: 0,
      compliance: 0
    },
    factors: []
  };

  // Financial risk factors
  if (contract.extractedPricing) {
    const value = parseFloat(contract.extractedPricing.replace(/[^0-9.-]/g, '') || '0');
    if (value > 1000000) {
      risks.categories.financial += 30;
      risks.factors.push({
        type: 'high_value',
        score: 30,
        description: 'High contract value exceeds $1M'
      });
    }
  }

  // Legal risk factors
  const riskyTerms = [
    'indemnification', 'liability', 'termination for convenience',
    'liquidated damages', 'non-compete', 'exclusivity'
  ];
  
  const contractText = contract.content || '';
  riskyTerms.forEach(term => {
    if (contractText.toLowerCase().includes(term)) {
      risks.categories.legal += 10;
      risks.factors.push({
        type: 'risky_term',
        score: 10,
        description: `Contains risky term: ${term}`
      });
    }
  });

  // Operational risks
  if (contract.extractedEndDate) {
    const daysUntilExpiry = Math.floor(
      (new Date(contract.extractedEndDate) - new Date()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysUntilExpiry < 30 && daysUntilExpiry >= 0) {
      risks.categories.operational += 20;
      risks.factors.push({
        type: 'expiring_soon',
        score: 20,
        description: `Expires in ${daysUntilExpiry} days`
      });
    }
  }

  // Compliance risks
  if (!contract.analysisStatus || contract.analysisStatus === 'pending') {
    risks.categories.compliance += 15;
    risks.factors.push({
      type: 'unreviewed',
      score: 15,
      description: 'Contract has not been fully reviewed'
    });
  }

  // Vendor-related risks
  if (vendorData.riskLevel === 'high') {
    risks.categories.operational += 25;
    risks.factors.push({
      type: 'high_risk_vendor',
      score: 25,
      description: 'Vendor classified as high risk'
    });
  }

  // Calculate overall risk
  Object.values(risks.categories).forEach(score => {
    risks.overall += score;
  });
  
  // Normalize to 0-100 scale
  risks.overall = Math.min(100, Math.round(risks.overall));
  
  return risks;
}

// Bulk contract processing
async function processBulkContracts(contracts, operation) {
  const results = {
    processed: 0,
    failed: 0,
    results: []
  };

  const batchSize = 50;
  const batches = [];
  
  // Split into batches
  for (let i = 0; i < contracts.length; i += batchSize) {
    batches.push(contracts.slice(i, i + batchSize));
  }

  // Process batches
  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(async (contract) => {
        try {
          let result;
          switch (operation) {
            case 'analyze':
              result = await analyzeContractText(contract.content || '');
              break;
            case 'risk_assessment':
              result = await calculateRiskScore(contract);
              break;
            case 'extract_metadata':
              result = extractContractMetadata(contract);
              break;
            default:
              throw new Error('Unknown operation');
          }
          results.processed++;
          return { success: true, contractId: contract._id, data: result };
        } catch (error) {
          results.failed++;
          return { success: false, contractId: contract._id, error: error.message };
        }
      })
    );
    
    results.results.push(...batchResults);
    
    // Report progress
    self.postMessage({
      type: 'PROGRESS',
      data: {
        processed: results.processed,
        total: contracts.length,
        percentage: (results.processed / contracts.length) * 100
      }
    });
  }

  return results;
}

// Helper functions
function estimateSyllables(text) {
  // Simple syllable estimation
  const words = text.toLowerCase().split(/\s+/);
  let syllables = 0;
  
  words.forEach(word => {
    word = word.replace(/[^a-z]/g, '');
    if (word.length <= 3) {
      syllables += 1;
    } else {
      syllables += word.match(/[aeiou]/g)?.length || 1;
    }
  });
  
  return syllables;
}

function extractKeyTerms(text) {
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
    'should', 'may', 'might', 'must', 'can', 'could', 'this', 'that', 'these',
    'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which'
  ]);

  const words = text.toLowerCase().split(/\s+/)
    .map(word => word.replace(/[^a-z0-9]/g, ''))
    .filter(word => word.length > 3 && !commonWords.has(word));

  const wordFreq = {};
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });

  return Object.entries(wordFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([word, count]) => ({ term: word, frequency: count }));
}

function identifyClauses(text) {
  const clausePatterns = [
    { type: 'payment', pattern: /payment\s+terms?|invoic\w+|billing/i },
    { type: 'termination', pattern: /terminat\w+|end\s+of\s+agreement/i },
    { type: 'confidentiality', pattern: /confidential\w+|non-disclosure|proprietary/i },
    { type: 'liability', pattern: /liabilit\w+|damages|indemni\w+/i },
    { type: 'warranty', pattern: /warrant\w+|guarantee/i },
    { type: 'intellectual_property', pattern: /intellectual\s+property|copyright|patent/i },
    { type: 'force_majeure', pattern: /force\s+majeure|act\s+of\s+god/i },
    { type: 'dispute_resolution', pattern: /dispute|arbitration|mediation/i }
  ];

  const clauses = [];
  const sentences = text.split(/[.!?]+/);

  sentences.forEach((sentence, index) => {
    clausePatterns.forEach(({ type, pattern }) => {
      if (pattern.test(sentence)) {
        clauses.push({
          type,
          text: sentence.trim(),
          position: index,
          confidence: 0.8
        });
      }
    });
  });

  return clauses;
}

function analyzeRisks(text, clauses) {
  const risks = [];
  
  // Check for missing important clauses
  const requiredClauses = ['termination', 'liability', 'dispute_resolution'];
  const foundClauseTypes = new Set(clauses.map(c => c.type));
  
  requiredClauses.forEach(required => {
    if (!foundClauseTypes.has(required)) {
      risks.push({
        type: 'missing_clause',
        severity: 'medium',
        description: `Missing ${required.replace('_', ' ')} clause`
      });
    }
  });

  // Check for risky language
  const riskyPhrases = [
    { phrase: 'unlimited liability', severity: 'high' },
    { phrase: 'no termination', severity: 'high' },
    { phrase: 'automatic renewal', severity: 'medium' },
    { phrase: 'exclusive', severity: 'medium' }
  ];

  riskyPhrases.forEach(({ phrase, severity }) => {
    if (text.toLowerCase().includes(phrase)) {
      risks.push({
        type: 'risky_language',
        severity,
        description: `Contains risky phrase: "${phrase}"`
      });
    }
  });

  return risks;
}

function generateSuggestions(analysis) {
  const suggestions = [];

  // Readability suggestions
  if (analysis.readabilityScore < 30) {
    suggestions.push({
      type: 'readability',
      priority: 'high',
      description: 'Contract is difficult to read. Consider simplifying language.'
    });
  }

  // Length suggestions
  if (analysis.wordCount > 10000) {
    suggestions.push({
      type: 'length',
      priority: 'medium',
      description: 'Contract is very long. Consider adding an executive summary.'
    });
  }

  // Risk-based suggestions
  analysis.risks.forEach(risk => {
    if (risk.type === 'missing_clause') {
      suggestions.push({
        type: 'completeness',
        priority: 'high',
        description: `Add ${risk.description.toLowerCase()}`
      });
    }
  });

  return suggestions;
}

function extractContractMetadata(contract) {
  const metadata = {
    dates: [],
    amounts: [],
    parties: [],
    references: []
  };

  const text = contract.content || '';

  // Extract dates
  const datePattern = /\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4})\b/gi;
  metadata.dates = [...new Set(text.match(datePattern) || [])];

  // Extract amounts
  const amountPattern = /\$[\d,]+\.?\d*|\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|dollars?)/gi;
  metadata.amounts = [...new Set(text.match(amountPattern) || [])];

  // Extract potential party names (simplified)
  const partyPattern = /(?:between|party|vendor|client|customer|supplier)\s+([A-Z][A-Za-z\s&,]+?)(?:\s+and|\s+\(|,)/gi;
  let match;
  while ((match = partyPattern.exec(text)) !== null) {
    metadata.parties.push(match[1].trim());
  }

  // Extract references
  const refPattern = /(?:Exhibit|Appendix|Schedule|Attachment)\s+[A-Z0-9]+/gi;
  metadata.references = [...new Set(text.match(refPattern) || [])];

  return metadata;
}

// Message handler
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;

  try {
    switch (type) {
      case 'ANALYZE_CONTRACT':
        const analysis = await analyzeContractText(data.text, data.options);
        self.postMessage({ type: 'ANALYZE_CONTRACT_RESULT', data: analysis });
        break;

      case 'FIND_SIMILAR_CLAUSES':
        const similar = await findSimilarClauses(
          data.targetClause,
          data.clauseDatabase,
          data.options
        );
        self.postMessage({ type: 'FIND_SIMILAR_CLAUSES_RESULT', data: similar });
        break;

      case 'CALCULATE_RISK':
        const risk = await calculateRiskScore(data.contract, data.vendorData);
        self.postMessage({ type: 'CALCULATE_RISK_RESULT', data: risk });
        break;

      case 'PROCESS_BULK':
        const bulkResult = await processBulkContracts(data.contracts, data.operation);
        self.postMessage({ type: 'PROCESS_BULK_RESULT', data: bulkResult });
        break;

      case 'CALCULATE_SIMILARITY':
        const similarity = cosineSimilarity(data.vec1, data.vec2);
        self.postMessage({ type: 'CALCULATE_SIMILARITY_RESULT', data: similarity });
        break;

      default:
        self.postMessage({ 
          type: 'ERROR', 
          error: `Unknown operation: ${type}` 
        });
    }
  } catch (error) {
    self.postMessage({ 
      type: 'ERROR', 
      error: error.message || 'Processing error' 
    });
  }
});