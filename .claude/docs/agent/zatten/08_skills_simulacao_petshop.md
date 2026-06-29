# Skills da Zatten para a simulação de atendimento petshop (WhatsApp do Fluuy)

Como configurar as **skills (habilidades) do agente Zatten** para a **simulação de atendimento do
nicho petshop**, consumindo o **MCP do Fluuy** pela Ação MCP chamada **`fluuy_mcp`**, no **WhatsApp
do próprio Fluuy** (tenant `demo-petshop`).

> Registro legível por máquina: [skills/zatten-petshop-skills.spec.json](skills/zatten-petshop-skills.spec.json).
> Este doc é o "como operar"; o mapa skill→tool está em [05](05_skills_para_tools.md), as tools em
> [03](03_tools_mcp_e_gatilhos.md) e o prompt em [02](02_system_prompt.md).

---

## 1. Cenário da simulação

| Item | Valor |
|---|---|
| **Tenant** | `demo-petshop` ("Demo Petshop") |
| **Canal** | WhatsApp conectado ao inbox do **próprio Fluuy** (Pilot Status) → demo-petshop |
| **Runtime do agente** | Zatten (modelo + prompt + RAG) chamando o MCP do Fluuy |
| **Fonte de dados** | Seed `prisma/seed-demo-petshop.ts` (25 produtos, 11 serviços, 5 planos, 6 clientes/pets, 5 pedidos, 7 agendamentos) |
| **Objetivo** | Recepção, dúvidas institucionais, catálogo/planos, agendamento e captação — **com dados reais, sem inventar** |

Fluxo: `Tutor (WhatsApp do Fluuy) → Agente Zatten → Ação fluuy_mcp → /api/mcp/mcp (tenant pelo token)`.

---

## 2. Conexão da Ação `fluuy_mcp`

No painel da Zatten, a **Ação MCP** deve se chamar **`fluuy_mcp`** (as instruções das skills
referenciam `fluuy_mcp.<tool>`).

| Campo | Valor |
|---|---|
| **Nome da Ação** | `fluuy_mcp` |
| **URL do Servidor** | `https://fluuy.com/api/mcp/mcp` |
| **Autenticação** | Bearer Token = token do `demo-petshop` |

Emitir o token (uma vez):

```bash
# na VPS, via imagem build-stage (rede deploy_default)
docker run --rm --network deploy_default --env-file /root/apps/deploy/env/fluuy.env \
  fluuy-migrate npm run mcp:token -- --tenant demo-petshop --name "Agente Zatten"
```

Mande a Zatten **validar as ferramentas**: deve listar **9 tools** —
`info_estabelecimento`, `identificar_tutor`, `buscar_servicos`, `buscar_produtos`,
`consultar_planos`, `consultar_disponibilidade`, `listar_pets`, `status_pedido`,
`consultar_agendamentos`.

---

## 3. O que funciona HOJE vs. pendente

São **41 skills**; a realização de cada uma está no JSON. Resumo do estado em produção:

| Estado | Qtd | O que é |
|---|---|---|
| ✅ **live** | 23 | **9 tools de LEITURA** implementadas e validadas ao vivo (institucional, catálogo de serviços/produtos, planos, disponibilidade, tutor/pet, pedido, agenda), as skills de **prompt/RAG** (A1, A3, A5, A6, A8, S1, S2, S7) e o **handoff nativo** (A7, S3, S4). |
| 🟡 **pending_tool** | 15 | Dependem das tools de **ESCRITA** (Fase 3) ainda **não implementadas**: agendar/remarcar/cancelar, criar pedido, cadastrar tutor/pet, registrar lead, registro de handoff. Degradam para coleta + handoff. |
| ⏰ **proactive_fluuy** | 3 | C5/C6/C7 — campanhas por cron/opt-in originadas pelo **Fluuy**, fora do inbound da simulação. |

> **Importante:** o agente já **consulta dados reais** (preço por porte, produtos, planos,
> horários, pedidos, agendamentos e pets do tutor). Falta a camada de **escrita** (Fase 3) para o
> agente **criar** agendamentos/pedidos/cadastros/leads — até lá, essas skills coletam os dados e
> transferem para a equipe. Tools em `src/lib/mcp/tools/read-tools.ts`; escrita pendente per
> [spec](../../specs/integrations/zatten-mcp/spec-zatten-mcp.md).

---

## 4. Roteiro de demonstração (o que dá pra mostrar já)

| # | Tutor escreve | Skill | Realização | Resultado |
|---|---|---|---|---|
| 1 | "Que horas vocês abrem?" | A4 | `fluuy_mcp.info_estabelecimento` ✅ | horário real do Demo Petshop |
| 2 | "Onde ficam? Aceitam pix?" | A4 | `fluuy_mcp.info_estabelecimento` ✅ | endereço (Vila Mariana/SP) + pagamento |
| 3 | "Quanto custa o banho do meu cão grande?" | AG1 | `fluuy_mcp.buscar_servicos` (porte=grande) ✅ | preço exato por porte (ex.: Banho R$ 80,00) |
| 4 | "Tem ração golden 15kg?" | V1 | `fluuy_mcp.buscar_produtos` ✅ | produtos reais + preço/promoção |
| 5 | "Tem plano de banho mensal?" | V6 | `fluuy_mcp.consultar_planos` ✅ | planos reais (ex.: Plano Banho Mensal R$ 169,90/mês) |
| 6 | "Tem horário sábado pra banho?" | AG5 | `fluuy_mcp.consultar_disponibilidade` ✅ | janelas/horários reais (sáb 09:00–13:00) |
| 7 | "Cadê meu pedido?" | V7 | `fluuy_mcp.status_pedido` ✅ | pedidos do tutor (pelo telefone) |
| 8 | "Quero **marcar** o banho" | AG2 | `fluuy_mcp.criar_agendamento` 🟡 | hoje: coleta + handoff (escrita é Fase 3) |
| 9 | "Quero falar com uma pessoa" | A7 | Ação nativa **Transferência** ✅ | agente transfere e silencia |

---

## 5. Guard-rails que valem mesmo sem as tools

Mesmo na simulação enxuta, mantenha a camada de **prompt** ([02](02_system_prompt.md)) e
[06](06_guardrails_e_handoff.md):

- **Nunca inventar** preço/estoque/horário/agenda — se a tool não existir/retornar, confirmar com
  a equipe.
- **S2 (clínico)**: não diagnostica, não prescreve, não dá dosagem → orienta avaliação + consulta/handoff.
- **S3 (emergência)**: orientação curta de urgência + **Transferência imediata**.
- **A7/S4 (humano/reclamação)**: Transferência; após handoff, o agente **silencia**.
- **Anti-IDOR**: só dados do tutor dono do número; `tenant_id` sempre do token (`demo-petshop`).

---

## 6. Próximo passo para uma simulação completa

Implementar as tools de leitura no MCP (na ordem do roteiro de demo): `identificar_tutor`,
`buscar_servicos`, `buscar_produtos`, `consultar_planos`, `consultar_disponibilidade`,
`listar_pets`, `status_pedido`, `consultar_agendamentos` — depois as de escrita (Fase 3). Cada nova
tool entra em `src/lib/mcp/server.ts` (registro) + `src/lib/mcp/tools/<tool>.ts`, resolvendo o
tenant via `getTenantId(extra.authInfo)` e o tutor pelo telefone. Ao implementar, mude o `status`
da skill correspondente para `live` neste pacote.
