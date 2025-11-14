"use client"

import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-purple-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive group relative overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-purple-900 text-white shadow-luxury hover:bg-purple-800 hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700",
        destructive:
          "bg-gradient-to-r from-error-500 to-error-600 text-white shadow-luxury hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] focus-visible:ring-error/30",
        outline:
          "border-2 border-purple-900 bg-transparent hover:bg-purple-50 hover:border-purple-700 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] text-purple-900 shadow-sm",
        secondary:
          "bg-purple-500 text-white backdrop-blur-sm hover:bg-purple-600 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] shadow-luxury",
        ghost:
          "hover:bg-purple-50 hover:text-purple-900 active:scale-[0.97] text-ghost-700 hover:shadow-sm",
        link: "text-purple-900 underline-offset-4 hover:underline hover:text-purple-700 active:scale-[0.97]",
        premium:
          "bg-gradient-to-r from-purple-900 via-purple-800 to-purple-900 text-white shadow-card-hover hover:shadow-glow-lg hover:-translate-y-1 active:translate-y-0 active:scale-[0.97] before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-purple-500/20 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-500 border border-purple-700",
        terminal:
          "bg-terminal-panel text-text-primary border border-terminal-border hover:border-terminal-border-purple hover:shadow-glow-sm active:scale-[0.97] font-jetbrains text-xs tracking-wide uppercase",
      },
      size: {
        default: "h-10 px-5 py-2.5 has-[>svg]:px-4",
        sm: "h-8 rounded-md gap-1.5 px-3 text-xs has-[>svg]:px-2.5",
        lg: "h-12 rounded-lg px-8 text-base has-[>svg]:px-6",
        xl: "h-14 rounded-lg px-10 text-lg has-[>svg]:px-8",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean
    }
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }
