/**
 * Web Worker for similarity calculations
 * Handles vector operations and similarity searches
 */

// Calculate cosine similarity between two vectors
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

// Batch similarity calculations
async function batchSimilarity(targetVector, vectorDatabase, options = {}) {
  const { threshold = 0.5, topK = 10, includeScores = true } = options;
  
  const results = [];
  const total = vectorDatabase.length;
  let processed = 0;

  // Process in batches to report progress
  const batchSize = 100;
  
  for (let i = 0; i < total; i += batchSize) {
    const batch = vectorDatabase.slice(i, i + batchSize);
    
    batch.forEach((item, index) => {
      if (item.vector) {
        const similarity = cosineSimilarity(targetVector, item.vector);
        if (similarity >= threshold) {
          results.push({
            ...item,
            similarity,
            rank: 0 // Will be set after sorting
          });
        }
      }
      processed++;
    });

    // Report progress
    if (processed % 100 === 0 || processed === total) {
      self.postMessage({
        type: 'PROGRESS',
        data: {
          processed,
          total,
          percentage: (processed / total) * 100
        }
      });
    }
  }

  // Sort by similarity and assign ranks
  results.sort((a, b) => b.similarity - a.similarity);
  results.forEach((item, index) => {
    item.rank = index + 1;
  });

  return includeScores ? results.slice(0, topK) : results.slice(0, topK).map(r => {
    const { similarity, rank, ...rest } = r;
    return rest;
  });
}

// Find clusters in embedding space
async function findClusters(vectors, options = {}) {
  const { 
    minClusterSize = 3, 
    similarityThreshold = 0.8,
    maxIterations = 100 
  } = options;

  const clusters = [];
  const assigned = new Set();

  // Simple clustering algorithm
  for (let i = 0; i < vectors.length; i++) {
    if (assigned.has(i)) continue;

    const cluster = {
      id: clusters.length,
      centroid: vectors[i].vector,
      members: [vectors[i]],
      indices: [i]
    };

    // Find similar vectors
    for (let j = i + 1; j < vectors.length; j++) {
      if (assigned.has(j)) continue;

      const similarity = cosineSimilarity(cluster.centroid, vectors[j].vector);
      if (similarity >= similarityThreshold) {
        cluster.members.push(vectors[j]);
        cluster.indices.push(j);
        assigned.add(j);
      }
    }

    if (cluster.members.length >= minClusterSize) {
      // Update centroid
      cluster.centroid = calculateCentroid(cluster.members.map(m => m.vector));
      clusters.push(cluster);
      assigned.add(i);
    }
  }

  return clusters;
}

// Calculate centroid of vectors
function calculateCentroid(vectors) {
  if (!vectors || vectors.length === 0) return null;
  
  const dimensions = vectors[0].length;
  const centroid = new Array(dimensions).fill(0);
  
  vectors.forEach(vector => {
    for (let i = 0; i < dimensions; i++) {
      centroid[i] += vector[i];
    }
  });
  
  for (let i = 0; i < dimensions; i++) {
    centroid[i] /= vectors.length;
  }
  
  return centroid;
}

// Semantic search with query expansion
async function semanticSearch(query, database, options = {}) {
  const {
    queryVector,
    expansionVectors = [],
    weights = [1.0],
    threshold = 0.5,
    topK = 20
  } = options;

  if (!queryVector) {
    return { error: 'Query vector required for semantic search' };
  }

  // Combine query with expansion vectors if provided
  let effectiveQuery = queryVector;
  if (expansionVectors.length > 0) {
    effectiveQuery = combineVectors([queryVector, ...expansionVectors], weights);
  }

  // Search with combined query
  const results = await batchSimilarity(effectiveQuery, database, {
    threshold,
    topK: topK * 2, // Get more results for re-ranking
    includeScores: true
  });

  // Re-rank results if expansion was used
  if (expansionVectors.length > 0) {
    results.forEach(result => {
      // Boost score based on exact match with original query
      const originalSimilarity = cosineSimilarity(queryVector, result.vector);
      result.finalScore = result.similarity * 0.7 + originalSimilarity * 0.3;
    });
    
    results.sort((a, b) => b.finalScore - a.finalScore);
  }

  return results.slice(0, topK);
}

