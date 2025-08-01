/**
 * Local AI Analysis Engine
 * Replaces OpenAI with local rule-based analysis and processing
 */

// Local AI analysis - no external config needed

// Local analysis types
export interface ContractAnalysis {
  parties: Array<{ name: string; role: string; contact?: string }>;
  startDate: string | null;
  endDate: string | null;
  paymentSchedule: Array<{ date: string; amount: number; description: string }>;
  pricing: {
    totalValue: number | null;
    currency: string | null;
    paymentMethod: string | null;
  };
  scope: string | null;
  keyTerms: Array<{ term: string; description: string; importance: 'high' | 'medium' | 'low' }>;
  risks: Array<{ title: string; description: string; severity: 'low' | 'medium' | 'high'; confidence: number }>;
  clauses: Array<{ type: string; content: string; importance: 'high' | 'medium' | 'low' }>;
  summary: string;
  confidence: number;
}

export interface ChatResponse {
  message: string;
  suggestions: string[];
  confidence: number;
  sources?: string[];
}

export interface EmbeddingVector {
  vector: number[];
  dimensions: number;
}

/**
 * Local Contract Analysis Engine
 * Uses rule-based analysis, regex patterns, and NLP techniques
 */
export class LocalContractAnalyzer {
  private datePatterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
    /(\w+ \d{1,2},? \d{4})/g,
    /(\d{1,2} \w+ \d{4})/g,
    /(\d{4}-\d{2}-\d{2})/g,
  ];

  private moneyPatterns = [
    /\$[\d,]+\.?\d*/g,
    /USD? [\d,]+\.?\d*/g,
    /[\d,]+\.?\d*\s*dollars?/gi,
    /[\d,]+\.?\d*\s*USD/gi,
  ];

  private partyPatterns = [
    /"([^"]+)"/g, // Quoted names
    /\b([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g, // Proper names
    /\b([A-Z][A-Z\s&]+(?:INC|LLC|CORP|LTD|CO)\.?)\b/g, // Company names
  ];

  // Risk keywords for future use
  /*
  private _riskKeywords = {
    high: ['terminate', 'penalty', 'breach', 'default', 'liquidated damages', 'indemnification'],
    medium: ['late payment', 'modification', 'assignment', 'force majeure', 'confidential'],
    low: ['notice', 'delivery', 'acceptance', 'standard', 'reasonable'],
  };
  */

  private clauseTypes = {
    termination: ['terminate', 'termination', 'end', 'expire', 'cancel'],
    payment: ['payment', 'pay', 'invoice', 'billing', 'fee', 'cost'],
    liability: ['liable', 'liability', 'responsible', 'damages', 'loss'],
    confidentiality: ['confidential', 'non-disclosure', 'proprietary', 'secret'],
    intellectual_property: ['copyright', 'patent', 'trademark', 'intellectual property', 'IP'],
    force_majeure: ['force majeure', 'act of god', 'unforeseeable', 'beyond control'],
  };

  async analyzeContract(content: string): Promise<ContractAnalysis> {
    const normalizedContent = this.normalizeText(content);
    
    return {
      parties: this.extractParties(normalizedContent),
      startDate: this.extractStartDate(normalizedContent),
      endDate: this.extractEndDate(normalizedContent),
      paymentSchedule: this.extractPaymentSchedule(normalizedContent),
      pricing: this.extractPricing(normalizedContent),
      scope: this.extractScope(normalizedContent),
      keyTerms: this.extractKeyTerms(normalizedContent),
      risks: this.identifyRisks(normalizedContent),
      clauses: this.extractClauses(normalizedContent),
      summary: this.generateSummary(normalizedContent),
      confidence: this.calculateConfidence(normalizedContent),
    };
  }

  private normalizeText(content: string): string {
    return content
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s\$\%\(\)\[\]\{\}\.\,\;\:\!\?\-"']/g, '') // Remove special chars
      .trim();
  }

  private extractParties(content: string): Array<{ name: string; role: string; contact?: string }> {
    const parties: Array<{ name: string; role: string; contact?: string }> = [];
    const lines = content.split('\n');
    
    // Look for party definitions in first 20% of document
    const headerLines = lines.slice(0, Math.max(10, lines.length * 0.2));
    
    for (const line of headerLines) {
      // Pattern: "BETWEEN Company Name AND Other Company"
      const betweenMatch = line.match(/between\s+(.+?)\s+and\s+(.+?)(?:\s|$)/i);
      if (betweenMatch) {
        parties.push(
          { name: betweenMatch[1].trim(), role: 'First Party' },
          { name: betweenMatch[2].trim(), role: 'Second Party' }
        );
      }

      // Pattern: "Client:" or "Contractor:"
      const roleMatch = line.match(/(client|contractor|vendor|supplier|customer|provider):\s*(.+)/i);
      if (roleMatch) {
        parties.push({
          name: roleMatch[2].trim(),
          role: this.capitalizeRole(roleMatch[1]),
        });
      }
    }

    // Extract company names
    const companyMatches = content.match(this.partyPatterns[2]) || [];
    for (const company of companyMatches.slice(0, 5)) { // Limit to first 5 matches
      if (!parties.some(p => p.name === company)) {
        parties.push({
          name: company,
          role: 'Party',
        });
      }
    }

    return parties.slice(0, 10); // Limit to 10 parties max
  }

  private extractStartDate(content: string): string | null {
    // Look for contract effective date patterns
    const effectivePatterns = [
      /effective\s+(?:date\s+)?(?:as\s+of\s+)?([^\.]+)/i,
      /commencing\s+(?:on\s+)?([^\.]+)/i,
      /beginning\s+(?:on\s+)?([^\.]+)/i,
      /start\s+date\s*:\s*([^\.]+)/i,
    ];

    for (const pattern of effectivePatterns) {
      const match = content.match(pattern);
      if (match) {
        const dateStr = this.extractDateFromText(match[1]);
        if (dateStr) return dateStr;
      }
    }

    // Fallback to first date found
    const allDates = this.extractAllDates(content);
    return allDates[0] || null;
  }

  private extractEndDate(content: string): string | null {
    // Look for contract end date patterns
    const endPatterns = [
      /(?:expires?|expir\w+)\s+(?:on\s+)?([^\.]+)/i,
      /(?:ends?|ending)\s+(?:on\s+)?([^\.]+)/i,
      /(?:terminates?|termination)\s+(?:on\s+)?([^\.]+)/i,
      /end\s+date\s*:\s*([^\.]+)/i,
      /until\s+([^\.]+)/i,
    ];

    for (const pattern of endPatterns) {
      const match = content.match(pattern);
      if (match) {
        const dateStr = this.extractDateFromText(match[1]);
        if (dateStr) return dateStr;
      }
    }

    // Look for duration and calculate end date
    const durationMatch = content.match(/(?:for\s+a\s+period\s+of\s+|duration\s+of\s+)(\d+)\s+(year|month|day)s?/i);
    if (durationMatch) {
      const startDate = this.extractStartDate(content);
      if (startDate) {
        return this.calculateEndDate(startDate, parseInt(durationMatch[1]), durationMatch[2]);
      }
    }

    return null;
  }

  private extractPaymentSchedule(content: string): Array<{ date: string; amount: number; description: string }> {
    const schedule: Array<{ date: string; amount: number; description: string }> = [];
    const lines = content.split('\n');

    for (const line of lines) {
      // Look for payment schedule patterns
      const paymentMatch = line.match(/(\$[\d,]+\.?\d*)\s+(?:due\s+)?(?:on\s+)?([^\.]+)/i);
      if (paymentMatch && line.toLowerCase().includes('payment')) {
        const amount = this.parseAmount(paymentMatch[1]);
        const dateStr = this.extractDateFromText(paymentMatch[2]);
        
        if (amount && dateStr) {
          schedule.push({
            date: dateStr,
            amount,
            description: line.trim(),
          });
        }
      }

      // Monthly payment patterns
      const monthlyMatch = line.match(/(\$[\d,]+\.?\d*)\s+(?:per\s+month|monthly)/i);
      if (monthlyMatch) {
        const amount = this.parseAmount(monthlyMatch[1]);
        if (amount) {
          schedule.push({
            date: 'Monthly',
            amount,
            description: 'Monthly payment',
          });
        }
      }
    }

    return schedule.slice(0, 12); // Limit to 12 entries
  }

  private extractPricing(content: string): {
    totalValue: number | null;
    currency: string | null;
    paymentMethod: string | null;
  } {
    const amounts = this.extractAllAmounts(content);
    
    // Find the largest amount as likely total value
    const totalValue = amounts.length > 0 ? Math.max(...amounts) : null;
    
    // Detect currency
    let currency = 'USD'; // Default
    if (content.includes('EUR') || content.includes('€')) currency = 'EUR';
    if (content.includes('GBP') || content.includes('£')) currency = 'GBP';
    
    // Detect payment method
    let paymentMethod: string | null = null;
    if (content.toLowerCase().includes('credit card')) paymentMethod = 'Credit Card';
    if (content.toLowerCase().includes('bank transfer')) paymentMethod = 'Bank Transfer';
    if (content.toLowerCase().includes('wire transfer')) paymentMethod = 'Wire Transfer';
    if (content.toLowerCase().includes('check')) paymentMethod = 'Check';
    if (content.toLowerCase().includes('invoice')) paymentMethod = 'Invoice';

    return { totalValue, currency, paymentMethod };
  }

  private extractScope(content: string): string | null {
    // Look for scope/work description sections
    const scopePatterns = [
      /scope\s+of\s+work[:\s]+([^\.]+(?:\.[^\.]+)*)/i,
      /services\s+to\s+be\s+provided[:\s]+([^\.]+(?:\.[^\.]+)*)/i,
      /deliverables[:\s]+([^\.]+(?:\.[^\.]+)*)/i,
      /work\s+description[:\s]+([^\.]+(?:\.[^\.]+)*)/i,
    ];

    for (const pattern of scopePatterns) {
      const match = content.match(pattern);
      if (match && match[1].trim().length > 20) {
        return match[1].trim().substring(0, 500); // Limit to 500 chars
      }
    }

    // Fallback: extract first substantial paragraph
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 50);
    if (paragraphs.length > 1) {
      return paragraphs[1].substring(0, 500);
    }

    return null;
  }

  private extractKeyTerms(content: string): Array<{ term: string; description: string; importance: 'high' | 'medium' | 'low' }> {
    const terms: Array<{ term: string; description: string; importance: 'high' | 'medium' | 'low' }> = [];
    
    // High importance terms
    const highImportanceTerms = [
      'termination', 'liability', 'indemnification', 'intellectual property',
      'confidentiality', 'non-disclosure', 'governing law', 'dispute resolution'
    ];

    // Medium importance terms  
    const mediumImportanceTerms = [
      'payment terms', 'delivery', 'warranties', 'force majeure',
      'modification', 'assignment', 'notices'
    ];

    const sentences = content.split(/[\.!?]+/);
    
    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase();
      
      // Check for high importance terms
      for (const term of highImportanceTerms) {
        if (sentenceLower.includes(term.toLowerCase()) && !terms.some(t => t.term === term)) {
          terms.push({
            term,
            description: sentence.trim().substring(0, 200),
            importance: 'high',
          });
        }
      }

      // Check for medium importance terms
      for (const term of mediumImportanceTerms) {
        if (sentenceLower.includes(term.toLowerCase()) && !terms.some(t => t.term === term)) {
          terms.push({
            term,
            description: sentence.trim().substring(0, 200),
            importance: 'medium',
          });
        }
      }
    }

    return terms.slice(0, 20); // Limit to 20 terms
  }

  private identifyRisks(content: string): Array<{ title: string; description: string; severity: 'low' | 'medium' | 'high'; confidence: number }> {
    const risks: Array<{ title: string; description: string; severity: 'low' | 'medium' | 'high'; confidence: number }> = [];
    const contentLower = content.toLowerCase();

    // High risk patterns
    if (contentLower.includes('liquidated damages')) {
      risks.push({
        title: 'Liquidated Damages Clause',
        description: 'Contract contains liquidated damages provisions which could result in significant financial penalties.',
        severity: 'high',
        confidence: 0.9,
      });
    }

    if (contentLower.includes('unlimited liability')) {
      risks.push({
        title: 'Unlimited Liability Exposure',
        description: 'Contract may expose party to unlimited liability for damages.',
        severity: 'high',
        confidence: 0.8,
      });
    }

    if (contentLower.includes('personal guarantee')) {
      risks.push({
        title: 'Personal Guarantee Required',
        description: 'Contract requires personal guarantee which creates individual liability.',
        severity: 'high',
        confidence: 0.9,
      });
    }

    // Medium risk patterns
    if (contentLower.includes('automatic renewal')) {
      risks.push({
        title: 'Automatic Renewal Clause',
        description: 'Contract automatically renews unless terminated, which could lead to unintended obligations.',
        severity: 'medium',
        confidence: 0.7,
      });
    }

    if (contentLower.includes('exclusive') && contentLower.includes('agreement')) {
      risks.push({
        title: 'Exclusivity Requirements',
        description: 'Contract contains exclusivity provisions that may limit business opportunities.',
        severity: 'medium',
        confidence: 0.6,
      });
    }

    // Check for missing important clauses
    if (!contentLower.includes('force majeure')) {
      risks.push({
        title: 'Missing Force Majeure Clause',
        description: 'Contract lacks force majeure protection for unforeseeable events.',
        severity: 'medium',
        confidence: 0.5,
      });
    }

    if (!contentLower.includes('governing law')) {
      risks.push({
        title: 'No Governing Law Specified',
        description: 'Contract does not specify which jurisdiction\'s laws apply.',
        severity: 'low',
        confidence: 0.6,
      });
    }

    return risks.slice(0, 10); // Limit to 10 risks
  }

  private extractClauses(content: string): Array<{ type: string; content: string; importance: 'high' | 'medium' | 'low' }> {
    const clauses: Array<{ type: string; content: string; importance: 'high' | 'medium' | 'low' }> = [];
    const sentences = content.split(/[\.!?]+/);

    for (const [clauseType, keywords] of Object.entries(this.clauseTypes)) {
      for (const sentence of sentences) {
        const sentenceLower = sentence.toLowerCase();
        
        if (keywords.some(keyword => sentenceLower.includes(keyword))) {
          const importance = ['termination', 'liability', 'confidentiality'].includes(clauseType) ? 'high' : 
                          ['payment', 'intellectual_property'].includes(clauseType) ? 'medium' : 'low';
          
          clauses.push({
            type: clauseType.replace('_', ' '),
            content: sentence.trim(),
            importance,
          });
          break; // One clause per type
        }
      }
    }

    return clauses;
  }

  private generateSummary(content: string): string {
    const words = content.split(/\s+/);
    const totalWords = words.length;
    
    if (totalWords < 100) {
      return 'Short contract document analyzed.';
    }

    // Extract first few sentences as summary
    const sentences = content.split(/[\.!?]+/).filter(s => s.trim().length > 20);
    const summary = sentences.slice(0, 3).join('. ').trim();
    
    return summary.length > 300 ? summary.substring(0, 297) + '...' : summary;
  }

  private calculateConfidence(content: string): number {
    let confidence = 0.3; // Base confidence
    
    // Increase confidence based on content quality indicators
    if (content.length > 1000) confidence += 0.2;
    if (content.includes('AGREEMENT') || content.includes('CONTRACT')) confidence += 0.1;
    if (this.extractAllDates(content).length > 0) confidence += 0.1;
    if (this.extractAllAmounts(content).length > 0) confidence += 0.1;
    if (content.toLowerCase().includes('party') || content.toLowerCase().includes('parties')) confidence += 0.1;
    
    return Math.min(0.9, confidence); // Cap at 0.9
  }

  // Helper methods
  private capitalizeRole(role: string): string {
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  }

  private extractDateFromText(text: string): string | null {
    for (const pattern of this.datePatterns) {
      const match = text.match(pattern);
      if (match) {
        return this.standardizeDate(match[0]);
      }
    }
    return null;
  }

  private extractAllDates(content: string): string[] {
    const dates: string[] = [];
    for (const pattern of this.datePatterns) {
      const matches = content.match(pattern) || [];
      dates.push(...matches.map(d => this.standardizeDate(d)).filter(Boolean) as string[]);
    }
    return [...new Set(dates)]; // Remove duplicates
  }

  private extractAllAmounts(content: string): number[] {
    const amounts: number[] = [];
    for (const pattern of this.moneyPatterns) {
      const matches = content.match(pattern) || [];
      amounts.push(...matches.map(m => this.parseAmount(m)).filter(Boolean) as number[]);
    }
    return amounts;
  }

  private parseAmount(amountStr: string): number | null {
    const cleaned = amountStr.replace(/[^\d\.]/g, '');
    const amount = parseFloat(cleaned);
    return isNaN(amount) ? null : amount;
  }

  private standardizeDate(dateStr: string): string | null {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    } catch {
      return null;
    }
  }

  private calculateEndDate(startDate: string, duration: number, unit: string): string {
    const start = new Date(startDate);
    switch (unit.toLowerCase()) {
      case 'year':
        start.setFullYear(start.getFullYear() + duration);
        break;
      case 'month':
        start.setMonth(start.getMonth() + duration);
        break;
      case 'day':
        start.setDate(start.getDate() + duration);
        break;
    }
    return start.toISOString().split('T')[0];
  }
}

