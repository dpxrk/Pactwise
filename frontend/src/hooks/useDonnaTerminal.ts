'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import type {
  TerminalMessage,
  TerminalQueryRequest,
  TerminalQueryResponse,
  RealtimeMessage,
  UseDonnaTerminalReturn,
} from '@/types/donna-terminal.types';

const DONNA_TERMINAL_FUNCTION_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/donna-terminal`
  : 'http://localhost:54321/functions/v1/donna-terminal';

const DONNA_REALTIME_FUNCTION_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/donna-realtime`
  : 'http://localhost:54321/functions/v1/donna-realtime';

// Terminal settings interface
export interface TerminalSettings {
  soundEnabled: boolean;
  toastNotifications: boolean;
  autoMinimize: boolean;
  fontSize: 'small' | 'medium' | 'large';
  theme: 'purple' | 'green' | 'blue';
}

const DEFAULT_SETTINGS: TerminalSettings = {
  soundEnabled: true,
  toastNotifications: true,
  autoMinimize: false,
  fontSize: 'medium',
  theme: 'purple',
};

const STORAGE_KEY = 'donna-terminal-state';
const SETTINGS_KEY = 'donna-terminal-settings';

// Sound effect URLs (we'll create these as data URIs)
const SOUND_EFFECTS = {
  insight: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAo=',
  pattern: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAo=',
  recommendation: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAo=',
};

