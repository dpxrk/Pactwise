"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { useCardAnimation } from "@/hooks/useAnimations"

function Card({ 
  className, 
  animated = true,
  ...props 
}: React.ComponentProps<"div"> & { animated?: boolean }) {
  const { elementRef, isVisible, isHovered, hoverProps } = useCardAnimation();
  
  return (
    <div
      ref={elementRef as React.Ref<HTMLDivElement>}
      data-slot="card"
      className={cn(
        "glass-card text-card-foreground flex flex-col gap-6 relative",
        "transition-all duration-300 ease-out group",
        animated && isVisible && "animate-fade-in-up",
        animated && "hover:-translate-y-1 hover:shadow-depth hover:border-white/10",
        "before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-br before:from-teal-500/5 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
        className
      )}
      {...(animated ? hoverProps : {})}
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
        "leading-none font-semibold text-lg",
        "group-hover:text-primary transition-colors duration-200 ease-out",
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
