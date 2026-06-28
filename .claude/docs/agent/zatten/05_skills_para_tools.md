# Mapa — Skills do petshop → tool / ação nativa / prompt

Como cada uma das **41 skills** do petshop ([catálogo](../petshop/06_skills_agente.md)) é realizada
no agente Zatten: por uma **tool do MCP**, por uma **ação nativa da Zatten**, por **prompt/RAG**,
ou por um **fluxo proativo do Fluuy** (cron). Isso garante cobertura total sem buracos.

Legenda: 🔧 tool MCP · 🧩 ação nativa Zatten · 💬 prompt/RAG · ⏰ proativo (Fluuy).

---

## Atendimento
| Skill | Realização | Como |
|---|---|---|
| A1 saudação | 💬 | prompt (fluxo de conversa) |
| A2 identificar tutor/pet | 🔧 | `identificar_tutor` (+ `listar_pets`) no início |
| A3 roteamento de intenção | 💬 | o modelo escolhe a tool conforme o prompt |
| A4 info do estabelecimento | 🔧 | `info_estabelecimento` |
| A5 fora de horário | 🧩+💬 | horário configurado na Zatten + mensagem |
| A6 fora de escopo | 💬 | prompt (`forbidden_topics`) |
| A7 handoff humano | 🧩 | Ação **Transferência** (+ 🔧 `solicitar_handoff` p/ registrar) |
| A8 encerramento | 💬 | prompt |

## Agendamento
| Skill | Realização | Como |
|---|---|---|
| AG1 preço banho/tosa | 🔧 | `buscar_servicos` (preço por porte) |
| AG2 agendar banho/tosa | 🔧 | `consultar_disponibilidade` → `criar_agendamento` (+ cadastro se preciso) |
| AG3 agendar veterinário | 🔧 | `criar_agendamento` |
| AG4 agendar vacinação | 🔧 | `criar_agendamento` |
| AG5 consultar disponibilidade | 🔧 | `consultar_disponibilidade` |
| AG6 remarcar | 🔧 | `remarcar_agendamento` |
| AG7 cancelar | 🔧 | `cancelar_agendamento` |
| AG8 confirmar agendamento | 💬+🔧 | resposta a lembrete; confirmação reflete via `consultar_agendamentos` / tool de confirmação (Fase 3) |
| AG9 leva-e-traz | 🔧 | `criar_agendamento` (modalidade `at_home`) + `info_estabelecimento` (cobertura); feature `deliveries` |

## Vendas
| Skill | Realização | Como |
|---|---|---|
| V1 consultar produto | 🔧 | `buscar_produtos` |
| V2 pedido de produto | 🔧 | `criar_pedido_rascunho` |
| V3 recomendar ração | 🔧 | `buscar_produtos` + dados do pet (`identificar_tutor`/`listar_pets`) |
| V4 consultar serviço | 🔧 | `buscar_servicos` |
| V5 orçamento | 🔧 | `buscar_servicos` + `buscar_produtos` (+ `criar_pedido_rascunho` opcional) |
| V6 interesse em plano | 🔧 | `consultar_planos` (+ `registrar_lead`) |
| V7 status de pedido | 🔧 | `status_pedido` |

## Captação
| Skill | Realização | Como |
|---|---|---|
| C1 capturar lead | 🔧 | `registrar_lead` |
| C2 qualificar lead | 🔧+💬 | `registrar_lead` (atualiza) + perguntas guiadas |
| C3 cadastrar pet | 🔧 | `cadastrar_pet` |
| C4 cadastrar tutor | 🔧 | `cadastrar_tutor` |
| C5 recompra de ração | ⏰ | cron/campanha do Fluuy (opt-in) |
| C6 lembrete de banho | ⏰ | cron/campanha do Fluuy (opt-in) |
| C7 reativação de inativo | ⏰ | cron/campanha do Fluuy (opt-in) |
| C8 indicação | 🔧 | `registrar_lead` (origem = indicação) |
| C9 resposta de campanha | 🔧 | `registrar_lead` (cupom/origem) |

## Suporte
| Skill | Realização | Como |
|---|---|---|
| S1 dúvida pós-serviço | 💬 | prompt + RAG (orientações gerais) |
| S2 dúvida clínica sensível ⚠️ | 💬(+🔧/🧩) | guard-rail no prompt; oferece consulta (`criar_agendamento`) ou Transferência |
| S3 emergência 🚨 | 🧩 | Transferência imediata + prompt (orientar urgência) |
| S4 reclamação | 🧩 | Transferência (+ 🔧 `registrar_lead`/observação opcional) |
| S5 comprovante / 2ª via | 🔧+🧩 | `status_pedido` + Transferência (financeiro/emissão) |
| S6 atualizar cadastro | 🔧 | `cadastrar_tutor`/`cadastrar_pet` (modo atualização) |
| S7 política cancelamento | 💬 | prompt + RAG (política do tenant) |
| S8 carteira de vacinação | 🔧 | `listar_pets` (registros do pet) |

---

## Resumo da cobertura
- **🔧 tools (17):** dados dinâmicos e ações sobre o banco do Fluuy.
- **🧩 nativas Zatten:** handoff (Transferência) — e, opcionalmente, captura/agendamento nativos.
- **💬 prompt/RAG:** condução, escopo, limites clínicos, FAQ institucional.
- **⏰ proativo Fluuy:** recompra, lembrete de banho, reativação (cron + opt-in).

Toda skill tem um dono — nenhuma fica sem cobertura. Detalhe das tools em
[03](03_tools_mcp_e_gatilhos.md); guard-rails em [06](06_guardrails_e_handoff.md).
