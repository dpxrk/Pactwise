import { TrendingUp, TrendingDown } from "lucide-react";
import React from "react";

import { Card3D, AnimatedCounter } from "@/components/premium";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: number;
  description?: string;
  changeType?: "positive" | "negative" | "neutral";
}

export const MetricCard: React.FC<MetricCardProps> = React.memo(({
  title,
  value,
  icon: Icon,
  trend,
  description,
  changeType = "neutral",
}) => {
  const isNumeric = typeof value === 'number' || !isNaN(Number(value));
  
  return (
    <Card3D variant="glass" className="group">
      <div className="p-6">
        <div className="flex flex-row items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-[#3a3e3b] uppercase tracking-wider">{title}</h3>
          <div className={cn(
            "p-2 rounded-lg transition-all duration-300",
            "bg-gradient-to-br from-[#291528]/10 to-[#9e829c]/10",
            "group-hover:from-[#291528]/20 group-hover:to-[#9e829c]/20",
            "group-hover:scale-110"
          )}>
            {React.createElement(Icon as any, { className: "h-4 w-4 text-[#291528]" })}
          </div>
        </div>
        
        <div className="mb-3">
          {isNumeric ? (
            <div className="text-3xl font-bold font-display">
              <AnimatedCounter 
                value={Number(value)} 
                duration={1500}
                className="text-[#291528]"
              />
            </div>
          ) : (
            <div className="text-3xl font-bold font-display text-transparent bg-clip-text bg-gradient-to-r from-[#291528] to-[#9e829c]">
              {value}
            </div>
          )}
        </div>
        
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 text-sm font-medium",
              changeType === "positive" && "text-[#9e829c]",
              changeType === "negative" && "text-[#dc2626]",
              changeType === "neutral" && "text-gray-500"
            )}
          >
            {changeType === "positive" ? (
              <TrendingUp className="h-4 w-4" />
            ) : changeType === "negative" ? (
              <TrendingDown className="h-4 w-4" />
            ) : null}
            <span className="tabular-nums">
              {changeType !== "neutral" && (trend > 0 ? "+" : "")}{trend}%
            </span>
            <span className="text-gray-500 font-normal">vs last period</span>
          </div>
        )}
        
        {description && (
          <p className="text-xs text-[#3a3e3b]/70 mt-3 leading-relaxed">{description}</p>
        )}
        
        {/* Decorative element */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#9e829c]/20 to-transparent" />
      </div>
    </Card3D>
  );
});

MetricCard.displayName = 'MetricCard';
