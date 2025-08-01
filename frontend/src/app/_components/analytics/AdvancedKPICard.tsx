'use client'

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  MoreVertical,
  Target,
  AlertTriangle,
  CheckCircle,
  Info,
  Maximize2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface KPIData {
  id: string;
  title: string;
  value: number;
  previousValue?: number;
  target?: number;
  unit?: string;
  format?: "number" | "currency" | "percentage";
  trend?: {
    direction: "up" | "down" | "stable";
    percentage: number;
    period: string;
  };
  status?: "good" | "warning" | "critical" | "neutral";
  description?: string;
  lastUpdated?: string;
  drillDownData?: Array<Record<string, unknown>>;
}

interface AdvancedKPICardProps {
  data: KPIData;
  onDrillDown?: (data: KPIData) => void;
  onRefresh?: (id: string) => void;
  loading?: boolean;
  className?: string;
  compact?: boolean;
}

export const AdvancedKPICard: React.FC<AdvancedKPICardProps> = ({
  data,
  onDrillDown,
  onRefresh,
  loading = false,
  className,
  compact = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const formatValue = (value: number, format?: string, unit?: string) => {
    let formatted = "";
    
    switch (format) {
      case "currency":
        formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
        break;
      case "percentage":
        formatted = `${value.toFixed(1)}%`;
        break;
      default:
        formatted = value.toLocaleString();
    }
    
    if (unit && format !== "currency" && format !== "percentage") {
      formatted += ` ${unit}`;
    }
    
    return formatted;
  };

  const getTrendIcon = () => {
    if (!data.trend) return null;
    
    switch (data.trend.direction) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = () => {
    if (!data.trend) return "text-gray-600";
    
    switch (data.trend.direction) {
      case "up":
        return "text-green-600";
      case "down":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusIcon = () => {
    switch (data.status) {
      case "good":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusColor = () => {
    switch (data.status) {
      case "good":
        return "border-green-200 bg-green-50/50";
      case "warning":
        return "border-yellow-200 bg-yellow-50/50";
      case "critical":
        return "border-red-200 bg-red-50/50";
      default:
        return "border-gray-200";
    }
  };

  const getProgressValue = () => {
    if (!data.target) return undefined;
    return Math.min((data.value / data.target) * 100, 100);
  };

  const getProgressColor = () => {
    const progress = getProgressValue();
    if (!progress) return "";
    
    if (progress >= 90) return "bg-green-600";
    if (progress >= 70) return "bg-yellow-600";
    return "bg-red-600";
  };

  if (compact) {
    return (
      <Card 
        className={cn(
          "cursor-pointer transition-all duration-300 ease-out hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 group",
          getStatusColor(),
          className
        )}
        onClick={() => onDrillDown?.(data)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                {data.title}
              </p>
              <div className="flex items-center space-x-2">
                <p className="text-xl font-bold">
                  {loading ? (
                    <div className="animate-pulse bg-gray-200 h-6 w-16 rounded" />
                  ) : (
                    formatValue(data.value, data.format, data.unit)
                  )}
                </p>
                {data.trend && (
                  <div className="flex items-center space-x-1">
                    {getTrendIcon()}
                    <span className={cn("text-sm font-medium", getTrendColor())}>
                      {data.trend.percentage.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end space-y-2">
              {getStatusIcon()}
              {isHovered && onDrillDown && (
                <Maximize2 className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        "transition-all duration-300 ease-out hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 group",
        getStatusColor(),
        onDrillDown && "cursor-pointer",
        className
      )}
      onClick={() => onDrillDown?.(data)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center space-x-2 group-hover:text-primary transition-colors duration-300">
            <span>{data.title}</span>
            <span className="group-hover:scale-110 transition-transform duration-300">
              {getStatusIcon()}
            </span>
          </CardTitle>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onDrillDown && (
                <DropdownMenuItem onClick={() => onDrillDown(data)}>
                  <Maximize2 className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
              )}
              {onRefresh && (
                <DropdownMenuItem onClick={() => onRefresh(data.id)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Value */}
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <p className="text-3xl font-bold">
              {loading ? (
                <div className="animate-pulse bg-gray-200 h-8 w-24 rounded" />
              ) : (
                formatValue(data.value, data.format, data.unit)
              )}
            </p>
            
            {data.trend && (
              <Badge variant="outline" className="flex items-center space-x-1">
                {getTrendIcon()}
                <span className={getTrendColor()}>
                  {data.trend.percentage.toFixed(1)}%
                </span>
                <span className="text-muted-foreground text-xs">
                  {data.trend.period}
                </span>
              </Badge>
            )}
          </div>

          {data.description && (
            <p className="text-sm text-muted-foreground">
              {data.description}
            </p>
          )}
        </div>

        {/* Target Progress */}
        {data.target && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Progress to Target</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatValue(data.target, data.format, data.unit)}
              </span>
            </div>
            <div className="space-y-1">
              <Progress 
                value={getProgressValue()} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                {getProgressValue()?.toFixed(1)}% of target achieved
              </p>
            </div>
          </div>
        )}

        {/* Previous Value Comparison */}
        {data.previousValue !== undefined && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Previous:</span>
            <span className="font-medium">
              {formatValue(data.previousValue, data.format, data.unit)}
            </span>
          </div>
        )}

        {/* Last Updated */}
        {data.lastUpdated && (
          <div className="text-xs text-muted-foreground">
            Updated {new Date(data.lastUpdated).toLocaleString()}
          </div>
        )}

        {/* Drill Down Indicator */}
        {onDrillDown && data.drillDownData && (
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">
              {data.drillDownData.length} items available
            </span>
            <Maximize2 className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default React.memo(AdvancedKPICard);