/**
 * Local Chat Agent
 * Provides intelligent responses without external AI
 */
export class LocalChatAgent {
  private knowledgeBase: Map<string, string[]> = new Map([
    ['contracts', [
      'A contract is a legally binding agreement between parties',
      'Key elements include offer, acceptance, consideration, and legal capacity',
      'Always review termination clauses carefully',
      'Payment terms should be clearly defined',
    ]],
    ['legal', [
      'Consult with legal counsel for complex matters',
      'Understand governing law and jurisdiction clauses',
      'Review liability and indemnification provisions',
      'Ensure compliance with applicable regulations',
    ]],
    ['payments', [
      'Net 30 means payment due within 30 days',
      'Late payment penalties should be reasonable',
      'Consider payment method security',
      'Invoice requirements should be clear',
    ]],
    ['risks', [
      'Unlimited liability can be dangerous',
      'Force majeure clauses protect against unforeseen events',
      'Confidentiality agreements protect sensitive information',
      'Automatic renewal clauses can create unexpected obligations',
    ]],
  ]);

  async generateResponse(message: string, _context?: any): Promise<ChatResponse> {
    const messageLower = message.toLowerCase();
    const suggestions: string[] = [];
    let responseMessage = '';

    // Intent detection based on keywords
    if (messageLower.includes('contract') || messageLower.includes('agreement')) {
      const contractKnowledge = this.knowledgeBase.get('contracts') || [];
      responseMessage = `Regarding contracts: ${contractKnowledge[0] || 'Contracts are legal agreements between parties.'}`;
      suggestions.push('What are the key elements of a contract?', 'How do I review termination clauses?');
    } else if (messageLower.includes('payment') || messageLower.includes('invoice')) {
      const paymentKnowledge = this.knowledgeBase.get('payments') || [];
      responseMessage = `About payments: ${paymentKnowledge[0] || 'Payment terms should be clearly defined in contracts.'}`;
      suggestions.push('What does Net 30 mean?', 'How should late payment penalties work?');
    } else if (messageLower.includes('risk') || messageLower.includes('liability')) {
      const riskKnowledge = this.knowledgeBase.get('risks') || [];
      responseMessage = `Regarding risks: ${riskKnowledge[0] || 'Risk assessment is crucial in contract review.'}`;
      suggestions.push('What is unlimited liability?', 'What is a force majeure clause?');
    } else if (messageLower.includes('legal') || messageLower.includes('law')) {
      const legalKnowledge = this.knowledgeBase.get('legal') || [];
      responseMessage = `Legal guidance: ${legalKnowledge[0] || 'Legal matters require careful consideration.'}`;
      suggestions.push('When should I consult legal counsel?', 'What is governing law?');
    } else {
      // General response
      responseMessage = "I can help you with contract analysis, legal questions, payment terms, and risk assessment. What specific area would you like to explore?";
      suggestions.push('Analyze a contract', 'Explain payment terms', 'Identify contract risks', 'Legal compliance questions');
    }

    return {
      message: responseMessage,
      suggestions,
      confidence: 0.7,
      sources: ['Local Knowledge Base'],
    };
  }
}

