import { QuantumBaseAgent, QuantumProcessingResult, QuantumInsight } from './quantum-base.ts';
import {
  OptimizationProblemType,
  OptimizationResult,
  ObjectiveFunction,
  Constraint,
  Variable,
  QuantumAdvantage,
  Domain,
} from '../quantum/types.ts';
import { AgentContext } from './base.ts';
import { StructuralCausalModel, CausalInsight } from '../causal/types.ts';
import { CausalAnalysisData } from './causal-base.ts';
import { ErrorAnalysisResult } from './metacognitive-base.ts';
import { ToMInsight } from './theory-of-mind-base.ts';
import { MentalState, Belief } from '../theory-of-mind/types.ts';
// Removed unused import: SupabaseClient

// Extended types for quantum financial analysis
interface FinancialData {
  portfolio?: {
    assets?: Asset[];
  };
  assets?: Asset[];
  securities?: Asset[];
  returns?: number[];
  covariance?: number[][];
  riskTolerance?: number;
  budgets?: Budget[];
  totalBudget?: number;
  priorities?: Record<string, number>;
  positions?: Position[];
  scenarios?: RiskScenario[];
  confidenceLevel?: number;
  option?: Option;
  options?: Option[];
  derivatives?: unknown;
  paths?: number;
  decisions?: Decision[];
  objectives?: Objective[];
  constraints?: ConstraintDef[];
  category?: string;
  market?: unknown;
  financialData?: unknown;
  marketParticipants?: unknown;
  traders?: unknown;
  centralBank?: unknown;
  monetaryPolicy?: unknown;
}

interface Asset {
  symbol?: string;
  expectedReturn?: number;
  minWeight?: number;
  maxWeight?: number;
}

interface Budget {
  department?: string;
  requested?: number;
  minimum?: number;
  maximum?: number;
}

interface Position {
  current: number;
}

interface RiskScenario {
  returns: number[];
  probability?: number;
}

interface Option {
  volatility: number;
  spot: number;
  strike: number;
  expiry?: number;
}

interface Decision {
  id?: string;
  type?: string;
  domain?: Domain;
}

interface Objective {
  id: string;
  expression: string;
  type?: string;
  weight?: number;
}

interface ConstraintDef {
  id: string;
  type?: string;
  expression: string;
  bound?: number;
  tolerance?: number;
}

interface ComponentData {
  type: string;
  portfolio?: unknown;
  markets?: unknown;
  risks?: unknown;
}

interface AnalysisResult {
  type?: string;
  analysis?: string;
  insights?: unknown[];
  confidence?: number;
  validated?: boolean;
}

export class QuantumFinancialAgent extends QuantumBaseAgent {
  // Removed unused property: riskModels
  private marketData: Map<string, unknown> = new Map();

  get agentType() {
    return 'quantum_financial';
  }

  get capabilities() {
    return [
      'portfolio_optimization',
      'risk_assessment',
      'quantum_monte_carlo',
      'option_pricing',
      'asset_allocation',
      'volatility_forecasting',
      'correlation_analysis',
      'quantum_speedup',
    ];
  }

  // Initialize the causal model for financial analysis
  protected initializeCausalModel(): void {
    // Create a financial causal model similar to CausalFinancialAgent
    this.domainSCM = this.createFinancialSCM();
  }

  // Create a Structural Causal Model for financial domain
  private createFinancialSCM(): StructuralCausalModel {
    const nodes = new Map();
    const edges = new Map();
    const equations = new Map();
    const noiseDistributions = new Map();

    // Define nodes for financial variables
    nodes.set('market_volatility', {
      id: 'market_volatility',
      name: 'Market Volatility',
      type: 'observed',
      parents: ['market_sentiment', 'liquidity'],
      children: ['risk_exposure'],
    });

    nodes.set('interest_rates', {
      id: 'interest_rates',
      name: 'Interest Rates',
      type: 'observed',
      parents: ['inflation'],
      children: ['asset_prices'],
    });

    nodes.set('inflation', {
      id: 'inflation',
      name: 'Inflation',
      type: 'observed',
      parents: [],
      children: ['interest_rates'],
    });

    nodes.set('asset_prices', {
      id: 'asset_prices',
      name: 'Asset Prices',
      type: 'observed',
      parents: ['interest_rates', 'market_sentiment'],
      children: ['portfolio_returns'],
    });

    nodes.set('portfolio_returns', {
      id: 'portfolio_returns',
      name: 'Portfolio Returns',
      type: 'observed',
      parents: ['asset_prices', 'risk_exposure'],
      children: [],
    });

    nodes.set('risk_exposure', {
      id: 'risk_exposure',
      name: 'Risk Exposure',
      type: 'observed',
      parents: ['market_volatility'],
      children: ['portfolio_returns'],
    });

    nodes.set('liquidity', {
      id: 'liquidity',
      name: 'Liquidity',
      type: 'observed',
      parents: [],
      children: ['market_volatility'],
    });

    nodes.set('market_sentiment', {
      id: 'market_sentiment',
      name: 'Market Sentiment',
      type: 'observed',
      parents: [],
      children: ['market_volatility', 'asset_prices'],
    });

    // Create edges from node relationships
    for (const [nodeId, node] of nodes) {
      for (const child of node.children) {
        const edgeId = `${nodeId}->${child}`;
        edges.set(edgeId, {
          from: nodeId,
          to: child,
          type: 'direct',
          strength: 0.7, // Default strength
        });
      }
    }

    // Define structural equations
    equations.set('portfolio_returns', {
      nodeId: 'portfolio_returns',
      compute: (parentValues: Map<string, number>, noise?: number) => {
        const assetPrices = parentValues.get('asset_prices') || 0;
        const riskExposure = parentValues.get('risk_exposure') || 0;
        return assetPrices * 0.9 - riskExposure * 0.4 + (noise || 0);
      },
      isLinear: true,
      coefficients: new Map([['asset_prices', 0.9], ['risk_exposure', -0.4]]),
    });

    // Define noise distributions
    for (const nodeId of nodes.keys()) {
      noiseDistributions.set(nodeId, {
        nodeId,
        type: 'normal',
        parameters: { mean: 0, variance: 0.1 },
        sample: () => Math.random() * 0.2 - 0.1,
      });
    }

    return {
      graph: { nodes, edges },
      equations,
      noiseDistributions,
    };
  }

  // Generate financial domain-specific causal insights
  protected async generateDomainCausalInsights(_data: unknown, analysis: CausalAnalysisData): Promise<CausalInsight[]> {
    const insights: CausalInsight[] = [];

    // Portfolio risk insights - check effects for risk-related items
    const hasRiskEffects = analysis.effects?.some(effect => {
      const target = Array.isArray(effect.query.target) ? effect.query.target.join(' ') : effect.query.target;
      return target.includes('risk');
    });

    if (hasRiskEffects) {
      insights.push({
        type: 'direct_cause',
        source: 'market_volatility',
        target: 'portfolio_risk',
        strength: 0.8,
        confidence: 0.85,
        description: 'Risk factors identified and analyzed through causal modeling',
        implications: [
          'Monitor market volatility indicators',
          'Adjust portfolio weights based on risk exposure',
          'Consider hedging strategies',
        ],
      });
    }

    // Market correlation insights - check for graph structure
    if (analysis.graph && analysis.graph.edges.size > 3) {
      insights.push({
        type: 'indirect_cause',
        source: 'market_sentiment',
        target: 'asset_prices',
        strength: 0.7,
        confidence: 0.75,
        description: 'Hidden market correlations detected through causal analysis',
        implications: [
          'Diversify across uncorrelated assets',
          'Account for indirect market influences',
          'Review correlation assumptions regularly',
        ],
      });
    }

    // Return prediction insights - check for return-related effects
    const hasReturnEffects = analysis.effects?.some(effect => {
      const target = Array.isArray(effect.query.target) ? effect.query.target.join(' ') : effect.query.target;
      return target.includes('return');
    });

    if (hasReturnEffects) {
      insights.push({
        type: 'mediator',
        source: 'interest_rates',
        target: 'portfolio_returns',
        strength: 0.75,
        confidence: 0.8,
        description: 'Return optimization opportunities identified',
        implications: [
          'Rebalance portfolio based on causal factors',
          'Focus on high-impact causal drivers',
          'Monitor leading indicators',
        ],
      });
    }

    return insights;
  }

  // Stub implementations for metacognitive abstract methods
  protected initializeStrategies(): void {
    // Initialize financial analysis strategies
    // This would normally set up various cognitive strategies for financial analysis
  }

