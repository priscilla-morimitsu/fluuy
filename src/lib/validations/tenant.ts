import { z } from "zod";

export const tenantSchema = z.object({
  nicheId: z.string().uuid(),
  name: z.string().min(2).max(150),
  legalName: z.string().max(150).optional().or(z.literal("")),
  document: z.string().max(30).optional().or(z.literal("")),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens"),
  description: z.string().max(2000).optional().or(z.literal("")),
  publicPhone: z.string().max(30).optional().or(z.literal("")),
  publicEmail: z.string().email().optional().or(z.literal("")),
  notificationPhone: z.string().max(30).optional().or(z.literal("")),
  hasProducts: z.boolean().default(false),
  hasServices: z.boolean().default(false),
  hasPlans: z.boolean().default(false),
  hasDelivery: z.boolean().default(false),
  hasPickup: z.boolean().default(false),
  acceptsOnlinePayment: z.boolean().default(false),
});

export type TenantInput = z.infer<typeof tenantSchema>;

// `slug` is part of the tenant's public URL (/t/[slug]) and is treated as a
// stable identifier, so it cannot change after creation.
export const tenantUpdateSchema = tenantSchema.omit({ slug: true });

export type TenantUpdateInput = z.infer<typeof tenantUpdateSchema>;

export const TENANT_STATUSES = ["active", "trial", "suspended", "blocked"] as const;
export const tenantStatusSchema = z.enum(TENANT_STATUSES);
export type TenantStatusValue = z.infer<typeof tenantStatusSchema>;

// ── Fluxos de atendimento (o que o tenant atende) ──────────────────────────
// Catálogo dos fluxos selecionáveis no perfil do tenant. Deriva da lista de
// fluxos do nicho petshop (.claude/docs/agent/zatten/fluxos/) — apenas os que
// fazem sentido como "o que o negócio oferece/atende". Fluxos sempre-ativos do
// agente (saudação, roteamento, triagem de urgência, transbordo humano) NÃO
// entram aqui: são comportamento padrão, não uma escolha do tenant.
export const ATENDIMENTO_FLOW_GROUPS = [
  {
    group: "Banho & Tosa",
    flows: [
      { value: "agendar_banho", label: "Banho" },
      { value: "agendar_tosa_higienica", label: "Tosa higiênica" },
      { value: "agendar_tosa_completa", label: "Tosa completa (máquina/tesoura)" },
      { value: "agendar_banho_terapeutico", label: "Banho terapêutico" },
      { value: "agendar_hidratacao", label: "Hidratação" },
      { value: "agendar_corte_unhas", label: "Corte de unhas" },
      { value: "agendar_limpeza_ouvido", label: "Limpeza de ouvido" },
    ],
  },
  {
    group: "Veterinário & Saúde",
    flows: [
      { value: "agendar_consulta_veterinaria", label: "Consulta veterinária" },
      { value: "agendar_vacina", label: "Vacinação" },
      { value: "agendar_exame", label: "Exames" },
      { value: "agendar_castracao", label: "Castração" },
      { value: "agendar_profilaxia_dentaria", label: "Profilaxia dentária" },
      { value: "teleorientacao", label: "Teleorientação / consulta online" },
    ],
  },
  {
    group: "Hospedagem & Bem-estar",
    flows: [
      { value: "agendar_creche", label: "Creche" },
      { value: "agendar_hotel", label: "Hotel / hospedagem" },
      { value: "agendar_pet_sitter", label: "Pet sitter" },
      { value: "agendar_passeio", label: "Passeio (dog walker)" },
      { value: "agendar_fisioterapia", label: "Fisioterapia" },
      { value: "agendar_acupuntura", label: "Acupuntura" },
    ],
  },
  {
    group: "Logística",
    flows: [{ value: "agendar_leva_e_traz", label: "Leva e traz (táxi pet)" }],
  },
  {
    group: "Loja",
    flows: [
      { value: "comprar_racao", label: "Venda de ração" },
      { value: "comprar_medicamento", label: "Venda de medicamentos" },
      { value: "comprar_acessorio", label: "Venda de acessórios" },
      { value: "comprar_higiene", label: "Venda de higiene" },
      { value: "antipulgas_vermifugo", label: "Antipulgas / vermífugo" },
      { value: "compra_recorrente", label: "Compra recorrente / assinatura" },
    ],
  },
  {
    group: "Planos & Ofertas",
    flows: [
      { value: "pacote_mensal", label: "Planos e pacotes mensais" },
      { value: "programa_fidelidade", label: "Programa de fidelidade" },
      { value: "promocoes", label: "Promoções" },
    ],
  },
  {
    group: "Relacionamento & Comunidade",
    flows: [
      { value: "pedir_avaliacao", label: "Pedir avaliação" },
      { value: "cliente_inativo", label: "Reativação de inativos" },
      { value: "adocao", label: "Adoção" },
      { value: "pet_perdido", label: "Pet perdido / achado" },
      { value: "autorizacao_imagem", label: "Autorização de imagem" },
    ],
  },
] as const;

export const ATENDIMENTO_FLOWS = ATENDIMENTO_FLOW_GROUPS.flatMap((g) =>
  g.flows.map((f) => f.value),
);
const ATENDIMENTO_FLOW_SET = new Set<string>(ATENDIMENTO_FLOWS);

/** Filtra uma lista para conter apenas valores de fluxo conhecidos (sem duplicatas). */
export function sanitizeAtendimentoFlows(values: string[]): string[] {
  return [...new Set(values.filter((v) => ATENDIMENTO_FLOW_SET.has(v)))];
}

export const tenantProfileSchema = z.object({
  name: z.string().min(2).max(150),
  legalName: z.string().max(150).optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
  publicPhone: z.string().max(30).optional().or(z.literal("")),
  publicEmail: z.string().email().optional().or(z.literal("")),
  notificationPhone: z.string().max(30).optional().or(z.literal("")),
  atendimentoFlows: z.array(z.string()).default([]),
});

export type TenantProfileInput = z.infer<typeof tenantProfileSchema>;
