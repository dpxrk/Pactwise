import React from "react";
import { cn } from "@/lib/utils";

type SpinnerSize = "sm" | "default" | "lg" | "xl";
type SpinnerVariant = "default" | "simple" | "dots" | "pulse";

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  className?: string;
  text?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: "w-4 h-4",
  default: "w-8 h-8",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
};

const textSizeClasses: Record<SpinnerSize, string> = {
  sm: "text-xs",
  default: "text-sm",
  lg: "text-base",
  xl: "text-lg",
};

export const LoadingSpinner = ({
  size = "default",
  variant = "default",
  className,
  text,
}: LoadingSpinnerProps) => {
  const renderSpinner = () => {
    switch (variant) {
      case "simple":
        return (
          <div
            className={cn(
              "border-t-2 border-gold rounded-full animate-spin",
              sizeClasses[size],
              className
            )}
          />
        );

      case "dots":
        return (
          <div className="flex space-x-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  "rounded-full bg-gold animate-pulse",
                  size === "sm" && "w-1 h-1",
                  size === "default" && "w-2 h-2",
                  size === "lg" && "w-3 h-3",
                  size === "xl" && "w-4 h-4",
                  `animation-delay-${i * 200}`
                )}
              />
            ))}
          </div>
        );

      case "pulse":
        return (
          <div className={cn("relative", sizeClasses[size])}>
            <div className="absolute inset-0 rounded-full bg-gold/20 animate-ping" />
            <div className="absolute inset-0 rounded-full bg-gold/40" />
          </div>
        );

      default:
        return (
          <div
            className={cn(
              "border-4 border-t-gold border-r-gold/30 border-b-gold/10 border-l-gold/50 rounded-full animate-spin",
              sizeClasses[size],
              className
            )}
          />
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      {renderSpinner()}
      {text && (
        <p
          className={cn(
            "text-muted-foreground font-sans",
            textSizeClasses[size]
          )}
        >
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
