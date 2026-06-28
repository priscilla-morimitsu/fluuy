# Fluxos de atendimento — ponta a ponta

Mapa de **todos os fluxos** do agente petshop, agrupados pelos 5 contextos. Cada fluxo lista
gatilho, pré-condições, passos, dados lidos/escritos, saída e quando faz handoff. As skills
referenciadas estão detalhadas em [06_skills_agente.md](06_skills_agente.md); os gatilhos, em
[07_tabela_gatilhos_skills.md](07_tabela_gatilhos_skills.md).

---

## 0. Orquestração — o ciclo de vida de uma mensagem

Todo fluxo nasce do mesmo pipeline:

```
WhatsApp (Pilot Status) → webhook → persistir ConversationMessage (inbound)
  → resolver tenant (pelo número) e Conversation
  → GATES: feature whatsapp_inbox + ai_agent ativos?
           assigneeType == ai?  status ∈ {open,pending}?  optInStatus válido?
       ├─ não → não responder (humano no controle / sem consentimento)
       └─ sim ↓
  → horário de expediente? ── não → SKILL A5 (fora de horário)
  → classificar intenção (trigger_intent) + extrair slots
  → resolver SKILL (ver tabela de gatilhos) e checar feature-gate da skill
  → identificar tutor/pet (A2) se necessário
  → executar passos da skill (coletar dados faltantes → ler catálogo/agenda → agir)
  → CRIAR registro quando aplicável (Customer/Pet/Lead/Order/Appointment)
  → responder (ConversationMessage outbound, sentByAgent=true)
  → avaliar handoff (sensível/urgente/limite) → mudar assigneeType e notificar
  → registrar evento/insight
```

**Regras transversais** (valem para todos os fluxos):
- `tenant_id` **sempre** da sessão resolvida, nunca do conteúdo do cliente.
- O agente **para de responder** assim que `assigneeType ≠ ai` (handoff ativo).
- O agente **nunca inventa** dado de catálogo/agenda/preço.
- Toda criação feita pela IA marca origem (`source = whatsapp/ai`, `createdByAgent = true`).
- Toda dúvida clínica sensível ou urgência **sobrepõe** o fluxo atual e vira S2/S3.

---

## 1. Contexto: ATENDIMENTO

### F-A.1 Recepção e roteamento (entrada de qualquer conversa)
- **Gatilho:** primeira mensagem / `initial_contact`.
- **Passos:** saudar (A1, usar `welcome_message`) → identificar tutor/pet pelo número (A2) →
  classificar intenção (A3) → encaminhar ao fluxo correto.
- **Escreve:** atualiza `Conversation` (status, `lastInboundAt`); pode criar `CustomerLead` se
  número desconhecido.
- **Saída:** conversa roteada para o contexto certo.

### F-A.2 Informações do estabelecimento (FAQ institucional)
- **Gatilho:** "que horas abre?", "onde fica?", "aceita pix?", "tem estacionamento?" →
  `store_info_inquiry` (A4).
- **Lê:** dados do `Tenant`/config (horário, endereço, formas de pagamento) e
  [FAQ](09_base_conhecimento_faq.md).
- **Saída:** resposta objetiva; pode encadear oferta (agendar/pedir).

### F-A.3 Fora de horário
- **Gatilho:** mensagem fora do expediente → A5 (`off_hours_contact`).
- **Saída:** `off_hours_message`, expectativa de retorno, e — quando possível — segue coletando
  (pode agendar/registrar para a equipe ver depois).

### F-A.4 Fora de escopo / handoff
- **Gatilho:** assunto proibido/irrelevante (A6) ou pedido explícito de humano (A7).
- **Saída:** A6 declina com elegância e redireciona; A7 troca `assigneeType → human/paused`,
  notifica responsável e silencia o agente.

---

## 2. Contexto: AGENDAMENTO

### F-AG.1 Consulta de preço de banho/tosa
- **Gatilho:** "quanto custa banho?" → `pet_grooming_price_inquiry` (AG1).
- **Lê:** `Service` ativo (banho/tosa) + `customData.pricingBySize`.
- **Lógica:** se souber porte/pelagem do pet → preço exato; senão → "a partir de R$ X" + pergunta
  o porte. **Nunca** crava valor sem porte.
- **Saída:** preço/faixa + convite a agendar (encadeia AG2).

### F-AG.2 Agendar banho/tosa  ⭐ fluxo central do nicho
- **Gatilho:** "quero marcar banho" → `pet_grooming_booking_request` (AG2).
- **Pré:** feature `appointments` + `service_catalog`; serviço `availableForBooking`.
- **Passos:**
  1. Identificar/cadastrar tutor (A2/C4) e **pet** (C3) — exige `Pet`.
  2. Confirmar serviço e **porte/pelagem** (preço/duração).
  3. Checar **carteira de vacinação** se o tenant exige; checar se requer **avaliação**.
  4. Oferecer horários disponíveis (lê agenda/`ServiceAvailabilityRule`/profissional).
  5. Coletar modalidade (`at_location`/`at_home`) e, se em casa/leva-e-traz, endereço/bairro.
  6. **Criar `Appointment`** (`source=ai`, `createdByAgent=true`, status `requested`/
     `pending_confirmation` conforme `human_confirmation_required`).
  7. Programar `AppointmentReminder`.
