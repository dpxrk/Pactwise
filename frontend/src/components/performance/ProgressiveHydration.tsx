'use client';

import React, { useEffect, useState, useRef, ReactNode } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface ProgressiveHydrationProps {
  children: ReactNode;
  fallback?: ReactNode;
  priority?: 'high' | 'medium' | 'low';
  onHydrated?: () => void;
  ssrOnly?: boolean;
  hydrationStrategy?: 'immediate' | 'idle' | 'visible' | 'interaction';
}

/**
 * Progressive Hydration Component
 * Delays hydration of components until they're needed
 */
export function ProgressiveHydration({
  children,
  fallback = null,
  priority = 'medium',
  onHydrated,
  ssrOnly = false,
  hydrationStrategy = 'visible',
}: ProgressiveHydrationProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [shouldHydrate, setShouldHydrate] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const [observerRef, isIntersecting] = useIntersectionObserver<HTMLDivElement>({
    threshold: 0.1,
    rootMargin: getPriorityMargin(priority),
  });

  // Handle different hydration strategies
  useEffect(() => {
    if (ssrOnly || isHydrated) return;

    switch (hydrationStrategy) {
      case 'immediate':
        setShouldHydrate(true);
        break;

      case 'idle':
        if ('requestIdleCallback' in window) {
          const idleCallbackId = requestIdleCallback(
            () => setShouldHydrate(true),
            { timeout: getIdleTimeout(priority) }
          );
          return () => cancelIdleCallback(idleCallbackId);
        } else {
          // Fallback for browsers without requestIdleCallback
          const timeoutId = setTimeout(
            () => setShouldHydrate(true),
            getIdleTimeout(priority)
          );
          return () => clearTimeout(timeoutId);
        }

      case 'visible':
        if (isIntersecting) {
          setShouldHydrate(true);
        }
        break;

      case 'interaction':
        const handleInteraction = () => setShouldHydrate(true);
        const events = ['click', 'touchstart', 'mouseover', 'focus'];
        
        events.forEach(event => {
          elementRef.current?.addEventListener(event, handleInteraction, { once: true });
        });

        return () => {
          events.forEach(event => {
            elementRef.current?.removeEventListener(event, handleInteraction);
          });
        };
    }
  }, [hydrationStrategy, priority, isIntersecting, ssrOnly, isHydrated]);

  // Hydrate when conditions are met
  useEffect(() => {
    if (shouldHydrate && !isHydrated) {
      setIsHydrated(true);
      onHydrated?.();
    }
  }, [shouldHydrate, isHydrated, onHydrated]);

  // Combine refs for intersection observer
  const setRefs = (node: HTMLDivElement | null) => {
    elementRef.current = node;
    if (hydrationStrategy === 'visible') {
      observerRef(node);
    }
  };

  if (ssrOnly) {
    return <>{children}</>;
  }

  return (
    <div ref={setRefs} data-hydration-priority={priority}>
      {isHydrated ? children : fallback}
    </div>
  );
}

/**
 * Get root margin based on priority
 */
function getPriorityMargin(priority: 'high' | 'medium' | 'low'): string {
  switch (priority) {
    case 'high':
      return '100px'; // Hydrate 100px before visible
    case 'medium':
      return '50px';
    case 'low':
      return '0px'; // Hydrate only when visible
  }
}

/**
 * Get idle timeout based on priority
 */
function getIdleTimeout(priority: 'high' | 'medium' | 'low'): number {
  switch (priority) {
    case 'high':
      return 1000; // 1 second
    case 'medium':
      return 3000; // 3 seconds
    case 'low':
      return 5000; // 5 seconds
  }
}

/**
 * Progressive enhancement wrapper
 * Provides static content with progressive enhancement
 */
interface ProgressiveEnhancementProps {
  staticContent: ReactNode;
  enhancedContent: ReactNode;
  enhanceOn?: 'load' | 'idle' | 'interaction';
}

