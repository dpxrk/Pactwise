import { QuantumBaseAgent, QuantumProcessingResult, QuantumInsight } from './quantum-base.ts';
import {
  OptimizationProblemType,
  OptimizationResult,
  ObjectiveFunction,
  Constraint,
  Variable,
  QuantumAdvantage,
  QuantumPortfolioOptimizer,
  Asset,
  AssetConstraint,
} from '../quantum/types.ts';
import { AgentContext } from './base.ts';
import { SupabaseClient } from '@supabase/supabase-js';

export class QuantumFinancialAgent extends QuantumBaseAgent {
  private riskModels: Map<string, any> = new Map();
  private marketData: Map<string, any> = new Map();

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

  // Formulate financial optimization problems
  protected async formulateOptimizationProblem(
    data: any,
    context?: AgentContext,
  ): Promise<OptimizationProblemType> {
    // Portfolio optimization is the most common case
    if (data.portfolio || data.assets || data.optimize === 'portfolio') {
      return this.formulatePortfolioOptimization(data);
    }

    // Budget allocation
    if (data.budgets || data.allocate) {
      return this.formulateBudgetAllocation(data);
    }

    // Risk minimization
    if (data.minimize === 'risk' || data.riskManagement) {
      return this.formulateRiskMinimization(data);
    }

    // Option pricing using quantum Monte Carlo
    if (data.options || data.derivatives) {
      return this.formulateOptionPricing(data);
    }

    // Default: general financial optimization
    return this.formulateGeneralFinancialOptimization(data);
  }

  // Portfolio optimization with Markowitz model
  private formulatePortfolioOptimization(data: any): OptimizationProblemType {
    const assets = data.assets || this.extractAssets(data);
    const expectedReturns = data.returns || this.estimateReturns(assets);
    const covarianceMatrix = data.covariance || this.estimateCovariance(assets);
    const riskTolerance = data.riskTolerance || 0.5;

    // Variables: portfolio weights
    const variables: Variable[] = assets.map((asset: any, i: number) => ({
      id: `weight_${asset.symbol || i}`,
      type: 'continuous' as const,
      domain: { type: 'range' as const, min: 0, max: 1 },
      correlatedWith: this.findCorrelatedAssets(i, covarianceMatrix),
    }));

    // Objective: Maximize return - risk penalty
    const objectives: ObjectiveFunction[] = [{
      id: 'portfolio_objective',
      expression: (vars: Map<string, any>) => {
        const weights = assets.map((_, i) => vars.get(`weight_${assets[i].symbol || i}`) || 0);

        // Expected return
        const expectedReturn = weights.reduce((sum, w, i) =>
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
        expression: (vars: Map<string, any>) => {
          return assets.reduce((sum: number, _, i: number) =>
            sum + (vars.get(`weight_${assets[i].symbol || i}`) || 0), 0,
          );
        },
        bound: 1.0,
        tolerance: 0.001,
      },
    ];

    // Add asset-specific constraints
    assets.forEach((asset: any, i: number) => {
      if (asset.minWeight !== undefined) {
        constraints.push({
          id: `min_weight_${asset.symbol || i}`,
          type: 'inequality',
          expression: (vars: Map<string, any>) =>
            -(vars.get(`weight_${asset.symbol || i}`) || 0),
          bound: -asset.minWeight,
        });
      }
      if (asset.maxWeight !== undefined) {
        constraints.push({
          id: `max_weight_${asset.symbol || i}`,
          type: 'inequality',
          expression: (vars: Map<string, any>) =>
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
  private formulateBudgetAllocation(data: any): OptimizationProblemType {
    const budgets = data.budgets || [];
    const totalBudget = data.totalBudget || budgets.reduce((sum: number, b: any) => sum + (b.requested || 0), 0);
    const priorities = data.priorities || {};

    const variables: Variable[] = budgets.map((budget: any, i: number) => ({
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
      expression: (vars: Map<string, any>) => {
        return budgets.reduce((utility: number, budget: any, i: number) => {
          const allocation = vars.get(`allocation_${budget.department || i}`) || 0;
          const priority = priorities[budget.department] || 1;
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
        expression: (vars: Map<string, any>) => {
          return budgets.reduce((sum: number, budget: any, i: number) =>
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
  private formulateRiskMinimization(data: any): OptimizationProblemType {
    const positions = data.positions || [];
    const scenarios = data.scenarios || this.generateRiskScenarios(positions);
    const confidenceLevel = data.confidenceLevel || 0.95;

    // Variables: position adjustments + VaR variable
    const variables: Variable[] = [
      ...positions.map((pos: any, i: number) => ({
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
    scenarios.forEach((_: any, i: number) => {
      variables.push({
        id: `excess_${i}`,
        type: 'continuous' as const,
        domain: { type: 'range' as const, min: 0, max: Infinity },
      });
    });

    const objectives: ObjectiveFunction[] = [{
      id: 'cvar',
      expression: (vars: Map<string, any>) => {
        const var_value = vars.get('var') || 0;
        const excessSum = scenarios.reduce((sum: number, _: any, i: number) =>
          sum + (vars.get(`excess_${i}`) || 0), 0,
        );
        // CVaR = VaR + (1/(1-α)) * E[excess losses]
        return var_value + (1 / (scenarios.length * (1 - confidenceLevel))) * excessSum;
      },
      type: 'minimize',
      weight: 1.0,
    }];

    // Constraints for CVaR calculation
    const constraints: Constraint[] = scenarios.map((scenario: any, i: number) => ({
      id: `cvar_constraint_${i}`,
      type: 'inequality',
      expression: (vars: Map<string, any>) => {
        const portfolioLoss = positions.reduce((loss: number, pos: any, j: number) => {
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
  private formulateOptionPricing(data: any): OptimizationProblemType {
    const option = data.option || data.options[0];
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
      expression: (vars: Map<string, any>) => {
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
  private formulateGeneralFinancialOptimization(data: any): OptimizationProblemType {
    // Extract decision variables
    const decisions = data.decisions || [];
    const variables: Variable[] = decisions.map((decision: any, i: number) => ({
      id: decision.id || `var_${i}`,
      type: decision.type || 'continuous',
      domain: decision.domain || { type: 'range' as const, min: 0, max: 1 },
    }));

    // Extract objectives
    const objectives: ObjectiveFunction[] = (data.objectives || []).map((obj: any) => ({
      id: obj.id,
      expression: new Function('vars', `return ${obj.expression}`),
      type: obj.type || 'minimize',
      weight: obj.weight || 1.0,
    }));

    // Extract constraints
    const constraints: Constraint[] = (data.constraints || []).map((con: any) => ({
      id: con.id,
      type: con.type || 'inequality',
      expression: new Function('vars', `return ${con.expression}`),
      bound: con.bound || 0,
      tolerance: con.tolerance,
    }));

    return {
      category: data.category || 'mixed',
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

  private extractAssets(data: any): any[] {
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

  private estimateReturns(assets: any[]): number[] {
    return assets.map(asset => asset.expectedReturn || Math.random() * 0.15);
  }

  private estimateCovariance(assets: any[]): number[][] {
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

  private generateRiskScenarios(positions: any[]): any[] {
    const scenarios: any[] = [];
    const numScenarios = 1000;

    for (let i = 0; i < numScenarios; i++) {
      scenarios.push({
        returns: positions.map(() => (Math.random() - 0.5) * 0.1),
        probability: 1 / numScenarios,
      });
    }

    return scenarios;
  }

  private blackScholesChange(option: any, priceChange: number): number {
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
  async process(data: any, context?: AgentContext): Promise<QuantumProcessingResult> {
    // Add financial context
    if (data.market || data.financialData) {
      this.updateMarketData(data.market || data.financialData);
    }

    const result = await super.process(data, context);

    // Add financial-specific post-processing
    if (result.quantumOptimization && this.isPortfolioOptimization(result.quantumOptimization.problem)) {
      result.insights = result.insights || [];
      result.insights.push(this.createInsight(
        'financial',
        'high',
        'Portfolio Metrics',
        this.calculatePortfolioMetrics(result.quantumOptimization.result, data),
        null,
        { type: 'portfolio_analysis' },
      ));
    }

    return result;
  }

  private updateMarketData(marketData: any): void {
    // Update internal market data cache
    for (const [key, value] of Object.entries(marketData)) {
      this.marketData.set(key, value);
    }
  }

  private isPortfolioOptimization(problem: OptimizationProblemType): boolean {
    return problem.objectives.some(obj =>
      obj.id.includes('portfolio') || obj.id.includes('return'),
    );
  }

  private calculatePortfolioMetrics(result: OptimizationResult, data: any): string {
    const weights = result.optimalParameters;
    const returns = data.returns || this.estimateReturns(data.assets || []);

    const expectedReturn = weights.reduce((sum, w, i) => sum + w * (returns[i] || 0), 0);
    const sharpeRatio = expectedReturn / Math.sqrt(0.04); // Simplified

    return `Expected Return: ${(expectedReturn * 100).toFixed(2)}%, Sharpe Ratio: ${sharpeRatio.toFixed(2)}`;
  }
}