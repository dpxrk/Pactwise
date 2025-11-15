/**
 * Implicit tracking hooks for automatic interaction tracking
 * Captures user behavior without explicit actions
 * NO HARDCODED DATA - Everything tracked to real APIs
 */

import { useEffect, useRef, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { agentsAPI, type AgentContext } from '@/lib/api/agents';

interface TrackingEvent {
  eventType: 'page_view' | 'click' | 'scroll' | 'focus' | 'hover' | 'form_submit' | 'search' | 'filter';
  element?: string;
  value?: any;
  metadata?: Record<string, any>;
  timestamp: number;
}

// Buffer to batch events before sending
class EventBuffer {
  private events: TrackingEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly flushInterval = 5000; // 5 seconds
  private readonly maxBatchSize = 20;

  add(event: TrackingEvent) {
    this.events.push(event);
    
    if (this.events.length >= this.maxBatchSize) {
      this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), this.flushInterval);
    }
  }

  async flush() {
    if (this.events.length === 0) return;
    
    const eventsToSend = [...this.events];
    this.events = [];
    
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    try {
      // Send batched events to the backend
      await agentsAPI.trackBatchedInteractions(eventsToSend);
    } catch (error) {
      console.error('Failed to send tracking events:', error);
    }
  }

  destroy() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }
    this.flush();
  }
}

// Singleton event buffer
let eventBuffer: EventBuffer | null = null;

/**
 * Track page views automatically
 */
export function usePageViewTracking() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { userProfile } = useAuth();
  const lastPathname = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!userProfile?.id || !userProfile?.enterprise_id) return;
    if (pathname === lastPathname.current) return;

    lastPathname.current = pathname;

    if (!eventBuffer) {
      eventBuffer = new EventBuffer();
    }

    const context: AgentContext = {
      page: pathname,
      userId: userProfile.id,
      enterpriseId: userProfile.enterprise_id,
      metadata: {
        queryParams: Object.fromEntries(searchParams.entries()),
        timestamp: new Date().toISOString()
      }
    };

    // Track the page view
    agentsAPI.trackInteraction({
      recommendationId: `page_${Date.now()}`,
      action: {
        id: `view_${Date.now()}`,
        type: 'accepted'
      },
      context,
      outcome: 'success'
    });

    eventBuffer.add({
      eventType: 'page_view',
      element: pathname,
      metadata: context.metadata,
      timestamp: Date.now()
    });

    return () => {
      if (eventBuffer) {
        eventBuffer.destroy();
        eventBuffer = null;
      }
    };
  }, [pathname, searchParams, userProfile?.id, userProfile?.enterprise_id]);
}

/**
 * Track click interactions on important elements
 */
export function useClickTracking(
  elementId: string,
  metadata?: Record<string, any>
) {
  const { userProfile } = useAuth();
  const pathname = usePathname();

  const trackClick = useCallback(() => {
    if (!userProfile?.id || !userProfile?.enterprise_id) return;

    if (!eventBuffer) {
      eventBuffer = new EventBuffer();
    }

    eventBuffer.add({
      eventType: 'click',
      element: elementId,
      metadata: {
        ...metadata,
        page: pathname,
        userId: userProfile.id,
        enterpriseId: userProfile.enterprise_id!
      },
      timestamp: Date.now()
    });
  }, [elementId, metadata, pathname, userProfile?.id, userProfile?.enterprise_id]);

  return trackClick;
}

/**
 * Track scroll depth on long pages
 */
