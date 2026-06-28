# Base de conhecimento (RAG) e microcopy do agente Zatten

Como dividir o conhecimento entre a **base de conhecimento (RAG) da Zatten** (estático) e as
**tools do MCP** (dinâmico), e a microcopy institucional do agente. A microcopy por skill está em
[../petshop/10_mensagens_microcopy.md](../petshop/10_mensagens_microcopy.md).

---

## 1. Regra de ouro: estático no RAG, dinâmico na tool

> **Nunca** coloque catálogo, preços, horários de agenda, estoque ou dados de cliente no RAG —
> isso muda e o agente passaria a "inventar" a partir de texto velho. Esses dados vêm **sempre**
> das tools.

| Tipo de conteúdo | Onde | Exemplos |
|---|---|---|
| **Estático / institucional** | **RAG da Zatten** | políticas (cancelamento, atraso/no-show, vacinação exigida), regras de leva-e-traz, formas de pagamento (texto geral), perguntas frequentes não-dinâmicas, tom da marca, o que o petshop faz/não faz |
| **Dinâmico / transacional** | **Tools do MCP** | preços, produtos, serviços, planos, horários disponíveis, status de pedido, agendamentos, dados do tutor/pet |
| **Semi-dinâmico** | **Tool** (preferir) | horário de funcionamento e endereço vêm de `info_estabelecimento` (cadastro), não do RAG |

### O que extrair para o RAG (a partir do petshop)
- [FAQ institucional](../petshop/09_base_conhecimento_faq.md) §1 (institucional) e §7 (objeções).
- Políticas e pré-requisitos de [serviços](../petshop/02_dominio_servicos.md) §3 (carteira de
  vacinação, avaliação) — como **regras**, não como preços.
- Limites/postura de [guard-rails](../petshop/08_limites_guardrails_compliance.md) §1 (clínico) —
  reforço do que está no prompt.

> Mantenha o RAG enxuto e atualizado por tenant. Conteúdo dinâmico no RAG = fonte de erro.

---

## 2. Microcopy institucional (config da Zatten)

Mensagens fixas configuradas na Zatten (equivalem ao `agent_configs` do petshop):

| Mensagem | Modelo |
|---|---|
| Boas-vindas | "Oi! 🐾 Aqui é o atendimento do {{nome_petshop}}. Posso ajudar com banho & tosa, produtos, agendamentos ou dúvidas. Como posso ajudar?" |
| Fora de horário | "Oi! Estamos fora do horário ({{horario}}). Pode me contar o que precisa que já deixo encaminhado e a equipe te responde ao abrir. 💛" |
| Fallback | "Acho que não entendi 😅. Você quer **agendar um serviço**, **ver produtos** ou **falar com a equipe**?" |
| Handoff | "Vou te transferir para uma pessoa da equipe pra resolver isso com você. Só um instante! 🙌" |

As frases por skill (preço, agendamento, pedido, recomendação, plano, dúvida clínica, emergência,
reclamação) estão em [../petshop/10_mensagens_microcopy.md](../petshop/10_mensagens_microcopy.md) —
o agente as reproduz com o tom configurado, preenchendo com os dados que as **tools** retornam.

---

## 3. Como a resposta é montada (tool → fala)

1. O agente chama a tool e recebe dados enxutos (a tool já formata resumido p/ WhatsApp).
2. O **prompt** define o tom; o agente embrulha o dado numa frase curta em pt-BR.
3. Se a tool não retornou o dado → frase de "vou confirmar com a equipe" (nunca inventar).
4. Antes de uma tool de escrita → frase de confirmação ("posso confirmar?").

Exemplo:
- Tutor: "quanto custa o banho do meu poodle?"
- Agente → `buscar_servicos` (porte do pet via `identificar_tutor`/pergunta) → recebe preço.
- Agente: "O banho pro porte pequeno fica R$ X e leva cerca de 1h30. Quer que eu veja um horário? 🐩"

---

## 4. Boas práticas
- RAG por tenant, revisado quando a política mudar.
- Não duplicar no RAG o que a tool entrega (evita divergência).
- Tom consistente com o app (pt-BR acolhedor) — ver [microcopy do petshop](../petshop/10_mensagens_microcopy.md).
- Acessibilidade: datas/horários explícitos, listas curtas (3–4 opções), uma pergunta por vez.
