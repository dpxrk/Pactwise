/**
 * Web Worker for AI chat memory operations
 * Handles memory consolidation, search, and analysis
 */

// Consolidate conversation memories
async function consolidateMemories(memories, options = {}) {
  const { maxMemories = 100, consolidationThreshold = 0.8 } = options;
  
  if (memories.length <= maxMemories) {
    return memories;
  }

  // Group similar memories
  const groups = [];
  const processed = new Set();

  for (let i = 0; i < memories.length; i++) {
    if (processed.has(i)) continue;
    
    const group = [memories[i]];
    processed.add(i);
    
    for (let j = i + 1; j < memories.length; j++) {
      if (processed.has(j)) continue;
      
      const similarity = calculateMemorySimilarity(memories[i], memories[j]);
      if (similarity >= consolidationThreshold) {
        group.push(memories[j]);
        processed.add(j);
      }
    }
    
    groups.push(group);
  }

  // Consolidate each group
  const consolidated = groups.map(group => {
    if (group.length === 1) {
      return group[0];
    }
    
    return {
      ...group[0],
      content: mergeMemoryContent(group),
      metadata: mergeMemoryMetadata(group),
      consolidatedFrom: group.length,
      importance: calculateGroupImportance(group)
    };
  });

  // Sort by importance and recency
  consolidated.sort((a, b) => {
    const scoreA = a.importance * 0.7 + (1 / (Date.now() - new Date(a.timestamp).getTime())) * 0.3;
    const scoreB = b.importance * 0.7 + (1 / (Date.now() - new Date(b.timestamp).getTime())) * 0.3;
    return scoreB - scoreA;
  });

  return consolidated.slice(0, maxMemories);
}

// Analyze conversation patterns
async function analyzeConversationPatterns(messages) {
  const patterns = {
    topics: {},
    entities: {},
    sentiments: [],
    questionTypes: {},
    responsePatterns: [],
    userPreferences: {},
    contextSwitches: 0
  };

  let previousTopic = null;
  
  messages.forEach((message, index) => {
    // Extract topics
    const topics = extractTopics(message.content);
    topics.forEach(topic => {
      patterns.topics[topic] = (patterns.topics[topic] || 0) + 1;
    });

    // Track context switches
    const currentTopic = topics[0];
    if (previousTopic && currentTopic && previousTopic !== currentTopic) {
      patterns.contextSwitches++;
    }
    previousTopic = currentTopic;

    // Extract entities
    const entities = extractEntities(message.content);
    entities.forEach(entity => {
      if (!patterns.entities[entity.type]) {
        patterns.entities[entity.type] = [];
      }
      patterns.entities[entity.type].push(entity.value);
    });

    // Analyze sentiment
    if (message.role === 'user') {
      patterns.sentiments.push(analyzeSentiment(message.content));
    }

    // Classify questions
    if (message.role === 'user' && message.content.includes('?')) {
      const questionType = classifyQuestion(message.content);
      patterns.questionTypes[questionType] = (patterns.questionTypes[questionType] || 0) + 1;
    }

    // Analyze response patterns
    if (message.role === 'assistant' && index > 0 && messages[index - 1].role === 'user') {
      patterns.responsePatterns.push({
        userIntent: classifyIntent(messages[index - 1].content),
        responseType: classifyResponse(message.content),
        responseLength: message.content.length
      });
    }
  });

  // Analyze user preferences
  patterns.userPreferences = analyzeUserPreferences(messages, patterns);

  return patterns;
}