// Combine multiple vectors with weights
function combineVectors(vectors, weights) {
  if (!vectors || vectors.length === 0) return null;
  
  const dimensions = vectors[0].length;
  const combined = new Array(dimensions).fill(0);
  
  // Normalize weights
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const normalizedWeights = weights.map(w => w / totalWeight);
  
  // Weighted combination
  vectors.forEach((vector, idx) => {
    const weight = normalizedWeights[idx] || normalizedWeights[0];
    for (let i = 0; i < dimensions; i++) {
      combined[i] += vector[i] * weight;
    }
  });
  
  // Normalize the result
  return normalizeVector(combined);
}

// Normalize vector to unit length
function normalizeVector(vector) {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return vector;
  return vector.map(val => val / magnitude);
}

// Find anomalies in vector space
async function findAnomalies(vectors, options = {}) {
  const { threshold = 2.0 } = options; // Standard deviations from mean
  
  if (vectors.length < 3) {
    return { anomalies: [], error: 'Need at least 3 vectors for anomaly detection' };
  }

  // Calculate average similarity for each vector
  const avgSimilarities = vectors.map((vector, i) => {
    let totalSim = 0;
    let count = 0;
    
    vectors.forEach((other, j) => {
      if (i !== j) {
        totalSim += cosineSimilarity(vector.vector, other.vector);
        count++;
      }
    });
    
    return {
      index: i,
      item: vector,
      avgSimilarity: totalSim / count
    };
  });

  // Calculate mean and standard deviation
  const mean = avgSimilarities.reduce((sum, item) => sum + item.avgSimilarity, 0) / avgSimilarities.length;
  const variance = avgSimilarities.reduce((sum, item) => sum + Math.pow(item.avgSimilarity - mean, 2), 0) / avgSimilarities.length;
  const stdDev = Math.sqrt(variance);

  // Find anomalies
  const anomalies = avgSimilarities.filter(item => {
    const zScore = Math.abs((item.avgSimilarity - mean) / stdDev);
    return zScore > threshold;
  }).map(item => ({
    ...item.item,
    anomalyScore: (mean - item.avgSimilarity) / stdDev,
    avgSimilarity: item.avgSimilarity
  }));

  return {
    anomalies,
    stats: { mean, stdDev, threshold }
  };
}

// Message handler
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;

  try {
    switch (type) {
      case 'CALCULATE_SIMILARITY':
        const similarity = cosineSimilarity(data.vec1, data.vec2);
        self.postMessage({ 
          type: 'CALCULATE_SIMILARITY_RESULT', 
          data: similarity 
        });
        break;

      case 'BATCH_SIMILARITY':
        const batchResults = await batchSimilarity(
          data.targetVector,
          data.vectorDatabase,
          data.options
        );
        self.postMessage({ 
          type: 'BATCH_SIMILARITY_RESULT', 
          data: batchResults 
        });
        break;

      case 'FIND_CLUSTERS':
        const clusters = await findClusters(data.vectors, data.options);
        self.postMessage({ 
          type: 'FIND_CLUSTERS_RESULT', 
          data: clusters 
        });
        break;

      case 'SEMANTIC_SEARCH':
        const searchResults = await semanticSearch(
          data.query,
          data.database,
          data.options
        );
        self.postMessage({ 
          type: 'SEMANTIC_SEARCH_RESULT', 
          data: searchResults 
        });
        break;

      case 'FIND_ANOMALIES':
        const anomalies = await findAnomalies(data.vectors, data.options);
        self.postMessage({ 
          type: 'FIND_ANOMALIES_RESULT', 
          data: anomalies 
        });
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