"use client";

import { motion } from 'framer-motion';
import React from 'react';

interface Section {
  id: string;
  label: string;
  position: number; // 0-1 scroll position
}

interface ScrollProgressIndicatorProps {
  currentProgress: number;
  sections?: Section[];
  className?: string;
}

const DEFAULT_SECTIONS: Section[] = [
  { id: 'hero', label: 'SYSTEM', position: 0 },
  { id: 'features', label: 'ENGINE', position: 0.25 },
  { id: 'agents', label: 'AGENTS', position: 0.55 },
  { id: 'cta', label: 'START', position: 0.85 },
];

export const ScrollProgressIndicator: React.FC<ScrollProgressIndicatorProps> = ({
  currentProgress,
  sections = DEFAULT_SECTIONS,
  className = '',
}) => {
  // Find current section
  const currentSectionIndex = sections.findIndex((section, index) => {
    const nextSection = sections[index + 1];
    if (!nextSection) return true;
    return currentProgress >= section.position && currentProgress < nextSection.position;
  });

  return (
    <div className={`fixed right-6 top-1/2 -translate-y-1/2 z-40 ${className}`}>
      {/* Track line */}
      <div className="relative w-px h-48 bg-purple-500/20">
        {/* Progress fill */}
        <motion.div
          className="absolute top-0 left-0 w-full bg-gradient-to-b from-purple-400 to-purple-600"
          style={{ height: `${currentProgress * 100}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 30 }}
        />

        {/* Section markers */}
        {sections.map((section, index) => {
          const isActive = index === currentSectionIndex;
          const isPast = index < currentSectionIndex;

          return (
            <div
              key={section.id}
              className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3"
              style={{ top: `${section.position * 100}%` }}
            >
              {/* Dot */}
              <motion.div
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'bg-purple-300 scale-150 shadow-lg shadow-purple-500/50'
                    : isPast
                    ? 'bg-purple-500'
                    : 'bg-purple-500/30'
                }`}
                animate={isActive ? { scale: [1.5, 1.8, 1.5] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              />

              {/* Label */}
              <span
                className={`absolute left-4 text-xs font-mono tracking-widest whitespace-nowrap transition-all duration-300 ${
                  isActive
                    ? 'text-white opacity-100 scale-100'
                    : 'text-purple-400/60 opacity-70 scale-95'
                }`}
              >
                {section.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Current progress percentage */}
      <div className="mt-4 text-center">
        <span className="text-xs font-mono text-purple-400/60">
          {Math.round(currentProgress * 100)}%
        </span>
      </div>
    </div>
  );
};

export default ScrollProgressIndicator;
