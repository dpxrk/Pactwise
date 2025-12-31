import { BaseAgent, ProcessingResult, Insight, AgentContext } from './base.ts';

// Tariff-specific interfaces
interface TariffAgentContext extends AgentContext {
  contractId?: string;
  lineItemId?: string;
  analysisType?: 'contract' | 'line_item' | 'enterprise' | 'classification';
}

interface TariffRiskAssessment {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  totalExposure: number;
  exposurePercentage: number;
  topCountries: Array<{ country: string; exposure: number }>;
  recommendations: string[];
}

interface HTSClassification {
  lineItemId: string;
  itemName: string;
  suggestedCode: string | null;
  confidence: number;
  method: string;
  needsReview: boolean;
}

interface TariffAnalysisResult {
  summary: {
    totalTariffExposure: number;
    itemsAnalyzed: number;
    itemsWithHTS: number;
    itemsNeedingClassification: number;
    riskLevel: string;
  };
  riskAssessment: TariffRiskAssessment;
  classifications: HTSClassification[];
  countryBreakdown: Array<{
    country: string;
    countryName: string;
    itemCount: number;
    totalValue: number;
    totalTariff: number;
    avgRate: number;
  }>;
  recommendations: string[];
  optimizationOpportunities: Array<{
    type: string;
    description: string;
    potentialSavings: number;
    effort: 'low' | 'medium' | 'high';
  }>;
}

interface ContractLineItem {
  id: string;
  item_name: string;
  item_description: string | null;
  hts_code: string | null;
  origin_country: string | null;
  origin_country_name: string | null;
  is_usmca_qualifying: boolean;
  total_price: number;
  tariff_rate: number | null;
  tariff_cost: number | null;
}

export class TariffAgent extends BaseAgent {
  get agentType() {
    return 'tariff';
  }

  get capabilities() {
    return [
      'tariff_calculation',
      'hts_classification',
      'tariff_risk_assessment',
      'tariff_optimization',
      'compliance_checking',
    ];
  }

