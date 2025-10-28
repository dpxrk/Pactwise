/**
 * Swarm Research Agent
 *
 * Collective intelligence agent specialized in distributed research
 * and knowledge discovery through swarm collaboration.
 */

import {
  SwarmBaseAgent,
} from './swarm-base.ts';

import {
  AgentConfig,
  AgentType,
  Message,
  ProcessedMessage,
  Task,
  AgentContext,
  Experience,
  LearningResult,
  AgentCapability,
  Pattern,
} from '../types.ts';

import {
  SwarmAgentType,
  Position,
  SearchSpace,
  Evidence,
} from '../swarm/types.ts';

/**
 * Research-focused swarm agent
 */
export class SwarmResearchAgent extends SwarmBaseAgent {
  // Research-specific state
  private researchTopics: Map<string, ResearchTopic> = new Map();
  private knowledgeGraph: KnowledgeGraph;
  private discoveryHistory: Discovery[] = [];
  private collaborativeFindings: Map<string, CollaborativeFinding> = new Map();

  constructor(config: AgentConfig) {
    super({
      ...config,
      type: AgentType.RESEARCH,
    });

    // Initialize knowledge graph
    this.knowledgeGraph = {
      nodes: new Map(),
      edges: [],
      lastUpdate: Date.now(),
    };

    // Add research-specific capabilities
    this.capabilities.push(
      AgentCapability.PATTERN_RECOGNITION,
      AgentCapability.DATA_ANALYSIS,
    );
  }

  /**
   * Map to swarm agent type
   */
  protected mapToSwarmType(): SwarmAgentType {
    return 'explorer';
  }

  /**
   * Process message with research focus
   */
  async processMessage(message: Message): Promise<ProcessedMessage> {
    const baseResult = await super.processMessage(message);

    // Extract research topics
    const topics = this.extractResearchTopics(message);

    // Check for research patterns
    const researchPatterns = this.identifyResearchPatterns(message);

    // Search knowledge graph
    const relevantKnowledge = this.searchKnowledgeGraph(topics);

    // Enhance understanding with research context
    baseResult.understanding.topics = [...topics];

    // Add research-specific actions
    const researchActions = this.generateResearchActions(
      topics,
      researchPatterns,
      relevantKnowledge,
    );

    baseResult.suggestedActions.push(...researchActions);

    // Update confidence based on knowledge coverage
    const knowledgeCoverage = this.calculateKnowledgeCoverage(topics);
    baseResult.confidence *= (0.5 + knowledgeCoverage * 0.5);

    return baseResult;
  }

  /**
   * Execute research task
   */
  async executeTask(task: Task, context: AgentContext): Promise<unknown> {
    if (task.type === 'research' || task.description.includes('research')) {
      return this.executeResearchTask(task, context);
    }

    return super.executeTask(task, context);
  }

  /**
   * Execute collaborative research
   */
  private async executeResearchTask(
    task: Task,
    _context: AgentContext,
  ): Promise<ResearchResult> {
    // Create research topic
    const topic: ResearchTopic = {
      id: `topic-${Date.now()}`,
      name: task.description,
      keywords: this.extractKeywords(task.description),
      startTime: Date.now(),
      findings: [],
      collaborators: [],
      status: 'active',
    };

    this.researchTopics.set(topic.id, topic);

    // Phase 1: Exploration through swarm
    const explorationResults = await this.exploreTopicWithSwarm(topic);

    // Phase 2: Knowledge synthesis
    const synthesizedKnowledge = await this.synthesizeFindings(
      explorationResults,
    );

    // Phase 3: Pattern discovery
    const patterns = await this.discoverPatterns(synthesizedKnowledge);

    // Phase 4: Validation through consensus
    const validatedFindings = await this.validateFindings(
      synthesizedKnowledge,
      patterns,
    );

    // Update knowledge graph
    this.updateKnowledgeGraph(validatedFindings);

    // Create research result
    const result: ResearchResult = {
      topicId: topic.id,
      findings: validatedFindings,
      patterns,
      confidence: this.calculateResearchConfidence(validatedFindings),
      collaborators: topic.collaborators,
      duration: Date.now() - topic.startTime,
    };

    // Store in history
    this.discoveryHistory.push({
      id: `discovery-${Date.now()}`,
      topicId: topic.id,
      timestamp: Date.now(),
      findings: validatedFindings.length,
      impact: this.calculateImpact(validatedFindings),
    });

    return result;
  }

  /**
   * Explore topic using swarm intelligence
   */
  private async exploreTopicWithSwarm(
    topic: ResearchTopic,
  ): Promise<ExplorationResult[]> {
    if (!this.swarmAgent || !this.swarmId) {
      return this.exploreIndividually(topic);
    }

    const results: ExplorationResult[] = [];

    // Deposit research pheromone to attract collaborators
    this.depositPheromone(
      this.stigmergicEnv,
      this.swarmId,
      'attraction',
      0.8,
      {
        researchTopic: topic.id,
        keywords: topic.keywords,
      },
    );

    // Create search space from keywords
    const searchSpace = this.createSearchSpace(topic.keywords);

    // Explore different dimensions
    for (let i = 0; i < searchSpace.dimensions.length; i++) {
      // Move in search space
      if (this.swarmAgent.position.dimensions.length > i) {
        this.swarmAgent.position.dimensions[i] = Math.random();
      }

      // Sample knowledge at position
      const sample = await this.sampleKnowledge(
        this.swarmAgent.position,
        topic,
      );

      if (sample.relevance > 0.5) {
        results.push({
          position: { ...this.swarmAgent.position },
          content: sample.content,
          relevance: sample.relevance,
          discoveredBy: this.id,
        });

        // Deposit quality pheromone
        this.depositPheromone(
          this.stigmergicEnv,
          this.swarmId,
          'quality',
          sample.relevance,
          {
            topicId: topic.id,
            finding: sample.content,
          },
        );
      }
    }

    // Follow quality trails from other researchers
    const trails = await this.followResearchTrails(topic);
    results.push(...trails);

    return results;
  }

  /**
   * Synthesize findings from exploration
   */
  private async synthesizeFindings(
    explorations: ExplorationResult[],
  ): Promise<SynthesizedKnowledge[]> {
    const synthesized: SynthesizedKnowledge[] = [];

    // Group by similarity
    const groups = this.groupBySimilarity(explorations);

    for (const group of groups) {
      if (group.length >= 2) {
        // Multiple confirmations increase confidence
        const synthesis: SynthesizedKnowledge = {
          id: `synth-${Date.now()}`,
          content: this.mergeContent(group.map(e => e.content)),
          evidence: group.map(e => ({
            type: 'exploration',
            source: e.discoveredBy,
            confidence: e.relevance,
            data: e.content,
          })),
          confidence: this.calculateGroupConfidence(group),
          contributors: [...new Set(group.map(e => e.discoveredBy))],
        };

        synthesized.push(synthesis);
      }
    }

    return synthesized;
  }

  /**
   * Discover patterns in synthesized knowledge
   */
  private async discoverPatterns(
    knowledge: SynthesizedKnowledge[],
  ): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    // Look for recurring themes
    const themes = this.extractThemes(knowledge);

    for (const [theme, occurrences] of themes) {
      if (occurrences.length >= 3) {
        patterns.push({
          id: `pattern-${Date.now()}`,
          description: `Recurring theme: ${theme}`,
          frequency: occurrences.length,
          reliability: this.calculateThemeReliability(occurrences),
          conditions: this.extractConditions(occurrences),
          outcomes: this.extractOutcomes(occurrences),
        });
      }
    }

    // Look for causal relationships
    const causalPatterns = this.findCausalPatterns(knowledge);
    patterns.push(...causalPatterns);

    // Look for hierarchical structures
    const hierarchies = this.findHierarchies(knowledge);
    patterns.push(...hierarchies);

