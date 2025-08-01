/**
 * Web Worker for heavy analytics computations
 * Handles complex calculations off the main thread
 */

// Calculate contract statistics
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'CALCULATE_STATS':
      const stats = await calculateContractStats(data.contracts);
      self.postMessage({ type: 'STATS_RESULT', data: stats });
      break;

    case 'ANALYZE_SPEND':
      const spendAnalysis = await analyzeSpending(data.contracts, data.vendors);
      self.postMessage({ type: 'SPEND_RESULT', data: spendAnalysis });
      break;

    case 'CALCULATE_RISK':
      const riskAnalysis = await calculateRiskScores(data.contracts, data.vendors);
      self.postMessage({ type: 'RISK_RESULT', data: riskAnalysis });
      break;

    case 'GENERATE_FORECAST':
      const forecast = await generateForecast(data.historicalData);
      self.postMessage({ type: 'FORECAST_RESULT', data: forecast });
      break;

    case 'PROCESS_BULK_DATA':
      const processed = await processBulkData(data.items, data.operation);
      self.postMessage({ type: 'BULK_RESULT', data: processed });
      break;

    default:
      self.postMessage({ type: 'ERROR', error: 'Unknown operation' });
  }
});

/**
 * Calculate comprehensive contract statistics
 */
async function calculateContractStats(contracts) {
  const stats = {
    total: contracts.length,
    byStatus: {},
    byType: {},
    byValue: {
      total: 0,
      average: 0,
      median: 0,
      distribution: []
    },
    timeline: {},
    expiring: {
      next7Days: 0,
      next30Days: 0,
      next90Days: 0
    },
    health: {
      score: 100,
      issues: []
    }
  };

  const now = new Date();
  const values = [];

  contracts.forEach(contract => {
    // Status distribution
    stats.byStatus[contract.status] = (stats.byStatus[contract.status] || 0) + 1;

    // Type distribution
    if (contract.contractType) {
      stats.byType[contract.contractType] = (stats.byType[contract.contractType] || 0) + 1;
    }

    // Value calculations
    if (contract.extractedPricing) {
      const value = parseFloat(contract.extractedPricing.replace(/[^0-9.-]/g, '') || '0');
      if (!isNaN(value) && value > 0) {
        values.push(value);
        stats.byValue.total += value;
      }
    }

    // Expiration analysis
    if (contract.extractedEndDate) {
      const endDate = new Date(contract.extractedEndDate);
      const daysUntilExpiry = Math.floor((endDate - now) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry >= 0) {
        if (daysUntilExpiry <= 7) stats.expiring.next7Days++;
        if (daysUntilExpiry <= 30) stats.expiring.next30Days++;
        if (daysUntilExpiry <= 90) stats.expiring.next90Days++;
      }

      // Timeline distribution
      const monthKey = endDate.toISOString().slice(0, 7);
      stats.timeline[monthKey] = (stats.timeline[monthKey] || 0) + 1;
    }

    // Health checks
    if (contract.status === 'expired' && !contract.renewalId) {
      stats.health.score -= 5;
      stats.health.issues.push({
        type: 'expired_without_renewal',
        contractId: contract._id,
        severity: 'high'
      });
    }

    if (!contract.analysisStatus || contract.analysisStatus === 'pending') {
      stats.health.score -= 2;
      stats.health.issues.push({
        type: 'unanalyzed_contract',
        contractId: contract._id,
        severity: 'medium'
      });
    }
  });

  // Calculate value statistics
  if (values.length > 0) {
    stats.byValue.average = stats.byValue.total / values.length;
    values.sort((a, b) => a - b);
    stats.byValue.median = values[Math.floor(values.length / 2)];
    
    // Value distribution buckets
    const buckets = [0, 10000, 50000, 100000, 500000, 1000000, Infinity];
    stats.byValue.distribution = buckets.slice(0, -1).map((min, i) => {
      const max = buckets[i + 1];
      const count = values.filter(v => v >= min && v < max).length;
      return {
        range: `${formatCurrency(min)}-${max === Infinity ? '+' : formatCurrency(max)}`,
        count,
        percentage: (count / values.length) * 100
      };
    });
  }

  stats.health.score = Math.max(0, stats.health.score);

  return stats;
}

/**
 * Analyze spending patterns
 */
