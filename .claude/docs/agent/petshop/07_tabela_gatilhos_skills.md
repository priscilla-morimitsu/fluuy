# Tabela de gatilhos → skill

Mapa de **o que dispara cada skill** do agente petshop: frases típicas do tutor (pt-BR), eventos
de sistema e cron. É o índice operacional do classificador de intenção. Detalhe de cada skill em
[06_skills_agente.md](06_skills_agente.md); versão para máquina em
[skills/petshop-agent-skills.spec.json](skills/petshop-agent-skills.spec.json).

> Como ler: o classificador (skill **A3**) recebe a mensagem, identifica o `trigger_intent` pela
> coluna **Gatilhos**, extrai os **slots** (tabela 2) e executa a skill se a **feature** estiver
> ativa. Regras de prioridade/sobreposição na **tabela 4**.

---

## Tabela 1 — Gatilhos por skill (principal)

| ID | Skill | `trigger_intent` | Tipo | Gatilhos — exemplos de fala (pt-BR) / evento |
|---|---|---|---|---|
| **A1** | Saudação / boas-vindas | `initial_contact` | inbound | "oi", "olá", "bom dia", primeira mensagem da conversa |
| **A2** | Identificar tutor/pet | `contact_identification` | inbound/system | número novo na conversa; "sou a Ana, tutora do Thor" |
| **A3** | Roteamento de intenção | `intent_classification` | inbound | (toda mensagem passa pelo classificador) |
| **A4** | Info do estabelecimento | `store_info_inquiry` | inbound | "que horas abre?", "onde fica?", "tem estacionamento?", "aceita pix?", "qual o endereço?" |
| **A5** | Fora de horário | `off_hours_contact` | inbound | qualquer mensagem fora do expediente cadastrado |
| **A6** | Fora de escopo | `out_of_scope_question` | inbound | assunto não-pet / `forbidden_topics`; "você é robô?", piadas, spam |
| **A7** | Handoff humano | `human_handoff_request` | inbound/system | "quero falar com atendente", "me passa pra uma pessoa", "falar com humano" |
| **A8** | Encerramento | `conversation_closing` | inbound | "obrigado, era só isso", "valeu", "resolvido" |
| **AG1** | Preço de banho/tosa | `pet_grooming_price_inquiry` | inbound | "quanto custa o banho?", "valor da tosa", "preço banho e tosa cachorro grande" |
| **AG2** | Agendar banho/tosa | `pet_grooming_booking_request` | inbound | "quero marcar um banho", "tem horário pra tosa amanhã?", "agendar banho do meu cachorro" |
| **AG3** | Agendar veterinário | `pet_vet_appointment_request` | inbound | "marcar consulta", "quero levar no veterinário", "tem vet hoje?" |
| **AG4** | Agendar vacinação | `pet_vaccination_booking_request` | inbound | "preciso vacinar meu filhote", "tem vacina v10?", "antirrábica" |
| **AG5** | Consultar disponibilidade | `availability_inquiry` | inbound | "tem horário sábado?", "qual o próximo horário livre?", "atende domingo?" |
| **AG6** | Remarcar | `appointment_reschedule_request` | inbound | "preciso remarcar", "dá pra mudar pra outro dia?", "adiar o banho" |
| **AG7** | Cancelar | `appointment_cancel_request` | inbound | "quero cancelar o agendamento", "não vou poder levar" |
| **AG8** | Confirmar agendamento | `appointment_confirmation_response` | inbound | resposta a lembrete: "confirmo", "sim", "não vou", "pode confirmar" |
| **AG9** | Leva-e-traz (táxi dog) | `pet_pickup_delivery_request` | inbound | "vocês buscam em casa?", "tem leva e traz?", "busca e entrega do pet" |
| **V1** | Consultar produto | `pet_product_inquiry` | inbound | "tem ração golden 15kg?", "qual o preço da areia?", "vende antipulga?" |
| **V2** | Pedido de produto | `pet_product_order_request` | inbound | "quero comprar 2 sacos de ração", "me vê um sachê", "vocês entregam ração?" |
| **V3** | Recomendar ração/produto | `pet_food_recommendation` | inbound | "qual ração indica pro meu filhote?", "melhor ração pra gato castrado?" |
| **V4** | Consultar serviço | `pet_service_inquiry` | inbound | "vocês fazem tosa higiênica?", "tem hidratação?", "fazem hotel?" |
| **V5** | Orçamento | `quote_request` | inbound | "faz um orçamento de banho+tosa+unha?", "quanto fica tudo?" |
| **V6** | Interesse em plano | `pet_monthly_plan_interest` | inbound/system | "tem plano de banho mensal?", "pacote de banhos sai mais barato?"; recorrência detectada |
| **V7** | Status de pedido | `order_status_inquiry` | inbound | "cadê meu pedido?", "minha ração já saiu?", "status da compra" |
| **C1** | Capturar lead | `lead_capture` | inbound/system | primeiro contato de número desconhecido |
| **C2** | Qualificar lead | `lead_qualification` | inbound | "vim pelo instagram", "é pra um poodle", "moro no bairro X" |
| **C3** | Cadastrar pet | `pet_registration` | inbound | "meu cachorro chama Thor, é um golden de 2 anos" (ou embutido em AG2/V2) |
| **C4** | Cadastrar tutor | `customer_registration` | inbound | coleta de nome/telefone (embutido) |
| **C5** | Recompra de ração | `pet_food_repurchase_due` | **scheduled** | cron: estimativa de fim da ração do histórico |
| **C6** | Lembrete de banho | `pet_bath_reminder_due` | **scheduled** | cron: banho vencido pela frequência do pet |
| **C7** | Reativação de inativo | `inactive_customer_reactivation` | **scheduled** | cron: sem interação há X dias |
| **C8** | Indicação | `referral_capture` | inbound | "fui indicada pela Maria", "uma amiga falou de vocês" |
| **C9** | Resposta de campanha | `campaign_response` | inbound | "vi o anúncio", "tenho um cupom", "promo do dia das mães" |
| **S1** | Dúvida pós-serviço | `post_service_care_question` | inbound | "posso passar perfume depois do banho?", "quando pode molhar?" |
| **S2** | Dúvida vet sensível ⚠️ | `pet_veterinary_sensitive_question` | inbound | "meu cão está vomitando", "posso dar dipirona?", "que remédio dou?" |
| **S3** | Emergência 🚨 | `pet_emergency_case` | inbound | "meu cachorro comeu chocolate", "está convulsionando", "não para de sangrar", "engoliu osso" |
| **S4** | Reclamação | `complaint` | inbound | "a tosa ficou péssima", "meu pet voltou machucado", "atrasaram demais" |
| **S5** | Comprovante / 2ª via | `receipt_request` | inbound | "me manda o comprovante", "preciso da nota", "2ª via do pagamento" |
| **S6** | Atualizar cadastro | `profile_update_request` | inbound | "mudei de endereço", "novo telefone", "corrige o nome do pet" |
| **S7** | Política cancelamento | `policy_inquiry` | inbound | "qual a política de cancelamento?", "posso cancelar e ser reembolsado?" |
| **S8** | Carteira de vacinação | `vaccination_record_inquiry` | inbound | "quais vacinas meu pet já tomou?", "carteirinha de vacina" |

