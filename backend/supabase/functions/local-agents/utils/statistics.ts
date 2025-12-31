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
// EXPORTS
// ============================================================================

export const Statistics = {
  // Classes
  STLDecomposer,
  HoltWinters,
  DecisionTree,

  // Functions
  detectSeasonalPeriod,
  calculateAutocorrelation,
  movingAverage,
  ewma,
};

export default Statistics;
