# Configuração do agente Zatten + conexão do MCP

Passo a passo para colocar o agente no ar: configurar o agente na Zatten e conectar o servidor MCP
do Fluuy.

---

## 1. Configurar o agente na Zatten

No painel da Zatten (Agente):

| Campo | O que colocar |
|---|---|
| **Nome** | Nome do assistente (ex.: "Atendimento {{nome_petshop}}") |
| **Modelo de IA** | Modelo com bom suporte a tool-calling em pt-BR |
| **Prompt** | O conteúdo de [02_system_prompt.md](02_system_prompt.md) |
| **Conhecimento (RAG)** | Conteúdo estático de [07](07_base_conhecimento_e_microcopy.md) — políticas, FAQ institucional. **Não** coloque catálogo/preços aqui (isso vem das tools) |
| **Horário de funcionamento** | Configure para acionar a mensagem de fora de horário |
| **Mensagens** | Boas-vindas / fora de horário / fallback — ver microcopy em [07](07_base_conhecimento_e_microcopy.md) |

### Ações do agente
| Ação | Configurar? | Observação |
|---|---|---|
| **MCP** | ✅ sim | conecta ao Fluuy (seção 2 abaixo) |
| **Transferência** | ✅ sim | usada para handoff humano ([06](06_guardrails_e_handoff.md)) |
| Captura de Dados / Agendamento (nativas) | opcional | preferimos as tools do MCP para gravar no Fluuy; use as nativas só se agregarem |
| Webhooks Personalizados | opcional | não necessário — o MCP cobre os casos |

---

## 2. Conectar o MCP do Fluuy

### 2.1 Pré-requisitos no Fluuy
1. **Migration** da tabela de tokens (uma vez, com o banco no ar):
   ```bash
   npm run db:migrate -- --name add_mcp_access_tokens
   ```
2. **Emitir um token para o tenant**:
   ```bash
   npm run mcp:token -- --tenant <slug> --name "Agente Zatten"
   ```
   Copie o token exibido (mostrado **uma única vez**).
3. **Endpoint público**: deploy na Vercel **ou**, em dev, um túnel (`ngrok http 3000`).

### 2.2 Configurar no Zatten (Ação MCP)
| Campo | Valor |
|---|---|
| **URL do Servidor** | `https://<host>/api/mcp/mcp` |
| **Autenticação** | Bearer Token = (o token emitido) |

Salve e mande a Zatten **validar as ferramentas** — deve listar `info_estabelecimento` (e, nas
próximas fases, as demais tools).

### 2.3 Testar
- No WhatsApp do agente: "qual o horário de vocês?" → o agente chama `info_estabelecimento` e
  responde com os dados reais do tenant.
- Erros comuns:
  - **401 / não conecta** → token errado/revogado, ou `/api/mcp` não acessível publicamente.
  - **redireciona para login** → `/api/mcp` precisa estar liberado no `src/middleware.ts` (já está).
  - **"estabelecimento não encontrado"** → o token aponta para um tenant inexistente.

---

## 3. Operação por tenant (multi-petshop)

- **Cada petshop** = um agente Zatten + um token MCP próprio (o token resolve o `tenant_id`).
- Para desligar um tenant: revogar o token (`McpAccessToken.status = revoked`) e/ou remover a Ação
  MCP no painel da Zatten.
- Antes de habilitar uma tool para um tenant, confirme a **feature** correspondente
  (`product_catalog`, `service_catalog`, `appointments`, `orders`, `plans_catalog`,
  `lead_management`, `deliveries`) — ver [04](04_endpoints_e_tabelas.md) e
  [petshop 00 §5](../petshop/00_indice.md).

---

## 4. Smoke test sem deploy (dev)
Para validar transporte/descoberta sem banco/migration, use o atalho de dev (ignorado em produção):
defina `MCP_DEV_TOKEN` + `MCP_DEV_TENANT_ID` (ou `_SLUG`) no `.env`, suba `npm run dev` e aponte um
cliente MCP para `http://localhost:3000/api/mcp/mcp` com esse Bearer. Ver
[spec §8/§11](../../specs/integrations/zatten-mcp/spec-zatten-mcp.md).