export function useScrollTracking(threshold = 0.8) {
  const { userProfile } = useAuth();
  const pathname = usePathname();
  const hasTrackedScroll = useRef(false);

  useEffect(() => {
    if (!userProfile?.id || !userProfile?.enterprise_id) return;

    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = document.documentElement.scrollTop;
      const clientHeight = document.documentElement.clientHeight;
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

      if (scrollPercentage >= threshold && !hasTrackedScroll.current) {
        hasTrackedScroll.current = true;

        if (!eventBuffer) {
          eventBuffer = new EventBuffer();
        }

        eventBuffer.add({
          eventType: 'scroll',
          element: pathname,
          value: scrollPercentage,
          metadata: {
            threshold,
            page: pathname
          },
          timestamp: Date.now()
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      hasTrackedScroll.current = false;
    };
  }, [pathname, threshold, userProfile?.id, userProfile?.enterprise_id]);
}

/**
 * Track form interactions and submissions
 */
export function useFormTracking(formId: string) {
  const { userProfile } = useAuth();
  const pathname = usePathname();
  const fieldInteractions = useRef<Set<string>>(new Set());
  const startTime = useRef<number>(Date.now());

  const trackFieldFocus = useCallback((fieldName: string) => {
    if (!userProfile?.id || !userProfile?.enterprise_id) return;
    
    fieldInteractions.current.add(fieldName);
  }, [userProfile?.id, userProfile?.enterprise_id]);

  const trackFormSubmit = useCallback((formData?: any) => {
    if (!userProfile?.id || !userProfile?.enterprise_id) return;

    const timeSpent = Date.now() - startTime.current;

    if (!eventBuffer) {
      eventBuffer = new EventBuffer();
    }

    eventBuffer.add({
      eventType: 'form_submit',
      element: formId,
      value: {
        fieldsInteracted: Array.from(fieldInteractions.current),
        timeSpent,
        completed: true
      },
      metadata: {
        page: pathname,
        formData: formData ? Object.keys(formData) : undefined // Only track field names, not values
      },
      timestamp: Date.now()
    });

    // Reset for next form interaction
    fieldInteractions.current.clear();
    startTime.current = Date.now();
  }, [formId, pathname, userProfile?.id, userProfile?.enterprise_id]);

  const trackFormAbandon = useCallback(() => {
    if (!userProfile?.id || !userProfile?.enterprise_id) return;
    if (fieldInteractions.current.size === 0) return;

    const timeSpent = Date.now() - startTime.current;

    if (!eventBuffer) {
      eventBuffer = new EventBuffer();
    }

    eventBuffer.add({
      eventType: 'form_submit',
      element: formId,
      value: {
        fieldsInteracted: Array.from(fieldInteractions.current),
        timeSpent,
        completed: false
      },
      metadata: {
        page: pathname,
        abandoned: true
      },
      timestamp: Date.now()
    });
  }, [formId, pathname, userProfile?.id, userProfile?.enterprise_id]);

  useEffect(() => {
    return () => {
      // Track abandonment when component unmounts
      trackFormAbandon();
    };
  }, [trackFormAbandon]);

  return {
    trackFieldFocus,
    trackFormSubmit,
    trackFormAbandon
  };
}

/**
 * Track search queries and filters
 */
export function useSearchTracking() {
  const { userProfile } = useAuth();
  const pathname = usePathname();
  const searchDebounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const trackSearch = useCallback((query: string, filters?: Record<string, any>) => {
    if (!userProfile?.id || !userProfile?.enterprise_id) return;

    // Debounce search tracking
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      if (!eventBuffer) {
        eventBuffer = new EventBuffer();
      }

      eventBuffer.add({
        eventType: 'search',
        element: 'search_input',
        value: {
          queryLength: query.length,
          hasFilters: filters && Object.keys(filters).length > 0
        },
        metadata: {
          page: pathname,
          filterCount: filters ? Object.keys(filters).length : 0
        },
        timestamp: Date.now()
      });

      // Also track this as an interaction for learning
      agentsAPI.trackInteraction({
        recommendationId: `search_${Date.now()}`,
        action: {
          id: `search_action_${Date.now()}`,
          type: 'accepted'
        },
        context: {
          page: pathname,
          userId: userProfile.id,
          enterpriseId: userProfile.enterprise_id!,
          metadata: {
            searchQuery: query,
            filters
          }
        }
      });
    }, 1000); // Wait 1 second after user stops typing
  }, [pathname, userProfile?.id, userProfile?.enterprise_id]);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  return trackSearch;
}

/**
 * Track hover interactions on important elements
 */
