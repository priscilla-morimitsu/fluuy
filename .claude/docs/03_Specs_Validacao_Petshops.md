# Specs de Validação — MVP com Petshops

## 1. Objetivo

Validar o Fluuy com petshops como primeiro nicho comercial, sem modelar o produto exclusivamente para petshops.

A validação deve comprovar se o sistema multi-nicho consegue ser aplicado a um caso real de negócio com produtos, serviços, planos, atendimento via WhatsApp, solicitações, agendamentos e handoff humano.

---

## 2. Hipótese de validação

Petshops pagariam por uma atendente inteligente no WhatsApp se ela conseguir:

- responder clientes rapidamente;
- reduzir perguntas repetidas;
- captar pedidos;
- captar solicitações de banho/tosa;
- apresentar planos mensais;
- registrar leads;
- organizar atendimentos;
- transferir para humano quando necessário;
- gerar relatório simples de oportunidades.

---

## 3. Escopo da validação

O teste com petshops deve usar a estrutura genérica do Fluuy:

| Conceito genérico | Aplicação no nicho petshop |
|---|---|
| Tenant | Petshop |
| Customer | Tutor |
| Customer Entity | Pet |
| Product | Produto pet |
| Service | Serviço pet |
| Plan | Plano mensal pet |
| Request | Pedido, agendamento ou interesse |
| Workflow | Fluxo de atendimento pet |
| Agent Rules | Regras de atendimento pet/veterinárias |

---

## 4. Campos específicos do template petshop

## 4.1 Template de tenant

Campos específicos:

- tipo de operação pet;
- possui banho e tosa;
- possui atendimento veterinário;
- possui vacinação;
- possui emergência;
- possui creche/hotel;
- possui busca e entrega;
- atende gatos;
- atende cães agressivos;
- atende filhotes;
- atende pets idosos;
- exige carteira de vacinação;
- bairros atendidos para entrega/busca.

## 4.2 Template de customer_entity

Entidade: `pet`

Campos:

- espécie;
- raça;
- porte;
- peso;
- idade;
- sexo;
- pelagem;
- comportamento;
- alergias;
- restrições;
- observações.

## 4.3 Template de product

Campos:

- espécie indicada;
- porte indicado;
- marca;
- peso/volume;
- sabor;
- idade indicada;
- disponibilidade;
- permite entrega;
- permite retirada.

## 4.4 Template de service

Campos:

- porte aceito;
- duração média;
- preço por porte;
- requer avaliação;
- exige agendamento;
- aceita busca/entrega;
- observações de segurança.

## 4.5 Template de plan

Campos:

- frequência;
- serviços inclusos;
- porte aceito;
- validade;
- regras;
- benefícios;
- preço;
- forma de cobrança.

---

## 5. Workflows específicos para petshop

| Workflow | Trigger intent | Prioridade |
|---|---|---|
| Consultar produto pet | `pet_product_inquiry` | MVP |
| Pedido de produto pet | `pet_product_order_request` | MVP |
| Consultar preço de banho/tosa | `pet_grooming_price_inquiry` | MVP |
| Solicitar banho/tosa | `pet_grooming_booking_request` | MVP |
| Cadastro de pet | `pet_registration` | MVP |
| Interesse em plano mensal pet | `pet_monthly_plan_interest` | MVP |
| Dúvida veterinária sensível | `pet_veterinary_sensitive_question` | MVP |
| Emergência pet | `pet_emergency_case` | MVP |
| Busca e entrega do pet | `pet_pickup_delivery_request` | Fase 2 |
| Lembrete de banho | `pet_bath_reminder_due` | Fase 2 |
| Recompra de ração | `pet_food_repurchase_due` | Fase 2 |

---

## 6. Limites da validação

Durante a validação, o agente não deve:

- diagnosticar doenças;
- prescrever medicamentos;
- indicar dosagens;
- substituir veterinário;
- confirmar agendamento automaticamente sem validação humana;
- afirmar disponibilidade de produto sem dado cadastrado;
- processar pagamento;
- emitir nota fiscal;
- controlar estoque completo.

---

## 7. Planos comerciais de validação

## 7.1 Plano Piloto

Setup: R$ 500  
Mensalidade: R$ 200

Inclui:

- atendente no WhatsApp;
- cadastro de até 30 produtos;
- cadastro de até 15 serviços;
- cadastro de até 5 planos;
- captação de pedidos;
- captação de agendamentos;
- captação de interessados em planos;
- handoff humano;
- relatório semanal simples.

## 7.2 Plano Pro

Setup: R$ 800  
Mensalidade: R$ 300

Inclui:

- até 100 produtos;
- até 30 serviços;
- até 10 planos;
- follow-up de orçamento;
- lembrete de banho/tosa;
- lembrete de recompra;
- dashboard completo;
- ajustes mensais.

## 7.3 Plano Recorrência

Setup: R$ 1.000  
Mensalidade: R$ 400

Inclui:

- fluxos avançados de planos mensais;
- reativação de clientes inativos;
- campanhas simples para recompra;
- segmentação por pet;
- relatórios de oportunidades;
- otimização contínua.

---

## 8. Métricas de validação

| Métrica | Objetivo |
|---|---|
| Conversas recebidas | Medir demanda real |
| Conversas respondidas pela IA | Medir automação |
| Handoffs | Medir limites do agente |
| Pedidos registrados | Medir geração de oportunidade |
| Agendamentos solicitados | Medir utilidade operacional |
| Interesses em planos | Medir potencial de recorrência |
| Produtos mais perguntados | Medir inteligência comercial |
| Serviços mais perguntados | Medir demanda |
| Conversas fora do horário | Medir valor de disponibilidade |
| Feedback do dono/gerente | Medir percepção de valor |
| Disposição de pagamento | Validar monetização |

---

## 9. Critérios de sucesso da validação

A validação será considerada positiva se:

- pelo menos um petshop usar o agente em conversas reais;
- o agente conseguir responder dúvidas de produtos e serviços;
- o sistema registrar clientes e pets;
- o sistema criar solicitações úteis;
- o handoff funcionar;
- o relatório semanal gerar insights úteis;
- o petshop perceber redução de esforço manual;
- o petshop aceitar pagar mensalidade.

---

## 10. Aprendizados esperados

A validação deve responder:

- quais perguntas mais se repetem;
- quais dados precisam estar cadastrados;
- quais fluxos o agente executa bem;
- onde o agente precisa transferir para humano;
- se o dono do petshop percebe valor;
- se os planos mensais são uma oportunidade real;
- quais features devem virar prioridade da V2;
- quais partes da estrutura multi-nicho precisam ser ajustadas.