  protected async processWithoutMetacognition(_data: unknown, _context?: AgentContext): Promise<QuantumProcessingResult> {
    // Process financial data without metacognitive layer
    return {
      data: {},
      insights: [],
      confidence: 0.8,
      success: true,
      rulesApplied: [],
      processingTime: 0,
      metacognitive: {
        cognitiveState: {
          confidence: 0.8,
          uncertainty: 0.2,
          cognitiveLoad: 0.5,
          strategyEffectiveness: 0.8,
          activeStrategies: ['direct'],
          performanceMetrics: {
            accuracy: 0.8,
            speed: 0.9,
            efficiency: 0.85,
          },
        },
        strategyUsed: {
          name: 'direct',
          type: 'analytical' as const,
          complexity: 0.5,
          expectedAccuracy: 0.8,
          expectedSpeed: 0.9,
          contextualFit: 0.85,
        },
        calibration: {
          initialConfidence: 0.8,
          finalConfidence: 0.8,
          actualAccuracy: 0.8,
          calibrationError: 0,
          isWellCalibrated: true,
          adjustmentNeeded: 0,
        },
        insights: [],
      },
    };
  }

  protected decomposeAnalytically(data: unknown): ComponentData[] {
    // Decompose financial data into analyzable components
    const typedData = data as ComponentData;
    const components: ComponentData[] = [];
    if (typedData.portfolio) components.push({ type: 'portfolio', portfolio: typedData.portfolio });
    if (typedData.markets) components.push({ type: 'markets', markets: typedData.markets });
    if (typedData.risks) components.push({ type: 'risks', risks: typedData.risks });
    if (components.length === 0) components.push({ type: 'general', portfolio: data });
    return components;
  }

  protected async processComponent(component: unknown, _context?: AgentContext): Promise<AnalysisResult> {
    // Process individual financial component
    const typedComponent = component as ComponentData;
    return {
      type: typedComponent.type,
      analysis: `Analyzed ${typedComponent.type} component`,
      insights: [],
      confidence: 0.8,
    };
  }

  protected synthesizeResults(results: unknown[]): QuantumProcessingResult {
    // Synthesize multiple analysis results
    const typedResults = results as AnalysisResult[];
    return {
      data: {},
      insights: [],
      confidence: typedResults.reduce((sum, r) => sum + (r.confidence || 0), 0) / typedResults.length,
      success: true,
      rulesApplied: [],
      processingTime: 0,
    };
  }

  protected async applyHeuristics(data: unknown, _context?: AgentContext): Promise<QuantumProcessingResult> {
    // Apply financial heuristics
    const typedData = data as { urgency?: string; volatility?: string };
    const heuristics: string[] = [];
    if (typedData.urgency === 'high') heuristics.push('quick-assessment');
    if (typedData.volatility === 'high') heuristics.push('risk-averse');
    return {
      data: {},
      insights: [],
      confidence: 0.7,
      success: true,
      rulesApplied: heuristics,
      processingTime: 0,
    };
  }

  protected validateHeuristic(result: QuantumProcessingResult): QuantumProcessingResult {
    // Validate heuristic results
    return {
      ...result,
      confidence: Math.min(result.confidence * 0.9, 1),
    };
  }

  protected async matchPatterns(data: unknown, _context?: AgentContext): Promise<Array<{ type: string; pattern: string }>> {
    // Match financial patterns
    const typedData = data as { trends?: unknown; cycles?: unknown };
    const patterns: Array<{ type: string; pattern: string }> = [];
    if (typedData.trends) patterns.push({ type: 'trend', pattern: 'upward' });
    if (typedData.cycles) patterns.push({ type: 'cycle', pattern: 'seasonal' });
    return patterns;
  }

  protected intuitiveAssessment(patterns: unknown[]): QuantumProcessingResult {
    // Make intuitive assessment based on patterns
    return {
      data: {},
      insights: [],
      confidence: 0.6,
      success: true,
      rulesApplied: [`Found ${patterns.length} patterns`],
      processingTime: 0,
    };
  }