export function useHoverTracking(
  elementId: string,
  threshold = 1000 // milliseconds
) {
  const { userProfile } = useAuth();
  const pathname = usePathname();
  const hoverStartRef = useRef<number | undefined>(undefined);
  const hasTrackedRef = useRef(false);

  const handleMouseEnter = useCallback(() => {
    hoverStartRef.current = Date.now();
    hasTrackedRef.current = false;
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!userProfile?.id || !userProfile?.enterprise_id) return;
    if (!hoverStartRef.current || hasTrackedRef.current) return;

    const hoverDuration = Date.now() - hoverStartRef.current;
    
    if (hoverDuration >= threshold) {
      hasTrackedRef.current = true;

      if (!eventBuffer) {
        eventBuffer = new EventBuffer();
      }

      eventBuffer.add({
        eventType: 'hover',
        element: elementId,
        value: hoverDuration,
        metadata: {
          page: pathname,
          threshold
        },
        timestamp: Date.now()
      });
    }
  }, [elementId, pathname, threshold, userProfile?.id, userProfile?.enterprise_id]);

  return {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave
  };
}

/**
 * Track time spent on specific sections
 */
export function useTimeTracking(sectionId: string) {
  const { userProfile } = useAuth();
  const pathname = usePathname();
  const startTimeRef = useRef<number | undefined>(undefined);
  const isVisibleRef = useRef(false);

  useEffect(() => {
    if (!userProfile?.id || !userProfile?.enterprise_id) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisibleRef.current) {
            startTimeRef.current = Date.now();
            isVisibleRef.current = true;
          } else if (!entry.isIntersecting && isVisibleRef.current) {
            const timeSpent = Date.now() - (startTimeRef.current || Date.now());
            isVisibleRef.current = false;

            if (timeSpent > 1000) { // Only track if visible for more than 1 second
              if (!eventBuffer) {
                eventBuffer = new EventBuffer();
              }

              eventBuffer.add({
                eventType: 'focus',
                element: sectionId,
                value: timeSpent,
                metadata: {
                  page: pathname
                },
                timestamp: Date.now()
              });
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    const element = document.getElementById(sectionId);
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
      
      // Track final time if still visible
      if (isVisibleRef.current && startTimeRef.current) {
        const timeSpent = Date.now() - startTimeRef.current;
        if (timeSpent > 1000) {
          if (!eventBuffer) {
            eventBuffer = new EventBuffer();
          }

          eventBuffer.add({
            eventType: 'focus',
            element: sectionId,
            value: timeSpent,
            metadata: {
              page: pathname,
              final: true
            },
            timestamp: Date.now()
          });
        }
      }
    };
  }, [sectionId, pathname, userProfile?.id, userProfile?.enterprise_id]);
}

// Export buffer management for manual control
export const flushTrackingEvents = () => {
  if (eventBuffer) {
    eventBuffer.flush();
  }
};

export const destroyTrackingBuffer = () => {
  if (eventBuffer) {
    eventBuffer.destroy();
    eventBuffer = null;
  }
};

// Add to agents API the batched tracking method
declare module '@/lib/api/agents' {
  interface AgentsAPI {
    trackBatchedInteractions(events: TrackingEvent[]): Promise<void>;
  }
}

// Extend the AgentsAPI class with batched tracking
const originalAgentsAPI = agentsAPI as any;
originalAgentsAPI.trackBatchedInteractions = async function(events: TrackingEvent[]) {
  const supabase = this.supabase;
  
  // Convert events to interaction format
  const interactions = events.map(event => ({
    recommendation_id: `implicit_${event.eventType}_${Date.now()}`,
    action_type: 'implicit',
    action_data: {
      eventType: event.eventType,
      element: event.element,
      value: event.value
    },
    context_data: event.metadata,
    outcome: 'pending',
    created_at: new Date(event.timestamp).toISOString()
  }));

  // Batch insert
  const { error } = await supabase
    .from('agent_interactions')
    .insert(interactions);

  if (error) {
    console.error('Failed to track batched interactions:', error);
    throw error;
  }
};