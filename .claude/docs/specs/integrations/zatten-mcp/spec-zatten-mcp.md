# Spec técnica — Servidor MCP do Fluuy para o agente Zatten

Especificação de implementação da integração descrita no
[ADR 0001](../../../adr/0001-zatten-mcp-integration.md). Define transporte, autenticação, modelo
de dados, resolução de tenant/contato, catálogo de tools, segurança, observabilidade, fases e
testes. Fonte de domínio: [docs do agente petshop](../../../agent/petshop/00_indice.md).

---

## 1. Visão geral

O Fluuy expõe um **servidor MCP remoto**. O **agente da Zatten** conecta-se a ele (Ação "MCP":
URL + Bearer), **descobre as tools** e as chama durante a conversa para ler dados (e, depois,
criar registros) do petshop, respondendo o cliente com dados reais.

```
Tutor (WhatsApp) → Agente Zatten → [Ação MCP: URL + Bearer]
        → Fluuy MCP (/api/mcp/mcp, Streamable HTTP)
            → verifyToken(Bearer) → tenant_id
            → tool(args, {authInfo.extra.tenantId})
                → camada data.ts (leitura)  /  service-less (escrita)
                    → Prisma → Postgres (sempre filtrado por tenant_id)
```

## 2. Transporte e endpoint

- Biblioteca: **`mcp-handler`** (Vercel) + **`@modelcontextprotocol/sdk`**.
- Arquivo: `src/app/api/mcp/[transport]/route.ts`, `basePath: "/api/mcp"`.
- Endpoints resultantes:
  - **Streamable HTTP** (recomendado p/ Zatten): `POST/GET/DELETE /api/mcp/mcp`
  - SSE (legado/fallback): `/api/mcp/sse` (requer `REDIS_URL` p/ resumability; **não** usado no MVP)
- `runtime = "nodejs"` (Prisma), `maxDuration = 60`, `dynamic = "force-dynamic"`.
- Sem Redis no MVP (Streamable HTTP stateless). CORS não se aplica (chamada server-to-server).

> **A confirmar na Fase 0:** que a Zatten fala Streamable HTTP nesse path e injeta o header
> `Authorization: Bearer <token>`. Caso ela exija SSE, habilitar `REDIS_URL`.

## 3. Autenticação — Bearer Token por tenant

**Princípio:** *um token = um tenant (petshop)*. O token é a única credencial que a Zatten
guarda; o servidor resolve `tenant_id` a partir dele. **Nunca** se aceita `tenant_id` como input.

### 3.1 Modelo `McpAccessToken` (Prisma)

```prisma
enum McpAccessTokenStatus { active revoked }

model McpAccessToken {
  id            String              @id @default(uuid())
  tenantId      String              @map("tenant_id")
  name          String                                   // rótulo ("Agente Zatten - Produção")
  tokenHash     String              @unique @map("token_hash") // sha256(token) hex
  tokenPrefix   String              @map("token_prefix")   // ex.: "mcp_live_ab12cd" (exibição/log)
  scopes        String[]            @default(["read"])     // ["read"] | ["read","write"]
  status        McpAccessTokenStatus @default(active)
  lastUsedAt    DateTime?           @map("last_used_at")
  expiresAt     DateTime?           @map("expires_at")
  createdByUserId String?           @map("created_by_user_id")
  createdAt     DateTime            @default(now()) @map("created_at")
  updatedAt     DateTime            @updatedAt @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([tenantId, status])
  @@map("mcp_access_tokens")
}
```
(+ `mcpAccessTokens McpAccessToken[]` em `Tenant`; índice em `tenant_id` conforme guard-rails.)

### 3.2 Formato e armazenamento do token

- Formato emitido: `mcp_live_<base64url(32 bytes aleatórios)>` (ou `mcp_test_` em dev).
- Persistência: **só o hash** `sha256(token)` (hex) em `tokenHash` (único). O token em claro é
  exibido **uma única vez** na emissão. `tokenPrefix` guarda os primeiros chars p/ identificação.
- Verificação (`verifyToken`): `hash = sha256(bearer)` → `findUnique({ tokenHash: hash })` →
  exige `status=active` e (se `expiresAt`) não expirado → retorna `AuthInfo` com
  `extra.tenantId` e `scopes`. Atualiza `lastUsedAt` (throttle ~1/min). Inválido → `undefined`
  (a lib responde 401).
- Hash de busca em segredo de alta entropia dispensa salt; sem comparação manual (lookup por
  índice único). Token nunca aparece em log (mascarar p/ `tokenPrefix`).

