"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MetricCard } from "@/app/_components/common/MetricCard";
import { GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DraggableMetricCardProps {
  id: string;
  title: string;
  value: string | number;
  change?: number;
  trend?: "up" | "down";
  icon?: React.ElementType;
  description?: string;
  changeType?: "positive" | "negative" | "neutral";
  isDragging?: boolean;
  onRemove?: (id: string) => void;
}

export function DraggableMetricCard({
  id,
  title,
  value,
  change,
  trend,
  icon,
  description,
  changeType,
  isDragging,
  onRemove,
}: DraggableMetricCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isSortableDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group"
      {...attributes}
    >
      {/* Remove button */}
      {onRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
          onClick={() => onRemove(id)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      
      {/* Drag handle */}
      <div
        {...listeners}
        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-5 h-5 text-gray-400" />
      </div>
      <MetricCard
        title={title}
        value={value}
        icon={icon}
        trend={change}
        description={description}
        changeType={changeType}
      />
    </div>
  );
}