    return patterns;
  }

  /**
   * Validate findings through swarm consensus
   */
  private async validateFindings(
    knowledge: SynthesizedKnowledge[],
    _patterns: Pattern[],
  ): Promise<ValidatedFinding[]> {
    const validated: ValidatedFinding[] = [];

    for (const item of knowledge) {
      // Create validation proposal
      const proposal = {
        id: `validate-${item.id}`,
        content: item,
        validators: [] as string[],
        validationScore: 0,
      };

      // Request validation from swarm
      if (this.neighbors.size > 0) {
        const validationResults = await this.requestValidation(item);

        proposal.validators = validationResults.validators;
        proposal.validationScore = validationResults.score;
      }

      // Accept if validation score is high enough
      if (proposal.validationScore > 0.6 || this.neighbors.size === 0) {
        validated.push({
          ...item,
          validated: true,
          validationScore: proposal.validationScore,
          validators: proposal.validators,
        });
      }
    }

    return validated;
  }

  /**
   * Update knowledge graph with new findings
   */
  private updateKnowledgeGraph(findings: ValidatedFinding[]): void {
    for (const finding of findings) {
      // Create or update node
      const nodeId = `node-${Date.now()}`;
      this.knowledgeGraph.nodes.set(nodeId, {
        id: nodeId,
        content: finding.content,
        confidence: finding.confidence,
        created: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 1,
      });

      // Create edges to related nodes
      for (const [existingId, existingNode] of this.knowledgeGraph.nodes) {
        if (existingId === nodeId) {continue;}

        const similarity = this.calculateSimilarity(
          finding.content,
          existingNode.content,
        );

        if (similarity > 0.5) {
          this.knowledgeGraph.edges.push({
            from: nodeId,
            to: existingId,
            weight: similarity,
            type: 'similar',
          });
        }
      }
    }

    this.knowledgeGraph.lastUpdate = Date.now();
  }

  /**
   * Learn from research experience
   */
  async learn(experience: Experience): Promise<LearningResult> {
    const patterns: Pattern[] = [];

    // Learn from successful discoveries
    if (experience.success) {
      const pattern: Pattern = {
        id: `learned-${Date.now()}`,
        description: `Successful research approach: ${experience.action}`,
        frequency: 1,
        reliability: 0.8,
        conditions: [experience.situation],
        outcomes: [experience.outcome],
      };

      patterns.push(pattern);
      this.addToLongTermMemory(pattern);
    }

    // Update research strategies
    const insights = this.extractResearchInsights(experience);

    return {
      patterns,
      insights,
      improvements: [],
      confidence: 0.7,
    };
  }

  /**
   * Make research-oriented decisions
   */
  async decide(options: unknown[], _context: AgentContext): Promise<unknown> {
    // Evaluate options based on research potential
    let bestOption = options[0];
    let bestScore = 0;

    for (const option of options) {
      const score = this.evaluateResearchPotential(option);
      if (score > bestScore) {
        bestScore = score;
        bestOption = option;
      }
    }

    return bestOption;
  }

  /**
   * Helper methods
   */

  private extractResearchTopics(message: Message): string[] {
    const topics: string[] = [];
    const keywords = [
      'research', 'investigate', 'explore', 'discover',
      'analyze', 'study', 'examine', 'understand',
    ];

    const words = message.content.toLowerCase().split(/\s+/);

    for (let i = 0; i < words.length; i++) {
      if (keywords.includes(words[i])) {
        // Extract following words as topic
        const topic = words.slice(i + 1, i + 4).join(' ');
        if (topic) {
          topics.push(topic);
        }
      }
    }

    return topics;
  }

  private identifyResearchPatterns(message: Message): Pattern[] {
    const patterns: Pattern[] = [];

    // Pattern: Question-based research
    if (message.content.includes('?')) {
      patterns.push({
        id: `question-${Date.now()}`,
        description: 'Question-driven research',
        frequency: 1,
        reliability: 0.9,
      });
    }

    // Pattern: Comparative research
    if (message.content.includes('compare') || message.content.includes('versus')) {
      patterns.push({
        id: `comparative-${Date.now()}`,
        description: 'Comparative analysis required',
        frequency: 1,
        reliability: 0.8,
      });
    }

    return patterns;
  }

  private searchKnowledgeGraph(topics: string[]): KnowledgeNode[] {
    const relevant: KnowledgeNode[] = [];

    for (const [_id, node] of this.knowledgeGraph.nodes) {
      for (const topic of topics) {
        if (JSON.stringify(node.content).toLowerCase().includes(topic.toLowerCase())) {
          relevant.push(node);
          node.lastAccessed = Date.now();
          node.accessCount++;
          break;
        }
      }
    }

    return relevant;
  }

  private generateResearchActions(
    topics: string[],
    patterns: Pattern[],
    knowledge: KnowledgeNode[],
  ): string[] {
    const actions: string[] = [];

    if (topics.length > 0) {
      actions.push(`Initiate swarm research on: ${topics.join(', ')}`);
    }

    if (patterns.some(p => p.description.includes('Question'))) {
      actions.push('Deploy question-answering research protocol');
    }

    if (patterns.some(p => p.description.includes('Comparative'))) {
      actions.push('Activate comparative analysis swarm formation');
    }

    if (knowledge.length > 0) {
      actions.push(`Build upon ${knowledge.length} existing knowledge nodes`);
    }

    return actions;
  }

  private calculateKnowledgeCoverage(topics: string[]): number {
    if (topics.length === 0) {return 0;}

    let covered = 0;
    for (const topic of topics) {
      if (this.searchKnowledgeGraph([topic]).length > 0) {
        covered++;
      }
    }

    return covered / topics.length;
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at',
      'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was',
    ]);

    return text.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 5);
  }

  private createSearchSpace(keywords: string[]): SearchSpace {
    return {
      dimensions: keywords.map(keyword => ({
        name: keyword,
        type: 'continuous',
        range: [0, 1],
        resolution: 0.1,
      })),
      topology: 'continuous',
      boundaries: keywords.map((_, i) => ({
        type: 'reflect',
        dimension: i,
        value: 1,
      })),
    };
  }

  private async sampleKnowledge(
    position: Position,
    topic: ResearchTopic,
  ): Promise<{ content: string; relevance: number }> {
    // Simulate knowledge sampling at position
    const relevance = Math.random() * position.confidence;
    const content = `Knowledge sample for ${topic.name} at position ${position.dimensions.slice(0, 3).map(d => d.toFixed(2)).join(', ')}`;

    return { content, relevance };
  }

  private async followResearchTrails(
    topic: ResearchTopic,
  ): Promise<ExplorationResult[]> {
    const results: ExplorationResult[] = [];

    if (!this.swarmId) {return results;}

    // Read quality pheromones
    const pheromoneReading = this.readPheromones(
      this.stigmergicEnv,
      this.swarmId,
      this.swarmAgent!.position,
    );

    // Follow strong quality gradients
    if (pheromoneReading.gradient.strength > 0.5) {
      const newVelocity = this.followGradient(
        pheromoneReading.gradient,
        this.swarmAgent!.velocity.components,
      );

      // Update position following gradient
      for (let i = 0; i < this.swarmAgent!.position.dimensions.length; i++) {
        this.swarmAgent!.position.dimensions[i] += newVelocity[i] * 0.1;
      }

      // Sample at new position
      const sample = await this.sampleKnowledge(
        this.swarmAgent!.position,
        topic,
      );

      if (sample.relevance > 0.6) {
        results.push({
          position: { ...this.swarmAgent!.position },
          content: `${sample.content} (followed trail)`,
          relevance: sample.relevance,
          discoveredBy: this.id,
        });
      }
    }

    return results;
  }

  private exploreIndividually(topic: ResearchTopic): ExplorationResult[] {
    // Fallback individual exploration
    return [{
      position: this.createInitialPosition(),
      content: `Individual exploration of ${topic.name}`,
      relevance: 0.5,
      discoveredBy: this.id,
    }];
  }

  private groupBySimilarity(
    explorations: ExplorationResult[],
  ): ExplorationResult[][] {
    const groups: ExplorationResult[][] = [];
    const used = new Set<number>();

    for (let i = 0; i < explorations.length; i++) {
      if (used.has(i)) {continue;}

      const group = [explorations[i]];
      used.add(i);

      for (let j = i + 1; j < explorations.length; j++) {
        if (used.has(j)) {continue;}

        const similarity = this.calculateSimilarity(
          explorations[i].content,
          explorations[j].content,
        );

        if (similarity > 0.7) {
          group.push(explorations[j]);
          used.add(j);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  private mergeContent(contents: string[]): string {
    // Simple content merging
    return contents.join('; ');
  }

  private calculateGroupConfidence(group: ExplorationResult[]): number {
    const avgRelevance = group.reduce((sum, e) => sum + e.relevance, 0) / group.length;
    const diversity = new Set(group.map(e => e.discoveredBy)).size / group.length;

    return avgRelevance * (0.5 + diversity * 0.5);
  }

  private extractThemes(
    knowledge: SynthesizedKnowledge[],
  ): Map<string, SynthesizedKnowledge[]> {
    const themes = new Map<string, SynthesizedKnowledge[]>();

    // Simple theme extraction based on common words
    for (const item of knowledge) {
      const words = item.content.split(/\s+/)
        .filter(w => w.length > 5)
        .slice(0, 3);

      for (const word of words) {
        if (!themes.has(word)) {
          themes.set(word, []);
        }
        themes.get(word)!.push(item);
      }
    }

    return themes;
  }

  private calculateThemeReliability(
    occurrences: SynthesizedKnowledge[],
  ): number {
    const avgConfidence = occurrences.reduce((sum, o) => sum + o.confidence, 0) /
                         occurrences.length;
    return avgConfidence;
  }

  private extractConditions(occurrences: SynthesizedKnowledge[]): string[] {
    // Extract common conditions from content
    return [`Occurs in ${occurrences.length} instances`];
  }

  private extractOutcomes(_occurrences: SynthesizedKnowledge[]): string[] {
    // Extract common outcomes
    return ['Leads to enhanced understanding'];
  }

  private findCausalPatterns(
    knowledge: SynthesizedKnowledge[],
  ): Pattern[] {
    const patterns: Pattern[] = [];

    // Look for cause-effect keywords
    for (const item of knowledge) {
      if (item.content.includes('causes') ||
          item.content.includes('leads to') ||
          item.content.includes('results in')) {
        patterns.push({
          id: `causal-${Date.now()}`,
          description: `Causal relationship in: ${item.content.substring(0, 50)}...`,
          frequency: 1,
          reliability: item.confidence,
        });
      }
    }

    return patterns;
  }

  private findHierarchies(
    knowledge: SynthesizedKnowledge[],
  ): Pattern[] {
    const patterns: Pattern[] = [];

    // Look for hierarchical keywords
    for (const item of knowledge) {
      if (item.content.includes('parent') ||
          item.content.includes('child') ||
          item.content.includes('subcategory')) {
        patterns.push({
          id: `hierarchy-${Date.now()}`,
          description: `Hierarchical structure in: ${item.content.substring(0, 50)}...`,
          frequency: 1,
          reliability: item.confidence,
        });
      }
    }

    return patterns;
  }

  private async requestValidation(
    _item: SynthesizedKnowledge,
  ): Promise<{ validators: string[]; score: number }> {
    // Simulate validation request to neighbors
    const validators: string[] = [];
    let totalScore = 0;

    for (const [id, neighbor] of this.neighbors) {
      // Neighbor validates based on their knowledge
      const validationScore = Math.random() * neighbor.fitness;
      if (validationScore > 0.5) {
        validators.push(id);
        totalScore += validationScore;
      }
    }

    return {
      validators,
      score: validators.length > 0 ? totalScore / validators.length : 0,
    };
  }

  private calculateSimilarity(content1: string, content2: string): number {
    // Simple word-based similarity
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  private calculateResearchConfidence(findings: ValidatedFinding[]): number {
    if (findings.length === 0) {return 0;}

    const avgConfidence = findings.reduce((sum, f) => sum + f.confidence, 0) /
                         findings.length;
    const avgValidation = findings.reduce((sum, f) => sum + f.validationScore, 0) /
                         findings.length;

    return avgConfidence * 0.6 + avgValidation * 0.4;
  }

  private calculateImpact(findings: ValidatedFinding[]): number {
    // Impact based on novelty and confidence
    let impact = 0;

    for (const finding of findings) {
      // Check if finding is novel
      const isNovel = !Array.from(this.knowledgeGraph.nodes.values())
        .some(node => this.calculateSimilarity(finding.content, node.content) > 0.9);

      if (isNovel) {
        impact += finding.confidence;
      } else {
        impact += finding.confidence * 0.3; // Reinforcement has lower impact
      }
    }

    return impact / findings.length;
  }

  private extractResearchInsights(experience: Experience): string[] {
    const insights: string[] = [];

    if (experience.success) {
      insights.push(`Successful research approach: ${experience.action}`);
    } else {
      insights.push(`Ineffective approach for ${experience.situation}: ${experience.action}`);
    }

    insights.push(...experience.learnings);

    return insights;
  }

  private evaluateResearchPotential(option: unknown): number {
    const optionStr = JSON.stringify(option);

    // Higher score for options mentioning research keywords
    let score = 0;
    const keywords = ['research', 'explore', 'discover', 'investigate', 'analyze'];

    for (const keyword of keywords) {
      if (optionStr.includes(keyword)) {
        score += 0.2;
      }
    }

    // Higher score for novel areas
    const novelty = 1 - this.calculateKnowledgeCoverage([optionStr]);
    score += novelty * 0.5;

    return Math.min(1, score);
  }

  /**
   * Get research statistics
   */
  getResearchStats(): ResearchStatistics {
    const activeTopics = Array.from(this.researchTopics.values())
      .filter(t => t.status === 'active').length;

    const totalFindings = this.discoveryHistory
      .reduce((sum, d) => sum + d.findings, 0);

    const avgImpact = this.discoveryHistory.length > 0 ?
      this.discoveryHistory.reduce((sum, d) => sum + d.impact, 0) /
      this.discoveryHistory.length : 0;

    return {
      activeTopics,
      totalFindings,
      knowledgeNodes: this.knowledgeGraph.nodes.size,
      knowledgeEdges: this.knowledgeGraph.edges.length,
      discoveries: this.discoveryHistory.length,
      averageImpact: avgImpact,
      collaborativeFindings: this.collaborativeFindings.size,
    };
  }
}

// Type definitions
interface ResearchTopic {
  id: string;
  name: string;
  keywords: string[];
  startTime: number;
  findings: string[];
  collaborators: string[];
  status: 'active' | 'completed' | 'paused';
}

interface KnowledgeGraph {
  nodes: Map<string, KnowledgeNode>;
  edges: KnowledgeEdge[];
  lastUpdate: number;
}

interface KnowledgeNode {
  id: string;
  content: string;
  confidence: number;
  created: number;
  lastAccessed: number;
  accessCount: number;
}

interface KnowledgeEdge {
  from: string;
  to: string;
  weight: number;
  type: 'similar' | 'causal' | 'hierarchical';
}

interface Discovery {
  id: string;
  topicId: string;
  timestamp: number;
  findings: number;
  impact: number;
}

interface CollaborativeFinding {
  id: string;
  content: string;
  contributors: string[];
  confidence: number;
  timestamp: number;
}

interface ResearchResult {
  topicId: string;
  findings: ValidatedFinding[];
  patterns: Pattern[];
  confidence: number;
  collaborators: string[];
  duration: number;
}

interface ExplorationResult {
  position: Position;
  content: string;
  relevance: number;
  discoveredBy: string;
}

interface SynthesizedKnowledge {
  id: string;
  content: string;
  evidence: Evidence[];
  confidence: number;
  contributors: string[];
}

interface ValidatedFinding extends SynthesizedKnowledge {
  validated: boolean;
  validationScore: number;
  validators: string[];
}

interface ResearchStatistics {
  activeTopics: number;
  totalFindings: number;
  knowledgeNodes: number;
  knowledgeEdges: number;
  discoveries: number;
  averageImpact: number;
  collaborativeFindings: number;
}