### 3.3 Escopos
- `read` — tools de leitura (Fases 1–2).
- `write` — tools de escrita (Fase 3). `withMcpAuth(..., { requiredScopes: ["read"] })` no
  handler; tools de escrita checam `scopes.includes("write")` e recusam caso contrário.

## 4. Resolução do contato (tutor) e isolamento

A Zatten não conhece IDs internos. As tools que dependem de um cliente recebem **`phone`** (E.164
ou nacional) e resolvem dentro do tenant:

- normalizar telefone (reaproveitar normalização usada em `Conversation.contactNumberNormalized`);
- `Customer` por telefone normalizado **no tenant**; se não houver, retornar "não cadastrado"
  (e, nas skills de captação, permitir criar lead/cliente — Fase 3);
- **toda** query inclui `tenantId` resolvido do token; nenhuma tool cruza tenants;
- anti-IDOR: pedidos/agendamentos retornados são apenas os do `customerId` resolvido.

## 5. Catálogo de tools

Nomes em pt-BR (o agente Zatten é pt-BR). Mapeiam às skills do petshop
([06_skills_agente](../../../agent/petshop/06_skills_agente.md)). Cada tool retorna texto enxuto
p/ WhatsApp e, quando útil, `structuredContent`. **Só dados ativos**; nunca o registro inteiro.

### 5.1 Leitura (Fases 0–2)

| Tool | Skill | Input (zod) | Lê | Retorno |
|---|---|---|---|---|
| `info_estabelecimento` | A4 | `{ topico?: enum }` | `Tenant` | horário, endereço, contato, pagamento, capacidades |
| `buscar_produtos` | V1/V3 | `{ termo?, marca?, especie?, porte?, limite? }` | `Product` ativo | nome, marca, preço, promo, embalagem |
| `buscar_servicos` | V4/AG1 | `{ termo?, especie?, porte? }` | `Service` ativo | nome, preço (por porte), duração, modalidades |
| `consultar_planos` | V6 | `{ tipo?, servico? }` | `OfferPlan` ativo | nome, tipo, preço, ciclo, itens inclusos |
| `consultar_disponibilidade` | AG5 | `{ servicoId, data? }` | regras/agenda | janelas disponíveis |
| `identificar_tutor` | A2 | `{ phone }` | `Customer`,`Pet` | tutor + pets (resumo), ou "não cadastrado" |
| `listar_pets` | A2/S8 | `{ phone }` | `Pet` | pets do tutor (nome, espécie, porte, healthNotes resumido) |
| `status_pedido` | V7 | `{ phone, numero? }` | `Order` do tutor | status, itens, total |
| `consultar_agendamentos` | AG/S | `{ phone }` | `Appointment` do tutor | próximos agendamentos + status |

### 5.2 Escrita (Fase 3 — `scope: write`)

| Tool | Skill | Input (zod) | Escreve | Regras |
|---|---|---|---|---|
| `cadastrar_tutor` | C4 | `{ phone, nome }` | `Customer` | idempotente por telefone |
| `cadastrar_pet` | C3 | `{ phone, nome, especie, porte?, ... }` | `Pet` | exige tutor; pouco por vez |
| `registrar_lead` | C1/C2 | `{ phone, interesse, origem? }` | `CustomerLead` | feature `lead_management` |
| `criar_agendamento` | AG2/AG3/AG4 | `{ phone, servicoId, inicio, modalidade, petId?, obs? }` | `Appointment` | `source=ai`,`createdByAgent`, status `pending_confirmation`; **idempotência** (janela+serviço+pet); valida disponibilidade |
| `remarcar_agendamento` | AG6 | `{ phone, agendamentoId, novoInicio }` | `Appointment` | política de antecedência |
| `cancelar_agendamento` | AG7 | `{ phone, agendamentoId, motivo? }` | `Appointment` | política de no-show |
| `criar_pedido_rascunho` | V2/V5 | `{ phone, itens[], entrega }` | `Order` (draft) | `source=whatsapp`; **não** cobra |
| `solicitar_handoff` | A7/S3/S4 | `{ phone, motivo, urgencia }` | `Conversation` (ou usa Ação nativa Zatten) | notifica responsável |

> Cada escrita: valida input com zod, checa `write` scope + feature-gate, é **idempotente**, marca
> origem (`createdByAgent`/`source`), registra auditoria. Confirmação/cobrança ficam com humano.

