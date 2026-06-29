# Agente Zatten + MCP Fluuy — Documentação de operação

> Como configurar e operar o **agente de IA da Zatten** para o nicho petshop usando o **servidor
> MCP do Fluuy** como fonte de dados e ações. É o "manual do operador" do agente.

Esta pasta NÃO redocumenta o domínio nem a implementação — ela conecta as duas:

| Camada | Onde está | Responsabilidade |
|---|---|---|
| **Domínio petshop** | [../petshop/](../petshop/00_indice.md) | Produtos, serviços, planos, personas, 41 skills, gatilhos, guard-rails, FAQ, microcopy |
| **Implementação MCP** | [ADR 0001](../../adr/0001-zatten-mcp-integration.md) · [spec](../../specs/integrations/zatten-mcp/spec-zatten-mcp.md) | Endpoint, token, transporte, tools, segurança |
| **Operação do agente Zatten** | **esta pasta** | Prompt, configuração, mapa skill→tool, RAG, handoff, conexão |

---

## 1. Divisão de responsabilidades (o conceito-chave)

O agente Zatten é "programado" por **prompt + base de conhecimento + ações**. No nosso desenho,
cada coisa tem um dono claro:

| Responsabilidade | Dono | Observação |
|---|---|---|
| Entender a mensagem (NLU), conduzir a conversa | **Zatten (modelo + prompt)** | tom, roteamento, follow-up |
| **Dados dinâmicos** (catálogo, preço, agenda, cliente, pedido) | **Tools do MCP Fluuy** | nunca via prompt/RAG — sempre tool |
| **Ações** (criar agendamento/pedido/lead, cadastrar) | **Tools do MCP Fluuy** (`write`) | marcam origem agente; confirmação humana p/ irreversível |
| **Conteúdo estático** (políticas, FAQ institucional) | **Base de conhecimento (RAG) da Zatten** | ver [07](07_base_conhecimento_e_microcopy.md) |
| **Handoff humano** | **Ação nativa "Transferência" da Zatten** (+ tool `solicitar_handoff` opcional) | ver [06](06_guardrails_e_handoff.md) |
| **Guard-rails** | **Camadas: prompt + tool** | clínico/emergência/"não inventar" reforçados nos dois |

**Princípio #0 (herdado do petshop):** o agente **nunca inventa** preço, estoque, horário, agenda
ou disponibilidade. Esses dados **só** vêm das tools do MCP. Se a tool não retornou, o agente
coleta/encaminha — não preenche a lacuna.

---

## 2. Índice

| Quero… | Leia |
|---|---|
| Configurar o agente na Zatten e conectar o MCP | [01_configuracao_e_conexao.md](01_configuracao_e_conexao.md) |
| O **prompt** pronto do agente (pt-BR) | [02_system_prompt.md](02_system_prompt.md) |
| **Tabela: tools do MCP × gatilhos** | [03_tools_mcp_e_gatilhos.md](03_tools_mcp_e_gatilhos.md) |
| **Tabela: endpoints e tabelas necessários** | [04_endpoints_e_tabelas.md](04_endpoints_e_tabelas.md) |
| Mapa das 41 skills → tool / ação nativa / prompt | [05_skills_para_tools.md](05_skills_para_tools.md) |
| Guard-rails em camadas + handoff | [06_guardrails_e_handoff.md](06_guardrails_e_handoff.md) |
| O que colocar na base de conhecimento + microcopy | [07_base_conhecimento_e_microcopy.md](07_base_conhecimento_e_microcopy.md) |
| **Skills da simulação petshop (Ação `fluuy_mcp`, WhatsApp do Fluuy)** | [08_skills_simulacao_petshop.md](08_skills_simulacao_petshop.md) |
| Registro de tools (máquina) | [tools/zatten-mcp-tools.spec.json](tools/zatten-mcp-tools.spec.json) |
| Pacote de skills da simulação (máquina) | [skills/zatten-petshop-skills.spec.json](skills/zatten-petshop-skills.spec.json) |

---

## 3. Arquitetura (recap)

```
Tutor (WhatsApp) → Agente Zatten (prompt + RAG)
   ├─ Ação MCP (URL + Bearer) → Fluuy MCP /api/mcp/mcp
   │      → tools de leitura/escrita (tenant pelo token; tutor pelo telefone)
   └─ Ação nativa "Transferência" → handoff humano
```

Cada petshop (tenant) tem **seu próprio agente Zatten** e **seu próprio token MCP** → o token
resolve o `tenant_id` no Fluuy. O agente passa o **telefone do contato** para as tools que
dependem do tutor.

---

## 4. Estado atual

- **Implementado (Fase 0):** endpoint MCP + auth por token + tool `info_estabelecimento`
  (validado: `initialize` + `tools/list` ao vivo).
- **Planejado (Fase 2):** tools de leitura (catálogo, planos, disponibilidade, tutor/pet, pedido,
  agenda).
- **Planejado (Fase 3):** tools de escrita (agendamento, pedido, lead, cadastro, handoff).

A coluna **Status** nas tabelas indica o que já existe vs. o que falta.
