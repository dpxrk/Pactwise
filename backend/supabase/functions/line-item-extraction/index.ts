/// <reference path="../../types/global.d.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, getUserFromAuth } from '../_shared/supabase.ts';
import { validateRequest, z } from '../_shared/validation.ts';
import { createTransformerService, TransformerService } from '../local-agents/donna/transformer-integration.ts';

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

const ExtractFromContractSchema = z.object({
  action: z.literal('extract_from_contract'),
  params: z.object({
    contract_id: z.string().uuid(),
    force_reextract: z.boolean().default(false),
  }),
});

const ExtractFromTextSchema = z.object({
  action: z.literal('extract_from_text'),
  params: z.object({
    text: z.string().min(10).max(500000),
    contract_id: z.string().uuid().optional(),
    document_id: z.string().uuid().optional(),
  }),
});

const BulkExtractSchema = z.object({
  action: z.literal('bulk_extract'),
  params: z.object({
    contract_ids: z.array(z.string().uuid()).min(1).max(50),
    force_reextract: z.boolean().default(false),
  }),
});

const ReviewLineItemsSchema = z.object({
  action: z.literal('review_line_items'),
  params: z.object({
    contract_id: z.string().uuid(),
    status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  }),
});

const ApproveLineItemsSchema = z.object({
  action: z.literal('approve_line_items'),
  params: z.object({
    line_item_ids: z.array(z.string().uuid()).min(1),
    taxonomy_code: z.string().optional(),
  }),
});

const RejectLineItemsSchema = z.object({
  action: z.literal('reject_line_items'),
  params: z.object({
    line_item_ids: z.array(z.string().uuid()).min(1),
    reason: z.string().optional(),
  }),
});

const GetExtractionJobsSchema = z.object({
  action: z.literal('get_extraction_jobs'),
  params: z.object({
    status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
    limit: z.number().min(1).max(100).default(20),
    offset: z.number().min(0).default(0),
  }),
});

// Combined schema
const LineItemExtractionRequestSchema = z.discriminatedUnion('action', [
  ExtractFromContractSchema,
  ExtractFromTextSchema,
  BulkExtractSchema,
  ReviewLineItemsSchema,
  ApproveLineItemsSchema,
  RejectLineItemsSchema,
  GetExtractionJobsSchema,
]);

type LineItemExtractionRequest = z.infer<typeof LineItemExtractionRequestSchema>;

// ============================================================================
// EXTRACTION ENGINE
// ============================================================================

interface ExtractedLineItem {
  item_name: string;
  item_description?: string;
  quantity?: number;
  unit_of_measure?: string;
  unit_price?: number;
  total_price?: number;
  currency?: string;
  confidence: number;
  extraction_method: 'ai' | 'pattern' | 'table';
  raw_text?: string;
  position?: { start: number; end: number };
}

interface ExtractionResult {
  success: boolean;
  line_items: ExtractedLineItem[];
  summary: {
    total_items: number;
    total_value: number;
    avg_confidence: number;
    needs_review: number;
    currency: string;
  };
  metadata: {
    extraction_time_ms: number;
    text_length: number;
    extraction_method: string;
  };
}

class LineItemExtractor {
  private transformerService: TransformerService;
  private supabase: ReturnType<typeof createSupabaseClient>;
  private enterpriseId: string;

  constructor(
    supabase: ReturnType<typeof createSupabaseClient>,
    enterpriseId: string
  ) {
    this.supabase = supabase;
    this.enterpriseId = enterpriseId;
    this.transformerService = createTransformerService(supabase);
  }

