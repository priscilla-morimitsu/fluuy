# Catálogo de skills do agente petshop

Especificação de cada **skill** (unidade de capacidade do agente, equivalente a um
`workflow_template` com `trigger_intent`). Agrupadas pelos 5 contextos. A tabela de gatilhos
(exemplos de fala → skill) está em [07_tabela_gatilhos_skills.md](07_tabela_gatilhos_skills.md);
o registro legível por máquina em [skills/petshop-agent-skills.spec.json](skills/petshop-agent-skills.spec.json).

**Legenda do template de skill**
- **ID / intent** — identificador estável e `trigger_intent` (snake_case).
- **Tipo** — `inbound` (mensagem do tutor), `system` (evento), `scheduled` (cron).
- **Gate** — feature(s) que precisam estar ativas.
- **Slots** — dados que a skill extrai/coleta.
- **Lê / Escreve** — tabelas (`tenant_id` sempre da sessão).
- **Saída** — resultado esperado.
- **Handoff/guard** — quando para e transfere.

---

## 1. ATENDIMENTO (A)

### A1 · saudacao_boas_vindas — `initial_contact`
- **Tipo:** inbound · **Gate:** ai_agent
- **Slots:** —
- **Lê:** `agent_configs.welcome_message`, `Tenant` · **Escreve:** `Conversation` (status/timestamps)
- **Passos:** saudar com o tom configurado → sinalizar como pode ajudar → seguir p/ A2/A3.
- **Saída:** boas-vindas + convite. **Guard:** não prometer nada antes de identificar intenção.

### A2 · identificacao_tutor_pet — `contact_identification`
- **Tipo:** inbound/system · **Gate:** ai_agent
- **Slots:** telefone (do canal), nome, pet
- **Lê:** `Customer`/`Pet` por telefone normalizado, `CustomerLead` · **Escreve:** vínculo
  `Conversation.customerId`/`leadId`; cria `CustomerLead` se desconhecido.
- **Saída:** contexto do tutor/pet carregado. **Guard:** nunca expor dados de outro cliente
  (IDOR); só o dono do número.

### A3 · roteamento_intencao — `intent_classification`
- **Tipo:** inbound · **Gate:** ai_agent
- **Lê:** mensagem + histórico recente · **Escreve:** —
- **Passos:** classificar `trigger_intent` + extrair slots → resolver skill (tabela de gatilhos)
  → checar gate da skill. **Guard:** ambiguidade → perguntar 1 vez; sensível/urgente sobrepõe.

### A4 · info_estabelecimento — `store_info_inquiry`
- **Tipo:** inbound · **Gate:** ai_agent
- **Slots:** tópico (horário/endereço/pagamento/serviços oferecidos)
- **Lê:** `Tenant` + [FAQ](09_base_conhecimento_faq.md) · **Escreve:** —
- **Saída:** resposta objetiva + gancho (agendar/pedir). **Guard:** só dado cadastrado.

### A5 · fora_horario — `off_hours_contact`
- **Tipo:** inbound · **Gate:** ai_agent
- **Lê:** expediente do `Tenant`, `off_hours_message` · **Escreve:** pode seguir coletando.
- **Saída:** aviso de horário + expectativa de retorno; quando possível, adianta agendamento/
  pedido para a equipe processar depois.

### A6 · fora_escopo — `out_of_scope_question`
- **Tipo:** inbound · **Gate:** ai_agent
- **Lê:** `agent_configs.forbidden_topics`/`fallback_message` · **Escreve:** —
- **Saída:** declina com elegância e redireciona ao que o petshop faz. **Guard:** nunca opinar
  sobre assunto proibido.

### A7 · handoff_humano — `human_handoff_request`
- **Tipo:** inbound/system · **Gate:** ai_agent + handoff_enabled
- **Escreve:** `Conversation.assigneeType → human` (ou `paused`), `status → pending`; notifica
  responsável (`ConversationAssignment`).
- **Saída:** confirma transferência ao tutor. **Guard:** após handoff, **agente silencia**.

### A8 · encerramento — `conversation_closing`
- **Tipo:** inbound · **Gate:** ai_agent
- **Escreve:** `Conversation.status → resolved` (quando apropriado).
- **Saída:** agradece, deixa porta aberta, registra resumo.

---

## 2. AGENDAMENTO (AG)