async function analyzeSpending(contracts, vendors) {
  const analysis = {
    totalSpend: 0,
    byVendor: {},
    byCategory: {},
    byDepartment: {},
    trends: {
      monthly: {},
      quarterly: {},
      yearly: {}
    },
    opportunities: [],
    forecast: {
      nextMonth: 0,
      nextQuarter: 0,
      nextYear: 0
    }
  };

  // Create vendor map for quick lookup
  const vendorMap = new Map(vendors.map(v => [v._id, v]));

  // Process contracts
  contracts.forEach(contract => {
    if (!contract.extractedPricing || contract.status !== 'active') return;

    const value = parseFloat(contract.extractedPricing.replace(/[^0-9.-]/g, '') || '0');
    if (isNaN(value) || value <= 0) return;

    analysis.totalSpend += value;

    // By vendor
    const vendor = vendorMap.get(contract.vendorId);
    if (vendor) {
      if (!analysis.byVendor[vendor._id]) {
        analysis.byVendor[vendor._id] = {
          name: vendor.name,
          amount: 0,
          contracts: 0,
          category: vendor.category
        };
      }
      analysis.byVendor[vendor._id].amount += value;
      analysis.byVendor[vendor._id].contracts++;

      // By category
      const category = vendor.category || 'other';
      analysis.byCategory[category] = (analysis.byCategory[category] || 0) + value;
    }

    // By department (if available)
    if (contract.department) {
      analysis.byDepartment[contract.department] = 
        (analysis.byDepartment[contract.department] || 0) + value;
    }

    // Monthly trends (assuming annual contracts)
    const monthlyValue = value / 12;
    const startDate = new Date(contract.extractedStartDate || contract._creationTime);
    const endDate = new Date(contract.extractedEndDate || new Date());
    
    for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
      const monthKey = d.toISOString().slice(0, 7);
      analysis.trends.monthly[monthKey] = 
        (analysis.trends.monthly[monthKey] || 0) + monthlyValue;
    }
  });

  // Identify savings opportunities
  Object.entries(analysis.byVendor).forEach(([vendorId, data]) => {
    // High spend vendors
    if (data.amount > analysis.totalSpend * 0.1) {
      analysis.opportunities.push({
        type: 'high_spend_vendor',
        vendorId,
        vendorName: data.name,
        amount: data.amount,
        potential_savings: data.amount * 0.05, // 5% negotiation target
        recommendation: 'Consider renegotiating terms or exploring alternatives'
      });
    }

    // Multiple contracts with same vendor
    if (data.contracts > 3) {
      analysis.opportunities.push({
        type: 'consolidation_opportunity',
        vendorId,
        vendorName: data.name,
        contracts: data.contracts,
        potential_savings: data.amount * 0.03, // 3% from consolidation
        recommendation: 'Consolidate contracts for better pricing'
      });
    }
  });

  // Category concentration
  Object.entries(analysis.byCategory).forEach(([category, amount]) => {
    if (amount > analysis.totalSpend * 0.3) {
      analysis.opportunities.push({
        type: 'category_concentration',
        category,
        amount,
        percentage: (amount / analysis.totalSpend) * 100,
        recommendation: 'High concentration in category - consider diversification'
      });
    }
  });

  // Simple forecasting based on trends
  const recentMonths = Object.entries(analysis.trends.monthly)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 3);
  
  if (recentMonths.length > 0) {
    const avgMonthly = recentMonths.reduce((sum, [, value]) => sum + value, 0) / recentMonths.length;
    analysis.forecast.nextMonth = avgMonthly;
    analysis.forecast.nextQuarter = avgMonthly * 3;
    analysis.forecast.nextYear = avgMonthly * 12;
  }

  return analysis;
}

/**
 * Calculate risk scores
 */
