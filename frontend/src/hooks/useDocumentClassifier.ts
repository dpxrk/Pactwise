import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export interface DocumentClassification {
  isContract: boolean;
  confidence: number;
  documentType: string;
  indicators: string[];
  summary: string;
}

interface UseDocumentClassifierReturn {
  classifyDocument: (content: string, mimeType?: string) => Promise<DocumentClassification | null>;
  isClassifying: boolean;
  error: string | null;
}

export function useDocumentClassifier(): UseDocumentClassifierReturn {
  const [isClassifying, setIsClassifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const classifyDocument = async (
    content: string, 
    mimeType?: string
  ): Promise<DocumentClassification | null> => {
    setIsClassifying(true);
    setError(null);

    try {
      // Get the current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Authentication required');
      }

      // Call the edge function
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/document-classifier`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            content,
            mimeType
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Classification failed');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Classification failed');
      }

      return data.classification as DocumentClassification;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to classify document';
      setError(errorMessage);
      console.error('Document classification error:', err);
      return null;
    } finally {
      setIsClassifying(false);
    }
  };

  return {
    classifyDocument,
    isClassifying,
    error
  };
}

// Helper function to validate if a file is likely a document
export function isValidDocumentFile(file: File): boolean {
  const validTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/rtf',
    'application/vnd.oasis.opendocument.text'
  ];
  
  return validTypes.includes(file.type) || 
         file.name.endsWith('.pdf') ||
         file.name.endsWith('.doc') ||
         file.name.endsWith('.docx') ||
         file.name.endsWith('.txt') ||
         file.name.endsWith('.rtf') ||
         file.name.endsWith('.odt');
}

// Helper function to extract text from file (basic implementation)
export async function extractTextFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const text = event.target?.result as string;
      resolve(text);
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    // For now, just read as text
    // In production, you'd want to handle different file types appropriately
    reader.readAsText(file);
  });
}