export const useDonnaTerminal = (): UseDonnaTerminalReturn & {
  settings: TerminalSettings;
  updateSettings: (settings: Partial<TerminalSettings>) => void;
} => {
  const [messages, setMessages] = useState<TerminalMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<TerminalSettings>(DEFAULT_SETTINGS);

  const eventSourceRef = useRef<EventSource | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const supabase = createClient();

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      } catch (err) {
        console.error('[Donna Terminal] Failed to parse settings:', err);
      }
    }
  }, []);

  // Load messages from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const { messages: savedMessages } = JSON.parse(savedState);
        if (savedMessages && Array.isArray(savedMessages)) {
          setMessages(savedMessages);
        }
      } catch (err) {
        console.error('[Donna Terminal] Failed to parse saved state:', err);
      }
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          messages: messages.slice(-50), // Keep last 50 messages
          timestamp: new Date().toISOString(),
        })
      );
    }
  }, [messages]);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<TerminalSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Play sound effect
  const playSound = useCallback(
    (type: keyof typeof SOUND_EFFECTS) => {
      if (!settings.soundEnabled) return;

      try {
        // Initialize AudioContext on first use
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        const audio = new Audio(SOUND_EFFECTS[type]);
        audio.volume = 0.3;
        audio.play().catch((err) => {
          console.warn('[Donna Terminal] Failed to play sound:', err);
        });
      } catch (err) {
        console.warn('[Donna Terminal] Sound playback error:', err);
      }
    },
    [settings.soundEnabled]
  );

  // Show toast notification
  const showToast = useCallback(
    (message: RealtimeMessage) => {
      if (!settings.toastNotifications) return;

      const priority = message.data.priority || 'medium';
      const title = message.data.title || 'New Insight';
      const description = message.data.description || '';

      if (priority === 'critical') {
        toast.error(title, {
          description,
          duration: 10000,
          action: {
            label: 'View',
            onClick: () => {
              // Scroll to message or expand terminal
              console.log('[Donna Terminal] View clicked for:', message.id);
            },
          },
        });
      } else if (priority === 'high') {
        toast.warning(title, {
          description,
          duration: 7000,
        });
      } else {
        toast.info(title, {
          description,
          duration: 5000,
        });
      }
    },
    [settings.toastNotifications]
  );

  // Initialize realtime connection
  useEffect(() => {
    const initializeRealtime = async () => {
      try {
        // Get auth token
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          console.warn('[Donna Terminal] No active session');
          setIsConnected(false);
          return;
        }

        // Create EventSource with auth token in URL
        const eventSourceUrl = `${DONNA_REALTIME_FUNCTION_URL}?token=${encodeURIComponent(session.access_token)}`;
        const eventSource = new EventSource(eventSourceUrl);

        eventSource.onopen = () => {
          console.log('[Donna Terminal] Realtime connection established');
          setIsConnected(true);
          setError(null);
        };

        eventSource.onmessage = (event) => {
          try {
            const realtimeMessage: RealtimeMessage = JSON.parse(event.data);
            handleRealtimeMessage(realtimeMessage);
          } catch (err) {
            console.error('[Donna Terminal] Failed to parse realtime message:', err);
          }
        };

        eventSource.onerror = (err) => {
          console.error('[Donna Terminal] Realtime connection error:', err);
          setIsConnected(false);
          setError('Connection lost. Reconnecting...');

          // Attempt to reconnect after 5 seconds
          setTimeout(() => {
            if (eventSourceRef.current) {
              eventSourceRef.current.close();
            }
            initializeRealtime();
          }, 5000);
        };

        eventSourceRef.current = eventSource;
      } catch (err) {
        console.error('[Donna Terminal] Failed to initialize realtime:', err);
        setError('Failed to connect to Donna Terminal');
        setIsConnected(false);
      }
    };

    initializeRealtime();

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // Handle realtime messages
  const handleRealtimeMessage = useCallback(
    (realtimeMessage: RealtimeMessage) => {
      if (realtimeMessage.type === 'heartbeat') {
        // Just a keepalive, no need to display
        return;
      }

      // Play sound based on message type
      if (realtimeMessage.type === 'insight') {
        playSound('insight');
      } else if (realtimeMessage.type === 'pattern') {
        playSound('pattern');
      } else if (realtimeMessage.type === 'recommendation') {
        playSound('recommendation');
      }

      // Show toast notification for high priority messages
      const priority = realtimeMessage.data.priority || 'medium';
      if (priority === 'high' || priority === 'critical') {
        showToast(realtimeMessage);
      }

      // Convert realtime message to terminal message
      const terminalMessage: TerminalMessage = {
        id: realtimeMessage.id,
        type: realtimeMessage.type as TerminalMessage['type'],
        timestamp: realtimeMessage.timestamp,
        content: {
          message:
            realtimeMessage.data.description ||
            realtimeMessage.data.title ||
            'New update from Donna',
          confidence: realtimeMessage.data.confidence,
          metadata: realtimeMessage.data.metadata as TerminalMessage['content']['metadata'],
        },
        actions: realtimeMessage.data.actions,
      };

      setMessages((prev) => [...prev, terminalMessage]);
      setUnreadCount((prev) => prev + 1);
    },
    [playSound, showToast]
  );

  // Send query to Donna Terminal
  const sendQuery = useCallback(
    async (query: string, context?: TerminalQueryRequest['context']) => {
      if (!query.trim()) return;

      try {
        setIsTyping(true);
        setError(null);

        // Add user query to messages
        const userMessage: TerminalMessage = {
          id: crypto.randomUUID(),
          type: 'user_query',
          timestamp: new Date().toISOString(),
          content: {
            message: query,
          },
        };

        setMessages((prev) => [...prev, userMessage]);

        // Get auth token
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error('No active session');
        }

        // Send request to Donna Terminal function
        const response = await fetch(DONNA_TERMINAL_FUNCTION_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            query,
            context,
          } as TerminalQueryRequest),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }

        const data: TerminalQueryResponse = await response.json();

        // Add Donna's response to messages
        const donnaMessage: TerminalMessage = {
          id: data.id,
          type: data.type as TerminalMessage['type'],
          timestamp: data.timestamp,
          content: data.content,
          actions: data.actions,
        };

        setMessages((prev) => [...prev, donnaMessage]);

        // Play sound for response
        playSound('insight');
      } catch (err) {
        console.error('[Donna Terminal] Query failed:', err);

        const errorMessage: TerminalMessage = {
          id: crypto.randomUUID(),
          type: 'error',
          timestamp: new Date().toISOString(),
          content: {
            message: err instanceof Error ? err.message : 'Failed to process query',
          },
        };

        setMessages((prev) => [...prev, errorMessage]);
        setError(err instanceof Error ? err.message : 'Query failed');
      } finally {
        setIsTyping(false);
      }
    },
    [supabase, playSound]
  );

  // Clear all messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setUnreadCount(0);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Mark messages as read
  const markAsRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Disconnect realtime
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Reconnect realtime
  const reconnect = useCallback(async () => {
    disconnect();

    // Wait a moment before reconnecting
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Re-trigger the useEffect by forcing a re-render
    // The useEffect will handle reconnection
    window.location.reload();
  }, [disconnect]);

  return {
    messages,
    isConnected,
    isTyping,
    unreadCount,
    error,
    sendQuery,
    clearMessages,
    markAsRead,
    disconnect,
    reconnect,
    settings,
    updateSettings,
  };
};

export default useDonnaTerminal;