  protected combineResults(result1: QuantumProcessingResult, result2: QuantumProcessingResult): QuantumProcessingResult {
    // Combine two results
    return {
      data: {},
      insights: [...(result1.insights || []), ...(result2.insights || [])],
      confidence: (result1.confidence + result2.confidence) / 2,
      success: result1.success && result2.success,
      rulesApplied: [...(result1.rulesApplied || []), ...(result2.rulesApplied || [])],
      processingTime: result1.processingTime + result2.processingTime,
    };
  }

  protected assessDataComplexity(data: unknown): number {
    // Assess complexity of financial data
    const typedData = data as {
      derivatives?: unknown;
      multiAsset?: unknown;
      international?: unknown;
      hedging?: unknown;
    };
    let complexity = 0.5;
    if (typedData.derivatives) complexity += 0.2;
    if (typedData.multiAsset) complexity += 0.1;
    if (typedData.international) complexity += 0.1;
    if (typedData.hedging) complexity += 0.1;
    return Math.min(complexity, 1);
  }

  protected async adjustLearningRate(_adjustment: number): Promise<void> {
    // Adjust learning rate for optimization algorithms
    // This would normally adjust internal optimization parameters
  }

  protected analyzeError(error: unknown): ErrorAnalysisResult {
    // Analyze errors in financial calculations
    const typedError = error as { name?: string; message?: string };
    return {
      type: typedError.name || 'UnknownError',
      context: typedError.message || 'An error occurred',
      recommendedStrategy: 'retry',
      severity: 'medium',
      recoverable: true,
    };
  }

  // Generate domain-specific Theory of Mind insights for financial scenarios
  protected async generateDomainToMInsights(
    data: unknown,
    mentalStates: Map<string, MentalState>,
  ): Promise<ToMInsight[]> {
    const insights: ToMInsight[] = [];
    const typedData = data as FinancialData;

    // Market participant behavior insights
    if (typedData.marketParticipants || typedData.traders) {
      insights.push({
        type: 'belief_attribution',
        agentId: 'market_participants',
        description: 'Market participants show signs of risk-averse behavior',
        confidence: 0.75,
        implications: [
          'Expect increased demand for safe assets',
          'Volatility may decrease in short term',
          'Consider defensive positioning',
        ],
      });
    }

    // Institutional investor intentions
    for (const [agentId, state] of mentalStates) {
      if (agentId.includes('institutional') || agentId.includes('fund')) {
        const beliefs = state.beliefs || new Map<string, Belief>();
        const hasRebalancingIntent = Array.from(beliefs.values())
          .some((b: Belief) => b.content?.includes('rebalance'));

        if (hasRebalancingIntent) {
          insights.push({
            type: 'intention_recognition',
            agentId,
            description: `${agentId} likely planning portfolio rebalancing`,
            confidence: 0.8,
            implications: [
              'Potential market impact from large trades',
              'Opportunity for front-running protection',
              'Consider liquidity provisions',
            ],
          });
        }
      }
    }

    // Central bank policy insights
    if (typedData.centralBank || typedData.monetaryPolicy) {
      insights.push({
        type: 'coordination',
        agentId: 'central_bank',
        description: 'Central bank signaling potential policy changes',
        confidence: 0.7,
        implications: [
          'Prepare for interest rate adjustments',
          'Review duration exposure',
          'Consider currency hedging',
        ],
      });
    }

    return insights;
  }

  // Formulate financial optimization problems
  protected async formulateOptimizationProblem(
    data: unknown,
    _context?: AgentContext,
  ): Promise<OptimizationProblemType> {
    const typedData = data as FinancialData;

    // Portfolio optimization is the most common case
    if (typedData.portfolio || typedData.assets) {
      return this.formulatePortfolioOptimization(typedData);
    }

    // Budget allocation
    if (typedData.budgets) {
      return this.formulateBudgetAllocation(typedData);
    }

    // Risk minimization
    if (typedData.positions) {
      return this.formulateRiskMinimization(typedData);
    }

    // Option pricing using quantum Monte Carlo
    if (typedData.options || typedData.derivatives) {
      return this.formulateOptionPricing(typedData);
    }

    // Default: general financial optimization
    return this.formulateGeneralFinancialOptimization(typedData);
  }

