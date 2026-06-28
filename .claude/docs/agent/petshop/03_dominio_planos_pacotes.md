# Domínio — Planos, pacotes e assinaturas

Análise das ofertas de **recorrência e pacote** do petshop, estruturada para `OfferPlan`
(+ `OfferPlanServiceItem` / `OfferPlanProductItem`). É aqui que mora o maior potencial de
**LTV e previsibilidade** do petshop — e por isso há skills dedicadas de **interesse em plano**
([V6](06_skills_agente.md)) e de **recorrência/reativação** ([C5–C7](06_skills_agente.md)).

> [Princípio #0](00_indice.md#2-princípio-0--o-agente-nunca-inventa-dados): o agente só apresenta
> plano com `OfferPlan.status = active`; preço, ciclo e itens vêm do cadastro.

---

## 1. Tipos de oferta (`OfferPlanType`)

| Tipo (`type`) | O que é | Ciclo (`billingCycle`) | Exemplos petshop |
|---|---|---|---|
| `recurring_plan` | **Assinatura** recorrente | `monthly`, `quarterly`, `semiannual`, `yearly` | Plano Banho Mensal (4 banhos/mês); Plano Creche; Plano Bem-estar |
| `prepaid_package` | **Pacote pré-pago** com saldo/uso limitado | sem ciclo (usa `expiresAfterDays`, `usageLimit`) | "10 banhos com desconto"; "Pacote 5 day cares" |
| `combo` | **Combo** de itens com preço fechado | — | "Banho + Tosa Higiênica + Unha"; "Kit Filhote" (consulta + vacina + banho) |

Campos-chave para a conversa: `price`, `promotionalPrice`, `billingCycle`, `autoRenew`,
`expiresAfterDays`, `usageLimit`, `allowScheduling`, e os **itens inclusos** (serviços/produtos
com `quantity`, `usageLimit`, `priceOverride`, `included`).

---

## 2. Exemplos de referência do mercado

> Ilustrativos — cada tenant cadastra os seus. O agente nunca cita estes números; cita o cadastro.

### 2.1 Plano Banho Mensal (assinatura)
- `type = recurring_plan`, `billingCycle = monthly`, `autoRenew = true`.
- Itens: `OfferPlanServiceItem` "Banho (porte X)" `quantity = 4`, `usageLimit = 4/mês`.
- Benefício: preço por banho menor que avulso; prioridade de agenda.
- Gancho do agente: tutor que pede banho avulso recorrente → **oferecer o plano** (upsell V6).

### 2.2 Pacote de Banhos (pré-pago)
- `type = prepaid_package`, `usageLimit = 10`, `expiresAfterDays = 120`.
- Benefício: desconto por volume; sem mensalidade.
- Gancho: tutor sensível a preço, frequência média.

### 2.3 Combo Banho + Tosa
- `type = combo`, itens: Banho + Tosa Higiênica (+ Corte de unha incluso `included = true`).
- Benefício: conveniência e preço fechado.

### 2.4 Plano Creche / Day Care
- `recurring_plan` mensal; itens: diárias `quantity = N`.
- Pode ter `allowScheduling = true` para o tutor marcar os dias.

### 2.5 Plano Bem-estar / Saúde (médio porte com vet)
- `recurring_plan`; itens: consultas + vacinas + banhos.
- **Atenção (guard-rail):** o agente apresenta o que está no plano, mas **não** faz triagem
  clínica nem promete cobertura de tratamento — encaminha dúvida veterinária a humano.

---

## 3. O que o agente faz com planos

O agente **não vende/cobra** plano automaticamente. Ele:

1. **Apresenta** o plano certo para o contexto (porte, frequência, serviço pedido).
2. **Explica** itens inclusos, ciclo e benefício — só com dados do cadastro.
3. **Registra interesse** como **lead/oportunidade** (`CustomerLead` e/ou `Order` rascunho com
   item `OrderItemType.offer_plan`), com `source = whatsapp`.
4. **Aciona humano**/equipe para fechar adesão e cobrança (o agente **não processa pagamento** —
   ver limites).

```
interesse_plano:
  detectar contexto (serviço recorrente, sensibilidade a preço, frequência)
  → buscar OfferPlan ativos compatíveis (porte/serviço)
  → apresentar 1–2 melhores opções (não despejar catálogo)
  → registrar oportunidade (lead/pedido rascunho offer_plan)
  → oferecer handoff para fechamento
```

---

## 4. Gatilhos de oferta proativa (recorrência)

Onde o plano gera valor além da pergunta direta:

| Situação | Skill | O agente faz |
|---|---|---|
| Tutor pede banho avulso pela Nª vez | `V6` upsell de plano | sugere o Plano Banho Mensal |
| Pet com banho "vencido" (frequência) | `C6` lembrete de banho | lembra e oferece reagendar / plano |
| Ração próxima de acabar (recorrência) | `C5` recompra | lembra recompra e sugere pacote/combo |
| Cliente inativo há X dias | `C7` reativação | reaproxima com oferta cadastrada |

> Essas skills proativas dependem de **eventos/cron** (não de mensagem do tutor) e exigem
> consentimento (`Conversation.optInStatus` / LGPD — ver
> [08_limites_guardrails_compliance.md](08_limites_guardrails_compliance.md)).

---

## 5. Limites (guard-rails) de planos

- **Não processa pagamento nem ativa assinatura** — registra interesse e passa para humano.
- **Não inventa benefício** fora dos itens cadastrados (`included`, `quantity`, `usageLimit`).
- **Não promete desconto** que não esteja em `promotionalPrice`/`priceOverride`.
- Em **plano de saúde/bem-estar**, não faz papel clínico — só descreve a oferta.

Skills: `V6` (interesse em plano), `C5`/`C6`/`C7` (recorrência) — ver
[06_skills_agente.md](06_skills_agente.md) e [07_tabela_gatilhos_skills.md](07_tabela_gatilhos_skills.md).
