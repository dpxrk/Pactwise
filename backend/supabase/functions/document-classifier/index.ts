import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

/**
 * Document Classifier Function
 * Analyzes uploaded documents to determine if they are contracts
 */

interface ClassificationResult {
  isContract: boolean;
  confidence: number;
  documentType: string;
  indicators: string[];
  summary: string;
}

class DocumentClassifier {
  // Contract-specific keywords and phrases
  private contractIndicators = {
    strong: [
      'agreement', 'contract', 'terms and conditions', 'party', 'parties',
      'whereas', 'hereby', 'covenant', 'obligation', 'undertaking',
      'witnesseth', 'recitals', 'effective date', 'term of agreement',
      'binding agreement', 'legally binding', 'executed', 'counterparts',
      'governing law', 'jurisdiction', 'arbitration', 'dispute resolution'
    ],
    medium: [
      'shall', 'herein', 'thereof', 'hereto', 'hereunder', 'aforementioned',
      'indemnify', 'liability', 'termination', 'breach', 'default',
      'confidentiality', 'non-disclosure', 'intellectual property',
      'warranty', 'representation', 'payment terms', 'compensation',
      'deliverables', 'scope of work', 'force majeure'
    ],
    weak: [
      'client', 'vendor', 'supplier', 'contractor', 'customer',
      'invoice', 'purchase order', 'service', 'product', 'fee',
      'deadline', 'milestone', 'performance', 'compliance',
      'notice', 'amendment', 'modification', 'assignment'
    ]
  };

  // Document type patterns
  private documentTypes: Record<string, string[]> = {
    'Service Agreement': ['service agreement', 'services agreement', 'consulting agreement', 'professional services'],
    'Sales Agreement': ['purchase agreement', 'sales agreement', 'sale and purchase', 'buy-sell agreement'],
    'NDA': ['non-disclosure agreement', 'confidentiality agreement', 'nda', 'mutual nda'],
    'Employment Contract': ['employment agreement', 'employment contract', 'offer letter', 'employment terms'],
    'Lease Agreement': ['lease agreement', 'rental agreement', 'tenancy agreement', 'lease contract'],
    'License Agreement': ['license agreement', 'licensing agreement', 'software license', 'end user license'],
    'Partnership Agreement': ['partnership agreement', 'joint venture', 'collaboration agreement'],
    'Vendor Agreement': ['vendor agreement', 'supplier agreement', 'procurement agreement'],
    'Terms of Service': ['terms of service', 'terms of use', 'website terms', 'user agreement'],
    'Master Agreement': ['master agreement', 'framework agreement', 'umbrella agreement'],
  };

  // Non-contract document patterns
  private nonContractIndicators = [
    'resume', 'curriculum vitae', 'cv', 'cover letter',
    'invoice', 'receipt', 'bill', 'statement',
    'report', 'analysis', 'presentation', 'slides',
    'manual', 'guide', 'instructions', 'documentation',
    'email', 'memo', 'memorandum', 'letter',
    'article', 'blog', 'news', 'press release',
    'spreadsheet', 'budget', 'forecast', 'financial statement'
  ];

