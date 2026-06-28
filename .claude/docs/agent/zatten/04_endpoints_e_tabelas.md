# Tabela — Endpoints e tabelas necessários para a integração

O que precisa existir no **Fluuy** para o agente Zatten operar via MCP. Status: ✅ pronto ·
🟡 Fase 2 · 🟠 Fase 3 · 🔵 Fase 4.

---

## 1. Endpoints HTTP (superfície que a Zatten consome)

> A Zatten só conversa com **um** endpoint (o MCP). As tools, internamente, chamam a camada de
> dados/serviço do Fluuy — **não** há REST por recurso.

| Endpoint | Método | Status | Papel |
|---|---|---|---|
| `/api/mcp/mcp` | POST/GET/DELETE | ✅ | **Endpoint MCP (Streamable HTTP).** É a URL configurada no Zatten (Ação MCP) com Bearer. |
| `/api/mcp/sse` | GET/POST | 🔵 | Transporte SSE (legado). Só se a Zatten exigir; precisa `REDIS_URL`. Não usado no MVP. |
| `/.well-known/oauth-protected-resource` | GET | ✅ | Metadata de recurso protegido (emitida pelo `withMcpAuth`). Automático. |
| Emissão/revogação de token | — | 🔵 | Hoje via CLI `npm run mcp:token`. UI no painel admin do tenant na Fase 4. |

---

## 2. Tabelas do banco por tool

`R` = lê · `W` = escreve. Toda query filtra por `tenant_id` (resolvido do token).

| Tool | Tabelas | Acesso | Status |
|---|---|---|---|
| `info_estabelecimento` | `Tenant` | R | ✅ |
| `identificar_tutor` | `Customer`, `Pet`, `CustomerLead` | R | 🟡 |
| `buscar_servicos` | `Service`, `ServiceCategory` | R | 🟡 |
| `consultar_disponibilidade` | `ServiceAvailabilityRule`, `Appointment`, `Professional`, `Location`, `ServiceProfessional`, `ServiceLocation` | R | 🟡 |
| `buscar_produtos` | `Product`, `ProductCategory` | R | 🟡 |
| `consultar_planos` | `OfferPlan`, `OfferPlanServiceItem`, `OfferPlanProductItem` | R | 🟡 |
| `listar_pets` | `Pet` | R | 🟡 |
| `status_pedido` | `Order`, `OrderItem`, `OrderPayment` | R | 🟡 |
| `consultar_agendamentos` | `Appointment` | R | 🟡 |
| `cadastrar_tutor` | `Customer` | R/W | 🟠 |
| `cadastrar_pet` | `Customer`, `Pet` | R/W | 🟠 |
| `registrar_lead` | `CustomerLead` | W | 🟠 |
| `criar_agendamento` | `Service`, `Customer`, `Pet`, `Appointment`, `AppointmentStatusHistory`, `AppointmentReminder` | R/W | 🟠 |
| `remarcar_agendamento` | `Appointment`, `AppointmentStatusHistory`, `AppointmentReminder` | R/W | 🟠 |
| `cancelar_agendamento` | `Appointment`, `AppointmentStatusHistory` | R/W | 🟠 |
| `criar_pedido_rascunho` | `Product`, `Service`, `OfferPlan`, `Customer`, `Order`, `OrderItem`, `OrderSequence`, `OrderAddress` | R/W | 🟠 |
| `solicitar_handoff` | `Conversation`, `ConversationAssignment` | W | 🟠 |
| **(todas)** feature-gate | `Feature`, `TenantFeature` | R | 🟡 |
| **(auth)** | `McpAccessToken` ⬅ **novo** | R/W | ✅ (modelo) / 🟠 (migration) |
| **(observabilidade)** | `McpToolCallLog` ⬅ **novo** | W | 🔵 |

> ⚠️ **`McpAccessToken` já está no `schema.prisma` e no client, mas a migration ainda não foi
> criada** (o banco estava off). Rodar: `npm run db:migrate -- --name add_mcp_access_tokens`.

---

## 3. Funções de dados/serviço por tool

As tools de **leitura** reaproveitam a camada `data.ts` existente; as de **escrita** precisam de
uma camada *service-less* nova (sem sessão). `novo?` marca o que precisa ser criado.

| Tool | Função | Reuso / novo |
|---|---|---|
| `info_estabelecimento` | `prisma.tenant.findUnique` | ✅ (na tool) |
| `identificar_tutor` | `findCustomerByPhone(tenantId, phone)` | 🟠 **novo** (resolução por telefone normalizado) |
| `buscar_servicos` | `listServices` / `getService` | ♻️ `services/data.ts` |
| `consultar_disponibilidade` | `listAvailabilityRules` + `listAvailableSlots(tenantId, serviceId, date)` | ♻️ + 🟠 **novo** (cálculo de janelas) |
| `buscar_produtos` | `listOrderCatalog` / consulta `Product` | ♻️ `orders/data.ts` / `products` |
| `consultar_planos` | `listOfferPlans` / `getOfferPlan` | ♻️ `plans/data.ts` |
| `listar_pets` | `listPets` (+ `findCustomerByPhone`) | ♻️ `customers/data.ts` + 🟠 |
| `status_pedido` | `listOrders` / `getOrder` (por tutor) | ♻️ `orders/data.ts` + filtro por customer |
| `consultar_agendamentos` | `listAppointments` (por tutor) | ♻️ `appointments/data.ts` |
| `cadastrar_tutor` | `upsertCustomerByPhone(tenantId, …)` | 🟠 **novo** |
| `cadastrar_pet` | `createPetForCustomer(tenantId, …)` | 🟠 **novo** |
| `registrar_lead` | `createLeadFromAgent(tenantId, …)` | 🟠 **novo** (ver `lib/customers/lead-*`) |
| `criar_agendamento` | `createAppointmentFromAgent(tenantId, …)` | 🟠 **novo** (idempotência + valida disponibilidade) |
| `remarcar/cancelar` | `rescheduleAppointment` / `cancelAppointment` | 🟠 **novo** (sem sessão; aplica política) |
| `criar_pedido_rascunho` | `createOrderDraftFromAgent(tenantId, …)` | 🟠 **novo** (totais server-side, numeração) |
| `solicitar_handoff` | `requestHandoff(tenantId, conversationId, …)` | 🟠 **novo** (ou Ação nativa Zatten) |

> As funções de escrita **não** podem reusar as Server Actions (`actions.ts`) — elas dependem da
> sessão/RBAC do painel. A camada nova valida com zod, marca `createdByAgent/source`, é idempotente
> e registra auditoria. Ver [spec §5.2](../../specs/integrations/zatten-mcp/spec-zatten-mcp.md).

---

## 4. Variáveis de ambiente

| Var | Status | Uso |
|---|---|---|
| `AUTH_SECRET` | ✅ (existe) | já usada; nenhuma nova obrigatória no MVP |
| `MCP_DEV_TOKEN`, `MCP_DEV_TENANT_ID`/`_SLUG` | ✅ | atalho **só dev** p/ smoke test sem migration |
| `REDIS_URL` | 🔵 | só se usar transporte SSE |
| `MCP_RATE_LIMIT_PER_MIN` | 🔵 | rate-limit por token (default 60) |