- **Escreve:** `Customer?`, `Pet?`, `Appointment`, `AppointmentStatusHistory`, `AppointmentReminder`.
- **Saída:** resumo do agendamento + status ("aguardando confirmação da equipe", se aplicável).
- **Handoff:** pet agressivo sem manejo, exceção de agenda, exigência não cumprida.

### F-AG.3 Agendar veterinário / vacinação
- **Gatilho:** AG3 (`pet_vet_appointment_request`) / AG4 (`pet_vaccination_booking_request`).
- **Pré:** features de vet/vacina ativas para o tenant; serviço cadastrado.
- **Passos:** como AG2, porém **sem triagem clínica**. Para vacina, confirma qual vacina (do
  catálogo) e pré-requisitos cadastrados (ex.: vermifugação, idade). Dúvida clínica → S2.
- **Saída:** `Appointment` de consulta/vacina.

### F-AG.4 Consultar disponibilidade
- **Gatilho:** "tem horário sábado?" → `availability_inquiry` (AG5).
- **Lê:** agenda real. Só apresenta janelas existentes; **não** promete encaixe.

### F-AG.5 Remarcar / cancelar
- **Gatilho:** AG6 (remarcar) / AG7 (cancelar).
- **Passos:** localizar `Appointment` do tutor → aplicar política (antecedência/no-show) →
  atualizar status (`rescheduled`/`cancelled`) com `AppointmentStatusHistory`
  (`changedByAgent=true`) → reprogramar lembrete. Fora da política → handoff.

### F-AG.6 Confirmação de lembrete
- **Gatilho:** resposta a lembrete ("confirmo"/"não vou") → AG8.
- **Escreve:** `Appointment.status` → `confirmed` ou `cancelled`; `confirmedAt`/`cancelledAt`.

### F-AG.7 Leva-e-traz (táxi dog)
- **Gatilho:** "vocês buscam?" → `pet_pickup_delivery_request` (AG9).
- **Pré:** feature `deliveries`; **bairro na cobertura cadastrada**.
- **Passos:** validar bairro/janela → anexar ao agendamento (`modality=at_home`/endereço) →
  registrar. Bairro fora da cobertura → informa e oferece alternativa (na loja), **sem prometer**.

---

## 3. Contexto: VENDAS

### F-V.1 Consulta de produto
- **Gatilho:** "tem ração X?" → `pet_product_inquiry` (V1).
- **Lê:** `Product` ativo filtrando por marca/espécie/porte/peso (slots). Apresenta poucos itens
  + preço/promoção cadastrados. Sem match → registra demanda e oferece alternativa.

### F-V.2 Pedido de produto
- **Gatilho:** "quero comprar / me vê 2 pacotes" → `pet_product_order_request` (V2).
- **Pré:** feature `orders` (+ `deliveries` se entrega).
- **Passos:** identificar tutor → montar itens (`OrderItem` `product`) → escolher
  **entrega/retirada** (e endereço/bairro se entrega) → **criar `Order` rascunho**
  (`source=whatsapp`, status `pending_confirmation`) → informar que a equipe confirma
  disponibilidade/pagamento. **Não** processa pagamento.
- **Escreve:** `Order`, `OrderItem`, `OrderAddress?`.
- **Saída:** resumo do pedido + próximo passo (confirmação humana / link de pagamento manual).

### F-V.3 Recomendação de produto/ração
- **Gatilho:** "qual ração indica?" → `pet_food_recommendation` (V3).
- **Lê:** atributos do `Pet` (espécie/porte/idade) + `Product` ativo compatível.
- **Limite:** recomendação **comercial** dentro do catálogo; **não** indica ração terapêutica/
  prescrita como escolha livre (→ S2). Faz cross-sell coerente (petisco/suplemento ativo).

### F-V.4 Consulta de serviço / orçamento
- **Gatilho:** V4 (`pet_service_inquiry`) / V5 (`quote_request`).
- **Passos:** descrever serviço e preço por porte (do cadastro) → para orçamento composto,
  coletar dados e montar estimativa **apenas** com itens cadastrados; casos complexos → handoff.

### F-V.5 Interesse em plano
- **Gatilho:** "tem plano de banho?" / recorrência detectada → `pet_monthly_plan_interest` (V6).
- **Passos:** ver [03_dominio_planos_pacotes.md](03_dominio_planos_pacotes.md) §3 — apresentar
  plano(s) compatível(is), registrar oportunidade (`CustomerLead`/`Order` rascunho `offer_plan`),
  oferecer handoff p/ fechamento. **Não** ativa assinatura nem cobra.

### F-V.6 Status de pedido
- **Gatilho:** "cadê meu pedido?" → `order_status_inquiry` (V7).
- **Lê:** `Order` do tutor (status real). Informa status; divergência/atraso → handoff.

---

## 4. Contexto: CAPTAÇÃO

