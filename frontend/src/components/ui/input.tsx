import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full min-w-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 transition-all duration-200 outline-none",
        "hover:border-white/20 hover:bg-white/[0.07]",
        "focus:border-teal-400/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-teal-400/20 focus:ring-offset-1 focus:ring-offset-background",
        "file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-gray-300",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-red-400/50 aria-invalid:ring-red-400/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