export function ProgressiveEnhancement({
  staticContent,
  enhancedContent,
  enhanceOn = 'idle',
}: ProgressiveEnhancementProps) {
  const [isEnhanced, setIsEnhanced] = useState(false);

  useEffect(() => {
    switch (enhanceOn) {
      case 'load':
        setIsEnhanced(true);
        break;

      case 'idle':
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => setIsEnhanced(true));
        } else {
          setTimeout(() => setIsEnhanced(true), 100);
        }
        break;

      case 'interaction':
        const enhance = () => setIsEnhanced(true);
        window.addEventListener('click', enhance, { once: true });
        window.addEventListener('scroll', enhance, { once: true });
        return () => {
          window.removeEventListener('click', enhance);
          window.removeEventListener('scroll', enhance);
        };
    }
  }, [enhanceOn]);

  return <>{isEnhanced ? enhancedContent : staticContent}</>;
}

/**
 * Island architecture component
 * Only hydrates interactive parts of the page
 */
interface IslandProps {
  children: ReactNode;
  rootMargin?: string;
  fallback?: ReactNode;
  name?: string;
}

export function Island({ children, rootMargin = '50px', fallback, name }: IslandProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [ref, isIntersecting] = useIntersectionObserver<HTMLDivElement>({
    rootMargin,
    freezeOnceVisible: true,
  });

  useEffect(() => {
    if (isIntersecting && !isHydrated) {
      console.log(`Hydrating island: ${name || 'unnamed'}`);
      setIsHydrated(true);
    }
  }, [isIntersecting, isHydrated, name]);

  return (
    <div ref={ref} data-island={name}>
      {isHydrated ? children : fallback || <div className="min-h-[100px]" />}
    </div>
  );
}

/**
 * Lazy hydration for heavy components
 */
export function LazyHydrate({
  children,
  whenIdle = false,
  whenVisible = true,
  ssrOnly = false,
  className,
}: {
  children: ReactNode;
  whenIdle?: boolean;
  whenVisible?: boolean;
  ssrOnly?: boolean;
  className?: string;
}) {
  if (ssrOnly) {
    return <div className={className}>{children}</div>;
  }

  const strategy = whenIdle ? 'idle' : whenVisible ? 'visible' : 'immediate';

  return (
    <ProgressiveHydration hydrationStrategy={strategy}>
      <div className={className}>{children}</div>
    </ProgressiveHydration>
  );
}

/**
 * Hook for manual hydration control
 */
export function useHydrated() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated;
}

/**
 * Example usage component
 */
export const ProgressiveHydrationExample: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* High priority - hydrates immediately */}
      <ProgressiveHydration priority="high" hydrationStrategy="immediate">
        <InteractiveComponent title="High Priority Component" />
      </ProgressiveHydration>

      {/* Medium priority - hydrates when idle */}
      <ProgressiveHydration priority="medium" hydrationStrategy="idle">
        <InteractiveComponent title="Medium Priority Component" />
      </ProgressiveHydration>

      {/* Low priority - hydrates when visible */}
      <ProgressiveHydration priority="low" hydrationStrategy="visible">
        <InteractiveComponent title="Low Priority Component" />
      </ProgressiveHydration>

      {/* Island architecture example */}
      <Island name="comments-section">
        <CommentsSection />
      </Island>

      {/* Progressive enhancement example */}
      <ProgressiveEnhancement
        staticContent={<StaticCard />}
        enhancedContent={<InteractiveCard />}
        enhanceOn="idle"
      />
    </div>
  );
};

// Example components
const InteractiveComponent = ({ title }: { title: string }) => (
  <div className="p-4 border rounded">
    <h3>{title}</h3>
    <button onClick={() => alert('Clicked!')}>Interactive Button</button>
  </div>
);

const CommentsSection = () => (
  <div className="p-4 border rounded">
    <h3>Comments</h3>
    <textarea placeholder="Add a comment..." className="w-full p-2 border rounded" />
  </div>
);

const StaticCard = () => (
  <div className="p-4 border rounded">
    <h3>Static Content</h3>
    <p>This is server-rendered content.</p>
  </div>
);

const InteractiveCard = () => (
  <div className="p-4 border rounded">
    <h3>Enhanced Content</h3>
    <p>This has been progressively enhanced!</p>
    <button className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
      Click me!
    </button>
  </div>
);