/**
 * Local Agent System Types
 *
 * Core types for the local agent system with no LLM dependencies
 */

export interface AgentConfig {
  id: string;
  name: string;
  type: AgentType;
  enterpriseId: string;
  capabilities: AgentCapability[];
  memory?: {
    shortTermEnabled: boolean;
    longTermEnabled: boolean;
  };
  learningRate?: number;
  explorationRate?: number;
}

export enum AgentType {
  SECRETARY = 'secretary',
  MANAGER = 'manager',
  FINANCIAL = 'financial',
  LEGAL = 'legal',
  ANALYTICS = 'analytics',
  VENDOR = 'vendor',
  NOTIFICATIONS = 'notifications',
  RESEARCH = 'research',
  OPTIMIZATION = 'optimization',
  SWARM = 'swarm',
}

export enum AgentCapability {
  // Basic capabilities
  PATTERN_RECOGNITION = 'pattern_recognition',
  DECISION_MAKING = 'decision_making',
  TASK_PLANNING = 'task_planning',
  DATA_ANALYSIS = 'data_analysis',

  // Advanced capabilities
  METACOGNITIVE_AWARENESS = 'metacognitive_awareness',
  CAUSAL_REASONING = 'causal_reasoning',
  THEORY_OF_MIND = 'theory_of_mind',
  QUANTUM_OPTIMIZATION = 'quantum_optimization',

  // Swarm capabilities
  SWARM_INTELLIGENCE = 'swarm_intelligence',
  EMERGENT_BEHAVIOR = 'emergent_behavior',
  COLLECTIVE_LEARNING = 'collective_learning',
  DISTRIBUTED_PROBLEM_SOLVING = 'distributed_problem_solving',
}

export interface Message {
  id: string;
  content: string;
  timestamp: Date;
  sender: string;
  metadata?: Record<string, unknown>;
}

export interface ProcessedMessage {
  originalMessage: Message;
  understanding: MessageUnderstanding;
  suggestedActions: string[];
  confidence: number;
  reasoning: string[];
}

export interface MessageUnderstanding {
  intent: string;
  entities: Entity[];
  sentiment: number;
  urgency: number;
  topics: string[];
}

export interface Entity {
  type: string;
  value: string;
  confidence: number;
}

export interface Task {
  id: string;
  type: string;
  description: string;
  priority?: number;
  deadline?: Date;
  assignedTo?: string;
  status: TaskStatus;
  dependencies?: string[];
  metadata?: Record<string, unknown>;
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface AgentContext {
  userId: string;
  enterpriseId: string;
  sessionId: string;
  environment: Record<string, unknown>;
  permissions: string[];
}

export interface AgentMemory {
  shortTerm: ShortTermMemory;
  longTerm: LongTermMemory;
}

export interface ShortTermMemory {
  entries: MemoryEntry[];
  maxSize: number;
  retentionPeriod: number; // hours
}

export interface LongTermMemory {
  facts: Fact[];
  patterns: Pattern[];
  experiences: Experience[];
}

export interface MemoryEntry {
  id: string;
  content: unknown;
  timestamp: Date;
  importance: number;
  accessed: number;
}

export interface Fact {
  id: string;
  statement: string;
  confidence: number;
  source: string;
  timestamp: Date;
  validatedBy: string[];
}

export interface Pattern {
  id: string;
  description: string;
  frequency: number;
  reliability: number;
  conditions?: string[];
  outcomes?: string[];
}

export interface Experience {
  id: string;
  situation: string;
  action: string;
  outcome: string;
  success: boolean;
  learnings: string[];
  timestamp: Date;
}

export interface LearningResult {
  patterns: Pattern[];
  insights: string[];
  improvements: Improvement[];
  confidence: number;
}

export interface Improvement {
  area: string;
  current: number;
  suggested: number;
  reasoning: string;
}

export interface AgentState {
  id: string;
  status: AgentStatus;
  currentTask?: Task;
  memory: AgentMemory;
  performance: PerformanceMetrics;
  lastUpdate: Date;
}

export enum AgentStatus {
  IDLE = 'idle',
  THINKING = 'thinking',
  EXECUTING = 'executing',
  LEARNING = 'learning',
  ERROR = 'error',
}

export interface PerformanceMetrics {
  tasksCompleted: number;
  successRate: number;
  averageResponseTime: number;
  learningProgress: number;
  adaptability: number;
}

export interface AgentResponse {
  agentId: string;
  response: unknown;
  confidence: number;
  reasoning?: string[];
  suggestedActions?: Action[];
  metadata?: Record<string, unknown>;
}

export interface Action {
  type: string;
  description: string;
  parameters?: Record<string, unknown>;
  priority: number;
  estimatedDuration?: number;
}

/**
 * Base LocalAgent class
 */
export abstract class LocalAgent {
  protected id: string;
  protected name: string;
  protected type: AgentType;
  protected enterpriseId: string;
  protected capabilities: AgentCapability[];
  protected memory: AgentMemory;
  protected state: AgentState;
  protected config: AgentConfig;

