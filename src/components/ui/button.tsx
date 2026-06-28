import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Fluuy Design System — Button (spec: button-component-spec v2.0.0).
 *
 * Two combinable axes:
 *  1. `variant` — 7 named context shortcuts (each maps to a tone×appearance pair):
 *     - brand: PRIMARY backend actions (save/create/send/generate) — one per context
 *     - default: general UI actions (export/import/continue/action menus)
 *     - secondary: supporting actions (back/cancel/skip)
 *     - outline: low-emphasis alternative on filled surfaces (filter/sort/configure)
 *     - ghost: tertiary + icon buttons in dense areas (close/more/row actions)
 *     - link: inline navigation in text ("learn more", "forgot password")
 *     - destructive: irreversible actions (delete/block) — always confirm
 *  2. `tone` + `appearance` — semantic color (brand/neutral/info/success/warning/danger)
 *     × treatment (solid/soft/outline/ghost/link). Pass `tone` to opt into the matrix;
 *     it overrides `variant` so the two are not combined.
 *
 * All radius 2xl, weight 600, press scale, no glow. Neutral surfaces/hovers use
 * adaptive tokens (--secondary/--border) so they survive dark mode — never --neutral-100.
 * Icon-only buttons must pass `tooltip` (sets the accessible label + a hover tooltip).
 */

/**
 * tone × appearance matrix (6 tones × 5 treatments = 30 compound variants).
 * Class strings are written LITERALLY (named color tokens + `color-mix`/opacity
 * modifiers, matching the Badge pattern) so Tailwind's build scanner emits them —
 * never build these from interpolated values, or the utilities won't be generated.
 * Colored text on light surfaces is darkened via color-mix and flips to the raw
 * token in dark mode for contrast.
 */
type Tone = "brand" | "neutral" | "info" | "success" | "warning" | "danger";
type Appearance = "solid" | "soft" | "outline" | "ghost" | "link";

