// Memory system type definitions

export interface Memory {
  id: string;
  content: string;
  metadata: MemoryMetadata;
  embedding?: number[];
  created_at: string;
  accessed_at?: string;
  access_count: number;
  importance: number;
  decay_rate: number;
}

export interface MemoryMetadata {
  type: 'short_term' | 'long_term' | 'working' | 'procedural' | 'episodic';
  source: string;
  context?: Record<string, unknown>;
  tags?: string[];
  userId?: string;
  enterpriseId: string;
  sessionId?: string;
  relatedMemories?: string[];
}

export interface MemorySearchQuery {
  query: string;
  type?: MemoryMetadata['type'];
  filters?: MemoryFilter[];
  limit?: number;
  threshold?: number;
  includeDecayed?: boolean;
}

export interface MemoryFilter {
  field: string;
  operator: 'equals' | 'contains' | 'in' | 'between';
  value: unknown;
}

export interface MemorySearchResult {
  content: string;
  metadata: MemoryMetadata;
  similarity: number;
  timestamp: string;
  id?: string;
  relevance?: number;
}

export interface MemoryConsolidation {
  shortTermMemories: Memory[];
  consolidatedMemory: Memory;
  droppedMemories: string[];
  consolidationStrategy: 'importance' | 'frequency' | 'recency' | 'combined';
  timestamp: string;
}

export interface MemoryPattern {
  id: string;
  pattern: string;
  occurrences: MemoryOccurrence[];
  confidence: number;
  category?: string;
  insights?: string[];
}

export interface MemoryOccurrence {
  memoryId: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

export interface WorkingMemory {
  items: WorkingMemoryItem[];
  capacity: number;
  focusIndex: number;
  lastUpdated: string;
}

export interface WorkingMemoryItem {
  id: string;
  content: unknown;
  priority: number;
  addedAt: string;
  expiresAt?: string;
  source: string;
}

export interface MemoryStats {
  totalMemories: number;
  byType: Record<string, number>;
  averageImportance: number;
  averageAccessCount: number;
  oldestMemory: string;
  newestMemory: string;
  topTags: TagCount[];
}

export interface TagCount {
  tag: string;
  count: number;
}