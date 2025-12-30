import { BaseAgent, ProcessingResult, Insight, AgentContext } from './base.ts';
import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  levenshteinSimilarity,
  findBestMatch,
  extractKeywords,
  jaccardSimilarity,
} from '../utils/nlp.ts';

interface DataQualityContext extends AgentContext {
  taskType?: 'validate' | 'clean' | 'profile' | 'standardize' | 'enrich' | 'deduplicate' | 'quality_assessment';
}

interface DataQualityData {
  validate?: {
    records: Record<string, unknown>[];
    schema?: Record<string, unknown>;
    type: string;
  };
  clean?: {
    records: Record<string, unknown>[];
    options?: {
      trimWhitespace?: boolean;
      removeEmpty?: boolean;
      standardizeFormats?: boolean;
    };
  };
  profile?: {
    records: Record<string, unknown>[];
  };
  standardize?: {
    records: Record<string, unknown>[];
    type: string;
  };
  enrich?: {
    records: Record<string, unknown>[];
    enrichmentType: string;
  };
  deduplicate?: {
    records: Record<string, unknown>[];
    matchFields: string[];
    threshold?: number;
  };
  records?: Record<string, unknown>[];
  type?: string;
}

interface RuleConfig {
  min?: number;
  max?: number;
  pattern?: string | RegExp;
  allowedValues?: unknown[];
  customValidator?: string;
  validator?: ((value: unknown) => boolean) | ((record: Record<string, unknown>) => boolean);
  referenceTable?: string;
  referenceField?: string;
}

interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'range' | 'length' | 'custom' | 'reference';
  config: RuleConfig;
  severity: 'error' | 'warning' | 'info';
  message?: string;
}

interface DataQualityCheck {
  name: string;
  description: string;
  rules: ValidationRule[];
  enabled: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: DataSuggestion[];
  metrics: QualityMetrics;
}

interface ValidationError {
  field: string;
  value: unknown;
  rule: string;
  message: string;
  severity: 'error';
}

interface ValidationWarning {
  field: string;
  value: unknown;
  rule: string;
  message: string;
  severity: 'warning';
}

interface DataSuggestion {
  field: string;
  type: 'standardization' | 'enrichment' | 'correction';
  suggestion: string;
  confidence: number;
}

interface QualityMetrics {
  totalFields: number;
  validFields: number;
  errorCount: number;
  warningCount: number;
  completeness: number;
  accuracy: number;
  consistency: number;
  uniqueness: number;
}

interface DataQualityIssue {
  type?: string;
  severity?: string;
  field?: string;
  description?: string;
  affectedRecords?: number;
  issue?: string;
  percentage?: number;
  value?: unknown;
}

interface DataProfileSchema {
  [field: string]: {
    type: string;
    nullable: boolean;
    unique: boolean;
  };
}

interface DataProfile {
  schema: DataProfileSchema;
  statistics: {
    recordCount: number;
    fieldCount: number;
    nullCounts: Record<string, number>;
    uniqueCounts: Record<string, number>;
    dataTypes: Record<string, string>;
  };
  qualityScore: number;
  issues: DataQualityIssue[];
}

interface QualityCheckResult {
  score?: number;
  issues?: DataQualityIssue[];
  completeness?: number;
  accuracy?: number;
  consistency?: number;
  warnings: ValidationWarning[];
  suggestions: DataSuggestion[];
}

export class DataQualityAgent extends BaseAgent {
  private validationSchemas: Map<string, z.ZodSchema> = new Map();
  private qualityChecks: Map<string, DataQualityCheck> = new Map();

  constructor(supabase: SupabaseClient, enterpriseId: string) {
    super(supabase, enterpriseId, 'data-quality');
    this.initializeSchemas();
    this.initializeQualityChecks();
  }

  get agentType(): string {
    return 'data-quality';
  }

  get capabilities(): string[] {
    return ['data_validation', 'quality_assessment', 'anomaly_detection', 'data_cleansing'];
  }

  private initializeSchemas() {
    // Contract validation schema
    this.validationSchemas.set('contract', z.object({
      contract_number: z.string().min(1).regex(/^[A-Z]{2,}-\d{3,}$/),
      title: z.string().min(5).max(200),
      vendor_id: z.string().uuid(),
      start_date: z.string().datetime(),
      end_date: z.string().datetime(),
      total_value: z.number().positive(),
      currency: z.string().length(3),
      status: z.enum(['draft', 'pending', 'active', 'expired', 'terminated']),
      payment_terms: z.string().optional(),
      renewal_terms: z.string().optional(),
      termination_clause: z.string().optional(),
    }));

    // Vendor validation schema
    this.validationSchemas.set('vendor', z.object({
      name: z.string().min(2).max(100),
      tax_id: z.string().optional(),
      address: z.object({
        street: z.string(),
        city: z.string(),
        state: z.string().optional(),
        country: z.string(),
        postal_code: z.string(),
      }).optional(),
      contact_info: z.object({
        email: z.string().email(),
        phone: z.string().optional(),
        website: z.string().url().optional(),
      }),
      category: z.string(),
      status: z.enum(['active', 'inactive', 'suspended', 'pending']),
    }));

    // Financial data validation schema
    this.validationSchemas.set('financial', z.object({
      amount: z.number().finite(),
      currency: z.string().length(3),
      date: z.string().datetime(),
      type: z.enum(['invoice', 'payment', 'credit', 'debit']),
      reference: z.string().min(1),
      account: z.string().optional(),
      tax_rate: z.number().min(0).max(100).optional(),
      description: z.string().optional(),
    }));

    // User validation schema
    this.validationSchemas.set('user', z.object({
      email: z.string().email(),
      first_name: z.string().min(1).max(50),
      last_name: z.string().min(1).max(50),
      role: z.enum(['viewer', 'user', 'manager', 'admin', 'owner']),
      department: z.string().optional(),
      phone: z.string().optional(),
    }));
  }

  private initializeQualityChecks() {
    // Contract quality checks
    this.qualityChecks.set('contract_quality', {
      name: 'Contract Data Quality',
      description: 'Comprehensive quality checks for contract data',
      enabled: true,
      rules: [
        {
          field: 'contract_number',
          type: 'format',
          config: { pattern: /^[A-Z]{2,}-\d{3,}$/ },
          severity: 'error',
          message: 'Contract number must follow format: XX-123',
        },
        {
          field: 'end_date',
          type: 'custom',
          config: { validator: this.validateDateRange.bind(this) },
          severity: 'error',
          message: 'End date must be after start date',
        },
        {
          field: 'total_value',
          type: 'range',
          config: { min: 0, max: 1000000000 },
          severity: 'warning',
          message: 'Contract value seems unusually high',
        },
      ],
    });

    // Vendor quality checks
    this.qualityChecks.set('vendor_quality', {
      name: 'Vendor Data Quality',
      description: 'Quality checks for vendor information',
      enabled: true,
      rules: [
        {
          field: 'tax_id',
          type: 'format',
          config: { validator: this.validateTaxId.bind(this) },
          severity: 'warning',
          message: 'Tax ID format may be invalid',
        },
        {
          field: 'contact_info.email',
          type: 'format',
          config: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
          severity: 'error',
          message: 'Invalid email format',
        },
      ],
    });
  }

  async process(data: unknown, context?: AgentContext): Promise<ProcessingResult> {
    const dataQualityData = data as DataQualityData;
    const taskType = (context as DataQualityContext | undefined)?.taskType || this.inferTaskType(dataQualityData);
    const insights: Insight[] = [];
    const rulesApplied: string[] = [];

    try {
      let result: ValidationResult | DataProfile | unknown;
      let confidence = 0.85;

      switch (taskType) {
        case 'validate':
          result = await this.validateData(dataQualityData, insights, rulesApplied);
          break;

        case 'clean':
          result = await this.cleanData(dataQualityData, insights, rulesApplied);
          break;

        case 'profile':
          result = await this.profileData(dataQualityData, insights, rulesApplied);
          break;

        case 'standardize':
          result = await this.standardizeData(dataQualityData, insights, rulesApplied);
          break;

        case 'enrich':
          result = await this.enrichData(dataQualityData, insights, rulesApplied);
          confidence = 0.9;
          break;

        case 'deduplicate':
          result = await this.deduplicateData(dataQualityData, insights, rulesApplied);
          break;

        case 'quality_assessment':
          result = await this.assessDataQuality(dataQualityData, insights, rulesApplied);
          confidence = 0.95;
          break;

        default:
          throw new Error(`Unsupported data quality task type: ${taskType}`);
      }

      return this.createResult(true, { result }, insights, rulesApplied, confidence);
    } catch (error) {
      return this.createResult(
        false,
        undefined,
        insights,
        rulesApplied,
        0.0,
        { error: `Data quality check failed: ${error instanceof Error ? error.message : String(error)}` },
      );
    }
  }

  private inferTaskType(data: DataQualityData): string {
    if (data.validate) {return 'validate';}
    if (data.clean) {return 'clean';}
    if (data.profile) {return 'profile';}
    if (data.standardize) {return 'standardize';}
    if (data.enrich) {return 'enrich';}
    if (data.deduplicate) {return 'deduplicate';}
    return 'quality_assessment';
  }

  private async validateData(
    data: DataQualityData,
    insights: Insight[],
    rulesApplied: string[],
  ): Promise<ValidationResult> {
    rulesApplied.push('data_validation');

    if (!data.validate) {
      throw new Error('No validation data provided');
    }

    const { records, schema, type } = data.validate;
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: DataSuggestion[] = [];

    // Use predefined schema if available
    let validationSchema = this.validationSchemas.get(type);
    if (!validationSchema && schema) {
      // Create schema from provided configuration
      validationSchema = this.createSchemaFromConfig(schema);
    }

    if (!validationSchema) {
      throw new Error(`No validation schema found for type: ${type}`);
    }

    // Validate each record
    let validCount = 0;
    let totalFields = 0;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      try {
        validationSchema.parse(record);
        validCount++;

        // Check for data quality issues even in valid records
        const qualityIssues = this.checkDataQuality(record, type);
        warnings.push(...qualityIssues.warnings);
        suggestions.push(...qualityIssues.suggestions);

      } catch (error) {
        if (error instanceof z.ZodError) {
          (error as z.ZodError).errors.forEach(err => {
            errors.push({
              field: err.path.join('.'),
              value: record[err.path[0]],
              rule: err.code,
              message: err.message,
              severity: 'error',
            });
          });
        }
      }

      // Count fields
      totalFields += Object.keys(record).length;
    }

