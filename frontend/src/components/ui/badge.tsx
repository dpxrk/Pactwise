"use client"

import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-purple-900 text-white shadow-luxury hover:bg-purple-800 hover:shadow-card-hover hover:scale-105",
        secondary:
          "bg-purple-500 text-white shadow-luxury hover:bg-purple-600 hover:scale-105",
        outline:
          "text-purple-900 border-2 border-purple-900 bg-transparent hover:bg-purple-50 hover:scale-105",
        ghost:
          "text-ghost-700 bg-ghost-100 hover:bg-ghost-200 hover:text-ghost-900 hover:scale-105",
        success:
          "bg-success-100 text-success-800 border border-success-200 hover:bg-success-200 hover:scale-105",
        warning:
          "bg-warning-100 text-warning-800 border border-warning-200 hover:bg-warning-200 hover:scale-105",
        error:
          "bg-error-100 text-error-800 border border-error-200 hover:bg-error-200 hover:scale-105",
        premium:
          "bg-gradient-to-r from-purple-900 to-purple-700 text-white shadow-card-hover border border-purple-700 hover:shadow-glow-sm hover:scale-105",
        terminal:
          "bg-terminal-panel text-text-primary border border-terminal-border font-jetbrains text-[10px] uppercase tracking-wider hover:border-terminal-border-purple hover:shadow-glow-sm",
      },
      size: {
        default: "px-2.5 py-1 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  pulse?: boolean;
  dot?: boolean;
}

function Badge({ className, variant, size, pulse, dot, children, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        badgeVariants({ variant, size }),
        pulse && "animate-pulse",
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "size-1.5 rounded-full",
            variant === "success" && "bg-success-500 animate-pulse",
            variant === "warning" && "bg-warning-500 animate-pulse",
            variant === "error" && "bg-error-500 animate-pulse",
            (!variant || variant === "default" || variant === "premium") && "bg-white animate-pulse",
            variant === "secondary" && "bg-white animate-pulse",
            variant === "terminal" && "bg-purple-500 animate-pulse"
          )}
        />
      )}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }