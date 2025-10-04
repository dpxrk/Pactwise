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
  vendorInfo?: VendorExtractionResult;
}

interface VendorExtractionResult {
  vendorName: string | null;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxId: string | null;
  registrationNumber: string | null;
  extractionConfidence: number;
  extractionMethod: string;
  allParties: string[];
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

  /**
   * Extract vendor/counterparty information from contract text
   */
  extractVendor(content: string, primaryPartyName?: string, primaryPartyAliases: string[] = []): VendorExtractionResult {
    const normalizedContent = content.toLowerCase();
    const allParties: string[] = [];
    let vendorName: string | null = null;
    let extractionMethod = 'none';
    let extractionConfidence = 0;

    // 1. Extract all parties mentioned in the contract
    const partyPatterns = [
      // "Between X and Y" pattern
      /between\s+([^,\n]+?)\s+(?:and|&)\s+([^,\n]+)/gi,
      // "This agreement is entered into by X and Y"
      /entered into by\s+([^,\n]+?)\s+(?:and|&)\s+([^,\n]+)/gi,
      // Party labels
      /(?:vendor|contractor|supplier|service provider|consultant|seller):\s*([^\n,]+)/gi,
      /(?:client|customer|buyer|purchaser):\s*([^\n,]+)/gi,
      // Formal party definitions
      /party\s+\w+\s*["""]([^"""]+)["""]/gi,
      // Company names in headers
      /^([A-Z][A-Za-z\s&,\.]+(?:Inc|LLC|Ltd|Corp|Corporation|Company|Co\.|Limited))/gm,
    ];

    for (const pattern of partyPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        for (let i = 1; i < match.length; i++) {
          if (match[i]) {
            const party = match[i].trim();
            if (party.length > 2 && party.length < 200) {
              allParties.push(party);
            }
          }
        }
      }
    }

    // 2. Filter out the primary party (your organization)
    const filteredParties = allParties.filter(party => {
      const partyLower = party.toLowerCase();

      // Check against primary party name
      if (primaryPartyName && partyLower.includes(primaryPartyName.toLowerCase())) {
        return false;
      }

      // Check against aliases
      for (const alias of primaryPartyAliases) {
        if (partyLower.includes(alias.toLowerCase())) {
          return false;
        }
      }

      return true;
    });

    // 3. Identify the vendor (the counterparty)
    if (filteredParties.length > 0) {
      // Use the first non-primary party found
      vendorName = filteredParties[0];
      extractionMethod = 'party_extraction';
      extractionConfidence = filteredParties.length === 1 ? 0.9 : 0.7;
    } else if (allParties.length > 0) {
      // Fallback: use any party found
      vendorName = allParties[0];
      extractionMethod = 'fallback_party';
      extractionConfidence = 0.5;
    }

    // 4. Extract additional vendor information
    const contactPerson = this.extractContactPerson(content);
    const email = this.extractEmail(content);
    const phone = this.extractPhone(content);
    const address = this.extractAddress(content);
    const taxId = this.extractTaxId(content);
    const registrationNumber = this.extractRegistrationNumber(content);

    // Boost confidence if we found additional details
    if (vendorName && (email || phone || address)) {
      extractionConfidence = Math.min(1.0, extractionConfidence + 0.1);
    }

    return {
      vendorName,
      contactPerson,
      email,
      phone,
      address,
      taxId,
      registrationNumber,
      extractionConfidence,
      extractionMethod,
      allParties: [...new Set(allParties)], // Unique parties
    };
  }

  private extractContactPerson(content: string): string | null {
    const patterns = [
      /(?:contact|representative|attn|attention):\s*([^\n,]+)/gi,
      /(?:mr\.|ms\.|mrs\.|dr\.)\s+([a-z]+\s+[a-z]+)/gi,
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(content);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  private extractEmail(content: string): string | null {
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const match = content.match(emailPattern);
    return match ? match[0] : null;
  }

  private extractPhone(content: string): string | null {
    const phonePatterns = [
      /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, // US format
      /\b\(\d{3}\)\s?\d{3}[-.\s]?\d{4}\b/, // (123) 456-7890
      /\b\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b/, // International
    ];

    for (const pattern of phonePatterns) {
      const match = content.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return null;
  }

  private extractAddress(content: string): string | null {
    // Look for address patterns (simplified)
    const addressPattern = /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl)[,\s]+[A-Za-z\s]+[,\s]+[A-Z]{2}\s+\d{5}/;
    const match = content.match(addressPattern);
    return match ? match[0] : null;
  }

  private extractTaxId(content: string): string | null {
    const patterns = [
      /(?:tax id|ein|federal tax id|employer id):\s*(\d{2}-?\d{7})/gi,
      /\b\d{2}-\d{7}\b/, // EIN format
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(content);
      if (match) {
        return match[1] || match[0];
      }
    }

    return null;
  }

  private extractRegistrationNumber(content: string): string | null {
    const patterns = [
      /(?:registration|reg\.|company) (?:number|no\.?):\s*([A-Z0-9-]+)/gi,
      /(?:incorporated|incorporation) (?:number|no\.?):\s*([A-Z0-9-]+)/gi,
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(content);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
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

    const { content, mimeType, primaryPartyName, primaryPartyAliases, extractVendor } = await req.json();

    if (!content) {
      throw new Error('Document content is required');
    }

    // Initialize classifier
    const classifier = new DocumentClassifier();

    // Extract text from document
    const extractedText = classifier.extractText(content, mimeType);

    // Classify the document
    const result = classifier.classify(extractedText);

    // Optionally extract vendor information
    if (extractVendor && result.isContract) {
      result.vendorInfo = classifier.extractVendor(
        extractedText,
        primaryPartyName,
        primaryPartyAliases || []
      );
    }

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