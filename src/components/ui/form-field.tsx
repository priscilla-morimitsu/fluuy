import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Fluuy Design System — FormField.
 * Wraps a control with a label, an optional hint and an error message (which
 * replaces the hint and turns destructive). Pass `htmlFor` matching the
 * control's id so the label is associated for assistive tech.
 */
function FormField({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  label?: React.ReactNode
  htmlFor?: string
  hint?: React.ReactNode
  error?: React.ReactNode
  required?: boolean
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)} {...props}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
          {label}
          {required && (
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

export { FormField }
