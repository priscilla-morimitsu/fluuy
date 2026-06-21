import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Fluuy Design System — ButtonGroup.
 * Related buttons joined into one contiguous block: outer corners rounded (2xl),
 * inner corners square, borders overlapped (-1px). Use for sequential/related
 * actions (Anterior / Próximo, − / +).
 */
function ButtonGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="button-group"
      role="group"
      className={cn(
        "isolate inline-flex",
        "[&>button]:rounded-none [&>button:first-child]:rounded-l-2xl [&>button:last-child]:rounded-r-2xl",
        "[&>button:not(:first-child)]:-ml-px [&>button:hover]:z-10 [&>button:focus-visible]:z-10",
        className
      )}
      {...props}
    />
  )
}

export { ButtonGroup }
