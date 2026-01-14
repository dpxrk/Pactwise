'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Eye,
  EyeOff,
  Download,
  Grid3x3,
  Type,
  Layers,
  Palette,
  ChevronDown,
  X,
  Check,
  BarChart3,
  LineChart,
  AreaChart,
  PieChart,
  Box
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { pactwiseChartTheme } from './chartTheme';

export interface SeriesConfig {
  key: string;
  name: string;
  color: string;
  visible: boolean;
}

export interface ChartControlConfig {
  showGrid?: boolean;
  showLabels?: boolean;
  showLegend?: boolean;
  enable3D?: boolean;
  chartType?: 'line' | 'bar' | 'area' | 'pie';
}

interface ChartControlsProps {
  series: SeriesConfig[];
  onSeriesToggle: (key: string, visible: boolean) => void;
  config: ChartControlConfig;
  onConfigChange: (config: Partial<ChartControlConfig>) => void;
  onExport?: () => void;
  position?: 'top-right' | 'top-left' | 'floating';
  className?: string;
}

const chartTypeIcons = {
  line: LineChart,
  bar: BarChart3,
  area: AreaChart,
  pie: PieChart
};

const colorPresets = [
  '#059669', // green
  '#DC2626', // red
  '#111827', // gray-900
  '#9e829c', // mountbatten pink
  '#291528', // dark purple
  '#0EA5E9', // blue
  '#D97706', // amber
  '#8B5CF6', // violet
];

export const ChartControls: React.FC<ChartControlsProps> = ({
  series,
  onSeriesToggle,
  config,
  onConfigChange,
  onExport,
  position = 'top-right',
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);
  const [selectedColorSeries, setSelectedColorSeries] = useState<string | null>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  
  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (controlsRef.current && !controlsRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedColorSeries(null);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [isOpen]);
  
  const positionClasses = {
    'top-right': 'top-2 right-2',
    'top-left': 'top-2 left-2',
    'floating': 'top-1/2 right-4 -translate-y-1/2'
  };
  
  return (
    <div 
      ref={controlsRef}
      className={cn(
        'absolute z-20',
        positionClasses[position],
        className
      )}
    >
      {/* Trigger Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              variant="secondary"
              size="icon"
              className={cn(
                "h-9 w-9",
                "bg-white/95 backdrop-blur-md hover:bg-white",
                "border border-slate-200/80 hover:border-slate-300",
                "shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.12)]",
                "transition-all duration-200"
              )}
              onClick={() => setIsOpen(true)}
            >
              <Settings className="h-4 w-4 text-slate-600" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Control Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "bg-white/98 backdrop-blur-xl rounded-xl",
              "shadow-[0_20px_60px_-10px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.05)]",
              "border border-slate-200/60",
              "min-w-[300px] p-5"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-5 bg-gradient-to-b from-blue-600 to-violet-600 rounded-full" />
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Chart Options</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-slate-100"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-3.5 w-3.5 text-slate-500" />
              </Button>
            </div>
            
            <Separator className="mb-4 bg-slate-200/60" />
            
            {/* Data Series Section */}
            <div className="space-y-3 mb-5">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Data Series
              </Label>
              <div className="space-y-1">
                {series.map((s) => (
                  <div
                    key={s.key}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-md transition-colors",
                      "hover:bg-gray-50",
                      hoveredSeries === s.key && "bg-gray-50"
                    )}
                    onMouseEnter={() => setHoveredSeries(s.key)}
                    onMouseLeave={() => setHoveredSeries(null)}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <button
                        onClick={() => onSeriesToggle(s.key, !s.visible)}
                        className="flex items-center gap-2 flex-1"
                      >
                        <div className="relative">
                          <div 
                            className={cn(
                              "w-4 h-4 rounded border-2 transition-all",
                              s.visible 
                                ? "bg-white border-current" 
                                : "bg-gray-100 border-gray-300"
                            )}
                            style={{ 
                              borderColor: s.visible ? s.color : undefined 
                            }}
                          >
                            {s.visible && (
                              <Check 
                                className="h-3 w-3 absolute top-0.5 left-0.5" 
                                style={{ color: s.color }}
                              />
                            )}
                          </div>
                        </div>
                        <span className={cn(
                          "text-sm transition-opacity",
                          !s.visible && "opacity-50"
                        )}>
                          {s.name}
                        </span>
                      </button>
                      
                      {/* Color Picker */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className={cn(
                              "w-5 h-5 rounded border-2 border-gray-300",
                              "hover:border-gray-400 transition-colors"
                            )}
                            style={{ backgroundColor: s.color }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedColorSeries(s.key);
                            }}
                          />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="p-2">
                          <div className="grid grid-cols-4 gap-1">
                            {colorPresets.map((color) => (
                              <button
                                key={color}
                                className="w-7 h-7 rounded hover:scale-110 transition-transform"
                                style={{ backgroundColor: color }}
                                onClick={() => {
                                  // You would update the series color here
                                }}
                              />
                            ))}
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    {/* Visibility Toggle */}
                    <button
                      onClick={() => onSeriesToggle(s.key, !s.visible)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {s.visible ? (
                        <Eye className="h-3 w-3 text-gray-500" />
                      ) : (
                        <EyeOff className="h-3 w-3 text-gray-400" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            <Separator className="mb-3" />
            
            {/* Chart Type Selector */}
            {config.chartType && (
              <>
                <div className="mb-4">
                  <Label className="text-xs font-medium text-gray-700 uppercase tracking-wider mb-2 block">
                    Chart Type
                  </Label>
                  <div className="grid grid-cols-4 gap-1">
                    {(['line', 'bar', 'area', 'pie'] as const).map((type) => {
                      const Icon = chartTypeIcons[type];
                      return (
                        <button
                          key={type}
                          onClick={() => onConfigChange({ chartType: type })}
                          className={cn(
                            "p-2 rounded-md transition-all",
                            "hover:bg-gray-100",
                            config.chartType === type 
                              ? "bg-gray-900 text-white hover:bg-gray-800" 
                              : "bg-white border border-gray-200"
                          )}
                        >
                          <Icon className="h-4 w-4 mx-auto" />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Separator className="mb-3" />
              </>
            )}
            
            {/* Display Options */}
            <div className="space-y-3 mb-5">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Display Options
              </Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Grid3x3 className="h-3 w-3 text-gray-500" />
                    <Label htmlFor="grid" className="text-sm cursor-pointer">Grid</Label>
                  </div>
                  <Switch
                    id="grid"
                    checked={config.showGrid}
                    onCheckedChange={(showGrid) => onConfigChange({ showGrid })}
                    className="scale-75"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Type className="h-3 w-3 text-gray-500" />
                    <Label htmlFor="labels" className="text-sm cursor-pointer">Labels</Label>
                  </div>
                  <Switch
                    id="labels"
                    checked={config.showLabels}
                    onCheckedChange={(showLabels) => onConfigChange({ showLabels })}
                    className="scale-75"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-3 w-3 text-gray-500" />
                    <Label htmlFor="legend" className="text-sm cursor-pointer">Legend</Label>
                  </div>
                  <Switch
                    id="legend"
                    checked={config.showLegend}
                    onCheckedChange={(showLegend) => onConfigChange({ showLegend })}
                    className="scale-75"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Box className="h-3 w-3 text-gray-500" />
                    <Label htmlFor="3d" className="text-sm cursor-pointer">3D Effect</Label>
                  </div>
                  <Switch
                    id="3d"
                    checked={config.enable3D}
                    onCheckedChange={(enable3D) => onConfigChange({ enable3D })}
                    className="scale-75"
                  />
                </div>
              </div>
            </div>
            
            {/* Actions */}
            {onExport && (
              <>
                <Separator className="mb-3" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onExport}
                  className="w-full"
                >
                  <Download className="h-3 w-3 mr-2" />
                  Export Chart
                </Button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChartControls;