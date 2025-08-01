import { BaseAgent, ProcessingResult, Insight, AgentContext } from './base.ts';
import { z } from 'zod';

interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'range' | 'length' | 'custom' | 'reference';
  config: any;
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
  value: any;
  rule: string;
  message: string;
  severity: 'error';
}

interface ValidationWarning {
  field: string;
  value: any;
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

interface DataProfile {
  schema: any;
  statistics: {
    recordCount: number;
    fieldCount: number;
    nullCounts: Record<string, number>;
    uniqueCounts: Record<string, number>;
    dataTypes: Record<string, string>;
  };
  qualityScore: number;
  issues: any[];
}

export class DataQualityAgent extends BaseAgent {
  private validationSchemas: Map<string, z.ZodSchema> = new Map();
  private qualityChecks: Map<string, DataQualityCheck> = new Map();

  constructor(supabase: any, enterpriseId: string) {
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
          config: { validator: this.validateDateRange },
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
          config: { validator: this.validateTaxId },
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

  async process(data: any, context?: AgentContext): Promise<ProcessingResult> {
    const taskType = context?.taskType || this.inferTaskType(data);
    const insights: Insight[] = [];
    const rulesApplied: string[] = [];

    try {
      let result: any;
      let confidence = 0.85;

      switch (taskType) {
        case 'validate':
          result = await this.validateData(data, insights, rulesApplied);
          break;

        case 'clean':
          result = await this.cleanData(data, insights, rulesApplied);
          break;

        case 'profile':
          result = await this.profileData(data, insights, rulesApplied);
          break;

        case 'standardize':
          result = await this.standardizeData(data, insights, rulesApplied);
          break;

        case 'enrich':
          result = await this.enrichData(data, insights, rulesApplied);
          confidence = 0.9;
          break;

        case 'deduplicate':
          result = await this.deduplicateData(data, insights, rulesApplied);
          break;

        case 'quality_assessment':
          result = await this.assessDataQuality(data, insights, rulesApplied);
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

  private inferTaskType(data: any): string {
    if (data.validate) {return 'validate';}
    if (data.clean) {return 'clean';}
    if (data.profile) {return 'profile';}
    if (data.standardize) {return 'standardize';}
    if (data.enrich) {return 'enrich';}
    if (data.deduplicate) {return 'deduplicate';}
    return 'quality_assessment';
  }

  private async validateData(
    data: any,
    insights: Insight[],
    rulesApplied: string[],
  ): Promise<ValidationResult> {
    rulesApplied.push('data_validation');

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
    data: any,
    insights: Insight[],
    rulesApplied: string[],
  ): Promise<any> {
    rulesApplied.push('data_cleaning');

    const { records, options } = data.clean;
    const cleanedRecords = [];
    let modificationsCount = 0;

    for (const record of records) {
      const cleaned = { ...record };

      // Trim whitespace
      if (options?.trimWhitespace !== false) {
        Object.keys(cleaned).forEach(key => {
          if (typeof cleaned[key] === 'string') {
            const trimmed = cleaned[key].trim();
            if (trimmed !== cleaned[key]) {
              cleaned[key] = trimmed;
              modificationsCount++;
            }
          }
        });
      }

      // Remove empty fields
      if (options?.removeEmpty) {
        Object.keys(cleaned).forEach(key => {
          if (cleaned[key] === '' || cleaned[key] === null) {
            delete cleaned[key];
            modificationsCount++;
          }
        });
      }

      // Standardize formats
      if (options?.standardizeFormats) {
        // Standardize dates
        Object.keys(cleaned).forEach(key => {
          if (key.includes('date') && cleaned[key]) {
            cleaned[key] = this.standardizeDate(cleaned[key]);
          }
        });

        // Standardize phone numbers
        if (cleaned.phone) {
          cleaned.phone = this.standardizePhone(cleaned.phone);
        }

        // Standardize emails
        if (cleaned.email) {
          cleaned.email = cleaned.email.toLowerCase();
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
    data: any,
    insights: Insight[],
    rulesApplied: string[],
  ): Promise<DataProfile> {
    rulesApplied.push('data_profiling');

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

    fields.forEach(field => {
      // Determine data type
      const values = records.map((r: any) => r[field]).filter((v: any) => v != null);
      profile.schema[field] = {
        type: this.inferDataType(values),
        nullable: values.length < records.length,
        unique: new Set(values).size === values.length,
      };

      // Calculate statistics
      profile.statistics.nullCounts[field] = records.length - values.length;
      profile.statistics.uniqueCounts[field] = new Set(values).size;
      profile.statistics.dataTypes[field] = profile.schema[field].type;

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
    data: any,
    insights: Insight[],
    rulesApplied: string[],
  ): Promise<any> {
    rulesApplied.push('data_standardization');

    const { records, type } = data.standardize;
    const standardizedRecords = [];
    const transformations = {
      addresses: 0,
      names: 0,
      dates: 0,
      currencies: 0,
    };

    for (const record of records) {
      const standardized = { ...record };

      // Standardize based on data type
      switch (type) {
        case 'contract':
          // Standardize contract number
          if (standardized.contract_number) {
            standardized.contract_number = standardized.contract_number.toUpperCase();
          }
          // Standardize currency
          if (standardized.currency) {
            standardized.currency = standardized.currency.toUpperCase();
            transformations.currencies++;
          }
          // Standardize dates
          ['start_date', 'end_date'].forEach(field => {
            if (standardized[field]) {
              standardized[field] = this.standardizeDate(standardized[field]);
              transformations.dates++;
            }
          });
          break;

        case 'vendor':
          // Standardize company name
          if (standardized.name) {
            standardized.name = this.standardizeCompanyName(standardized.name);
            transformations.names++;
          }
          // Standardize address
          if (standardized.address) {
            standardized.address = this.standardizeAddress(standardized.address);
            transformations.addresses++;
          }
          break;

        case 'user':
          // Standardize names
          ['first_name', 'last_name'].forEach(field => {
            if (standardized[field]) {
              standardized[field] = this.standardizeName(standardized[field]);
              transformations.names++;
            }
          });
          // Standardize email
          if (standardized.email) {
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
    data: any,
    insights: Insight[],
    rulesApplied: string[],
  ): Promise<any> {
    rulesApplied.push('data_enrichment');

    const { records, enrichmentType } = data.enrich;
    const enrichedRecords = [];
    let enrichmentCount = 0;

    for (const record of records) {
      const enriched = { ...record };

      switch (enrichmentType) {
        case 'vendor':
          // Enrich vendor data
          if (enriched.name && !enriched.industry) {
            enriched.industry = this.inferIndustry(enriched.name);
            if (enriched.industry) {enrichmentCount++;}
          }
          if (enriched.address && !enriched.region) {
            enriched.region = this.inferRegion(enriched.address);
            if (enriched.region) {enrichmentCount++;}
          }
          break;

        case 'contract':
          // Enrich contract data
          if (!enriched.risk_level) {
            enriched.risk_level = this.inferRiskLevel(enriched);
            enrichmentCount++;
          }
          if (!enriched.category && enriched.title) {
            enriched.category = this.inferContractCategory(enriched.title);
            if (enriched.category) {enrichmentCount++;}
          }
          break;

        case 'financial':
          // Enrich financial data
          if (enriched.currency && enriched.amount && !enriched.amount_usd) {
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
    data: any,
    insights: Insight[],
    rulesApplied: string[],
  ): Promise<any> {
    rulesApplied.push('data_deduplication');

    const { records, matchFields, threshold = 0.9 } = data.deduplicate;
    const duplicateGroups = [];
    const uniqueRecords = [];
    const processedIndices = new Set();

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
    data: any,
    insights: Insight[],
    rulesApplied: string[],
  ): Promise<any> {
    rulesApplied.push('quality_assessment');

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
  private createSchemaFromConfig(config: any): z.ZodSchema {
    const schemaObj: Record<string, z.ZodTypeAny> = {};

    Object.entries(config).forEach(([field, rules]: [string, any]) => {
      let fieldSchema: z.ZodTypeAny = z.any();

      if (rules.type === 'string') {fieldSchema = z.string();}
      else if (rules.type === 'number') {fieldSchema = z.number();}
      else if (rules.type === 'boolean') {fieldSchema = z.boolean();}
      else if (rules.type === 'date') {fieldSchema = z.string().datetime();}

      if (rules.required === false) {fieldSchema = fieldSchema.optional();}
      if (rules.min !== undefined && 'min' in fieldSchema) {
        fieldSchema = (fieldSchema as any).min(rules.min);
      }
      if (rules.max !== undefined && 'max' in fieldSchema) {
        fieldSchema = (fieldSchema as any).max(rules.max);
      }

      schemaObj[field] = fieldSchema;
    });

    return z.object(schemaObj);
  }

  private checkDataQuality(record: any, type: string): any {
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
    if (record.email && record.email !== record.email.toLowerCase()) {
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
    records: any[],
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

    const totalFields = records.reduce((sum, record) => sum + Object.keys(record).length, 0);
    const nullCount = records.reduce((sum, record) => {
      return sum + Object.values(record).filter(v => v == null || v === '').length;
    }, 0);

    const completeness = 1 - (nullCount / totalFields);
    const accuracy = 1 - (errors.length / totalFields);

    // Simple consistency check - fields should have consistent types
    let consistencyScore = 1;
    const fieldTypes: Record<string, Set<string>> = {};
    records.forEach(record => {
      Object.entries(record).forEach(([key, value]) => {
        const type = typeof value;
        if (!fieldTypes[key]) {fieldTypes[key] = new Set();}
        fieldTypes[key].add(type);
      });
    });
    const inconsistentFields = Object.values(fieldTypes).filter((types: any) => types.size > 1).length;
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

  private calculateUniquenessScore(records: any[]): number {
    if (records.length <= 1) {return 1;}

    // Check uniqueness of identifying fields
    const identifiers = ['id', 'contract_number', 'email', 'tax_id'];
    let uniqueScore = 0;
    let checkedFields = 0;

    identifiers.forEach(field => {
      const values = records.map((r: any) => r[field]).filter((v: any) => v != null);
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

  private inferDataType(values: any[]): string {
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

  private standardizeAddress(address: any): any {
    const standardized = { ...address };

    // Standardize state abbreviations
    if (standardized.state) {
      standardized.state = standardized.state.toUpperCase();
    }

    // Standardize country codes
    if (standardized.country) {
      standardized.country = standardized.country.toUpperCase();
    }

    // Format postal code
    if (standardized.postal_code) {
      standardized.postal_code = standardized.postal_code.replace(/\s+/g, '');
    }

    return standardized;
  }

  private validateTaxId(taxId: string): boolean {
    // Simple validation - would be expanded for real use
    const cleaned = taxId.replace(/\D/g, '');
    return cleaned.length === 9 || cleaned.length === 10;
  }

  private validateDateRange(record: any): boolean {
    if (!record.start_date || !record.end_date) {return true;}

    const start = new Date(record.start_date);
    const end = new Date(record.end_date);

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

  private inferRegion(address: any): string | null {
    const regionMap = {
      'North America': ['US', 'USA', 'CA', 'MX'],
      'Europe': ['UK', 'GB', 'FR', 'DE', 'IT', 'ES'],
      'Asia Pacific': ['CN', 'JP', 'IN', 'AU', 'SG'],
      'Latin America': ['BR', 'AR', 'CL', 'CO'],
    };

    const country = address.country?.toUpperCase();

    for (const [region, countries] of Object.entries(regionMap)) {
      if (countries.includes(country)) {
        return region;
      }
    }

    return null;
  }

  private inferRiskLevel(contract: any): string {
    let riskScore = 0;

    if (contract.total_value > 1000000) {riskScore += 2;}
    else if (contract.total_value > 100000) {riskScore += 1;}

    if (!contract.liability_cap || contract.liability_cap === 'unlimited') {riskScore += 2;}
    if (!contract.termination_clause) {riskScore += 1;}
    if (contract.payment_terms?.includes('90')) {riskScore += 1;}

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

  private calculateRecordSimilarity(record1: any, record2: any, matchFields: string[]): number {
    let totalScore = 0;
    let fieldCount = 0;

    matchFields.forEach(field => {
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
    // Simple Jaccard similarity
    const set1 = new Set(str1.split(/\s+/));
    const set2 = new Set(str2.split(/\s+/));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  private calculateGroupSimilarity(group: any[], matchFields: string[]): number {
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

  private selectMasterRecord(group: any[]): any {
    // Select record with most complete data
    let bestRecord = group[0];
    let bestScore = 0;

    group.forEach(record => {
      const score = Object.values(record).filter(v => v != null && v !== '').length;
      if (score > bestScore) {
        bestScore = score;
        bestRecord = record;
      }
    });

    // Merge data from other records
    const merged = { ...bestRecord };
    group.forEach(record => {
      Object.entries(record).forEach(([key, value]) => {
        if (!merged[key] && value != null && value !== '') {
          merged[key] = value;
        }
      });
    });

    return merged;
  }

  private assessTimeliness(records: any[]): number {
    // Check if date fields are current
    let timelinessScore = 1;
    const now = new Date();

    records.forEach(record => {
      Object.entries(record).forEach(([key, value]) => {
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
    dimensions: any,
    validation: ValidationResult,
    profile: DataProfile,
  ): string[] {
    const recommendations = [];

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
        .sort((a, b) => b[1] - a[1])[0];
      recommendations.push(`Address ${topError[0]} errors affecting ${topError[1]} records`);
    }

    if (profile.issues.length > 0) {
      const highNullFields = profile.issues
        .filter(i => i.issue === 'high_null_rate')
        .map(i => i.field);
      if (highNullFields.length > 0) {
        recommendations.push(`Investigate high null rates in fields: ${highNullFields.join(', ')}`);
      }
    }

    return recommendations;
  }
}