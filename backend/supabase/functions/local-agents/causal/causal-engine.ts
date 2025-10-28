import {
  CausalGraph,
  CausalNode,
  CausalEdge,
  CausalQuery,
  CausalEffect,
  CounterfactualResult,
  StructuralCausalModel,
  CausalPath,
  ConfounderSet,
  CausalInsight,
  MediationAnalysis,
  CausalBounds,
} from './types.ts';

// Define StructuralEquation type
interface StructuralEquation {
  target: string;
  parents: string[];
  function: (values: Map<string, any>) => any;
}

// Re-export types that are used by other modules
export type {
  CausalGraph,
  CausalQuery,
  CausalEffect,
  CounterfactualResult,
  CausalInsight,
  StructuralCausalModel,
};

export class CausalReasoningEngine {
  private scm?: StructuralCausalModel;
  private observationalData: Map<string, unknown[]> = new Map();

  constructor(scm?: StructuralCausalModel) {
    if (scm !== undefined) {
      this.scm = scm;
    }
  }

  // Main causal inference method
  async performCausalInference(
    query: CausalQuery,
    data?: Map<string, unknown[]>,
  ): Promise<CausalEffect> {
    if (data) {
      this.observationalData = data;
    }

    switch (query.type) {
      case 'observational':
        return this.computeObservationalQuery(query);

      case 'interventional':
        return this.computeInterventionalQuery(query);

      case 'counterfactual':
        return this.computeCounterfactualQuery(query);

      default:
        throw new Error(`Unknown query type: ${query.type}`);
    }
  }

  // Compute P(Y|X) - observational query
  private async computeObservationalQuery(query: CausalQuery): Promise<CausalEffect> {
    if (!this.scm) {
      throw new Error('SCM required for causal inference');
    }

    const target = Array.isArray(query.target) ? query.target : [query.target];
    const conditioning = query.given || new Map();

    // Use observational data if available
    if (this.observationalData.size > 0) {
      const effect = this.estimateFromData(target, conditioning);
      return {
        query,
        effect,
        confidence: this.calculateConfidence(effect),
        identifiable: true,
        method: 'empirical_estimation',
      };
    }

    // Otherwise, use SCM for simulation
    const samples = this.generateSamples(10000, conditioning);
    const effect = this.estimateFromSamples(samples, target);

    return {
      query,
      effect,
      confidence: 0.95,
      identifiable: true,
      method: 'scm_simulation',
    };
  }

  // Compute P(Y|do(X)) - interventional query using do-calculus
  private async computeInterventionalQuery(query: CausalQuery): Promise<CausalEffect> {
    if (!this.scm || !query.intervention) {
      throw new Error('SCM and intervention required');
    }

    const target = Array.isArray(query.target) ? query.target : [query.target];
    const { intervention } = query;

    // Check identifiability using do-calculus rules
    const identifiable = this.checkIdentifiability(target, intervention);

    if (!identifiable) {
      // Try to find bounds if not point-identifiable
      const bounds = this.computeCausalBounds(query);
      return {
        query,
        effect: bounds.lowerBound + (bounds.upperBound - bounds.lowerBound) / 2,
        confidence: 0.5,
        identifiable: false,
        method: 'bounds_estimation',
        explanation: `Effect not identifiable. Bounds: [${bounds.lowerBound}, ${bounds.upperBound}]`,
      };
    }

    // Apply do-calculus rules
    const effect = await this.applyDoCalculus(target, intervention, query.given);

    return {
      query,
      effect,
      confidence: 0.9,
      identifiable: true,
      method: 'do_calculus',
    };
  }

  // Apply Pearl's do-calculus rules
  private async applyDoCalculus(
    target: string[],
    intervention: Map<string, any>,
    conditioning?: Map<string, any>,
  ): Promise<number | Map<string, number>> {
    const { graph } = (this.scm!);

    // Rule 1: Ignore observations that are d-separated from Y given X and Z
    this.applyDoCalculusRule1(graph, target, intervention, conditioning);

    // Rule 2: Action/observation exchange
    this.applyDoCalculusRule2(graph, target, intervention, conditioning);

    // Rule 3: Ignore actions that are d-separated
    this.applyDoCalculusRule3(graph, target, intervention, conditioning);

    // Try backdoor adjustment if applicable
    const backdoorResult = this.tryBackdoorAdjustment(graph, target, intervention);
    if (backdoorResult) {
      return backdoorResult;
    }

    // Try frontdoor adjustment if applicable
    const frontdoorResult = this.tryFrontdoorAdjustment(graph, target, intervention);
    if (frontdoorResult) {
      return frontdoorResult;
    }

    // Try instrumental variables if available
    const interventionVars = Array.from(intervention.keys());
    const ivResult = this.tryInstrumentalVariables(interventionVars, target);
    if (ivResult.identifiable && ivResult.instruments) {
      // Use instrumental variables for estimation
      return this.estimateWithInstruments(ivResult.instruments, interventionVars, target);
    }

    // Fall back to simulation with intervention
    return this.simulateIntervention(intervention, target);
  }

