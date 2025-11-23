'use client';

import { motion } from 'framer-motion';
import React from 'react';

interface PactwiseLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'icon' | 'wordmark';
  theme?: 'light' | 'dark';
  className?: string;
}

const PactwiseLogo: React.FC<PactwiseLogoProps> = ({ 
  size = 'md', 
  variant = 'default',
  theme = 'light',
  className = ''
}) => {
  const sizeMap = {
    sm: { width: 100, height: 24, iconSize: 24 },
    md: { width: 120, height: 28, iconSize: 28 },
    lg: { width: 140, height: 32, iconSize: 32 },
    xl: { width: 180, height: 40, iconSize: 40 }
  };

  const currentSize = sizeMap[size];
  const color = theme === 'dark' ? '#FFFFFF' : '#000000';
  
  if (variant === 'icon') {
    // Icon only - The synthesis of AI and contracts
    return (
      <div className={className}>
        <svg
          width={currentSize.iconSize}
          height={currentSize.iconSize}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* 
            The concept: A document that transforms into neural pathways
            The left side suggests a document/contract
            The right side dissolves into connected nodes (AI/neural network)
            Together they form an abstract "P"
          */}
          
          {/* Document base structure */}
          <path
            d="M10 8 L10 32 L12 32 L12 8 Z"
            fill={color}
          />
          
          {/* Top bar of P */}
          <path
            d="M12 8 L24 8 L24 10 L12 10 Z"
            fill={color}
          />
          
          {/* Middle bar of P */}
          <path
            d="M12 18 L24 18 L24 20 L12 20 Z"
            fill={color}
          />
          
          {/* Neural network transformation - dots that emerge from the structure */}
          <circle cx="24" cy="9" r="1.5" fill={color} opacity="1" />
          <circle cx="28" cy="11" r="1.5" fill={color} opacity="0.8" />
          <circle cx="30" cy="15" r="1.5" fill={color} opacity="0.6" />
          
          <circle cx="24" cy="19" r="1.5" fill={color} opacity="1" />
          <circle cx="28" cy="19" r="1.5" fill={color} opacity="0.8" />
          <circle cx="32" cy="19" r="1.5" fill={color} opacity="0.6" />
          
          {/* Connecting lines - neural pathways */}
          <path
            d="M24 9 L28 11 M24 19 L28 19 M28 11 L30 15 M28 19 L32 19"
            stroke={color}
            strokeWidth="0.5"
            opacity="0.4"
          />
          
          {/* Subtle grid lines suggesting document structure */}
          <path
            d="M12 14 L20 14 M12 24 L18 24 M12 28 L16 28"
            stroke={color}
            strokeWidth="0.5"
            opacity="0.3"
          />
        </svg>
      </div>
    );
  }

  if (variant === 'wordmark') {
    // Pure typography - but with intelligence built in
    return (
      <div className={className}>
        <svg
          width={currentSize.width}
          height={currentSize.height}
          viewBox="0 0 120 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <text
            x="0"
            y="21"
            fill={color}
            fontSize="20"
            fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
            fontWeight="300"
            letterSpacing="-0.02em"
          >
            Pactwise
          </text>
          
          {/* Subtle AI indicator - a small neural dot pattern replacing the dot on the 'i' */}
          <circle cx="74.5" cy="8" r="1" fill={color} />
          <circle cx="72.5" cy="6" r="0.7" fill={color} opacity="0.6" />
          <circle cx="76.5" cy="6" r="0.7" fill={color} opacity="0.6" />
          
          {/* Ultra-subtle connecting lines */}
          <path
            d="M72.5 6 L74.5 8 L76.5 6"
            stroke={color}
            strokeWidth="0.3"
            opacity="0.3"
          />
        </svg>
      </div>
    );
  }

  // Default - The masterpiece: Typography with integrated intelligence
  return (
    <div className={className}>
      <svg
        width={currentSize.width}
        height={currentSize.height}
        viewBox="0 0 140 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* 
          World-class concept: The word "Pactwise" where:
          - The 'P' has a subtle document fold in negative space
          - The 'a' and 'c' connect subtly suggesting binding/contracts
          - The 't' extends to create a crossroads (decision point)
          - The dot of 'i' becomes a neural node cluster
          - The 'wise' portion gradually becomes lighter, suggesting enlightenment
        */}
        
        {/* Custom letterforms */}
        
        {/* P - with document fold */}
        <path
          d="M4 24V8 L4 8 L12 8 Q16 8 16 12 Q16 16 12 16 L6 16 L6 24 Z M6 10 L6 14 L12 14 Q14 14 14 12 Q14 10 12 10 Z"
          fill={color}
          strokeWidth="0"
        />
        {/* Subtle fold line in P */}
        <path
          d="M4 8 L5 9"
          stroke={color}
          strokeWidth="0.5"
          opacity="0.2"
        />
        
        {/* a */}
        <path
          d="M22 19 Q22 24 26 24 Q28 24 29 23 L29 17 Q29 14 26 14 Q22 14 22 17 Z M29 24 L31 24 L31 14 L29 14"
          fill={color}
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* c - with subtle connection to 'a' */}
        <path
          d="M38 17 Q35 17 35 19 Q35 21 38 21 L40 21"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Connection line */}
        <path
          d="M31 19 L35 19"
          stroke={color}
          strokeWidth="0.3"
          opacity="0.2"
        />
        
        {/* t - extending as crossroads */}
        <path
          d="M45 10 L45 22 Q45 24 47 24 M43 14 L49 14"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        
        {/* w */}
        <path
          d="M54 14 L56 22 L58 14 L60 22 L62 14"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
        
        {/* i - with neural cluster */}
        <path
          d="M68 14 L68 22"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.8"
        />
        {/* Neural cluster replacing dot */}
        <circle cx="68" cy="10" r="1" fill={color} opacity="0.8" />
        <circle cx="66.5" cy="8.5" r="0.6" fill={color} opacity="0.5" />
        <circle cx="69.5" cy="8.5" r="0.6" fill={color} opacity="0.5" />
        <path
          d="M66.5 8.5 L68 10 L69.5 8.5"
          stroke={color}
          strokeWidth="0.3"
          opacity="0.3"
        />
        
        {/* s */}
        <path
          d="M74 15 Q74 14 76 14 Q78 14 78 15 Q78 16 76 17 Q74 18 74 19 Q74 20 76 20 Q78 20 78 19"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.7"
        />
        
        {/* e */}
        <path
          d="M84 19 L88 19 Q88 14 84 14 Q82 14 82 17 Q82 20 84 20 Q86 20 88 19"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.6"
        />
        
        {/* Subtle gradient fade effect using multiple opacity levels */}
        <defs>
          <linearGradient id="fadeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="60%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

