'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  level?: 1 | 2 | 3
  interactive?: boolean
  glow?: boolean
}

export default function GlassCard({ 
  children, 
  className = '', 
  level = 1,
  interactive = true,
  glow = false
}: GlassCardProps) {
  const levelClasses = {
    1: 'glass-level-1',
    2: 'glass-level-2',
    3: 'glass-level-3'
  }

  return (
    <motion.div
      className={`glass-card ${levelClasses[level]} ${className} ${glow ? 'glass-glow' : ''}`}
      whileHover={interactive ? {
        scale: 1.01,
        rotateX: 1,
        rotateY: 1,
        transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] }
      } : {}}
      whileTap={interactive ? { scale: 0.98 } : {}}
      style={{
        transformStyle: 'preserve-3d',
        perspective: 1000
      }}
    >
      <div className="glass-content">
        {children}
      </div>
      
      {/* Decorative elements - only visible on hover */}
      {interactive && (
        <div className="glass-decoration">
          <div className="glass-shimmer" />
          <div className="glass-edge-light" />
        </div>
      )}
    </motion.div>
  )
}