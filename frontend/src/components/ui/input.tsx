"use client"

import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex h-10 w-full min-w-0 rounded-lg px-4 py-2 text-sm transition-all duration-200 outline-none placeholder:text-ghost-500 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-white border-2 border-ghost-300 text-ghost-900 hover:border-ghost-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 focus:shadow-luxury",
        premium:
          "bg-white border-2 border-purple-200 text-ghost-900 shadow-luxury hover:border-purple-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 focus:shadow-card-hover",
        terminal:
          "bg-terminal-panel border border-terminal-border text-text-primary font-jetbrains text-xs hover:border-terminal-border-purple focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 focus:shadow-glow-sm",
        ghost:
          "bg-ghost-50 border-2 border-transparent text-ghost-900 hover:border-ghost-200 hover:bg-white focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10",
      },
      inputSize: {
        default: "h-10 px-4 text-sm",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-5 text-base",
      },
      validation: {
        none: "",
        success: "border-success-500 focus:border-success-600 focus:ring-success-500/20",
        warning: "border-warning-500 focus:border-warning-600 focus:ring-warning-500/20",
        error: "border-error-500 focus:border-error-600 focus:ring-error-500/20 aria-invalid:border-error-500",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "default",
      validation: "none",
    },
  }
)

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, inputSize, validation, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        data-slot="input"
        className={cn(
          inputVariants({ variant, inputSize, validation }),
          "file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ghost-700",
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }
