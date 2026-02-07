"use client"

import * as React from "react"

import { useCardAnimation } from "@/hooks/useAnimations"
import { cn } from "@/lib/utils"

function Card({
  className,
  animated = false, // Disable animations by default to prevent hydration issues
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & {
  animated?: boolean;
  variant?: "default" | "premium" | "terminal" | "ghost";
}) {
  const [mounted, setMounted] = React.useState(false);
  const { elementRef, isVisible, hoverProps } = useCardAnimation();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Only apply animation classes and props after mounting
  const shouldAnimate = animated && mounted;

  const variantClasses = {
    default: "bg-white border border-ghost-300",
    premium: "bg-white border border-purple-200",
    terminal: "bg-terminal-panel border border-terminal-border data-card",
    ghost: "bg-ghost-50/50 border border-ghost-200 backdrop-blur-sm"
  };

  return (
    <div
      ref={elementRef as React.Ref<HTMLDivElement>}
      data-slot="card"
      className={cn(
        "text-card-foreground flex flex-col gap-6 relative p-6",
        "transition-all duration-300 ease-out group overflow-hidden",
        variantClasses[variant],
        shouldAnimate && "hover:border-purple-300",
        shouldAnimate && isVisible && "animate-fade-in-up",
        variant === "terminal" && "hover:border-terminal-border-purple",
        className
      )}
      {...(shouldAnimate ? hoverProps : {})}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1.5 px-6", className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "leading-none font-display font-bold text-xl tracking-tight",
        "group-hover:text-purple-900 transition-colors duration-200 ease-out",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6", className)}
      {...props}
    />
  )
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
