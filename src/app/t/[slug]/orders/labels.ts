import type { VariantProps } from "class-variance-authority";

import type { badgeVariants } from "@/components/ui/badge";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  pending_confirmation: "Aguardando confirmação",
  confirmed: "Confirmado",
  scheduled: "Agendado",
  in_progress: "Em andamento",
  ready: "Pronto",
  out_for_delivery: "Saiu para entrega",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export const ORDER_SOURCE_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  manual: "Manual",
  instagram: "Instagram",
  website: "Site",
  api: "API",
  other: "Outro",
};

export const ORDER_CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  panel: "Painel",
  api: "API",
  other: "Outro",
};

export const ORDER_FULFILLMENT_LABELS: Record<string, string> = {
  delivery: "Entrega",
  pickup: "Retirada",
  at_location: "No local",
  at_home: "Em domicílio",
  online: "Online",
};

export const ORDER_PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: "Pix",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  cash: "Dinheiro",
  bank_transfer: "Transferência",
  payment_link: "Link de pagamento",
  other: "Outro",
};

export const ORDER_PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  partial: "Parcial",
  refunded: "Reembolsado",
  cancelled: "Cancelado",
  failed: "Falhou",
};

export const ORDER_ITEM_TYPE_LABELS: Record<string, string> = {
  product: "Produto",
  service: "Serviço",
  offer_plan: "Plano",
  custom: "Avulso",
};

export function orderStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "completed":
      return "success";
    case "cancelled":
      return "destructive";
    case "draft":
    case "pending_confirmation":
      return "warning";
    default:
      return "brand";
  }
}

export function paymentStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "paid":
      return "success";
    case "partial":
      return "warning";
    case "refunded":
    case "cancelled":
    case "failed":
      return "destructive";
    default:
      return "secondary";
  }
}

export const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const fmtBRL = (v: string | number | null | undefined) =>
  v == null ? "—" : brl.format(typeof v === "number" ? v : Number(v));
