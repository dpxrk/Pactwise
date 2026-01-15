'use client'

import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'

interface CommandOption {
  id: string
  title: string
  description?: string
  icon: string
  category: string
  action?: () => void
  shortcut?: string
}

interface CommandPaletteProps {
  onClose: () => void
}

export default function CommandPalette({ onClose }: CommandPaletteProps) {
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const commands: CommandOption[] = [
    {
      id: '1',
      title: 'Create New Contract',
      description: 'Start drafting a new contract',
      icon: '📄',
      category: 'Actions',
      shortcut: '⌘N'
    },
    {
      id: '2',
      title: 'Search Contracts',
      description: 'Find existing contracts',
      icon: '🔍',
      category: 'Navigation',
      shortcut: '⌘F'
    },
    {
      id: '3',
      title: 'Add Vendor',
      description: 'Register a new vendor',
      icon: '👤',
      category: 'Actions',
      shortcut: '⌘V'
    },
    {
      id: '4',
      title: 'Analytics Dashboard',
      description: 'View performance metrics',
      icon: '📊',
      category: 'Navigation',
      shortcut: '⌘D'
    },
    {
      id: '5',
      title: 'AI Assistant',
      description: 'Get help from AI',
      icon: '✨',
      category: 'Tools',
      shortcut: '⌘A'
    },
    {
      id: '6',
      title: 'Export Data',
      description: 'Download reports and data',
      icon: '⬇️',
      category: 'Actions',
      shortcut: '⌘E'
    },
    {
      id: '7',
      title: 'Settings',
      description: 'Configure your preferences',
      icon: '⚙️',
      category: 'System',
      shortcut: '⌘,'
    },
    {
      id: '8',
      title: 'Help & Documentation',
      description: 'Learn how to use Pactwise',
      icon: '📚',
      category: 'System',
      shortcut: '⌘?'
    }
  ]

  const filteredCommands = commands.filter(cmd => 
    cmd.title.toLowerCase().includes(search.toLowerCase()) ||
    cmd.description?.toLowerCase().includes(search.toLowerCase()) ||
    cmd.category.toLowerCase().includes(search.toLowerCase())
  )

  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = []
    acc[cmd.category].push(cmd)
    return acc
  }, {} as Record<string, CommandOption[]>)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        )
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selected = filteredCommands[selectedIndex]
        if (selected?.action) {
          selected.action()
        }
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filteredCommands, selectedIndex, onClose])

  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  return (
    <motion.div
      className="command-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="command-palette"
        initial={{ scale: 0.95, y: -20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: -20 }}
        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        onClick={e => e.stopPropagation()}
      >
        <div className="command-header">
          <div className="command-search">
            <span className="search-icon">🔍</span>
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a command or search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="command-input"
            />
            <span className="command-hint">ESC</span>
          </div>
        </div>

        <div className="command-body">
          {Object.entries(groupedCommands).map(([category, items]) => (
            <div key={category} className="command-group">
              <div className="command-category">{category}</div>
              {items.map((cmd) => {
                const globalIndex = filteredCommands.findIndex(c => c.id === cmd.id)
                return (
                  <motion.button
                    key={cmd.id}
                    className={`command-item ${globalIndex === selectedIndex ? 'selected' : ''}`}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                    onClick={() => {
                      if (cmd.action) cmd.action()
                      onClose()
                    }}
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="command-item-content">
                      <span className="command-icon">{cmd.icon}</span>
                      <div className="command-text">
                        <div className="command-title">{cmd.title}</div>
                        {cmd.description && (
                          <div className="command-description">{cmd.description}</div>
                        )}
                      </div>
                    </div>
                    {cmd.shortcut && (
                      <div className="command-shortcut">{cmd.shortcut}</div>
                    )}
                  </motion.button>
                )
              })}
            </div>
          ))}
          
          {filteredCommands.length === 0 && (
            <div className="command-empty">
              <span className="empty-icon">🔍</span>
              <p>No commands found</p>
              <p className="empty-hint">Try a different search term</p>
            </div>
          )}
        </div>

        <div className="command-footer">
          <div className="footer-hint">
            <span className="hint-key">↑↓</span> Navigate
          </div>
          <div className="footer-hint">
            <span className="hint-key">↵</span> Select
          </div>
          <div className="footer-hint">
            <span className="hint-key">ESC</span> Close
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}