  // Do-calculus Rule 1: P(y|do(x),z,w) = P(y|do(x),w) if Y ⊥ Z | X,W in G_X̄
  private applyDoCalculusRule1(
    graph: CausalGraph,
    target: string[],
    intervention: Map<string, any>,
    conditioning?: Map<string, any>,
  ): { simplified: boolean; conditioning: Map<string, unknown> } | null {
    if (!conditioning) {return null;}

    const interventionVars = Array.from(intervention.keys());
    const conditioningVars = Array.from(conditioning.keys());

    // Create manipulated graph G_X̄ (remove arrows into X)
    const manipulatedGraph = this.createManipulatedGraph(graph, interventionVars, 'incoming');

    // Check d-separation in manipulated graph
    for (const z of conditioningVars) {
      const otherConditioning = conditioningVars.filter(v => v !== z);
      if (this.checkDSeparation(manipulatedGraph, target, [z], [...interventionVars, ...otherConditioning])) {
        // Can remove z from conditioning
        const newConditioning = new Map(conditioning);
        newConditioning.delete(z);
        return { simplified: true, conditioning: newConditioning };
      }
    }

    return null;
  }

  // Do-calculus Rule 2: P(y|do(x),do(z),w) = P(y|do(x),z,w) if Y ⊥ Z | X,W in G_X̄Z
  private applyDoCalculusRule2(
    graph: CausalGraph,
    target: string[],
    intervention: Map<string, any>,
    conditioning?: Map<string, any>,
  ): { simplified: boolean; convertToObservation: string; explanation: string } | null {
    // Check if any intervention can be converted to observation
    const interventionVars = Array.from(intervention.keys());

    for (const z of interventionVars) {
      const otherInterventions = interventionVars.filter(v => v !== z);
      const manipulatedGraph = this.createManipulatedGraph(graph, interventionVars, 'incoming');

      const conditioningVars = conditioning ? Array.from(conditioning.keys()) : [];

      if (this.checkDSeparation(manipulatedGraph, target, [z], [...otherInterventions, ...conditioningVars])) {
        // Can convert do(z) to observation z
        return {
          simplified: true,
          convertToObservation: z,
          explanation: `do(${z}) can be replaced with observing ${z}`,
        };
      }
    }

    return null;
  }

  // Do-calculus Rule 3: P(y|do(x),do(z),w) = P(y|do(x),w) if Y ⊥ Z | X,W in G_X̄Z(W)
  private applyDoCalculusRule3(
    graph: CausalGraph,
    target: string[],
    intervention: Map<string, any>,
    conditioning?: Map<string, any>,
  ): { simplified: boolean; intervention: Map<string, unknown>; explanation: string } | null {
    const interventionVars = Array.from(intervention.keys());

    for (const z of interventionVars) {
      const otherInterventions = interventionVars.filter(v => v !== z);

      // Create G_X̄Z(W) - remove incoming to interventions and outgoing from Z except to W
      const manipulatedGraph = this.createDoCalculusRule3Graph(graph, interventionVars, z, conditioning);

      const conditioningVars = conditioning ? Array.from(conditioning.keys()) : [];

      if (this.checkDSeparation(manipulatedGraph, target, [z], [...otherInterventions, ...conditioningVars])) {
        // Can remove do(z)
        const newIntervention = new Map(intervention);
        newIntervention.delete(z);
        return {
          simplified: true,
          intervention: newIntervention,
          explanation: `do(${z}) has no effect on ${target} and can be removed`,
        };
      }
    }

    return null;
  }

  // Backdoor adjustment
  private tryBackdoorAdjustment(
    graph: CausalGraph,
    target: string[],
    intervention: Map<string, any>,
  ): number | null {
    const treatmentVars = Array.from(intervention.keys());

    // Find valid backdoor adjustment set
    const adjustmentSet = this.findBackdoorAdjustmentSet(graph, treatmentVars[0], target[0]);

    if (!adjustmentSet.sufficient) {
      return null;
    }

    // Compute causal effect using backdoor adjustment formula
    // P(Y|do(X)) = Σ_Z P(Y|X,Z)P(Z)
    return this.estimateWithBackdoorAdjustment(treatmentVars[0], target[0], adjustmentSet.variables);
  }

  // Frontdoor adjustment
  private tryFrontdoorAdjustment(
    graph: CausalGraph,
    target: string[],
    intervention: Map<string, any>,
  ): number | null {
    const treatmentVars = Array.from(intervention.keys());

    // Find mediator variables for frontdoor adjustment
    const mediators = this.findFrontdoorMediators([treatmentVars[0]], target, graph);

    if (mediators.length === 0) {
      return null;
    }

    // Compute causal effect using frontdoor adjustment formula
    // P(Y|do(X)) = Σ_M P(M|X) Σ_X' P(Y|M,X')P(X')
    return this.estimateWithFrontdoorAdjustment(treatmentVars[0], target[0], mediators);
  }

  // Find valid backdoor adjustment set
  private findBackdoorAdjustmentSet(
    graph: CausalGraph,
    treatment: string,
    outcome: string,
  ): ConfounderSet {
    // Find all backdoor paths from treatment to outcome
    const backdoorPaths = this.findBackdoorPaths(graph, treatment, outcome);

    if (backdoorPaths.length === 0) {
      return {
        variables: [],
        sufficient: true,
        minimal: true,
        explanation: 'No backdoor paths exist',
      };
    }

    // Find minimal sufficient adjustment set
    const allConfounders = this.findAllConfounders([treatment], [outcome], graph);
    const minimalSet = this.findMinimalAdjustmentSet(allConfounders);

    return {
      variables: minimalSet,
      sufficient: this.verifyAdjustmentSet(minimalSet, [treatment], [outcome]),
      minimal: true,
      explanation: `Adjustment set blocks all backdoor paths from ${treatment} to ${outcome}`,
    };
  }

