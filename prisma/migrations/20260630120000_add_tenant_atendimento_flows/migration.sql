-- Fluxos de atendimento selecionados pelo tenant (lista de slugs de fluxo).
ALTER TABLE "tenants" ADD COLUMN "atendimento_flows" JSONB;
