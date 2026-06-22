import {
  AtSign,
  Bot,
  Globe,
  MessageCircle,
  Upload,
  UserPen,
  Users,
  Webhook,
  CircleDashed,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Fluuy Design System — OriginBadge.
 *
 * Visualizes WHERE a record came from. Origin is filled automatically by the
 * system (it is never edited in forms), so this badge is the single read-only
 * surface for it across every CRUD list and detail screen. Each origin gets a
 * distinct icon + color so AI-created, manually-created and site-captured
 * records are distinguishable at a glance.
 *
 * `origin` accepts the raw `source` value persisted on the record (the various
 * `*_SOURCES` enums) and is normalized to a canonical category. Unknown values
 * fall back to a neutral "Outro" badge instead of throwing.
 */
export type OriginCategory =
  | "ai"
  | "manual"
  | "website"
  | "whatsapp"
  | "instagram"
  | "referral"
  | "import"
  | "api"
  | "other";

type OriginConfig = {
  label: string;
  Icon: LucideIcon;
  /** Soft background + readable foreground, kept within the design language. */
  className: string;
};

const ORIGIN_CONFIG: Record<OriginCategory, OriginConfig> = {
  ai: {
    label: "Agente IA",
    Icon: Bot,
    className:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-300",
  },
  manual: {
    label: "Manual",
    Icon: UserPen,
    className:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-300",
  },
  website: {
    label: "Site",
    Icon: Globe,
    className:
      "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900/50 dark:bg-teal-950/40 dark:text-teal-300",
  },
  whatsapp: {
    label: "WhatsApp",
    Icon: MessageCircle,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  instagram: {
    label: "Instagram",
    Icon: AtSign,
    className:
      "border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-900/50 dark:bg-pink-950/40 dark:text-pink-300",
  },
  referral: {
    label: "Indicação",
    Icon: Users,
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300",
  },
  import: {
    label: "Importação",
    Icon: Upload,
    className:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300",
  },
  api: {
    label: "API",
    Icon: Webhook,
    className:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300",
  },
  other: {
    label: "Outro",
    Icon: CircleDashed,
    className:
      "border-border bg-muted text-muted-foreground",
  },
};

/**
 * Normalizes a raw `source` value (across the customer/order/appointment enums)
 * into a canonical {@link OriginCategory}. Synonyms map onto the three primary
 * origins the product cares about: AI agent, manual/user and site.
 */
export function resolveOrigin(source: string | null | undefined): OriginCategory {
  if (!source) return "other";
  const value = source.toLowerCase();
  switch (value) {
    case "ai":
    case "agent":
    case "ai_agent":
      return "ai";
    case "manual":
    case "user":
    case "panel":
      return "manual";
    case "website":
    case "site":
    case "web":
      return "website";
    case "whatsapp":
      return "whatsapp";
    case "instagram":
      return "instagram";
    case "referral":
      return "referral";
    case "import":
      return "import";
    case "api":
      return "api";
    default:
      return "other";
  }
}

export function originLabel(source: string | null | undefined): string {
  return ORIGIN_CONFIG[resolveOrigin(source)].label;
}

export function OriginBadge({
  origin,
  className,
}: {
  /** Raw `source` value persisted on the record, or a canonical category. */
  origin: string | null | undefined;
  className?: string;
}) {
  const category = resolveOrigin(origin);
  const { label, Icon, className: tone } = ORIGIN_CONFIG[category];
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center gap-1 rounded-4xl border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        tone,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {label}
    </span>
  );
}
