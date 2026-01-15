import { useCallback, useRef, useState } from 'react';

interface ContractAnalysis {
  keyTerms: Array<{
    term: string;
    count: number;
    positions: Array<{ start: number; end: number }>;
  }>;
  readability: {
    score: number;
    level: string;
    avgWordsPerSentence: number;
    avgSyllablesPerWord: number;
  };
  structure: {
    sections: Array<{
      title: string;
      position: number;
      level: number;
    }>;
    warnings: string[];
  };
  dates: Array<{
    text: string;
    position: number;
    type: string;
  }>;
  risk: {
    score: number;
    risks: Array<{
      type: string;
      severity: string;
      description: string;
    }>;
    level: string;
  };
}

export function useContractProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestId = useRef(0);
  const pendingRequests = useRef<Map<number, { resolve: (value: unknown) => void; reject: (reason?: any) => void }>>(new Map());

  // Initialize worker
  const initWorker = useCallback(() => {
    if (!workerRef.current && typeof window !== 'undefined') {
      workerRef.current = new Worker('/workers/contract-processor.js');
      
      workerRef.current.onmessage = (event: MessageEvent) => {
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
        console.error('Contract processor worker error:', error);
        setError('Worker error occurred');
      };
    }
  }, []);

  // Send message to worker
  const sendMessage = useCallback(<T, R>(type: string, data: T): Promise<R> => {
    return new Promise((resolve, reject) => {
      initWorker();
      
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }
      
      const id = requestId.current++;
      pendingRequests.current.set(id, { resolve: resolve as (value: unknown) => void, reject });
      
      workerRef.current.postMessage({ id, type, data });
    });
  }, [initWorker]);

  // Extract key terms from contract text
  const extractKeyTerms = useCallback(async (text: string) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await sendMessage<{ text: string }, any>('extractKeyTerms', { text });
      setIsProcessing(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsProcessing(false);
      throw err;
    }
  }, [sendMessage]);

  // Analyze readability
  const analyzeReadability = useCallback(async (text: string) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await sendMessage<{ text: string }, any>('analyzeReadability', { text });
      setIsProcessing(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsProcessing(false);
      throw err;
    }
  }, [sendMessage]);

  // Analyze contract structure
  const analyzeStructure = useCallback(async (text: string) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await sendMessage<{ text: string }, any>('analyzeStructure', { text });
      setIsProcessing(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsProcessing(false);
      throw err;
    }
  }, [sendMessage]);

  // Extract dates
  const extractDates = useCallback(async (text: string) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await sendMessage<{ text: string }, any>('extractDates', { text });
      setIsProcessing(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsProcessing(false);
      throw err;
    }
  }, [sendMessage]);

  // Calculate risk score
  const calculateRisk = useCallback(async (contract: Record<string, unknown>) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await sendMessage<{ contract: Record<string, unknown> }, any>('calculateRisk', { contract });
      setIsProcessing(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsProcessing(false);
      throw err;
    }
  }, [sendMessage]);

  // Perform full analysis
  const analyzeContract = useCallback(async (text: string, contract?: Record<string, unknown>): Promise<ContractAnalysis> => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await sendMessage<{ text: string; contract: Record<string, unknown> }, ContractAnalysis>('fullAnalysis', { text, contract: contract || {} });
      setIsProcessing(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsProcessing(false);
      throw err;
    }
  }, [sendMessage]);

  // Cleanup
  const cleanup = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    pendingRequests.current.clear();
  }, []);

  return {
    extractKeyTerms,
    analyzeReadability,
    analyzeStructure,
    extractDates,
    calculateRisk,
    analyzeContract,
    isProcessing,
    error,
    cleanup
  };
}