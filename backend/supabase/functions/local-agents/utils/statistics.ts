/**
 * Advanced Statistics Utilities for Pactwise Agent System
 *
 * Phase 2 NLP/ML enhancements including:
 * - STL Decomposition (Seasonal-Trend decomposition using Loess)
 * - Decision Tree Induction with Information Gain
 * - Exponential Smoothing (Holt-Winters)
 * - Additional statistical utilities
 *
 * @module statistics
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

export interface STLDecomposition {
  trend: number[];
  seasonal: number[];
  residual: number[];
  seasonalStrength: number;
  trendStrength: number;
  period: number;
}

export interface SeasonalForecast {
  predictions: number[];
  dates: string[];
  confidenceIntervals: Array<{ lower: number; upper: number }>;
  seasonalIndices: number[];
  method: string;
}

export interface DecisionTreeNode {
  feature?: string;
  threshold?: number;
  value?: string | number;
  left?: DecisionTreeNode;
  right?: DecisionTreeNode;
  isLeaf: boolean;
  samples: number;
  impurity: number;
  prediction?: string | number;
}

export interface DecisionTreeConfig {
  maxDepth?: number;
  minSamplesSplit?: number;
  minSamplesLeaf?: number;
  criterion?: 'gini' | 'entropy';
}

export interface ClassificationResult {
  prediction: string | number;
  confidence: number;
  path: string[];
}

export interface ExponentialSmoothingParams {
  alpha: number;  // Level smoothing
  beta?: number;  // Trend smoothing
  gamma?: number; // Seasonal smoothing
  seasonalPeriod?: number;
}

// ============================================================================
// STL DECOMPOSITION
// ============================================================================

/**
 * Simplified STL (Seasonal-Trend decomposition using Loess)
 * Based on Cleveland et al. (1990) algorithm
 */
export class STLDecomposer {
  private period: number;
  private robustIterations: number;

  constructor(period: number = 12, robustIterations: number = 2) {
    this.period = period;
    this.robustIterations = robustIterations;
  }

  /**
   * Decompose time series into trend, seasonal, and residual components
   */
  decompose(data: number[]): STLDecomposition {
    const n = data.length;

    if (n < this.period * 2) {
      // Not enough data for seasonal decomposition
      return this.simpleDecomposition(data);
    }

    // Step 1: Initial detrending using moving average
    const trend = this.extractTrend(data);

    // Step 2: Calculate detrended series
    const detrended = data.map((v, i) => v - trend[i]);

    // Step 3: Extract seasonal component
    const seasonal = this.extractSeasonal(detrended);

    // Step 4: Calculate residuals
    const residual = data.map((v, i) => v - trend[i] - seasonal[i]);

    // Step 5: Robustness iterations (refine estimates)
    let refinedTrend = trend;
    let refinedSeasonal = seasonal;
    let refinedResidual = residual;

    for (let iter = 0; iter < this.robustIterations; iter++) {
      // Recalculate with robust weights
      const weights = this.calculateRobustWeights(refinedResidual);
      const adjusted = data.map((v, i) => v - refinedSeasonal[i]);
      refinedTrend = this.loessSmooth(adjusted, weights, Math.floor(n * 0.3));

      const newDetrended = data.map((v, i) => v - refinedTrend[i]);
      refinedSeasonal = this.extractSeasonal(newDetrended);
      refinedResidual = data.map((v, i) => v - refinedTrend[i] - refinedSeasonal[i]);
    }

    // Calculate strength metrics
    const seasonalStrength = this.calculateSeasonalStrength(refinedResidual, refinedSeasonal);
    const trendStrength = this.calculateTrendStrength(refinedResidual, refinedTrend);

    return {
      trend: refinedTrend,
      seasonal: refinedSeasonal,
      residual: refinedResidual,
      seasonalStrength,
      trendStrength,
      period: this.period,
    };
  }

  /**
   * Simple decomposition for short series
   */
  private simpleDecomposition(data: number[]): STLDecomposition {
    const n = data.length;
    const mean = data.reduce((a, b) => a + b, 0) / n;

    // Simple linear trend
    const trend = this.extractTrend(data);
    const seasonal = new Array(n).fill(0);
    const residual = data.map((v, i) => v - trend[i]);

    return {
      trend,
      seasonal,
      residual,
      seasonalStrength: 0,
      trendStrength: this.calculateTrendStrength(residual, trend),
      period: this.period,
    };
  }

  /**
   * Extract trend using centered moving average
   */
  private extractTrend(data: number[]): number[] {
    const n = data.length;
    const halfWindow = Math.floor(this.period / 2);
    const trend = new Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      const start = Math.max(0, i - halfWindow);
      const end = Math.min(n, i + halfWindow + 1);
      const window = data.slice(start, end);
      trend[i] = window.reduce((a, b) => a + b, 0) / window.length;
    }