    // Calculate metrics
    const metrics = this.calculateQualityMetrics(records, errors, warnings);

    // Add insights based on validation results
    if (errors.length > 0) {
      insights.push(this.createInsight(
        'validation_errors_found',
        'high',
        'Validation Errors Found',
        `Found ${errors.length} validation errors in ${records.length} records`,
        undefined,
        { errorCount: errors.length, errorTypes: this.groupErrorsByType(errors) },
        true,
      ));
    }

    if (metrics.completeness < 0.8) {
      insights.push(this.createInsight(
        'low_data_completeness',
        'medium',
        'Low Data Completeness',
        `Data completeness is ${(metrics.completeness * 100).toFixed(1)}%`,
        undefined,
        { completeness: metrics.completeness },
        true,
      ));
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      metrics,
    };
  }

  private async cleanData(
    data: DataQualityData,
    insights: Insight[],
    rulesApplied: string[],
  ): Promise<{
    records: Record<string, unknown>[];
    originalCount: number;
    cleanedCount: number;
    modifications: number;
  }> {
    rulesApplied.push('data_cleaning');

    if (!data.clean) {
      throw new Error('No clean data provided');
    }

    const { records, options } = data.clean;
    const cleanedRecords: Record<string, unknown>[] = [];
    let modificationsCount = 0;

    for (const record of records) {
      const cleaned: Record<string, unknown> = { ...record };

      // Trim whitespace
      if (options?.trimWhitespace !== false) {
        Object.keys(cleaned).forEach((key: string) => {
          const value = cleaned[key];
          if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed !== value) {
              cleaned[key] = trimmed;
              modificationsCount++;
            }
          }
        });
      }

      // Remove empty fields
      if (options?.removeEmpty) {
        Object.keys(cleaned).forEach((key: string) => {
          if (cleaned[key] === '' || cleaned[key] === null) {
            delete cleaned[key];
            modificationsCount++;
          }
        });
      }

      // Standardize formats
      if (options?.standardizeFormats) {
        // Standardize dates
        Object.keys(cleaned).forEach((key: string) => {
          const value = cleaned[key];
          if (key.includes('date') && value && typeof value === 'string') {
            cleaned[key] = this.standardizeDate(value);
          }
        });

        // Standardize phone numbers
        const phoneValue = cleaned.phone;
        if (phoneValue && typeof phoneValue === 'string') {
          cleaned.phone = this.standardizePhone(phoneValue);
        }

        // Standardize emails
        const emailValue = cleaned.email;
        if (emailValue && typeof emailValue === 'string') {
          cleaned.email = emailValue.toLowerCase();
        }
      }

      cleanedRecords.push(cleaned);
    }

    insights.push(this.createInsight(
      'data_cleaned',
      'low',
      'Data Cleaned',
      `Cleaned ${records.length} records with ${modificationsCount} modifications`,
      undefined,
      { recordCount: records.length, modifications: modificationsCount },
      false,
    ));

    return {
      records: cleanedRecords,
      originalCount: records.length,
      cleanedCount: cleanedRecords.length,
      modifications: modificationsCount,
    };
  }

  private async profileData(
    data: DataQualityData,
    insights: Insight[],
    rulesApplied: string[],
  ): Promise<DataProfile> {
    rulesApplied.push('data_profiling');

    if (!data.profile) {
      throw new Error('No profile data provided');
    }

    const { records } = data.profile;
    const profile: DataProfile = {
      schema: {},
      statistics: {
        recordCount: records.length,
        fieldCount: 0,
        nullCounts: {},
        uniqueCounts: {},
        dataTypes: {},
      },
      qualityScore: 0,
      issues: [],
    };

    if (records.length === 0) {
      return profile;
    }

    // Analyze schema
    const firstRecord = records[0];
    const fields = Object.keys(firstRecord);
    profile.statistics.fieldCount = fields.length;

    fields.forEach((field: string) => {
      // Determine data type
      const values = records.map((r: Record<string, unknown>) => r[field]).filter((v: unknown) => v != null);
      const inferredType = this.inferDataType(values);
      profile.schema[field] = {
        type: inferredType,
        nullable: values.length < records.length,
        unique: new Set(values).size === values.length,
      };

      // Calculate statistics
      profile.statistics.nullCounts[field] = records.length - values.length;
      profile.statistics.uniqueCounts[field] = new Set(values).size;
      profile.statistics.dataTypes[field] = inferredType;

      // Check for quality issues
      if (profile.statistics.nullCounts[field] > records.length * 0.5) {
        profile.issues.push({
          field,
          issue: 'high_null_rate',
          percentage: (profile.statistics.nullCounts[field] / records.length) * 100,
        });
      }

      if (profile.statistics.uniqueCounts[field] === 1 && values.length > 1) {
        profile.issues.push({
          field,
          issue: 'no_variation',
          value: values[0],
        });
      }
    });

    // Calculate quality score
    profile.qualityScore = this.calculateOverallQualityScore(profile);

    // Add insights
    if (profile.qualityScore < 0.7) {
      insights.push(this.createInsight(
        'low_data_quality_score',
        'high',
        'Low Data Quality Score',
        `Overall data quality score is ${(profile.qualityScore * 100).toFixed(1)}%`,
        undefined,
        { score: profile.qualityScore, issues: profile.issues },
        true,
      ));
    }

    return profile;
  }

  private async standardizeData(
    data: DataQualityData,
    insights: Insight[],
    rulesApplied: string[],
  ): Promise<{
    records: Record<string, unknown>[];
    transformations: Record<string, number>;
    totalTransformations: number;
  }> {
    rulesApplied.push('data_standardization');

    if (!data.standardize) {
      throw new Error('No standardize data provided');
    }

    const { records, type } = data.standardize;
    const standardizedRecords: Record<string, unknown>[] = [];
    const transformations = {
      addresses: 0,
      names: 0,
      dates: 0,
      currencies: 0,
    };

    for (const record of records) {
      const standardized: Record<string, unknown> = { ...record };

      // Standardize based on data type
      switch (type) {
        case 'contract':
          // Standardize contract number
          if (standardized.contract_number && typeof standardized.contract_number === 'string') {
            standardized.contract_number = standardized.contract_number.toUpperCase();
          }
          // Standardize currency
          if (standardized.currency && typeof standardized.currency === 'string') {
            standardized.currency = standardized.currency.toUpperCase();
            transformations.currencies++;
          }
          // Standardize dates
          ['start_date', 'end_date'].forEach((field: string) => {
            const fieldValue = standardized[field];
            if (fieldValue && typeof fieldValue === 'string') {
              standardized[field] = this.standardizeDate(fieldValue);
              transformations.dates++;
            }
          });
          break;

        case 'vendor':
          // Standardize company name
          if (standardized.name && typeof standardized.name === 'string') {
            standardized.name = this.standardizeCompanyName(standardized.name);
            transformations.names++;
          }
          // Standardize address
          if (standardized.address && typeof standardized.address === 'object' && standardized.address !== null) {
            standardized.address = this.standardizeAddress(standardized.address as Record<string, unknown>);
            transformations.addresses++;
          }
          break;

        case 'user':
          // Standardize names
          ['first_name', 'last_name'].forEach((field: string) => {
            const fieldValue = standardized[field];
            if (fieldValue && typeof fieldValue === 'string') {
              standardized[field] = this.standardizeName(fieldValue);
              transformations.names++;
            }
          });
          // Standardize email
          if (standardized.email && typeof standardized.email === 'string') {
            standardized.email = standardized.email.toLowerCase().trim();
          }
          break;
      }

      standardizedRecords.push(standardized);
    }

    const totalTransformations = Object.values(transformations).reduce((a, b) => a + b, 0);

    insights.push(this.createInsight(
      'data_standardized',
      'low',
      'Data Standardized',
      `Standardized ${standardizedRecords.length} records with ${totalTransformations} transformations`,
      undefined,
      transformations,
      false,
    ));

    return {
      records: standardizedRecords,
      transformations,
      totalTransformations,
    };
  }

  private async enrichData(
    data: DataQualityData,
    insights: Insight[],
    rulesApplied: string[],
  ): Promise<{
    records: Record<string, unknown>[];
    enrichmentCount: number;
    enrichmentType: string;
  }> {
    rulesApplied.push('data_enrichment');

    if (!data.enrich) {
      throw new Error('No enrich data provided');
    }

    const { records, enrichmentType } = data.enrich;
    const enrichedRecords: Record<string, unknown>[] = [];
    let enrichmentCount = 0;

    for (const record of records) {
      const enriched: Record<string, unknown> = { ...record };

      switch (enrichmentType) {
        case 'vendor':
          // Enrich vendor data
          if (enriched.name && typeof enriched.name === 'string' && !enriched.industry) {
            enriched.industry = this.inferIndustry(enriched.name);
            if (enriched.industry) {enrichmentCount++;}
          }
          if (enriched.address && typeof enriched.address === 'object' && enriched.address !== null && !enriched.region) {
            enriched.region = this.inferRegion(enriched.address as Record<string, unknown>);
            if (enriched.region) {enrichmentCount++;}
          }
          break;

        case 'contract':
          // Enrich contract data
          if (!enriched.risk_level) {
            enriched.risk_level = this.inferRiskLevel(enriched);
            enrichmentCount++;
          }
          if (!enriched.category && enriched.title && typeof enriched.title === 'string') {
            enriched.category = this.inferContractCategory(enriched.title);
            if (enriched.category) {enrichmentCount++;}
          }
          break;

        case 'financial':
          // Enrich financial data
          if (enriched.currency && typeof enriched.currency === 'string' &&
              enriched.amount && typeof enriched.amount === 'number' &&
              !enriched.amount_usd) {
            enriched.amount_usd = await this.convertToUSD(enriched.amount, enriched.currency);
            if (enriched.amount_usd) {enrichmentCount++;}
          }
          break;
      }

      // Add metadata
      enriched._enriched = true;
      enriched._enrichment_date = new Date().toISOString();

      enrichedRecords.push(enriched);
    }

    insights.push(this.createInsight(
      'data_enriched',
      'low',
      'Data Enriched',
      `Enriched ${enrichedRecords.length} records with ${enrichmentCount} new data points`,
      undefined,
      { recordCount: enrichedRecords.length, enrichments: enrichmentCount },
      false,
    ));

    return {
      records: enrichedRecords,
      enrichmentCount,
      enrichmentType,
    };
  }

  private async deduplicateData(
    data: DataQualityData,
    insights: Insight[],
    rulesApplied: string[],
  ): Promise<{
    records: Record<string, unknown>[];
    originalCount: number;
    finalCount: number;
    duplicatesRemoved: number;
    duplicateGroups: Array<{
      master: Record<string, unknown>;
      duplicates: Record<string, unknown>[];
      similarity: number;
    }>;
  }> {
    rulesApplied.push('data_deduplication');

    if (!data.deduplicate) {
      throw new Error('No deduplicate data provided');
    }

    const { records, matchFields, threshold = 0.9 } = data.deduplicate;
    const duplicateGroups: Array<{
      master: Record<string, unknown>;
      duplicates: Record<string, unknown>[];
      similarity: number;
    }> = [];
    const uniqueRecords: Record<string, unknown>[] = [];
    const processedIndices = new Set<number>();

    for (let i = 0; i < records.length; i++) {
      if (processedIndices.has(i)) {continue;}

      const record = records[i];
      const group = [record];
      processedIndices.add(i);

      // Find duplicates
      for (let j = i + 1; j < records.length; j++) {
        if (processedIndices.has(j)) {continue;}

        const similarity = this.calculateRecordSimilarity(record, records[j], matchFields);
        if (similarity >= threshold) {
          group.push(records[j]);
          processedIndices.add(j);
        }
      }

      if (group.length > 1) {
        duplicateGroups.push({
          master: this.selectMasterRecord(group),
          duplicates: group,
          similarity: this.calculateGroupSimilarity(group, matchFields),
        });
      } else {
        uniqueRecords.push(record);
      }
    }

    // Merge duplicate groups into master records
    const mergedRecords = duplicateGroups.map(group => group.master);
    const finalRecords = [...uniqueRecords, ...mergedRecords];

    const duplicatesFound = records.length - finalRecords.length;

    if (duplicatesFound > 0) {
      insights.push(this.createInsight(
        'duplicates_found',
        'medium',
        'Duplicates Found',
        `Found and merged ${duplicatesFound} duplicate records`,
        undefined,
        {
          originalCount: records.length,
          finalCount: finalRecords.length,
          duplicateGroups: duplicateGroups.length,
        },
        true,
      ));
    }

    return {
      records: finalRecords,
      originalCount: records.length,
      finalCount: finalRecords.length,
      duplicatesRemoved: duplicatesFound,
      duplicateGroups,
    };
  }

  private async assessDataQuality(
    data: DataQualityData,
    insights: Insight[],
    rulesApplied: string[],
  ): Promise<{
    overallScore: number;
    dimensions: Record<string, number>;
    validation: ValidationResult;
    profile: DataProfile;
    recommendations: string[];
  }> {
    rulesApplied.push('quality_assessment');

    if (!data.records || !data.type) {
      throw new Error('No records or type provided for quality assessment');
    }

    const { records, type } = data;

    // Run all quality checks
    const validationResult = await this.validateData(
      { validate: { records, type } },
      [],
      [],
    );

    const profile = await this.profileData(
      { profile: { records } },
      [],
      [],
    );

    // Calculate dimension scores
    const dimensions = {
      completeness: validationResult.metrics.completeness,
      accuracy: validationResult.metrics.accuracy,
      consistency: validationResult.metrics.consistency,
      uniqueness: validationResult.metrics.uniqueness,
      validity: validationResult.errors.length === 0 ? 1 :
        1 - (validationResult.errors.length / (records.length * profile.statistics.fieldCount)),
      timeliness: this.assessTimeliness(records),
    };

    // Calculate overall quality score
    const overallScore = Object.values(dimensions).reduce((a, b) => a + b, 0) / Object.values(dimensions).length;

    // Generate recommendations
    const recommendations = this.generateQualityRecommendations(dimensions, validationResult, profile);

    // Add comprehensive insight
    insights.push(this.createInsight(
      'quality_assessment_complete',
      overallScore < 0.7 ? 'high' : 'low',
      'Data Quality Assessment Complete',
      `Overall data quality score: ${(overallScore * 100).toFixed(1)}%`,
      undefined,
      {
        score: overallScore,
        dimensions,
        errorCount: validationResult.errors.length,
        warningCount: validationResult.warnings.length,
      },
      overallScore < 0.7,
    ));

    return {
      overallScore,
      dimensions,
      validation: validationResult,
      profile,
      recommendations,
    };
  }

  // Helper methods
  private createSchemaFromConfig(config: Record<string, unknown>): z.ZodSchema {
    const schemaObj: Record<string, z.ZodTypeAny> = {};

    Object.entries(config).forEach(([field, rules]) => {
      const fieldConfig = rules as Record<string, unknown>;
      let fieldSchema: z.ZodTypeAny = z.any();

      if (fieldConfig.type === 'string') {fieldSchema = z.string();}
      else if (fieldConfig.type === 'number') {fieldSchema = z.number();}
      else if (fieldConfig.type === 'boolean') {fieldSchema = z.boolean();}
      else if (fieldConfig.type === 'date') {fieldSchema = z.string().datetime();}

      if (fieldConfig.required === false) {fieldSchema = fieldSchema.optional();}
      if (fieldConfig.min !== undefined && 'min' in fieldSchema) {
        fieldSchema = (fieldSchema as z.ZodString | z.ZodNumber).min(fieldConfig.min as number);
      }
      if (fieldConfig.max !== undefined && 'max' in fieldSchema) {
        fieldSchema = (fieldSchema as z.ZodString | z.ZodNumber).max(fieldConfig.max as number);
      }

      schemaObj[field] = fieldSchema;
    });

    return z.object(schemaObj);
  }

  private checkDataQuality(record: Record<string, unknown>, type: string): QualityCheckResult {
    const warnings: ValidationWarning[] = [];
    const suggestions: DataSuggestion[] = [];

    // Check for missing optional but recommended fields
    const recommendedFields: Record<string, string[]> = {
      contract: ['description', 'renewal_terms', 'payment_terms'],
      vendor: ['tax_id', 'website', 'category'],
      user: ['department', 'phone'],
    };

    const recommended = recommendedFields[type] || [];
    recommended.forEach(field => {
      if (!record[field]) {
        warnings.push({
          field,
          value: null,
          rule: 'recommended_field_missing',
          message: `Recommended field '${field}' is missing`,
          severity: 'warning',
        });
      }
    });

    // Suggest standardizations
    const email = record.email;
    if (email && typeof email === 'string' && email !== email.toLowerCase()) {
      suggestions.push({
        field: 'email',
        type: 'standardization',
        suggestion: 'Convert email to lowercase',
        confidence: 1.0,
      });
    }

    return { warnings, suggestions };
  }

  private calculateQualityMetrics(
    records: Record<string, unknown>[],
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): QualityMetrics {
    if (records.length === 0) {
      return {
        totalFields: 0,
        validFields: 0,
        errorCount: 0,
        warningCount: 0,
        completeness: 0,
        accuracy: 0,
        consistency: 0,
        uniqueness: 0,
      };
    }

    const totalFields = records.reduce((sum: number, record: Record<string, unknown>) =>
      sum + Object.keys(record).length, 0);
    const nullCount = records.reduce((sum: number, record: Record<string, unknown>) => {
      return sum + Object.values(record).filter((v: unknown) => v == null || v === '').length;
    }, 0);

    const completeness = 1 - (nullCount / totalFields);
    const accuracy = 1 - (errors.length / totalFields);

    // Simple consistency check - fields should have consistent types
    let consistencyScore = 1;
    const fieldTypes: Record<string, Set<string>> = {};
    records.forEach((record: Record<string, unknown>) => {
      Object.entries(record).forEach(([key, value]: [string, unknown]) => {
        const type = typeof value;
        if (!fieldTypes[key]) {fieldTypes[key] = new Set();}
        fieldTypes[key].add(type);
      });
    });
    const inconsistentFields = Object.values(fieldTypes).filter((types: Set<string>) => types.size > 1).length;
    if (Object.keys(fieldTypes).length > 0) {
      consistencyScore = 1 - (inconsistentFields / Object.keys(fieldTypes).length);
    }

    // Uniqueness - check for duplicate values in key fields
    const uniquenessScore = this.calculateUniquenessScore(records);

    return {
      totalFields,
      validFields: totalFields - errors.length,
      errorCount: errors.length,
      warningCount: warnings.length,
      completeness,
      accuracy,
      consistency: consistencyScore,
      uniqueness: uniquenessScore,
    };
  }

  private calculateUniquenessScore(records: Record<string, unknown>[]): number {
    if (records.length <= 1) {return 1;}

    // Check uniqueness of identifying fields
    const identifiers = ['id', 'contract_number', 'email', 'tax_id'];
    let uniqueScore = 0;
    let checkedFields = 0;

    identifiers.forEach((field: string) => {
      const values = records.map((r: Record<string, unknown>) => r[field]).filter((v: unknown) => v != null);
      if (values.length > 0) {
        const uniqueCount = new Set(values).size;
        uniqueScore += uniqueCount / values.length;
        checkedFields++;
      }
    });

    return checkedFields > 0 ? uniqueScore / checkedFields : 1;
  }

  private groupErrorsByType(errors: ValidationError[]): Record<string, number> {
    const groups: Record<string, number> = {};
    errors.forEach(error => {
      groups[error.rule] = (groups[error.rule] || 0) + 1;
    });
    return groups;
  }

  private inferDataType(values: unknown[]): string {
    if (values.length === 0) {return 'unknown';}

    const types = values.map(v => {
      if (v instanceof Date) {return 'date';}
      if (typeof v === 'number') {return 'number';}
      if (typeof v === 'boolean') {return 'boolean';}
      if (typeof v === 'string') {
        if (/^\d{4}-\d{2}-\d{2}/.test(v)) {return 'date';}
        if (/^\d+\.?\d*$/.test(v)) {return 'number-string';}
        if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v)) {return 'email';}
        if (/^https?:\/\//.test(v)) {return 'url';}
      }
      return 'string';
    });

    // Return most common type
    const typeCounts = types.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0][0];
  }

  private calculateOverallQualityScore(profile: DataProfile): number {
    let score = 1;

    // Penalize for null values
    const avgNullRate = Object.values(profile.statistics.nullCounts).reduce((sum: number, count: number) =>
      sum + count, 0) / (profile.statistics.recordCount * profile.statistics.fieldCount);
    score -= avgNullRate * 0.3;

    // Penalize for quality issues
    score -= profile.issues.length * 0.1;

    // Bonus for good uniqueness
    const avgUniqueness = Object.values(profile.statistics.uniqueCounts).reduce((sum: number, count: number) =>
      sum + (count / profile.statistics.recordCount), 0) / profile.statistics.fieldCount;
    score += avgUniqueness * 0.1;

    return Math.max(0, Math.min(1, score));
  }

  private standardizeDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toISOString();
    } catch {
      return dateStr;
    }
  }

  private standardizePhone(phone: string): string {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');

    // Format as international
    if (digits.length === 10) {
      return `+1-${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 11 && digits[0] === '1') {
      return `+1-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
    }

    return phone;
  }

  private standardizeCompanyName(name: string): string {
    // Standardize common suffixes
    return name
      .replace(/\b(inc|incorporated)\b\.?$/i, 'Inc.')
      .replace(/\b(corp|corporation)\b\.?$/i, 'Corp.')
      .replace(/\b(llc|l\.l\.c\.)\b\.?$/i, 'LLC')
      .replace(/\b(ltd|limited)\b\.?$/i, 'Ltd.')
      .trim();
  }

  private standardizeName(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  private standardizeAddress(address: Record<string, unknown>): Record<string, unknown> {
    const standardized: Record<string, unknown> = { ...address };

    // Standardize state abbreviations
    if (standardized.state && typeof standardized.state === 'string') {
      standardized.state = standardized.state.toUpperCase();
    }

    // Standardize country codes
    if (standardized.country && typeof standardized.country === 'string') {
      standardized.country = standardized.country.toUpperCase();
    }

    // Format postal code
    if (standardized.postal_code && typeof standardized.postal_code === 'string') {
      standardized.postal_code = standardized.postal_code.replace(/\s+/g, '');
    }

    return standardized;
  }

  private validateTaxId(taxId: unknown): boolean {
    if (typeof taxId !== 'string') {return false;}
    // Simple validation - would be expanded for real use
    const cleaned = taxId.replace(/\D/g, '');
    return cleaned.length === 9 || cleaned.length === 10;
  }

  private validateDateRange(record: Record<string, unknown>): boolean {
    const startDate = record.start_date;
    const endDate = record.end_date;

    if (!startDate || !endDate) {return true;}

    const start = new Date(startDate as string | number | Date);
    const end = new Date(endDate as string | number | Date);

    return end >= start;
  }

  private inferIndustry(companyName: string): string | null {
    const industryKeywords = {
      'Technology': ['tech', 'software', 'systems', 'digital', 'cyber'],
      'Healthcare': ['health', 'medical', 'pharma', 'bio', 'clinic'],
      'Finance': ['bank', 'financial', 'capital', 'invest', 'insurance'],
      'Retail': ['store', 'shop', 'retail', 'mart', 'boutique'],
      'Manufacturing': ['manufactur', 'industrial', 'factory', 'production'],
    };

    const lowerName = companyName.toLowerCase();

    for (const [industry, keywords] of Object.entries(industryKeywords)) {
      if (keywords.some(keyword => lowerName.includes(keyword))) {
        return industry;
      }
    }

    return null;
  }

  private inferRegion(address: Record<string, unknown>): string | null {
    const regionMap: Record<string, string[]> = {
      'North America': ['US', 'USA', 'CA', 'MX'],
      'Europe': ['UK', 'GB', 'FR', 'DE', 'IT', 'ES'],
      'Asia Pacific': ['CN', 'JP', 'IN', 'AU', 'SG'],
      'Latin America': ['BR', 'AR', 'CL', 'CO'],
    };

    const countryValue = address.country;
    const country = typeof countryValue === 'string' ? countryValue.toUpperCase() : undefined;

    if (!country) {return null;}

    for (const [region, countries] of Object.entries(regionMap)) {
      if (countries.includes(country)) {
        return region;
      }
    }

    return null;
  }

  private inferRiskLevel(contract: Record<string, unknown>): string {
    let riskScore = 0;

    const totalValue = contract.total_value;
    if (typeof totalValue === 'number') {
      if (totalValue > 1000000) {riskScore += 2;}
      else if (totalValue > 100000) {riskScore += 1;}
    }

    const liabilityCap = contract.liability_cap;
    if (!liabilityCap || liabilityCap === 'unlimited') {riskScore += 2;}
    if (!contract.termination_clause) {riskScore += 1;}

    const paymentTerms = contract.payment_terms;
    if (typeof paymentTerms === 'string' && paymentTerms.includes('90')) {riskScore += 1;}

    if (riskScore >= 4) {return 'high';}
    if (riskScore >= 2) {return 'medium';}
    return 'low';
  }

  private inferContractCategory(title: string): string | null {
    const categoryKeywords = {
      'Service Agreement': ['service', 'consulting', 'professional'],
      'Software License': ['software', 'license', 'saas', 'subscription'],
      'Purchase Order': ['purchase', 'procurement', 'supply'],
      'NDA': ['nda', 'non-disclosure', 'confidential'],
      'Partnership': ['partner', 'joint', 'collaboration'],
    };

    const lowerTitle = title.toLowerCase();

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => lowerTitle.includes(keyword))) {
        return category;
      }
    }

    return null;
  }

  private async convertToUSD(amount: number, currency: string): Promise<number | null> {
    // Simplified conversion - would use real exchange rates in production
    const rates = {
      'EUR': 1.10,
      'GBP': 1.25,
      'JPY': 0.0067,
      'CAD': 0.75,
    };

    if (currency === 'USD') {return amount;}
    if (currency in rates) {return amount * rates[currency as keyof typeof rates];}

    return null;
  }

  private calculateRecordSimilarity(record1: Record<string, unknown>, record2: Record<string, unknown>, matchFields: string[]): number {
    let totalScore = 0;
    let fieldCount = 0;

    matchFields.forEach((field: string) => {
      const val1 = record1[field];
      const val2 = record2[field];

      if (val1 == null || val2 == null) {return;}

      fieldCount++;

      if (typeof val1 === 'string' && typeof val2 === 'string') {
        // Use string similarity
        totalScore += this.stringSimilarity(val1.toLowerCase(), val2.toLowerCase());
      } else if (val1 === val2) {
        totalScore += 1;
      }
    });

    return fieldCount > 0 ? totalScore / fieldCount : 0;
  }

  private stringSimilarity(str1: string, str2: string): number {
    // Use enhanced Levenshtein-based similarity for better fuzzy matching
    // Combined with Jaccard for robustness
    const levenshtein = levenshteinSimilarity(str1, str2);
    const jaccard = jaccardSimilarity(str1, str2);

    // Weighted combination: 70% Levenshtein (character-level), 30% Jaccard (word-level)
    // This gives better results for both typos and word reordering
    return levenshtein * 0.7 + jaccard * 0.3;
  }

  private calculateGroupSimilarity(group: Record<string, unknown>[], matchFields: string[]): number {
    if (group.length < 2) {return 1;}

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < group.length - 1; i++) {
      for (let j = i + 1; j < group.length; j++) {
        totalSimilarity += this.calculateRecordSimilarity(group[i], group[j], matchFields);
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  private selectMasterRecord(group: Record<string, unknown>[]): Record<string, unknown> {
    // Select record with most complete data
    let bestRecord = group[0];
    let bestScore = 0;

    group.forEach((record: Record<string, unknown>) => {
      const score = Object.values(record).filter((v: unknown) => v != null && v !== '').length;
      if (score > bestScore) {
        bestScore = score;
        bestRecord = record;
      }
    });

    // Merge data from other records
    const merged: Record<string, unknown> = { ...bestRecord };
    group.forEach((record: Record<string, unknown>) => {
      Object.entries(record).forEach(([key, value]: [string, unknown]) => {
        if (!merged[key] && value != null && value !== '') {
          merged[key] = value;
        }
      });
    });

    return merged;
  }

  private assessTimeliness(records: Record<string, unknown>[]): number {
    // Check if date fields are current
    let timelinessScore = 1;
    const now = new Date();

    records.forEach((record: Record<string, unknown>) => {
      Object.entries(record).forEach(([key, value]: [string, unknown]) => {
        if (key.includes('date') && value) {
          const date = new Date(value as string | number | Date);
          if (!isNaN(date.getTime())) {
            // Penalize very old dates
            const ageInDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
            if (ageInDays > 365) {
              timelinessScore -= 0.01;
            }
          }
        }
      });
    });

    return Math.max(0, timelinessScore);
  }

  private generateQualityRecommendations(
    dimensions: Record<string, number>,
    validation: ValidationResult,
    profile: DataProfile,
  ): string[] {
    const recommendations: string[] = [];

    if (dimensions.completeness < 0.8) {
      recommendations.push('Improve data completeness by filling in missing required fields');
    }

    if (dimensions.accuracy < 0.9) {
      recommendations.push('Review and correct validation errors to improve accuracy');
    }

    if (dimensions.consistency < 0.9) {
      recommendations.push('Standardize data formats and types for better consistency');
    }

    if (dimensions.uniqueness < 0.95) {
      recommendations.push('Implement deduplication to remove duplicate records');
    }

    if (validation.errors.length > 0) {
      const topError = Object.entries(this.groupErrorsByType(validation.errors))
        .sort((a: [string, number], b: [string, number]) => b[1] - a[1])[0];
      recommendations.push(`Address ${topError[0]} errors affecting ${topError[1]} records`);
    }

    if (profile.issues.length > 0) {
      const highNullFields = profile.issues
        .filter((i: DataQualityIssue) => i.issue === 'high_null_rate')
        .map((i: DataQualityIssue) => i.field)
        .filter((field): field is string => field !== undefined);
      if (highNullFields.length > 0) {
        recommendations.push(`Investigate high null rates in fields: ${highNullFields.join(', ')}`);
      }
    }

    return recommendations;
  }
}