# Personas — Tutores e Pets

Perfis para o agente **adaptar tom, prioridade e oferta**. Personas de **tutor** (quem fala) e de
**pet** (sobre quem se fala). Mapeiam para `Customer` e `Pet`.

---

## 1. Personas de tutor (quem conversa no WhatsApp)

### T1 — Recorrente fiel ("cliente de banho")
- Já é `Customer` com `Pet` cadastrado; usa banho/tosa com frequência.
- **Quer:** rapidez, mesmo profissional, horário fácil.
- **Agente:** identifica pelo telefone, puxa pet e histórico, agiliza reagendamento, oferece
  **plano mensal** (V6) se ainda for avulso.

### T2 — Caçador de preço
- Compara preço de ração/banho; sensível a promoção.
- **Quer:** preço e condição.
- **Agente:** informa preço/promoção **cadastrados**, sugere **pacote/combo** (economia),
  registra interesse. Nunca inventa desconto.

### T3 — Tutor de primeira viagem (filhote novo)
- Acabou de adotar/comprar; muitas dúvidas (vacina, ração, primeiros cuidados).
- **Quer:** orientação e "kit inicial".
- **Agente:** acolhe, **cadastra pet** (C3), recomenda itens do catálogo (V3), oferece **kit
  filhote/combo**, agenda **1ª vacina/consulta** — sem dar conselho clínico que exija vet.

### T4 — Lead novo (ainda não é cliente)
- Primeiro contato, veio de Instagram/indicação/Google.
- **Quer:** saber se atende o caso dele (porte, raça, serviço, bairro).
- **Agente:** responde institucional (A4), **captura e qualifica o lead** (C1/C2), conduz para
  agendamento/pedido.

### T5 — Tutor ocupado / conveniência
- Valoriza leva-e-traz, hotel, creche; tempo > preço.
- **Quer:** resolver com o mínimo de esforço.
- **Agente:** oferece **leva-e-traz** (AG9, se `deliveries`), hotel/creche, agendamento redondo.

### T6 — Tutor preocupado / pet com problema de saúde
- Relata sintoma, pet idoso/doente, dúvida de medicação.
- **Quer:** ajuda, às vezes com urgência.
- **Agente:** **trata como sensível** — não diagnostica; oferece consulta/encaminha; em sinal de
  urgência, **handoff imediato** (S2/S3). É a persona de maior risco — ver guard-rails.

### T7 — Tutor de gato (necessidades específicas)
- Gato exige manejo diferente (estresse, areia, ração específica, poucos pet shops atendem).
- **Quer:** saber se atende gato e como.
- **Agente:** confirma no cadastro se o tenant atende gato/serviço felino; não promete se não há.

### T8 — Reclamação / pós-venda insatisfeito
- Algo deu errado (atraso, resultado da tosa, produto).
- **Quer:** ser ouvido e resolvido.
- **Agente:** acolhe com empatia, **registra reclamação** (S4) e **aciona humano** — não
  discute nem minimiza.

---

## 2. Eixos de segmentação do tutor

| Eixo | Valores | Origem (`Customer`) |
|---|---|---|
| Relação | lead · novo · recorrente · inativo | `source`, histórico, `CustomerLead` |
| Sensibilidade | preço · conveniência · qualidade | inferida na conversa |
| Canal de origem | whatsapp · instagram · indicação · site | `Customer.source` / lead |
| Urgência | baixa · média · **alta (clínica)** | classificada por skill |

---

## 3. Personas de pet (sobre quem se fala)

O `Pet` tem colunas concretas: `species`, `breed`, `size`, `sex`, `weightKg`, `birthDate`,
`neutered`, `temperament[]`, `healthNotes`. Elas mudam preço, elegibilidade e segurança.

| Persona pet | Atributos-chave | Impacto no atendimento |
|---|---|---|
| **Filhote** | `birthDate` recente | vacinação inicial, ração filhote, kit; cuidado com idade mínima p/ banho |
| **Adulto saudável** | porte/pelagem | banho/tosa padrão por porte |
| **Sênior / idoso** | idade alta, `healthNotes` | manejo cuidadoso; banho terapêutico; dúvidas viram sensíveis |
| **Pet de raça (tosa específica)** | `breed`, pelagem longa | tosa da raça; pode exigir avaliação |
| **Porte grande / gigante** | `size`, `weightKg` | preço maior, duração maior, agenda especial |
| **Gato** | `species = gato` | manejo felino; nem todo tenant atende |
| **Comportamento difícil / agressivo** | `temperament` (ex.: "agressivo") | exige focinheira/avaliação; observações de segurança; pode recusar |
| **Pet com restrição de saúde** | `healthNotes`, alergias | dieta/serviço com cautela; dúvida clínica → vet |

> O agente **lê `healthNotes`/`temperament` para segurança e logística**, mas **não os
> interpreta clinicamente**. "Tem alergia" vira cuidado no serviço e, se for dúvida de
> tratamento, encaminha ao veterinário.

---

## 4. Como a persona muda a resposta (resumo)

| Persona | Ajuste de tom | Oferta prioritária | Risco/handoff |
|---|---|---|---|
| T1 Recorrente | direto, familiar | reagendar, plano | baixo |
| T2 Preço | objetivo, transparente | combo/pacote | baixo |
| T3 1ª viagem | didático, acolhedor | kit/vacina | médio (não dar conselho clínico) |
| T4 Lead | caloroso, qualificador | agendar/pedir | baixo |
| T5 Conveniência | eficiente | leva-e-traz/hotel | baixo |
| T6 Saúde | empático, prudente | consulta/handoff | **alto** |
| T7 Gato | informativo | serviço felino se houver | médio |
| T8 Reclamação | empático, sem defesa | resolver/handoff | **alto (relacional)** |

Ligações: fluxos em [05_fluxos_atendimento.md](05_fluxos_atendimento.md); guard-rails de saúde em
[08_limites_guardrails_compliance.md](08_limites_guardrails_compliance.md).