    return trend;
  }

  /**
   * Extract seasonal component by averaging across periods
   */
  private extractSeasonal(detrended: number[]): number[] {
    const n = detrended.length;
    const seasonalAverages = new Array(this.period).fill(0);
    const counts = new Array(this.period).fill(0);

    // Average values for each position in the period
    for (let i = 0; i < n; i++) {
      const pos = i % this.period;
      seasonalAverages[pos] += detrended[i];
      counts[pos]++;
    }

    for (let i = 0; i < this.period; i++) {
      seasonalAverages[i] /= counts[i] || 1;
    }

    // Center the seasonal component (mean = 0)
    const seasonalMean = seasonalAverages.reduce((a, b) => a + b, 0) / this.period;
    const centered = seasonalAverages.map(v => v - seasonalMean);

    // Extend to full series
    const seasonal = new Array(n);
    for (let i = 0; i < n; i++) {
      seasonal[i] = centered[i % this.period];
    }

    return seasonal;
  }

  /**
   * LOESS (Locally Estimated Scatterplot Smoothing)
   */
  private loessSmooth(data: number[], weights: number[], bandwidth: number): number[] {
    const n = data.length;
    const smoothed = new Array(n);

    for (let i = 0; i < n; i++) {
      let sumWeights = 0;
      let sumWeightedX = 0;
      let sumWeightedY = 0;
      let sumWeightedXY = 0;
      let sumWeightedX2 = 0;

      const halfBw = Math.floor(bandwidth / 2);
      const start = Math.max(0, i - halfBw);
      const end = Math.min(n, i + halfBw + 1);

      for (let j = start; j < end; j++) {
        const dist = Math.abs(i - j) / halfBw;
        const tricube = Math.pow(1 - Math.pow(dist, 3), 3);
        const w = weights[j] * tricube;

        sumWeights += w;
        sumWeightedX += w * j;
        sumWeightedY += w * data[j];
        sumWeightedXY += w * j * data[j];
        sumWeightedX2 += w * j * j;
      }

      // Weighted linear regression
      const denom = sumWeights * sumWeightedX2 - sumWeightedX * sumWeightedX;
      if (Math.abs(denom) < 1e-10) {
        smoothed[i] = sumWeightedY / (sumWeights || 1);
      } else {
        const b = (sumWeights * sumWeightedXY - sumWeightedX * sumWeightedY) / denom;
        const a = (sumWeightedY - b * sumWeightedX) / sumWeights;
        smoothed[i] = a + b * i;
      }
    }

    return smoothed;
  }

  /**
   * Calculate robust weights for outlier resistance
   */
  private calculateRobustWeights(residuals: number[]): number[] {
    const absResiduals = residuals.map(Math.abs);
    const sorted = [...absResiduals].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const mad = median * 1.4826; // Median Absolute Deviation

    return residuals.map(r => {
      const u = Math.abs(r) / (6 * mad);
      if (u >= 1) return 0;
      return Math.pow(1 - u * u, 2);
    });
  }

  /**
   * Calculate seasonal strength (0-1)
   */
  private calculateSeasonalStrength(residual: number[], seasonal: number[]): number {
    const varResidual = this.variance(residual);
    const varSeasonalResidual = this.variance(
      residual.map((r, i) => r + seasonal[i])
    );

    if (varSeasonalResidual === 0) return 0;
    return Math.max(0, 1 - varResidual / varSeasonalResidual);
  }

  /**
   * Calculate trend strength (0-1)
   */
  private calculateTrendStrength(residual: number[], trend: number[]): number {
    const varResidual = this.variance(residual);
    const varTrendResidual = this.variance(
      residual.map((r, i) => r + trend[i])
    );

    if (varTrendResidual === 0) return 0;
    return Math.max(0, 1 - varResidual / varTrendResidual);
  }

  /**
   * Calculate variance
   */
  private variance(data: number[]): number {
    const n = data.length;
    if (n === 0) return 0;
    const mean = data.reduce((a, b) => a + b, 0) / n;
    return data.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
  }

  /**
   * Forecast future values using the decomposition
   */
  forecast(
    data: number[],
    horizonDays: number,
    startDate: Date = new Date()
  ): SeasonalForecast {
    const decomposition = this.decompose(data);
    const n = data.length;

    // Extrapolate trend (linear)
    const trendSlope = (decomposition.trend[n - 1] - decomposition.trend[0]) / (n - 1);
    const lastTrend = decomposition.trend[n - 1];

    const predictions: number[] = [];
    const dates: string[] = [];
    const confidenceIntervals: Array<{ lower: number; upper: number }> = [];

    // Calculate residual standard error
    const residualStd = Math.sqrt(this.variance(decomposition.residual));

    for (let h = 1; h <= horizonDays; h++) {
      const futureDate = new Date(startDate);
      futureDate.setDate(futureDate.getDate() + h);
      dates.push(futureDate.toISOString().split('T')[0]);

      // Extrapolate trend
      const futureTrend = lastTrend + trendSlope * h;

      // Get seasonal component for this position
      const seasonalPos = (n + h - 1) % this.period;
      const futureSeasonal = decomposition.seasonal[seasonalPos] || 0;

      // Combine
      const prediction = futureTrend + futureSeasonal;
      predictions.push(Math.max(0, prediction));

      // Confidence interval (widens with horizon)
      const uncertainty = residualStd * Math.sqrt(1 + h / n);
      confidenceIntervals.push({
        lower: Math.max(0, prediction - 1.96 * uncertainty),
        upper: prediction + 1.96 * uncertainty,
      });
    }

    // Get seasonal indices for reference
    const seasonalIndices: number[] = [];
    for (let i = 0; i < this.period; i++) {
      seasonalIndices.push(decomposition.seasonal[i]);
    }

    return {
      predictions,
      dates,
      confidenceIntervals,
      seasonalIndices,
      method: 'STL Decomposition',
    };
  }
}

// ============================================================================
// EXPONENTIAL SMOOTHING (HOLT-WINTERS)
// ============================================================================

/**
 * Triple Exponential Smoothing (Holt-Winters) for seasonal forecasting
 */
export class HoltWinters {
  private alpha: number;
  private beta: number;
  private gamma: number;
  private seasonalPeriod: number;

  constructor(params: ExponentialSmoothingParams) {
    this.alpha = params.alpha;
    this.beta = params.beta || 0;
    this.gamma = params.gamma || 0;
    this.seasonalPeriod = params.seasonalPeriod || 12;
  }

