'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BentoGrid from './components/BentoGrid'
import GlassCard from './components/GlassCard'
import CommandPalette from './components/CommandPalette'
import DataCanvas from './components/DataCanvas'
import SmartForms from './components/SmartForms'
import './styles/prototype.css'

export default function PrototypePage() {
  const [darkMode, setDarkMode] = useState(false)
  const [showCommand, setShowCommand] = useState(false)
  const [activeSection, setActiveSection] = useState('overview')
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowCommand(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark-prototype')
    } else {
      document.documentElement.classList.remove('dark-prototype')
    }
  }, [darkMode])

  const sections = [
    { id: 'overview', label: 'Overview', icon: '🏠' },
    { id: 'bento', label: 'Bento Grid', icon: '🎯' },
    { id: 'glass', label: 'Glassmorphism', icon: '✨' },
    { id: 'data', label: 'Data Canvas', icon: '📊' },
    { id: 'forms', label: 'Smart Forms', icon: '📝' },
  ]

  return (
    <div className={`prototype-container ${darkMode ? 'dark' : ''} ${reducedMotion ? 'reduced-motion' : ''}`}>
      {/* Animated Background */}
      <div className="prototype-background">
        <div className="gradient-mesh">
          <div className="mesh-blob mesh-blob-1" />
          <div className="mesh-blob mesh-blob-2" />
          <div className="mesh-blob mesh-blob-3" />
        </div>
      </div>

      {/* Header Controls */}
      <motion.header 
        className="prototype-header"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="header-content">
          <div className="header-left">
            <h1 className="prototype-title">
              <span className="title-gradient">Pactwise UI</span>
              <span className="title-accent">Prototype</span>
            </h1>
            <div className="version-badge">v2.0 Preview</div>
          </div>
          
          <nav className="prototype-nav">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
              >
                <span className="nav-icon">{section.icon}</span>
                <span className="nav-label">{section.label}</span>
              </button>
            ))}
          </nav>

          <div className="header-controls">
            <button
              onClick={() => setShowCommand(true)}
              className="command-trigger"
              aria-label="Open command palette"
            >
              <span className="command-hint">⌘K</span>
            </button>
            
            <div className="toggle-group">
              <button
                onClick={() => setReducedMotion(!reducedMotion)}
                className={`toggle-button ${reducedMotion ? 'active' : ''}`}
                aria-label="Toggle reduced motion"
                title="Reduced Motion"
              >
                {reducedMotion ? '🐌' : '⚡'}
              </button>
              
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="toggle-button theme-toggle"
                aria-label="Toggle dark mode"
              >
                {darkMode ? '🌙' : '☀️'}
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="prototype-main">
        <AnimatePresence mode="wait">
          {activeSection === 'overview' && (
            <motion.section
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="section-container"
            >
              <div className="overview-hero">
                <motion.div 
                  className="hero-content"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                >
                  <h2 className="hero-title">
                    Experience the Future of
                    <span className="title-highlight"> Contract Management</span>
                  </h2>
                  <p className="hero-description">
                    A premium UI design system combining cutting-edge aesthetics with intuitive functionality.
                    Explore glassmorphism, adaptive layouts, and intelligent interactions.
                  </p>
                  
                  <div className="feature-grid">
                    <GlassCard className="feature-card">
                      <div className="feature-icon">🎨</div>
                      <h3>Glassmorphism Design</h3>
                      <p>Multi-layered transparency with depth and blur effects</p>
                    </GlassCard>
                    
                    <GlassCard className="feature-card">
                      <div className="feature-icon">🎯</div>
                      <h3>Bento Grid System</h3>
                      <p>Adaptive layouts that respond to content importance</p>
                    </GlassCard>
                    
                    <GlassCard className="feature-card">
                      <div className="feature-icon">✨</div>
                      <h3>Micro-interactions</h3>
                      <p>Delightful animations that guide user actions</p>
                    </GlassCard>
                    
                    <GlassCard className="feature-card">
                      <div className="feature-icon">🚀</div>
                      <h3>Performance First</h3>
                      <p>60fps animations with GPU acceleration</p>
                    </GlassCard>
                  </div>

                  <div className="metrics-showcase">
                    <motion.div 
                      className="metric-card"
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="metric-value">2.5M+</div>
                      <div className="metric-label">Contracts Processed</div>
                      <div className="metric-change">+32% this month</div>
                    </motion.div>
                    
                    <motion.div 
                      className="metric-card"
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="metric-value">87%</div>
                      <div className="metric-label">Time Saved</div>
                      <div className="metric-change">↑ Efficiency gain</div>
                    </motion.div>
                    
                    <motion.div 
                      className="metric-card"
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="metric-value">99.7%</div>
                      <div className="metric-label">Accuracy Rate</div>
                      <div className="metric-change">Industry leading</div>
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            </motion.section>
          )}

          {activeSection === 'bento' && (
            <motion.section
              key="bento"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="section-container"
            >
              <div className="section-header">
                <h2>Adaptive Bento Grid</h2>
                <p>Dynamic layouts that prioritize important content</p>
              </div>
              <BentoGrid />
            </motion.section>
          )}

          {activeSection === 'glass' && (
            <motion.section
              key="glass"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="section-container"
            >
              <div className="section-header">
                <h2>Glassmorphism Components</h2>
                <p>Beautiful depth and transparency effects</p>
              </div>
              
              <div className="glass-showcase">
                <GlassCard level={1}>
                  <h3>Level 1 Glass</h3>
                  <p>Subtle transparency with light blur</p>
                </GlassCard>
                
                <GlassCard level={2}>
                  <h3>Level 2 Glass</h3>
                  <p>Medium transparency with depth</p>
                </GlassCard>
                
                <GlassCard level={3}>
                  <h3>Level 3 Glass</h3>
                  <p>Deep transparency with strong blur</p>
                </GlassCard>
              </div>

              <GlassCard className="interactive-demo">
                <h3>Interactive Elements</h3>
                <div className="demo-controls">
                  <button className="glass-button primary">Primary Action</button>
                  <button className="glass-button secondary">Secondary</button>
                  <button className="glass-button ghost">Ghost Button</button>
                </div>
                
                <div className="progress-demo">
                  <div className="progress-label">Processing Contracts</div>
                  <div className="progress-bar">
                    <motion.div 
                      className="progress-fill"
                      initial={{ width: 0 }}
                      animate={{ width: '75%' }}
                      transition={{ duration: 2, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </GlassCard>
            </motion.section>
          )}

          {activeSection === 'data' && (
            <motion.section
              key="data"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="section-container"
            >
              <div className="section-header">
                <h2>Data Canvas</h2>
                <p>Next-generation data visualization and interaction</p>
              </div>
              <DataCanvas />
            </motion.section>
          )}

          {activeSection === 'forms' && (
            <motion.section
              key="forms"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="section-container"
            >
              <div className="section-header">
                <h2>Smart Forms</h2>
                <p>Intelligent input system with AI assistance</p>
              </div>
              <SmartForms />
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Command Palette */}
      <AnimatePresence>
        {showCommand && (
          <CommandPalette onClose={() => setShowCommand(false)} />
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.div 
        className="fab-container"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, type: "spring", stiffness: 200 }}
      >
        <button className="fab-button" onClick={() => setShowCommand(true)}>
          <span className="fab-icon">✨</span>
          <span className="fab-tooltip">Try Command Palette</span>
        </button>
      </motion.div>
    </div>
  )
}