// Search through conversation history
async function searchConversationHistory(history, query, options = {}) {
  const { limit = 20, threshold = 0.5, searchType = 'semantic' } = options;
  
  const results = [];
  const queryKeywords = extractKeywords(query.toLowerCase());
  
  // Report progress for large histories
  const total = history.length;
  let processed = 0;
  
  for (const item of history) {
    let score = 0;
    
    if (searchType === 'semantic' && item.embedding && options.queryEmbedding) {
      // Semantic search using embeddings
      score = cosineSimilarity(options.queryEmbedding, item.embedding);
    } else {
      // Keyword-based search
      const itemKeywords = extractKeywords(item.content.toLowerCase());
      score = calculateKeywordOverlap(queryKeywords, itemKeywords);
    }
    
    if (score >= threshold) {
      results.push({
        ...item,
        relevanceScore: score,
        highlights: highlightMatches(item.content, queryKeywords)
      });
    }
    
    processed++;
    if (processed % 100 === 0) {
      self.postMessage({
        type: 'PROGRESS',
        data: { processed, total, percentage: (processed / total) * 100 }
      });
    }
  }
  
  // Sort by relevance and recency
  results.sort((a, b) => {
    const scoreA = a.relevanceScore * 0.7 + (1 / (Date.now() - new Date(a.timestamp).getTime())) * 0.3;
    const scoreB = b.relevanceScore * 0.7 + (1 / (Date.now() - new Date(b.timestamp).getTime())) * 0.3;
    return scoreB - scoreA;
  });
  
  return results.slice(0, limit);
}

// Generate conversation summary
async function generateConversationSummary(messages, options = {}) {
  const { maxLength = 500, includeInsights = true } = options;
  
  const summary = {
    overview: '',
    keyPoints: [],
    actionItems: [],
    decisions: [],
    insights: [],
    metadata: {
      messageCount: messages.length,
      duration: 0,
      participants: new Set()
    }
  };

  // Calculate conversation duration
  if (messages.length > 0) {
    const start = new Date(messages[0].timestamp);
    const end = new Date(messages[messages.length - 1].timestamp);
    summary.metadata.duration = end - start;
  }

  // Extract participants
  messages.forEach(msg => {
    summary.metadata.participants.add(msg.role);
  });

  // Extract key points
  const topics = {};
  messages.forEach(msg => {
    const msgTopics = extractTopics(msg.content);
    msgTopics.forEach(topic => {
      topics[topic] = (topics[topic] || 0) + 1;
    });
  });

  // Top topics become key points
  summary.keyPoints = Object.entries(topics)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([topic, count]) => ({
      topic,
      mentions: count,
      importance: count / messages.length
    }));

  // Extract action items and decisions
  messages.forEach(msg => {
    // Look for action items
    const actionPatterns = [
      /(?:need to|should|will|must|have to)\s+(\w+\s+\w+(?:\s+\w+)?)/gi,
      /(?:action item|todo|task):\s*(.+?)(?:\.|$)/gi
    ];
    
    actionPatterns.forEach(pattern => {
      const matches = msg.content.matchAll(pattern);
      for (const match of matches) {
        summary.actionItems.push({
          text: match[1].trim(),
          source: msg.role,
          timestamp: msg.timestamp
        });
      }
    });

    // Look for decisions
    const decisionPatterns = [
      /(?:decided|agreed|confirmed|approved)\s+(?:to\s+)?(.+?)(?:\.|$)/gi,
      /(?:decision|conclusion):\s*(.+?)(?:\.|$)/gi
    ];
    
    decisionPatterns.forEach(pattern => {
      const matches = msg.content.matchAll(pattern);
      for (const match of matches) {
        summary.decisions.push({
          text: match[1].trim(),
          source: msg.role,
          timestamp: msg.timestamp
        });
      }
    });
  });

  // Generate insights if requested
  if (includeInsights) {
    const patterns = await analyzeConversationPatterns(messages);
    
    // Conversation flow insight
    if (patterns.contextSwitches > messages.length * 0.3) {
      summary.insights.push({
        type: 'conversation_flow',
        description: 'Frequent topic changes detected - conversation may lack focus'
      });
    }

    // Dominant topics
    const dominantTopics = Object.entries(patterns.topics)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
    
    if (dominantTopics.length > 0) {
      summary.insights.push({
        type: 'main_topics',
        description: `Main discussion topics: ${dominantTopics.map(([t]) => t).join(', ')}`
      });
    }

    // Question patterns
    const totalQuestions = Object.values(patterns.questionTypes).reduce((a, b) => a + b, 0);
    if (totalQuestions > messages.length * 0.4) {
      summary.insights.push({
        type: 'interaction_style',
        description: 'High question frequency - exploratory or investigative conversation'
      });
    }
  }

  // Generate overview
  summary.overview = createOverview(summary, maxLength);

  return summary;
}

