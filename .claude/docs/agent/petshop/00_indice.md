# Agente de IA — Nicho Petshop · Documentação completa

> Base de conhecimento e especificação de comportamento do **agente de IA do Fluuy** para o
> nicho **petshop** (pequenos e médios), cobrindo **atendimento, agendamento, vendas, captação
> e suporte** a tutores e pets via WhatsApp.

Esta pasta é a **fonte de verdade do domínio petshop para o agente**. Ela descreve *o que o
agente precisa saber e fazer*; o *como implementar* segue as specs técnicas em
`.claude/docs/specs/` e o schema em `prisma/schema.prisma`.

---

## 1. Como usar esta documentação

| Quero… | Leia |
|---|---|
| Entender o catálogo de produtos do nicho | [01_dominio_produtos.md](01_dominio_produtos.md) |
| Entender o catálogo de serviços | [02_dominio_servicos.md](02_dominio_servicos.md) |
| Entender planos, pacotes e assinaturas | [03_dominio_planos_pacotes.md](03_dominio_planos_pacotes.md) |
| Conhecer os perfis de tutor e pet | [04_personas_tutores_pets.md](04_personas_tutores_pets.md) |
| Ver todos os fluxos de atendimento ponta a ponta | [05_fluxos_atendimento.md](05_fluxos_atendimento.md) |
| Ver a especificação de cada skill do agente | [06_skills_agente.md](06_skills_agente.md) |
| **Ver a tabela de gatilhos → skill** | **[07_tabela_gatilhos_skills.md](07_tabela_gatilhos_skills.md)** |
| Conhecer os limites, guard-rails e compliance | [08_limites_guardrails_compliance.md](08_limites_guardrails_compliance.md) |
| Consultar FAQ / base de conhecimento | [09_base_conhecimento_faq.md](09_base_conhecimento_faq.md) |
| Ver tom de voz e modelos de mensagem | [10_mensagens_microcopy.md](10_mensagens_microcopy.md) |
| Consumir o registro de skills (máquina) | [skills/petshop-agent-skills.spec.json](skills/petshop-agent-skills.spec.json) |

---

## 2. Princípio #0 — O agente nunca inventa dados

Esta é a regra que atravessa **todos** os documentos. O conteúdo de domínio (produtos,
serviços, preços, planos) descrito aqui é **um modelo de referência do mercado petshop
brasileiro**, usado para:

1. **calibrar** o cadastro inicial do tenant (que itens cadastrar, com quais atributos);
2. **treinar** o agente para reconhecer intenções e vocabulário do nicho;
3. **estruturar** os fluxos e as skills.

Em **tempo de execução**, o agente responde **exclusivamente** com base no catálogo **real e
ativo** daquele petshop (tenant). Ele **nunca** afirma preço, disponibilidade, raça atendida,
horário ou agenda que não exista nos dados cadastrados. Quando o dado não existe, ele coleta a
intenção, registra a oportunidade e/ou aciona handoff humano — **nunca preenche a lacuna com
suposição**. Ver regras completas em [08_limites_guardrails_compliance.md](08_limites_guardrails_compliance.md).

> **Premissa de região:** a análise de mercado deste documento usa como base o petshop de
> bairro brasileiro de pequeno/médio porte (preços em BRL, vocabulário pt-BR). Cada tenant
> calibra catálogo, preços, raças/portes atendidos e bairros de cobertura no seu próprio
> cadastro — o agente segue o cadastro, não este documento.

---

## 3. Os 5 contextos de atuação

A documentação e as skills estão organizadas nos cinco contextos pedidos:

| # | Contexto | O que cobre | Prefixo de skill |
|---|---|---|---|
| 1 | **Atendimento** | Recepção, identificação, roteamento, FAQ institucional, fora de horário, handoff | `A` |
| 2 | **Agendamento** | Banho/tosa, veterinário, vacinação, disponibilidade, remarcar/cancelar, leva-e-traz | `AG` |
| 3 | **Vendas** | Consulta e pedido de produtos, recomendação, orçamento, interesse em plano, status de pedido | `V` |
| 4 | **Captação** | Lead novo, qualificação, cadastro de tutor/pet, recompra, lembretes, reativação, indicação | `C` |
| 5 | **Suporte** | Pós-serviço, dúvida veterinária sensível, emergência, reclamação, comprovante, política | `S` |

---

## 4. Mapeamento conceito → schema real

