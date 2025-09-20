'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LegendItem {
  key: string;
  name: string;
  color: string;
  visible: boolean;
}

interface InteractiveLegendProps {
  items: LegendItem[];
  onItemClick: (key: string) => void;
  onItemDoubleClick?: (key: string) => void;
  position?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

export const InteractiveLegend: React.FC<InteractiveLegendProps> = ({
  items,
  onItemClick,
  onItemDoubleClick,
  position = 'right',
  className
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isolatedItem, setIsolatedItem] = useState<string | null>(null);
  
  const handleDoubleClick = (key: string) => {
    // Isolate this series (hide all others)
    if (isolatedItem === key) {
      // If already isolated, show all
      setIsolatedItem(null);
      items.forEach(item => {
        if (!item.visible && item.key !== key) {
          onItemClick(item.key);
        }
      });
    } else {
      // Isolate this item
      setIsolatedItem(key);
      items.forEach(item => {
        if (item.key !== key && item.visible) {
          onItemClick(item.key);
        } else if (item.key === key && !item.visible) {
          onItemClick(item.key);
        }
      });
    }
    
    onItemDoubleClick?.(key);
  };
  
  const layoutClasses = {
    top: 'flex-row justify-center',
    bottom: 'flex-row justify-center',
    left: 'flex-col items-start',
    right: 'flex-col items-start'
  };
  
  return (
    <div 
      className={cn(
        'flex gap-3 p-2',
        layoutClasses[position],
        className
      )}
    >
      {items.map((item, index) => (
        <motion.button
          key={item.key}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-md transition-all",
            "hover:bg-gray-100 select-none",
            !item.visible && "opacity-40",
            hoveredItem === item.key && "bg-gray-50",
            isolatedItem === item.key && "ring-2 ring-gray-300"
          )}
          onClick={() => onItemClick(item.key)}
          onDoubleClick={() => handleDoubleClick(item.key)}
          onMouseEnter={() => setHoveredItem(item.key)}
          onMouseLeave={() => setHoveredItem(null)}
          initial={{ opacity: 0, x: position === 'right' ? 20 : 0 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          title={`Click to toggle, double-click to isolate ${item.name}`}
        >
          {/* Color indicator */}
          <motion.div
            className={cn(
              "w-3 h-3 rounded-full border-2",
              item.visible ? "border-current" : "border-gray-300"
            )}
            style={{ 
              backgroundColor: item.visible ? item.color : 'transparent',
              borderColor: item.visible ? item.color : undefined
            }}
            animate={{
              scale: hoveredItem === item.key ? 1.2 : 1
            }}
          />
          
          {/* Label */}
          <span className={cn(
            "text-sm font-medium",
            !item.visible && "line-through"
          )}>
            {item.name}
          </span>
          
          {/* Eye icon on hover */}
          {hoveredItem === item.key && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              {item.visible ? (
                <Eye className="h-3 w-3 text-gray-500" />
              ) : (
                <EyeOff className="h-3 w-3 text-gray-400" />
              )}
            </motion.div>
          )}
        </motion.button>
      ))}
    </div>
  );
};

export default InteractiveLegend;