import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Fluuy Design System — Button.
 * Variants map to a USAGE CONTEXT, not aesthetics:
 * - brand: primary backend actions (save/create/send/generate) — one per context
 * - default: general UI actions (export/import/open/continue/action menus)
 * - secondary: supporting actions (back/cancel/skip)
 * - outline: low-emphasis alternative on filled surfaces (filter/sort/configure)
 * - ghost: tertiary + icon buttons in dense areas (close/more/row actions)
 * - link: inline navigation in text ("learn more", "forgot password")
 * - destructive: irreversible actions (delete/block) — always confirm
 * All radius 2xl, weight 600, press scale, no glow. Icon-only buttons must pass
 * `tooltip` (sets the accessible label + a hover tooltip).
 */
const buttonVariants = cva(
  cn(
    "inline-flex shrink-0 items-center justify-center gap-[7px] rounded-2xl border border-transparent font-semibold whitespace-nowrap transition-[background-color,transform,border-color] outline-none select-none",
    "focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98] disabled:cursor-not-allowed",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:[stroke-width:2.2] [&_svg:not([class*='size-'])]:size-[19px]",
  ),
  {
    variants: {
      variant: {
        brand:
          "text-[var(--lime-200)] bg-[var(--neutral-900)] hover:bg-[var(--neutral-800)] focus-visible:ring-accent/40",
        default:
          "text-[var(--neutral-900)] bg-[var(--lime-300)] hover:bg-[var(--lime-300)]",
        secondary:
          "bg-[var(--neutral-100)] text-foreground hover:bg-[var(--neutral-200)]",
        outline:
          "border-border bg-transparent text-foreground hover:bg-[var(--neutral-100)] aria-expanded:bg-[var(--neutral-100)]",
        ghost:
          "bg-transparent text-foreground hover:bg-[var(--neutral-100)] aria-expanded:bg-[var(--neutral-100)]",
        link: "bg-transparent text-foreground underline underline-offset-[3px]",
        destructive:
          "border-destructive/40 bg-destructive/12 text-destructive hover:border-destructive hover:bg-destructive hover:text-white",
      },
      size: {
        default: "h-[50px] px-[1.125rem] text-sm",
        sm: "h-9 gap-1.5 px-3.5 text-sm",
        lg: "h-[56px] px-5 text-base",
        icon: "size-[50px] px-0 [&_svg:not([class*='size-'])]:size-5",
        "icon-sm": "size-9 [&_svg:not([class*='size-'])]:size-[18px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

/** Ring spinner — the ring uses the current text color (top brighter). */
function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-[15px] shrink-0 animate-spin rounded-full border-2 border-current/25 border-t-current",
        className,
      )}
    />
  );
}

function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  tooltip,
  disabled,
  children,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
    /** Hover tooltip + accessible label — required for icon-only buttons. */
    tooltip?: string;
  }) {
  const btn = (
    <ButtonPrimitive
      data-slot="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-label={tooltip ?? props["aria-label"]}
      className={cn(
        buttonVariants({ variant, size }),
        disabled && !loading && "opacity-50",
        className,
      )}
      {...props}
    >
      {loading ? (
        <>
          <Spinner />
          Carregando…
        </>
      ) : (
        children
      )}
    </ButtonPrimitive>
  );

  if (!tooltip) return btn;

  return (
    <Tooltip>
      <TooltipTrigger render={btn} />
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export { Button, buttonVariants };