  /**
   * Fit the model and generate forecasts
   */
  forecast(data: number[], horizonDays: number): SeasonalForecast {
    const n = data.length;
    const m = this.seasonalPeriod;

    if (n < m * 2) {
      // Fall back to simple exponential smoothing
      return this.simpleExponentialSmoothing(data, horizonDays);
    }

    // Initialize components
    let level = data.slice(0, m).reduce((a, b) => a + b, 0) / m;
    let trend = (data.slice(m, 2 * m).reduce((a, b) => a + b, 0) -
      data.slice(0, m).reduce((a, b) => a + b, 0)) / (m * m);

    const seasonals: number[] = [];
    for (let i = 0; i < m; i++) {
      seasonals.push(data[i] / level);
    }

    // Fit model
    const smoothedLevel: number[] = [level];
    const smoothedTrend: number[] = [trend];
    const smoothedSeasonal: number[][] = [seasonals.slice()];

    for (let t = m; t < n; t++) {
      const seasonIdx = t % m;
      const prevLevel = level;
      const prevTrend = trend;

      // Update level
      level = this.alpha * (data[t] / seasonals[seasonIdx]) +
        (1 - this.alpha) * (prevLevel + prevTrend);

      // Update trend
      trend = this.beta * (level - prevLevel) + (1 - this.beta) * prevTrend;

      // Update seasonal
      seasonals[seasonIdx] = this.gamma * (data[t] / level) +
        (1 - this.gamma) * seasonals[seasonIdx];

      smoothedLevel.push(level);
      smoothedTrend.push(trend);
      smoothedSeasonal.push(seasonals.slice());
    }

    // Generate forecasts
    const predictions: number[] = [];
    const dates: string[] = [];
    const confidenceIntervals: Array<{ lower: number; upper: number }> = [];
    const startDate = new Date();

    // Calculate residual standard error
    const fitted = data.map((_, t) => {
      if (t < m) return data[t];
      const idx = Math.min(t - m, smoothedLevel.length - 1);
      return (smoothedLevel[idx] + smoothedTrend[idx]) * smoothedSeasonal[idx][t % m];
    });
    const residuals = data.map((v, t) => v - fitted[t]);
    const residualStd = Math.sqrt(
      residuals.slice(m).reduce((sum, r) => sum + r * r, 0) / (n - m)
    );

    for (let h = 1; h <= horizonDays; h++) {
      const futureDate = new Date(startDate);
      futureDate.setDate(futureDate.getDate() + h);
      dates.push(futureDate.toISOString().split('T')[0]);

      const seasonIdx = (n - 1 + h) % m;
      const prediction = (level + h * trend) * seasonals[seasonIdx];
      predictions.push(Math.max(0, prediction));

      const uncertainty = residualStd * Math.sqrt(h);
      confidenceIntervals.push({
        lower: Math.max(0, prediction - 1.96 * uncertainty),
        upper: prediction + 1.96 * uncertainty,
      });
    }

    return {
      predictions,
      dates,
      confidenceIntervals,
      seasonalIndices: seasonals,
      method: 'Holt-Winters Triple Exponential Smoothing',
    };
  }

  /**
   * Simple exponential smoothing for short series
   */
  private simpleExponentialSmoothing(data: number[], horizon: number): SeasonalForecast {
    const n = data.length;
    let level = data[0];

    for (let t = 1; t < n; t++) {
      level = this.alpha * data[t] + (1 - this.alpha) * level;
    }

    const predictions = new Array(horizon).fill(level);
    const dates: string[] = [];
    const startDate = new Date();

    const residuals = data.map((v, t) => {
      let l = data[0];
      for (let i = 1; i <= t; i++) {
        l = this.alpha * data[i] + (1 - this.alpha) * l;
      }
      return v - l;
    });
    const residualStd = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / n);

    const confidenceIntervals: Array<{ lower: number; upper: number }> = [];

    for (let h = 1; h <= horizon; h++) {
      const futureDate = new Date(startDate);
      futureDate.setDate(futureDate.getDate() + h);
      dates.push(futureDate.toISOString().split('T')[0]);

      const uncertainty = residualStd * Math.sqrt(h);
      confidenceIntervals.push({
        lower: Math.max(0, level - 1.96 * uncertainty),
        upper: level + 1.96 * uncertainty,
      });
    }

    return {
      predictions,
      dates,
      confidenceIntervals,
      seasonalIndices: [],
      method: 'Simple Exponential Smoothing',
    };
  }
}

// ============================================================================
// DECISION TREE INDUCTION
// ============================================================================

/**
 * Decision Tree Classifier with Information Gain
 * For automatic rule learning from historical decisions
 */
export class DecisionTree {
  private root: DecisionTreeNode | null = null;
  private config: Required<DecisionTreeConfig>;
  private featureNames: string[] = [];

  constructor(config: DecisionTreeConfig = {}) {
    this.config = {
      maxDepth: config.maxDepth ?? 10,
      minSamplesSplit: config.minSamplesSplit ?? 2,
      minSamplesLeaf: config.minSamplesLeaf ?? 1,
      criterion: config.criterion ?? 'gini',
    };
  }

  /**
   * Train the decision tree
   */
  fit(
    features: number[][],
    labels: (string | number)[],
    featureNames?: string[]
  ): void {
    this.featureNames = featureNames || features[0].map((_, i) => `feature_${i}`);
    this.root = this.buildTree(features, labels, 0);
  }

  /**
   * Predict class for new samples
   */
  predict(features: number[]): ClassificationResult {
    if (!this.root) {
      throw new Error('Tree has not been trained');
    }

    const path: string[] = [];
    let node = this.root;

    while (!node.isLeaf) {
      if (node.feature === undefined || node.threshold === undefined) break;

      const featureIdx = this.featureNames.indexOf(node.feature);
      const featureValue = features[featureIdx];

      if (featureValue <= node.threshold) {
        path.push(`${node.feature} <= ${node.threshold.toFixed(2)}`);
        node = node.left!;
      } else {
        path.push(`${node.feature} > ${node.threshold.toFixed(2)}`);
        node = node.right!;
      }
    }

    return {
      prediction: node.prediction!,
      confidence: 1 - node.impurity,
      path,
    };
  }