O PRD usa termos genéricos multi-nicho. No MVP de petshop eles já têm tabelas concretas
(`prisma/schema.prisma`). O agente trabalha sobre **estas** tabelas:

| Conceito (PRD) | Aplicação petshop | Tabela/modelo real | O agente |
|---|---|---|---|
| Tenant | Petshop | `Tenant` | lê config |
| Customer | Tutor | `Customer` | lê / cria / atualiza |
| Customer Entity | Pet | `Pet` (colunas concretas, sem `custom_data` de template) | lê / cria / atualiza |
| Lead | Lead de WhatsApp | `CustomerLead` (feature `lead_management`) | cria / qualifica / converte |
| Product | Produto pet | `Product` (+ `ProductCategory`) | **só lê** (status `active`, `availableForSale`) |
| Service | Serviço pet | `Service` (+ `ServiceCategory`) | **só lê** (status `active`, `availableForBooking`) |
| Plan | Plano/pacote/combo | `OfferPlan` (+ `…ServiceItem`/`…ProductItem`) | **só lê** (status `active`) |
| Request (pedido) | Pedido de produto/serviço | `Order` (+ `OrderItem`, `OrderPayment`) | cria rascunho (`source = whatsapp`) |
| Request (agendamento) | Agendamento | `Appointment` (+ histórico, lembretes) | cria (`source = ai/whatsapp`, `createdByAgent = true`) |
| Conversa | Conversa WhatsApp | `Conversation` | lê / atualiza status e assignee |
| Mensagem | Mensagem | `ConversationMessage` (`sentByAgent`) | cria saída / lê entrada |
| Agent config | Config do agente | *(planejado — `agent_configs`)* | lê regras/tom/limites |
| Workflow | Fluxo/skill | *(planejado — `workflow_templates`/`runs`)* | executa |

> **Estado atual:** as tabelas de catálogo, cliente/pet, lead, pedido, agendamento, conversa e
> mensagem **já existem**. As tabelas de **configuração do agente e de workflows ainda não
> foram modeladas** (as páginas `/agents`, `/workflows`, `/knowledge-base` são placeholders).
> Esta documentação é a especificação que orienta essa modelagem — ver
> [06_skills_agente.md](06_skills_agente.md) §"Implicações de modelagem".

### "agent_paused" no schema real

O PRD fala em `agent_paused`/handoff. No schema construído isso é representado por
`Conversation.assigneeType`:

- `ai` → o agente pode responder;
- `human` / `paused` → **o agente não responde** (handoff ativo);
- `unassigned` → aguardando roteamento.

E por `Conversation.status` (`open`, `pending`, `resolved`, `archived`, `blocked`). O agente só
gera resposta quando `assigneeType = ai` **e** `status ∈ {open, pending}` **e** há consentimento
(`optInStatus`) válido.

---

## 5. Features-flags relevantes (gate por módulo)

Cada skill depende de uma ou mais features habilitadas para o tenant (`tenant_features`). Antes
de executar, o agente verifica o gate:

| Feature key (sugerida) | Habilita |
|---|---|
| `whatsapp_inbox` | Receber/responder no WhatsApp (base de tudo) |
| `ai_agent` | Respostas automáticas do agente |
| `product_catalog` | Skills de consulta/pedido de produto |
| `service_catalog` | Skills de consulta de serviço |
| `appointments` | Skills de agendamento |
| `orders` | Skills de pedido |
| `plans_catalog` | Skills de planos/pacotes |
| `lead_management` | Skills de captação/lead |
| `deliveries` | Leva-e-traz / busca e entrega |

> Os nomes acima são a convenção esperada; confirme as keys reais em `Feature`/`tenant_features`
> antes de implementar o gate. Uma skill sem sua feature habilitada **não** deve executar (nem
> mencionar o serviço como disponível).

---

## 6. Convenções dos documentos

- Idioma de produto: **pt-BR** (mesma voz do app).
- `trigger_intent` em `snake_case` — é a chave canônica que liga gatilho → skill → workflow.
- Cada skill tem um id curto (`A1`, `AG2`, `V6`…) estável entre os documentos.
- Preços e exemplos são ilustrativos do mercado; **não** são tabela de preço de nenhum tenant.
- Quando um documento referenciar outro, use o link relativo.

---

## 7. Changelog

| Data | Mudança |
|---|---|
| 2026-06-28 | Versão inicial completa (domínio, personas, fluxos, skills, gatilhos, guard-rails, FAQ, microcopy, registro JSON). |