/**
 * Local Embedding Generator
 * Creates vector embeddings using TF-IDF approach
 */
export class LocalEmbeddingGenerator {
  private vocabulary: Map<string, number> = new Map();
  private idfScores: Map<string, number> = new Map();
  private documentFrequency: Map<string, number> = new Map();
  private totalDocuments = 0;

  async generateEmbedding(text: string): Promise<EmbeddingVector> {
    const tokens = this.tokenize(text);
    const termFrequency = this.calculateTermFrequency(tokens);
    
    // Generate TF-IDF vector
    const vector: number[] = [];
    const sortedVocab = Array.from(this.vocabulary.keys()).sort();
    
    for (const term of sortedVocab) {
      const tf = termFrequency.get(term) || 0;
      const idf = this.idfScores.get(term) || 0;
      vector.push(tf * idf);
    }

    // Pad or truncate to fixed size (384 dimensions to match common embedding sizes)
    const dimensions = 384;
    while (vector.length < dimensions) {
      vector.push(0);
    }
    
    if (vector.length > dimensions) {
      vector.splice(dimensions);
    }

    // Normalize vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= magnitude;
      }
    }

    return {
      vector,
      dimensions,
    };
  }

  updateVocabulary(documents: string[]) {
    this.totalDocuments = documents.length;
    
    // Build vocabulary and document frequency
    for (const doc of documents) {
      const tokens = this.tokenize(doc);
      const uniqueTokens = new Set(tokens);
      
      for (const token of uniqueTokens) {
        if (!this.vocabulary.has(token)) {
          this.vocabulary.set(token, this.vocabulary.size);
        }
        
        const currentFreq = this.documentFrequency.get(token) || 0;
        this.documentFrequency.set(token, currentFreq + 1);
      }
    }

    // Calculate IDF scores
    for (const [term, docFreq] of this.documentFrequency.entries()) {
      const idf = Math.log(this.totalDocuments / docFreq);
      this.idfScores.set(term, idf);
    }
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter(token => token.length > 2) // Filter short tokens
      .filter(token => !this.isStopWord(token));
  }

  private calculateTermFrequency(tokens: string[]): Map<string, number> {
    const termFreq = new Map<string, number>();
    const totalTokens = tokens.length;

    for (const token of tokens) {
      const count = termFreq.get(token) || 0;
      termFreq.set(token, count + 1);
    }

    // Normalize by total tokens
    for (const [term, count] of termFreq.entries()) {
      termFreq.set(term, count / totalTokens);
    }

    return termFreq;
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has',
      'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can',
      'shall', 'it', 'he', 'she', 'they', 'we', 'you', 'i', 'me', 'him', 'her', 'them', 'us',
    ]);
    return stopWords.has(word);
  }
}

// Export singleton instances
export const localAnalyzer = new LocalContractAnalyzer();
export const localChatAgent = new LocalChatAgent();
export const localEmbedding = new LocalEmbeddingGenerator();