import { z } from "zod";

export const CONVERSATION_STATUSES = ["open", "pending", "resolved", "archived", "blocked"] as const;
export type ConversationStatusValue = (typeof CONVERSATION_STATUSES)[number];

export const ASSIGNEE_TYPES = ["ai", "human", "paused", "unassigned"] as const;
export type AssigneeTypeValue = (typeof ASSIGNEE_TYPES)[number];

export const CONVERSATION_STATUS_LABELS: Record<ConversationStatusValue, string> = {
  open: "Aberta",
  pending: "Pendente",
  resolved: "Resolvida",
  archived: "Arquivada",
  blocked: "Bloqueada",
};

export const ASSIGNEE_TYPE_LABELS: Record<AssigneeTypeValue, string> = {
  ai: "IA",
  human: "Humano",
  paused: "Pausada",
  unassigned: "Sem atribuição",
};

/** Inbox filters (URL-driven). All optional; tenant is server-resolved. */
export const conversationFiltersSchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum(CONVERSATION_STATUSES).optional(),
  assigneeType: z.enum(ASSIGNEE_TYPES).optional(),
  unread: z.boolean().optional(),
});
export type ConversationFilters = z.infer<typeof conversationFiltersSchema>;

const variablesSchema = z
  .record(z.string(), z.string().refine((v) => v.trim().length > 0, "Variável não pode ser vazia."))
  .optional();

/**
 * Outbound send. Two modes: a provider template (templateId + variables) or
 * free text (prepared content; provider may wrap it in a text template). The
 * conversation already carries the target — we never take it from the client.
 */
export const sendConversationMessageSchema = z
  .object({
    conversationId: z.string().uuid("Conversa inválida."),
    mode: z.enum(["template", "text"]),
    templateId: z.string().trim().optional(),
    content: z.string().trim().max(4096, "Mensagem muito longa.").optional(),
    variables: variablesSchema,
    deliverAt: z.string().datetime({ message: "Data de envio inválida." }).optional(),
    deliverUntil: z.string().datetime({ message: "Prazo inválido." }).optional(),
    aiRewrite: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "template" && !data.templateId) {
      ctx.addIssue({ code: "custom", path: ["templateId"], message: "Selecione um template." });
    }
    if (data.mode === "text" && !data.content) {
      ctx.addIssue({ code: "custom", path: ["content"], message: "Digite uma mensagem." });
    }
    if (data.deliverAt && data.deliverUntil && data.deliverUntil <= data.deliverAt) {
      ctx.addIssue({ code: "custom", path: ["deliverUntil"], message: "O prazo deve ser após o envio." });
    }
  });
export type SendConversationMessageInput = z.infer<typeof sendConversationMessageSchema>;

export const setAssigneeSchema = z.object({
  conversationId: z.string().uuid("Conversa inválida."),
  assigneeType: z.enum(ASSIGNEE_TYPES),
  reason: z.string().trim().max(280).optional(),
});

export const setConversationStatusSchema = z.object({
  conversationId: z.string().uuid("Conversa inválida."),
  status: z.enum(CONVERSATION_STATUSES),
});

export const CONSENT_STATUSES = ["unknown", "opted_in", "opted_out", "required", "not_required"] as const;
export type ConsentStatusValue = (typeof CONSENT_STATUSES)[number];

export const setConsentSchema = z.object({
  conversationId: z.string().uuid("Conversa inválida."),
  optInStatus: z.enum(["opted_in", "opted_out"]),
});