// Helper functions
function calculateMemorySimilarity(mem1, mem2) {
  // Simple similarity based on content overlap
  const words1 = new Set(mem1.content.toLowerCase().split(/\s+/));
  const words2 = new Set(mem2.content.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

function mergeMemoryContent(memories) {
  // Combine content, removing duplicates
  const sentences = new Set();
  
  memories.forEach(mem => {
    const memSentences = mem.content.split(/[.!?]+/).filter(s => s.trim());
    memSentences.forEach(s => sentences.add(s.trim()));
  });
  
  return Array.from(sentences).join('. ') + '.';
}

function mergeMemoryMetadata(memories) {
  const metadata = {};
  
  memories.forEach(mem => {
    Object.entries(mem.metadata || {}).forEach(([key, value]) => {
      if (!metadata[key]) {
        metadata[key] = [];
      }
      metadata[key].push(value);
    });
  });
  
  // Flatten arrays
  Object.keys(metadata).forEach(key => {
    if (metadata[key].every(v => typeof v === 'string')) {
      metadata[key] = [...new Set(metadata[key])];
    }
  });
  
  return metadata;
}

function calculateGroupImportance(memories) {
  // Calculate importance based on frequency and recency
  const recencyScore = memories.reduce((sum, mem) => {
    const age = Date.now() - new Date(mem.timestamp).getTime();
    return sum + (1 / (age / (1000 * 60 * 60 * 24) + 1)); // Days old
  }, 0) / memories.length;
  
  const frequencyScore = Math.min(1, memories.length / 10);
  
  return recencyScore * 0.4 + frequencyScore * 0.6;
}

function extractTopics(text) {
  // Simple topic extraction based on noun phrases
  const topics = [];
  const nounPhrases = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
  
  nounPhrases.forEach(phrase => {
    if (phrase.length > 3) {
      topics.push(phrase.toLowerCase());
    }
  });
  
  return [...new Set(topics)];
}

function extractEntities(text) {
  const entities = [];
  
  // Extract dates
  const datePattern = /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g;
  const dates = text.match(datePattern) || [];
  dates.forEach(date => {
    entities.push({ type: 'date', value: date });
  });
  
  // Extract money amounts
  const moneyPattern = /\$[\d,]+\.?\d*/g;
  const amounts = text.match(moneyPattern) || [];
  amounts.forEach(amount => {
    entities.push({ type: 'money', value: amount });
  });
  
  // Extract potential company names
  const companyPattern = /\b(?:[A-Z][a-z]+\s+)?(?:Inc|LLC|Corp|Limited|Ltd|Company|Co)\b/g;
  const companies = text.match(companyPattern) || [];
  companies.forEach(company => {
    entities.push({ type: 'organization', value: company });
  });
  
  return entities;
}

function analyzeSentiment(text) {
  // Simple sentiment analysis
  const positiveWords = ['good', 'great', 'excellent', 'happy', 'pleased', 'satisfied', 'love', 'perfect'];
  const negativeWords = ['bad', 'poor', 'terrible', 'unhappy', 'disappointed', 'frustrated', 'hate', 'awful'];
  
  const words = text.toLowerCase().split(/\s+/);
  let score = 0;
  
  words.forEach(word => {
    if (positiveWords.includes(word)) score++;
    if (negativeWords.includes(word)) score--;
  });
  
  return {
    score: score / words.length,
    label: score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral'
  };
}

function classifyQuestion(text) {
  if (text.includes('what')) return 'what';
  if (text.includes('how')) return 'how';
  if (text.includes('why')) return 'why';
  if (text.includes('when')) return 'when';
  if (text.includes('where')) return 'where';
  if (text.includes('who')) return 'who';
  if (text.includes('can') || text.includes('could')) return 'capability';
  return 'other';
}

function classifyIntent(text) {
  const intents = {
    question: /\?|what|how|why|when|where|who/i,
    request: /please|could you|can you|would you|need|want/i,
    confirmation: /yes|no|correct|right|wrong|agree/i,
    clarification: /mean|understand|explain|clarify/i
  };
  
  for (const [intent, pattern] of Object.entries(intents)) {
    if (pattern.test(text)) return intent;
  }
  
  return 'statement';
}

function classifyResponse(text) {
  if (text.length < 50) return 'brief';
  if (text.includes('```') || text.includes('    ')) return 'code';
  if (text.split('\n').length > 5) return 'detailed';
  if (text.includes('1.') || text.includes('•')) return 'list';
  return 'standard';
}

function analyzeUserPreferences(messages, patterns) {
  const preferences = {
    communicationStyle: '',
    detailLevel: '',
    topicInterests: [],
    responseFormat: ''
  };
  
  // Analyze communication style
  const questionRatio = Object.values(patterns.questionTypes).reduce((a, b) => a + b, 0) / messages.length;
  preferences.communicationStyle = questionRatio > 0.5 ? 'inquisitive' : 'directive';
  
  // Analyze preferred detail level
  const avgUserMessageLength = messages
    .filter(m => m.role === 'user')
    .reduce((sum, m) => sum + m.content.length, 0) / messages.filter(m => m.role === 'user').length;
  
  preferences.detailLevel = avgUserMessageLength > 200 ? 'detailed' : 'concise';
  
  // Top interests
  preferences.topicInterests = Object.entries(patterns.topics)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([topic]) => topic);
  
  // Preferred response format
  const responseTypes = patterns.responsePatterns.map(p => p.responseType);
  const typeFreq = {};
  responseTypes.forEach(type => {
    typeFreq[type] = (typeFreq[type] || 0) + 1;
  });
  
  preferences.responseFormat = Object.entries(typeFreq)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'standard';
  
  return preferences;
}

function extractKeywords(text) {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been'
  ]);
  
  return text.split(/\s+/)
    .map(word => word.replace(/[^a-z0-9]/g, ''))
    .filter(word => word.length > 2 && !stopWords.has(word));
}

