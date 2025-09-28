'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DraggableSectionProps {
  id: string;
  children: React.ReactNode;
  onRemove?: (id: string) => void;
  className?: string;
}

export const DraggableSection: React.FC<DraggableSectionProps> = ({
  id,
  children,
  onRemove,
  className = '',
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${className}`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing bg-white/90 backdrop-blur-sm rounded-lg p-1.5 shadow-sm border border-slate-200"
      >
        <GripVertical className="h-4 w-4 text-slate-600" />
      </div>

      {/* Remove Button */}
      {onRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-slate-200 hover:bg-red-50 hover:border-red-200"
          onClick={() => onRemove(id)}
        >
          <X className="h-4 w-4 text-slate-600 hover:text-red-600" />
        </Button>
      )}

      {children}
    </div>
  );
};