// hooks/useYjsDocument.ts
// Yjs document hook with Supabase Realtime synchronization

import { useEffect, useState, useCallback, useRef } from 'react';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { createClient } from '@/utils/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Supabase client with type assertion for tables not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseClient = createClient() as any;

// ============================================================================
// TYPES
// ============================================================================

interface UseYjsDocumentOptions {
  sessionId: string;
  userId: string;
  userName: string;
  userColor?: string;
  enterpriseId: string;
  onSync?: () => void;
  onError?: (error: Error) => void;
}

interface UseYjsDocumentReturn {
  doc: Y.Doc | null;
  provider: SupabaseProvider | null;
  isConnected: boolean;
  isSynced: boolean;
  error: Error | null;
}

// ============================================================================
// SUPABASE REALTIME PROVIDER
// ============================================================================

export class SupabaseProvider {
  private doc: Y.Doc;
  private channel: RealtimeChannel | null = null;
  private supabase = supabaseClient;
  private sessionId: string;
  private userId: string;
  private userName: string;
  private userColor: string;
  private enterpriseId: string;
  private isConnected = false;
  private isSynced = false;
  private onSyncCallback?: () => void;
  private onErrorCallback?: (error: Error) => void;

  public awareness: Map<string, AwarenessState> = new Map();

  constructor(
    doc: Y.Doc,
    options: UseYjsDocumentOptions
  ) {
    this.doc = doc;
    this.sessionId = options.sessionId;
    this.userId = options.userId;
    this.userName = options.userName;
    this.userColor = options.userColor || this.generateColor();
    this.enterpriseId = options.enterpriseId;
    this.onSyncCallback = options.onSync;
    this.onErrorCallback = options.onError;
  }

  async connect(): Promise<void> {
    try {
      // Load initial state from database
      await this.loadInitialState();

      // Set up Supabase Realtime channel
      const channel = this.supabase.channel(`collab:${this.sessionId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: this.userId },
        },
      }) as RealtimeChannel;
      this.channel = channel;

      // Handle Yjs updates from other clients
      channel.on('broadcast', { event: 'yjs-update' }, (payload: { payload: { update: string } }) => {
        const update = this.base64ToUint8Array(payload.payload.update);
        Y.applyUpdate(this.doc, update, 'remote');
      });

      // Handle awareness updates
      channel.on('broadcast', { event: 'awareness' }, (payload: { payload: { clientId: string; state: AwarenessState } }) => {
        const { clientId, state } = payload.payload;
        if (clientId !== this.userId) {
          this.awareness.set(clientId, state);
        }
      });

      // Handle presence
      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() || {};
        // Update awareness with presence state
        Object.entries(state).forEach(([key, value]) => {
          if (key !== this.userId && Array.isArray(value) && value[0]) {
            const presenceData = value[0] as unknown as AwarenessState;
            this.awareness.set(key, presenceData);
          }
        });
      });

      channel.on('presence', { event: 'leave' }, ({ key }: { key: string }) => {
        this.awareness.delete(key);
      });

      // Subscribe to channel
      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          this.isConnected = true;

          // Track presence
          await this.channel?.track({
            userId: this.userId,
            userName: this.userName,
            userColor: this.userColor,
            online_at: new Date().toISOString(),
          });

          // Listen to local changes
          this.doc.on('update', this.handleLocalUpdate.bind(this));

          this.isSynced = true;
          this.onSyncCallback?.();
        }
      });
    } catch (error) {
      this.onErrorCallback?.(error as Error);
    }
  }

  disconnect(): void {
    this.doc.off('update', this.handleLocalUpdate.bind(this));
    this.channel?.unsubscribe();
    this.channel = null;
    this.isConnected = false;
    this.isSynced = false;
  }

  private async loadInitialState(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('collaborative_sessions')
        .select('yjs_state')
        .eq('id', this.sessionId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.yjs_state) {
        const state = this.base64ToUint8Array(data.yjs_state);
        Y.applyUpdate(this.doc, state, 'database');
      }
    } catch (error) {
      console.error('Failed to load initial state:', error);
    }
  }

  private handleLocalUpdate(update: Uint8Array, origin: string): void {
    if (origin === 'remote' || origin === 'database') return;

    // Broadcast to other clients
    this.channel?.send({
      type: 'broadcast',
      event: 'yjs-update',
      payload: { update: this.uint8ArrayToBase64(update) },
    });

    // Debounced save to database
    this.debouncedSave();
  }

  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private debouncedSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => this.saveState(), 2000);
  }

  private async saveState(): Promise<void> {
    try {
      const state = Y.encodeStateAsUpdate(this.doc);
      await this.supabase
        .from('collaborative_sessions')
        .update({
          yjs_state: this.uint8ArrayToBase64(state),
          updated_at: new Date().toISOString(),
        })
        .eq('id', this.sessionId);
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  // Send awareness update (cursor position, selection)
  sendAwareness(state: Partial<AwarenessState>): void {
    const fullState: AwarenessState = {
      userId: this.userId,
      userName: this.userName,
      userColor: this.userColor,
      ...state,
    };

    this.channel?.send({
      type: 'broadcast',
      event: 'awareness',
      payload: { clientId: this.userId, state: fullState },
    });
  }

  getConnected(): boolean {
    return this.isConnected;
  }

  getSynced(): boolean {
    return this.isSynced;
  }

  // Utility functions
  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  private generateColor(): string {
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#84cc16',
      '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
      '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
      '#ec4899', '#f43f5e',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

// ============================================================================
// AWARENESS STATE TYPE
// ============================================================================

export interface AwarenessState {
  userId: string;
  userName: string;
  userColor: string;
  cursor?: {
    anchor: number;
    head: number;
  };
  selection?: {
    from: number;
    to: number;
  };
}

// ============================================================================
// HOOK
// ============================================================================

export function useYjsDocument(options: UseYjsDocumentOptions): UseYjsDocumentReturn {
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<SupabaseProvider | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const providerRef = useRef<SupabaseProvider | null>(null);
  const persistenceRef = useRef<IndexeddbPersistence | null>(null);

  useEffect(() => {
    if (!options.sessionId || !options.userId) return;

    // Create Yjs document
    const ydoc = new Y.Doc();
    setDoc(ydoc);

    // Set up IndexedDB persistence for offline support
    const persistence = new IndexeddbPersistence(
      `pactwise-collab-${options.sessionId}`,
      ydoc
    );
    persistenceRef.current = persistence;

    persistence.on('synced', () => {
      console.log('IndexedDB synced');
    });

    // Create and connect provider
    const newProvider = new SupabaseProvider(ydoc, {
      ...options,
      onSync: () => {
        setIsConnected(true);
        setIsSynced(true);
        options.onSync?.();
      },
      onError: (err) => {
        setError(err);
        options.onError?.(err);
      },
    });

    providerRef.current = newProvider;
    setProvider(newProvider);
    newProvider.connect();

    // Cleanup
    return () => {
      newProvider.disconnect();
      persistence.destroy();
      ydoc.destroy();
      setDoc(null);
      setProvider(null);
      setIsConnected(false);
      setIsSynced(false);
    };
  }, [options.sessionId, options.userId, options.userName, options.enterpriseId]);

  return {
    doc,
    provider,
    isConnected,
    isSynced,
    error,
  };
}