  /**
   * Get human-readable rules from the tree
   */
  getRules(): string[] {
    if (!this.root) return [];

    const rules: string[] = [];
    this.extractRules(this.root, [], rules);
    return rules;
  }

  /**
   * Build tree recursively
   */
  private buildTree(
    features: number[][],
    labels: (string | number)[],
    depth: number
  ): DecisionTreeNode {
    const n = features.length;
    const uniqueLabels = [...new Set(labels)];
    const impurity = this.calculateImpurity(labels);

    // Check stopping conditions
    if (
      depth >= this.config.maxDepth ||
      n < this.config.minSamplesSplit ||
      uniqueLabels.length === 1
    ) {
      return this.createLeaf(labels, impurity);
    }

    // Find best split
    const bestSplit = this.findBestSplit(features, labels);

    if (!bestSplit || bestSplit.gain <= 0) {
      return this.createLeaf(labels, impurity);
    }

    // Split data
    const leftIndices: number[] = [];
    const rightIndices: number[] = [];

    for (let i = 0; i < n; i++) {
      if (features[i][bestSplit.featureIdx] <= bestSplit.threshold) {
        leftIndices.push(i);
      } else {
        rightIndices.push(i);
      }
    }

    // Check minimum samples per leaf
    if (
      leftIndices.length < this.config.minSamplesLeaf ||
      rightIndices.length < this.config.minSamplesLeaf
    ) {
      return this.createLeaf(labels, impurity);
    }

    // Recurse
    const leftFeatures = leftIndices.map(i => features[i]);
    const leftLabels = leftIndices.map(i => labels[i]);
    const rightFeatures = rightIndices.map(i => features[i]);
    const rightLabels = rightIndices.map(i => labels[i]);

    return {
      feature: this.featureNames[bestSplit.featureIdx],
      threshold: bestSplit.threshold,
      left: this.buildTree(leftFeatures, leftLabels, depth + 1),
      right: this.buildTree(rightFeatures, rightLabels, depth + 1),
      isLeaf: false,
      samples: n,
      impurity,
    };
  }

  /**
   * Find the best split point
   */
  private findBestSplit(
    features: number[][],
    labels: (string | number)[]
  ): { featureIdx: number; threshold: number; gain: number } | null {
    const n = features.length;
    const numFeatures = features[0].length;
    const currentImpurity = this.calculateImpurity(labels);

    let bestGain = 0;
    let bestFeatureIdx = -1;
    let bestThreshold = 0;

    for (let f = 0; f < numFeatures; f++) {
      // Get unique values for this feature
      const values = [...new Set(features.map(row => row[f]))].sort((a, b) => a - b);

      // Try thresholds between consecutive values
      for (let i = 0; i < values.length - 1; i++) {
        const threshold = (values[i] + values[i + 1]) / 2;

        const leftLabels: (string | number)[] = [];
        const rightLabels: (string | number)[] = [];

        for (let j = 0; j < n; j++) {
          if (features[j][f] <= threshold) {
            leftLabels.push(labels[j]);
          } else {
            rightLabels.push(labels[j]);
          }
        }

        if (leftLabels.length === 0 || rightLabels.length === 0) continue;

        // Calculate information gain
        const leftImpurity = this.calculateImpurity(leftLabels);
        const rightImpurity = this.calculateImpurity(rightLabels);
        const weightedImpurity =
          (leftLabels.length / n) * leftImpurity +
          (rightLabels.length / n) * rightImpurity;
        const gain = currentImpurity - weightedImpurity;

        if (gain > bestGain) {
          bestGain = gain;
          bestFeatureIdx = f;
          bestThreshold = threshold;
        }
      }
    }

    if (bestFeatureIdx === -1) return null;

    return {
      featureIdx: bestFeatureIdx,
      threshold: bestThreshold,
      gain: bestGain,
    };
  }

  /**
   * Calculate impurity (Gini or Entropy)
   */
  private calculateImpurity(labels: (string | number)[]): number {
    const n = labels.length;
    if (n === 0) return 0;

    const counts = new Map<string | number, number>();
    for (const label of labels) {
      counts.set(label, (counts.get(label) || 0) + 1);
    }

    if (this.config.criterion === 'entropy') {
      // Information entropy
      let entropy = 0;
      for (const count of counts.values()) {
        const p = count / n;
        if (p > 0) {
          entropy -= p * Math.log2(p);
        }
      }
      return entropy;
    } else {
      // Gini impurity
      let gini = 1;
      for (const count of counts.values()) {
        const p = count / n;
        gini -= p * p;
      }
      return gini;
    }
  }

  /**
   * Create a leaf node
   */
  private createLeaf(labels: (string | number)[], impurity: number): DecisionTreeNode {
    const counts = new Map<string | number, number>();
    for (const label of labels) {
      counts.set(label, (counts.get(label) || 0) + 1);
    }

    let maxCount = 0;
    let prediction: string | number = labels[0];
    for (const [label, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        prediction = label;
      }
    }

    return {
      isLeaf: true,
      samples: labels.length,
      impurity,
      prediction,
    };
  }

  /**
   * Extract rules from tree
   */
  private extractRules(
    node: DecisionTreeNode,
    conditions: string[],
    rules: string[]
  ): void {
    if (node.isLeaf) {
      const rule = conditions.length > 0
        ? `IF ${conditions.join(' AND ')} THEN ${node.prediction}`
        : `DEFAULT: ${node.prediction}`;
      rules.push(rule);
      return;
    }

    if (node.feature && node.threshold !== undefined) {
      // Left branch
      this.extractRules(
        node.left!,
        [...conditions, `${node.feature} <= ${node.threshold.toFixed(2)}`],
        rules
      );

      // Right branch
      this.extractRules(
        node.right!,
        [...conditions, `${node.feature} > ${node.threshold.toFixed(2)}`],
        rules
      );
    }
  }