---

## Tabela 2 — Slots, gate e ação por skill

| ID | Feature gate | Slots-chave a extrair | Lê | Cria / atualiza | Handoff / guard |
|---|---|---|---|---|---|
| A1 | ai_agent | — | agent_configs | Conversation | — |
| A2 | ai_agent | telefone, nome, pet | Customer, Pet, CustomerLead | Conversation, CustomerLead | IDOR: só dono do número |
| A3 | ai_agent | intent, slots | histórico | — | ambiguidade → 1 pergunta |
| A4 | ai_agent | tópico | Tenant, FAQ | — | só dado cadastrado |
| A5 | ai_agent | — | expediente | (segue coletando) | — |
| A6 | ai_agent | — | forbidden_topics | — | nunca opinar em proibido |
| A7 | ai_agent + handoff_enabled | motivo | — | Conversation→human, notificação | agente silencia |
| A8 | ai_agent | — | — | Conversation→resolved | — |
| AG1 | service_catalog | serviço, porte, pelagem | Service+pricingBySize | — | sem porte → "a partir de" |
| AG2 | appointments, service_catalog | serviço, pet, porte, data, modalidade, endereço | Service, agenda, exigências | Customer?, Pet?, Appointment, Reminder | sem horário real / pet agressivo → handoff |
| AG3 | appointments (+vet) | pet, motivo, data | serviço vet, agenda | Appointment | sintoma → S2/S3 |
| AG4 | appointments (+vacina) | vacina, pet, idade, data | serviço vacina, pré-req | Appointment | não indicar protocolo |
| AG5 | appointments | serviço, data | agenda | — | não prometer encaixe |
| AG6 | appointments | agendamento, nova data | Appointment | status rescheduled + histórico + reminder | fora da política → handoff |
| AG7 | appointments | agendamento | Appointment | status cancelled + histórico | multa/no-show → humano |
| AG8 | appointments | confirma/recusa | Appointment | confirmed/cancelled | — |
| AG9 | deliveries (+appointments) | endereço/bairro, janela | cobertura cadastrada | anexa Appointment (at_home) | bairro fora → não prometer |
| V1 | product_catalog | categoria, marca, espécie, porte, peso | Product ativo | demanda (se sem match) | não inventar marca/estoque |
| V2 | orders (+deliveries) | itens+qtd, entrega/retirada, endereço | Product, Customer | Order rascunho, OrderItem, OrderAddress? | não cobra; equipe confirma |
| V3 | product_catalog | espécie, porte, idade, restrição | Pet, Product | — | terapêutica/prescrita → S2 |
| V4 | service_catalog | serviço | Service ativo | — | encadeia AG2/V5 |
| V5 | service_catalog (+orders) | itens do orçamento | Service, Product | oportunidade (Order/lead) | complexo → handoff |
| V6 | plans_catalog | porte, serviço, frequência | OfferPlan ativo | CustomerLead/Order offer_plan | não ativa/cobra plano |
| V7 | orders | pedido | Order do tutor | — | atraso → handoff; IDOR |
| C1 | lead_management | telefone, origem | — | CustomerLead | — |
| C2 | lead_management | pet, bairro, interesse, origem | — | CustomerLead, conversão | — |
| C3 | customer_entities | nome, espécie, raça, porte, sexo, nascimento | — | Pet | LGPD: pouco por vez |
| C4 | — | nome, telefone | — | Customer | consentimento |
| C5 | product_catalog + lead_management + opt-in | item recorrente | histórico | (oferta) | consentimento/frequência |
| C6 | appointments + opt-in | pet, último banho | histórico de banho | (oferta) | opt-in |
| C7 | lead_management + opt-in | cliente inativo | inatividade | (oferta) | respeitar opt-out |
| C8 | lead_management | quem indicou | — | CustomerLead (indicação) | — |
| C9 | lead_management | cupom/origem | campanha cadastrada | CustomerLead | só cupom válido |
| S1 | ai_agent | tópico do cuidado | FAQ/serviço | — | virou clínica → S2 |
| S2 | ai_agent | sintoma/medicação | — | (oferece consulta) | **sem diagnóstico/dose** |
| S3 | ai_agent | sinal de urgência | — | Conversation→human, notificação | **handoff imediato** |
| S4 | ai_agent | motivo da queixa | — | registro + handoff | não debater |
| S5 | orders | pedido/pagamento | Order, OrderPayment | — | financeiro → humano; IDOR |
| S6 | — | campo a atualizar | Customer/Pet | Customer/Pet | confirmar identidade |
| S7 | ai_agent | tipo de política | política cadastrada | — | não criar exceção |
| S8 | customer_entities | pet | registros do Pet | — | não emitir documento clínico |