  /**
   * Extract line items from contract text using multiple strategies
   */
  async extractLineItems(text: string): Promise<ExtractionResult> {
    const startTime = Date.now();
    const allItems: ExtractedLineItem[] = [];
    const seenItems = new Set<string>();

    // Strategy 1: Pattern-based extraction for structured data (tables)
    const patternItems = this.extractWithPatterns(text);
    for (const item of patternItems) {
      const key = `${item.item_name}_${item.unit_price}_${item.quantity}`;
      if (!seenItems.has(key)) {
        seenItems.add(key);
        allItems.push(item);
      }
    }

    // Strategy 2: AI-powered extraction for unstructured text
    try {
      const aiItems = await this.extractWithAI(text);
      for (const item of aiItems) {
        const key = `${item.item_name}_${item.unit_price}_${item.quantity}`;
        if (!seenItems.has(key)) {
          seenItems.add(key);
          allItems.push(item);
        }
      }
    } catch (error) {
      console.warn('[LineItemExtractor] AI extraction failed:', error);
    }

    // Calculate totals
    const totalValue = allItems.reduce((sum, item) => {
      const itemTotal = item.total_price || (item.unit_price || 0) * (item.quantity || 1);
      return sum + itemTotal;
    }, 0);

    const avgConfidence = allItems.length > 0
      ? allItems.reduce((sum, item) => sum + item.confidence, 0) / allItems.length
      : 0;

    const needsReview = allItems.filter(item => item.confidence < 0.7).length;

    // Detect predominant currency
    const currencies = allItems
      .map(item => item.currency)
      .filter(Boolean);
    const currencyMode = currencies.length > 0
      ? this.getMode(currencies)
      : 'USD';

    return {
      success: true,
      line_items: allItems,
      summary: {
        total_items: allItems.length,
        total_value: totalValue,
        avg_confidence: avgConfidence,
        needs_review: needsReview,
        currency: currencyMode || 'USD',
      },
      metadata: {
        extraction_time_ms: Date.now() - startTime,
        text_length: text.length,
        extraction_method: allItems.length > 0 ? (patternItems.length > 0 ? 'hybrid' : 'ai') : 'none',
      },
    };
  }

  /**
   * Pattern-based extraction for structured pricing data
   */
  private extractWithPatterns(text: string): ExtractedLineItem[] {
    const items: ExtractedLineItem[] = [];

    // Pattern 1: Table-like format with pipes or tabs
    // Example: | Software License | 10 | $1,000 | $10,000 |
    const tablePattern = /\|?\s*([^|$\d\n]{3,100})\s*\|?\s*(\d+(?:\.\d+)?)\s*\|?\s*\$?([\d,]+(?:\.\d{2})?)\s*\|?\s*\$?([\d,]+(?:\.\d{2})?)\s*\|?/gi;
    let match;
    while ((match = tablePattern.exec(text)) !== null) {
      const itemName = match[1].trim();
      if (itemName.length > 2 && !this.isHeaderRow(itemName)) {
        items.push({
          item_name: itemName,
          quantity: parseFloat(match[2]),
          unit_price: this.parsePrice(match[3]),
          total_price: this.parsePrice(match[4]),
          currency: 'USD',
          confidence: 0.85,
          extraction_method: 'table',
          raw_text: match[0],
          position: { start: match.index, end: match.index + match[0].length },
        });
      }
    }

    // Pattern 2: Line item with quantity and price
    // Example: "10 x Software License @ $1,000 each = $10,000"
    const lineItemPattern = /(\d+(?:\.\d+)?)\s*x?\s*([^$@\n]{3,100})\s*@?\s*\$?([\d,]+(?:\.\d{2})?)\s*(?:each|per\s+\w+)?\s*(?:=|total:?)?\s*\$?([\d,]+(?:\.\d{2})?)?/gi;
    while ((match = lineItemPattern.exec(text)) !== null) {
      const itemName = match[2].trim();
      if (itemName.length > 2 && !this.isExcludedTerm(itemName)) {
        items.push({
          item_name: itemName,
          quantity: parseFloat(match[1]),
          unit_price: this.parsePrice(match[3]),
          total_price: match[4] ? this.parsePrice(match[4]) : undefined,
          currency: 'USD',
          confidence: 0.8,
          extraction_method: 'pattern',
          raw_text: match[0],
          position: { start: match.index, end: match.index + match[0].length },
        });
      }
    }

    // Pattern 3: Simple price listing
    // Example: "Software License: $10,000"
    const simplePricePattern = /([A-Za-z][^:$\n]{2,80}):\s*\$?([\d,]+(?:\.\d{2})?)/gi;
    while ((match = simplePricePattern.exec(text)) !== null) {
      const itemName = match[1].trim();
      const price = this.parsePrice(match[2]);
      if (itemName.length > 2 && price > 0 && !this.isExcludedTerm(itemName)) {
        items.push({
          item_name: itemName,
          unit_price: price,
          total_price: price,
          quantity: 1,
          currency: 'USD',
          confidence: 0.7,
          extraction_method: 'pattern',
          raw_text: match[0],
          position: { start: match.index, end: match.index + match[0].length },
        });
      }
    }

    // Pattern 4: Monthly/Annual pricing
    // Example: "Monthly subscription: $5,000/month" or "$60,000 annually"
    const recurringPattern = /([A-Za-z][^:$\n]{2,80})\s*[:=]?\s*\$?([\d,]+(?:\.\d{2})?)\s*(?:per|\/)\s*(month|year|annual|quarter|weekly)/gi;
    while ((match = recurringPattern.exec(text)) !== null) {
      const itemName = match[1].trim();
      const price = this.parsePrice(match[2]);
      const period = match[3].toLowerCase();
      if (itemName.length > 2 && price > 0 && !this.isExcludedTerm(itemName)) {
        items.push({
          item_name: itemName,
          item_description: `Recurring ${period} charge`,
          unit_price: price,
          unit_of_measure: period.includes('month') ? 'month' : (period.includes('year') || period.includes('annual') ? 'year' : period),
          currency: 'USD',
          confidence: 0.75,
          extraction_method: 'pattern',
          raw_text: match[0],
          position: { start: match.index, end: match.index + match[0].length },
        });
      }
    }

    // Pattern 5: Unit pricing
    // Example: "$50 per user" or "$1,000 per license"
    const unitPricePattern = /\$?([\d,]+(?:\.\d{2})?)\s+per\s+(\w+(?:\s+\w+)?)/gi;
    while ((match = unitPricePattern.exec(text)) !== null) {
      const price = this.parsePrice(match[1]);
      const unit = match[2].trim();
      if (price > 0 && unit.length > 1) {
        // Look for context around the match for item name
        const contextStart = Math.max(0, match.index - 100);
        const contextEnd = match.index;
        const context = text.substring(contextStart, contextEnd);
        const itemNameMatch = context.match(/([A-Z][A-Za-z\s]{2,50})(?:\s*[-:])?\s*$/);

        items.push({
          item_name: itemNameMatch ? itemNameMatch[1].trim() : `Per-${unit} charge`,
          unit_price: price,
          unit_of_measure: unit,
          currency: 'USD',
          confidence: 0.65,
          extraction_method: 'pattern',
          raw_text: match[0],
          position: { start: match.index, end: match.index + match[0].length },
        });
      }
    }

    return items;
  }