### AG1 · consulta_preco_banho_tosa — `pet_grooming_price_inquiry`
- **Tipo:** inbound · **Gate:** service_catalog
- **Slots:** serviço, porte, pelagem, espécie
- **Lê:** `Service` ativo + `customData.pricingBySize` · **Escreve:** —
- **Saída:** preço exato (se porte conhecido) ou "a partir de" + pergunta o porte; encadeia AG2.
- **Guard:** nunca cravar valor sem porte; só preço cadastrado.

### AG2 · agendar_banho_tosa — `pet_grooming_booking_request` ⭐
- **Tipo:** inbound · **Gate:** appointments + service_catalog (+ deliveries se em casa)
- **Slots:** serviço, pet, porte/pelagem, data/hora, modalidade, endereço (se domicílio)
- **Lê:** `Service`, agenda/`ServiceAvailabilityRule`, `Professional`, exigências (`customData`)
- **Escreve:** `Customer?`, `Pet?`, `Appointment` (`source=ai`,`createdByAgent=true`),
  `AppointmentStatusHistory`, `AppointmentReminder`
- **Passos:** identificar tutor/pet → confirmar serviço/porte → checar vacina/avaliação →
  oferecer horários reais → coletar modalidade/endereço → criar agendamento (status conforme
  `human_confirmation_required`) → programar lembrete.
- **Saída:** resumo + status. **Guard:** não confirmar horário inexistente; pet agressivo/
  exigência não cumprida → handoff.

### AG3 · agendar_veterinario — `pet_vet_appointment_request`
- **Tipo:** inbound · **Gate:** appointments (+ feature vet do tenant)
- **Como AG2**, sem triagem clínica. Dúvida do motivo → registra em `customerNotes`; sintoma →
  S2/S3. **Guard:** não fazer pré-diagnóstico.

### AG4 · agendar_vacinacao — `pet_vaccination_booking_request`
- **Tipo:** inbound · **Gate:** appointments (+ feature vacina)
- **Slots:** vacina (do catálogo), pet, idade, data
- **Lê:** serviço de vacina, pré-requisitos cadastrados · **Escreve:** `Appointment`
- **Guard:** não indicar protocolo vacinal por conta própria; confirmar com cadastro/profissional.

### AG5 · consultar_disponibilidade — `availability_inquiry`
- **Tipo:** inbound · **Gate:** appointments
- **Lê:** agenda real · **Saída:** janelas existentes. **Guard:** não prometer encaixe.

### AG6 · remarcar_agendamento — `appointment_reschedule_request`
- **Tipo:** inbound · **Gate:** appointments
- **Lê:** `Appointment` do tutor · **Escreve:** status `rescheduled` + novo horário + histórico
  (`changedByAgent=true`) + lembrete. **Guard:** fora da política de antecedência → handoff.

### AG7 · cancelar_agendamento — `appointment_cancel_request`
- **Tipo:** inbound · **Gate:** appointments
- **Escreve:** status `cancelled`, `cancelledAt`, histórico. **Guard:** regra de no-show/multa →
  informar política cadastrada; cobrança → humano.

### AG8 · confirmar_agendamento — `appointment_confirmation_response`
- **Tipo:** inbound (resposta a lembrete) · **Gate:** appointments
- **Escreve:** `confirmed`/`cancelled` (+ timestamps). **Saída:** confirmação curta.

### AG9 · leva_e_traz — `pet_pickup_delivery_request`
- **Tipo:** inbound · **Gate:** deliveries (+ appointments)
- **Slots:** endereço/bairro, janela
- **Lê:** cobertura de bairros cadastrada · **Escreve:** anexa ao `Appointment` (`at_home`)
- **Guard:** bairro fora da cobertura → não prometer; oferecer alternativa.

---

## 3. VENDAS (V)

### V1 · consultar_produto — `pet_product_inquiry`
- **Tipo:** inbound · **Gate:** product_catalog
- **Slots:** categoria, marca, espécie, porte, peso/sabor
- **Lê:** `Product` ativo (`availableForSale`) filtrado · **Escreve:** registra demanda se sem match
- **Saída:** poucos itens + preço/promoção. **Guard:** não inventar marca/estoque.

### V2 · pedido_produto — `pet_product_order_request`
- **Tipo:** inbound · **Gate:** orders (+ deliveries se entrega)
- **Slots:** itens+quantidade, entrega/retirada, endereço
- **Lê:** `Product`, `Customer` · **Escreve:** `Order` rascunho (`source=whatsapp`,
  `pending_confirmation`), `OrderItem`, `OrderAddress?`