  classify(content: string): ClassificationResult {
    const normalizedContent = content.toLowerCase();
    const indicators: string[] = [];
    let score = 0;
    let maxScore = 0;

    // Check for strong contract indicators
    for (const indicator of this.contractIndicators.strong) {
      if (normalizedContent.includes(indicator)) {
        score += 3;
        indicators.push(indicator);
      }
      maxScore += 3;
    }

    // Check for medium contract indicators
    for (const indicator of this.contractIndicators.medium) {
      if (normalizedContent.includes(indicator)) {
        score += 2;
        indicators.push(indicator);
      }
      maxScore += 2;
    }

    // Check for weak contract indicators
    for (const indicator of this.contractIndicators.weak) {
      if (normalizedContent.includes(indicator)) {
        score += 1;
        indicators.push(indicator);
      }
      maxScore += 1;
    }

    // Penalize for non-contract indicators
    for (const indicator of this.nonContractIndicators) {
      if (normalizedContent.includes(indicator)) {
        score -= 5;
        indicators.push(`NOT: ${indicator}`);
      }
    }

    // Calculate confidence based on score
    const confidence = Math.max(0, Math.min(1, score / (maxScore * 0.3))); // 30% of max score = high confidence

    // Determine document type
    let documentType = 'Unknown Document';
    let highestTypeScore = 0;
    
    for (const [type, patterns] of Object.entries(this.documentTypes)) {
      let typeScore = 0;
      for (const pattern of patterns) {
        if (normalizedContent.includes(pattern)) {
          typeScore += 10;
        }
      }
      if (typeScore > highestTypeScore) {
        highestTypeScore = typeScore;
        documentType = type;
      }
    }

    // Check document structure
    const hasSignatureLine = /signature:?\s*_{3,}|\[signature\]|signed:/i.test(content);
    const hasDateFields = /date:?\s*_{3,}|\[date\]|dated:/i.test(content);
    const hasPartyIdentification = /between.*and|party.*party|first party.*second party/i.test(content);
    const hasSectionNumbers = /^\s*\d+\.\s+/m.test(content) || /section\s+\d+/i.test(content);
    
    // Boost confidence for structural elements
    if (hasSignatureLine) {
      score += 5;
      indicators.push('signature line detected');
    }
    if (hasDateFields) {
      score += 3;
      indicators.push('date fields detected');
    }
    if (hasPartyIdentification) {
      score += 5;
      indicators.push('party identification detected');
    }
    if (hasSectionNumbers) {
      score += 2;
      indicators.push('structured sections detected');
    }

    // Final determination
    const isContract = confidence > 0.5 || 
                      (indicators.length >= 5 && !indicators.some(i => i.startsWith('NOT:'))) ||
                      (hasSignatureLine && hasPartyIdentification) ||
                      highestTypeScore > 0;

    // Generate summary
    let summary = '';
    if (isContract) {
      summary = `This appears to be a ${documentType} with ${Math.round(confidence * 100)}% confidence. `;
      summary += `Key indicators found: ${indicators.filter(i => !i.startsWith('NOT:')).slice(0, 5).join(', ')}.`;
    } else {
      const nonContractType = indicators.find(i => i.startsWith('NOT:'))?.replace('NOT: ', '') || 'document';
      summary = `This does not appear to be a contract. It may be a ${nonContractType}. `;
      summary += `Contract confidence: ${Math.round(confidence * 100)}%.`;
    }

    return {
      isContract,
      confidence,
      documentType: isContract ? documentType : 'Not a Contract',
      indicators: indicators.slice(0, 10), // Limit to top 10 indicators
      summary
    };
  }

  // Extract text from various formats (basic implementation)
  extractText(content: string, mimeType?: string): string {
    // For now, just handle plain text
    // In production, you'd want to handle PDFs, DOCX, etc.
    if (mimeType && mimeType.includes('pdf')) {
      // Would need a PDF parsing library here
      return content; // Placeholder
    }
    
    // Clean up common formatting issues
    return content
      .replace(/\r\n/g, '\n') // Normalize line breaks
      .replace(/\t/g, ' ')    // Replace tabs with spaces
      .replace(/\s+/g, ' ')   // Normalize whitespace
      .trim();
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const { content, mimeType } = await req.json();

    if (!content) {
      throw new Error('Document content is required');
    }

    // Initialize classifier
    const classifier = new DocumentClassifier();
    
    // Extract text from document
    const extractedText = classifier.extractText(content, mimeType);
    
    // Classify the document
    const result = classifier.classify(extractedText);

    return new Response(
      JSON.stringify({
        success: true,
        classification: result
      }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Classification failed'
      }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});