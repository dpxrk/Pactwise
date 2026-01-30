import { BaseAgent, ProcessingResult, Insight, AgentContext } from './base.ts';
import {
  TfIdf,
  quickTfIdfSimilarity,
  extractLegalPhrases,
  extractKeywords,
} from '../utils/nlp.ts';
import {
  NamedEntityRecognizer,
  type NEREntity,
} from '../utils/statistics.ts';
import {
  secretaryInputSchema,
  secretaryContextSchema,
  validateSecretaryInput,
  validateAndFilterAmounts,
  validateAndFilterParties,
  isContentAnalyzable,
  sanitizeContent,
  MAX_DOCUMENT_LENGTH,
  MIN_CONTENT_LENGTH,
  MAX_AMOUNTS,
  MAX_PARTIES,
  type SecretaryInput,
  type SecretaryContext as SchemaSecretaryContext,
} from '../schemas/secretary.ts';
import {
  getSecretaryConfig,
  getDefaultSecretaryConfig,
  isHighValueContract,
  isCriticalValueContract,
  getExpirationUrgency,
  getRiskyClauseRegexes,
  type SecretaryConfig,
} from '../config/secretary-config.ts';

// =============================================================================
// ERROR HANDLING UTILITIES
// =============================================================================

/**
 * Error categories for better debugging and monitoring
 */
type ErrorCategory = 'validation' | 'database' | 'extraction' | 'external' | 'timeout' | 'permission' | 'rate_limiting' | 'malformed_data' | 'unknown';

/**
 * Structured error with category and context
 */
interface SecretaryError {
  category: ErrorCategory;
  message: string;
  context?: Record<string, unknown>;
  recoverable: boolean;
  originalError?: unknown;
}

/**
 * Classify an error into a category
 */
function classifyError(error: unknown): SecretaryError {
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  // Database errors
  if (lowerMessage.includes('database') || lowerMessage.includes('supabase') ||
      lowerMessage.includes('connection') || lowerMessage.includes('query') ||
      lowerMessage.includes('timeout') && lowerMessage.includes('db')) {
    return {
      category: 'database',
      message,
      recoverable: true,
      originalError: error,
    };
  }

  // Validation errors
  if (lowerMessage.includes('invalid') || lowerMessage.includes('required') ||
      lowerMessage.includes('validation') || lowerMessage.includes('format')) {
    return {
      category: 'validation',
      message,
      recoverable: false,
      originalError: error,
    };
  }

  // Permission errors
  if (lowerMessage.includes('permission') || lowerMessage.includes('unauthorized') ||
      lowerMessage.includes('forbidden') || lowerMessage.includes('access denied')) {
    return {
      category: 'permission',
      message,
      recoverable: false,
      originalError: error,
    };
  }

  // Timeout errors
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return {
      category: 'timeout',
      message,
      recoverable: true,
      originalError: error,
    };
  }

  // External service errors
  if (lowerMessage.includes('external') || lowerMessage.includes('api') ||
      lowerMessage.includes('service') || lowerMessage.includes('network')) {
    return {
      category: 'external',
      message,
      recoverable: true,
      originalError: error,
    };
  }

  // Rate limiting errors (HTTP 429)
  if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests') ||
      lowerMessage.includes('429') || lowerMessage.includes('throttl')) {
    return {
      category: 'rate_limiting',
      message,
      recoverable: true,
      originalError: error,
    };
  }

  // Malformed data errors (parsing errors distinct from validation)
  if (lowerMessage.includes('parse') || lowerMessage.includes('malformed') ||
      lowerMessage.includes('syntax') || lowerMessage.includes('unexpected token') ||
      lowerMessage.includes('json') && (lowerMessage.includes('error') || lowerMessage.includes('failed'))) {
    return {
      category: 'malformed_data',
      message,
      recoverable: false,
      originalError: error,
    };
  }

  return {
    category: 'unknown',
    message,
    recoverable: false,
    originalError: error,
  };
}

/**
 * Retry configuration for database operations
 */
interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 100,
  maxDelayMs: 2000,
};

/**
 * Execute an async operation with retry logic for transient failures
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  operationName: string = 'operation',
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const classified = classifyError(error);

      // Don't retry non-recoverable errors
      if (!classified.recoverable) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === config.maxAttempts) {
        console.error(`[SecretaryAgent] ${operationName} failed after ${config.maxAttempts} attempts:`, error);
        throw error;
      }

      // Exponential backoff with jitter
      const delay = Math.min(
        config.baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 100,
        config.maxDelayMs,
      );

      console.warn(`[SecretaryAgent] ${operationName} attempt ${attempt} failed, retrying in ${delay}ms:`,
        error instanceof Error ? error.message : String(error));

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Execute an operation with a timeout
 */
async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  operationName: string = 'operation',
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

/**
 * Safe JSON parse with fallback
 */
function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

// Extended context for secretary agent
interface SecretaryContext extends AgentContext {
  contractId?: string;
  vendorId?: string;
  userId?: string;
  taskId?: string;
}

// Input data interfaces
interface SecretaryDataBase {
  content?: string;
  text?: string;
  extracted_text?: string;
  documentId?: string;
  useWorkflow?: boolean;
  workflowType?: string;
}

// Document analysis interfaces
interface Party {
  name: string;
  role?: string;
  type?: string;
  normalized?: string;
}


interface Amount {
  value: number;
  currency?: string;
  formatted: string;
  context?: string;
  type?: string;
}

interface Clause {
  type: string;
  text: string;
  risk_reason?: string;
  section?: string;
}

interface ClauseAnalysis {
  total: number;
  risky: Clause[];
  riskyClausesCount: number;
  standard: Clause[];
  custom?: Clause[];
  categories?: Record<string, number>;
}

interface DocumentMetadata {
  wordCount: number;
  pageCount: number;
  hasSignatures: boolean;
  language: string;
  complexity: string;
  completeness: number;
}

interface ExtractedDates {
  effectiveDate?: string | null;
  expirationDate?: string | null;
  signedDate?: string | null;
  otherDates: (string | null)[];
}

interface ContactInfo {
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
}

interface SentimentAnalysis {
  score: number;
  label: string;
  positive: number;
  negative: number;
}

interface ExtractedEntities {
  organizations: string[];
  people: string[];
  locations: string[];
  dates: string[];
  emails: string[];
  phones: string[];
  // Enhanced NER fields
  parties?: Array<{ text: string; confidence: number }>;
  amounts?: Array<{ text: string; confidence: number }>;
  legalTerms?: Array<{ text: string; confidence: number }>;
  nerConfidence?: number;
}

interface DocumentAnalysis {
  title: string;
  parties: Party[];
  dates: ExtractedDates;
  amounts: Amount[];
  keyTerms: string[];
  clauses: ClauseAnalysis;
  documentType: string;
  metadata: DocumentMetadata;
  vendor?: {
    name?: string;
    category?: string;
  };
  summary?: string;
  keywords?: string[];
  entities?: ExtractedEntities;
  sentiment?: SentimentAnalysis;
}

interface DocumentQualityAssessment {
  score: number;
  issues: string[];
  completeness: number;
}

interface VendorData {
  id: string;
  name: string;
  description?: string;
  category?: string;
  vendor_id?: string;
  insurance_cert?: boolean;
  contracts?: { count: number }[];
  documents?: Array<{
    document_type: string;
    uploaded_at: string;
    expiration_date: string | null;
  }>;
}

interface ComplianceStatus {
  isCompliant: boolean;
  missingDocuments: string[];
  expiredDocuments: string[];
  complianceScore: number;
}

interface VendorAnalysis {
  vendorName: string;
  category: string;
  contactInfo: ContactInfo;
  identifiers: VendorIdentifiers;
  certifications: string[];
  riskIndicators: string[];
  complianceStatus: ComplianceStatus;
  documentType: string;
}

interface VendorIdentifiers {
  taxId: string | null;
  duns: string | null;
  vendorId: string | null;
  registrationNumber: string | null;
}

interface DocumentRecord {
  id: string;
  extracted_text: string | null;
  file_type: string;
  file_path: string | null;
  file_size: number | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
  status?: string;
}

interface ContractRecord {
  id: string;
  title: string;
  status: string;
  extracted_text: string | null;
  vendor?: {
    id: string;
    name: string;
    category?: string;
  } | null;
  documents?: Array<{
    id: string;
    document_type: string;
    file_path: string;
    extracted_text: string | null;
    metadata: Record<string, unknown> | null;
  }>;
}

interface WorkflowResult {
  workflow_id: string;
  workflow_type: string;
  document_id: string;
  steps_completed: number;
  total_steps: number;
  status: string;
  completed_at: string | null;
}

interface WorkflowAnalysis {
  workflowId: string;
  workflowType: string;
  documentId: string;
  stepsCompleted: number;
  totalSteps: number;
  status: string;
  completedAt: string | null;
  details: WorkflowDetails;
}

interface WorkflowDetails {
  extractedFields?: number;
  validationPassed?: boolean;
  complianceChecked?: boolean;
  aiAnalysisComplete?: boolean;
  hasExtractedText?: boolean;
  metadataEnriched?: boolean;
  insightsGenerated?: number;
}

export class SecretaryAgent extends BaseAgent {
  // Named Entity Recognizer for contract-specific entity extraction
  private readonly ner: NamedEntityRecognizer;

  // Enterprise-specific configuration (loaded lazily)
  private _config: SecretaryConfig | null = null;
  private _configLoadPromise: Promise<SecretaryConfig> | null = null;

  constructor(supabase: any, enterpriseId: string) {
    super(supabase, enterpriseId, 'secretary');
    this.ner = new NamedEntityRecognizer();
  }

  /**
   * Get the enterprise-specific configuration (lazy loaded with caching)
   */
  private async getConfig(): Promise<SecretaryConfig> {
    // Return cached config if available
    if (this._config) {
      return this._config;
    }

    // Prevent multiple concurrent loads
    if (this._configLoadPromise) {
      return this._configLoadPromise;
    }

    // Load configuration from database
    this._configLoadPromise = getSecretaryConfig(this.supabase, this.enterpriseId)
      .then(config => {
        this._config = config;
        return config;
      })
      .catch(error => {
        console.error('[SecretaryAgent] Failed to load config, using defaults:', error);
        this._config = getDefaultSecretaryConfig();
        return this._config;
      })
      .finally(() => {
        this._configLoadPromise = null;
      });

    return this._configLoadPromise;
  }

  /**
   * Get configuration synchronously (returns cached or default)
   * Use this only when you need sync access and can accept defaults
   */
  private getConfigSync(): SecretaryConfig {
    return this._config || getDefaultSecretaryConfig();
  }

  get agentType() {
    return 'secretary';
  }

