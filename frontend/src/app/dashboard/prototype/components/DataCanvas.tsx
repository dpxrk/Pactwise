'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'

import GlassCard from './GlassCard'

interface DataRow {
  id: string
  contract: string
  vendor: string
  value: string
  status: 'active' | 'pending' | 'expired'
  date: string
  risk: 'low' | 'medium' | 'high'
}

export default function DataCanvas() {
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<keyof DataRow>('contract')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null)

  const data: DataRow[] = [
    {
      id: '1',
      contract: 'MSA-2024-001',
      vendor: 'Acme Services',
      value: '$250,000',
      status: 'active',
      date: '2024-03-15',
      risk: 'low'
    },
    {
      id: '2',
      contract: 'NDA-2024-047',
      vendor: 'TechCorp Solutions',
      value: '$75,000',
      status: 'active',
      date: '2024-03-10',
      risk: 'low'
    },
    {
      id: '3',
      contract: 'SaaS-2024-012',
      vendor: 'CloudBase Inc',
      value: '$180,000',
      status: 'pending',
      date: '2024-03-08',
      risk: 'medium'
    },
    {
      id: '4',
      contract: 'SUP-2024-089',
      vendor: 'Global Supplies',
      value: '$92,500',
      status: 'active',
      date: '2024-02-28',
      risk: 'low'
    },
    {
      id: '5',
      contract: 'LIC-2023-234',
      vendor: 'Software Pro',
      value: '$450,000',
      status: 'expired',
      date: '2023-12-31',
      risk: 'high'
    }
  ]

  const statusColors = {
    active: 'status-active',
    pending: 'status-pending',
    expired: 'status-expired'
  }

  const riskColors = {
    low: 'risk-low',
    medium: 'risk-medium',
    high: 'risk-high'
  }

  const handleSort = (column: keyof DataRow) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  const toggleRowSelection = (id: string) => {
    setSelectedRows(prev =>
      prev.includes(id)
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    )
  }

  return (
    <div className="data-canvas-container">
      <GlassCard className="data-canvas-wrapper">
        <div className="canvas-header">
          <div className="canvas-title">
            <h3>Contract Data Canvas</h3>
            <span className="record-count">{data.length} records</span>
          </div>
          
          <div className="canvas-controls">
            <button className="canvas-btn">
              <span>⚡ Quick Filter</span>
            </button>
            <button className="canvas-btn">
              <span>📊 Visualize</span>
            </button>
            <button className="canvas-btn primary">
              <span>⬇️ Export</span>
            </button>
          </div>
        </div>

        <div className="data-canvas">
          <table className="canvas-table">
            <thead>
              <tr>
                <th className="checkbox-column">
                  <input
                    type="checkbox"
                    className="canvas-checkbox"
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedRows(data.map(d => d.id))
                      } else {
                        setSelectedRows([])
                      }
                    }}
                  />
                </th>
                <th onClick={() => handleSort('contract')} className="sortable">
                  <div className="th-content">
                    Contract ID
                    <span className="sort-indicator">
                      {sortBy === 'contract' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </span>
                  </div>
                </th>
                <th onClick={() => handleSort('vendor')} className="sortable">
                  <div className="th-content">
                    Vendor
                    <span className="sort-indicator">
                      {sortBy === 'vendor' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </span>
                  </div>
                </th>
                <th onClick={() => handleSort('value')} className="sortable">
                  <div className="th-content">
                    Value
                    <span className="sort-indicator">
                      {sortBy === 'value' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </span>
                  </div>
                </th>
                <th>Status</th>
                <th>Risk Level</th>
                <th onClick={() => handleSort('date')} className="sortable">
                  <div className="th-content">
                    Date
                    <span className="sort-indicator">
                      {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </span>
                  </div>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                <motion.tr
                  key={row.id}
                  className={`data-row ${selectedRows.includes(row.id) ? 'selected' : ''}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: rowIndex * 0.05 }}
                  whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
                >
                  <td>
                    <input
                      type="checkbox"
                      className="canvas-checkbox"
                      checked={selectedRows.includes(row.id)}
                      onChange={() => toggleRowSelection(row.id)}
                    />
                  </td>
                  <td>
                    <div 
                      className="cell-content contract-id"
                      onMouseEnter={() => setHoveredCell({ row: rowIndex, col: 1 })}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      {row.contract}
                      {hoveredCell?.row === rowIndex && hoveredCell?.col === 1 && (
                        <motion.div 
                          className="cell-tooltip"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          Click to view details
                        </motion.div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="cell-content vendor-name">
                      <div className="vendor-avatar">
                        {row.vendor.split(' ').map(w => w[0]).join('')}
                      </div>
                      {row.vendor}
                    </div>
                  </td>
                  <td>
                    <div className="cell-content value">
                      {row.value}
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${statusColors[row.status]}`}>
                      {row.status}
                    </span>
                  </td>
                  <td>
                    <span className={`risk-badge ${riskColors[row.risk]}`}>
                      {row.risk}
                    </span>
                  </td>
                  <td>{row.date}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="action-btn" title="View">
                        👁️
                      </button>
                      <button className="action-btn" title="Edit">
                        ✏️
                      </button>
                      <button className="action-btn" title="Delete">
                        🗑️
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="canvas-footer">
          <div className="pagination">
            <button className="page-btn">←</button>
            <span className="page-info">Page 1 of 5</span>
            <button className="page-btn">→</button>
          </div>
          
          {selectedRows.length > 0 && (
            <motion.div 
              className="bulk-actions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="selection-count">{selectedRows.length} selected</span>
              <button className="bulk-btn">Export Selected</button>
              <button className="bulk-btn">Bulk Edit</button>
              <button className="bulk-btn danger">Delete</button>
            </motion.div>
          )}
        </div>
      </GlassCard>

      {/* Floating Excel-like formula bar */}
      <motion.div 
        className="formula-bar"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <span className="formula-icon">ƒ</span>
        <input 
          type="text" 
          placeholder="Type to filter or use formulas like =SUM(value) or =FILTER(status:active)"
          className="formula-input"
        />
      </motion.div>
    </div>
  )
}