- **Saída:** resumo do pedido + próximo passo. **Guard:** **não processa pagamento**; equipe
  confirma disponibilidade.

### V3 · recomendar_racao — `pet_food_recommendation`
- **Tipo:** inbound · **Gate:** product_catalog
- **Lê:** `Pet` (espécie/porte/idade) + `Product` compatível · **Saída:** recomendação comercial
  + cross-sell ativo. **Guard:** ração terapêutica/prescrita → S2, não como escolha livre.

### V4 · consultar_servico — `pet_service_inquiry`
- **Tipo:** inbound · **Gate:** service_catalog
- **Lê:** `Service` ativo · **Saída:** descrição + preço por porte. Encadeia AG2/V5.

### V5 · solicitar_orcamento — `quote_request`
- **Tipo:** inbound · **Gate:** service_catalog (+ orders)
- **Lê:** serviços/produtos · **Escreve:** oportunidade (`Order` rascunho/lead)
- **Saída:** estimativa só com itens cadastrados. **Guard:** caso complexo → handoff.

### V6 · interesse_plano — `pet_monthly_plan_interest`
- **Tipo:** inbound/system · **Gate:** plans_catalog
- **Lê:** `OfferPlan` ativo compatível (porte/serviço) · **Escreve:** `CustomerLead`/`Order`
  rascunho item `offer_plan`
- **Saída:** 1–2 planos + benefício + oferta de fechamento via humano. **Guard:** não ativa
  assinatura nem cobra; só itens cadastrados (ver [planos](03_dominio_planos_pacotes.md)).

### V7 · status_pedido — `order_status_inquiry`
- **Tipo:** inbound · **Gate:** orders
- **Lê:** `Order` do tutor · **Saída:** status real. **Guard:** atraso/divergência → handoff;
  só pedidos do próprio tutor (IDOR).

---

## 4. CAPTAÇÃO (C)

### C1 · captura_lead — `lead_capture`
- **Tipo:** inbound/system · **Gate:** lead_management
- **Escreve:** `CustomerLead` (nome, telefone, origem). **Saída:** segue p/ C2.

### C2 · qualificacao_lead — `lead_qualification`
- **Tipo:** inbound · **Gate:** lead_management
- **Slots:** pet (espécie/porte/raça), bairro, interesse, origem, urgência
- **Escreve:** `CustomerLead.status`/dados; converte em `Customer`/`Pet` quando avança.
- **Saída:** lead qualificado roteado (agendar/pedir/plano).

### C3 · cadastro_pet — `pet_registration`
- **Tipo:** inbound (embutido) · **Gate:** customer_entities
- **Slots:** nome, espécie, raça, porte, sexo, nascimento aprox., temperamento, healthNotes
- **Escreve:** `Pet`. **Guard:** coletar pouco por vez; LGPD (só necessário).

### C4 · cadastro_tutor — `customer_registration`
- **Tipo:** inbound (embutido) · **Gate:** —
- **Escreve:** `Customer` (nome + telefone mínimo). **Guard:** consentimento; não pedir dado
  sensível desnecessário.

### C5 · recompra_racao — `pet_food_repurchase_due`
- **Tipo:** **scheduled** · **Gate:** product_catalog + lead_management + opt-in
- **Lê:** histórico de compra/estimativa de consumo · **Saída:** lembrete + oferta de pedido
  (V2)/pacote. **Guard:** respeitar consentimento e frequência (anti-spam).

### C6 · lembrete_banho — `pet_bath_reminder_due`
- **Tipo:** **scheduled** · **Gate:** appointments + opt-in
- **Lê:** último banho + frequência do pet · **Saída:** lembrete + reagendar (AG2)/plano (V6).

### C7 · reativacao_inativo — `inactive_customer_reactivation`
- **Tipo:** **scheduled** · **Gate:** lead_management + opt-in
- **Lê:** clientes inativos há X dias · **Saída:** reaproximação com oferta cadastrada.
- **Guard:** respeitar opt-out; oferta real.

### C8 · indicacao — `referral_capture`
- **Tipo:** inbound · **Gate:** lead_management
- **Escreve:** lead com origem "indicação". **Saída:** acolhe e conduz à conversão.

### C9 · resposta_campanha — `campaign_response`
- **Tipo:** inbound · **Gate:** lead_management
- **Slots:** cupom/origem (anúncio) · **Escreve:** lead com `source`/cupom. **Guard:** só validar
  cupom/condição cadastrada.

