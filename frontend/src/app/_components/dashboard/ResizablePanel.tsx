'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GripHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

interface ResizablePanelProps {
  children: React.ReactNode;
  defaultHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  className?: string;
  title?: string;
  storageKey?: string;
}

export function ResizablePanel({
  children,
  defaultHeight = 350,
  minHeight = 150,
  maxHeight = 800,
  className,
  title,
  storageKey,
}: ResizablePanelProps) {
  const { isDark } = useTheme();
  const [height, setHeight] = useState(defaultHeight);
  const [isResizing, setIsResizing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startHeight = useRef(0);

  // Load saved height from localStorage on mount
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      const saved = localStorage.getItem(`panel-height-${storageKey}`);
      if (saved) {
        const savedHeight = parseInt(saved, 10);
        if (!isNaN(savedHeight) && savedHeight >= minHeight && savedHeight <= maxHeight) {
          setHeight(savedHeight);
        }
      }
    }
    setIsInitialized(true);
  }, [storageKey, minHeight, maxHeight]);

  // Save height to localStorage when it changes (after resizing)
  const saveHeight = useCallback((newHeight: number) => {
    if (storageKey && typeof window !== 'undefined') {
      localStorage.setItem(`panel-height-${storageKey}`, newHeight.toString());
    }
  }, [storageKey]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startY.current = e.clientY;
    startHeight.current = height;
  }, [height]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const deltaY = e.clientY - startY.current;
    const newHeight = Math.min(maxHeight, Math.max(minHeight, startHeight.current + deltaY));
    setHeight(newHeight);
  }, [isResizing, minHeight, maxHeight]);

  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      saveHeight(height);
    }
  }, [isResizing, height, saveHeight]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Don't render until initialized to prevent flash of default height
  if (!isInitialized) {
    return null;
  }

  return (
    <div
      ref={panelRef}
      className={cn(
        "relative border bg-white transition-colors duration-300",
        isDark ? "border-terminal-border bg-terminal-panel" : "border-ghost-300",
        className
      )}
    >
      {/* Header */}
      {title && (
        <div className={cn(
          "border-b p-3 flex items-center justify-between",
          isDark ? "bg-terminal-surface border-terminal-border" : "bg-terminal-surface border-ghost-300"
        )}>
          <h3 className="font-mono text-xs text-white uppercase font-semibold">{title}</h3>
        </div>
      )}

      {/* Content - hidden scrollbar */}
      <div
        className="overflow-hidden"
        style={{
          height: title ? height : height + 48,
        }}
      >
        <div className="h-full overflow-y-auto scrollbar-hide">
          {children}
        </div>
      </div>

      {/* Resize Handle */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-3 flex items-center justify-center cursor-row-resize group transition-colors",
          isDark
            ? "bg-terminal-surface hover:bg-terminal-hover border-t border-terminal-border"
            : "bg-ghost-100 hover:bg-ghost-200 border-t border-ghost-300",
          isResizing && (isDark ? "bg-terminal-hover" : "bg-ghost-200")
        )}
        onMouseDown={handleMouseDown}
      >
        <GripHorizontal
          className={cn(
            "w-4 h-4 transition-colors",
            isDark ? "text-ghost-500 group-hover:text-ghost-300" : "text-ghost-400 group-hover:text-ghost-600",
            isResizing && (isDark ? "text-purple-400" : "text-purple-600")
          )}
        />
      </div>
    </div>
  );
}

export default ResizablePanel;