### F-C.1 Lead novo + qualificação
- **Gatilho:** número desconhecido / primeiro contato → `lead_capture` (C1) → `lead_qualification` (C2).
- **Pré:** feature `lead_management`.
- **Passos:** criar/atualizar `CustomerLead` → coletar nome, pet (espécie/porte/raça), bairro,
  interesse (serviço/produto/plano), origem → marcar `status` do lead → encaminhar ao fluxo de
  intenção (agendar/pedir/plano). Lead "quente" pode ser convertido em `Customer` (helper de
  conversão preserva dados).
- **Escreve:** `CustomerLead` (+ conversão p/ `Customer`/`Pet` quando avança).

### F-C.2 Cadastro de tutor / pet
- **Gatilho:** C4 (`customer_registration`) / C3 (`pet_registration`), normalmente embutido em
  outro fluxo (agendar/pedir).
- **Passos:** coletar dados mínimos (tutor: nome + telefone; pet: nome, espécie, porte, raça,
  sexo, nascimento aprox.) com mínimo de atrito (1–2 perguntas por vez) → criar `Customer`/`Pet`.
- **LGPD:** coletar só o necessário; registrar consentimento.

### F-C.3 Recompra de ração (proativo)
- **Gatilho:** **evento/cron** — estimativa de fim da ração (data + porte/consumo) →
  `pet_food_repurchase_due` (C5).
- **Pré:** `optInStatus` válido (mensagem ativa proativa).
- **Passos:** lembrar recompra do item do histórico → oferecer pedido (V2) / pacote.
- **Limite:** respeitar consentimento e frequência (não spammar).

### F-C.4 Lembrete de banho (proativo)
- **Gatilho:** **cron** — banho "vencido" pela frequência do pet → `pet_bath_reminder_due` (C6).
- **Passos:** lembrar e oferecer reagendar (AG2) / plano (V6).

### F-C.5 Reativação de inativo (proativo)
- **Gatilho:** **cron** — cliente sem interação há X dias → `inactive_customer_reactivation` (C7).
- **Passos:** reaproximar com oferta **cadastrada**; respeitar opt-out.

### F-C.6 Indicação / campanha
- **Gatilho:** C8 (`referral_capture`) / C9 (`campaign_response`, veio de anúncio/cupom).
- **Passos:** registrar origem/cupom no lead; conduzir à conversão.

---

## 5. Contexto: SUPORTE

### F-S.1 Dúvida pós-serviço (cuidados gerais)
- **Gatilho:** "posso molhar depois da tosa?" → `post_service_care_question` (S1).
- **Lê:** orientações **cadastradas** (FAQ/serviço). Dúvida que vira clínica → S2.

### F-S.2 Dúvida veterinária sensível  ⚠️ guard-rail
- **Gatilho:** sintoma, doença, medicação, dosagem → `pet_veterinary_sensitive_question` (S2).
- **Comportamento:** **não diagnostica, não prescreve, não indica dosagem.** Acolhe, recomenda
  avaliação profissional, **oferece agendar consulta** (se houver) e/ou **handoff**. Ver
  [08_limites_guardrails_compliance.md](08_limites_guardrails_compliance.md).

### F-S.3 Emergência  🚨 handoff imediato
- **Gatilho:** sinais de urgência (não come/anda, convulsão, sangramento, envenenamento, parto
  com complicação, "tá passando mal") → `pet_emergency_case` (S3).
- **Comportamento:** **prioridade máxima** — mensagem curta orientando procurar atendimento de
  urgência + **handoff imediato** (`assigneeType→human`) + notificar responsável. Não conduz
  triagem clínica. Sobrepõe qualquer outro fluxo.

### F-S.4 Reclamação
- **Gatilho:** insatisfação/erro → `complaint` (S4).
- **Comportamento:** empatia, **registrar** (lead/observação) e **handoff** — não debater.

### F-S.5 Pós-venda operacional
- **Gatilho:** comprovante/2ª via (S5), atualizar cadastro (S6), política de cancelamento/
  reembolso (S7), carteira de vacinação/registros (S8).
- **Comportamento:** resolver com dado cadastrado (status de pedido/pagamento, política do
  tenant, registros do pet); o que exigir ação financeira/sensível → humano.

---

## 6. Matriz de exceções e handoff (resumo)

| Situação | Ação |
|---|---|
| Pedido explícito de humano | Handoff (A7) |
| Sintoma/medicação/dosagem | S2 — sem clínica; oferecer consulta/handoff |
| Sinal de urgência | S3 — handoff imediato + notificar |
| Reclamação | S4 — registrar + handoff |
| Dado não cadastrado (preço/estoque/horário/bairro) | Não inventar; coletar/oferecer alternativa/handoff |
| Fora da política (cancelamento/atraso) | Handoff |
| Assunto proibido (`forbidden_topics`) | A6 — declinar |
| Sem consentimento / opt-out | Não enviar proativo |
| `assigneeType ≠ ai` | Silenciar agente |

Detalhe de cada skill em [06_skills_agente.md](06_skills_agente.md); gatilhos e exemplos de fala em
[07_tabela_gatilhos_skills.md](07_tabela_gatilhos_skills.md).
