import type { VariantProps } from "class-variance-authority";

import type { badgeVariants } from "@/components/ui/badge";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  requested: "Solicitado",
  pending_confirmation: "Aguardando confirmação",
  confirmed: "Confirmado",
  in_progress: "Em andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
  rescheduled: "Reagendado",
};

export const MODALITY_LABELS: Record<string, string> = {
  at_location: "No local",
  at_home: "Em domicílio",
  online: "Online",
};

export const RESPONSIBLE_LABELS: Record<string, string> = {
  professional: "Profissional",
  tenant: "Equipe / empresa",
};

export const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  whatsapp: "WhatsApp",
  order: "Pedido",
  ai: "IA",
  api: "API",
  other: "Outro",
};

export const REMINDER_CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
  sms: "SMS",
  internal: "Interno",
};

export function appointmentStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "completed":
      return "success";
    case "confirmed":
    case "in_progress":
      return "brand";
    case "cancelled":
    case "no_show":
      return "destructive";
    case "rescheduled":
      return "secondary";
    default:
      return "warning";
  }
}

/** Calendar chip colour classes per status (Liquid Glass, no glow). */
export const STATUS_CHIP: Record<string, string> = {
  requested: "bg-amber-100 text-amber-900 border-amber-200",
  pending_confirmation: "bg-amber-100 text-amber-900 border-amber-200",
  confirmed: "bg-(--lime-100) text-(--neutral-800) border-(--lime-300)",
  in_progress: "bg-sky-100 text-sky-900 border-sky-200",
  completed: "bg-emerald-100 text-emerald-900 border-emerald-200",
  cancelled: "bg-zinc-100 text-zinc-500 border-zinc-200 line-through",
  no_show: "bg-red-100 text-red-900 border-red-200",
  rescheduled: "bg-zinc-100 text-zinc-500 border-zinc-200",
};
