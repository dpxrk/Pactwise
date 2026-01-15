// src/hooks/usePortal.ts
import { useState, useCallback, useEffect } from 'react';

import type {
  PortalSession,
  PortalValidationResponse,
  PortalDocument,
  SignatureRequest,
  SignatureSubmission,
  RedlineChange,
  RedlineSubmission,
  NegotiationMessage,
  MessageSubmission,
} from '@/types/portal.types';

const PORTAL_API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1/external-portal';

interface UsePortalReturn {
  // State
  session: PortalSession | null;
  isLoading: boolean;
  error: string | null;
  requiresPin: boolean;
  requiresEmailVerification: boolean;

  // Actions
  validateToken: (token: string, accessCode?: string) => Promise<boolean>;
  logout: () => Promise<void>;

  // Document
  getDocument: () => Promise<PortalDocument | null>;

  // Signature
  getSignatureRequest: () => Promise<SignatureRequest | null>;
  submitSignature: (data: SignatureSubmission) => Promise<boolean>;
  declineSignature: (reason?: string) => Promise<boolean>;

  // Redlines
  getRedlines: () => Promise<RedlineChange[]>;
  submitRedline: (data: RedlineSubmission) => Promise<string | null>;

  // Messages
  getMessages: (limit?: number, offset?: number) => Promise<NegotiationMessage[]>;
  sendMessage: (data: MessageSubmission) => Promise<string | null>;
}

export function usePortal(): UsePortalReturn {
  const [session, setSession] = useState<PortalSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresPin, setRequiresPin] = useState(false);
  const [requiresEmailVerification, setRequiresEmailVerification] = useState(false);

  // Restore session from storage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('portal_session');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as PortalSession;
        if (new Date(parsed.expires_at) > new Date()) {
          setSession(parsed);
        } else {
          sessionStorage.removeItem('portal_session');
        }
      } catch {
        sessionStorage.removeItem('portal_session');
      }
    }
  }, []);

  const apiCall = useCallback(async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (session?.session_token) {
      headers['X-Session-Token'] = session.session_token;
    }

    const response = await fetch(`${PORTAL_API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error || 'Request failed');
    }

    return data as T;
  }, [session]);

  const validateToken = useCallback(async (token: string, accessCode?: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    setRequiresPin(false);
    setRequiresEmailVerification(false);

    try {
      const response = await fetch(`${PORTAL_API_URL}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, access_code: accessCode }),
      });

      const data: PortalValidationResponse = await response.json();

      if (data.requires_pin) {
        setRequiresPin(true);
        return false;
      }

      if (data.requires_email_verification) {
        setRequiresEmailVerification(true);
        return false;
      }

      if (!data.success || !data.session_token) {
        setError(data.message || 'Invalid token');
        return false;
      }

      const newSession: PortalSession = {
        session_token: data.session_token,
        expires_at: data.expires_at!,
        token_type: data.token_type!,
        party_name: data.party_name!,
        party_email: '',
        party_role: 'counterparty',
        contract_id: data.contract_id || null,
        signature_request_id: data.signature_request_id || null,
        redline_session_id: data.redline_session_id || null,
      };

      setSession(newSession);
      sessionStorage.setItem('portal_session', JSON.stringify(newSession));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    if (session) {
      try {
        await apiCall('/logout', { method: 'POST' });
      } catch {
        // Ignore errors on logout
      }
    }
    setSession(null);
    sessionStorage.removeItem('portal_session');
  }, [session, apiCall]);

  const getDocument = useCallback(async (): Promise<PortalDocument | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiCall<{ success: boolean; document: PortalDocument }>('/document');
      return response.document;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall]);

  const getSignatureRequest = useCallback(async (): Promise<SignatureRequest | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiCall<{ success: boolean; signature_request: SignatureRequest }>('/signature-request');
      return response.signature_request;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load signature request');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall]);

  const submitSignature = useCallback(async (data: SignatureSubmission): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      await apiCall('/sign', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit signature');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall]);

  const declineSignature = useCallback(async (reason?: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      await apiCall('/decline', {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall]);

  const getRedlines = useCallback(async (): Promise<RedlineChange[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiCall<{ success: boolean; redlines: RedlineChange[] }>('/redlines');
      return response.redlines;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load redlines');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [apiCall]);

  const submitRedline = useCallback(async (data: RedlineSubmission): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiCall<{ success: boolean; redline_id: string }>('/redline', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.redline_id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit redline');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall]);

  const getMessages = useCallback(async (limit = 50, offset = 0): Promise<NegotiationMessage[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiCall<{ success: boolean; messages: NegotiationMessage[] }>(
        `/messages?limit=${limit}&offset=${offset}`
      );
      return response.messages;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [apiCall]);

  const sendMessage = useCallback(async (data: MessageSubmission): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiCall<{ success: boolean; message_id: string }>('/message', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.message_id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall]);

  return {
    session,
    isLoading,
    error,
    requiresPin,
    requiresEmailVerification,
    validateToken,
    logout,
    getDocument,
    getSignatureRequest,
    submitSignature,
    declineSignature,
    getRedlines,
    submitRedline,
    getMessages,
    sendMessage,
  };
}
