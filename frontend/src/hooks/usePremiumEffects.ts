"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// Ripple Effect Hook
export const useRipple = () => {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const nextId = useRef(0);

  const createRipple = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const id = nextId.current++;

    setRipples(prev => [...prev, { x, y, id }]);
    
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 600);
  }, []);

  return { ripples, createRipple };
};

// 3D Tilt Effect Hook
export const use3DTilt = (intensity = 10) => {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState("");

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      
      const tiltX = (y - 0.5) * intensity;
      const tiltY = (x - 0.5) * -intensity;
      
      setTransform(`perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`);
    };

    const handleMouseLeave = () => {
      setTransform("");
    };

    element.addEventListener("mousemove", handleMouseMove);
    element.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      element.removeEventListener("mousemove", handleMouseMove);
      element.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [intensity]);

  return { ref, transform };
};

// Magnetic Effect Hook
export const useMagnetic = (strength = 0.5) => {
  const ref = useRef<HTMLElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const distanceX = e.clientX - centerX;
      const distanceY = e.clientY - centerY;
      
      const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2);
      const maxDistance = Math.max(rect.width, rect.height);
      
      if (distance < maxDistance) {
        const force = (1 - distance / maxDistance) * strength;
        setPosition({
          x: distanceX * force,
          y: distanceY * force
        });
      }
    };

    const handleMouseLeave = () => {
      setPosition({ x: 0, y: 0 });
    };

    document.addEventListener("mousemove", handleMouseMove);
    element.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      element.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [strength]);

  return { ref, position };
};

// Spotlight Effect Hook
export const useSpotlight = () => {
  const ref = useRef<HTMLElement>(null);
  const [spotlightStyle, setSpotlightStyle] = useState({});

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setSpotlightStyle({
        background: `radial-gradient(circle at ${x}px ${y}px, rgba(20, 184, 166, 0.15) 0%, transparent 50%)`,
      });
    };

    element.addEventListener("mousemove", handleMouseMove);
    
    return () => {
      element.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return { ref, spotlightStyle };
};

// Parallax Effect Hook
export const useParallax = (speed = 0.5) => {
  const ref = useRef<HTMLElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;
      
      const scrolled = window.scrollY;
      const rate = scrolled * speed * -1;
      setOffset(rate);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [speed]);

  return { ref, offset };
};

// Glitch Effect Hook
export const useGlitch = () => {
  const [isGlitching, setIsGlitching] = useState(false);

  const triggerGlitch = useCallback((duration = 500) => {
    setIsGlitching(true);
    setTimeout(() => setIsGlitching(false), duration);
  }, []);

  return { isGlitching, triggerGlitch };
};

// Sound Effect Hook (optional toggle)
export const useSoundEffects = () => {
  const [enabled, setEnabled] = useState(false);
  
  const playSound = useCallback((type: 'click' | 'hover' | 'success' | 'error') => {
    if (!enabled) return;
    
    // Sound URLs would need to be added to public folder
    const sounds = {
      click: '/sounds/click.mp3',
      hover: '/sounds/hover.mp3',
      success: '/sounds/success.mp3',
      error: '/sounds/error.mp3'
    };
    
    try {
      const audio = new Audio(sounds[type]);
      audio.volume = 0.3;
      audio.play();
    } catch (e) {
      console.error('Sound playback failed:', e);
    }
  }, [enabled]);

  return { enabled, setEnabled, playSound };
};

// Typewriter Effect Hook
export const useTypewriter = (text: string, speed = 50) => {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    let index = 0;
    setDisplayText('');
    setIsTyping(true);

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayText(prev => prev + text[index]);
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return { displayText, isTyping };
};

// Counter Animation Hook
export const useCountAnimation = (end: number, duration = 2000) => {
  const [count, setCount] = useState(0);
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    const animate = (currentTime: number) => {
      if (!startTime.current) {
        startTime.current = currentTime;
      }

      const elapsed = currentTime - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = Math.floor(easeOutQuart * end);
      
      setCount(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [end, duration]);

  return count;
};

// Intersection Observer with Stagger Hook
export const useStaggerReveal = (staggerDelay = 100) => {
  const [isVisible, setIsVisible] = useState(false);
  const [visibleItems, setVisibleItems] = useState<number[]>([]);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          
          // Stagger children reveal
          const children = ref.current?.children || [];
          Array.from(children).forEach((_, index) => {
            setTimeout(() => {
              setVisibleItems(prev => [...prev, index]);
            }, index * staggerDelay);
          });
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [staggerDelay]);

  return { ref, isVisible, visibleItems };
};