/**
 * Web Worker for search indexing and full-text search
 * Builds and maintains search indices for fast client-side search
 */

class SearchIndex {
  constructor() {
    this.documents = new Map();
    this.invertedIndex = new Map();
    this.fieldIndices = new Map();
  }

  // Add or update a document in the index
  addDocument(doc) {
    const { id, ...fields } = doc;
    
    // Store the document
    this.documents.set(id, fields);
    
    // Remove old index entries if updating
    if (this.invertedIndex.has(id)) {
      this.removeDocument(id);
    }
    
    // Index each field
    Object.entries(fields).forEach(([fieldName, value]) => {
      if (typeof value === 'string') {
        this.indexField(id, fieldName, value);
      } else if (Array.isArray(value)) {
        value.forEach(item => {
          if (typeof item === 'string') {
            this.indexField(id, fieldName, item);
          }
        });
      }
    });
  }

  // Index a specific field
  indexField(docId, fieldName, text) {
    const tokens = this.tokenize(text);
    
    // Create field index if it doesn't exist
    if (!this.fieldIndices.has(fieldName)) {
      this.fieldIndices.set(fieldName, new Map());
    }
    
    const fieldIndex = this.fieldIndices.get(fieldName);
    
    tokens.forEach(token => {
      // Global inverted index
      if (!this.invertedIndex.has(token)) {
        this.invertedIndex.set(token, new Set());
      }
      this.invertedIndex.get(token).add(docId);
      
      // Field-specific index
      if (!fieldIndex.has(token)) {
        fieldIndex.set(token, new Set());
      }
      fieldIndex.get(token).add(docId);
    });
  }

  // Remove a document from the index
  removeDocument(id) {
    const doc = this.documents.get(id);
    if (!doc) return;
    
    // Remove from inverted index
    Object.values(doc).forEach(value => {
      if (typeof value === 'string') {
        const tokens = this.tokenize(value);
        tokens.forEach(token => {
          const postings = this.invertedIndex.get(token);
          if (postings) {
            postings.delete(id);
            if (postings.size === 0) {
              this.invertedIndex.delete(token);
            }
          }
        });
      }
    });
    
    // Remove from document store
    this.documents.delete(id);
  }

  // Tokenize text into searchable terms
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2); // Ignore very short tokens
  }

  // Search for documents matching a query
  search(query, options = {}) {
    const {
      fields = null,
      fuzzy = false,
      limit = 50,
      sortBy = 'relevance'
    } = options;
    
    const queryTokens = this.tokenize(query);
    const results = new Map();
    
    queryTokens.forEach(token => {
      const matchingDocs = this.findMatchingDocuments(token, fields, fuzzy);
      
      matchingDocs.forEach(docId => {
        if (!results.has(docId)) {
          results.set(docId, {
            id: docId,
            score: 0,
            matches: []
          });
        }
        
        const result = results.get(docId);
        result.score += 1;
        result.matches.push(token);
      });
    });
    
    // Convert to array and sort
    let sortedResults = Array.from(results.values());
    
    if (sortBy === 'relevance') {
      sortedResults.sort((a, b) => b.score - a.score);
    }
    
    // Apply limit
    sortedResults = sortedResults.slice(0, limit);
    
    // Attach document data
    return sortedResults.map(result => ({
      ...result,
      document: this.documents.get(result.id)
    }));
  }

  // Find documents containing a token
  findMatchingDocuments(token, fields, fuzzy) {
    const matchingDocs = new Set();
    
    if (fields && fields.length > 0) {
      // Search specific fields
      fields.forEach(field => {
        const fieldIndex = this.fieldIndices.get(field);
        if (fieldIndex) {
          const docs = fieldIndex.get(token);
          if (docs) {
            docs.forEach(doc => matchingDocs.add(doc));
          }
          
          if (fuzzy) {
            // Fuzzy search in field
            this.fuzzySearchField(token, fieldIndex).forEach(doc => 
              matchingDocs.add(doc)
            );
          }
        }
      });
    } else {
      // Search all fields
      const docs = this.invertedIndex.get(token);
      if (docs) {
        docs.forEach(doc => matchingDocs.add(doc));
      }
      
      if (fuzzy) {
        // Fuzzy search globally
        this.fuzzySearch(token).forEach(doc => matchingDocs.add(doc));
      }
    }
    
    return matchingDocs;
  }

  // Simple fuzzy search using edit distance
  fuzzySearch(token) {
    const matchingDocs = new Set();
    const maxDistance = Math.floor(token.length / 3);
    
    this.invertedIndex.forEach((docs, indexToken) => {
      if (this.editDistance(token, indexToken) <= maxDistance) {
        docs.forEach(doc => matchingDocs.add(doc));
      }
    });
    
    return matchingDocs;
  }

  // Fuzzy search within a specific field
  fuzzySearchField(token, fieldIndex) {
    const matchingDocs = new Set();
    const maxDistance = Math.floor(token.length / 3);
    
    fieldIndex.forEach((docs, indexToken) => {
      if (this.editDistance(token, indexToken) <= maxDistance) {
        docs.forEach(doc => matchingDocs.add(doc));
      }
    });
    
    return matchingDocs;
  }

  // Calculate edit distance between two strings
  editDistance(s1, s2) {
    const matrix = [];
    
    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[s2.length][s1.length];
  }

  // Get index statistics
  getStats() {
    return {
      documentCount: this.documents.size,
      uniqueTerms: this.invertedIndex.size,
      fields: Array.from(this.fieldIndices.keys()),
      avgTermsPerDoc: this.calculateAvgTermsPerDoc()
    };
  }

  calculateAvgTermsPerDoc() {
    if (this.documents.size === 0) return 0;
    
    let totalTerms = 0;
    this.documents.forEach(doc => {
      Object.values(doc).forEach(value => {
        if (typeof value === 'string') {
          totalTerms += this.tokenize(value).length;
        }
      });
    });
    
    return Math.round(totalTerms / this.documents.size);
  }
}

// Create search index instance
const searchIndex = new SearchIndex();

// Message handler
self.addEventListener('message', (event) => {
  const { type, data, id } = event.data;
  
  try {
    let result;
    
    switch (type) {
      case 'addDocument':
        searchIndex.addDocument(data);
        result = { success: true };
        break;
        
      case 'addDocuments':
        data.forEach(doc => searchIndex.addDocument(doc));
        result = { success: true, count: data.length };
        break;
        
      case 'removeDocument':
        searchIndex.removeDocument(data.id);
        result = { success: true };
        break;
        
      case 'search':
        result = searchIndex.search(data.query, data.options);
        break;
        
      case 'getStats':
        result = searchIndex.getStats();
        break;
        
      case 'clear':
        searchIndex.documents.clear();
        searchIndex.invertedIndex.clear();
        searchIndex.fieldIndices.clear();
        result = { success: true };
        break;
        
      default:
        throw new Error(`Unknown operation: ${type}`);
    }
    
    self.postMessage({
      id,
      type: 'result',
      data: result
    });
    
  } catch (error) {
    self.postMessage({
      id,
      type: 'error',
      error: error.message
    });
  }
});