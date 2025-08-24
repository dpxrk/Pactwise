'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation, useMotionValue } from 'framer-motion';
import { Check, Copy, Heart, Star, ThumbsUp, Loader2 } from 'lucide-react';

interface RippleButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  color?: string;
}

export const RippleButton: React.FC<RippleButtonProps> = ({
  children,
  className = '',
  onClick,
  color = 'rgba(17, 24, 39, 0.3)',
}) => {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = Date.now();
      
      setRipples([...ripples, { x, y, id }]);
      
      setTimeout(() => {
        setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
      }, 800);
    }
    
    onClick?.();
  };

  return (
    <button
      ref={buttonRef}
      className={`relative overflow-hidden ${className}`}
      onClick={handleClick}
    >
      {children}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              backgroundColor: color,
            }}
            initial={{ width: 0, height: 0, x: 0, y: 0 }}
            animate={{ width: 300, height: 300, x: -150, y: -150 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>
    </button>
  );
};

interface LikeButtonProps {
  initialLiked?: boolean;
  onLike?: (liked: boolean) => void;
  className?: string;
}

export const LikeButton: React.FC<LikeButtonProps> = ({
  initialLiked = false,
  onLike,
  className = '',
}) => {
  const [liked, setLiked] = useState(initialLiked);
  const [particles, setParticles] = useState<number[]>([]);

  const handleLike = () => {
    const newLiked = !liked;
    setLiked(newLiked);
    
    if (newLiked) {
      setParticles(Array.from({ length: 6 }, (_, i) => i));
      setTimeout(() => setParticles([]), 1000);
    }
    
    onLike?.(newLiked);
  };

  return (
    <button
      className={`relative p-2 ${className}`}
      onClick={handleLike}
    >
      <motion.div
        animate={{ scale: liked ? [1, 1.3, 1] : 1 }}
        transition={{ duration: 0.3 }}
      >
        <Heart
          className={`w-6 h-6 transition-colors ${
            liked ? 'fill-red-500 text-red-500' : 'text-gray-600'
          }`}
        />
      </motion.div>
      
      <AnimatePresence>
        {particles.map((index) => (
          <motion.div
            key={index}
            className="absolute w-1 h-1 bg-red-500 rounded-full"
            style={{
              left: '50%',
              top: '50%',
            }}
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={{
              x: Math.cos((index * 60) * (Math.PI / 180)) * 30,
              y: Math.sin((index * 60) * (Math.PI / 180)) * 30,
              opacity: 0,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>
    </button>
  );
};

interface CopyButtonProps {
  text: string;
  className?: string;
  children?: React.ReactNode;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  className = '',
  children,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <button
      className={`relative inline-flex items-center gap-2 ${className}`}
      onClick={handleCopy}
    >
      {children || text}
      <motion.div
        animate={{ rotate: copied ? 360 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.div
              key="check"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Check className="w-4 h-4 text-green-600" />
            </motion.div>
          ) : (
            <motion.div
              key="copy"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Copy className="w-4 h-4 text-gray-600" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </button>
  );
};

interface ProgressButtonProps {
  onClick?: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  successMessage?: string;
}

export const ProgressButton: React.FC<ProgressButtonProps> = ({
  onClick,
  children,
  className = '',
  successMessage = 'Success!',
}) => {
  const [state, setState] = useState<'idle' | 'loading' | 'success'>('idle');
  const [progress, setProgress] = useState(0);

  const handleClick = async () => {
    if (state !== 'idle') return;
    
    setState('loading');
    setProgress(0);
    
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 100);
    
    try {
      await onClick?.();
      clearInterval(interval);
      setProgress(100);
      setState('success');
      
      setTimeout(() => {
        setState('idle');
        setProgress(0);
      }, 2000);
    } catch (error) {
      clearInterval(interval);
      setState('idle');
      setProgress(0);
    }
  };

  return (
    <button
      className={`relative overflow-hidden ${className}`}
      onClick={handleClick}
      disabled={state !== 'idle'}
    >
      <motion.div
        className="absolute inset-0 bg-gray-900/10"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: progress / 100 }}
        style={{ originX: 0 }}
        transition={{ duration: 0.2 }}
      />
      
      <span className="relative z-10 flex items-center justify-center gap-2">
        <AnimatePresence mode="wait">
          {state === 'idle' && (
            <motion.span
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {children}
            </motion.span>
          )}
          {state === 'loading' && (
            <motion.span
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </motion.span>
          )}
          {state === 'success' && (
            <motion.span
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2 text-green-600"
            >
              <Check className="w-4 h-4" />
              {successMessage}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </button>
  );
};

interface StarRatingProps {
  value?: number;
  onChange?: (rating: number) => void;
  max?: number;
  className?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  value = 0,
  onChange,
  max = 5,
  className = '',
}) => {
  const [hoveredRating, setHoveredRating] = useState(0);
  const [rating, setRating] = useState(value);

  const handleClick = (starValue: number) => {
    setRating(starValue);
    onChange?.(starValue);
  };

  return (
    <div className={`flex gap-1 ${className}`}>
      {Array.from({ length: max }, (_, i) => i + 1).map((starValue) => (
        <motion.button
          key={starValue}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleClick(starValue)}
          onMouseEnter={() => setHoveredRating(starValue)}
          onMouseLeave={() => setHoveredRating(0)}
        >
          <Star
            className={`w-6 h-6 transition-colors ${
              starValue <= (hoveredRating || rating)
                ? 'fill-yellow-500 text-yellow-500'
                : 'text-gray-300'
            }`}
          />
        </motion.button>
      ))}
    </div>
  );
};

interface PulseEffectProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
  duration?: number;
}

export const PulseEffect: React.FC<PulseEffectProps> = ({
  children,
  className = '',
  color = 'rgba(17, 24, 39, 0.5)',
  duration = 2,
}) => {
  return (
    <div className={`relative ${className}`}>
      {children}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{ backgroundColor: color }}
        animate={{
          scale: [1, 1.5, 1.5],
          opacity: [0.5, 0, 0],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'easeOut',
        }}
      />
    </div>
  );
};

interface MagneticTextProps {
  text: string;
  className?: string;
  strength?: number;
}

export const MagneticText: React.FC<MagneticTextProps> = ({
  text,
  className = '',
  strength = 10,
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const distance = Math.sqrt(
      Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
    );
    
    if (distance < 100) {
      const x = ((e.clientX - centerX) / 100) * strength;
      const y = ((e.clientY - centerY) / 100) * strength;
      setPosition({ x, y });
    }
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.span
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={position}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          style={{ display: 'inline-block' }}
          animate={{
            x: position.x * (1 - i * 0.1),
            y: position.y * (1 - i * 0.1),
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </motion.span>
  );
};