// Ultra-premium version - For special occasions
export const PactwiseLogoPremium: React.FC<PactwiseLogoProps & { variant?: 'light' | 'dark' }> = ({
  size = 'md',
  theme = 'light',
  variant = 'light',
  className = ''
}) => {
  const fontSize = size === 'lg' ? '28px' : size === 'md' ? '22px' : '18px';

  // For the dark/purple animated landing page
  if (variant === 'light' || theme === 'dark') {
    return (
      <motion.div
        className={`${className} select-none inline-block group cursor-pointer`}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <div
          className="relative"
          style={{
            fontSize: fontSize,
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
            letterSpacing: '-0.02em',
          }}
        >
          {/* Glow effect background */}
          <div
            className="absolute inset-0 blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500"
            style={{
              background: 'linear-gradient(90deg, #9e829c 0%, #ffffff 50%, #9e829c 100%)',
            }}
          />

          {/* Main text with gradient */}
          <div className="relative">
            <span
              className="inline-block bg-gradient-to-r from-white via-purple-100 to-purple-200 bg-clip-text text-transparent"
              style={{ fontWeight: 600 }}
            >
              P
            </span>
            <span
              className="inline-block bg-gradient-to-r from-purple-100 via-purple-200 to-purple-300 bg-clip-text text-transparent"
              style={{ fontWeight: 400 }}
            >
              act
            </span>
            <span
              className="inline-block bg-gradient-to-r from-purple-200 via-purple-300 to-pink-300 bg-clip-text text-transparent"
              style={{ fontWeight: 300 }}
            >
              wise
            </span>
          </div>

          {/* Subtle underline accent */}
          <motion.div
            className="absolute -bottom-1 left-0 h-[1px] bg-gradient-to-r from-transparent via-purple-400 to-transparent"
            initial={{ width: '0%' }}
            whileInView={{ width: '100%' }}
            transition={{ duration: 1, delay: 0.2 }}
          />

          {/* AI indicator dot */}
          <motion.div
            className="absolute -top-1 -right-2 w-1.5 h-1.5 rounded-full bg-purple-400"
            animate={{
              opacity: [0.4, 1, 0.4],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
      </motion.div>
    );
  }

  // Default light theme version
  return (
    <motion.div
      className={`${className} select-none inline-block group cursor-pointer`}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div
        style={{
          fontSize: fontSize,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
          letterSpacing: '-0.02em',
        }}
      >
        <span
          className="inline-block bg-gradient-to-r from-purple-900 to-purple-800 bg-clip-text text-transparent"
          style={{ fontWeight: 600 }}
        >
          P
        </span>
        <span
          className="inline-block bg-gradient-to-r from-purple-800 to-purple-700 bg-clip-text text-transparent"
          style={{ fontWeight: 400 }}
        >
          act
        </span>
        <span
          className="inline-block bg-gradient-to-r from-purple-700 to-pink-500 bg-clip-text text-transparent"
          style={{ fontWeight: 300 }}
        >
          wise
        </span>

        {/* Hover underline effect */}
        <motion.div
          className="h-[2px] bg-gradient-to-r from-purple-900 via-purple-500 to-pink-500 origin-left"
          initial={{ scaleX: 0 }}
          whileHover={{ scaleX: 1 }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </motion.div>
  );
};

export default PactwiseLogo;