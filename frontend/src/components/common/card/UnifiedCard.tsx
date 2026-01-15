"use client";

import { TrendingUp, TrendingDown, Minus, MoreVertical, ChevronRight } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { Skeleton } from "../loading/UnifiedLoading";

export type CardVariant = "default" | "metric" | "kpi" | "feature" | "agent" | "compact";

interface BaseCardProps {
  variant?: CardVariant;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  bordered?: boolean;
  children?: React.ReactNode;
}

interface MetricCardProps extends BaseCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  subtitle?: string;
  loading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  trend,
  subtitle,
  loading = false,
  className,
  onClick,
  hoverable = !!onClick,
  bordered = true,
}) => {
  const getTrendIcon = () => {
    if (trend === "up") return <TrendingUp className="w-4 h-4" />;
    if (trend === "down") return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = () => {
    if (trend === "up") return "text-green-600";
    if (trend === "down") return "text-red-600";
    return "text-gray-500";
  };

  if (loading) {
    return (
      <Card className={cn("p-6", className)}>
        <Skeleton lines={3} />
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "relative overflow-hidden",
        bordered && "border border-gray-200",
        hoverable && "cursor-pointer hover:border-gray-900 transition-colors",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
          {icon && <div className="text-gray-400">{icon}</div>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          {(change !== undefined || changeLabel) && (
            <div className={cn("flex items-center gap-1 text-sm", getTrendColor())}>
              {getTrendIcon()}
              {change !== undefined && (
                <span className="font-medium">
                  {change > 0 ? "+" : ""}{change}%
                </span>
              )}
              {changeLabel && <span>{changeLabel}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface KPICardProps extends BaseCardProps {
  title: string;
  metrics: Array<{
    label: string;
    value: string | number;
    change?: number;
    trend?: "up" | "down" | "neutral";
  }>;
  actions?: Array<{
    label: string;
    onClick: () => void;
  }>;
  loading?: boolean;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  metrics,
  actions,
  loading = false,
  className,
  bordered = true,
}) => {
  if (loading) {
    return (
      <Card className={cn("p-6", className)}>
        <Skeleton lines={4} showTitle />
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        bordered && "border border-gray-200",
        className
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">{title}</CardTitle>
          {actions && actions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.map((action, index) => (
                  <DropdownMenuItem key={index} onClick={action.onClick}>
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metrics.map((metric, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{metric.label}</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">{metric.value}</span>
                {metric.change !== undefined && (
                  <span
                    className={cn(
                      "text-xs",
                      metric.trend === "up" && "text-green-600",
                      metric.trend === "down" && "text-red-600",
                      !metric.trend && "text-gray-500"
                    )}
                  >
                    {metric.change > 0 ? "+" : ""}{metric.change}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

interface FeatureCardProps extends BaseCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  badge?: string;
  image?: string;
  loading?: boolean;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon,
  action,
  badge,
  image,
  loading = false,
  className,
  onClick,
  hoverable = !!onClick,
  bordered = true,
}) => {
  if (loading) {
    return (
      <Card className={cn("p-6", className)}>
        <Skeleton lines={3} showTitle />
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "relative",
        bordered && "border border-gray-200",
        hoverable && "cursor-pointer hover:border-gray-900 transition-colors",
        className
      )}
      onClick={onClick}
    >
      {badge && (
        <div className="absolute top-4 right-4">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {badge}
          </span>
        </div>
      )}
      {image && (
        <div className="h-48 w-full bg-gray-100 border-b border-gray-200">
          <img src={image} alt={title} className="h-full w-full object-cover" />
        </div>
      )}
      <CardHeader>
        <div className="flex items-start gap-3">
          {icon && <div className="text-gray-600 mt-1">{icon}</div>}
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900">{title}</CardTitle>
            <CardDescription className="mt-1 text-gray-600">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      {action && (
        <CardFooter>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              action.onClick();
            }}
            variant="outline"
            className="border-gray-300 w-full"
          >
            {action.label}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

interface AgentCardProps extends BaseCardProps {
  name: string;
  role: string;
  status: "online" | "offline" | "busy";
  avatar?: string;
  metrics?: Array<{
    label: string;
    value: string | number;
  }>;
  actions?: React.ReactNode;
  loading?: boolean;
}

export const AgentCard: React.FC<AgentCardProps> = ({
  name,
  role,
  status,
  avatar,
  metrics,
  actions,
  loading = false,
  className,
  bordered = true,
}) => {
  const statusColors = {
    online: "bg-green-500",
    offline: "bg-gray-400",
    busy: "bg-amber-500",
  };

  if (loading) {
    return (
      <Card className={cn("p-6", className)}>
        <Skeleton lines={3} showAvatar />
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        bordered && "border border-gray-200",
        className
      )}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="relative">
            {avatar ? (
              <img src={avatar} alt={name} className="w-12 h-12 rounded-full" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-lg font-semibold text-gray-600">
                  {name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className={cn("absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white", statusColors[status])} />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base font-semibold text-gray-900">{name}</CardTitle>
            <CardDescription className="text-sm text-gray-600">{role}</CardDescription>
          </div>
        </div>
      </CardHeader>
      {metrics && metrics.length > 0 && (
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {metrics.map((metric, index) => (
              <div key={index}>
                <p className="text-xs text-gray-500">{metric.label}</p>
                <p className="text-sm font-semibold text-gray-900">{metric.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      )}
      {actions && <CardFooter>{actions}</CardFooter>}
    </Card>
  );
};

interface CompactCardProps extends BaseCardProps {
  title: string;
  subtitle?: string;
  rightContent?: React.ReactNode;
  leftIcon?: React.ReactNode;
  onClick?: () => void;
}

export const CompactCard: React.FC<CompactCardProps> = ({
  title,
  subtitle,
  rightContent,
  leftIcon,
  onClick,
  className,
  hoverable = !!onClick,
  bordered = true,
}) => {
  return (
    <Card
      className={cn(
        "p-4",
        bordered && "border border-gray-200",
        hoverable && "cursor-pointer hover:border-gray-900 transition-colors",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {leftIcon && <div className="text-gray-600">{leftIcon}</div>}
          <div>
            <p className="font-medium text-gray-900">{title}</p>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>
        {rightContent && <div>{rightContent}</div>}
      </div>
    </Card>
  );
};

interface CardGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export const CardGrid: React.FC<CardGridProps> = ({
  children,
  columns = 3,
  className,
}) => {
  const gridClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-6", gridClasses[columns], className)}>
      {children}
    </div>
  );
};

export default {
  MetricCard,
  KPICard,
  FeatureCard,
  AgentCard,
  CompactCard,
  CardGrid,
};