  /**
   * Export tree structure
   */
  getTree(): DecisionTreeNode | null {
    return this.root;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Detect optimal seasonal period from data
 */
export function detectSeasonalPeriod(data: number[]): number {
  const n = data.length;
  if (n < 8) return 1;

  // Try common periods
  const periods = [7, 12, 4, 30, 52, 365].filter(p => p < n / 2);
  let bestPeriod = 1;
  let bestAutocorr = 0;

  for (const period of periods) {
    const autocorr = calculateAutocorrelation(data, period);
    if (autocorr > bestAutocorr) {
      bestAutocorr = autocorr;
      bestPeriod = period;
    }
  }

  return bestAutocorr > 0.3 ? bestPeriod : 1;
}

/**
 * Calculate autocorrelation at a given lag
 */
export function calculateAutocorrelation(data: number[], lag: number): number {
  const n = data.length;
  if (lag >= n) return 0;

  const mean = data.reduce((a, b) => a + b, 0) / n;
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n - lag; i++) {
    numerator += (data[i] - mean) * (data[i + lag] - mean);
  }

  for (let i = 0; i < n; i++) {
    denominator += (data[i] - mean) ** 2;
  }

  return denominator !== 0 ? numerator / denominator : 0;
}

/**
 * Calculate moving average
 */
export function movingAverage(data: number[], window: number): number[] {
  const n = data.length;
  const result: number[] = [];
  const halfWindow = Math.floor(window / 2);

  for (let i = 0; i < n; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(n, i + halfWindow + 1);
    const slice = data.slice(start, end);
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }

  return result;
}

/**
 * Calculate exponentially weighted moving average
 */
export function ewma(data: number[], alpha: number): number[] {
  const result: number[] = [data[0]];

  for (let i = 1; i < data.length; i++) {
    result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
  }

  return result;
}

// ============================================================================
// RANDOM FOREST (Ensemble of Decision Trees)
// ============================================================================

export interface RandomForestConfig {
  numTrees?: number;
  maxDepth?: number;
  minSamplesSplit?: number;
  minSamplesLeaf?: number;
  maxFeatures?: number | 'sqrt' | 'log2';
  bootstrapSampleRatio?: number;
  criterion?: 'gini' | 'entropy';
}

export interface RandomForestPrediction {
  prediction: string | number;
  confidence: number;
  votes: Map<string | number, number>;
  treePredictions: Array<{ prediction: string | number; confidence: number }>;
}

/**
 * Random Forest Classifier
 * Ensemble of Decision Trees with bootstrap aggregating (bagging)
 */
export class RandomForest {
  private trees: DecisionTree[] = [];
  private config: Required<Omit<RandomForestConfig, 'maxFeatures'>> & { maxFeatures: number | 'sqrt' | 'log2' };
  private featureNames: string[] = [];
  private numFeatures: number = 0;

  constructor(config: RandomForestConfig = {}) {
    this.config = {
      numTrees: config.numTrees ?? 10,
      maxDepth: config.maxDepth ?? 8,
      minSamplesSplit: config.minSamplesSplit ?? 2,
      minSamplesLeaf: config.minSamplesLeaf ?? 1,
      maxFeatures: config.maxFeatures ?? 'sqrt',
      bootstrapSampleRatio: config.bootstrapSampleRatio ?? 0.8,
      criterion: config.criterion ?? 'gini',
    };
  }

  /**
   * Train the Random Forest
   */
  fit(
    features: number[][],
    labels: (string | number)[],
    featureNames?: string[]
  ): void {
    const n = features.length;
    this.numFeatures = features[0].length;
    this.featureNames = featureNames || features[0].map((_, i) => `feature_${i}`);

    // Determine number of features to consider at each split
    let maxFeaturesToUse: number;
    if (typeof this.config.maxFeatures === 'number') {
      maxFeaturesToUse = this.config.maxFeatures;
    } else if (this.config.maxFeatures === 'sqrt') {
      maxFeaturesToUse = Math.max(1, Math.floor(Math.sqrt(this.numFeatures)));
    } else {
      maxFeaturesToUse = Math.max(1, Math.floor(Math.log2(this.numFeatures)));
    }

    this.trees = [];

    for (let t = 0; t < this.config.numTrees; t++) {
      // Bootstrap sample
      const sampleSize = Math.floor(n * this.config.bootstrapSampleRatio);
      const sampleIndices = this.bootstrapSample(n, sampleSize);

      const sampleFeatures = sampleIndices.map(i => features[i]);
      const sampleLabels = sampleIndices.map(i => labels[i]);

      // Random feature subset for this tree
      const featureSubset = this.randomFeatureSubset(this.numFeatures, maxFeaturesToUse);

      // Create subset of features for training
      const subsetFeatures = sampleFeatures.map(row =>
        featureSubset.map(fi => row[fi])
      );
      const subsetFeatureNames = featureSubset.map(fi => this.featureNames[fi]);

      // Train tree on subset
      const tree = new DecisionTree({
        maxDepth: this.config.maxDepth,
        minSamplesSplit: this.config.minSamplesSplit,
        minSamplesLeaf: this.config.minSamplesLeaf,
        criterion: this.config.criterion,
      });

      tree.fit(subsetFeatures, sampleLabels, subsetFeatureNames);

      // Store tree with its feature subset mapping
      (tree as DecisionTree & { featureSubset?: number[] }).featureSubset = featureSubset;
      this.trees.push(tree);
    }
  }

