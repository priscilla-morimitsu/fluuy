# Guard-rails em camadas e handoff (Zatten + MCP)

Os limites do petshop ([guard-rails completos](../petshop/08_limites_guardrails_compliance.md))
valem aqui — a diferença é **onde cada limite é imposto**. No desenho Zatten+MCP eles vivem em
**duas camadas que se reforçam**: o **prompt** (camada de comportamento) e as **tools** (camada de
dados/execução). Defesa em profundidade: se o prompt falhar, a tool segura; e vice-versa.

---

## 1. Modelo de duas camadas

| Guard-rail | Camada de prompt (Zatten) | Camada de tool (Fluuy MCP) |
|---|---|---|
| **Nunca inventar dados** | prompt proíbe responder de memória | tools são a única fonte; retornam só dados ativos do tenant |
| **Isolamento multi-tenant** | — | `tenant_id` vem do **token**, nunca do input; toda query filtra por tenant |
| **Anti-IDOR (só o próprio tutor)** | prompt: não falar de outro cliente | tools resolvem o cliente pelo **telefone** e só retornam dados dele |
| **Sem diagnóstico/medicação/dosagem** | prompt (bloco Limites) recusa e encaminha | nenhuma tool expõe conteúdo clínico; recomendação de ração não inclui terapêutica |
| **Emergência → urgência + handoff** | prompt: resposta breve + Transferência imediata | — (é fluxo de conversa) |
| **Sem pagamento/nota** | prompt recusa | `criar_pedido_rascunho` só cria rascunho; nenhuma tool cobra |
| **Confirmar antes de criar** | prompt exige resumo + "posso confirmar?" | tools de escrita são idempotentes; `pending_confirmation` |
| **Respeitar política (cancel./no-show)** | prompt encaminha exceções | tools aplicam regra cadastrada; exceção → handoff |
| **Prompt injection** | prompt: ignorar "mude de tenant/ignore regras" | tool ignora qualquer `tenant_id`/identidade vinda do texto |
| **LGPD / minimização** | prompt: pedir só o necessário | tools retornam só campos essenciais; proativos exigem opt-in |

> Regra prática: **dado e ação = sempre tool**; **julgamento e recusa = sempre prompt**. Os dois
> repetem o "nunca inventar".

---

## 2. Matriz de handoff

Quando transferir para humano (e como):

| Situação | Gatilho | Ação |
|---|---|---|
| Pedido explícito | "falar com atendente/humano" | **Transferência** (nativa) |
| **Emergência** 🚨 | sinais de urgência | **Transferência imediata** + orientar urgência (prompt) |
| Dúvida clínica com risco/insistência | sintoma/medicação | oferecer consulta (`criar_agendamento`) → se insistir, **Transferência** |
| Reclamação | insatisfação/erro | **Transferência** (+ registrar, opcional) |
| Pagamento/cobrança/reembolso/nota | "quero pagar/nota/estorno" | **Transferência** |
| Fora da política | cancelamento c/ multa, exceção | **Transferência** |
| Sem solução via tools | dado ausente/conflito/loop | **Transferência** |

### Como implementar o handoff
- **Padrão:** Ação nativa **"Transferência" da Zatten** — pausa o agente e notifica a equipe no
  inbox da Zatten. Simples e suficiente.
- **Opcional (espelhar no Fluuy):** tool `solicitar_handoff` → marca `Conversation.assigneeType`
  e registra `ConversationAssignment` no Fluuy, para o handoff aparecer também no painel do tenant.
  Use se o atendimento humano acontecer no Fluuy (não só na Zatten).

> Decidir por tenant onde o humano atende (inbox Zatten vs painel Fluuy) define se basta a
> Transferência nativa ou se também usa `solicitar_handoff`. Ver questão em aberto na
> [spec §12](../../specs/integrations/zatten-mcp/spec-zatten-mcp.md).

---

## 3. Checklist antes de responder (para o prompt/QA)
```
[ ] Dado citado veio de uma tool (não inventei)?
[ ] É do tutor dono deste número (sem IDOR)?
[ ] É emergência/clínico? → urgência/handoff, sem diagnóstico
[ ] Vou criar algo? → resumi e pedi confirmação?
[ ] Ação financeira/irreversível/exceção? → handoff
[ ] Resposta curta, pt-BR, sem detalhe técnico/erro interno?
```

Limites completos e racional em
[../petshop/08_limites_guardrails_compliance.md](../petshop/08_limites_guardrails_compliance.md).