### 5.3 Convenções de tool
- `description` clara e em pt-BR (a Zatten usa-a p/ decidir quando chamar) — incluir o que NÃO faz.
- Erros viram **texto amigável** (`isError: true`), nunca stack/detalhe interno.
- "Dado não encontrado" é resposta normal (não erro): orienta o agente a coletar/encaminhar.
- Saída sempre **enxuta** (limite de itens; campos essenciais) — é WhatsApp.

## 6. Segurança (alinhado ao CLAUDE.md + OWASP LLM)

- **Isolamento:** `tenant_id` sempre do token; nenhuma tool aceita tenant do input; toda query
  filtra por tenant; retorno só dos campos necessários.
- **IDOR:** dados de cliente/pedido/agendamento só do tutor resolvido pelo telefone.
- **Args não-confiáveis (LLM01/LLM02):** validar tudo com zod; tratar strings como dados, nunca
  como instrução; nada de SQL string/`eval`. Ignorar tentativas de "trocar de tenant" nos args.
- **Escrita = agência (LLM08):** mínimo privilégio (`write` scope), idempotência, e ações
  irreversíveis/financeiras ficam fora do agente (confirmação humana).
- **Segredos:** token só como hash; `AUTH_SECRET`/envs server-side; token mascarado em logs.
- **Rate limit / abuso:** limitar req/min por token (reusar `lib/auth/rate-limit.ts`); 401 sem
  vazar validade; auditar chamadas (tool, tenant, latência, status).
- **LGPD:** minimização (não devolver PII além do necessário); proativos só com opt-in
  (Fase 3+); dados não cruzam tenants.

## 7. Observabilidade
- Log estruturado por chamada: `tenantId`, `tool`, `durationMs`, `ok|error`, `tokenPrefix` (nunca
  o token). Opcional: tabela `McpToolCallLog` (Fase 4) p/ métricas (tools mais usadas, latência,
  erros) — alimenta o dashboard.
- Health: `GET /api/mcp/mcp` deve responder ao handshake; `/api/health` cobre liveness geral.

## 8. Configuração / env
- Reaproveita `AUTH_SECRET` (já existe). **Nenhum novo segredo obrigatório** no MVP.
- Opcionais: `REDIS_URL` (só se usar SSE), `MCP_RATE_LIMIT_PER_MIN` (default 60).
- Dev: `MCP_DEV_TOKEN` + `MCP_DEV_TENANT_SLUG` podem habilitar um atalho de auth **somente** fora
  de produção, p/ smoke test sem migration (a Fase 0 já entrega o modelo real, então é opcional).

## 9. Fases e estimativa
Ver [ADR](../../../adr/0001-zatten-mcp-integration.md) e o detalhamento de esforço já levantado:
- **Fase 0:** endpoint + auth + `info_estabelecimento` (este entregável).
- **Fase 1:** `McpAccessToken` + verifyToken + rate-limit + auditoria.
- **Fase 2:** tools de leitura (5.1).
- **Fase 3:** tools de escrita (5.2).
- **Fase 4:** UI de token por tenant, observabilidade, security review, rollout.

## 10. Testes
- **Unit (vitest):** geração/derivação de hash do token; `verifyToken` (ativo/revogado/expirado);
  normalização de telefone; mappers de saída (lean, sem PII extra).
- **Integração:** chamada `tools/list` e `tools/call info_estabelecimento` com Bearer válido →
  dados do tenant; Bearer inválido → 401; tenant A não enxerga dados de B.
- **Smoke local:** `initialize` → `tools/list` → `tools/call` via `curl` (ver runbook).

## 11. Runbook — conectar um agente Zatten
1. Emitir token: `npm run mcp:token -- --tenant <slug> --name "Agente Zatten"` → copiar o token
   exibido **uma vez**.
2. Expor o endpoint publicamente (deploy Vercel **ou** túnel em dev: `ngrok http 3000`).
3. No painel Zatten → Agente → Ações → **MCP**: URL = `https://<host>/api/mcp/mcp`,
   Autenticação = **Bearer Token** = `<token>`. Validar tools (deve listar `info_estabelecimento`).
4. Testar no WhatsApp: "qual o horário de vocês?" → o agente chama a tool e responde com os dados
   reais do tenant.
5. Revogar quando preciso: marcar `McpAccessToken.status = revoked`.

## 12. Questões em aberto (Fase 0 resolve)
- Transporte exato aceito pela Zatten (Streamable HTTP vs SSE) e formato do header de auth.
- Limites: nº de tools, timeout por tool, tamanho de resposta.
- Se a Zatten suporta tools de **escrita** ou se preferimos as Ações nativas para parte delas.
- Se a Ação nativa "Transferência" substitui `solicitar_handoff`.