  /**
   * Predict using majority voting
   */
  predict(features: number[]): RandomForestPrediction {
    if (this.trees.length === 0) {
      throw new Error('Forest has not been trained');
    }

    const votes = new Map<string | number, number>();
    const treePredictions: Array<{ prediction: string | number; confidence: number }> = [];

    for (const tree of this.trees) {
      // Get feature subset for this tree
      const featureSubset = (tree as DecisionTree & { featureSubset?: number[] }).featureSubset || [];
      const subsetFeatures = featureSubset.map(fi => features[fi]);

      try {
        const result = tree.predict(subsetFeatures);
        votes.set(result.prediction, (votes.get(result.prediction) || 0) + 1);
        treePredictions.push({
          prediction: result.prediction,
          confidence: result.confidence,
        });
      } catch {
        // Skip failed predictions
      }
    }

    // Find majority vote
    let maxVotes = 0;
    let prediction: string | number = treePredictions[0]?.prediction || 0;
    for (const [label, count] of votes) {
      if (count > maxVotes) {
        maxVotes = count;
        prediction = label;
      }
    }

    const confidence = maxVotes / this.trees.length;

    return {
      prediction,
      confidence,
      votes,
      treePredictions,
    };
  }

  /**
   * Get feature importance scores
   */
  getFeatureImportance(): Map<string, number> {
    const importance = new Map<string, number>();

    // Initialize all features with 0 importance
    for (const name of this.featureNames) {
      importance.set(name, 0);
    }

    // Aggregate importance from all trees (simplified - based on split frequency)
    for (const tree of this.trees) {
      const rules = tree.getRules();
      for (const rule of rules) {
        for (const name of this.featureNames) {
          if (rule.includes(name)) {
            importance.set(name, (importance.get(name) || 0) + 1);
          }
        }
      }
    }

    // Normalize
    const total = Array.from(importance.values()).reduce((a, b) => a + b, 0);
    if (total > 0) {
      for (const [name, value] of importance) {
        importance.set(name, value / total);
      }
    }

    return importance;
  }

  /**
   * Bootstrap sample indices
   */
  private bootstrapSample(n: number, size: number): number[] {
    const indices: number[] = [];
    for (let i = 0; i < size; i++) {
      indices.push(Math.floor(Math.random() * n));
    }
    return indices;
  }

  /**
   * Random feature subset
   */
  private randomFeatureSubset(totalFeatures: number, subsetSize: number): number[] {
    const indices = Array.from({ length: totalFeatures }, (_, i) => i);
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices.slice(0, subsetSize);
  }

  /**
   * Get number of trees
   */
  getNumTrees(): number {
    return this.trees.length;
  }
}

// ============================================================================
// HIERARCHICAL CLUSTERING (Agglomerative)
// ============================================================================

export interface ClusterNode {
  id: number;
  left?: ClusterNode;
  right?: ClusterNode;
  distance: number;
  members: number[];
  label?: string;
}

export interface HierarchicalClusteringConfig {
  linkage?: 'single' | 'complete' | 'average' | 'ward';
  distanceMetric?: 'euclidean' | 'cosine' | 'manhattan';
}

export interface ClusterAssignment {
  itemIndex: number;
  clusterId: number;
  clusterLabel?: string;
}

/**
 * Agglomerative Hierarchical Clustering
 * Bottom-up clustering for taxonomy building
 */
export class HierarchicalClustering {
  private config: Required<HierarchicalClusteringConfig>;
  private root: ClusterNode | null = null;
  private data: number[][] = [];
  private labels: string[] = [];

  constructor(config: HierarchicalClusteringConfig = {}) {
    this.config = {
      linkage: config.linkage ?? 'average',
      distanceMetric: config.distanceMetric ?? 'euclidean',
    };
  }

  /**
   * Fit the clustering model
   */
  fit(data: number[][], labels?: string[]): void {
    this.data = data;
    this.labels = labels || data.map((_, i) => `item_${i}`);

    const n = data.length;
    if (n === 0) return;

    // Initialize each point as its own cluster
    let clusters: ClusterNode[] = data.map((_, i) => ({
      id: i,
      distance: 0,
      members: [i],
      label: this.labels[i],
    }));

    // Compute initial distance matrix
    const distMatrix = this.computeDistanceMatrix(data);

    let nextId = n;

    // Agglomerative clustering
    while (clusters.length > 1) {
      // Find closest pair
      let minDist = Infinity;
      let mergeI = 0;
      let mergeJ = 1;

      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const dist = this.clusterDistance(clusters[i], clusters[j], distMatrix);
          if (dist < minDist) {
            minDist = dist;
            mergeI = i;
            mergeJ = j;
          }
        }
      }

      // Merge clusters
      const newCluster: ClusterNode = {
        id: nextId++,
        left: clusters[mergeI],
        right: clusters[mergeJ],
        distance: minDist,
        members: [...clusters[mergeI].members, ...clusters[mergeJ].members],
      };

      // Remove merged clusters and add new one
      clusters = clusters.filter((_, i) => i !== mergeI && i !== mergeJ);
      clusters.push(newCluster);
    }

