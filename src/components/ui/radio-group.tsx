import * as React from "react"

import { cn } from "@/lib/utils"

export type RadioOption = {
  value: string
  label: React.ReactNode
  disabled?: boolean
}

function normalize(opt: string | RadioOption): RadioOption {
  return typeof opt === "string" ? { value: opt, label: opt } : opt
}

/**
 * Fluuy Design System — RadioGroup.
 * Glass radio set. Controlled (`value` + `onChange`) or uncontrolled
 * (`defaultValue`, submits via native `name`). The selected dot uses lime
 * (accent); focus shows a solid ring (no glow).
 */
function RadioGroup({
  options,
  value,
  defaultValue,
  onChange,
  name,
  disabled,
  orientation = "vertical",
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "onChange" | "defaultValue"> & {
  options: (string | RadioOption)[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  name?: string
  disabled?: boolean
  orientation?: "vertical" | "horizontal"
}) {
  const controlled = value !== undefined
  return (
    <div
      role="radiogroup"
      className={cn(
        "flex gap-3",
        orientation === "vertical" ? "flex-col" : "flex-row flex-wrap",
        className
      )}
      {...props}
    >
      {options.map((opt) => {
        const o = normalize(opt)
        const isDisabled = disabled || o.disabled
        return (
          <label
            key={o.value}
            className={cn(
              "flex items-center gap-2 text-sm text-foreground",
              isDisabled ? "cursor-not-allowed opacity-55" : "cursor-pointer"
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              disabled={isDisabled}
              {...(controlled
                ? { checked: value === o.value, onChange: () => onChange?.(o.value) }
                : {
                    defaultChecked: defaultValue === o.value,
                    onChange: () => onChange?.(o.value),
                  })}
              className="peer sr-only"
            />
            <span
              className={cn(
                "relative grid size-4 shrink-0 place-items-center rounded-full border border-(--glass-border) bg-(--glass-bg) [backdrop-filter:var(--glass-blur)] [-webkit-backdrop-filter:var(--glass-blur)] transition-colors",
                "after:size-2 after:rounded-full after:bg-accent after:opacity-0 after:transition-opacity after:content-['']",
                "peer-checked:border-accent peer-checked:after:opacity-100",
                "peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50"
              )}
            />
            <span>{o.label}</span>
          </label>
        )
      })}
    </div>
  )
}

export { RadioGroup }