  get capabilities() {
    return [
      'document_processing',
      'data_extraction',
      'metadata_generation',
      'categorization',
      'ocr_analysis',
      'named_entity_recognition',
      'contract_entity_extraction',
    ];
  }

  async process(data: unknown, context?: AgentContext): Promise<ProcessingResult> {
    // Use memory-enhanced processing
    return this.processWithMemory(data, context, async (processData, enhancedContext, memories) => {
      const rulesApplied: string[] = [];
      const insights: Insight[] = [];
      const secretaryContext = enhancedContext as SecretaryContext | undefined;

      try {
        // ========================================
        // INPUT VALIDATION (Phase 1)
        // ========================================
        rulesApplied.push('input_validation');

        // Validate input data structure
        const inputValidation = validateSecretaryInput(processData);
        if (!inputValidation.success) {
          // Check if we have a document ID for stored document processing
          const rawData = processData as Record<string, unknown>;
          if (rawData?.documentId && typeof rawData.documentId === 'string') {
            // Allow stored document processing without content validation
            rulesApplied.push('stored_document_fallback');
          } else if (!secretaryContext?.contractId && !secretaryContext?.vendorId) {
            // No context IDs and invalid input - fail fast
            return this.createResult(
              false,
              undefined,
              [this.createInsight(
                'validation_error',
                'high',
                'Input Validation Failed',
                `Invalid input data: ${inputValidation.error}`,
                'Provide valid content, text, extracted_text, or documentId',
                { validationError: inputValidation.error },
              )],
              rulesApplied,
              0,
              { error: `Input validation failed: ${inputValidation.error}` },
            );
          }
        }

        // Sanitize content if present
        const secretaryData: SecretaryDataBase = {
          ...(processData as SecretaryDataBase),
        };

        // Sanitize and validate content fields
        if (secretaryData.content) {
          if (secretaryData.content.length > MAX_DOCUMENT_LENGTH) {
            insights.push(this.createInsight(
              'content_truncated',
              'medium',
              'Content Truncated',
              `Content exceeded ${MAX_DOCUMENT_LENGTH} characters and was truncated`,
              'Consider processing document in smaller sections',
              { originalLength: secretaryData.content.length },
            ));
            secretaryData.content = secretaryData.content.substring(0, MAX_DOCUMENT_LENGTH);
          }
          secretaryData.content = sanitizeContent(secretaryData.content);
        }

        if (secretaryData.text) {
          if (secretaryData.text.length > MAX_DOCUMENT_LENGTH) {
            secretaryData.text = secretaryData.text.substring(0, MAX_DOCUMENT_LENGTH);
          }
          secretaryData.text = sanitizeContent(secretaryData.text);
        }

        if (secretaryData.extracted_text) {
          if (secretaryData.extracted_text.length > MAX_DOCUMENT_LENGTH) {
            secretaryData.extracted_text = secretaryData.extracted_text.substring(0, MAX_DOCUMENT_LENGTH);
          }
          secretaryData.extracted_text = sanitizeContent(secretaryData.extracted_text);
        }

        // Validate UUID formats for context IDs
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (secretaryContext?.contractId && !uuidRegex.test(secretaryContext.contractId)) {
          return this.createResult(
            false,
            undefined,
            [this.createInsight(
              'invalid_contract_id',
              'high',
              'Invalid Contract ID Format',
              'Contract ID must be a valid UUID',
              'Provide a valid UUID for contractId',
              { providedId: secretaryContext.contractId },
            )],
            rulesApplied,
            0,
            { error: 'Invalid contract ID format' },
          );
        }

        if (secretaryContext?.vendorId && !uuidRegex.test(secretaryContext.vendorId)) {
          return this.createResult(
            false,
            undefined,
            [this.createInsight(
              'invalid_vendor_id',
              'high',
              'Invalid Vendor ID Format',
              'Vendor ID must be a valid UUID',
              'Provide a valid UUID for vendorId',
              { providedId: secretaryContext.vendorId },
            )],
            rulesApplied,
            0,
            { error: 'Invalid vendor ID format' },
          );
        }

        // ========================================
        // INPUT CONFLICT DETECTION
        // ========================================
        rulesApplied.push('input_conflict_detection');

        // Detect conflicting context IDs - contractId takes priority
        if (secretaryContext?.contractId && secretaryContext?.vendorId) {
          insights.push(this.createInsight(
            'conflicting_context_ids',
            'low',
            'Conflicting Context IDs',
            'Both contractId and vendorId provided - using contractId as primary context',
            'Provide only one context ID for clearer processing intent',
            { contractId: secretaryContext.contractId, vendorId: secretaryContext.vendorId },
          ));
        }

        // Detect multiple content sources
        const contentSources: string[] = [];
        if (secretaryData.content) contentSources.push('content');
        if (secretaryData.text) contentSources.push('text');
        if (secretaryData.extracted_text) contentSources.push('extracted_text');

        if (contentSources.length > 1) {
          insights.push(this.createInsight(
            'multiple_content_sources',
            'low',
            'Multiple Content Sources',
            `Multiple content sources provided: ${contentSources.join(', ')} - using priority: content > text > extracted_text`,
            'Provide only one content source to avoid ambiguity',
            { sources: contentSources },
          ));
        }

        // ========================================
        // ENCODING VALIDATION
        // ========================================
        const contentToCheck = secretaryData.content || secretaryData.text || secretaryData.extracted_text || '';
        if (contentToCheck && this.detectEncodingIssues(contentToCheck)) {
          insights.push(this.createInsight(
            'encoding_issues_detected',
            'medium',
            'Possible Encoding Issues',
            'Document may contain garbled text (mojibake) suggesting encoding problems',
            'Verify document encoding is UTF-8 or re-extract text with correct encoding',
            { sampleIssues: contentToCheck.match(/[\uFFFD\u00C3\u00C2]{3,}/g)?.slice(0, 3) },
          ));
        }

        // Check permissions if userId provided
        if (secretaryContext?.userId) {
          const hasPermission = await this.checkUserPermission(secretaryContext.userId, 'user');
          if (!hasPermission) {
            throw new Error('Insufficient permissions for document processing');
          }
        }

        // Create audit log
        if (secretaryContext?.contractId || secretaryContext?.vendorId) {
          await this.createAuditLog(
            'document_processing',
            secretaryContext.contractId ? 'contract' : 'vendor',
            secretaryContext.contractId || secretaryContext.vendorId!,
            { agentType: this.agentType },
          );
        }

        // Apply memory context to improve processing
        if (memories.length > 0) {
          rulesApplied.push('memory_context_applied');

          // Look for relevant patterns from memory
          const relevantMemories = memories.filter(m =>
            m.content.toLowerCase().includes('contract') ||
            m.content.toLowerCase().includes('vendor') ||
            m.content.toLowerCase().includes('document'),
          );

          if (relevantMemories.length > 0) {
            insights.push(this.createInsight(
              'memory_context',
              'low',
              'Previous Context Available',
              `Found ${relevantMemories.length} relevant memories that may assist processing`,
              undefined,
              { memoryCount: relevantMemories.length },
              false,
            ));
          }
        }

        // Determine processing type
        if (secretaryContext?.contractId) {
          return await this.processContractDocument(secretaryContext.contractId, secretaryData, secretaryContext, rulesApplied, insights);
        } else if (secretaryContext?.vendorId) {
          return await this.processVendorDocument(secretaryContext.vendorId, secretaryData, secretaryContext, rulesApplied, insights);
        } else if (secretaryData.documentId) {
          return await this.processStoredDocument(secretaryData.documentId, secretaryContext, rulesApplied, insights);
        }

        // Default document processing
        return await this.processGeneralDocument(secretaryData, secretaryContext, rulesApplied, insights);

      } catch (error) {
        return this.createResult(
          false,
          undefined,
          insights,
          rulesApplied,
          0,
          { error: error instanceof Error ? error.message : String(error) },
        );
      }
    });
  }

  private async processContractDocument(
    contractId: string,
    data: SecretaryDataBase,
    context: SecretaryContext | undefined,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult> {
    rulesApplied.push('contract_document_extraction');

    // ========================================
    // CONTRACT INPUT VALIDATION
    // ========================================

    // Validate contractId format (UUID check already done in process())
    if (!contractId || contractId.trim().length === 0) {
      return this.createResult(
        false,
        undefined,
        [this.createInsight(
          'missing_contract_id',
          'high',
          'Missing Contract ID',
          'Contract ID is required for contract document processing',
          'Provide a valid contract ID',
          {},
        )],
        rulesApplied,
        0,
        { error: 'Contract ID is required' },
      );
    }

    // Validate and sanitize content if provided
    let sanitizedContent: string | undefined;
    if (data.content || data.text || data.extracted_text) {
      const rawContent = data.content || data.text || data.extracted_text || '';
      if (rawContent.length > MAX_DOCUMENT_LENGTH) {
        insights.push(this.createInsight(
          'contract_content_truncated',
          'medium',
          'Contract Content Truncated',
          `Content exceeded ${MAX_DOCUMENT_LENGTH} characters`,
          'Consider processing in sections',
          { originalLength: rawContent.length },
        ));
        sanitizedContent = sanitizeContent(rawContent.substring(0, MAX_DOCUMENT_LENGTH));
      } else {
        sanitizedContent = sanitizeContent(rawContent);
      }
    }

    // Load enterprise configuration
    const config = await this.getConfig();

    // Use cached contract data with retry logic
    const cacheKey = `contract_document_${contractId}`;
    let contractData: ContractRecord | null = null;

    try {
      contractData = await this.getCachedOrFetch(cacheKey, async () => {
        return await withRetry(
          async () => {
            const { data: contract, error } = await this.supabase
              .from('contracts')
              .select(`
                *,
                vendor:vendors!vendor_id(id, name, category),
                documents:contract_documents(
                  id,
                  document_type,
                  file_path,
                  extracted_text,
                  metadata
                )
              `)
              .eq('id', contractId)
              .eq('enterprise_id', this.enterpriseId)
              .single();

            if (error) {
              throw new Error(`Database error fetching contract: ${error.message}`);
            }

            return contract as ContractRecord | null;
          },
          DEFAULT_RETRY_CONFIG,
          `getContractData(${contractId})`,
        );
      }, 300); // 5 min cache
    } catch (error) {
      const classified = classifyError(error);
      return this.createResult(
        false,
        undefined,
        [this.createInsight(
          'contract_fetch_failed',
          'high',
          'Failed to Fetch Contract',
          `Could not retrieve contract data: ${classified.message}`,
          classified.recoverable ? 'Retry the operation' : 'Check contract ID and permissions',
          { contractId, errorCategory: classified.category },
        )],
        rulesApplied,
        0,
        { error: classified.message, errorCategory: classified.category },
      );
    }

    if (!contractData) {
      return this.createResult(
        false,
        undefined,
        [this.createInsight(
          'contract_not_found',
          'high',
          'Contract Not Found',
          `Contract with ID ${contractId} was not found or access is denied`,
          'Verify the contract ID and your permissions',
          { contractId },
        )],
        rulesApplied,
        0,
        { error: 'Contract not found' },
      );
    }

    // Process document content (use pre-sanitized content if available, or sanitize from database)
    const content = sanitizedContent || sanitizeContent(contractData.extracted_text || '');

    // Warn if no content available for analysis
    if (!isContentAnalyzable(content)) {
      insights.push(this.createInsight(
        'no_analyzable_content',
        'medium',
        'Limited Content for Analysis',
        'No substantial text content available for analysis',
        'Ensure document has been properly processed or upload text content',
        { contentLength: content.length },
      ));
    }

    // Use database function for advanced extraction
    const extractedData = await this.callDatabaseFunction('extract_contract_metadata', {
      p_contract_id: contractId,
      p_content: content,
    });

    const analysis = {
      ...extractedData,
      title: this.extractTitle(content) || contractData.title,
      parties: this.extractParties(content),
      dates: this.extractDates(content),
      amounts: this.extractAmounts(content),
      keyTerms: this.extractKeyTerms(content),
      clauses: await this.extractAndAnalyzeClauses(content),
      documentType: this.classifyContractType(content),
      metadata: {
        wordCount: this.countWords(content),
        pageCount: this.estimatePageCount(content),
        hasSignatures: this.detectSignatures(content),
        language: await this.detectLanguage(content),
        complexity: this.assessComplexity(content),
        completeness: this.assessCompleteness(content, contractData.status),
      },
    };

    // Generate insights based on extraction

    // Missing critical information
    if (!analysis.dates.expirationDate && contractData.status === 'active') {
      insights.push(this.createInsight(
        'missing_expiration',
        'high',
        'No Expiration Date Found',
        'Active contract missing expiration date could lead to auto-renewal issues',
        'Add expiration date to contract metadata manually',
        { contractId },
      ));
      rulesApplied.push('expiration_validation');
    }

    // Incomplete party information (using config threshold)
    if (analysis.parties.length < config.minPartyCount) {
      insights.push(this.createInsight(
        'incomplete_parties',
        'high',
        'Incomplete Party Information',
        `Only ${analysis.parties.length} party identified in contract (minimum: ${config.minPartyCount})`,
        'Review and update party information in contract',
        { partiesFound: analysis.parties, minimumRequired: config.minPartyCount },
      ));
      rulesApplied.push('party_validation');
    }

    // High-value contract check (using config thresholds)
    const totalValue = analysis.amounts.reduce((sum: number, amt: Amount) => sum + amt.value, 0);
    if (isHighValueContract(totalValue, config)) {
      const severity = isCriticalValueContract(totalValue, config) ? 'critical' : 'high';
      insights.push(this.createInsight(
        severity === 'critical' ? 'critical_value_document' : 'high_value_document',
        severity,
        severity === 'critical' ? 'Critical-Value Contract Document' : 'High-Value Contract Document',
        `Document contains amounts totaling $${totalValue.toLocaleString()}`,
        severity === 'critical'
          ? 'Requires executive approval and enhanced security measures'
          : 'Ensure proper approval workflow and secure storage',
        {
          totalValue,
          amounts: analysis.amounts,
          threshold: severity === 'critical'
            ? config.criticalValueContractThreshold
            : config.highValueContractThreshold,
        },
      ));
      rulesApplied.push('value_assessment');
    }

    // Clause analysis insights
    if (analysis.clauses.riskyClausesCount > 0) {
      insights.push(this.createInsight(
        'risky_clauses',
        'high',
        'Risky Clauses Detected',
        `Found ${analysis.clauses.riskyClausesCount} potentially risky clauses`,
        'Review highlighted clauses with legal team',
        { clauses: analysis.clauses.risky },
      ));
      rulesApplied.push('clause_risk_analysis');
    }

    // Document completeness (using config threshold)
    if (analysis.metadata.completeness < config.minCompletenessScore) {
      insights.push(this.createInsight(
        'incomplete_document',
        'medium',
        'Document May Be Incomplete',
        `Document completeness score: ${(analysis.metadata.completeness * 100).toFixed(0)}% (minimum: ${(config.minCompletenessScore * 100).toFixed(0)}%)`,
        'Verify all pages/sections are included',
        { completeness: analysis.metadata.completeness, minimumRequired: config.minCompletenessScore },
      ));
      rulesApplied.push('completeness_check');
    }

    // Store extracted metadata
    await this.storeExtractedMetadata(contractId, analysis);

    // Store insights
    if (insights.length > 0 && context?.taskId) {
      await this.storeInsights(insights, contractId, 'contract');
    }

    // Store important contract information in memory
    if (context?.userId) {
      // Store contract summary
      await this.storeMemory(
        'contract_analysis',
        `Contract ${analysis.title}: ${contractData.vendor?.name || 'Unknown Vendor'}, ${analysis.documentType}, Value: ${analysis.amounts.map((a: Amount) => a.formatted).join(', ') || 'Unspecified'}`,
        {
          contractId,
          vendorName: contractData.vendor?.name,
          documentType: analysis.documentType,
          parties: analysis.parties,
          expirationDate: analysis.dates.expirationDate,
          totalValue,
          keyTerms: analysis.keyTerms.slice(0, 10),
          riskLevel: analysis.clauses.riskyClausesCount > 2 ? 'high' : analysis.clauses.riskyClausesCount > 0 ? 'medium' : 'low',
        },
        0.7, // High importance for contract details
      );

      // Store risky clauses as separate memory if found
      if (analysis.clauses.riskyClausesCount > 0) {
        await this.storeMemory(
          'contract_risk',
          `Contract ${analysis.title} contains ${analysis.clauses.riskyClausesCount} risky clauses: ${analysis.clauses.risky.map((c: Clause) => c.type).join(', ')}`,
          {
            contractId,
            riskyClauseTypes: analysis.clauses.risky.map((c: Clause) => c.type),
            riskReasons: analysis.clauses.risky.map((c: Clause) => c.risk_reason),
          },
          0.8, // Very high importance for risky clauses
        );
      }

      // Store expiration warning if needed (using config thresholds)
      if (analysis.dates.expirationDate) {
        const expirationDate = new Date(analysis.dates.expirationDate);
        const daysUntilExpiration = Math.floor((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const urgency = getExpirationUrgency(daysUntilExpiration, config);

        if (urgency !== 'normal' && daysUntilExpiration > 0) {
          // Determine memory importance based on urgency
          const importance = urgency === 'urgent' ? 0.95 : urgency === 'critical' ? 0.9 : 0.8;

          await this.storeMemory(
            `contract_expiration_${urgency}`,
            `Contract ${analysis.title} expires in ${daysUntilExpiration} days on ${analysis.dates.expirationDate} [${urgency.toUpperCase()}]`,
            {
              contractId,
              expirationDate: analysis.dates.expirationDate,
              daysUntilExpiration,
              vendorName: contractData.vendor?.name,
              urgencyLevel: urgency,
              thresholds: {
                warning: config.expirationWarningDays,
                critical: config.criticalExpirationDays,
                urgent: config.urgentExpirationDays,
              },
            },
            importance,
          );
        }
      }
    }

    const confidence = this.calculateExtractionConfidence(analysis);

    return this.createResult(
      true,
      analysis,
      insights,
      rulesApplied,
      confidence,
      {
        contractId,
        documentType: analysis.documentType,
        extractionComplete: true,
      },
    );
  }

  private async processVendorDocument(
    vendorId: string,
    data: SecretaryDataBase,
    context: SecretaryContext | undefined,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult> {
    rulesApplied.push('vendor_document_processing');

    // ========================================
    // VENDOR INPUT VALIDATION
    // ========================================

    // Validate vendorId
    if (!vendorId || vendorId.trim().length === 0) {
      return this.createResult(
        false,
        undefined,
        [this.createInsight(
          'missing_vendor_id',
          'high',
          'Missing Vendor ID',
          'Vendor ID is required for vendor document processing',
          'Provide a valid vendor ID',
          {},
        )],
        rulesApplied,
        0,
        { error: 'Vendor ID is required' },
      );
    }

    // Sanitize content fields in data
    const sanitizedData: SecretaryDataBase = { ...data };
    if (sanitizedData.content) {
      sanitizedData.content = sanitizeContent(
        sanitizedData.content.length > MAX_DOCUMENT_LENGTH
          ? sanitizedData.content.substring(0, MAX_DOCUMENT_LENGTH)
          : sanitizedData.content
      );
    }
    if (sanitizedData.text) {
      sanitizedData.text = sanitizeContent(
        sanitizedData.text.length > MAX_DOCUMENT_LENGTH
          ? sanitizedData.text.substring(0, MAX_DOCUMENT_LENGTH)
          : sanitizedData.text
      );
    }

    // Get vendor data with caching
    const vendorData = await this.getVendorData(vendorId);

    const analysis: VendorAnalysis = {
      vendorName: this.normalizeVendorName(vendorData.name),
      category: this.categorizeVendor(vendorData),
      contactInfo: this.extractContactInfo(sanitizedData),
      identifiers: this.extractIdentifiers(sanitizedData),
      certifications: await this.extractCertifications(sanitizedData),
      riskIndicators: this.assessVendorRisk(sanitizedData),
      complianceStatus: await this.checkVendorCompliance(vendorId),
      documentType: this.identifyVendorDocumentType(sanitizedData),
    };

    // Missing contact information
    if (!analysis.contactInfo.email && !analysis.contactInfo.phone) {
      insights.push(this.createInsight(
        'missing_vendor_contact',
        'medium',
        'Missing Vendor Contact Information',
        'No email or phone number found in vendor documents',
        'Update vendor profile with current contact details',
        { vendorId },
      ));
      rulesApplied.push('contact_validation');
    }

    // Vendor risk assessment
    if (analysis.riskIndicators.length > 0) {
      insights.push(this.createInsight(
        'vendor_risk_indicators',
        'high',
        'Vendor Risk Indicators Found',
        `Detected ${analysis.riskIndicators.length} risk indicators in vendor documents`,
        'Conduct vendor due diligence review',
        { risks: analysis.riskIndicators, vendorId },
      ));
      rulesApplied.push('vendor_risk_assessment');
    }

    // Compliance issues
    if (!analysis.complianceStatus.isCompliant) {
      insights.push(this.createInsight(
        'vendor_compliance_issues',
        'critical',
        'Vendor Compliance Issues',
        `Vendor missing required documents: ${analysis.complianceStatus.missingDocuments.join(', ')}`,
        'Request missing compliance documents from vendor',
        analysis.complianceStatus,
      ));
      rulesApplied.push('compliance_check');
    }

    // Store insights
    if (insights.length > 0 && context?.taskId) {
      await this.storeInsights(insights, vendorId, 'vendor');
    }

    // Store vendor information in memory
    if (context?.userId) {
      // Store vendor profile
      await this.storeMemory(
        'vendor_profile',
        `Vendor ${analysis.vendorName}: ${analysis.category}, Compliance: ${analysis.complianceStatus.complianceScore}%`,
        {
          vendorId,
          vendorName: analysis.vendorName,
          category: analysis.category,
          contactInfo: analysis.contactInfo,
          certifications: analysis.certifications,
          complianceScore: analysis.complianceStatus.complianceScore,
          missingDocuments: analysis.complianceStatus.missingDocuments,
        },
        0.6, // Moderate importance for vendor profiles
      );

      // Store vendor risk assessment if risks found
      if (analysis.riskIndicators.length > 0) {
        await this.storeMemory(
          'vendor_risk_assessment',
          `Vendor ${analysis.vendorName} has ${analysis.riskIndicators.length} risk indicators: ${analysis.riskIndicators.join(', ')}`,
          {
            vendorId,
            vendorName: analysis.vendorName,
            riskIndicators: analysis.riskIndicators,
            assessmentDate: new Date().toISOString(),
          },
          0.8, // High importance for vendor risks
        );
      }

      // Store compliance issues if any
      if (!analysis.complianceStatus.isCompliant) {
        await this.storeMemory(
          'vendor_compliance_issue',
          `Vendor ${analysis.vendorName} has compliance issues: Missing ${analysis.complianceStatus.missingDocuments.join(', ')}`,
          {
            vendorId,
            vendorName: analysis.vendorName,
            missingDocuments: analysis.complianceStatus.missingDocuments,
            expiredDocuments: analysis.complianceStatus.expiredDocuments,
          },
          0.9, // Critical importance for compliance issues
        );
      }
    }

    return this.createResult(
      true,
      analysis,
      insights,
      rulesApplied,
      0.85,
      { vendorId, documentProcessed: true },
    );
  }

  private async processStoredDocument(
    documentId: string,
    _context: SecretaryContext | undefined,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult> {
    rulesApplied.push('stored_document_processing');

    // Validate document ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!documentId || !uuidRegex.test(documentId)) {
      return this.createResult(
        false,
        undefined,
        [this.createInsight(
          'invalid_document_id',
          'high',
          'Invalid Document ID',
          'Document ID must be a valid UUID',
          'Provide a valid document ID',
          { providedId: documentId },
        )],
        rulesApplied,
        0,
        { error: 'Invalid document ID format' },
      );
    }

    // Get document from database with retry
    let documentRecord: DocumentRecord | null = null;

    try {
      const document = await withRetry(
        async () => {
          const { data, error } = await this.supabase
            .from('documents')
            .select('*')
            .eq('id', documentId)
            .eq('enterprise_id', this.enterpriseId)
            .single();

          if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            throw new Error(`Database error: ${error.message}`);
          }

          return data;
        },
        { maxAttempts: 2, baseDelayMs: 100, maxDelayMs: 500 },
        `getDocument(${documentId})`,
      );

      documentRecord = document as DocumentRecord | null;
    } catch (error) {
      const classified = classifyError(error);
      return this.createResult(
        false,
        undefined,
        [this.createInsight(
          'document_fetch_failed',
          'high',
          'Failed to Fetch Document',
          `Could not retrieve document: ${classified.message}`,
          classified.recoverable ? 'Retry the operation' : 'Check document ID and permissions',
          { documentId, errorCategory: classified.category },
        )],
        rulesApplied,
        0,
        { error: classified.message },
      );
    }

    if (!documentRecord) {
      return this.createResult(
        false,
        undefined,
        [this.createInsight(
          'document_not_found',
          'high',
          'Document Not Found',
          `Document with ID ${documentId} was not found or access is denied`,
          'Verify the document ID and your permissions',
          { documentId },
        )],
        rulesApplied,
        0,
        { error: 'Document not found' },
      );
    }

    // Check if OCR is needed
    if (!documentRecord.extracted_text && documentRecord.file_type === 'pdf') {
      // Queue OCR task
      await this.queueOCRTask(documentId);

      insights.push(this.createInsight(
        'ocr_required',
        'medium',
        'OCR Processing Required',
        'Document needs text extraction before full analysis',
        'OCR task has been queued for processing',
        { documentId },
        false,
      ));
    }

    const content = documentRecord.extracted_text || '';

    const analysis = {
      documentType: this.classifyDocument(content),
      summary: this.generateSummary(content),
      entities: this.extractEntities(content),
      keywords: this.extractKeywords(content),
      sentiment: this.analyzeSentiment(content),
      language: await this.detectLanguage(content),
      metadata: documentRecord.metadata || {},
      quality: this.assessDocumentQuality(documentRecord),
    };

    // Update document metadata
    await this.updateDocumentMetadata(documentId, analysis);

    return this.createResult(
      true,
      analysis,
      insights,
      rulesApplied,
      0.8,
      { documentId },
    );
  }

  private async processGeneralDocument(
    data: SecretaryDataBase,
    context: SecretaryContext | undefined,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult> {
    rulesApplied.push('general_document_analysis');

    // Load enterprise configuration
    const config = await this.getConfig();

    const text = data.text || data.content || data.extracted_text || '';

    // Check if we should use the document workflow for comprehensive processing
    if (data.useWorkflow && data.documentId && context?.userId && config.enableWorkflowAutomation) {
      return this.processDocumentWithWorkflow(
        data.documentId,
        data.workflowType || 'contract_onboarding',
        context,
        rulesApplied,
        insights,
      );
    }

    const sentiment = config.enableSentimentAnalysis ? this.analyzeSentiment(text) : { score: 0, label: 'neutral', positive: 0, negative: 0 };

    // Get base document type and refine if it's a contract or unknown
    const baseDocType = this.classifyDocument(text);
    let documentType = baseDocType;
    if (baseDocType === 'contract' || baseDocType === 'other') {
      // Get specific contract type for better classification
      const contractType = this.classifyContractType(text);
      if (contractType !== 'other') {
        documentType = contractType;
      }
    }

    // Extract amounts for value analysis
    const amounts = this.extractAmounts(text);
    const totalValue = amounts.reduce((sum, a) => sum + a.value, 0);

    // Analyze clauses for risky patterns
    const clauseAnalysis = await this.extractAndAnalyzeClauses(text);

    const analysis = {
      title: this.extractTitle(text),
      summary: this.generateSummary(text),
      entities: config.enableNer ? this.extractEntities(text) : { organizations: [], people: [], locations: [], dates: [], emails: [], phones: [] },
      keywords: this.extractKeywords(text),
      parties: this.extractParties(text),
      dates: this.extractDates(text),
      amounts,
      clauses: clauseAnalysis,
      sentiment,
      documentType,
      language: await this.detectLanguage(text),
      metadata: {
        length: text.length,
        wordCount: this.countWords(text),
        paragraphs: this.countParagraphs(text),
        readabilityScore: this.calculateReadability(text),
        complexity: this.assessComplexity(text),
      },
    };

    // Risky clause insights
    if (clauseAnalysis.riskyClausesCount > 0) {
      insights.push(this.createInsight(
        'risky_clauses',
        'high',
        'Risky Clauses Detected',
        `Found ${clauseAnalysis.riskyClausesCount} potentially risky clauses`,
        'Review highlighted clauses with legal team',
        { clauses: clauseAnalysis.risky },
      ));
      rulesApplied.push('clause_risk_analysis');
    }

    // High-value document insights
    if (isCriticalValueContract(totalValue, config)) {
      insights.push(this.createInsight(
        'critical_value_document',
        'high',
        'Critical Value Document',
        `Document value ($${totalValue.toLocaleString()}) exceeds critical threshold ($${config.criticalValueContractThreshold.toLocaleString()})`,
        'Requires executive review and approval',
        { totalValue, threshold: config.criticalValueContractThreshold },
      ));
      rulesApplied.push('critical_value_analysis');
    } else if (isHighValueContract(totalValue, config)) {
      insights.push(this.createInsight(
        'high_value_document',
        'medium',
        'High Value Document',
        `Document value ($${totalValue.toLocaleString()}) exceeds high-value threshold ($${config.highValueContractThreshold.toLocaleString()})`,
        'Consider additional review before approval',
        { totalValue, threshold: config.highValueContractThreshold },
      ));
      rulesApplied.push('high_value_analysis');
    }

    // Document quality insights (using config threshold)
    if (analysis.metadata.readabilityScore < config.minReadabilityScore) {
      insights.push(this.createInsight(
        'poor_readability',
        'low',
        'Document Has Poor Readability',
        `Readability score: ${analysis.metadata.readabilityScore.toFixed(0)}/100 (minimum: ${config.minReadabilityScore})`,
        'Consider requesting a simplified version',
        { readabilityScore: analysis.metadata.readabilityScore, minimumRequired: config.minReadabilityScore },
        false,
      ));
      rulesApplied.push('readability_analysis');
    }

    // Sentiment insights
    if (sentiment.score < -0.5) {
      insights.push(this.createInsight(
        'negative_sentiment',
        'medium',
        'Negative Sentiment Detected',
        'Document contains predominantly negative language',
        'Review for potential issues or concerns',
        analysis.sentiment,
      ));
      rulesApplied.push('sentiment_analysis');
    }

    return this.createResult(
      true,
      analysis,
      insights,
      rulesApplied,
      0.75,
    );
  }

  // Database-integrated methods
  private async getVendorData(vendorId: string): Promise<VendorData> {
    const cacheKey = `vendor_data_${vendorId}_${this.enterpriseId}`;

    const result = await this.getCachedOrFetch(cacheKey, async () => {
      // Use retry logic for database operations
      return await withRetry(
        async () => {
          const { data, error } = await this.supabase
            .from('vendors')
            .select(`
              *,
              contracts:contracts(count),
              documents:vendor_documents(
                document_type,
                uploaded_at,
                expiration_date
              )
            `)
            .eq('id', vendorId)
            .eq('enterprise_id', this.enterpriseId)
            .single();

          if (error) {
            throw new Error(`Database error fetching vendor: ${error.message}`);
          }

          return data as VendorData | null;
        },
        DEFAULT_RETRY_CONFIG,
        `getVendorData(${vendorId})`,
      );
    }, 600); // 10 min cache

    if (!result) {
      throw new Error(`Vendor ${vendorId} not found`);
    }

    return result;
  }

  private async extractAndAnalyzeClauses(content: string): Promise<ClauseAnalysis> {
    // Default empty result for graceful degradation
    const emptyResult: ClauseAnalysis = {
      total: 0,
      risky: [],
      standard: [],
      riskyClausesCount: 0,
      categories: {},
    };

    // Validate content before processing
    if (!content || content.trim().length < MIN_CONTENT_LENGTH) {
      return emptyResult;
    }

    // Get risky patterns from configuration (enterprise-customizable)
    const config = this.getConfigSync();
    const riskyPatterns = getRiskyClauseRegexes(config);

    let clauses: Clause[] = [];

    try {
      // Use database function for clause extraction with timeout
      const extractedClauses = await withTimeout(
        withRetry(
          async () => this.callDatabaseFunction('extract_contract_clauses', {
            p_content: content,
          }),
          { maxAttempts: 2, baseDelayMs: 100, maxDelayMs: 1000 },
          'extractContractClauses',
        ),
        30000, // 30 second timeout
        'extractContractClauses',
      );

      clauses = Array.isArray(extractedClauses) ? extractedClauses : [];

      // Use fallback if database returned empty array
      if (clauses.length === 0) {
        clauses = this.extractClausesFallback(content, config.maxClausesToAnalyze);
      }
    } catch (error) {
      // Graceful degradation: continue with basic clause extraction if database function fails
      console.warn('[SecretaryAgent] Database clause extraction failed, using fallback:', error);
      clauses = this.extractClausesFallback(content, config.maxClausesToAnalyze);
    }

    const risky: Clause[] = [];
    const standard: Clause[] = [];

    // Enforce clause analysis limit from config
    const clausesToAnalyze = clauses.slice(0, config.maxClausesToAnalyze);

    for (const clause of clausesToAnalyze) {
      // Skip null/undefined clauses
      if (!clause || !clause.text) {
        continue;
      }

      try {
        const isRisky = riskyPatterns.some(pattern => pattern.test(clause.text));
        if (isRisky) {
          // Find which pattern matched for risk reason
          const matchedPattern = riskyPatterns.find(pattern => pattern.test(clause.text));
          risky.push({
            ...clause,
            risk_reason: matchedPattern ? `Matches pattern: ${matchedPattern.source}` : 'Unknown risk pattern',
          });
        } else {
          standard.push(clause);
        }
      } catch (patternError) {
        // Skip clause if pattern matching fails (malformed regex unlikely but possible)
        console.warn('[SecretaryAgent] Pattern matching error for clause:', patternError);
        standard.push(clause);
      }
    }

    return {
      total: clausesToAnalyze.length,
      risky,
      standard,
      riskyClausesCount: risky.length,
      categories: this.categorizeClause(clausesToAnalyze),
    };
  }

  private async checkVendorCompliance(vendorId: string): Promise<ComplianceStatus> {
    // Default compliance status for graceful degradation
    const defaultStatus: ComplianceStatus = {
      isCompliant: true,
      missingDocuments: [],
      expiredDocuments: [],
      complianceScore: 100,
    };

    try {
      // Get required documents for vendor with retry
      const requirements = await withRetry(
        async () => {
          const { data, error } = await this.supabase
            .from('compliance_requirements')
            .select('document_type, is_required')
            .eq('enterprise_id', this.enterpriseId)
            .eq('is_required', true);

          if (error) {
            throw new Error(`Failed to fetch compliance requirements: ${error.message}`);
          }
          return data;
        },
        { maxAttempts: 2, baseDelayMs: 100, maxDelayMs: 500 },
        'getComplianceRequirements',
      );

      // Get vendor's uploaded documents with retry
      const vendorDocs = await withRetry(
        async () => {
          const { data, error } = await this.supabase
            .from('vendor_documents')
            .select('document_type, expiration_date')
            .eq('vendor_id', vendorId)
            .eq('status', 'active');

          if (error) {
            throw new Error(`Failed to fetch vendor documents: ${error.message}`);
          }
          return data;
        },
        { maxAttempts: 2, baseDelayMs: 100, maxDelayMs: 500 },
        'getVendorDocuments',
      );

      // Safely extract required types with null checks
      const requiredTypes = (requirements || [])
        .filter((r): r is { document_type: string; is_required: boolean } =>
          r !== null && typeof r.document_type === 'string')
        .map(r => r.document_type);

      // Safely extract uploaded types
      const uploadedTypes = (vendorDocs || [])
        .filter((d): d is { document_type: string; expiration_date: string | null } =>
          d !== null && typeof d.document_type === 'string')
        .map(d => d.document_type);

      const missingDocuments = requiredTypes.filter(type => !uploadedTypes.includes(type));

      // Check for expired documents with safe date parsing
      const now = new Date();
      const expiredDocs = (vendorDocs || [])
        .filter((doc): doc is { document_type: string; expiration_date: string } => {
          if (!doc || !doc.expiration_date) return false;
          try {
            const expDate = new Date(doc.expiration_date);
            return !isNaN(expDate.getTime()) && expDate < now;
          } catch {
            return false;
          }
        });

      return {
        isCompliant: missingDocuments.length === 0 && expiredDocs.length === 0,
        missingDocuments,
        expiredDocuments: expiredDocs.map(d => d.document_type),
        complianceScore: requiredTypes.length > 0
          ? Math.round(((requiredTypes.length - missingDocuments.length) / requiredTypes.length) * 100)
          : 100,
      };
    } catch (error) {
      // Graceful degradation: return default compliance status on error
      console.warn('[SecretaryAgent] Compliance check failed, returning default status:', error);
      return {
        ...defaultStatus,
        // Flag that compliance couldn't be verified
        isCompliant: false,
        missingDocuments: ['_compliance_check_failed'],
        complianceScore: 0,
      };
    }
  }

  private async storeExtractedMetadata(contractId: string, analysis: DocumentAnalysis): Promise<void> {
    try {
      // Update contract with extracted metadata - use retry for resilience
      await withRetry(
        async () => {
          const { error } = await this.supabase
            .from('contracts')
            .update({
              extracted_metadata: {
                title: analysis.title || 'Untitled',
                parties: analysis.parties || [],
                dates: analysis.dates || { effectiveDate: null, expirationDate: null, signedDate: null, otherDates: [] },
                keyTerms: analysis.keyTerms || [],
                documentType: analysis.documentType || 'other',
                extractedAt: new Date().toISOString(),
              },
              // Only update title if we have a meaningful one
              ...(analysis.title && analysis.title !== 'Untitled Document' ? { title: analysis.title } : {}),
              // Only update dates if they're valid
              ...(analysis.dates?.effectiveDate ? { start_date: analysis.dates.effectiveDate } : {}),
              ...(analysis.dates?.expirationDate ? { end_date: analysis.dates.expirationDate } : {}),
            })
            .eq('id', contractId)
            .eq('enterprise_id', this.enterpriseId);

          if (error) {
            throw new Error(`Failed to store metadata: ${error.message}`);
          }
        },
        { maxAttempts: 2, baseDelayMs: 100, maxDelayMs: 500 },
        'storeExtractedMetadata',
      );

      // Store amounts separately for financial tracking
      if (analysis.amounts && analysis.amounts.length > 0) {
        const totalValue = analysis.amounts.reduce((sum: number, amt: Amount) => {
          // Extra safety: validate amount value
          const value = typeof amt?.value === 'number' && isFinite(amt.value) ? amt.value : 0;
          return sum + value;
        }, 0);

        // Only update if we have a valid total value
        if (totalValue > 0) {
          await withRetry(
            async () => {
              const { error } = await this.supabase
                .from('contracts')
                .update({ value: totalValue })
                .eq('id', contractId)
                .eq('enterprise_id', this.enterpriseId);

              if (error) {
                throw new Error(`Failed to store contract value: ${error.message}`);
              }
            },
            { maxAttempts: 2, baseDelayMs: 100, maxDelayMs: 500 },
            'storeContractValue',
          );
        }
      }
    } catch (error) {
      // Log but don't throw - metadata storage failure shouldn't fail the whole operation
      console.error('[SecretaryAgent] Failed to store extracted metadata:', error);
    }
  }

  private async updateDocumentMetadata(
    documentId: string,
    analysis: {
      documentType: string;
      summary: string;
      entities: ExtractedEntities;
      keywords: string[];
      sentiment: SentimentAnalysis;
      metadata: Record<string, unknown>;
    },
  ): Promise<void> {
    try {
      await withRetry(
        async () => {
          const { error } = await this.supabase
            .from('documents')
            .update({
              metadata: {
                ...(analysis.metadata || {}),
                documentType: analysis.documentType || 'other',
                summary: (analysis.summary || '').substring(0, 2000), // Limit summary length
                keywords: (analysis.keywords || []).slice(0, 50), // Limit keyword count
                entities: analysis.entities || {},
                sentiment: analysis.sentiment || { score: 0, label: 'neutral', positive: 0, negative: 0 },
                processedAt: new Date().toISOString(),
              },
            })
            .eq('id', documentId)
            .eq('enterprise_id', this.enterpriseId);

          if (error) {
            throw new Error(`Failed to update document metadata: ${error.message}`);
          }
        },
        { maxAttempts: 2, baseDelayMs: 100, maxDelayMs: 500 },
        'updateDocumentMetadata',
      );
    } catch (error) {
      // Log but don't throw - metadata update failure shouldn't fail the whole operation
      console.error('[SecretaryAgent] Failed to update document metadata:', error);
    }
  }

  private async queueOCRTask(documentId: string): Promise<void> {
    try {
      await withRetry(
        async () => {
          const { error } = await this.supabase
            .from('agent_tasks')
            .insert({
              agent_type: 'ocr',
              priority: 5,
              payload: {
                data: { documentId },
                context: { documentId },
              },
              enterprise_id: this.enterpriseId,
              status: 'pending',
            });

          if (error) {
            throw new Error(`Failed to queue OCR task: ${error.message}`);
          }
        },
        { maxAttempts: 2, baseDelayMs: 100, maxDelayMs: 500 },
        'queueOCRTask',
      );
    } catch (error) {
      // Log but don't throw - OCR queue failure shouldn't fail the whole operation
      console.error('[SecretaryAgent] Failed to queue OCR task:', error);
    }
  }

  /**
   * Detect the primary language of the document using word frequency analysis.
   * Analyzes common stopwords in English, Spanish, French, and German.
   * @param text - The document text to analyze
   * @returns ISO 639-1 language code (defaults to 'en' if detection fails)
   */
  private async detectLanguage(text: string): Promise<string> {
    // Simple language detection based on character patterns
    const cacheKey = `lang_detect_${text.substring(0, 100)}`;

    return this.getCachedOrFetch(cacheKey, async () => {
      // Common words in different languages
      const languagePatterns = {
        en: /\b(the|and|of|to|in|is|for|with|that|this)\b/gi,
        es: /\b(el|la|de|que|y|en|un|por|con|para)\b/gi,
        fr: /\b(le|de|et|à|les|des|en|un|pour|dans)\b/gi,
        de: /\b(der|die|und|in|den|von|zu|das|mit|sich)\b/gi,
      };

      const scores: Record<string, number> = {};

      for (const [lang, pattern] of Object.entries(languagePatterns)) {
        const matches = text.match(pattern) || [];
        scores[lang] = matches.length;
      }

      // Find language with highest score
      let maxScore = 0;
      let detectedLang = 'en'; // default

      for (const [lang, score] of Object.entries(scores)) {
        if (score > maxScore) {
          maxScore = score;
          detectedLang = lang;
        }
      }

      return detectedLang;
    }, 3600); // 1 hour cache
  }

  /**
   * Extract compliance certifications from document content.
   * Identifies ISO standards, SOC2, HIPAA, GDPR, PCI-DSS, and CMMI certifications.
   * @param data - The secretary data containing document content
   * @returns Array of unique certification names in uppercase (e.g., ['ISO 27001', 'SOC2', 'HIPAA'])
   */
  private async extractCertifications(data: SecretaryDataBase): Promise<string[]> {
    const text = JSON.stringify(data).toLowerCase();
    const certifications: string[] = [];

    const certPatterns = [
      /iso\s*\d{4,5}/gi,
      /soc\s*[12]/gi,
      /hipaa/gi,
      /gdpr/gi,
      /pci.?dss/gi,
      /cmmi/gi,
    ];

    for (const pattern of certPatterns) {
      const matches = text.match(pattern) || [];
      certifications.push(...matches);
    }

    return [...new Set(certifications.map(c => c.toUpperCase()))];
  }

  /**
   * Classify vendor document type based on content keywords.
   * Identifies W-9, insurance certificates, MSAs, SOWs, NDAs, invoices, and purchase orders.
   * @param data - The secretary data containing document content
   * @returns Document type identifier (e.g., 'w9', 'insurance_certificate', 'msa', 'invoice', 'other')
   */
  private identifyVendorDocumentType(data: SecretaryDataBase): string {
    const text = (data.content || data.text || '').toLowerCase();

    if (text.includes('w-9') || text.includes('tax identification')) {return 'w9';}
    if (text.includes('insurance') && text.includes('certificate')) {return 'insurance_certificate';}
    if (text.includes('master service agreement') || text.includes('msa')) {return 'msa';}
    if (text.includes('statement of work') || text.includes('sow')) {return 'sow';}
    if (text.includes('non-disclosure') || text.includes('nda')) {return 'nda';}
    if (text.includes('invoice')) {return 'invoice';}
    if (text.includes('purchase order')) {return 'purchase_order';}

    return 'other';
  }

  /**
   * Assess document quality and completeness on a 0-1 scale.
   * Evaluates content length, file presence, file size, and document age.
   * @param document - The document record to assess
   * @returns Quality assessment with score (0-1), issues array, and completeness (0-1)
   */
  private assessDocumentQuality(document: DocumentRecord): DocumentQualityAssessment {
    const quality = {
      score: 0.5,
      issues: [] as string[],
      completeness: 0.5,
    };

    if (!document.extracted_text || document.extracted_text.length < 100) {
      quality.issues.push('minimal_content');
      quality.score -= 0.1;
      quality.completeness -= 0.2;
    } else {
      quality.completeness += 0.3;
    }

    if (!document.file_path) {
      quality.issues.push('missing_file');
      quality.score -= 0.2;
      quality.completeness -= 0.3;
    } else {
      quality.completeness += 0.2;
    }

    if (document.file_size && document.file_size > 10 * 1024 * 1024) { // 10MB
      quality.issues.push('large_file');
      quality.score -= 0.05;
    }

    const age = Date.now() - new Date(document.created_at).getTime();
    const yearInMs = 365 * 24 * 60 * 60 * 1000;
    if (age > 2 * yearInMs) {
      quality.issues.push('outdated');
      quality.score -= 0.1;
    }

    quality.score = Math.max(0, Math.min(1, quality.score + 0.35));
    quality.completeness = Math.max(0, Math.min(1, quality.completeness));

    return quality;
  }

  /**
   * Fallback clause extraction using regex patterns
   * Used when database function returns no results or fails
   */
  private extractClausesFallback(content: string, maxClauses: number): Clause[] {
    // Basic fallback: split by common clause indicators
    const clauseIndicators = /(?:^|\n)(?:\d+\.|[a-z]\)|ARTICLE|SECTION|Clause|CLAUSE)\s+/gi;
    const parts = content.split(clauseIndicators).filter(p => p.trim().length > 50);

    return parts.slice(0, maxClauses).map((text, index) => ({
      type: 'extracted',
      text: text.trim().substring(0, 1000), // Limit clause length
      section: `Section ${index + 1}`,
    }));
  }

  /**
   * Categorize clauses by type into predefined categories.
   * Categories: payment, termination, liability, confidentiality, warranty, general.
   * @param clauses - Array of clause objects to categorize
   * @returns Record mapping category names to clause counts
   */
  private categorizeClause(clauses: Clause[]): Record<string, number> {
    const categories: Record<string, number> = {
      payment: 0,
      termination: 0,
      liability: 0,
      confidentiality: 0,
      warranty: 0,
      general: 0,
    };

    for (const clause of clauses) {
      const text = clause.text.toLowerCase();

      if (text.includes('payment') || text.includes('invoice') || text.includes('fee')) {
        categories.payment++;
      } else if (text.includes('terminat') || text.includes('cancel')) {
        categories.termination++;
      } else if (text.includes('liabil') || text.includes('indemni')) {
        categories.liability++;
      } else if (text.includes('confident') || text.includes('proprietary')) {
        categories.confidentiality++;
      } else if (text.includes('warrant') || text.includes('guarantee')) {
        categories.warranty++;
      } else {
        categories.general++;
      }
    }

    return categories;
  }

  /**
   * Estimate page count from character count.
   * Uses approximation of 3000 characters per page.
   * @param content - The document content
   * @returns Estimated page count (minimum 1)
   */
  private estimatePageCount(content: string): number {
    // Rough estimate: ~3000 characters per page
    return Math.max(1, Math.ceil(content.length / 3000));
  }

  /**
   * Score document completeness on a 0-1 scale.
   * Checks for standard contract sections (parties, recitals, terms, payment, termination, etc.).
   * Penalizes active contracts missing signatures.
   * @param content - The document content
   * @param status - Contract status ('active', 'draft', etc.)
   * @returns Completeness score between 0 and 1
   */
  private assessCompleteness(content: string, status: string): number {
    let score = 0.5;

    // Check for common contract sections
    const sections = [
      /parties|between/i,
      /recitals|whereas/i,
      /terms|conditions/i,
      /payment|compensation/i,
      /termination/i,
      /confidentiality/i,
      /signatures?/i,
    ];

    for (const section of sections) {
      if (section.test(content)) {
        score += 0.07;
      }
    }

    // Penalize if active but missing signatures
    if (status === 'active' && !this.detectSignatures(content)) {
      score -= 0.2;
    }

    return Math.max(0, Math.min(1, score));
  }

  private calculateExtractionConfidence(analysis: DocumentAnalysis): number {
    let confidence = 0.5;

    if (analysis.title && analysis.title !== 'Untitled Document') {confidence += 0.1;}
    if (analysis.parties && analysis.parties.length >= 2) {confidence += 0.1;}
    if (analysis.dates?.effectiveDate) {confidence += 0.1;}
    if (analysis.amounts && analysis.amounts.length > 0) {confidence += 0.1;}
    if (analysis.keyTerms && analysis.keyTerms.length > 5) {confidence += 0.05;}
    if (analysis.clauses && analysis.clauses.total > 0) {confidence += 0.05;}

    return Math.min(1, confidence);
  }

  // Extraction methods (keeping existing logic but adding database integration where needed)
  private extractTitle(content: string): string {
    const patterns = [
      /^([A-Z][A-Z\s]+)$/m,
      /(?:agreement|contract|memorandum|proposal)\s+(?:for|of|between)\s+(.+)/i,
      /^(.+?)\n={3,}/m,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {return match[1].trim();}
    }

    const lines = content.split('\n').filter(l => l.trim());
    return lines[0]?.substring(0, 100) || 'Untitled Document';
  }

  private extractParties(content: string): Party[] {
    // Validate input content
    if (!isContentAnalyzable(content)) {
      return [];
    }

    const parties: Party[] = [];
    const patterns = [
      /between\s+(.+?)\s+(?:\(|and|,)/gi,
      /party\s+(?:of\s+the\s+)?(?:first|second)\s+part[:\s]+(.+?)(?:\n|,)/gi,
      /(?:vendor|supplier|contractor|client|customer)[:\s]+(.+?)(?:\n|,)/gi,
    ];

    const matches = this.extractPatterns(content, patterns);

    for (const match of matches) {
      // Enforce extraction limit to prevent memory issues
      if (parties.length >= MAX_PARTIES) {
        break;
      }

      const cleaned = match.replace(/^(between|party.*?:|vendor:|supplier:|contractor:|client:|customer:)/i, '').trim();

      // Validate party name: must be non-empty and reasonable length
      if (cleaned && cleaned.length > 0 && cleaned.length <= 500 && !parties.some(p => p.name === cleaned)) {
        parties.push({
          name: cleaned,
          type: this.classifyPartyType(match),
          normalized: this.normalizePartyName(cleaned),
        });
      }
    }

    // Final validation pass using schema
    return validateAndFilterParties(parties);
  }

  private extractDates(content: string): ExtractedDates {
    // Default empty result
    const defaultDates: ExtractedDates = {
      effectiveDate: null,
      expirationDate: null,
      signedDate: null,
      otherDates: [],
    };

    // Validate input content
    if (!isContentAnalyzable(content)) {
      return defaultDates;
    }

    const dates: ExtractedDates = { ...defaultDates };

    const datePattern = /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|[A-Za-z]+\s+\d{1,2},?\s+\d{4})\b/g;
    const allDates = content.match(datePattern) || [];

    const effectivePattern = /effective\s+(?:date|as\s+of|from)[:\s]*([^\n]+)/i;
    const expirationPattern = /(?:expir|terminat|end)(?:es?|ing|ation)?\s+(?:date|on)[:\s]*([^\n]+)/i;
    const signedPattern = /(?:signed|executed)\s+(?:on|this)[:\s]*([^\n]+)/i;

    const effectiveMatch = content.match(effectivePattern);
    if (effectiveMatch) {
      const dateInContext = effectiveMatch[1].match(datePattern);
      if (dateInContext) {
        const parsed = this.parseDate(dateInContext[0]);
        // Validate parsed date is valid ISO format
        if (parsed && this.isValidIsoDate(parsed)) {
          dates.effectiveDate = parsed;
        }
      }
    }

    const expirationMatch = content.match(expirationPattern);
    if (expirationMatch) {
      const dateInContext = expirationMatch[1].match(datePattern);
      if (dateInContext) {
        const parsed = this.parseDate(dateInContext[0]);
        if (parsed && this.isValidIsoDate(parsed)) {
          dates.expirationDate = parsed;
        }
      }
    }

    const signedMatch = content.match(signedPattern);
    if (signedMatch) {
      const dateInContext = signedMatch[1].match(datePattern);
      if (dateInContext) {
        const parsed = this.parseDate(dateInContext[0]);
        if (parsed && this.isValidIsoDate(parsed)) {
          dates.signedDate = parsed;
        }
      }
    }

    // Extract and validate other dates with limit
    const MAX_OTHER_DATES = 100;
    dates.otherDates = allDates
      .slice(0, MAX_OTHER_DATES)
      .map(d => this.parseDate(d))
      .filter((d): d is string =>
        d !== null &&
        this.isValidIsoDate(d) &&
        d !== dates.effectiveDate &&
        d !== dates.expirationDate &&
        d !== dates.signedDate
      );

    return dates;
  }

  /**
   * Validate that a string is a valid ISO date format (YYYY-MM-DD)
   */
  private isValidIsoDate(dateStr: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return false;
    }
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }

  private extractAmounts(content: string): Amount[] {
    // Validate input content
    if (!isContentAnalyzable(content)) {
      return [];
    }

    const amounts: Amount[] = [];
    const patterns = [
      /\$\s*([0-9,]+(?:\.[0-9]{2})?)/g,
      /USD\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
      /([0-9,]+(?:\.[0-9]{2})?)\s*(?:dollars|usd)/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        // Enforce extraction limit to prevent memory issues
        if (amounts.length >= MAX_AMOUNTS) {
          break;
        }

        const value = parseFloat(match[1].replace(/,/g, ''));

        // Enhanced validation: check for NaN, Infinity, and positive value
        if (!isNaN(value) && isFinite(value) && value > 0) {
          const start = Math.max(0, match.index - 50);
          const end = Math.min(content.length, match.index + match[0].length + 50);
          const extractedContext = content.substring(start, end);

          amounts.push({
            value,
            currency: 'USD',
            formatted: match[0],
            context: extractedContext.trim(),
            type: this.classifyAmountType(extractedContext),
          });
        }
      }

      if (amounts.length >= MAX_AMOUNTS) {
        break;
      }
    }

    // Deduplicate amounts
    const unique = amounts.filter((amt, idx, arr) =>
      idx === arr.findIndex(a => a.value === amt.value && a.context === amt.context),
    );

    // Final validation pass using schema
    const validated = validateAndFilterAmounts(unique);

    return validated.sort((a, b) => b.value - a.value);
  }

  private extractKeyTerms(content: string): string[] {
    // Use enhanced NLP extraction for better keyword and phrase detection
    const terms: string[] = [];

    // Extract legal phrases using n-gram analysis
    const legalPhrases = extractLegalPhrases(content);
    terms.push(...legalPhrases);

    // Extract important keywords using TF-IDF-like scoring
    const keywords = extractKeywords(content, 15);
    terms.push(...keywords);

    // Also capture obligation patterns with regex for completeness
    const termPatterns = [
      /\b(?:shall|must|will|may|should)\s+(?:not\s+)?([a-z]+)/gi,
      /\b(?:obligation|requirement|responsibility|duty)\s+to\s+([a-z]+)/gi,
      /\b(?:warranty|guarantee|indemnif|liable|liability)/gi,
      /\b(?:confidential|proprietary|intellectual\s+property|trade\s+secret)/gi,
      /\b(?:force\s+majeure|termination|breach|default|remedy|remedies)/gi,
    ];

    for (const pattern of termPatterns) {
      const matches = content.match(pattern) || [];
      terms.push(...matches);
    }

    return [...new Set(terms.map(t => t.toLowerCase()))];
  }

  /**
   * Calculate document similarity using TF-IDF
   * Useful for detecting duplicate or similar contracts
   */
  calculateDocumentSimilarity(doc1: string, doc2: string): number {
    return quickTfIdfSimilarity(doc1, doc2);
  }

  private classifyContractType(content: string): string {
    const typeScores: Record<string, number> = {
      'service_agreement': 0,
      'purchase_order': 0,
      'nda': 0,
      'lease': 0,
      'employment': 0,
      'license': 0,
      'partnership': 0,
      'msa': 0,
      'sow': 0,
      'other': 0,
    };

    const typeKeywords = {
      service_agreement: ['service', 'services', 'deliverable', 'scope of work'],
      purchase_order: ['purchase', 'order', 'quantity', 'unit price', 'delivery'],
      nda: ['confidential', 'non-disclosure', 'proprietary', 'trade secret'],
      lease: ['lease', 'rent', 'tenant', 'landlord', 'premises'],
      employment: ['employment', 'employee', 'salary', 'benefits', 'position'],
      license: ['license', 'licensing', 'royalty', 'intellectual property'],
      partnership: ['partnership', 'joint venture', 'partner', 'profit sharing'],
      msa: ['master service agreement', 'master services agreement'],
      sow: ['statement of work', 'scope of work', 'deliverables', 'milestones'],
    };

    const lowerContent = content.toLowerCase();
    for (const [type, keywords] of Object.entries(typeKeywords)) {
      for (const keyword of keywords) {
        if (lowerContent.includes(keyword)) {
          typeScores[type as keyof typeof typeScores] += 1;
        }
      }
    }

    let maxScore = 0;
    let bestType = 'other';

    for (const [type, score] of Object.entries(typeScores)) {
      if (score > maxScore) {
        maxScore = score;
        bestType = type;
      }
    }

    return bestType;
  }

  // Vendor processing methods
  private normalizeVendorName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/,?\s*(inc|llc|ltd|corp|corporation|company|co)\.?$/i, '')
      .trim();
  }

  private normalizePartyName(name: string): string {
    return this.normalizeVendorName(name);
  }

  private categorizeVendor(data: VendorData): string {
    const name = (data.name || '').toLowerCase();
    const description = (data.description || '').toLowerCase();
    const category = data.category?.toLowerCase() || '';
    const combined = `${name} ${description} ${category}`;

    const categories = {
      'technology': ['software', 'hardware', 'tech', 'it', 'cloud', 'saas', 'digital', 'cyber'],
      'consulting': ['consult', 'advisory', 'strategy', 'management', 'professional services'],
      'legal': ['law', 'legal', 'attorney', 'counsel', 'litigation'],
      'financial': ['bank', 'finance', 'accounting', 'audit', 'tax', 'payroll'],
      'marketing': ['market', 'advertising', 'pr', 'creative', 'media', 'brand'],
      'facilities': ['facility', 'maintenance', 'cleaning', 'security', 'property', 'real estate'],
      'supplies': ['supply', 'supplier', 'equipment', 'material', 'office'],
      'logistics': ['shipping', 'freight', 'logistics', 'transport', 'delivery', 'courier'],
      'hr': ['human resources', 'hr', 'recruiting', 'staffing', 'benefits'],
      'healthcare': ['health', 'medical', 'wellness', 'insurance', 'benefits'],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => combined.includes(keyword))) {
        return category;
      }
    }

    return data.category || 'other';
  }

  private extractContactInfo(data: SecretaryDataBase): ContactInfo {
    const info: ContactInfo = {
      email: null,
      phone: null,
      address: null,
      website: null,
    };

    const text = JSON.stringify(data).toLowerCase();

    const emailMatch = text.match(/([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/);
    if (emailMatch) {info.email = emailMatch[1];}

    const phoneMatch = text.match(/(\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/);
    if (phoneMatch) {info.phone = phoneMatch[1];}

    const websiteMatch = text.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/);
    if (websiteMatch) {info.website = websiteMatch[1];}

    return info;
  }

  private extractIdentifiers(data: SecretaryDataBase): VendorIdentifiers {
    return {
      taxId: this.extractPattern(data, /\b\d{2}-\d{7}\b/),
      duns: this.extractPattern(data, /\b\d{9}\b/),
      vendorId: null,
      registrationNumber: this.extractPattern(data, /registration\s*#?\s*:?\s*([A-Z0-9-]+)/i),
    };
  }

  private assessVendorRisk(data: SecretaryDataBase): string[] {
    const risks: string[] = [];
    const text = JSON.stringify(data).toLowerCase();

    if (text.includes('bankrupt') || text.includes('insolvent')) {
      risks.push('financial_instability');
    }
    if (text.includes('lawsuit') || text.includes('litigation')) {
      risks.push('legal_issues');
    }
    if (text.includes('breach') || text.includes('violation')) {
      risks.push('compliance_concerns');
    }
    if (!text.includes('insurance')) {
      risks.push('missing_insurance');
    }
    if (text.includes('sanction') || text.includes('embargo')) {
      risks.push('sanctions_risk');
    }
    if (text.includes('cyber') && text.includes('incident')) {
      risks.push('cybersecurity_incident');
    }

    return risks;
  }

  // Document processing methods
  private generateSummary(text: string): string {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];

    if (sentences.length <= 3) {
      return sentences.join(' ').trim();
    }

    const keySentences = [sentences[0]];
    const keyTerms = ['important', 'critical', 'must', 'shall', 'require', 'obligation', 'key', 'essential'];

    for (const sentence of sentences.slice(1)) {
      if (keyTerms.some(term => sentence.toLowerCase().includes(term))) {
        keySentences.push(sentence);
        if (keySentences.length >= 3) {break;}
      }
    }

    return keySentences.join(' ').trim().substring(0, 500);
  }

  private extractEntities(text: string): ExtractedEntities {
    const entities: ExtractedEntities = {
      organizations: [],
      people: [],
      locations: [],
      dates: [],
      emails: [],
      phones: [],
    };

    // Organizations
    const orgPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Inc|LLC|Ltd|Corp|Corporation|Company|Group|Services|Solutions)\b/g;
    let match;
    while ((match = orgPattern.exec(text)) !== null) {
      entities.organizations.push(match[0]);
    }

    // People
    const peoplePattern = /\b(?:Mr|Mrs|Ms|Dr|Prof)\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
    while ((match = peoplePattern.exec(text)) !== null) {
      entities.people.push(match[0]);
    }

    // Locations
    const locationPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s+([A-Z]{2})\b/g;
    while ((match = locationPattern.exec(text)) !== null) {
      entities.locations.push(match[0]);
    }

    // Dates
    const datePattern = /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|[A-Za-z]+\s+\d{1,2},?\s+\d{4})\b/g;
    entities.dates = text.match(datePattern) || [];

    // Emails
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    entities.emails = text.match(emailPattern) || [];

    // Phones
    const phonePattern = /\b\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g;
    entities.phones = text.match(phonePattern) || [];

    // Deduplicate
    for (const key in entities) {
      entities[key as keyof typeof entities] = [...new Set(entities[key as keyof typeof entities])];
    }

    return entities;
  }

  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    const stopWords = new Set([
      'this', 'that', 'these', 'those', 'with', 'from', 'have', 'been',
      'will', 'shall', 'must', 'into', 'onto', 'upon', 'over', 'under',
      'about', 'after', 'before', 'between', 'through', 'during', 'without',
    ]);

    const wordFreq: Record<string, number> = {};

    for (const word of words) {
      if (!stopWords.has(word)) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    }

    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word]) => word);
  }

  private analyzeSentiment(text: string): SentimentAnalysis {
    const positiveWords = [
      'good', 'great', 'excellent', 'positive', 'beneficial', 'advantage',
      'success', 'agree', 'approve', 'favorable', 'optimal', 'effective',
    ];
    const negativeWords = [
      'bad', 'poor', 'negative', 'issue', 'problem', 'risk', 'concern',
      'fail', 'breach', 'terminate', 'penalty', 'liable', 'dispute',
    ];

    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
      if (positiveWords.includes(word)) {positiveCount++;}
      if (negativeWords.includes(word)) {negativeCount++;}
    }

    const total = positiveCount + negativeCount || 1;
    const score = (positiveCount - negativeCount) / total;

    return {
      score,
      label: score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral',
      positive: positiveCount,
      negative: negativeCount,
    };
  }

  private classifyDocument(text: string): string {
    // const types = ['contract', 'invoice', 'proposal', 'report', 'memo', 'letter', 'policy', 'certificate', 'other']; // Removed unused variable
    const typeKeywords: Record<string, string[]> = {
      contract: ['agreement', 'contract', 'terms and conditions', 'whereas', 'party', 'parties'],
      invoice: ['invoice', 'bill', 'payment due', 'amount due', 'remittance'],
      proposal: ['proposal', 'propose', 'quotation', 'offer', 'bid'],
      report: ['report', 'analysis', 'findings', 'summary', 'conclusion'],
      memo: ['memorandum', 'memo', 'internal', 'staff', 'subject:'],
      letter: ['dear', 'sincerely', 'regards', 'letter', 'yours'],
      policy: ['policy', 'procedure', 'guideline', 'standard', 'compliance'],
      certificate: ['certificate', 'certify', 'certification', 'attest'],
    };

    const lowerText = text.toLowerCase();
    const scores: Record<string, number> = {};

    for (const [type, keywords] of Object.entries(typeKeywords)) {
      scores[type] = 0;
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          scores[type]++;
        }
      }
    }

    let maxScore = 0;
    let bestType = 'other';

    for (const [type, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestType = type;
      }
    }

    return bestType;
  }

  // Utility methods
  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private countParagraphs(text: string): number {
    return text.split(/\n\s*\n/).filter(para => para.trim().length > 0).length;
  }

  private detectSignatures(content: string): boolean {
    const signaturePatterns = [
      /_{10,}/,
      /\[signature\]/i,
      /sign(ed|ature).*?:.*?_{5,}/i,
      /by:.*?_{5,}/i,
      /\/s\//,
      /executed.*?by/i,
    ];

    return signaturePatterns.some(pattern => pattern.test(content));
  }

  /**
   * Detect encoding issues (mojibake) in content.
   * Identifies common patterns of garbled text from incorrect encoding handling.
   * @param content - The text to check for encoding issues
   * @returns true if encoding issues are detected
   */
  private detectEncodingIssues(content: string): boolean {
    // Check for common mojibake patterns:
    // - Unicode replacement character (U+FFFD) sequences
    // - UTF-8 multi-byte decoded as Latin-1 (Ã followed by another character)
    // - Multiple high Latin-1 characters in sequence (Â, Ã patterns)
    const mojibakePattern = /[\uFFFD]{2,}|(?:\u00C3[\u0080-\u00BF]){3,}|(?:\u00C2[\u0080-\u00BF]){3,}/;
    return mojibakePattern.test(content);
  }

  private assessComplexity(content: string): string {
    const words = this.countWords(content);
    const sentences = (content.match(/[.!?]+/g) || []).length;
    const avgWordsPerSentence = sentences > 0 ? words / sentences : 0;

    if (avgWordsPerSentence > 25 || words > 10000) {return 'high';}
    if (avgWordsPerSentence > 15 || words > 5000) {return 'medium';}
    return 'low';
  }

  private calculateReadability(text: string): number {
    const words = text.split(/\s+/).length;
    const sentences = (text.match(/[.!?]+/g) || []).length || 1;
    const syllables = text.split(/\s+/).reduce((count, word) => {
      return count + Math.max(1, word.replace(/[^aeiou]/gi, '').length);
    }, 0);

    const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
    return Math.max(0, Math.min(100, score));
  }

  private parseDate(dateStr: string): string | null {
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch {
      // Invalid date
    }
    return null;
  }

  private classifyPartyType(context: string): string {
    const lower = context.toLowerCase();
    if (lower.includes('vendor') || lower.includes('supplier')) {return 'vendor';}
    if (lower.includes('client') || lower.includes('customer')) {return 'client';}
    if (lower.includes('contractor')) {return 'contractor';}
    if (lower.includes('first part')) {return 'primary';}
    if (lower.includes('second part')) {return 'secondary';}
    return 'party';
  }

  private classifyAmountType(context: string): string {
    const lower = context.toLowerCase();
    if (lower.includes('total') || lower.includes('sum')) {return 'total';}
    if (lower.includes('payment') || lower.includes('installment')) {return 'payment';}
    if (lower.includes('fee')) {return 'fee';}
    if (lower.includes('penalty')) {return 'penalty';}
    if (lower.includes('deposit')) {return 'deposit';}
    if (lower.includes('annual') || lower.includes('yearly')) {return 'annual';}
    if (lower.includes('monthly')) {return 'monthly';}
    return 'amount';
  }

  private extractPattern(data: SecretaryDataBase, pattern: RegExp): string | null {
    const text = JSON.stringify(data);
    const match = text.match(pattern);
    return match ? match[0] : null;
  }

  // New method to process documents using the database workflow function
  private async processDocumentWithWorkflow(
    documentId: string,
    workflowType: string,
    context: SecretaryContext,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult> {
    rulesApplied.push('document_workflow_processing');

    try {
      // Execute the document workflow using the database function
      const workflowResult = await this.callDatabaseFunction('process_document_workflow', {
        p_document_id: documentId,
        p_workflow_type: workflowType,
        p_user_id: context.userId || null,
      }) as WorkflowResult;

      // Process workflow results
      const analysis: WorkflowAnalysis = {
        workflowId: workflowResult.workflow_id,
        workflowType: workflowResult.workflow_type,
        documentId: workflowResult.document_id,
        stepsCompleted: workflowResult.steps_completed,
        totalSteps: workflowResult.total_steps,
        status: workflowResult.status,
        completedAt: workflowResult.completed_at,
        details: await this.extractWorkflowDetails(workflowResult, documentId),
      };

      // Generate insights based on workflow completion
      if (analysis.status === 'completed' && analysis.stepsCompleted === analysis.totalSteps) {
        insights.push(this.createInsight(
          'workflow_completed',
          'low',
          'Document Workflow Completed',
          `Successfully completed ${workflowType} workflow with ${analysis.totalSteps} steps`,
          undefined,
          { workflowId: analysis.workflowId },
          false,
        ));
      }

      // Check if this is a contract onboarding workflow
      if (workflowType === 'contract_onboarding') {
        // The workflow includes approval routing, so check if approvals are needed
        const { data: approvals } = await this.supabase
          .from('contract_approvals')
          .select('*')
          .eq('contract_id', documentId)
          .eq('status', 'pending');

        if (approvals && approvals.length > 0) {
          insights.push(this.createInsight(
            'approval_required',
            'high',
            'Contract Requires Approval',
            `${approvals.length} approval(s) pending for this contract`,
            'Approvers have been notified',
            { approvals: approvals.map((a: { approval_type: string }) => a.approval_type) },
          ));
          rulesApplied.push('approval_routing');
        }
      }

      // For vendor verification workflow, check risk assessment results
      if (workflowType === 'vendor_verification') {
        insights.push(this.createInsight(
          'vendor_verification_complete',
          'medium',
          'Vendor Verification Completed',
          'Background checks and risk assessment have been performed',
          'Review verification results before proceeding',
          { workflowId: analysis.workflowId },
        ));
      }

      return this.createResult(
        true,
        analysis,
        insights,
        rulesApplied,
        0.9,
        {
          documentId,
          workflowCompleted: true,
          workflowType,
        },
      );

    } catch (error) {
      console.error('Document workflow processing failed:', error);

      insights.push(this.createInsight(
        'workflow_failed',
        'high',
        'Document Workflow Failed',
        `Failed to process ${workflowType} workflow: ${error instanceof Error ? error.message : String(error)}`,
        'Retry workflow or process manually',
        { error: error instanceof Error ? error.message : String(error) },
      ));

      return this.createResult(
        false,
        undefined,
        insights,
        rulesApplied,
        0,
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  private async extractWorkflowDetails(_workflowResult: WorkflowResult, documentId: string): Promise<WorkflowDetails> {
    // Extract additional details from workflow execution
    const details: WorkflowDetails = {
      extractedFields: 0,
      validationPassed: false,
      complianceChecked: false,
      aiAnalysisComplete: false,
    };

    // Get document metadata that may have been updated by the workflow
    const { data: document } = await this.supabase
      .from('documents')
      .select('metadata, extracted_text')
      .eq('id', documentId)
      .single();

    if (document) {
      details.hasExtractedText = Boolean(document.extracted_text);
      details.metadataEnriched = Object.keys(document.metadata || {}).length > 0;
    }

    // Check for any insights generated during workflow
    const { data: workflowInsights } = await this.supabase
      .from('agent_insights')
      .select('*')
      .eq('entity_id', documentId)
      .eq('entity_type', 'document')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Last 5 minutes

    details.insightsGenerated = workflowInsights?.length || 0;

    return details;
  }
}