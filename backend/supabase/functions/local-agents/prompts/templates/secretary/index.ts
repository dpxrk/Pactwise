/**
 * Secretary Agent Prompt Templates
 *
 * Document processing, metadata extraction, classification, and OCR analysis.
 */

import type { PromptTemplate } from '../../types.ts';

const META = {
  author: 'system',
  createdAt: '2026-02-15',
  updatedAt: '2026-02-15',
};

export const secretaryTemplates: PromptTemplate[] = [
  // ── System Prompt ─────────────────────────────────────────────────
  {
    id: 'secretary-system',
    agentType: 'secretary',
    category: 'system',
    name: 'Secretary Agent System Prompt',
    description: 'Core system prompt defining the Secretary Agent persona and capabilities',
    version: '1.0.0',
    template: `You are the Secretary Agent for Pactwise, an enterprise contract management platform.

Your specialization is document processing, metadata extraction, and information organization. You are meticulous, detail-oriented, and systematic.

Core capabilities:
- Document classification and categorization
- Metadata extraction (parties, dates, values, terms)
- Named entity recognition in legal/business documents
- OCR quality assessment and correction
- Document version tracking and comparison
- Data validation and consistency checking

Operating principles:
- Extract data with high precision — never guess when uncertain
- Flag ambiguous fields for human review rather than inferring incorrectly
- Maintain consistent output formats across all document types
- Cross-reference extracted data against existing enterprise records when available
- Preserve original document structure and formatting references
- Report confidence scores for each extracted field

Enterprise context: {{enterprise_name}} (ID: {{enterprise_id}})`,
    variables: [
      { name: 'enterprise_name', description: 'Name of the enterprise', required: false, defaultValue: 'Current Enterprise', type: 'string' },
      { name: 'enterprise_id', description: 'Enterprise identifier', required: true, type: 'string' },
    ],
    metadata: { ...META, tags: ['system', 'secretary'], maxTokens: 500, temperature: 0.1 },
  },

  // ── Document Classification ───────────────────────────────────────
  {
    id: 'secretary-classify-document',
    agentType: 'secretary',
    category: 'task',
    name: 'Document Classification',
    description: 'Classifies an uploaded document by type, urgency, and required actions',
    version: '1.0.0',
    template: `Classify this document and extract key routing metadata.

Document content (first 2000 chars):
{{document_preview}}

File metadata:
- Filename: {{filename}}
- MIME type: {{mime_type}}
- Size: {{file_size}}

Classify into:
1. **Document type**: contract | amendment | addendum | invoice | purchase_order | nda | sow | msa | proposal | correspondence | policy | compliance_report | other
2. **Urgency**: critical | high | normal | low
3. **Required actions**: List specific next steps (e.g., "route to legal for review", "extract payment terms")
4. **Related entities**: Identify parties, vendors, or contracts referenced
5. **Confidence**: Your confidence in the classification (0.0-1.0)

Respond with structured JSON.`,
    variables: [
      { name: 'document_preview', description: 'First 2000 characters of document text', required: true, type: 'string' },
      { name: 'filename', description: 'Original filename', required: true, type: 'string' },
      { name: 'mime_type', description: 'MIME type of the file', required: true, type: 'string' },
      { name: 'file_size', description: 'File size in bytes', required: true, type: 'string' },
    ],
    fewShotExamples: [
      {
        input: 'Document: "MASTER SERVICES AGREEMENT between Acme Corp and Widget Inc, effective January 1, 2026..." Filename: MSA_Acme_Widget_2026.pdf',
        output: '{"documentType":"msa","urgency":"normal","requiredActions":["route_to_legal","extract_terms","create_contract_record"],"relatedEntities":{"parties":["Acme Corp","Widget Inc"],"type":"vendor_agreement"},"confidence":0.95}',
        explanation: 'Clear MSA header, two identified parties, standard urgency since it is a new agreement not an urgent amendment.',
      },
      {
        input: 'Document: "NOTICE OF TERMINATION: This letter serves as formal notice that the agreement dated..." Filename: termination_notice.pdf',
        output: '{"documentType":"correspondence","urgency":"critical","requiredActions":["notify_legal_immediately","identify_affected_contract","calculate_termination_impact"],"relatedEntities":{"parties":["sender_tbd"],"type":"termination_notice"},"confidence":0.90}',
        explanation: 'Termination notice requires immediate attention. Classified as critical urgency despite being correspondence type.',
      },
    ],
    metadata: { ...META, tags: ['classification', 'routing', 'secretary'], maxTokens: 1000, temperature: 0.1 },
  },

  // ── Metadata Extraction ───────────────────────────────────────────
  {
    id: 'secretary-extract-metadata',
    agentType: 'secretary',
    category: 'task',
    name: 'Contract Metadata Extraction',
    description: 'Extracts structured metadata from contract documents',
    version: '1.0.0',
    template: `Extract structured metadata from this contract document.

Document text:
{{document_text}}

Extract the following fields (use null if not found, do not guess):

1. **Parties**
   - Party A (typically the enterprise/buyer): name, role, address
   - Party B (typically the vendor/seller): name, role, address
   - Any guarantors or third parties

2. **Dates**
   - Effective date
   - Expiration date
   - Renewal dates/terms
   - Key milestone dates

3. **Financial terms**
   - Total contract value
   - Payment schedule
   - Currency
   - Rate/pricing structure
   - Late payment penalties

4. **Legal terms**
   - Governing law/jurisdiction
   - Termination clauses (notice period, conditions)
   - Liability caps
   - Indemnification terms
   - Confidentiality terms
   - Force majeure

5. **Operational terms**
   - Service level agreements (SLAs)
   - Deliverables
   - Key performance indicators (KPIs)
   - Escalation procedures

For each field, include a confidence score (0.0-1.0) and the source location (page/section reference if available).`,
    variables: [
      { name: 'document_text', description: 'Full or section text of the contract', required: true, type: 'string' },
    ],
    fewShotExamples: [
      {
        input: '"This Agreement is entered into as of March 15, 2026, by and between TechCorp LLC ("Client") and CloudServ Inc ("Provider"). The initial term shall be 24 months. Provider shall deliver cloud hosting services at a rate of $15,000 per month."',
        output: '{"parties":{"partyA":{"name":"TechCorp LLC","role":"Client","confidence":0.98},"partyB":{"name":"CloudServ Inc","role":"Provider","confidence":0.98}},"dates":{"effectiveDate":{"value":"2026-03-15","confidence":0.95},"expirationDate":{"value":"2028-03-14","confidence":0.80,"note":"Calculated from 24-month term"}},"financialTerms":{"monthlyRate":{"value":15000,"currency":"USD","confidence":0.95},"totalValue":{"value":360000,"confidence":0.75,"note":"Calculated: $15k x 24 months"}}}',
        explanation: 'Extracted explicit parties and dates. Expiration calculated from term length (lower confidence). Total value derived from monthly rate x term.',
      },
    ],
    metadata: { ...META, tags: ['extraction', 'metadata', 'contract', 'secretary'], maxTokens: 2000, temperature: 0.1 },
  },

  // ── OCR Quality Assessment ────────────────────────────────────────
  {
    id: 'secretary-ocr-quality',
    agentType: 'secretary',
    category: 'task',
    name: 'OCR Quality Assessment',
    description: 'Evaluates OCR output quality and suggests corrections',
    version: '1.0.0',
    template: `Assess the quality of this OCR-extracted text and identify corrections needed.

OCR output:
{{ocr_text}}

Original filename: {{filename}}

Tasks:
1. Rate overall OCR quality (0.0-1.0)
2. Identify likely OCR errors (misread characters, formatting artifacts)
3. Suggest corrections with confidence levels
4. Flag sections that are too degraded for reliable extraction
5. Identify if the document appears to be a scan of a printed document, handwritten, or mixed

Return structured assessment with corrections.`,
    variables: [
      { name: 'ocr_text', description: 'Raw OCR-extracted text', required: true, type: 'string' },
      { name: 'filename', description: 'Original filename for context', required: true, type: 'string' },
    ],
    metadata: { ...META, tags: ['ocr', 'quality', 'secretary'], maxTokens: 1500, temperature: 0.2 },
  },
];
