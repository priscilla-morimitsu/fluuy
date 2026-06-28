# Domínio — Serviços de petshop

Análise dos **serviços** ofertados por petshops pequenos/médios, estruturada para o cadastro
(`Service` + `ServiceCategory`) e para agendamento (`Appointment`).

> [Princípio #0](00_indice.md#2-princípio-0--o-agente-nunca-inventa-dados): o agente só oferece
> serviço com `Service.status = active` e `availableForBooking = true`, e só promete horário que
> a agenda real comportar.

---

## 1. Catálogo de serviços (referência de mercado)

| Serviço | Subtipos / variações | Agenda? | Duração típica | Preço varia por |
|---|---|---|---|---|
| **Banho** | Simples, com hidratação, medicamentoso/terapêutico, antipulgas, "banho a seco" | Sim | 1–3 h (inclui secagem) | porte, pelagem, condição |
| **Tosa** | Higiênica, na máquina, na tesoura, da raça (padrão), tosa bebê, "tosa verão" | Sim | 1–3 h | porte, pelagem, complexidade |
| **Banho & tosa (combo)** | Pacotes banho+tosa higiênica | Sim | 2–4 h | porte, pelagem |
| **Cuidados estéticos** | Corte de unhas, limpeza de ouvido, escovação dental, desembolo, hidratação, tintura/"pet color", perfumaria | Às vezes avulso | 15–45 min | item |
| **Consulta veterinária** | Clínica geral, retorno, avaliação pré-banho | Sim | 20–40 min | tipo de consulta |
| **Vacinação** | V8/V10 (cães), V3/V4/quíntupla (gatos), antirrábica, gripe canina, giárdia | Sim | 10–20 min | vacina |
| **Exames / procedimentos** | Coleta para exames, aplicação de medicação, curativo | Sim | varia | procedimento |
| **Castração / cirurgia** | (Muitas vezes encaminhada a parceiro/clínica) | Sim | — | — |
| **Microchipagem / identificação** | Implante de microchip, emissão RGA | Sim | 15 min | — |
| **Hotel / hospedagem** | Diária cão/gato, hospedagem com banho de saída | Sim (período) | dia(s) | porte, período |
| **Creche / day care** | Diária, meia-diária, pacotes semanais/mensais | Sim (período) | dia | período |
| **Adestramento / comportamento** | Aula avulsa, pacote, adestramento em casa | Sim | 45–60 min | pacote |
| **Leva-e-traz (táxi dog)** | Busca e entrega para banho/tosa/consulta | Sim (janela) | — | distância/bairro |
| **Passeio (dog walker)** | Avulso ou pacote | Sim | 30–60 min | pacote |

> Em petshop **pequeno**, o núcleo é **banho, tosa e venda de ração**; veterinário e hotel
> aparecem em **médios** ou via parceria. As features-flags do tenant refletem isso
> (`service_catalog`, `appointments`, `deliveries`).

---

## 2. Atributos de serviço que o agente usa

`Service` tem colunas fixas relevantes ao agente:

| Atributo | Campo | Uso na conversa |
|---|---|---|
| Preço base | `basePrice` | "banho a partir de R$ X" |
| Preço promocional | `promotionalPrice` | só se cadastrado |
| Duração estimada | `estimatedDurationMinutes` | montar a janela do agendamento |
| Exige agendamento | `requiresScheduling` | decide se cria `Appointment` ou venda direta |
| Disponível p/ booking | `availableForBooking` | não oferece se `false` |
| Modalidades | `deliveryModes` (`at_location`, `at_home`, `online`) | em casa? na loja? |
| Notas de domicílio | `homeServiceNotes` | regras de atendimento em casa |
| Atributos do nicho | `customData` | ver abaixo |

**`customData` (template de serviço petshop)** — ver `03_Specs_Validacao_Petshops.md` §4.4:
porte aceito, preço por porte, pelagem, requer avaliação, exige carteira de vacinação,
aceita busca/entrega, observações de segurança (ex.: "não atende cão agressivo sem focinheira").

### Preço por porte — padrão do nicho

Banho/tosa quase sempre **varia por porte e pelagem**. Como `Service.basePrice` é único, há dois
padrões aceitáveis (definir por tenant; o agente segue o que estiver cadastrado):

1. **Serviços separados por porte** ("Banho – Pequeno", "Banho – Médio", "Banho – Grande");
2. **Faixa de preço em `customData.pricingBySize`** (`{ small, medium, large, giant }`), com o
   `basePrice` como "a partir de".

O agente, ao informar preço, deve dizer **"a partir de"** quando o porte do pet não estiver
definido, e pedir o porte para precificar com exatidão — **sem chutar** o valor final.

---

## 3. Pré-requisitos e regras que o agente precisa conhecer

| Regra comum | Implicação para o agente |
|---|---|
| **Carteira de vacinação em dia** para banho/tosa/hotel/creche | Se o tenant exige (`customData.requiresVaccinationCard`), o agente avisa e pede comprovação antes de confirmar. |
| **Avaliação presencial** para tosa de raça/cão agressivo | `customData.requiresEvaluation = true` → agenda **avaliação**, não o serviço final. |
| **Jejum** para alguns procedimentos veterinários | Informa a orientação cadastrada; não inventa protocolo. |
| **Janela de leva-e-traz por bairro** | Só oferece se `deliveries` ativo e o bairro estiver na cobertura cadastrada. |
| **Política de atraso/no-show** | Informa a política cadastrada do tenant (ver FAQ). |

---

## 4. Do serviço ao agendamento (ligação com `Appointment`)

Quando o tutor quer marcar, o agente coleta os slots e cria um `Appointment`:

| Slot | Campo no `Appointment` | Obrigatório? |
|---|---|---|
| Serviço | `serviceId` | sim |
| Tutor | `customerId` | sim (cria/identifica antes) |
| Pet | `customerEntityId` (Pet) | sim p/ banho/tosa/vet |
| Modalidade | `modality` (`at_location`/`at_home`/`online`) | sim |
| Data/hora | `startAt`/`endAt` (usa `estimatedDurationMinutes`) | sim |
| Profissional/local | `professionalId`/`locationId` | se aplicável |
| Observações do tutor | `customerNotes` | opcional |
| Origem | `source = ai` ou `whatsapp`; `createdByAgent = true` | sempre |
| Status inicial | `status = requested` ou `pending_confirmation` | conforme política |

> **Confirmação humana:** se `agent_configs.human_confirmation_required` (ou política do tenant)
> exigir, o agente cria em `requested`/`pending_confirmation` e **não** confirma sozinho — a
> equipe confirma e o status vira `confirmed`. O lembrete (`AppointmentReminder`) é disparado
> conforme a janela configurada. Ver fluxo completo em
> [05_fluxos_atendimento.md](05_fluxos_atendimento.md) §Agendamento.

---

## 5. Limites de serviço (guard-rails)

- **Não confirma horário** que não exista/colida na agenda — quando não há disponibilidade
  visível, oferece opções cadastradas ou aciona humano.
- **Não atua como veterinário** (diagnóstico, prescrição, dosagem, urgência clínica): trata como
  `pet_veterinary_sensitive_question`/`pet_emergency_case`. Ver
  [08_limites_guardrails_compliance.md](08_limites_guardrails_compliance.md).
- **Não promete leva-e-traz** fora da cobertura cadastrada.
- **Não dispensa** carteira de vacinação/avaliação quando o tenant exige.

Skills relacionadas: agendamento (`AG1`–`AG9`) e vendas de serviço (`V4`, `V5`) em
[06_skills_agente.md](06_skills_agente.md).
