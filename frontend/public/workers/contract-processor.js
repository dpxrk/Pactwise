/**
 * Web Worker for processing contract data
 * Handles heavy computations off the main thread
 */

// Contract text processing functions
function extractKeyTerms(text) {
  if (!text) return [];
  
  // Common contract keywords to look for
  const keywords = [
    'payment', 'term', 'termination', 'liability', 'warranty',
    'confidential', 'intellectual property', 'indemnity', 'force majeure',
    'dispute', 'governing law', 'notice', 'amendment', 'assignment'
  ];
  
  const foundTerms = [];
  const lowerText = text.toLowerCase();
  
  keywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      // Count occurrences
      const regex = new RegExp(keyword, 'gi');
      const matches = text.match(regex);
      foundTerms.push({
        term: keyword,
        count: matches ? matches.length : 0,
        positions: findPositions(text, keyword)
      });
    }
  });
  
  return foundTerms.sort((a, b) => b.count - a.count);
}

function findPositions(text, keyword) {
  const positions = [];
  const regex = new RegExp(keyword, 'gi');
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    positions.push({
      start: match.index,
      end: match.index + match[0].length
    });
  }
  
  return positions;
}

function calculateReadabilityScore(text) {
  if (!text) return { score: 0, level: 'N/A' };
  
  // Simple readability calculation
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const syllables = words.reduce((count, word) => count + countSyllables(word), 0);
  
  const avgWordsPerSentence = words.length / (sentences.length || 1);
  const avgSyllablesPerWord = syllables / (words.length || 1);
  
  // Flesch Reading Ease Score
  const score = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  
  let level;
  if (score >= 90) level = 'Very Easy';
  else if (score >= 80) level = 'Easy';
  else if (score >= 70) level = 'Fairly Easy';
  else if (score >= 60) level = 'Standard';
  else if (score >= 50) level = 'Fairly Difficult';
  else if (score >= 30) level = 'Difficult';
  else level = 'Very Difficult';
  
  return {
    score: Math.max(0, Math.min(100, score)),
    level,
    avgWordsPerSentence: Math.round(avgWordsPerSentence),
    avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 10) / 10
  };
}

function countSyllables(word) {
  word = word.toLowerCase();
  let count = 0;
  let previousWasVowel = false;
  
  for (let i = 0; i < word.length; i++) {
    const isVowel = 'aeiouy'.includes(word[i]);
    if (isVowel && !previousWasVowel) {
      count++;
    }
    previousWasVowel = isVowel;
  }
  
  // Adjust for silent e
  if (word.endsWith('e')) {
    count--;
  }
  
  // Ensure at least one syllable
  return Math.max(1, count);
}

function analyzeContractStructure(text) {
  if (!text) return { sections: [], warnings: [] };
  
  const sections = [];
  const warnings = [];
  
  // Common section patterns
  const sectionPatterns = [
    /^\s*\d+\.?\s+([A-Z][A-Z\s]+)$/gm,
    /^[A-Z][A-Z\s]+:$/gm,
    /^ARTICLE\s+[IVXLCDM]+\.\s+(.+)$/gm
  ];
  
  sectionPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      sections.push({
        title: match[1] || match[0],
        position: match.index,
        level: determineSectionLevel(match[0])
      });
    }
  });
  
  // Sort sections by position
  sections.sort((a, b) => a.position - b.position);
  
  // Check for missing common sections
  const commonSections = ['TERMS', 'PAYMENT', 'TERMINATION', 'WARRANTIES'];
  commonSections.forEach(section => {
    if (!sections.some(s => s.title.toUpperCase().includes(section))) {
      warnings.push(`Missing ${section} section`);
    }
  });
  
  return { sections, warnings };
}

function determineSectionLevel(title) {
  if (/^ARTICLE/i.test(title)) return 1;
  if (/^\d+\.\s/.test(title)) return 2;
  if (/^\d+\.\d+\s/.test(title)) return 3;
  return 2;
}

function extractDates(text) {
  if (!text) return [];
  
  const dates = [];
  const datePatterns = [
    /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/g,
    /\b(\w+)\s+(\d{1,2}),?\s+(\d{4})\b/g,
    /\b(\d{1,2})\s+(\w+)\s+(\d{4})\b/g
  ];
  
  datePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      dates.push({
        text: match[0],
        position: match.index,
        type: classifyDateType(text, match.index)
      });
    }
  });
  
  return dates;
}

function classifyDateType(text, position) {
  const context = text.substring(Math.max(0, position - 50), position).toLowerCase();
  
  if (context.includes('effective') || context.includes('commence')) return 'effective';
  if (context.includes('expire') || context.includes('end')) return 'expiration';
  if (context.includes('sign')) return 'signature';
  if (context.includes('due') || context.includes('payment')) return 'payment';
  
  return 'other';
}

function calculateRiskScore(contract) {
  let riskScore = 0;
  const risks = [];
  
  // Check for unlimited liability
  if (contract.text && /unlimited\s+liability/i.test(contract.text)) {
    riskScore += 30;
    risks.push({ type: 'liability', severity: 'high', description: 'Unlimited liability clause detected' });
  }
  
  // Check for auto-renewal
  if (contract.text && /auto.*renew/i.test(contract.text)) {
    riskScore += 10;
    risks.push({ type: 'renewal', severity: 'medium', description: 'Auto-renewal clause detected' });
  }
  
  // Check for missing termination clause
  if (contract.text && !/terminat/i.test(contract.text)) {
    riskScore += 20;
    risks.push({ type: 'termination', severity: 'high', description: 'No termination clause found' });
  }
  
  // Check contract value
  if (contract.value > 1000000) {
    riskScore += 15;
    risks.push({ type: 'financial', severity: 'medium', description: 'High value contract' });
  }
  
  return {
    score: Math.min(100, riskScore),
    risks,
    level: riskScore > 50 ? 'high' : riskScore > 25 ? 'medium' : 'low'
  };
}

// Message handler
self.addEventListener('message', async (event) => {
  const { type, data, id } = event.data;
  
  try {
    let result;
    
    switch (type) {
      case 'extractKeyTerms':
        result = extractKeyTerms(data.text);
        break;
        
      case 'analyzeReadability':
        result = calculateReadabilityScore(data.text);
        break;
        
      case 'analyzeStructure':
        result = analyzeContractStructure(data.text);
        break;
        
      case 'extractDates':
        result = extractDates(data.text);
        break;
        
      case 'calculateRisk':
        result = calculateRiskScore(data.contract);
        break;
        
      case 'fullAnalysis':
        // Perform all analyses
        const { text, contract } = data;
        result = {
          keyTerms: extractKeyTerms(text),
          readability: calculateReadabilityScore(text),
          structure: analyzeContractStructure(text),
          dates: extractDates(text),
          risk: calculateRiskScore({ ...contract, text })
        };
        break;
        
      default:
        throw new Error(`Unknown operation: ${type}`);
    }
    
    // Send result back
    self.postMessage({
      id,
      type: 'result',
      data: result
    });
    
  } catch (error) {
    self.postMessage({
      id,
      type: 'error',
      error: error.message
    });
  }
});