const toneCompounds: Array<{ tone: Tone; appearance: Appearance; class: string }> = [
  // brand (lime) — solid uses accent / accent-foreground tokens
  { tone: "brand", appearance: "solid", class: "border-transparent bg-accent text-accent-foreground hover:bg-[var(--lime-400)]" },
  { tone: "brand", appearance: "soft", class: "border-transparent bg-accent/16 text-[var(--lime-600)] hover:bg-accent/30" },
  { tone: "brand", appearance: "outline", class: "border-[color-mix(in_oklch,var(--accent),transparent_55%)] bg-transparent text-[var(--lime-600)] hover:bg-accent/16" },
  { tone: "brand", appearance: "ghost", class: "border-transparent bg-transparent text-[var(--lime-600)] hover:bg-accent/16" },
  { tone: "brand", appearance: "link", class: "border-transparent bg-transparent text-[var(--lime-600)] no-underline underline-offset-[3px] hover:underline" },
  // neutral — fully adaptive tokens
  { tone: "neutral", appearance: "solid", class: "border-transparent bg-[var(--neutral-900)] text-[var(--neutral-0)] hover:bg-[var(--neutral-800)]" },
  { tone: "neutral", appearance: "soft", class: "border-transparent bg-secondary text-secondary-foreground hover:bg-[var(--border)]" },
  { tone: "neutral", appearance: "outline", class: "border-border bg-transparent text-foreground hover:bg-secondary" },
  { tone: "neutral", appearance: "ghost", class: "border-transparent bg-transparent text-foreground hover:bg-secondary" },
  { tone: "neutral", appearance: "link", class: "border-transparent bg-transparent text-foreground no-underline underline-offset-[3px] hover:underline" },
  // info
  { tone: "info", appearance: "solid", class: "border-transparent bg-info text-white hover:bg-[color-mix(in_oklch,var(--info),black_12%)]" },
  { tone: "info", appearance: "soft", class: "border-transparent bg-info/14 text-[color-mix(in_oklch,var(--info),black_22%)] dark:text-info hover:bg-info/24" },
  { tone: "info", appearance: "outline", class: "border-info/40 bg-transparent text-[color-mix(in_oklch,var(--info),black_22%)] dark:text-info hover:bg-info/14" },
  { tone: "info", appearance: "ghost", class: "border-transparent bg-transparent text-[color-mix(in_oklch,var(--info),black_22%)] dark:text-info hover:bg-info/14" },
  { tone: "info", appearance: "link", class: "border-transparent bg-transparent text-[color-mix(in_oklch,var(--info),black_22%)] dark:text-info no-underline underline-offset-[3px] hover:underline" },
  // success
  { tone: "success", appearance: "solid", class: "border-transparent bg-success text-white hover:bg-[color-mix(in_oklch,var(--success),black_12%)]" },
  { tone: "success", appearance: "soft", class: "border-transparent bg-success/14 text-[color-mix(in_oklch,var(--success),black_22%)] dark:text-success hover:bg-success/24" },
  { tone: "success", appearance: "outline", class: "border-success/40 bg-transparent text-[color-mix(in_oklch,var(--success),black_22%)] dark:text-success hover:bg-success/14" },
  { tone: "success", appearance: "ghost", class: "border-transparent bg-transparent text-[color-mix(in_oklch,var(--success),black_22%)] dark:text-success hover:bg-success/14" },
  { tone: "success", appearance: "link", class: "border-transparent bg-transparent text-[color-mix(in_oklch,var(--success),black_22%)] dark:text-success no-underline underline-offset-[3px] hover:underline" },
  // warning — solid keeps dark text (light surface)
  { tone: "warning", appearance: "solid", class: "border-transparent bg-warning text-[var(--neutral-900)] hover:bg-[color-mix(in_oklch,var(--warning),black_10%)]" },
  { tone: "warning", appearance: "soft", class: "border-transparent bg-warning/18 text-[color-mix(in_oklch,var(--warning),black_22%)] dark:text-warning hover:bg-warning/28" },
  { tone: "warning", appearance: "outline", class: "border-warning/50 bg-transparent text-[color-mix(in_oklch,var(--warning),black_22%)] dark:text-warning hover:bg-warning/18" },
  { tone: "warning", appearance: "ghost", class: "border-transparent bg-transparent text-[color-mix(in_oklch,var(--warning),black_22%)] dark:text-warning hover:bg-warning/18" },
  { tone: "warning", appearance: "link", class: "border-transparent bg-transparent text-[color-mix(in_oklch,var(--warning),black_22%)] dark:text-warning no-underline underline-offset-[3px] hover:underline" },
  // danger — maps to the destructive token
  { tone: "danger", appearance: "solid", class: "border-transparent bg-destructive text-white hover:bg-[color-mix(in_oklch,var(--destructive),black_12%)]" },
  { tone: "danger", appearance: "soft", class: "border-transparent bg-destructive/12 text-destructive hover:bg-destructive/20" },
  { tone: "danger", appearance: "outline", class: "border-destructive/40 bg-transparent text-destructive hover:bg-destructive/12" },
  { tone: "danger", appearance: "ghost", class: "border-transparent bg-transparent text-destructive hover:bg-destructive/12" },
  { tone: "danger", appearance: "link", class: "border-transparent bg-transparent text-destructive no-underline underline-offset-[3px] hover:underline" },
];

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
          "text-[var(--neutral-900)] bg-[var(--lime-300)] hover:bg-[var(--lime-400)]",
        default:
          "border-[var(--neutral-700)] text-[var(--lime-300)] bg-[var(--neutral-900)] hover:bg-[var(--neutral-800)]",
        secondary:
          "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--border)]",
        outline:
          "border-border bg-transparent text-foreground hover:bg-[var(--secondary)] aria-expanded:bg-[var(--secondary)]",
        ghost:
          "bg-transparent text-foreground hover:bg-[var(--secondary)] aria-expanded:bg-[var(--secondary)]",
        link: "bg-transparent text-foreground no-underline underline-offset-[3px] hover:text-[var(--lime-600)] hover:underline",
        destructive:
          "border-destructive/40 bg-destructive/12 text-destructive hover:border-destructive hover:bg-destructive hover:text-white",
      },
      tone: {
        brand: "",
        neutral: "",
        info: "",
        success: "",
        warning: "",
        danger: "",
      },
      appearance: {
        solid: "",
        soft: "",
        outline: "",
        ghost: "",
        link: "",
      },
      size: {
        default: "h-[44px] px-[1.125rem] text-sm",
        sm: "h-[32px] gap-1.5 px-3.5 text-sm",
        lg: "h-[52px] px-5 text-base",
        icon: "size-[44px] px-0 [&_svg:not([class*='size-'])]:size-5",
        "icon-sm": "size-9 [&_svg:not([class*='size-'])]:size-[18px]",
      },
    },
    compoundVariants: toneCompounds,
    defaultVariants: {
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
  variant,
  tone,
  appearance,
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
  // `tone` opts into the color×treatment matrix and overrides `variant`.
  // Without it, fall back to the named variant (default: brand primary).
  const resolved = tone
    ? { tone, appearance: appearance ?? "solid" }
    : { variant: variant ?? "brand" };

  const btn = (
    <ButtonPrimitive
      data-slot="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-label={tooltip ?? props["aria-label"]}
      className={cn(
        buttonVariants({ ...resolved, size }),
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
