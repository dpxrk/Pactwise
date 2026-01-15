'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

import GlassCard from './GlassCard'

interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'select' | 'textarea' | 'date' | 'number'
  required?: boolean
  options?: string[]
  aiSuggestions?: string[]
}

export default function SmartForms() {
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [aiMode, setAiMode] = useState(true)

  const fields: FormField[] = [
    {
      name: 'contractTitle',
      label: 'Contract Title',
      type: 'text',
      required: true,
      aiSuggestions: [
        'Master Service Agreement - 2024',
        'Software License Agreement',
        'Non-Disclosure Agreement',
        'Professional Services Contract'
      ]
    },
    {
      name: 'vendorName',
      label: 'Vendor Name',
      type: 'text',
      required: true,
      aiSuggestions: [
        'Acme Corporation',
        'TechCorp Solutions',
        'Global Services Inc',
        'CloudBase Systems'
      ]
    },
    {
      name: 'contractType',
      label: 'Contract Type',
      type: 'select',
      required: true,
      options: ['MSA', 'NDA', 'SaaS', 'License', 'Support', 'Consulting']
    },
    {
      name: 'startDate',
      label: 'Start Date',
      type: 'date',
      required: true
    },
    {
      name: 'contractValue',
      label: 'Contract Value',
      type: 'number',
      required: true
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      aiSuggestions: [
        'This agreement outlines the terms and conditions for...',
        'Professional services to be provided include...',
        'Software licensing terms for enterprise deployment...'
      ]
    }
  ]

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }

    // Show AI suggestions for text fields
    if (aiMode && value.length > 2) {
      const field = fields.find(f => f.name === name)
      if (field?.aiSuggestions) {
        setShowSuggestions(name)
      }
    } else {
      setShowSuggestions(null)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    const errors: Record<string, string> = {}
    fields.forEach(field => {
      if (field.required && !formData[field.name]) {
        errors[field.name] = `${field.label} is required`
      }
    })

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    // Show success animation
  }

  const FloatingLabel = ({ field }: { field: FormField }) => {
    const hasValue = formData[field.name]
    const isFocused = focusedField === field.name
    const hasError = validationErrors[field.name]

    return (
      <div className="floating-label-container">
        <motion.label
          className={`floating-label ${(hasValue || isFocused) ? 'floating' : ''} ${hasError ? 'error' : ''}`}
          animate={{
            y: (hasValue || isFocused) ? -20 : 0,
            scale: (hasValue || isFocused) ? 0.85 : 1,
            color: hasError ? '#ef4444' : (isFocused ? '#3b82f6' : '#6b7280')
          }}
          transition={{ duration: 0.2 }}
        >
          {field.label} {field.required && '*'}
        </motion.label>
        
        {field.type === 'select' ? (
          <select
            className={`smart-input ${hasError ? 'error' : ''}`}
            value={formData[field.name] || ''}
            onChange={e => handleInputChange(field.name, e.target.value)}
            onFocus={() => setFocusedField(field.name)}
            onBlur={() => setFocusedField(null)}
          >
            <option value="">Select...</option>
            {field.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        ) : field.type === 'textarea' ? (
          <textarea
            className={`smart-input textarea ${hasError ? 'error' : ''}`}
            value={formData[field.name] || ''}
            onChange={e => handleInputChange(field.name, e.target.value)}
            onFocus={() => setFocusedField(field.name)}
            onBlur={() => setFocusedField(null)}
            rows={4}
          />
        ) : (
          <input
            type={field.type}
            className={`smart-input ${hasError ? 'error' : ''}`}
            value={formData[field.name] || ''}
            onChange={e => handleInputChange(field.name, e.target.value)}
            onFocus={() => setFocusedField(field.name)}
            onBlur={() => setTimeout(() => setFocusedField(null), 200)}
          />
        )}
        
        {/* Validation Error */}
        <AnimatePresence>
          {hasError && (
            <motion.div
              className="field-error"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
            >
              {validationErrors[field.name]}
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Suggestions */}
        <AnimatePresence>
          {showSuggestions === field.name && field.aiSuggestions && (
            <motion.div
              className="ai-suggestions"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="suggestions-header">
                <span className="ai-icon">✨</span>
                AI Suggestions
              </div>
              {field.aiSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  className="suggestion-item"
                  onClick={() => {
                    handleInputChange(field.name, suggestion)
                    setShowSuggestions(null)
                  }}
                  type="button"
                >
                  {suggestion}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Field Focus Indicator */}
        <motion.div
          className="focus-indicator"
          initial={false}
          animate={{
            scaleX: isFocused ? 1 : 0,
            opacity: isFocused ? 1 : 0
          }}
          transition={{ duration: 0.3 }}
        />
      </div>
    )
  }

  return (
    <div className="smart-forms-container">
      <GlassCard className="form-card">
        <div className="form-header">
          <h3>Smart Contract Form</h3>
          <div className="ai-toggle">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={aiMode}
                onChange={e => setAiMode(e.target.checked)}
                className="toggle-input"
              />
              <span className="toggle-slider"></span>
              <span className="toggle-text">AI Assist</span>
            </label>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="smart-form">
          <div className="form-grid">
            {fields.map(field => (
              <div 
                key={field.name} 
                className={`form-field ${field.type === 'textarea' ? 'full-width' : ''}`}
              >
                <FloatingLabel field={field} />
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary">
              Save Draft
            </button>
            <button type="submit" className="btn-primary">
              <span>Create Contract</span>
              <motion.span
                className="btn-icon"
                whileHover={{ x: 5 }}
                transition={{ duration: 0.2 }}
              >
                →
              </motion.span>
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="form-progress">
            <div className="progress-label">Form Completion</div>
            <div className="progress-track">
              <motion.div
                className="progress-fill"
                animate={{
                  width: `${(Object.keys(formData).filter(key => formData[key]).length / fields.filter(f => f.required).length) * 100}%`
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </form>
      </GlassCard>

      {/* AI Assistant Card */}
      <GlassCard className="ai-assistant-card">
        <div className="assistant-header">
          <span className="assistant-icon">🤖</span>
          <h4>AI Assistant</h4>
        </div>
        <div className="assistant-content">
          <p>I can help you fill out this form more efficiently!</p>
          <ul className="assistant-tips">
            <li>Start typing to see AI suggestions</li>
            <li>Use Tab to navigate between fields</li>
            <li>Press Enter to accept suggestions</li>
          </ul>
          <button className="assistant-action">
            <span>Auto-fill with AI</span>
          </button>
        </div>
      </GlassCard>
    </div>
  )
}