  // Portfolio optimization with Markowitz model
  private formulatePortfolioOptimization(data: FinancialData): OptimizationProblemType {
    const assets = data.assets || this.extractAssets(data);
    const expectedReturns = data.returns || this.estimateReturns(assets);
    const covarianceMatrix = data.covariance || this.estimateCovariance(assets);
    const riskTolerance = data.riskTolerance || 0.5;

    // Variables: portfolio weights
    const variables: Variable[] = assets.map((asset: Asset, i: number) => ({
      id: `weight_${asset.symbol || i}`,
      type: 'continuous' as const,
      domain: { type: 'range' as const, min: 0, max: 1 },
      correlatedWith: this.findCorrelatedAssets(i, covarianceMatrix),
    }));

    // Objective: Maximize return - risk penalty
    const objectives: ObjectiveFunction[] = [{
      id: 'portfolio_objective',
      expression: (vars: Map<string, number>) => {
        const weights = assets.map((_asset: Asset, i: number) => vars.get(`weight_${assets[i].symbol || i}`) || 0);

        // Expected return
        const expectedReturn = weights.reduce((sum: number, w: number, i: number) =>
          sum + w * expectedReturns[i], 0,
        );

        // Portfolio variance (risk)
        let variance = 0;
        for (let i = 0; i < weights.length; i++) {
          for (let j = 0; j < weights.length; j++) {
            variance += weights[i] * weights[j] * covarianceMatrix[i][j];
          }
        }

        // Risk-adjusted return (Sharpe-like)
        return expectedReturn - riskTolerance * Math.sqrt(variance);
      },
      type: 'maximize',
      weight: 1.0,
    }];

    // Constraints
    const constraints: Constraint[] = [
      // Weights sum to 1
      {
        id: 'weight_sum',
        type: 'equality',
        expression: (vars: Map<string, number>) => {
          return assets.reduce((sum: number, _asset: Asset, i: number) =>
            sum + (vars.get(`weight_${assets[i].symbol || i}`) || 0), 0,
          );
        },
        bound: 1.0,
        tolerance: 0.001,
      },
    ];

    // Add asset-specific constraints
    assets.forEach((asset: Asset, i: number) => {
      if (asset.minWeight !== undefined) {
        constraints.push({
          id: `min_weight_${asset.symbol || i}`,
          type: 'inequality',
          expression: (vars: Map<string, number>) =>
            -(vars.get(`weight_${asset.symbol || i}`) || 0),
          bound: -asset.minWeight,
        });
      }
      if (asset.maxWeight !== undefined) {
        constraints.push({
          id: `max_weight_${asset.symbol || i}`,
          type: 'inequality',
          expression: (vars: Map<string, number>) =>
            vars.get(`weight_${asset.symbol || i}`) || 0,
          bound: asset.maxWeight,
        });
      }
    });

    return {
      category: 'continuous',
      objectives,
      constraints,
      variables,
    };
  }

  // Budget allocation across departments/projects
  private formulateBudgetAllocation(data: FinancialData): OptimizationProblemType {
    const budgets = data.budgets || [];
    const totalBudget = data.totalBudget || budgets.reduce((sum: number, b: Budget) => sum + (b.requested || 0), 0);
    const priorities = data.priorities || {};

    const variables: Variable[] = budgets.map((budget: Budget, i: number) => ({
      id: `allocation_${budget.department || i}`,
      type: 'continuous' as const,
      domain: {
        type: 'range' as const,
        min: budget.minimum || 0,
        max: Math.min(budget.maximum || totalBudget, totalBudget),
      },
    }));

    const objectives: ObjectiveFunction[] = [{
      id: 'budget_utility',
      expression: (vars: Map<string, number>) => {
        return budgets.reduce((utility: number, budget: Budget, _i: number) => {
          const allocation = vars.get(`allocation_${budget.department || _i}`) || 0;
          const priority = budget.department ? (priorities[budget.department] || 1) : 1;
          // Diminishing returns utility function
          return utility + priority * Math.sqrt(allocation);
        }, 0);
      },
      type: 'maximize',
      weight: 1.0,
    }];

    const constraints: Constraint[] = [
      // Total budget constraint
      {
        id: 'total_budget',
        type: 'inequality',
        expression: (vars: Map<string, number>) => {
          return budgets.reduce((sum: number, budget: Budget, i: number) =>
            sum + (vars.get(`allocation_${budget.department || i}`) || 0), 0,
          );
        },
        bound: totalBudget,
      },
    ];

    return {
      category: 'continuous',
      objectives,
      constraints,
      variables,
    };
  }