function calculateKeywordOverlap(keywords1, keywords2) {
  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

function highlightMatches(text, keywords) {
  let highlighted = text;
  
  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
    highlighted = highlighted.replace(regex, '**$1**');
  });
  
  return highlighted;
}

function cosineSimilarity(vec1, vec2) {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) return 0;
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  
  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);
  
  if (norm1 === 0 || norm2 === 0) return 0;
  return dotProduct / (norm1 * norm2);
}

function createOverview(summary, maxLength) {
  const parts = [];
  
  // Add basic info
  parts.push(`Conversation with ${summary.metadata.messageCount} messages`);
  
  // Add main topics
  if (summary.keyPoints.length > 0) {
    const topics = summary.keyPoints.slice(0, 3).map(kp => kp.topic).join(', ');
    parts.push(`discussing ${topics}`);
  }
  
  // Add key outcomes
  if (summary.decisions.length > 0) {
    parts.push(`${summary.decisions.length} decisions made`);
  }
  
  if (summary.actionItems.length > 0) {
    parts.push(`${summary.actionItems.length} action items identified`);
  }
  
  const overview = parts.join(', ') + '.';
  
  // Truncate if too long
  if (overview.length > maxLength) {
    return overview.substring(0, maxLength - 3) + '...';
  }
  
  return overview;
}

// Message handler
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;

  try {
    switch (type) {
      case 'CONSOLIDATE_MEMORIES':
        const consolidated = await consolidateMemories(data.memories, data.options);
        self.postMessage({ type: 'CONSOLIDATE_MEMORIES_RESULT', data: consolidated });
        break;

      case 'ANALYZE_PATTERNS':
        const patterns = await analyzeConversationPatterns(data.messages);
        self.postMessage({ type: 'ANALYZE_PATTERNS_RESULT', data: patterns });
        break;

      case 'SEARCH_HISTORY':
        const searchResults = await searchConversationHistory(
          data.history,
          data.query,
          data.options
        );
        self.postMessage({ type: 'SEARCH_HISTORY_RESULT', data: searchResults });
        break;

      case 'GENERATE_SUMMARY':
        const summary = await generateConversationSummary(data.messages, data.options);
        self.postMessage({ type: 'GENERATE_SUMMARY_RESULT', data: summary });
        break;

      default:
        self.postMessage({ 
          type: 'ERROR', 
          error: `Unknown operation: ${type}` 
        });
    }
  } catch (error) {
    self.postMessage({ 
      type: 'ERROR', 
      error: error.message || 'Processing error' 
    });
  }
});