  async process(
    data: { contractId?: string; lineItemIds?: string[] },
    context?: TariffAgentContext
  ): Promise<ProcessingResult<TariffAnalysisResult>> {
    const rulesApplied: string[] = [];
    const insights: Insight[] = [];

    try {
      const contractId = context?.contractId || data.contractId;

      if (!contractId) {
        return this.createResult(
          false,
          this.getEmptyResult(),
          insights,
          rulesApplied,
          0,
          { error: 'Contract ID is required' }
        );
      }

      // Analyze tariffs for the contract
      return await this.analyzeContractTariffs(contractId, context!, rulesApplied, insights);

    } catch (error) {
      return this.createResult(
        false,
        this.getEmptyResult(),
        insights,
        rulesApplied,
        0,
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  private async analyzeContractTariffs(
    contractId: string,
    context: TariffAgentContext,
    rulesApplied: string[],
    insights: Insight[]
  ): Promise<ProcessingResult<TariffAnalysisResult>> {
    rulesApplied.push('tariff_analysis');

    // Get contract and line items
    const { data: contract, error: contractError } = await this.supabase
      .from('contracts')
      .select('id, title, value, total_tariff_exposure, tariff_risk_level')
      .eq('id', contractId)
      .eq('enterprise_id', this.enterpriseId)
      .single();

    if (contractError || !contract) {
      return this.createResult(
        false,
        this.getEmptyResult(),
        insights,
        rulesApplied,
        0,
        { error: 'Contract not found' }
      );
    }

    // Get line items
    const { data: lineItems, error: lineItemsError } = await this.supabase
      .from('contract_line_items')
      .select('*')
      .eq('contract_id', contractId);

    if (lineItemsError) {
      throw lineItemsError;
    }

    const items = (lineItems || []) as ContractLineItem[];

    // Classify items that need HTS codes
    const classifications = await this.classifyItems(items, rulesApplied);

    // Calculate tariffs for items with HTS codes
    await this.calculateTariffs(items, rulesApplied);

    // Get country breakdown
    const countryBreakdown = await this.getCountryBreakdown(contractId);

    // Assess risk
    const riskAssessment = this.assessTariffRisk(items, contract.value || 0);

    // Identify optimization opportunities
    const optimizations = this.identifyOptimizations(items, countryBreakdown);

    // Generate recommendations
    const recommendations = this.generateRecommendations(riskAssessment, classifications, optimizations);

    // Build result
    const result: TariffAnalysisResult = {
      summary: {
        totalTariffExposure: items.reduce((sum, i) => sum + (i.tariff_cost || 0), 0),
        itemsAnalyzed: items.length,
        itemsWithHTS: items.filter(i => i.hts_code).length,
        itemsNeedingClassification: items.filter(i => !i.hts_code && i.origin_country).length,
        riskLevel: riskAssessment.riskLevel,
      },
      riskAssessment,
      classifications,
      countryBreakdown,
      recommendations,
      optimizationOpportunities: optimizations,
    };

    // Generate insights
    this.generateInsights(result, insights, rulesApplied);

    // Update contract tariff summary
    await this.supabase.rpc('calculate_contract_tariff_totals', {
      p_contract_id: contractId,
    });

    return this.createResult(
      true,
      result,
      insights,
      rulesApplied,
      0.85
    );
  }

  private async classifyItems(
    items: ContractLineItem[],
    rulesApplied: string[]
  ): Promise<HTSClassification[]> {
    rulesApplied.push('hts_classification');

    const classifications: HTSClassification[] = [];

    // Items that need classification (have origin but no HTS code)
    const needsClassification = items.filter(i => i.origin_country && !i.hts_code);

    for (const item of needsClassification) {
      // Use text search to find potential HTS codes
      const { data: matches } = await this.supabase.rpc('search_hts_codes_by_text', {
        p_query: item.item_name,
        p_limit: 3,
      });

      if (matches && matches.length > 0) {
        const bestMatch = matches[0];
        classifications.push({
          lineItemId: item.id,
          itemName: item.item_name,
          suggestedCode: bestMatch.code,
          confidence: 0.6, // Text search has lower confidence
          method: 'text_search',
          needsReview: true,
        });
      } else {
        classifications.push({
          lineItemId: item.id,
          itemName: item.item_name,
          suggestedCode: null,
          confidence: 0,
          method: 'none',
          needsReview: true,
        });
      }
    }

    return classifications;
  }

  private async calculateTariffs(
    items: ContractLineItem[],
    rulesApplied: string[]
  ): Promise<void> {
    rulesApplied.push('tariff_calculation');

    // Items that have HTS code and origin country but no tariff calculated
    const needsCalculation = items.filter(
      i => i.hts_code && i.origin_country && !i.tariff_cost
    );

    for (const item of needsCalculation) {
      await this.supabase.rpc('calculate_line_item_tariff', {
        p_line_item_id: item.id,
      });
    }
  }

  private async getCountryBreakdown(
    contractId: string
  ): Promise<TariffAnalysisResult['countryBreakdown']> {
    const { data } = await this.supabase.rpc('get_contract_tariff_by_country', {
      p_contract_id: contractId,
    });

    return (data || []).map((row: {
      origin_country: string;
      origin_country_name: string;
      item_count: number;
      total_value: number;
      total_tariff_cost: number;
      avg_tariff_rate: number;
    }) => ({
      country: row.origin_country,
      countryName: row.origin_country_name || row.origin_country,
      itemCount: row.item_count,
      totalValue: row.total_value,
      totalTariff: row.total_tariff_cost,
      avgRate: row.avg_tariff_rate,
    }));
  }

  private assessTariffRisk(
    items: ContractLineItem[],
    contractValue: number
  ): TariffRiskAssessment {
    const totalExposure = items.reduce((sum, i) => sum + (i.tariff_cost || 0), 0);
    const exposurePercentage = contractValue > 0 ? (totalExposure / contractValue) * 100 : 0;

    // Determine risk level
    let riskLevel: TariffRiskAssessment['riskLevel'];
    if (exposurePercentage > 25) {
      riskLevel = 'critical';
    } else if (exposurePercentage > 15) {
      riskLevel = 'high';
    } else if (exposurePercentage > 5) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    // Group by country
    const byCountry = new Map<string, number>();
    for (const item of items) {
      if (item.origin_country && item.tariff_cost) {
        const current = byCountry.get(item.origin_country) || 0;
        byCountry.set(item.origin_country, current + item.tariff_cost);
      }
    }

    const topCountries = Array.from(byCountry.entries())
      .map(([country, exposure]) => ({ country, exposure }))
      .sort((a, b) => b.exposure - a.exposure)
      .slice(0, 5);

    // Generate recommendations based on risk
    const recommendations: string[] = [];
    if (riskLevel === 'critical' || riskLevel === 'high') {
      recommendations.push('Review sourcing strategy to reduce tariff exposure');
      recommendations.push('Evaluate alternative suppliers from lower-tariff countries');
    }
    if (topCountries.length > 0 && topCountries[0].exposure > totalExposure * 0.5) {
      recommendations.push(`Diversify away from ${topCountries[0].country} to reduce concentration risk`);
    }

    return {
      riskLevel,
      totalExposure,
      exposurePercentage,
      topCountries,
      recommendations,
    };
  }

  private identifyOptimizations(
    items: ContractLineItem[],
    countryBreakdown: TariffAnalysisResult['countryBreakdown']
  ): TariffAnalysisResult['optimizationOpportunities'] {
    const optimizations: TariffAnalysisResult['optimizationOpportunities'] = [];

    // USMCA opportunity
    const nonUSMCANAFTAItems = items.filter(
      i => ['CA', 'MX'].includes(i.origin_country || '') && !i.is_usmca_qualifying
    );
    if (nonUSMCANAFTAItems.length > 0) {
      const potentialSavings = nonUSMCANAFTAItems.reduce(
        (sum, i) => sum + (i.tariff_cost || 0),
        0
      );
      if (potentialSavings > 0) {
        optimizations.push({
          type: 'usmca_qualification',
          description: `${nonUSMCANAFTAItems.length} items from Canada/Mexico may qualify for USMCA duty-free treatment`,
          potentialSavings,
          effort: 'medium',
        });
      }
    }

    // High-tariff country concentration
    const highTariffCountries = countryBreakdown.filter(c => c.avgRate > 20);
    for (const country of highTariffCountries) {
      if (country.totalTariff > 10000) {
        optimizations.push({
          type: 'supplier_diversification',
          description: `Consider alternative suppliers to reduce ${country.countryName} exposure (${country.avgRate.toFixed(1)}% avg tariff)`,
          potentialSavings: country.totalTariff * 0.3, // Assume 30% reduction possible
          effort: 'high',
        });
      }
    }

    return optimizations;
  }

  private generateRecommendations(
    riskAssessment: TariffRiskAssessment,
    classifications: HTSClassification[],
    optimizations: TariffAnalysisResult['optimizationOpportunities']
  ): string[] {
    const recommendations: string[] = [];

    // Risk-based recommendations
    recommendations.push(...riskAssessment.recommendations);

    // Classification recommendations
    const needsReview = classifications.filter(c => c.needsReview);
    if (needsReview.length > 0) {
      recommendations.push(
        `Review and confirm HTS classifications for ${needsReview.length} items`
      );
    }

    const noMatch = classifications.filter(c => !c.suggestedCode);
    if (noMatch.length > 0) {
      recommendations.push(
        `Manually classify ${noMatch.length} items that couldn't be auto-matched`
      );
    }

    // Optimization recommendations
    for (const opt of optimizations.slice(0, 3)) {
      recommendations.push(opt.description);
    }

    return recommendations;
  }

  private generateInsights(
    result: TariffAnalysisResult,
    insights: Insight[],
    rulesApplied: string[]
  ): void {
    // High risk insight
    if (result.riskAssessment.riskLevel === 'critical' || result.riskAssessment.riskLevel === 'high') {
      insights.push(this.createInsight(
        'high_tariff_exposure',
        result.riskAssessment.riskLevel === 'critical' ? 'critical' : 'high',
        'High Tariff Exposure',
        `Tariffs represent ${result.riskAssessment.exposurePercentage.toFixed(1)}% of contract value ($${result.riskAssessment.totalExposure.toLocaleString()})`,
        'Review sourcing strategy and explore optimization opportunities',
        { exposure: result.riskAssessment.totalExposure }
      ));
      rulesApplied.push('high_exposure_alert');
    }

    // Country concentration insight
    if (result.riskAssessment.topCountries.length > 0) {
      const topCountry = result.riskAssessment.topCountries[0];
      const concentration = (topCountry.exposure / result.riskAssessment.totalExposure) * 100;
      if (concentration > 50) {
        insights.push(this.createInsight(
          'country_concentration',
          'medium',
          'Tariff Country Concentration',
          `${concentration.toFixed(0)}% of tariff exposure is from ${topCountry.country}`,
          'Consider supplier diversification',
          { country: topCountry.country, concentration }
        ));
        rulesApplied.push('concentration_analysis');
      }
    }

    // Missing classifications insight
    if (result.summary.itemsNeedingClassification > 0) {
      insights.push(this.createInsight(
        'missing_hts_codes',
        'medium',
        'Items Need HTS Classification',
        `${result.summary.itemsNeedingClassification} items have origin country but no HTS code`,
        'Complete HTS classification to enable accurate tariff calculations',
        { count: result.summary.itemsNeedingClassification }
      ));
      rulesApplied.push('classification_check');
    }

    // Optimization opportunities insight
    const highValueOptimizations = result.optimizationOpportunities.filter(
      o => o.potentialSavings > 5000
    );
    if (highValueOptimizations.length > 0) {
      const totalSavings = highValueOptimizations.reduce(
        (sum, o) => sum + o.potentialSavings,
        0
      );
      insights.push(this.createInsight(
        'optimization_opportunity',
        'low',
        'Tariff Optimization Available',
        `Potential savings of $${totalSavings.toLocaleString()} identified`,
        'Review optimization recommendations to reduce tariff costs',
        { opportunities: highValueOptimizations.length, savings: totalSavings }
      ));
      rulesApplied.push('optimization_analysis');
    }
  }

  private getEmptyResult(): TariffAnalysisResult {
    return {
      summary: {
        totalTariffExposure: 0,
        itemsAnalyzed: 0,
        itemsWithHTS: 0,
        itemsNeedingClassification: 0,
        riskLevel: 'unknown',
      },
      riskAssessment: {
        riskLevel: 'low',
        totalExposure: 0,
        exposurePercentage: 0,
        topCountries: [],
        recommendations: [],
      },
      classifications: [],
      countryBreakdown: [],
      recommendations: [],
      optimizationOpportunities: [],
    };
  }
}