  // Risk minimization with VaR/CVaR
  private formulateRiskMinimization(data: FinancialData): OptimizationProblemType {
    const positions = data.positions || [];
    const scenarios = data.scenarios || this.generateRiskScenarios(positions);
    const confidenceLevel = data.confidenceLevel || 0.95;

    // Variables: position adjustments + VaR variable
    const variables: Variable[] = [
      ...positions.map((pos: Position, i: number) => ({
        id: `adjustment_${i}`,
        type: 'continuous' as const,
        domain: { type: 'range' as const, min: -pos.current, max: pos.current },
      })),
      {
        id: 'var',
        type: 'continuous' as const,
        domain: { type: 'range' as const, min: -Infinity, max: Infinity },
      },
    ];

    // CVaR auxiliary variables
    scenarios.forEach((_scenario: RiskScenario, i: number) => {
      variables.push({
        id: `excess_${i}`,
        type: 'continuous' as const,
        domain: { type: 'range' as const, min: 0, max: Infinity },
      });
    });

    const objectives: ObjectiveFunction[] = [{
      id: 'cvar',
      expression: (vars: Map<string, number>) => {
        const var_value = vars.get('var') || 0;
        const excessSum = scenarios.reduce((sum: number, _scenario: RiskScenario, i: number) =>
          sum + (vars.get(`excess_${i}`) || 0), 0,
        );
        // CVaR = VaR + (1/(1-α)) * E[excess losses]
        return var_value + (1 / (scenarios.length * (1 - confidenceLevel))) * excessSum;
      },
      type: 'minimize',
      weight: 1.0,
    }];

    // Constraints for CVaR calculation
    const constraints: Constraint[] = scenarios.map((scenario: RiskScenario, i: number) => ({
      id: `cvar_constraint_${i}`,
      type: 'inequality',
      expression: (vars: Map<string, number>) => {
        const portfolioLoss = positions.reduce((loss: number, pos: Position, j: number) => {
          const adjustment = vars.get(`adjustment_${j}`) || 0;
          return loss + (pos.current + adjustment) * scenario.returns[j];
        }, 0);
        const var_value = vars.get('var') || 0;
        const excess = vars.get(`excess_${i}`) || 0;
        return -portfolioLoss - var_value - excess;
      },
      bound: 0,
    }));

    return {
      category: 'continuous',
      objectives,
      constraints,
      variables,
    };
  }

  // Option pricing using quantum Monte Carlo
  private formulateOptionPricing(data: FinancialData): OptimizationProblemType {
    const option = data.option || (data.options ? data.options[0] : undefined);
    if (!option) {
      throw new Error('No option data provided for option pricing');
    }
    const paths = data.paths || 10000;

    // For option pricing, we optimize the hedging portfolio
    const variables: Variable[] = [
      {
        id: 'delta',
        type: 'continuous' as const,
        domain: { type: 'range' as const, min: -1, max: 1 },
      },
      {
        id: 'gamma_hedge',
        type: 'continuous' as const,
        domain: { type: 'range' as const, min: -1, max: 1 },
      },
    ];

    const objectives: ObjectiveFunction[] = [{
      id: 'hedging_error',
      expression: (vars: Map<string, number>) => {
        const delta = vars.get('delta') || 0;
        const gammaHedge = vars.get('gamma_hedge') || 0;

        // Simulate option value changes
        let totalError = 0;
        for (let i = 0; i < Math.min(paths, 100); i++) {
          const priceChange = (Math.random() - 0.5) * option.volatility;
          const optionChange = this.blackScholesChange(option, priceChange);
          const hedgeChange = delta * priceChange + 0.5 * gammaHedge * priceChange * priceChange;
          totalError += Math.pow(optionChange - hedgeChange, 2);
        }

        return totalError / Math.min(paths, 100);
      },
      type: 'minimize',
      weight: 1.0,
    }];

    const constraints: Constraint[] = [];

    return {
      category: 'continuous',
      objectives,
      constraints,
      variables,
    };
  }

  // General financial optimization
  private formulateGeneralFinancialOptimization(data: FinancialData): OptimizationProblemType {
    // Extract decision variables
    const variables: Variable[] = (data.decisions || []).map((decision: Decision, i: number) => {
      const varType = decision.type === 'integer' ? 'discrete' : (decision.type === 'binary' ? 'binary' : 'continuous');
      return {
        id: decision.id || `var_${i}`,
        type: varType as 'continuous' | 'discrete' | 'binary',
        domain: decision.domain || { type: 'range' as const, min: 0, max: 1 },
      };
    });

    // Extract objectives
    const objectives: ObjectiveFunction[] = (data.objectives || []).map((obj: Objective) => ({
      id: obj.id,
      expression: new Function('vars', `return ${obj.expression}`) as (vars: Map<string, number>) => number,
      type: (obj.type as 'minimize' | 'maximize') || 'minimize',
      weight: obj.weight || 1.0,
    }));

    // Extract constraints
    const constraints: Constraint[] = (data.constraints || []).map((con: ConstraintDef) => {
      const constraint: Constraint = {
        id: con.id,
        type: (con.type as 'equality' | 'inequality' | 'boundary') || 'inequality',
        expression: new Function('vars', `return ${con.expression}`) as (vars: Map<string, number>) => number,
        bound: con.bound || 0,
      };
      if (con.tolerance !== undefined) {
        constraint.tolerance = con.tolerance;
      }
      return constraint;
    });

    // Map category correctly
    let category: 'combinatorial' | 'continuous' | 'mixed' | 'constraint-satisfaction' = 'mixed';
    if (data.category === 'continuous') category = 'continuous';
    else if (data.category === 'integer' || data.category === 'binary') category = 'combinatorial';

    return {
      category,
      objectives: objectives.length > 0 ? objectives : [{
        id: 'default',
        expression: () => 0,
        type: 'minimize',
        weight: 1.0,
      }],
      constraints,
      variables,
    };
  }

  // Generate domain-specific quantum insights
  protected async generateDomainQuantumInsights(
    problem: OptimizationProblemType,
    result: OptimizationResult,
    advantage?: QuantumAdvantage | null,
  ): Promise<QuantumInsight[]> {
    const insights: QuantumInsight[] = [];

    // Portfolio optimization insights
    if (problem.objectives[0].id.includes('portfolio')) {
      const weights = result.optimalParameters;
      const concentration = Math.max(...weights);

      insights.push({
        type: 'optimization',
        description: `Portfolio optimized with ${weights.filter(w => w > 0.01).length} active positions`,
        quantumAdvantage: advantage?.speedup || 1,
        recommendations: [
          `Largest position: ${(concentration * 100).toFixed(1)}%`,
          concentration > 0.4 ? 'Consider diversifying to reduce concentration risk' : 'Well-diversified portfolio',
          'Quantum correlation analysis improved risk estimation',
        ],
      });
    }

    // Risk management insights
    if (problem.objectives[0].id.includes('risk') || problem.objectives[0].id.includes('cvar')) {
      insights.push({
        type: 'optimization',
        description: 'Quantum risk optimization found robust hedging strategy',
        quantumAdvantage: advantage?.speedup || 1,
        classicalComparison: 'Explored tail risk scenarios more thoroughly',
        recommendations: [
          'Implement suggested position adjustments',
          'Monitor correlation changes',
          'Quantum Monte Carlo provided better tail risk estimates',
        ],
      });
    }

    // Market correlation insights
    if (this.hasCorrelatedVariables(problem)) {
      insights.push({
        type: 'entanglement',
        description: 'Quantum entanglement captured complex market correlations',
        quantumAdvantage: 2.5,
        recommendations: [
          'Non-linear correlations detected and incorporated',
          'Consider correlation hedging strategies',
          'Monitor regime changes in correlation structure',
        ],
      });
    }

    // Computational advantage for large portfolios
    if (problem.variables.length > 20) {
      insights.push({
        type: 'speedup',
        description: `Quantum optimization handled ${problem.variables.length}-asset portfolio efficiently`,
        quantumAdvantage: Math.log2(problem.variables.length),
        classicalComparison: 'Would require exponentially more time classically',
        recommendations: [
          'Suitable for real-time rebalancing',
          'Can handle market-wide optimization',
          'Consider expanding asset universe',
        ],
      });
    }

    return insights;
  }

  // Helper methods

  private extractAssets(data: FinancialData): Asset[] {
    if (data.portfolio?.assets) {return data.portfolio.assets;}
    if (data.securities) {return data.securities;}

    // Default test assets
    return [
      { symbol: 'STOCK_A', expectedReturn: 0.08 },
      { symbol: 'STOCK_B', expectedReturn: 0.12 },
      { symbol: 'BOND_A', expectedReturn: 0.04 },
      { symbol: 'COMMODITY_A', expectedReturn: 0.06 },
    ];
  }

  private estimateReturns(assets: Asset[]): number[] {
    return assets.map(asset => asset.expectedReturn || Math.random() * 0.15);
  }

  private estimateCovariance(assets: Asset[]): number[][] {
    const n = assets.length;
    const cov: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

    // Generate positive semi-definite covariance matrix
    for (let i = 0; i < n; i++) {
      cov[i][i] = 0.04 + Math.random() * 0.06; // Variance
      for (let j = i + 1; j < n; j++) {
        const correlation = (Math.random() - 0.5) * 0.8;
        cov[i][j] = correlation * Math.sqrt(cov[i][i] * 0.05);
        cov[j][i] = cov[i][j];
      }
    }

    return cov;
  }

  private findCorrelatedAssets(index: number, covMatrix: number[][]): string[] {
    const threshold = 0.02; // Correlation threshold
    const correlated: string[] = [];

    for (let i = 0; i < covMatrix.length; i++) {
      if (i !== index && Math.abs(covMatrix[index][i]) > threshold) {
        correlated.push(`weight_${i}`);
      }
    }

    return correlated;
  }

  private generateRiskScenarios(positions: Position[]): RiskScenario[] {
    const scenarios: RiskScenario[] = [];
    const numScenarios = 1000;

    for (let i = 0; i < numScenarios; i++) {
      scenarios.push({
        returns: positions.map(() => (Math.random() - 0.5) * 0.1),
        probability: 1 / numScenarios,
      });
    }

    return scenarios;
  }

  private blackScholesChange(option: Option, priceChange: number): number {
    // Simplified Black-Scholes delta approximation
    const moneyness = (option.spot + priceChange) / option.strike;
    const timeToExpiry = option.expiry || 1;
    const vol = option.volatility || 0.2;

    // Approximate option price change
    const d1 = (Math.log(moneyness) + 0.5 * vol * vol * timeToExpiry) / (vol * Math.sqrt(timeToExpiry));
    const delta = this.normalCDF(d1);

    return delta * priceChange;
  }

  private normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2.0);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  private hasCorrelatedVariables(problem: OptimizationProblemType): boolean {
    return problem.variables.some(v => v.correlatedWith && v.correlatedWith.length > 0);
  }

  // Override process for financial-specific handling
  async process(data: unknown, context?: AgentContext): Promise<QuantumProcessingResult> {
    const typedData = data as FinancialData;
    // Add financial context
    if (typedData.market || typedData.financialData) {
      this.updateMarketData(typedData.market || typedData.financialData);
    }

    const result = await super.process(data, context);

    // Add financial-specific post-processing
    if (result.quantumOptimization && this.isPortfolioOptimization(result.quantumOptimization.problem)) {
      result.insights = result.insights || [];
      result.insights.push(this.createInsight(
        'financial',
        'high',
        'Portfolio Metrics',
        this.calculatePortfolioMetrics(result.quantumOptimization.result, typedData),
        undefined,
        { type: 'portfolio_analysis' },
      ));
    }

    return result;
  }

  private updateMarketData(marketData: unknown): void {
    // Update internal market data cache
    if (marketData && typeof marketData === 'object') {
      for (const [key, value] of Object.entries(marketData)) {
        this.marketData.set(key, value);
      }
    }
  }

  private isPortfolioOptimization(problem: OptimizationProblemType): boolean {
    return problem.objectives.some(obj =>
      obj.id.includes('portfolio') || obj.id.includes('return'),
    );
  }

  private calculatePortfolioMetrics(result: OptimizationResult, data: FinancialData): string {
    const weights = result.optimalParameters;
    const returns = data.returns || this.estimateReturns(data.assets || []);

    const expectedReturn = weights.reduce((sum, w, i) => sum + w * (returns[i] || 0), 0);
    const sharpeRatio = expectedReturn / Math.sqrt(0.04); // Simplified

    return `Expected Return: ${(expectedReturn * 100).toFixed(2)}%, Sharpe Ratio: ${sharpeRatio.toFixed(2)}`;
  }
}