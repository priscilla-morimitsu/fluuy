# Tabela — Tools do MCP × gatilhos do agente Zatten

Tudo que o agente Zatten pode fazer via **MCP do Fluuy**, com o **gatilho** (quando chamar cada
tool). Os gatilhos derivam da [tabela de gatilhos do petshop](../petshop/07_tabela_gatilhos_skills.md);
o detalhe de cada skill está no [catálogo de skills](../petshop/06_skills_agente.md).

**Status:** ✅ implementado · 🟡 Fase 2 (leitura) · 🟠 Fase 3 (escrita).

---

## 1. Tools de LEITURA (scope `read`)

| Tool | Status | Skill | Gatilhos — exemplos de fala / quando chamar | Inputs principais | Retorna |
|---|---|---|---|---|---|
| `info_estabelecimento` | ✅ | A4 | "que horas abre?", "onde fica?", "aceita pix?", "fazem entrega?", "atende gato?" | `topico?` | horário, endereço, contato, pagamento, capacidades |
| `identificar_tutor` | 🟡 | A2 | **no início de toda conversa** (resolver o tutor pelo telefone do contato) | `phone` | tutor + pets resumidos, ou "não cadastrado" |
| `buscar_servicos` | 🟡 | V4 / AG1 | "fazem tosa higiênica?", "quanto custa o banho?", "tem hidratação?", "fazem hotel?" | `termo?`, `especie?`, `porte?` | serviços ativos: nome, preço (por porte), duração, modalidades |
| `buscar_produtos` | 🟡 | V1 / V3 | "tem ração golden 15kg?", "preço da areia", "qual ração indica pro filhote?" | `termo?`, `marca?`, `especie?`, `porte?` | produtos ativos: nome, marca, preço, promo, embalagem |
| `consultar_planos` | 🟡 | V6 | "tem plano de banho mensal?", "pacote de banhos sai mais barato?", "assinatura?" | `tipo?`, `servico?` | planos ativos: nome, tipo, preço, ciclo, itens inclusos |
| `consultar_disponibilidade` | 🟡 | AG5 | "tem horário sábado?", "qual o próximo horário?", "atende domingo?" | `servicoId`, `data?` | janelas disponíveis reais |
| `listar_pets` | 🟡 | A2 / S8 | "quais pets tenho cadastrados?", "carteira de vacinação do meu cão" | `phone` | pets do tutor (nome, espécie, porte, obs. de saúde resumida) |
| `status_pedido` | 🟡 | V7 | "cadê meu pedido?", "minha ração já saiu?", "status da compra" | `phone`, `numero?` | pedidos do tutor: status, itens, total |
| `consultar_agendamentos` | 🟡 | AG/S | "tenho agendamento marcado?", "quando é o banho do Thor?" | `phone` | próximos agendamentos do tutor + status |

## 2. Tools de ESCRITA (scope `write` — Fase 3)

| Tool | Status | Skill | Gatilhos | Inputs principais | Faz |
|---|---|---|---|---|---|
| `cadastrar_tutor` | 🟠 | C4 | tutor novo durante agendamento/pedido (embutido) | `phone`, `nome` | cria `Customer` (idempotente por telefone) |
| `cadastrar_pet` | 🟠 | C3 | "meu cão chama Thor, golden de 2 anos" (embutido) | `phone`, `nome`, `especie`, `porte?`… | cria `Pet` (exige tutor) |
| `registrar_lead` | 🟠 | C1/C2 | primeiro contato/interesse de quem ainda não é cliente | `phone`, `interesse`, `origem?` | cria `CustomerLead` |
| `criar_agendamento` | 🟠 | AG2/3/4 | "quero marcar banho/consulta/vacina" (após confirmar serviço+horário) | `phone`, `servicoId`, `inicio`, `modalidade`, `petId?`, `obs?` | cria `Appointment` `pending_confirmation`, `source=ai` |
| `remarcar_agendamento` | 🟠 | AG6 | "preciso remarcar", "muda pra outro dia" | `phone`, `agendamentoId`, `novoInicio` | atualiza status `rescheduled` + lembrete |
| `cancelar_agendamento` | 🟠 | AG7 | "quero cancelar", "não vou poder levar" | `phone`, `agendamentoId`, `motivo?` | atualiza status `cancelled` |
| `criar_pedido_rascunho` | 🟠 | V2/V5 | "quero comprar 2 sacos", "me vê um sachê", "monta um orçamento" | `phone`, `itens[]`, `entrega` | cria `Order` rascunho `source=whatsapp` (não cobra) |
| `solicitar_handoff` | 🟠 | A7/S3/S4 | "falar com atendente", **emergência**, reclamação séria | `phone`, `motivo`, `urgencia` | sinaliza handoff (ou usar Ação nativa **Transferência**) |

> **Handoff:** prefira a **Ação nativa "Transferência" da Zatten** para pausar o agente e
> notificar a equipe; use `solicitar_handoff` se quiser também registrar o evento no Fluuy
> (`Conversation`). Ver [06](06_guardrails_e_handoff.md).

---

## 3. Skills que NÃO usam tool (prompt + RAG)

Nem toda skill vira tool. Estas são tratadas só pelo **prompt** (e base de conhecimento):

| Skill | Tratamento |
|---|---|
| A1 saudação, A3 roteamento, A8 encerramento | prompt (fluxo de conversa) |
| A5 fora de horário | config de horário da Zatten + prompt (pode chamar `info_estabelecimento`) |
| A6 fora de escopo | prompt (`forbidden_topics`) |
| S1 dúvida pós-serviço | prompt + RAG (orientações gerais) |
| **S2 dúvida clínica sensível** | **prompt (guard-rail): não diagnosticar/prescrever** → oferecer consulta / handoff |
| **S3 emergência** | **prompt (guard-rail): handoff imediato** (Transferência) |

## 4. Gatilhos proativos (Fase 3+, fora do escopo do MCP request/response)

Recompra de ração (C5), lembrete de banho (C6) e reativação (C7) são **disparados por
evento/cron no Fluuy** (não por mensagem) e enviados via WhatsApp respeitando **opt-in**. Não são
"tools chamadas pela Zatten"; são campanhas que o Fluuy origina. Ver
[petshop 06 §6](../petshop/06_skills_agente.md).

---

## 5. Regras de uso de tool (resumo para o prompt)

1. **Sempre** chame `identificar_tutor` no começo (passe o telefone do contato).
2. Para qualquer dado de catálogo/preço/agenda/pedido → **chame a tool**; nunca responda de
   memória.
3. Para criar algo → **confirme o resumo com o tutor** antes de chamar a tool de escrita.
4. Se a tool retornar vazio/"não encontrado" → **não invente**; ofereça alternativa ou handoff.
5. Emergência/sintoma → **não** use tool de agenda como se fosse triagem; siga o guard-rail (S2/S3).

O prompt completo está em [02_system_prompt.md](02_system_prompt.md).