---

## Tabela 3 — Léxico de classificação (palavras/sinais → intent)

Apoio ao classificador (não exaustivo; o agente usa NLU, não só keyword):

| Sinais na mensagem | Intent provável |
|---|---|
| "quanto", "valor", "preço" + banho/tosa | `pet_grooming_price_inquiry` |
| "marcar", "agendar", "horário", "tem vaga" | `*_booking_request` (banho/vet/vacina conforme objeto) |
| "remarcar", "mudar dia", "adiar" | `appointment_reschedule_request` |
| "cancelar", "não vou" | `appointment_cancel_request` |
| "confirmo", "sim/não" (após lembrete) | `appointment_confirmation_response` |
| "tem", "vende", "preço" + produto/marca | `pet_product_inquiry` |
| "comprar", "quero levar", "me vê", "entrega" | `pet_product_order_request` |
| "qual ração/indica/melhor pra" | `pet_food_recommendation` |
| "plano", "pacote", "mensal", "assinatura" | `pet_monthly_plan_interest` |
| "buscar", "leva e traz", "busca em casa" | `pet_pickup_delivery_request` |
| "falar com atendente/humano/pessoa" | `human_handoff_request` |
| "vomitando", "diarreia", "remédio", "dose", "machucado" | `pet_veterinary_sensitive_question` |
| "convulsão", "comeu chocolate/veneno", "sangrando", "não respira", "passando mal" | `pet_emergency_case` |
| "péssimo", "reclamação", "voltou ferido", "atrasaram" | `complaint` |
| "comprovante", "nota", "2ª via" | `receipt_request` |
| "horário", "endereço", "onde fica", "pix" | `store_info_inquiry` |