---

## 5. SUPORTE (S)

### S1 · duvida_pos_servico — `post_service_care_question`
- **Tipo:** inbound · **Gate:** ai_agent
- **Lê:** orientações cadastradas/[FAQ](09_base_conhecimento_faq.md) · **Saída:** orientação geral
  (cuidados, não-clínica). **Guard:** virou clínica → S2.

### S2 · duvida_veterinaria_sensivel — `pet_veterinary_sensitive_question` ⚠️
- **Tipo:** inbound · **Gate:** ai_agent
- **Comportamento:** **não diagnostica, não prescreve, não dá dosagem.** Acolhe, recomenda
  avaliação profissional, oferece consulta (se houver) e/ou handoff. **Saída:** orientação segura
  + caminho. Ver [guard-rails](08_limites_guardrails_compliance.md).

### S3 · emergencia_pet — `pet_emergency_case` 🚨
- **Tipo:** inbound · **Prioridade máxima** (sobrepõe tudo) · **Gate:** ai_agent
- **Comportamento:** mensagem curta orientando atendimento de urgência + **handoff imediato** +
  notificar responsável. **Não** conduz triagem. **Escreve:** `assigneeType→human`, notificação.

### S4 · reclamacao — `complaint`
- **Tipo:** inbound · **Gate:** ai_agent
- **Escreve:** registra (lead/observação) + handoff. **Saída:** empatia + transferência.
- **Guard:** não debater, não minimizar, não prometer compensação.

### S5 · comprovante_2via — `receipt_request`
- **Tipo:** inbound · **Gate:** orders
- **Lê:** `Order`/`OrderPayment` do tutor · **Saída:** status/dado cadastrado; emissão/financeiro
  → humano. **Guard:** IDOR (só pedidos do próprio tutor).

### S6 · atualizar_cadastro — `profile_update_request`
- **Tipo:** inbound · **Gate:** —
- **Escreve:** `Customer`/`Pet` (campos não sensíveis). **Guard:** confirmar identidade do dono
  do número; mudança crítica → humano.

### S7 · politica_cancelamento — `policy_inquiry`
- **Tipo:** inbound · **Gate:** ai_agent
- **Lê:** política cadastrada (FAQ/tenant) · **Saída:** texto da política. **Guard:** não criar
  exceção; aplicação concreta → humano.

### S8 · carteira_vacinacao — `vaccination_record_inquiry`
- **Tipo:** inbound · **Gate:** customer_entities
- **Lê:** registros do `Pet` (`healthNotes`/anexos cadastrados) · **Saída:** o que está
  registrado. **Guard:** não emitir documento clínico; lacuna → orientar vet/handoff.

---

## 6. Skills proativas × consentimento

`C5`, `C6`, `C7` (e ofertas proativas de `V6`) são **disparadas por evento/cron**, não por
mensagem. Elas só podem enviar mensagem ativa quando:
- a feature está ativa **e**
- há **consentimento/opt-in** válido (`Conversation.optInStatus`, `MessageConsent`) **e**
- respeitam janela/frequência e o opt-out do tutor.

Caso contrário, **não enviam** (viram tarefa interna para a equipe, se aplicável).

---

## 7. Implicações de modelagem (estado atual → necessário)

As tabelas de catálogo, cliente/pet, lead, pedido, agendamento, conversa e mensagem **já
existem**. Para o agente executar estas skills, ainda é preciso modelar (specs do PRD §10 /
MVP §3.11–3.17):

- **`agent_configs`** (por tenant): nome, tom, mensagens (welcome/off-hours/fallback),
  `handoff_enabled`, `human_confirmation_required`, `forbidden_topics`, `rules`.
- **`workflow_templates`** (por nicho) + **`tenant_workflows`** (habilitação por tenant) +
  **`workflow_runs`** (execução por conversa): persistem `trigger_intent`, passos, `collected_data`.
- Opcional no MVP: tabela genérica `requests` — no schema atual a "solicitação" já é concreta
  (`Order`/`Appointment`/`CustomerLead`), então as skills criam **esses** registros.

> Toda nova tabela tenant-scoped exige índice em `tenant_id` (e GIN em `custom_data` se for
> filtrada) — ver guard-rails de isolamento em
> [08_limites_guardrails_compliance.md](08_limites_guardrails_compliance.md).