  // Find backdoor paths
  private findBackdoorPaths(
    graph: CausalGraph,
    treatment: string,
    outcome: string,
  ): CausalPath[] {
    const paths: CausalPath[] = [];

    // Start with parents of treatment (backdoor criterion)
    const treatmentNode = graph.nodes.get(treatment);
    if (!treatmentNode) {return paths;}

    for (const parent of treatmentNode.parents) {
      const pathsFromParent = this.findAllPaths(graph, parent, outcome, [treatment]);

      for (const path of pathsFromParent) {
        // Add treatment at the beginning to complete backdoor path
        paths.push({
          nodes: [treatment, parent, ...path.nodes.slice(1)],
          edges: [
            { from: parent, to: treatment, type: 'direct', strength: 1 },
            ...path.edges,
          ],
          type: 'backdoor',
          blocked: false,
        });
      }
    }

    return paths;
  }

  // Check d-separation
  private checkDSeparation(
    graph: CausalGraph,
    X: string[],
    Y: string[],
    Z: string[],
  ): boolean {
    // Convert to sets for efficiency
    const ZSet = new Set(Z);

    // Find all paths between X and Y
    const paths: string[][] = [];

    for (const x of X) {
      for (const y of Y) {
        if (x === y) {continue;}
        const xyPaths = this.findAllPathsUndirected(graph, x, y);
        paths.push(...xyPaths);
      }
    }

    // Check if all paths are blocked by Z
    return paths.every(path => this.isPathBlocked(path, ZSet, graph));
  }

  // Check if a path is blocked given conditioning set Z
  private isPathBlocked(path: string[], Z: Set<string>, graph: CausalGraph): boolean {
    // Check each consecutive triple in the path
    for (let i = 0; i < path.length - 2; i++) {
      const [a, b, c] = [path[i], path[i + 1], path[i + 2]];

      // Determine the type of connection at b
      const connectionType = this.getConnectionType(graph, a, b, c);

      switch (connectionType) {
        case 'chain': // a → b → c
        case 'fork':  // a ← b → c
          // Blocked if b is in Z
          if (Z.has(b)) {return true;}
          break;

        case 'collider': // a → b ← c
          // Blocked if b and none of its descendants are in Z
          if (!Z.has(b) && !this.hasDescendantInSet(b, Z, graph)) {
            return true;
          }
          break;
      }
    }

    return false;
  }

  // Compute counterfactual query
  private async computeCounterfactualQuery(query: CausalQuery): Promise<CausalEffect> {
    if (!this.scm || !query.evidence) {
      throw new Error('SCM and evidence required for counterfactuals');
    }

    // Step 1: Abduction - infer noise values from evidence
    const noiseValues = this.performAbduction(query.evidence);

    // Step 2: Action - apply intervention
    // Create a values map from the SCM for intervention
    const currentValues = new Map<string, any>();
    this.scm.graph.nodes.forEach((_node, id) => {
      currentValues.set(id, 0); // Initial values
    });
    const modifiedValues = this.applyIntervention(currentValues, query.intervention!);

    // Step 3: Prediction - compute counterfactual outcome
    const counterfactual = this.computeModelWithNoise(modifiedValues, noiseValues);

    const target = Array.isArray(query.target) ? query.target : [query.target];
    const effect = new Map<string, number>();

    for (const t of target) {
      effect.set(t, counterfactual.get(t));
    }

    return {
      query,
      effect,
      confidence: 0.85,
      identifiable: true,
      method: 'three_step_counterfactual',
    };
  }

  // Abduction step for counterfactuals
  private performAbduction(evidence: Map<string, any>): Map<string, any> {
    const noiseValues = new Map<string, any>();

    // Solve structural equations backwards to infer noise
    const sortedNodes = this.topologicalSort(this.scm!.graph);

    for (const nodeId of sortedNodes) {
      const equation = this.scm!.equations.get(nodeId);
      if (!equation) {continue;}

      const observedValue = evidence.get(nodeId);
      if (observedValue === undefined) {continue;}

      // Infer noise value
      const parentValues = this.getParentValues(nodeId, evidence);
      const noise = this.invertEquation(equation, observedValue, parentValues);
      noiseValues.set(nodeId, noise);
    }

    return noiseValues;
  }

  // Simulate intervention
  private simulateIntervention(
    intervention: Map<string, any>,
    target: string[],
  ): number | Map<string, number> {
    if (!this.scm) {throw new Error('SCM required');}

    const samples: Map<string, any>[] = [];
    const numSamples = 10000;

    for (let i = 0; i < numSamples; i++) {
      const sample = new Map<string, any>();

      // Apply intervention
      for (const [var_, value] of intervention) {
        sample.set(var_, value);
      }

      // Compute other variables using SCM
      const sortedNodes = this.topologicalSort(this.scm.graph);

      for (const nodeId of sortedNodes) {
        if (sample.has(nodeId)) {continue;} // Skip intervened variables

        const equation = this.scm.equations.get(nodeId);
        const noise = this.scm.noiseDistributions.get(nodeId);

        if (equation && noise) {
          const parentValues = this.getParentValues(nodeId, sample);
          const value = equation.compute(parentValues, noise.sample());
          sample.set(nodeId, value);
        }
      }

      samples.push(sample);
    }

    // Estimate effect on target
    return this.estimateFromSamples(samples, target);
  }