> Termos de **emergência** e de **dúvida clínica** têm prioridade: se aparecerem, sobrepõem
> qualquer outra intenção (ver tabela 4).

---

## Tabela 4 — Prioridade e sobreposição (override)

Quando mais de um gatilho casa, vence o de maior prioridade:

| Prioridade | Condição | Skill que assume |
|---|---|---|
| 0 (máxima) | sinal de **emergência** | **S3** (handoff imediato) |
| 1 | **sintoma/medicação/dosagem** | **S2** (sem clínica) |
| 1 | pedido explícito de **humano** | **A7** |
| 1 | **reclamação** relevante | **S4** |
| 2 | `assigneeType ≠ ai` (handoff ativo) | **nenhuma** — agente silencia |
| 2 | fora do expediente | **A5** (antes de fluxos comuns) |
| 3 | intenção transacional clara (agendar/pedir/plano) | AG*/V* correspondente |
| 4 | dúvida informacional | A4/V1/V4/S1 |
| 5 | saudação isolada | A1 |

---

## Tabela 5 — Gatilhos proativos (eventos/cron)

Disparados **sem** mensagem do tutor; só executam com **opt-in** válido.

| ID | Evento/cron | Condição | Ação |
|---|---|---|---|
| C5 | diário | data estimada de fim da ração ≤ X dias | oferecer recompra/pacote |
| C6 | diário | dias desde último banho ≥ frequência do pet | lembrar e oferecer reagendar/plano |
| C7 | semanal | sem interação/compra há ≥ X dias | reaproximar com oferta cadastrada |
| V6 (proativo) | em fluxo | Nª solicitação avulsa de banho | sugerir plano mensal |
| AG (lembrete) | antes do horário | `AppointmentReminder` agendado | enviar lembrete (resposta vai p/ AG8) |

---

### Notas de manutenção
- Ao criar/alterar uma skill, atualize **as tabelas acima**, o
  [catálogo de skills](06_skills_agente.md) **e** o
  [registro JSON](skills/petshop-agent-skills.spec.json) na mesma mudança (fonte única de verdade).
- Os `trigger_intent` aqui devem casar 1:1 com `workflow_templates.trigger_intent` quando essa
  tabela for criada.
