'use client'

import { useState } from 'react'
import { motion, Reorder } from 'framer-motion'
import GlassCard from './GlassCard'

interface BentoTile {
  id: string
  title: string
  content: React.ReactNode
  size: 'small' | 'medium' | 'large' | 'wide' | 'tall'
  color?: string
}

export default function BentoGrid() {
  const [tiles, setTiles] = useState<BentoTile[]>([
    {
      id: '1',
      title: 'Active Contracts',
      size: 'large',
      content: (
        <div className="bento-content">
          <div className="bento-metric">
            <span className="metric-number">247</span>
            <span className="metric-label">Active</span>
          </div>
          <div className="bento-chart">
            <svg viewBox="0 0 100 40" className="mini-chart">
              <path
                d="M 0,35 L 10,30 L 20,32 L 30,25 L 40,27 L 50,20 L 60,22 L 70,15 L 80,18 L 90,10 L 100,12"
                fill="none"
                stroke="url(#gradient1)"
                strokeWidth="2"
              />
              <defs>
                <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      )
    },
    {
      id: '2',
      title: 'Vendor Performance',
      size: 'medium',
      content: (
        <div className="bento-content">
          <div className="vendor-list">
            <div className="vendor-item">
              <div className="vendor-avatar">AS</div>
              <div className="vendor-info">
                <div className="vendor-name">Acme Services</div>
                <div className="vendor-score">Score: 94</div>
              </div>
            </div>
            <div className="vendor-item">
              <div className="vendor-avatar">TC</div>
              <div className="vendor-info">
                <div className="vendor-name">TechCorp</div>
                <div className="vendor-score">Score: 88</div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: '3',
      title: 'AI Insights',
      size: 'wide',
      content: (
        <div className="bento-content ai-insights">
          <div className="insight-pill">🔍 3 contracts require review</div>
          <div className="insight-pill">⚠️ 2 expiring this month</div>
          <div className="insight-pill">✨ $45K savings identified</div>
        </div>
      )
    },
    {
      id: '4',
      title: 'Quick Actions',
      size: 'small',
      content: (
        <div className="bento-content quick-actions">
          <button className="quick-action">
            <span className="action-icon">📄</span>
            <span className="action-label">New Contract</span>
          </button>
          <button className="quick-action">
            <span className="action-icon">🔍</span>
            <span className="action-label">Search</span>
          </button>
        </div>
      )
    },
    {
      id: '5',
      title: 'Compliance Status',
      size: 'small',
      content: (
        <div className="bento-content compliance">
          <div className="compliance-score">
            <svg className="circular-progress" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#10b981"
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 40 * 0.92} ${2 * Math.PI * 40}`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
              <text x="50" y="50" textAnchor="middle" dy="8" className="score-text">
                92%
              </text>
            </svg>
          </div>
        </div>
      )
    },
    {
      id: '6',
      title: 'Recent Activity',
      size: 'tall',
      content: (
        <div className="bento-content activity-feed">
          <div className="activity-item">
            <div className="activity-icon">📝</div>
            <div className="activity-details">
              <div className="activity-title">Contract signed</div>
              <div className="activity-time">2 min ago</div>
            </div>
          </div>
          <div className="activity-item">
            <div className="activity-icon">👤</div>
            <div className="activity-details">
              <div className="activity-title">New vendor added</div>
              <div className="activity-time">1 hour ago</div>
            </div>
          </div>
          <div className="activity-item">
            <div className="activity-icon">✅</div>
            <div className="activity-details">
              <div className="activity-title">Review completed</div>
              <div className="activity-time">3 hours ago</div>
            </div>
          </div>
        </div>
      )
    }
  ])

  const sizeClasses: Record<string, string> = {
    small: 'bento-small',
    medium: 'bento-medium',
    large: 'bento-large',
    wide: 'bento-wide',
    tall: 'bento-tall'
  }

  return (
    <div className="bento-container">
      <Reorder.Group 
        axis="y" 
        values={tiles} 
        onReorder={setTiles}
        className="bento-grid"
      >
        {tiles.map((tile, index) => (
          <Reorder.Item key={tile.id} value={tile}>
            <motion.div
              className={`bento-tile ${sizeClasses[tile.size]}`}
              whileHover={{ 
                scale: 1.02,
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                delay: index * 0.05,
                duration: 0.5,
                ease: [0.23, 1, 0.32, 1]
              }}
            >
              <GlassCard className="bento-glass-card h-full">
                <div className="bento-header">
                  <h3 className="bento-title">{tile.title}</h3>
                  <button className="bento-menu">⋮</button>
                </div>
                <div className="bento-body">
                  {tile.content}
                </div>
              </GlassCard>
            </motion.div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      <div className="bento-controls">
        <button className="bento-control-btn">
          <span>➕ Add Widget</span>
        </button>
        <button className="bento-control-btn">
          <span>🎨 Customize Layout</span>
        </button>
      </div>
    </div>
  )
}