    this.root = clusters[0];
  }

  /**
   * Cut the dendrogram at a specific number of clusters
   */
  getClusters(numClusters: number): ClusterAssignment[] {
    if (!this.root || numClusters < 1) return [];

    // Find clusters at the right level
    const clusters = this.cutDendrogram(numClusters);

    // Assign items to clusters
    const assignments: ClusterAssignment[] = [];
    for (let clusterId = 0; clusterId < clusters.length; clusterId++) {
      const cluster = clusters[clusterId];
      for (const itemIndex of cluster.members) {
        assignments.push({
          itemIndex,
          clusterId,
          clusterLabel: this.labels[itemIndex],
        });
      }
    }

    return assignments.sort((a, b) => a.itemIndex - b.itemIndex);
  }

  /**
   * Cut dendrogram to get specified number of clusters
   */
  private cutDendrogram(numClusters: number): ClusterNode[] {
    if (!this.root) return [];

    let clusters: ClusterNode[] = [this.root];

    while (clusters.length < numClusters) {
      // Find cluster with highest distance to split
      let maxDistIdx = 0;
      let maxDist = -Infinity;

      for (let i = 0; i < clusters.length; i++) {
        if (clusters[i].left && clusters[i].right && clusters[i].distance > maxDist) {
          maxDist = clusters[i].distance;
          maxDistIdx = i;
        }
      }

      // If no more clusters can be split
      if (maxDist === -Infinity) break;

      // Split the cluster
      const toSplit = clusters[maxDistIdx];
      clusters.splice(maxDistIdx, 1);
      if (toSplit.left) clusters.push(toSplit.left);
      if (toSplit.right) clusters.push(toSplit.right);
    }

    return clusters;
  }

  /**
   * Get the dendrogram structure
   */
  getDendrogram(): ClusterNode | null {
    return this.root;
  }

  /**
   * Compute pairwise distance matrix
   */
  private computeDistanceMatrix(data: number[][]): number[][] {
    const n = data.length;
    const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dist = this.pointDistance(data[i], data[j]);
        matrix[i][j] = dist;
        matrix[j][i] = dist;
      }
    }

    return matrix;
  }

  /**
   * Distance between two points
   */
  private pointDistance(a: number[], b: number[]): number {
    switch (this.config.distanceMetric) {
      case 'manhattan':
        return a.reduce((sum, val, i) => sum + Math.abs(val - b[i]), 0);

      case 'cosine':
        const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
        const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
        return 1 - (dotProduct / ((normA * normB) || 1));

      case 'euclidean':
      default:
        return Math.sqrt(a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0));
    }
  }

  /**
   * Distance between two clusters based on linkage method
   */
  private clusterDistance(a: ClusterNode, b: ClusterNode, distMatrix: number[][]): number {
    const distances: number[] = [];

    for (const i of a.members) {
      for (const j of b.members) {
        distances.push(distMatrix[i][j]);
      }
    }

    switch (this.config.linkage) {
      case 'single':
        return Math.min(...distances);

      case 'complete':
        return Math.max(...distances);

      case 'ward':
        // Ward's method - minimize within-cluster variance
        const na = a.members.length;
        const nb = b.members.length;
        const avgDist = distances.reduce((s, d) => s + d, 0) / distances.length;
        return avgDist * Math.sqrt((2 * na * nb) / (na + nb));

      case 'average':
      default:
        return distances.reduce((s, d) => s + d, 0) / distances.length;
    }
  }

  /**
   * Build taxonomy from clustering
   */
  buildTaxonomy(numLevels: number = 3): Map<string, string[]>[] {
    if (!this.root) return [];

    const taxonomy: Map<string, string[]>[] = [];

    for (let level = 1; level <= numLevels; level++) {
      const numClusters = Math.pow(2, level);
      const clusters = this.getClusters(Math.min(numClusters, this.data.length));

      const levelMap = new Map<string, string[]>();

      // Group by cluster
      const clusterGroups = new Map<number, string[]>();
      for (const assignment of clusters) {
        const group = clusterGroups.get(assignment.clusterId) || [];
        group.push(assignment.clusterLabel || `item_${assignment.itemIndex}`);
        clusterGroups.set(assignment.clusterId, group);
      }

      // Create taxonomy entries
      for (const [clusterId, members] of clusterGroups) {
        const clusterName = `category_L${level}_${clusterId}`;
        levelMap.set(clusterName, members);
      }

      taxonomy.push(levelMap);
    }

    return taxonomy;
  }
}

// ============================================================================
// NAMED ENTITY RECOGNITION (Simplified Feature-Based)
// ============================================================================

export interface NEREntity {
  text: string;
  type: string;
  start: number;
  end: number;
  confidence: number;
}

export interface NERConfig {
  entityTypes?: string[];
  windowSize?: number;
  minConfidence?: number;
}

/**
 * Simplified Named Entity Recognition using feature templates
 * No ML training required - uses pattern-based detection with statistical scoring
 */
export class NamedEntityRecognizer {
  private config: Required<NERConfig>;

  // Pre-defined patterns for common contract entities
  private patterns: Map<string, RegExp[]> = new Map();
  private contextWords: Map<string, Set<string>> = new Map();

  constructor(config: NERConfig = {}) {
    this.config = {
      entityTypes: config.entityTypes ?? [
        'PARTY', 'DATE', 'MONEY', 'DURATION', 'PERCENTAGE', 'LOCATION', 'CLAUSE_TYPE'
      ],
      windowSize: config.windowSize ?? 3,
      minConfidence: config.minConfidence ?? 0.5,
    };

    this.initializePatterns();
    this.initializeContextWords();
  }