async function calculateRiskScores(contracts, vendors) {
  const risks = {
    overall: 0,
    byCategory: {
      financial: 0,
      operational: 0,
      compliance: 0,
      vendor: 0
    },
    items: [],
    heatMap: {}
  };

  const vendorMap = new Map(vendors.map(v => [v._id, v]));
  const vendorRisks = new Map();

  contracts.forEach(contract => {
    let contractRisk = 0;
    const riskFactors = [];

    // Financial risks
    if (contract.extractedPricing) {
      const value = parseFloat(contract.extractedPricing.replace(/[^0-9.-]/g, '') || '0');
      if (value > 1000000) {
        contractRisk += 30;
        riskFactors.push({ type: 'high_value', score: 30 });
        risks.byCategory.financial += 30;
      } else if (value > 500000) {
        contractRisk += 20;
        riskFactors.push({ type: 'significant_value', score: 20 });
        risks.byCategory.financial += 20;
      }
    }

    // Operational risks
    if (contract.status === 'expired') {
      contractRisk += 40;
      riskFactors.push({ type: 'expired_contract', score: 40 });
      risks.byCategory.operational += 40;
    } else if (contract.extractedEndDate) {
      const daysUntilExpiry = Math.floor(
        (new Date(contract.extractedEndDate) - new Date()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilExpiry < 30 && daysUntilExpiry >= 0) {
        contractRisk += 25;
        riskFactors.push({ type: 'expiring_soon', score: 25 });
        risks.byCategory.operational += 25;
      }
    }

    // Compliance risks
    if (!contract.analysisStatus || contract.analysisStatus === 'pending') {
      contractRisk += 15;
      riskFactors.push({ type: 'unreviewed', score: 15 });
      risks.byCategory.compliance += 15;
    }

    // Vendor risks
    const vendor = vendorMap.get(contract.vendorId);
    if (vendor) {
      const currentVendorRisk = vendorRisks.get(vendor._id) || 0;
      vendorRisks.set(vendor._id, currentVendorRisk + contractRisk);
      
      if (vendor.riskLevel === 'high') {
        contractRisk += 20;
        riskFactors.push({ type: 'high_risk_vendor', score: 20 });
        risks.byCategory.vendor += 20;
      }
    }

    if (contractRisk > 0) {
      risks.items.push({
        contractId: contract._id,
        contractTitle: contract.title,
        totalRisk: contractRisk,
        factors: riskFactors,
        severity: contractRisk > 60 ? 'critical' : contractRisk > 30 ? 'high' : 'medium'
      });
    }

    risks.overall += contractRisk;
  });

  // Normalize scores
  const contractCount = contracts.length || 1;
  risks.overall = Math.round(risks.overall / contractCount);
  Object.keys(risks.byCategory).forEach(cat => {
    risks.byCategory[cat] = Math.round(risks.byCategory[cat] / contractCount);
  });

  // Sort items by risk
  risks.items.sort((a, b) => b.totalRisk - a.totalRisk);

  // Create heat map data
  risks.heatMap = {
    vendors: Array.from(vendorRisks.entries())
      .map(([vendorId, risk]) => ({
        vendorId,
        vendorName: vendorMap.get(vendorId)?.name || 'Unknown',
        risk: Math.round(risk / contracts.filter(c => c.vendorId === vendorId).length)
      }))
      .sort((a, b) => b.risk - a.risk)
      .slice(0, 10)
  };

  return risks;
}

/**
 * Generate forecast based on historical data
 */
async function generateForecast(historicalData) {
  // Simple linear regression for forecasting
  const { contracts, period = 12 } = historicalData;
  
  // Group contracts by month
  const monthlyData = {};
  contracts.forEach(contract => {
    const month = new Date(contract._creationTime).toISOString().slice(0, 7);
    monthlyData[month] = (monthlyData[month] || 0) + 1;
  });

  // Convert to array and sort
  const dataPoints = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count], index) => ({ x: index, y: count, month }));

  if (dataPoints.length < 3) {
    return { error: 'Insufficient data for forecasting' };
  }

  // Calculate linear regression
  const n = dataPoints.length;
  const sumX = dataPoints.reduce((sum, p) => sum + p.x, 0);
  const sumY = dataPoints.reduce((sum, p) => sum + p.y, 0);
  const sumXY = dataPoints.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumXX = dataPoints.reduce((sum, p) => sum + p.x * p.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Generate forecast
  const forecast = [];
  const lastIndex = dataPoints[dataPoints.length - 1].x;
  const lastMonth = new Date(dataPoints[dataPoints.length - 1].month);

  for (let i = 1; i <= period; i++) {
    const forecastDate = new Date(lastMonth);
    forecastDate.setMonth(forecastDate.getMonth() + i);
    const monthStr = forecastDate.toISOString().slice(0, 7);
    
    const predictedValue = Math.max(0, Math.round(intercept + slope * (lastIndex + i)));
    forecast.push({
      month: monthStr,
      predicted: predictedValue,
      confidence: Math.max(0.5, 1 - (i * 0.05)) // Confidence decreases over time
    });
  }

  return {
    historical: dataPoints,
    forecast,
    trend: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable',
    metrics: {
      slope,
      intercept,
      r_squared: calculateRSquared(dataPoints, slope, intercept)
    }
  };
}

/**
 * Process bulk data operations
 */
async function processBulkData(items, operation) {
  const results = {
    processed: 0,
    failed: 0,
    results: [],
    errors: []
  };

  const batchSize = 100;
  const batches = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        try {
          let result;
          switch (operation) {
            case 'validate':
              result = await validateItem(item);
              break;
            case 'enrich':
              result = await enrichItem(item);
              break;
            case 'transform':
              result = await transformItem(item);
              break;
            default:
              throw new Error('Unknown operation');
          }
          results.processed++;
          return { success: true, data: result };
        } catch (error) {
          results.failed++;
          results.errors.push({ item: item.id, error: error.message });
          return { success: false, error: error.message };
        }
      })
    );
    
    results.results.push(...batchResults);
    
    // Report progress
    self.postMessage({
      type: 'PROGRESS',
      data: {
        processed: results.processed,
        total: items.length,
        percentage: (results.processed / items.length) * 100
      }
    });
  }

  return results;
}

// Helper functions
function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function calculateRSquared(dataPoints, slope, intercept) {
  const meanY = dataPoints.reduce((sum, p) => sum + p.y, 0) / dataPoints.length;
  const ssTotal = dataPoints.reduce((sum, p) => sum + Math.pow(p.y - meanY, 2), 0);
  const ssResidual = dataPoints.reduce((sum, p) => {
    const predicted = intercept + slope * p.x;
    return sum + Math.pow(p.y - predicted, 2);
  }, 0);
  return 1 - (ssResidual / ssTotal);
}

async function validateItem(item) {
  // Validation logic
  return { ...item, validated: true };
}

async function enrichItem(item) {
  // Enrichment logic
  return { ...item, enriched: true };
}

async function transformItem(item) {
  // Transformation logic
  return { ...item, transformed: true };
}