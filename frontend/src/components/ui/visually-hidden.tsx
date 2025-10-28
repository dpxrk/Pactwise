import * as React from "react"
import * as VisuallyHiddenPrimitive from "@radix-ui/react-visually-hidden"

/**
 * VisuallyHidden component
 *
 * Renders content that is visually hidden but remains accessible to screen readers.
 * Useful for providing accessible labels without visible text.
 *
 * @example
 * <VisuallyHidden>
 *   <DialogTitle>Search</DialogTitle>
 * </VisuallyHidden>
 */
const VisuallyHidden = VisuallyHiddenPrimitive.Root

export { VisuallyHidden }