  /**
   * AI-powered extraction using transformer models
   */
  private async extractWithAI(text: string): Promise<ExtractedLineItem[]> {
    const items: ExtractedLineItem[] = [];

    // Use structured prompts for extraction
    const extractionPrompt = `Extract all line items with pricing information from this contract text.
For each item found, provide:
- item_name: The product or service name
- item_description: Brief description if available
- quantity: Number of units (default 1 if not specified)
- unit_price: Price per unit
- total_price: Total price for the line item
- unit_of_measure: Unit type (e.g., license, hour, month, user)

Return the results as a JSON array. Only include items that have clear pricing information.
If no line items with pricing are found, return an empty array.

Contract text:
${text.substring(0, 15000)}`;  // Limit text length for API

    try {
      const response = await this.transformerService.process({
        text: extractionPrompt,
        task: 'completion',
        context: {
          domain: 'financial',
          type: 'contract',
        },
      });

      // Parse AI response
      const responseText = typeof response.result === 'string' ? response.result : JSON.stringify(response.result);

      // Extract JSON from response
      const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        try {
          const extractedItems = JSON.parse(jsonMatch[0]);
          if (Array.isArray(extractedItems)) {
            for (const item of extractedItems) {
              if (item.item_name && (item.unit_price || item.total_price)) {
                items.push({
                  item_name: String(item.item_name).trim(),
                  item_description: item.item_description ? String(item.item_description).trim() : undefined,
                  quantity: typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity) || 1,
                  unit_price: typeof item.unit_price === 'number' ? item.unit_price : this.parsePrice(item.unit_price),
                  total_price: typeof item.total_price === 'number' ? item.total_price : this.parsePrice(item.total_price),
                  unit_of_measure: item.unit_of_measure ? String(item.unit_of_measure) : undefined,
                  currency: 'USD',
                  confidence: 0.75, // AI extractions have moderate confidence
                  extraction_method: 'ai',
                });
              }
            }
          }
        } catch (parseError) {
          console.warn('[LineItemExtractor] Failed to parse AI response:', parseError);
        }
      }
    } catch (error) {
      console.warn('[LineItemExtractor] AI extraction error:', error);
    }

    return items;
  }

  /**
   * Helper: Parse price string to number
   */
  private parsePrice(priceStr: string | number | undefined): number {
    if (typeof priceStr === 'number') return priceStr;
    if (!priceStr) return 0;
    const cleaned = String(priceStr).replace(/[,$\s]/g, '');
    const value = parseFloat(cleaned);
    return isNaN(value) ? 0 : value;
  }

  /**
   * Helper: Check if text is a header row
   */
  private isHeaderRow(text: string): boolean {
    const headerTerms = ['item', 'description', 'qty', 'quantity', 'price', 'total', 'amount', 'unit'];
    const lowerText = text.toLowerCase();
    return headerTerms.filter(term => lowerText.includes(term)).length >= 2;
  }

  /**
   * Helper: Check if term should be excluded
   */
  private isExcludedTerm(text: string): boolean {
    const excludedTerms = [
      'total', 'subtotal', 'tax', 'discount', 'balance', 'due', 'payment',
      'page', 'section', 'article', 'clause', 'agreement', 'contract',
      'signature', 'date', 'signed', 'witness', 'party', 'parties'
    ];
    const lowerText = text.toLowerCase().trim();
    return excludedTerms.some(term => lowerText === term || lowerText.startsWith(term + ' '));
  }

  /**
   * Helper: Get mode (most common value) from array
   */
  private getMode<T>(arr: T[]): T | undefined {
    const counts = new Map<T, number>();
    for (const item of arr) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }
    let maxCount = 0;
    let mode: T | undefined;
    for (const [item, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        mode = item;
      }
    }
    return mode;
  }

  /**
   * Save extracted line items to database
   */
  async saveLineItems(
    contractId: string,
    lineItems: ExtractedLineItem[],
    userId: string
  ): Promise<{ saved: number; errors: string[] }> {
    const errors: string[] = [];
    let saved = 0;

    for (const item of lineItems) {
      try {
        // Determine status based on confidence
        const status = item.confidence >= 0.8 ? 'auto_approved' : 'pending_review';

        const { error } = await this.supabase
          .from('contract_line_items')
          .insert({
            contract_id: contractId,
            enterprise_id: this.enterpriseId,
            item_name: item.item_name,
            item_description: item.item_description,
            quantity: item.quantity || 1,
            unit_of_measure: item.unit_of_measure || 'unit',
            unit_price: item.unit_price,
            total_price: item.total_price || (item.unit_price || 0) * (item.quantity || 1),
            currency: item.currency || 'USD',
            extraction_confidence: item.confidence,
            extraction_method: item.extraction_method,
            taxonomy_confidence: 0, // Will be set during taxonomy matching
            status,
            extracted_by: userId,
            raw_extracted_text: item.raw_text,
            metadata: {
              position: item.position,
              extraction_timestamp: new Date().toISOString(),
            },
          });

        if (error) {
          errors.push(`Failed to save "${item.item_name}": ${error.message}`);
        } else {
          saved++;
        }
      } catch (error) {
        errors.push(`Error saving "${item.item_name}": ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Trigger taxonomy matching for saved items
    if (saved > 0) {
      await this.triggerTaxonomyMatching(contractId);
    }

    return { saved, errors };
  }

  /**
   * Trigger background taxonomy matching
   */
  private async triggerTaxonomyMatching(contractId: string): Promise<void> {
    // Get line items without taxonomy
    const { data: lineItems } = await this.supabase
      .from('contract_line_items')
      .select('id, item_name, item_description')
      .eq('contract_id', contractId)
      .is('taxonomy_code', null)
      .limit(100);

    if (!lineItems || lineItems.length === 0) return;

    // Call taxonomy matcher for each item
    for (const item of lineItems) {
      try {
        const { data: matches } = await this.supabase.rpc('search_taxonomy', {
          p_query: `${item.item_name} ${item.item_description || ''}`.trim(),
          p_level: null,
          p_limit: 3,
        });

        if (matches && matches.length > 0) {
          const bestMatch = matches[0] as { code: string; name: string; relevance: number };
          const confidence = Math.min(0.95, bestMatch.relevance);

          if (confidence >= 0.5) {
            // Update line item with taxonomy match
            await this.supabase
              .from('contract_line_items')
              .update({
                taxonomy_code: bestMatch.code,
                taxonomy_confidence: confidence,
                status: confidence >= 0.8 ? 'approved' : 'pending_review',
              })
              .eq('id', item.id);
          } else {
            // Queue for manual review
            await this.supabase.rpc('queue_for_taxonomy_review', {
              p_enterprise_id: this.enterpriseId,
              p_line_item_id: item.id,
              p_item_text: `${item.item_name} ${item.item_description || ''}`.trim(),
              p_suggested_matches: JSON.stringify(matches.slice(0, 5)),
              p_priority: confidence < 0.3 ? 1 : 2,
            });
          }
        }
      } catch (error) {
        console.warn(`[LineItemExtractor] Taxonomy matching failed for item ${item.id}:`, error);
      }
    }
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const supabase = createSupabaseClient(authHeader);
    const user = await getUserFromAuth(supabase);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Get user's enterprise
    const { data: userProfile } = await supabase
      .from('users')
      .select('enterprise_id')
      .eq('id', user.id)
      .single();

    if (!userProfile?.enterprise_id) {
      return new Response(JSON.stringify({ error: 'User profile not found' }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Parse and validate request
    const body = await req.json();
    const validation = validateRequest(LineItemExtractionRequestSchema, body);

    if (!validation.success) {
      return new Response(JSON.stringify({ error: 'Validation error', details: validation.error }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const request = validation.data as LineItemExtractionRequest;
    const extractor = new LineItemExtractor(supabase, userProfile.enterprise_id);
    let result: unknown;

    switch (request.action) {
      case 'extract_from_contract': {
        // Get contract
        const { data: contract, error: contractError } = await supabase
          .from('contracts')
          .select('id, title, extracted_text, documents(id, extracted_text)')
          .eq('id', request.params.contract_id)
          .eq('enterprise_id', userProfile.enterprise_id)
          .single();

        if (contractError || !contract) {
          return new Response(JSON.stringify({ error: 'Contract not found' }), {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            status: 404,
          });
        }

        // Check if already extracted (unless force_reextract)
        if (!request.params.force_reextract) {
          const { count } = await supabase
            .from('contract_line_items')
            .select('*', { count: 'exact', head: true })
            .eq('contract_id', request.params.contract_id);

          if (count && count > 0) {
            return new Response(JSON.stringify({
              error: 'Line items already extracted',
              existing_count: count,
              message: 'Use force_reextract: true to re-extract',
            }), {
              headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
              status: 409,
            });
          }
        }

        // Combine all text sources
        let fullText = contract.extracted_text || '';
        const documents = contract.documents as Array<{ extracted_text?: string }> | undefined;
        if (documents && documents.length > 0) {
          for (const doc of documents) {
            if (doc.extracted_text) {
              fullText += '\n\n' + doc.extracted_text;
            }
          }
        }

        if (!fullText || fullText.trim().length < 50) {
          return new Response(JSON.stringify({
            error: 'No text content available',
            message: 'Contract has no extracted text. Please run OCR first.',
          }), {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            status: 400,
          });
        }

        // Delete existing line items if force_reextract
        if (request.params.force_reextract) {
          await supabase
            .from('contract_line_items')
            .delete()
            .eq('contract_id', request.params.contract_id);
        }

        // Extract line items
        const extraction = await extractor.extractLineItems(fullText);

        // Save to database
        const saveResult = await extractor.saveLineItems(
          request.params.contract_id,
          extraction.line_items,
          user.id
        );

        result = {
          ...extraction,
          saved: saveResult.saved,
          save_errors: saveResult.errors,
          contract_id: request.params.contract_id,
        };
        break;
      }

      case 'extract_from_text': {
        const extraction = await extractor.extractLineItems(request.params.text);

        // If contract_id provided, save to database
        if (request.params.contract_id) {
          // Verify contract exists and belongs to user
          const { data: contract } = await supabase
            .from('contracts')
            .select('id')
            .eq('id', request.params.contract_id)
            .eq('enterprise_id', userProfile.enterprise_id)
            .single();

          if (contract) {
            const saveResult = await extractor.saveLineItems(
              request.params.contract_id,
              extraction.line_items,
              user.id
            );
            result = {
              ...extraction,
              saved: saveResult.saved,
              save_errors: saveResult.errors,
            };
          } else {
            result = { ...extraction, saved: 0, save_errors: ['Contract not found'] };
          }
        } else {
          result = extraction;
        }
        break;
      }

      case 'bulk_extract': {
        const bulkResults: Array<{
          contract_id: string;
          success: boolean;
          items_found: number;
          items_saved: number;
          errors: string[];
        }> = [];

        for (const contractId of request.params.contract_ids) {
          try {
            // Get contract text
            const { data: contract } = await supabase
              .from('contracts')
              .select('extracted_text, documents(extracted_text)')
              .eq('id', contractId)
              .eq('enterprise_id', userProfile.enterprise_id)
              .single();

            if (!contract) {
              bulkResults.push({
                contract_id: contractId,
                success: false,
                items_found: 0,
                items_saved: 0,
                errors: ['Contract not found'],
              });
              continue;
            }

            // Combine text
            let fullText = contract.extracted_text || '';
            const docs = contract.documents as Array<{ extracted_text?: string }> | undefined;
            if (docs) {
              for (const doc of docs) {
                if (doc.extracted_text) fullText += '\n' + doc.extracted_text;
              }
            }

            if (!fullText || fullText.length < 50) {
              bulkResults.push({
                contract_id: contractId,
                success: false,
                items_found: 0,
                items_saved: 0,
                errors: ['No text content'],
              });
              continue;
            }

            // Delete existing if force
            if (request.params.force_reextract) {
              await supabase
                .from('contract_line_items')
                .delete()
                .eq('contract_id', contractId);
            }

            // Extract and save
            const extraction = await extractor.extractLineItems(fullText);
            const saveResult = await extractor.saveLineItems(contractId, extraction.line_items, user.id);

            bulkResults.push({
              contract_id: contractId,
              success: true,
              items_found: extraction.line_items.length,
              items_saved: saveResult.saved,
              errors: saveResult.errors,
            });
          } catch (error) {
            bulkResults.push({
              contract_id: contractId,
              success: false,
              items_found: 0,
              items_saved: 0,
              errors: [error instanceof Error ? error.message : String(error)],
            });
          }
        }

        result = {
          results: bulkResults,
          summary: {
            total_contracts: request.params.contract_ids.length,
            successful: bulkResults.filter(r => r.success).length,
            failed: bulkResults.filter(r => !r.success).length,
            total_items_found: bulkResults.reduce((sum, r) => sum + r.items_found, 0),
            total_items_saved: bulkResults.reduce((sum, r) => sum + r.items_saved, 0),
          },
        };
        break;
      }

      case 'review_line_items': {
        const { data: lineItems, error: queryError } = await supabase
          .from('contract_line_items')
          .select(`
            *,
            taxonomy:product_service_taxonomy!taxonomy_code (
              code, name, description, level
            )
          `)
          .eq('contract_id', request.params.contract_id)
          .eq('enterprise_id', userProfile.enterprise_id)
          .eq('status', request.params.status)
          .order('created_at', { ascending: true });

        if (queryError) {
          throw new Error(`Failed to get line items: ${queryError.message}`);
        }

        result = {
          line_items: lineItems || [],
          count: lineItems?.length || 0,
          status: request.params.status,
        };
        break;
      }

      case 'approve_line_items': {
        const updateData: Record<string, unknown> = {
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        };

        if (request.params.taxonomy_code) {
          updateData.taxonomy_code = request.params.taxonomy_code;
          updateData.taxonomy_confidence = 1.0; // Manual selection = full confidence
        }

        const { data: updated, error: updateError } = await supabase
          .from('contract_line_items')
          .update(updateData)
          .in('id', request.params.line_item_ids)
          .eq('enterprise_id', userProfile.enterprise_id)
          .select();

        if (updateError) {
          throw new Error(`Failed to approve line items: ${updateError.message}`);
        }

        result = {
          approved: updated?.length || 0,
          line_item_ids: request.params.line_item_ids,
        };
        break;
      }

      case 'reject_line_items': {
        const { data: updated, error: updateError } = await supabase
          .from('contract_line_items')
          .update({
            status: 'rejected',
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            metadata: {
              rejection_reason: request.params.reason,
            },
          })
          .in('id', request.params.line_item_ids)
          .eq('enterprise_id', userProfile.enterprise_id)
          .select();

        if (updateError) {
          throw new Error(`Failed to reject line items: ${updateError.message}`);
        }

        result = {
          rejected: updated?.length || 0,
          line_item_ids: request.params.line_item_ids,
        };
        break;
      }

      case 'get_extraction_jobs': {
        // Get contracts with extraction metadata
        let query = supabase
          .from('contracts')
          .select(`
            id,
            title,
            status,
            value,
            created_at,
            line_items:contract_line_items(count)
          `)
          .eq('enterprise_id', userProfile.enterprise_id)
          .order('created_at', { ascending: false })
          .range(request.params.offset, request.params.offset + request.params.limit - 1);

        const { data: contracts, error: queryError } = await query;

        if (queryError) {
          throw new Error(`Failed to get extraction jobs: ${queryError.message}`);
        }

        result = {
          contracts: contracts || [],
          total: contracts?.length || 0,
        };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 400,
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[Line Item Extraction] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
