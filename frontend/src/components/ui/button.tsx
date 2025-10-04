"use client"

import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-300 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-cadet-gray/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive group relative overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-outer-space text-white shadow-sm hover:bg-outer-space-600 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
        destructive:
          "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border border-cadet-gray-300 bg-transparent hover:bg-cadet-gray-50 hover:border-cadet-gray-400 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] text-outer-space shadow-sm",
        secondary:
          "bg-pearl text-outer-space backdrop-blur-sm border border-pearl-600 hover:bg-pearl-600 hover:border-pearl-700 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] shadow-sm",
        ghost:
          "hover:bg-cadet-gray-50 hover:text-outer-space active:scale-[0.98] text-dim-gray",
        link: "text-outer-space underline-offset-4 hover:underline hover:text-outer-space-600 active:scale-[0.98]",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
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