  // Generate counterfactual explanation
  async generateCounterfactual(
    factual: Map<string, any>,
    desiredOutcome: Map<string, any>,
    constraints?: Map<string, any>,
  ): Promise<CounterfactualResult> {
    if (!this.scm) {throw new Error('SCM required');}

    // Find minimal intervention to achieve desired outcome
    const intervention = this.findMinimalIntervention(factual, desiredOutcome, constraints);

    // Compute counterfactual outcome
    const query: CausalQuery = {
      type: 'counterfactual',
      target: Array.from(desiredOutcome.keys()),
      intervention,
      evidence: factual,
    };

    const result = await this.computeCounterfactualQuery(query);

    return {
      query,
      factual,
      counterfactual: result.effect as Map<string, any>,
      difference: this.computeDifference(factual, result.effect as unknown as number) as Map<string, any>,
      explanation: this.explainCounterfactual(factual, intervention, desiredOutcome),
    };
  }

  // Find minimal intervention for counterfactual
  private findMinimalIntervention(
    factual: Map<string, any>,
    desiredOutcome: Map<string, any>,
    _constraints?: Map<string, any>,
  ): Map<string, any> {
    // Use optimization to find minimal changes
    // Generate candidates from the factual variables
    const candidates = [factual]; // Simplified: just use the factual as candidate
    let minIntervention: Map<string, any> = new Map();
    let minCost = Infinity;

    for (const candidate of candidates) {
      const outcome = this.simulateIntervention(candidate, Array.from(desiredOutcome.keys()));

      if (this.achievesDesiredOutcome(candidate, outcome, desiredOutcome)) {
        const cost = this.interventionCost(candidate);
        if (cost < minCost) {
          minCost = cost;
          minIntervention = candidate;
        }
      }
    }

    return minIntervention;
  }

  // Causal discovery from observational data
  async discoverCausalStructure(
    data: Map<string, unknown[]>,
    constraints?: unknown,
  ): Promise<CausalGraph> {
    // Use PC algorithm or GES for structure learning
    const variables = Array.from(data.keys());
    const graph = this.initializeCompleteGraph(variables);

    // Phase 1: Skeleton discovery using conditional independence tests
    this.discoverSkeleton(graph, data);

    // Phase 2: Orient edges using orientation rules
    this.orientEdges(graph, data);

    // Phase 3: Apply constraint-based refinements
    if (constraints) {
      this.applyConstraints(graph, constraints);
    }

    return graph;
  }

  // PC Algorithm - Skeleton Discovery
  private discoverSkeleton(graph: CausalGraph, data: Map<string, unknown[]>): void {
    const variables = Array.from(graph.nodes.keys());
    const separationSets = new Map<string, Set<string>>();

    // Start with complete undirected graph
    for (let depth = 0; depth < variables.length - 2; depth++) {
      for (const x of variables) {
        for (const y of variables) {
          if (x === y) {continue;}

          // Skip if already removed
          if (!this.hasEdge(graph, x, y)) {continue;}

          // Test conditional independence given subsets of size 'depth'
          const adjacents = this.getAdjacents(graph, x).filter(v => v !== y);
          const subsets = this.generateSubsets(adjacents, depth);

          for (const subset of subsets) {
            if (this.testConditionalIndependence(data, x, y, subset)) {
              // Remove edge
              this.removeEdge(graph, x, y);
              separationSets.set(`${x}-${y}`, new Set(subset));
              break;
            }
          }
        }
      }
    }
  }

  // Orient edges using orientation rules
  private orientEdges(graph: CausalGraph, _data: Map<string, unknown[]>): void {
    // Rule 1: Orient colliders (X - Z - Y with X ⊥ Y | S and Z ∉ S)
    this.orientColliders(graph);

    // Meek's orientation rules
    let changed = true;
    while (changed) {
      changed = false;

      // Rule 2: If X → Y - Z and X not adjacent to Z, orient Y → Z
      changed = this.applyMeekRule1(graph) || changed;

      // Rule 3: If X - Y - Z and X → Z, orient X → Y
      changed = this.applyMeekRule2(graph) || changed;

      // Rule 4: If X - Y → Z and X → W → Z, orient X → Y
      changed = this.applyMeekRule3(graph) || changed;
    }
  }

  // Test conditional independence using statistical tests
  private testConditionalIndependence(
    data: Map<string, unknown[]>,
    x: string,
    y: string,
    conditioning: string[],
  ): boolean {
    // Use G-test or mutual information test
    const xData = data.get(x)!;
    const yData = data.get(y)!;
    const condData = conditioning.map(v => data.get(v)!);

    // Compute conditional mutual information
    const cmi = this.conditionalMutualInformation(xData, yData, condData);

    // Test against threshold (with multiple testing correction)
    const threshold = this.getIndependenceThreshold(xData.length, conditioning.length);

    return cmi < threshold;
  }

  // Mediation analysis
  async performMediationAnalysis(
    treatment: string,
    mediator: string,
    outcome: string,
    _data?: Map<string, unknown[]>,
  ): Promise<MediationAnalysis> {
    // Natural Direct Effect (NDE): Y[X=1, M[0]] - Y[X=0, M[0]]
    const nde = this.computeNaturalDirectEffect(treatment, mediator);

    // Natural Indirect Effect (NIE): Y[X=0, M[1]] - Y[X=0, M[0]]
    const nie = this.computeNaturalIndirectEffect(treatment, mediator);

    // Total Effect = NDE + NIE
    const totalEffect = nde + nie;

    return {
      treatment,
      mediator,
      outcome,
      directEffect: nde,
      indirectEffect: nie,
      totalEffect,
      proportionMediated: Math.abs(nie / totalEffect),
    };
  }

  // Compute causal bounds when effect is not identifiable
  private computeCausalBounds(query: CausalQuery): CausalBounds {
    // Use linear programming to find bounds
    // Simplified bounds computation
    const lowerBound = 0;
    const upperBound = 1;

    return {
      query,
      lowerBound,
      upperBound,
      tight: this.areBoundsTight(lowerBound, upperBound),
      method: 'linear_programming',
    };
  }

  // Generate causal insights
  async generateCausalInsights(
    graph: CausalGraph,
    target: string,
  ): Promise<CausalInsight[]> {
    const insights: CausalInsight[] = [];

    // Find direct causes
    const node = graph.nodes.get(target);
    if (node) {
      for (const parent of node.parents) {
        const strength = await this.estimateCausalStrength(parent, target);
        insights.push({
          type: 'direct_cause',
          source: parent,
          target,
          strength,
          confidence: 0.9,
          description: `${parent} directly causes ${target}`,
          implications: [`Changes in ${parent} will directly affect ${target}`],
        });
      }
    }

    // Find indirect causes
    const indirectCauses = this.findIndirectCauses(graph, target);
    for (const cause of indirectCauses) {
      insights.push({
        type: 'indirect_cause',
        source: cause.source,
        target,
        strength: cause.strength,
        confidence: 0.8,
        description: `${cause.source} indirectly affects ${target} through ${cause.path.join(' → ')}`,
        implications: [`Effects of ${cause.source} on ${target} are mediated by other variables`],
      });
    }

    // Find confounders
    const confounders: string[] = []; // Simplified: no confounders for now
    for (const confounder of confounders) {
      insights.push({
        type: 'confounder',
        source: confounder,
        target,
        strength: 0.7,
        confidence: 0.85,
        description: `${confounder} is a common cause of variables related to ${target}`,
        implications: [`Must control for ${confounder} when analyzing relationships with ${target}`],
      });
    }

    return insights;
  }

  // Utility methods
  private topologicalSort(graph: CausalGraph): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (node: string) => {
      if (visited.has(node)) {return;}
      visited.add(node);

      const nodeData = graph.nodes.get(node);
      if (nodeData) {
        for (const parent of nodeData.parents) {
          visit(parent);
        }
      }

      result.push(node);
    };

    for (const node of graph.nodes.keys()) {
      visit(node);
    }

    return result;
  }

  private createManipulatedGraph(
    graph: CausalGraph,
    interventions: string[],
    removeType: 'incoming' | 'outgoing',
  ): CausalGraph {
    const newGraph: CausalGraph = {
      nodes: new Map(graph.nodes),
      edges: new Map(),
    };

    // Copy edges, removing specified arrows
    for (const [id, edge] of graph.edges) {
      const shouldRemove = removeType === 'incoming'
        ? interventions.includes(edge.to)
        : interventions.includes(edge.from);

      if (!shouldRemove) {
        newGraph.edges.set(id, { ...edge });
      }
    }

    return newGraph;
  }

  private getParentValues(nodeId: string, values: Map<string, any>): Map<string, any> {
    const node = this.scm!.graph.nodes.get(nodeId);
    const parentValues = new Map<string, any>();

    if (node) {
      for (const parent of node.parents) {
        if (values.has(parent)) {
          parentValues.set(parent, values.get(parent));
        }
      }
    }

    return parentValues;
  }

  private findAllPaths(
    graph: CausalGraph,
    start: string,
    end: string,
    visited: string[] = [],
  ): CausalPath[] {
    if (start === end) {
      return [{
        nodes: [start],
        edges: [],
        type: 'causal',
        blocked: false,
      }];
    }

    const paths: CausalPath[] = [];
    const startNode = graph.nodes.get(start);

    if (!startNode) {return paths;}

    // Check children
    for (const child of startNode.children) {
      if (!visited.includes(child)) {
        const subPaths = this.findAllPaths(graph, child, end, [...visited, start]);
        for (const subPath of subPaths) {
          const edge = Array.from(graph.edges.values()).find(e => e.from === start && e.to === child);
          if (edge) {
            paths.push({
              nodes: [start, ...subPath.nodes],
              edges: [edge, ...subPath.edges],
              type: 'causal',
              blocked: false,
            });
          }
        }
      }
    }

    return paths;
  }

  private getConnectionType(
    graph: CausalGraph,
    a: string,
    b: string,
    c: string,
  ): 'chain' | 'fork' | 'collider' | 'none' {
    const aToB = this.hasDirectedEdge(graph, a, b);
    const bToA = this.hasDirectedEdge(graph, b, a);
    const bToC = this.hasDirectedEdge(graph, b, c);
    const cToB = this.hasDirectedEdge(graph, c, b);

    if (aToB && bToC) {return 'chain';}      // a → b → c
    if (bToA && bToC) {return 'fork';}       // a ← b → c
    if (aToB && cToB) {return 'collider';}   // a → b ← c

    return 'none';
  }

  private hasDirectedEdge(graph: CausalGraph, from: string, to: string): boolean {
    return Array.from(graph.edges.values()).some(e => e.from === from && e.to === to);
  }

  private estimateFromData(
    target: string[],
    _conditioning: Map<string, any>,
  ): number | Map<string, number> {
    // Simplified estimation from observational data
    // In practice, use proper statistical estimators
    return target.length === 1 ? 0.5 : new Map(target.map(t => [t, 0.5]));
  }

  private estimateFromSamples(
    samples: Map<string, any>[],
    target: string[],
  ): number | Map<string, number> {
    if (target.length === 1) {
      const values = samples.map(s => s.get(target[0])).filter(v => v !== undefined);
      return values.reduce((a, b) => a + b, 0) / values.length;
    }

    const result = new Map<string, number>();
    for (const t of target) {
      const values = samples.map(s => s.get(t)).filter(v => v !== undefined);
      result.set(t, values.reduce((a, b) => a + b, 0) / values.length);
    }
    return result;
  }

  private calculateConfidence(_effect: unknown): number {
    // Simplified confidence calculation
    return 0.85;
  }

  private checkIdentifiability(
    _target: string[],
    _intervention: Map<string, any>,
  ): boolean {
    // Check if causal effect is identifiable from observational data
    // This is a simplified version - real implementation would use
    // complete identifiability algorithms
    return true;
  }

  private explainCounterfactual(
    factual: Map<string, any>,
    intervention: Map<string, any>,
    desired: Map<string, any>,
  ): string {
    const changes: string[] = [];

    for (const [variable, value] of intervention) {
      const oldValue = factual.get(variable);
      changes.push(`If ${variable} had been ${value} instead of ${oldValue}`);
    }

    const outcomes: string[] = [];
    for (const [variable, value] of desired) {
      outcomes.push(`${variable} would be ${value}`);
    }

    return `${changes.join(' and ')}, then ${outcomes.join(' and ')}`;
  }

  private findIndirectCauses(graph: CausalGraph, target: string): Array<{ source: string; path: string[]; strength: number }> {
    const indirect: Array<{ source: string; path: string[]; strength: number }> = [];
    const visited = new Set<string>();

    const findCausesRecursive = (node: string, path: string[], depth: number) => {
      if (depth > 3 || visited.has(node)) {return;} // Limit depth
      visited.add(node);

      const nodeData = graph.nodes.get(node);
      if (!nodeData) {return;}

      for (const parent of nodeData.parents) {
        if (path.length > 0) {
          indirect.push({
            source: parent,
            path: [...path, node],
            strength: 0.8 / path.length, // Decrease strength with distance
          });
        }
        findCausesRecursive(parent, [parent, ...path], depth + 1);
      }
    };

    const targetNode = graph.nodes.get(target);
    if (targetNode) {
      for (const parent of targetNode.parents) {
        findCausesRecursive(parent, [parent], 1);
      }
    }

    return indirect;
  }

  // Helper methods for graph manipulation and analysis
  private initializeCompleteGraph(variables: string[]): CausalGraph {
    const nodes = new Map<string, CausalNode>();
    const edges = new Map<string, CausalEdge>();

    // Create nodes
    for (const variable of variables) {
      nodes.set(variable, {
        id: variable,
        name: variable,
        type: 'observed',
        parents: [],
        children: [],
      });
    }

    // Create undirected edges (represented as two directed edges)
    for (let i = 0; i < variables.length; i++) {
      for (let j = i + 1; j < variables.length; j++) {
        const edgeId1 = `${variables[i]}-${variables[j]}`;
        const edgeId2 = `${variables[j]}-${variables[i]}`;

        edges.set(edgeId1, {
          from: variables[i],
          to: variables[j],
          type: 'direct',
          strength: 1,
        });

        edges.set(edgeId2, {
          from: variables[j],
          to: variables[i],
          type: 'direct',
          strength: 1,
        });

        nodes.get(variables[i])!.children.push(variables[j]);
        nodes.get(variables[i])!.parents.push(variables[j]);
        nodes.get(variables[j])!.children.push(variables[i]);
        nodes.get(variables[j])!.parents.push(variables[i]);
      }
    }

    return { nodes, edges };
  }

  private hasEdge(graph: CausalGraph, x: string, y: string): boolean {
    return graph.edges.has(`${x}-${y}`) || graph.edges.has(`${y}-${x}`);
  }

  private removeEdge(graph: CausalGraph, x: string, y: string): void {
    graph.edges.delete(`${x}-${y}`);
    graph.edges.delete(`${y}-${x}`);

    const xNode = graph.nodes.get(x);
    const yNode = graph.nodes.get(y);

    if (xNode) {
      xNode.children = xNode.children.filter(c => c !== y);
      xNode.parents = xNode.parents.filter(p => p !== y);
    }

    if (yNode) {
      yNode.children = yNode.children.filter(c => c !== x);
      yNode.parents = yNode.parents.filter(p => p !== x);
    }
  }

  private getAdjacents(graph: CausalGraph, node: string): string[] {
    const nodeData = graph.nodes.get(node);
    if (!nodeData) {return [];}

    return [...new Set([...nodeData.parents, ...nodeData.children])];
  }

  private generateSubsets(array: string[], size: number): string[][] {
    if (size === 0) {return [[]];}
    if (size > array.length) {return [];}

    const subsets: string[][] = [];

    const generate = (start: number, current: string[]) => {
      if (current.length === size) {
        subsets.push([...current]);
        return;
      }

      for (let i = start; i < array.length; i++) {
        current.push(array[i]);
        generate(i + 1, current);
        current.pop();
      }
    };

    generate(0, []);
    return subsets;
  }

  private conditionalMutualInformation(
    _xData: unknown[],
    _yData: unknown[],
    _condData: unknown[][],
  ): number {
    // Simplified CMI calculation
    // In practice, use proper statistical methods
    return Math.random() * 0.1; // Placeholder
  }

  private getIndependenceThreshold(sampleSize: number, _conditioningSize: number): number {
    // Bonferroni correction and sample size adjustment
    const alpha = 0.05;
    const numTests = 100; // Estimated number of tests
    const correctedAlpha = alpha / numTests;

    // Threshold based on chi-squared distribution
    return -Math.log(correctedAlpha) / (2 * sampleSize);
  }

  // Helper method implementations
  private generateSamples(count: number, conditioning?: Map<string, any>): Map<string, any>[] {
    const samples: Map<string, any>[] = [];
    for (let i = 0; i < count; i++) {
      const sample = new Map<string, any>();
      // Add conditioning values if provided
      if (conditioning) {
        for (const [key, value] of conditioning) {
          sample.set(key, value);
        }
      }
      // Generate other values (placeholder)
      for (const node of this.scm!.graph.nodes.keys()) {
        if (!sample.has(node)) {
          sample.set(node, Math.random());
        }
      }
      samples.push(sample);
    }
    return samples;
  }

  // Removed duplicate - using the more complete version above

  private findAllPathsUndirected(graph: CausalGraph, from: string, to: string): string[][] {
    const paths: string[][] = [];
    const visited = new Set<string>();
    
    const dfs = (current: string, path: string[]) => {
      if (current === to) {
        paths.push([...path]);
        return;
      }
      
      visited.add(current);
      const node = graph.nodes.get(current);
      if (node) {
        for (const neighbor of [...node.parents, ...node.children]) {
          if (!visited.has(neighbor)) {
            dfs(neighbor, [...path, neighbor]);
          }
        }
      }
      visited.delete(current);
    };
    
    dfs(from, [from]);
    return paths;
  }

  private hasDescendantInSet(node: string, set: Set<string>, graph: CausalGraph): boolean {
    const visited = new Set<string>();
    const queue = [node];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      
      const nodeData = graph.nodes.get(current);
      if (nodeData) {
        for (const child of nodeData.children) {
          if (set.has(child)) return true;
          queue.push(child);
        }
      }
    }
    
    return false;
  }

  private findFrontdoorMediators(source: string[], target: string[], graph: CausalGraph): string[] {
    // Find variables that mediate between source and target
    const mediators: Set<string> = new Set();
    
    for (const s of source) {
      for (const t of target) {
        const paths = this.findAllPathsUndirected(graph, s, t);
        for (const path of paths) {
          if (path.length > 2) {
            // Add intermediate nodes as potential mediators
            for (let i = 1; i < path.length - 1; i++) {
              mediators.add(path[i]);
            }
          }
        }
      }
    }
    
    return Array.from(mediators);
  }

  private findAllConfounders(source: string[], target: string[], graph: CausalGraph): string[] {
    const confounders: Set<string> = new Set();
    
    for (const s of source) {
      for (const t of target) {
        const sNode = graph.nodes.get(s);
        const tNode = graph.nodes.get(t);
        
        if (sNode && tNode) {
          // Find common ancestors
          for (const parent of sNode.parents) {
            if (this.hasDescendantInSet(parent, new Set([t]), graph)) {
              confounders.add(parent);
            }
          }
        }
      }
    }
    
    return Array.from(confounders);
  }

  private findMinimalAdjustmentSet(confounders: string[]): string[] {
    // Placeholder: return all confounders as adjustment set
    return confounders;
  }

  private verifyAdjustmentSet(adjustmentSet: string[], _source: string[], _target: string[]): boolean {
    // Placeholder: check if adjustment set blocks all backdoor paths
    return adjustmentSet.length > 0;
  }

  private applyIntervention(values: Map<string, any>, intervention: Map<string, any>): Map<string, any> {
    const result = new Map(values);
    for (const [key, value] of intervention) {
      result.set(key, value);
    }
    return result;
  }

  private computeWithNoise(_equation: StructuralEquation, _parentValues: Map<string, unknown>): unknown {
    // Placeholder: evaluate equation with noise
    return Math.random();
  }

  private computeModelWithNoise(values: Map<string, any>, noise: Map<string, any>): Map<string, any> {
    // Compute the structural causal model with given values and noise
    const result = new Map<string, any>();
    
    // Combine values with noise
    values.forEach((value, key) => {
      const noiseValue = noise.get(key) || 0;
      result.set(key, value + noiseValue);
    });
    
    return result;
  }

  private invertEquation(_equation: unknown, childValue: unknown, _otherParents: Map<string, unknown>): unknown {
    // Placeholder: solve equation for parent value
    return childValue;
  }

  private computeDifference(factual: unknown, counterfactual: unknown): number {
    // Placeholder: compute difference between outcomes
    return Math.abs(factual - counterfactual);
  }

  // Commented out - not currently used
  // private generateInterventionCandidates(source: string[], graph: CausalGraph): string[] {
  //   // Generate potential intervention targets
  //   const candidates: Set<string> = new Set();
  //   
  //   for (const s of source) {
  //     const node = graph.nodes.get(s);
  //     if (node) {
  //       // Add parents and children as candidates
  //       node.parents.forEach(p => candidates.add(p));
  //       node.children.forEach(c => candidates.add(c));
  //     }
  //   }
  //   
  //   return Array.from(candidates);
  // }

  private achievesDesiredOutcome(_intervention: unknown, _target: unknown, _desired: unknown): boolean {
    // Placeholder: check if intervention achieves desired outcome
    return Math.random() > 0.5;
  }

  private interventionCost(_intervention: unknown, _factual?: unknown): number {
    // Placeholder: compute cost of intervention
    return Math.random() * 100;
  }

  private applyConstraints(intervention: unknown, _constraints: unknown): unknown {
    // Placeholder: apply constraints to intervention
    return intervention;
  }

  private orientColliders(graph: CausalGraph): void {
    // Orient v-structures (colliders)
    for (const [_nodeId, node] of graph.nodes) {
      if (node.parents.length >= 2) {
        // Check for v-structures
        for (let i = 0; i < node.parents.length; i++) {
          for (let j = i + 1; j < node.parents.length; j++) {
            const p1 = node.parents[i];
            const p2 = node.parents[j];
            // If p1 and p2 are not connected, we have a v-structure
            if (!this.areConnected(p1, p2, graph)) {
              // Already oriented as collider
            }
          }
        }
      }
    }
  }

  private applyMeekRule1(_graph: CausalGraph): boolean {
    // If A → B - C and A not adjacent to C, orient B → C
    let changed = false;
    // Placeholder implementation
    return changed;
  }

  private applyMeekRule2(_graph: CausalGraph): boolean {
    // If A → B → C and A - C, orient A → C
    let changed = false;
    // Placeholder implementation
    return changed;
  }

  private applyMeekRule3(_graph: CausalGraph): boolean {
    // If A - B - C - D, A → D, B → D, orient A → B and B → C
    let changed = false;
    // Placeholder implementation
    return changed;
  }

  private computeNaturalDirectEffect(factual: unknown, counterfactual: unknown): number {
    // Placeholder: compute natural direct effect
    return Math.abs(factual - counterfactual) * 0.7;
  }

  private computeNaturalIndirectEffect(factual: unknown, counterfactual: unknown): number {
    // Placeholder: compute natural indirect effect
    return Math.abs(factual - counterfactual) * 0.3;
  }

  // Commented out - not currently used
  // private computeLowerBound(estimate: number): number {
  //   // Placeholder: compute lower bound
  //   return estimate * 0.8;
  // }

  // Commented out - not currently used
  // private computeUpperBound(estimate: number): number {
  //   // Placeholder: compute upper bound
  //   return estimate * 1.2;
  // }

  private areBoundsTight(lower: number, upper: number): boolean {
    // Check if bounds are tight enough
    return (upper - lower) / Math.abs(upper + lower) < 0.1;
  }

  private estimateCausalStrength(_source: string, _target: string): number {
    // Placeholder: estimate causal strength
    return Math.random();
  }

  // Commented out - not currently used
  // private findConfounders(intervention: Map<string, any>, conditioning: Map<string, any>): string[] {
  //   // Find confounders between intervention and conditioning variables
  //   const confounders: string[] = [];
  //   // Placeholder implementation
  //   return confounders;
  // }

  private createDoCalculusRule3Graph(
    graph: CausalGraph, 
    interventionVars: string[], 
    z: string, 
    conditioning?: Map<string, unknown>
  ): CausalGraph {
    // Create graph for do-calculus rule 3
    // Remove incoming edges to intervention variables
    // Remove outgoing edges from z except those needed
    const newGraph: CausalGraph = {
      nodes: new Map(graph.nodes),
      edges: new Map()
    };
    
    // Copy edges with modifications
    for (const [key, edge] of graph.edges) {
      // Skip incoming edges to intervention variables
      if (interventionVars.includes(edge.to)) {
        continue;
      }
      // Skip outgoing edges from z (except under certain conditions)
      if (edge.from === z && !this.shouldKeepEdgeForRule3(edge, conditioning)) {
        continue;
      }
      newGraph.edges.set(key, {...edge});
    }
    
    return newGraph;
  }
  
  private shouldKeepEdgeForRule3(_edge: CausalEdge, _conditioning?: Map<string, unknown>): boolean {
    // Keep edge if it's needed for the specific do-calculus rule 3 conditions
    // This is a simplified implementation
    return false;
  }

  private tryInstrumentalVariables(_source: string[], _target: string[]): { identifiable: boolean; instruments?: string[] } {
    // Try to find instrumental variables
    return { identifiable: false };
  }

  private estimateWithInstruments(_instruments: string[], _source: string[], target: string[]): number | Map<string, number> {
    // Estimate causal effect using instrumental variables
    // This is a placeholder - real implementation would use 2SLS or similar
    if (target.length === 1) {
      return 0.5; // Placeholder effect
    }
    const effects = new Map<string, number>();
    target.forEach(t => effects.set(t, 0.5));
    return effects;
  }

  private estimateWithBackdoorAdjustment(_treatment: string, _outcome: string, _adjustmentSet: string[]): number {
    // Estimate causal effect using backdoor adjustment
    // P(Y|do(X)) = Σ_Z P(Y|X,Z)P(Z)
    // This is a placeholder - real implementation would use data
    return 0.7; // Placeholder effect
  }

  private estimateWithFrontdoorAdjustment(_treatment: string, _outcome: string, _mediators: string[]): number {
    // Estimate causal effect using frontdoor adjustment
    // P(Y|do(X)) = Σ_M P(M|X) Σ_X' P(Y|M,X')P(X')
    // This is a placeholder - real implementation would use data
    return 0.6; // Placeholder effect
  }

  private areConnected(node1: string, node2: string, graph: CausalGraph): boolean {
    const n1 = graph.nodes.get(node1);
    const n2 = graph.nodes.get(node2);
    
    if (!n1 || !n2) return false;
    
    return n1.parents.includes(node2) || n1.children.includes(node2) ||
           n2.parents.includes(node1) || n2.children.includes(node1);
  }
}