  constructor(config: AgentConfig) {
    this.id = config.id;
    this.name = config.name;
    this.type = config.type;
    this.enterpriseId = config.enterpriseId;
    this.capabilities = config.capabilities;
    this.config = config;

    // Initialize memory
    this.memory = {
      shortTerm: {
        entries: [],
        maxSize: 100,
        retentionPeriod: 24,
      },
      longTerm: {
        facts: [],
        patterns: [],
        experiences: [],
      },
    };

    // Initialize state
    this.state = {
      id: this.id,
      status: AgentStatus.IDLE,
      memory: this.memory,
      performance: {
        tasksCompleted: 0,
        successRate: 0,
        averageResponseTime: 0,
        learningProgress: 0,
        adaptability: 0.5,
      },
      lastUpdate: new Date(),
    };
  }

  /**
   * Process incoming message
   */
  abstract async processMessage(message: Message): Promise<ProcessedMessage>;

  /**
   * Execute a task
   */
  abstract async executeTask(task: Task, context: AgentContext): Promise<unknown>;

  /**
   * Learn from experience
   */
  abstract async learn(experience: Experience): Promise<LearningResult>;

  /**
   * Make a decision
   */
  abstract async decide(options: unknown[], context: AgentContext): Promise<unknown>;

  /**
   * Get agent capabilities
   */
  getCapabilities(): AgentCapability[] {
    return this.capabilities;
  }

  /**
   * Get current state
   */
  getState(): AgentState {
    return this.state;
  }

  /**
   * Update state
   */
  protected updateState(updates: Partial<AgentState>): void {
    this.state = {
      ...this.state,
      ...updates,
      lastUpdate: new Date(),
    };
  }

  /**
   * Add to short-term memory
   */
  protected addToShortTermMemory(content: unknown, importance: number = 0.5): void {
    const entry: MemoryEntry = {
      id: `mem-${Date.now()}`,
      content,
      timestamp: new Date(),
      importance,
      accessed: 1,
    };

    this.memory.shortTerm.entries.push(entry);

    // Maintain size limit
    if (this.memory.shortTerm.entries.length > this.memory.shortTerm.maxSize) {
      // Remove least important/accessed
      this.memory.shortTerm.entries.sort((a, b) =>
        (b.importance * b.accessed) - (a.importance * a.accessed),
      );
      this.memory.shortTerm.entries = this.memory.shortTerm.entries.slice(0, this.memory.shortTerm.maxSize);
    }
  }

  /**
   * Add to long-term memory
   */
  protected addToLongTermMemory(item: Fact | Pattern | Experience): void {
    if ('statement' in item) {
      this.memory.longTerm.facts.push(item as Fact);
    } else if ('frequency' in item) {
      this.memory.longTerm.patterns.push(item as Pattern);
    } else if ('situation' in item) {
      this.memory.longTerm.experiences.push(item as Experience);
    }
  }

  /**
   * Search memory
   */
  protected searchMemory(query: string): unknown[] {
    const results: unknown[] = [];

    // Search short-term memory
    this.memory.shortTerm.entries.forEach(entry => {
      if (JSON.stringify(entry.content).toLowerCase().includes(query.toLowerCase())) {
        entry.accessed++;
        results.push(entry.content);
      }
    });

    // Search long-term memory
    this.memory.longTerm.facts.forEach(fact => {
      if (fact.statement.toLowerCase().includes(query.toLowerCase())) {
        results.push(fact);
      }
    });

    return results;
  }

  /**
   * Clean up old memories
   */
  protected cleanupMemory(): void {
    const now = new Date();
    const retentionMs = this.memory.shortTerm.retentionPeriod * 60 * 60 * 1000;

    // Clean short-term memory
    this.memory.shortTerm.entries = this.memory.shortTerm.entries.filter(entry =>
      now.getTime() - entry.timestamp.getTime() < retentionMs,
    );
  }
}