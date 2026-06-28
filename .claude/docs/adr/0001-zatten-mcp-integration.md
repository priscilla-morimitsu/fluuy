# ADR 0001 — Integração com a Zatten via servidor MCP do Fluuy

- **Status:** Proposto
- **Data:** 2026-06-28
- **Decisores:** Produto/Eng Fluuy
- **Relacionado:** [spec técnica](../specs/integrations/zatten-mcp/spec-zatten-mcp.md) ·
  [docs do agente petshop](../agent/petshop/00_indice.md) ·
  [WhatsApp Pilot Status](../specs/integrations/whatsapp/pilot-status.md)

---

## Contexto

O Fluuy precisa de um agente de IA no WhatsApp para o nicho petshop (atendimento, agendamento,
vendas, captação, suporte). O agente próprio ainda é placeholder (`/agents`, `/workflows`,
`/knowledge-base`) e as tabelas `agent_configs`/`workflow_*` não foram modeladas. Construir do
zero o runtime conversacional (NLU, gestão de WhatsApp, RAG, política, fila/worker) é caro e não
é o nosso diferencial.

A **Zatten** é uma plataforma white-label brasileira que entrega agentes de IA no WhatsApp e
**suporta MCP nativamente** como "Ação" do agente: configura-se uma **URL de servidor MCP** +
**Bearer Token**, e a plataforma **descobre e chama as tools** automaticamente (caso de uso citado
na doc: "buscas em bancos de dados SQL / scripts externos"). Ela também oferece Ações nativas
(Agendamento, Captura de Dados, Transferência) e Webhooks Personalizados.

Do lado Fluuy temos uma **camada de dados já tenant-scoped e reutilizável** (`data.ts`:
`listServices`, `getCustomer`, `listPets`, `listAppointments`, `listOrders`, `listOfferPlans`,
`listOrderCatalog`…), Next.js 16 (route handlers), Prisma 6, zod 4 e um padrão de auth por token
no webhook do Pilot Status.

## Decisão

Adotar a **Zatten como runtime conversacional** do agente no WhatsApp e expor os **dados e ações
do Fluuy via um servidor MCP remoto** próprio, que:

1. roda como **route handler do Next.js** (`/api/mcp/[transport]`, **Streamable HTTP**) usando a
   biblioteca oficial **`mcp-handler`** (Vercel) sobre o `@modelcontextprotocol/sdk`;
2. autentica por **Bearer Token por tenant** (um token = um petshop), resolvendo `tenant_id` no
   servidor — o token é a **fronteira de isolamento** multi-tenant;
3. resolve o **tutor pelo telefone do contato** (argumento das tools), dentro do tenant
   (anti-IDOR embutido);
4. **reutiliza a camada `data.ts`** existente para as tools de leitura; tools de escrita usam uma
   camada *service-less* nova (sem sessão) com validação zod e idempotência;
5. trata a saída do modelo/argumentos como **não-confiáveis** (OWASP LLM) e nunca aceita
   `tenant_id` do cliente.

O catálogo de tools deriva diretamente das 41 skills do petshop
([docs do agente](../agent/petshop/06_skills_agente.md)) — leitura primeiro, escrita depois.

## Alternativas consideradas

| Alternativa | Por que não (agora) |
|---|---|
| **Construir agente próprio** (runtime completo) | Caro e fora do diferencial; reintroduz NLU/WhatsApp/RAG/worker. Mantido como visão de longo prazo, não para o go-to-market. |
| **Só Webhooks Personalizados da Zatten** | Cada integração é um endpoint avulso; sem descoberta de tools nem contrato padronizado. MCP dá catálogo, tipagem e múltiplas tools num só conector. |
| **Só Ações nativas da Zatten** | Cobrem agendamento/captura genéricos, mas não consultam nosso catálogo/dados em tempo real. Usaremos as nativas como **complemento** (ex.: Transferência p/ handoff). |
| **Expor REST genérica + a Zatten consome** | A Zatten não "navega" REST sozinha; precisaria de glue por endpoint. MCP é o mecanismo de tooling que o agente entende nativamente. |

## Consequências

**Positivas**
- Time-to-market muito menor; a Zatten cuida de NLU, WhatsApp, RAG e política conversacional.
- Reúso quase total da camada de dados → tools de leitura baratas.
- Isolamento multi-tenant simples e robusto (token por tenant).
- As docs/skills do petshop viram contrato de tools + prompt — sem retrabalho.

**Negativas / riscos**
- **Dependência de fornecedor** (Zatten): disponibilidade do recurso MCP no plano, limites de
  transporte/timeout/nº de tools a confirmar (resolvido na Fase 0).
- **Política/guard-rails em dois lugares** (prompt Zatten + tools) — exige disciplina para manter
  os limites clínicos/"nunca inventar dado" coesos.
- **Escrita é o maior custo/risco** (idempotência, confirmação humana) — faseado.
- Superfície pública nova exige hardening (rate-limit, auditoria, LGPD, prompt-injection nos args).

**Neutras**
- O endpoint MCP vive no mesmo deploy Next/Vercel; runtime Node (Prisma). Sem Redis no MVP
  (Streamable HTTP stateless).

## Plano de adoção (resumo)

- **Fase 0 (este ADR):** endpoint MCP + auth por token + 1 tool (`info_estabelecimento`) → validar
  conexão real com um agente Zatten de teste.
- **Fase 1–2:** modelo de token + tools de leitura (catálogo, planos, disponibilidade, tutor/pet,
  status de pedido).
- **Fase 3:** tools de escrita (agendamento, pedido rascunho, lead/cadastro).
- **Fase 4:** hardening + rollout multi-tenant (UI de token, observabilidade, security review).

Detalhamento e contratos em [spec-zatten-mcp.md](../specs/integrations/zatten-mcp/spec-zatten-mcp.md).

## Como reverter

A integração é aditiva: remover o conector MCP no painel Zatten e revogar tokens
(`McpAccessToken.status = revoked`) desliga tudo sem afetar o restante do app. O endpoint pode ser
removido sem impacto nas demais rotas (namespace isolado `/api/mcp`).
