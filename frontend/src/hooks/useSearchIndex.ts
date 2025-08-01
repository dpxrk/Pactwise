import { useCallback, useRef, useState, useEffect } from 'react';

interface SearchDocument {
  id: string;
  [key: string]: any;
}

interface SearchResult {
  id: string;
  score: number;
  matches: string[];
  document: any;
}

interface SearchOptions {
  fields?: string[];
  fuzzy?: boolean;
  limit?: number;
  sortBy?: 'relevance' | 'date' | 'title';
}

interface IndexStats {
  documentCount: number;
  uniqueTerms: number;
  fields: string[];
  avgTermsPerDoc: number;
}

export function useSearchIndex() {
  const [isIndexing, setIsIndexing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<IndexStats | null>(null);
  
  const workerRef = useRef<Worker | null>(null);
  const requestId = useRef(0);
  const pendingRequests = useRef<Map<number, { resolve: Function; reject: Function }>>(new Map());

  // Initialize worker
  useEffect(() => {
    if (typeof window !== 'undefined') {
      workerRef.current = new Worker('/workers/search-indexer.js');
      
      workerRef.current.onmessage = (event) => {
        const { id, type, data, error } = event.data;
        const pending = pendingRequests.current.get(id);
        
        if (pending) {
          if (type === 'error') {
            pending.reject(new Error(error));
          } else {
            pending.resolve(data);
          }
          pendingRequests.current.delete(id);
        }
      };
      
      workerRef.current.onerror = (error) => {
        console.error('Search indexer worker error:', error);
        setError('Worker error occurred');
      };
    }
    
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // Send message to worker
  const sendMessage = useCallback((type: string, data: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }
      
      const id = requestId.current++;
      pendingRequests.current.set(id, { resolve, reject });
      
      workerRef.current.postMessage({ id, type, data });
    });
  }, []);

  // Add a single document to the index
  const addDocument = useCallback(async (document: SearchDocument) => {
    setIsIndexing(true);
    setError(null);
    
    try {
      const result = await sendMessage('addDocument', document);
      await updateStats();
      setIsIndexing(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsIndexing(false);
      throw err;
    }
  }, [sendMessage]);

  // Add multiple documents to the index
  const addDocuments = useCallback(async (documents: SearchDocument[]) => {
    setIsIndexing(true);
    setError(null);
    
    try {
      const result = await sendMessage('addDocuments', documents);
      await updateStats();
      setIsIndexing(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsIndexing(false);
      throw err;
    }
  }, [sendMessage]);

  // Remove a document from the index
  const removeDocument = useCallback(async (id: string) => {
    setError(null);
    
    try {
      const result = await sendMessage('removeDocument', { id });
      await updateStats();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, [sendMessage]);

  // Search the index
  const search = useCallback(async (query: string, options?: SearchOptions): Promise<SearchResult[]> => {
    setIsSearching(true);
    setError(null);
    
    try {
      const result = await sendMessage('search', { query, options });
      setIsSearching(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsSearching(false);
      throw err;
    }
  }, [sendMessage]);

  // Update stats
  const updateStats = useCallback(async () => {
    try {
      const result = await sendMessage('getStats', {});
      setStats(result);
    } catch (err) {
      console.error('Failed to update stats:', err);
    }
  }, [sendMessage]);

  // Clear the entire index
  const clearIndex = useCallback(async () => {
    setError(null);
    
    try {
      const result = await sendMessage('clear', {});
      setStats(null);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, [sendMessage]);

  // Helper function to index contracts
  const indexContracts = useCallback(async (contracts: any[]) => {
    const documents = contracts.map(contract => ({
      id: contract._id,
      title: contract.title || '',
      fileName: contract.fileName || '',
      vendorName: contract.vendor?.name || '',
      status: contract.status || '',
      contractType: contract.contractType || '',
      description: contract.description || '',
      parties: contract.extractedParties || [],
      value: contract.extractedValue || 0,
      startDate: contract.extractedStartDate || '',
      endDate: contract.extractedEndDate || '',
      createdAt: contract._creationTime
    }));
    
    return addDocuments(documents);
  }, [addDocuments]);

  // Helper function to index vendors
  const indexVendors = useCallback(async (vendors: any[]) => {
    const documents = vendors.map(vendor => ({
      id: vendor._id,
      name: vendor.name || '',
      category: vendor.category || '',
      contactName: vendor.contactName || '',
      contactEmail: vendor.contactEmail || '',
      contactPhone: vendor.contactPhone || '',
      address: vendor.address || '',
      description: vendor.description || '',
      tags: vendor.tags || [],
      createdAt: vendor._creationTime
    }));
    
    return addDocuments(documents);
  }, [addDocuments]);

  return {
    // Core functions
    addDocument,
    addDocuments,
    removeDocument,
    search,
    clearIndex,
    
    // Helper functions
    indexContracts,
    indexVendors,
    
    // State
    isIndexing,
    isSearching,
    error,
    stats
  };
}