  /**
   * Initialize regex patterns for entity types
   */
  private initializePatterns(): void {
    this.patterns.set('DATE', [
      /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/g,
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
      /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/gi,
      /\b(Q[1-4])\s+(\d{4})\b/gi,
      /\bthe\s+(\d{1,2})(st|nd|rd|th)\s+day\s+of\s+(January|February|March|April|May|June|July|August|September|October|November|December),?\s+(\d{4})\b/gi,
    ]);

    this.patterns.set('MONEY', [
      /\$[\d,]+(?:\.\d{2})?\s*(?:USD|dollars|million|billion|M|B|K)?/gi,
      /USD\s*[\d,]+(?:\.\d{2})?/gi,
      /[\d,]+(?:\.\d{2})?\s*(?:USD|dollars|euros|EUR|GBP|pounds)/gi,
    ]);

    this.patterns.set('DURATION', [
      /\b(\d+)\s*(year|month|week|day|hour)s?\b/gi,
      /\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s*(year|month|week|day)s?\b/gi,
      /\b(\d+)\s*-\s*(year|month|week|day)\b/gi,
    ]);

    this.patterns.set('PERCENTAGE', [
      /\b(\d+(?:\.\d+)?)\s*%/g,
      /\b(\d+(?:\.\d+)?)\s*percent\b/gi,
    ]);

    this.patterns.set('PARTY', [
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*(?:Inc\.|LLC|Ltd\.|Corp\.|Corporation|Company|Co\.)/g,
      /\b(the\s+)?(Buyer|Seller|Lessor|Lessee|Licensor|Licensee|Vendor|Client|Customer|Provider|Contractor)\b/gi,
    ]);

    this.patterns.set('LOCATION', [
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\b/g,
      /\bState\s+of\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g,
    ]);

    this.patterns.set('CLAUSE_TYPE', [
      /\b(confidentiality|non-disclosure|NDA|indemnification|limitation of liability|termination|force majeure|governing law|dispute resolution|arbitration|warranty|representations|covenants)\b/gi,
    ]);
  }

  /**
   * Initialize context words that boost confidence
   */
  private initializeContextWords(): void {
    this.contextWords.set('DATE', new Set([
      'effective', 'dated', 'date', 'commence', 'expiration', 'termination',
      'beginning', 'ending', 'starting', 'as of', 'until'
    ]));

    this.contextWords.set('MONEY', new Set([
      'pay', 'payment', 'amount', 'sum', 'total', 'price', 'cost', 'fee',
      'consideration', 'damages', 'penalty', 'rate', 'value'
    ]));

    this.contextWords.set('PARTY', new Set([
      'party', 'parties', 'hereinafter', 'hereto', 'between', 'among',
      'entered into', 'agreement', 'contract', 'undersigned'
    ]));

    this.contextWords.set('DURATION', new Set([
      'term', 'period', 'duration', 'renewal', 'extend', 'extension', 'valid'
    ]));
  }

  /**
   * Extract named entities from text
   */
  recognize(text: string): NEREntity[] {
    const entities: NEREntity[] = [];
    const seenSpans = new Set<string>();

    for (const entityType of this.config.entityTypes) {
      const patterns = this.patterns.get(entityType) || [];

      for (const pattern of patterns) {
        // Reset regex state
        pattern.lastIndex = 0;

        let match;
        while ((match = pattern.exec(text)) !== null) {
          const start = match.index;
          const end = start + match[0].length;
          const spanKey = `${start}-${end}`;

          // Skip overlapping entities
          if (seenSpans.has(spanKey)) continue;

          // Calculate confidence based on context
          const confidence = this.calculateConfidence(text, start, end, entityType);

          if (confidence >= this.config.minConfidence) {
            entities.push({
              text: match[0].trim(),
              type: entityType,
              start,
              end,
              confidence,
            });
            seenSpans.add(spanKey);
          }
        }
      }
    }

    // Sort by position
    return entities.sort((a, b) => a.start - b.start);
  }

  /**
   * Calculate confidence based on surrounding context
   */
  private calculateConfidence(text: string, start: number, end: number, entityType: string): number {
    let confidence = 0.6; // Base confidence for pattern match

    const contextWords = this.contextWords.get(entityType);
    if (!contextWords) return confidence;

    // Extract context window
    const windowStart = Math.max(0, start - 100);
    const windowEnd = Math.min(text.length, end + 50);
    const context = text.slice(windowStart, windowEnd).toLowerCase();

    // Count context word matches
    let contextMatches = 0;
    for (const word of contextWords) {
      if (context.includes(word)) {
        contextMatches++;
      }
    }

    // Boost confidence based on context
    confidence += Math.min(0.3, contextMatches * 0.1);

    // Additional boost for entities at start of sentence
    const charBefore = start > 0 ? text[start - 1] : ' ';
    if (/[.!?\n\r]/.test(charBefore) || start === 0) {
      confidence += 0.05;
    }

    return Math.min(1.0, confidence);
  }

  /**
   * Extract entities with BIO tagging
   */
  getBIOTags(text: string): Array<{ token: string; tag: string }> {
    const entities = this.recognize(text);
    const tokens = text.split(/\s+/);
    const result: Array<{ token: string; tag: string }> = [];

    let currentPos = 0;
    for (const token of tokens) {
      const tokenStart = text.indexOf(token, currentPos);
      const tokenEnd = tokenStart + token.length;
      currentPos = tokenEnd;

      // Check if token is part of an entity
      let tag = 'O';
      for (const entity of entities) {
        if (tokenStart >= entity.start && tokenEnd <= entity.end) {
          if (tokenStart === entity.start) {
            tag = `B-${entity.type}`;
          } else {
            tag = `I-${entity.type}`;
          }
          break;
        }
      }

      result.push({ token, tag });
    }

    return result;
  }

  /**
   * Get entity statistics from text
   */
  getEntityStats(text: string): Map<string, number> {
    const entities = this.recognize(text);
    const stats = new Map<string, number>();

    for (const entity of entities) {
      stats.set(entity.type, (stats.get(entity.type) || 0) + 1);
    }

    return stats;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const Statistics = {
  // Phase 2 Classes
  STLDecomposer,
  HoltWinters,
  DecisionTree,

  // Phase 3 Classes
  RandomForest,
  HierarchicalClustering,
  NamedEntityRecognizer,

  // Functions
  detectSeasonalPeriod,
  calculateAutocorrelation,
  movingAverage,
  ewma,
};

export default Statistics;
