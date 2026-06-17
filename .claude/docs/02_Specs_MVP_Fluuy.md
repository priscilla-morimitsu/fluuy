# Specs — Fluuy MVP

## 1. Objetivo das specs

Este documento define as especificações funcionais e técnicas do MVP do Fluuy, sem limitar o produto a um nicho específico.

O MVP deve entregar a base operacional da plataforma multi-tenant e multi-nicho, permitindo configurar empresas, nichos, templates, agentes, catálogos, clientes, conversas, workflows e solicitações.

---

## 2. Escopo do MVP

## 2.1 Módulos incluídos

| Módulo | Inclusão no MVP |
|---|---|
| Autenticação | Sim |
| Usuários e roles | Sim |
| Platform admin | Sim |
| Tenants | Sim |
| Nichos | Sim |
| Templates por nicho | Sim |
| Campos personalizados | Sim |
| Feature flags | Sim |
| Planos e limites básicos | Sim |
| Perfil da empresa | Sim |
| Configuração do agente | Sim |
| Clientes | Sim |
| Entidades do cliente | Sim |
| Produtos | Sim |
| Serviços | Sim |
| Planos/pacotes | Sim |
| Solicitações | Sim |
| Conversas | Sim |
| Mensagens | Sim |
| Integração WhatsApp via Pilot Status | Sim |
| Workflows básicos | Sim |
| Handoff humano | Sim |
| Dashboard básico | Sim |
| Relatório simples | Sim |
| Worker/background jobs | Sim |
| Deploy Docker na VPS | Sim |

---

## 3. Entidades principais

## 3.1 users

Usuários da plataforma.

Campos sugeridos:

| Campo | Tipo | Obrigatório |
|---|---|---|
| id | uuid | Sim |
| name | text | Sim |
| email | text | Sim |
| password_hash | text | Sim |
| status | enum | Sim |
| created_at | timestamp | Sim |
| updated_at | timestamp | Sim |

## 3.2 tenants

Empresas clientes.

Campos sugeridos:

| Campo | Tipo | Obrigatório |
|---|---|---|
| id | uuid | Sim |
| niche_id | uuid | Sim |
| name | text | Sim |
| legal_name | text | Não |
| document | text | Não |
| slug | text | Sim |
| description | text | Não |
| logo_url | text | Não |
| status | enum | Sim |
| public_phone | text | Não |
| public_email | text | Não |
| notification_phone | text | Não |
| address | jsonb | Não |
| business_hours | jsonb | Não |
| service_areas | jsonb | Não |
| payment_methods | jsonb | Não |
| has_products | boolean | Sim |
| has_services | boolean | Sim |
| has_plans | boolean | Sim |
| has_delivery | boolean | Sim |
| has_pickup | boolean | Sim |
| accepts_online_payment | boolean | Sim |
| custom_data | jsonb | Sim |
| created_at | timestamp | Sim |
| updated_at | timestamp | Sim |

## 3.3 tenant_users

Relaciona usuários a tenants.

| Campo | Tipo |
|---|---|
| id | uuid |
| tenant_id | uuid |
| user_id | uuid |
| role | enum |
| status | enum |
| created_at | timestamp |
| updated_at | timestamp |

Roles:

- `tenant_owner`;
- `tenant_manager`;
- `tenant_operator`;
- `tenant_viewer`.

## 3.4 niches

Nichos gerenciados pelo admin Fluuy.

| Campo | Tipo |
|---|---|
| id | uuid |
| key | text |
| name | text |
| description | text |
| customer_label | text |
| entity_label | text |
| status | enum |
| created_by | uuid |
| created_at | timestamp |
| updated_at | timestamp |

## 3.5 templates

Templates por nicho e entidade.

| Campo | Tipo |
|---|---|
| id | uuid |
| niche_id | uuid |
| entity_type | enum/text |
| name | text |
| description | text |
| fields | jsonb |
| config | jsonb |
| version | integer |
| status | enum |
| created_by | uuid |
| updated_by | uuid |
| created_at | timestamp |
| updated_at | timestamp |

Entity types:

- `tenant`;
- `customer`;
- `customer_entity`;
- `product`;
- `service`;
- `plan`;
- `request`;
- `agent_config`.

## 3.6 customers

Clientes finais do tenant.

| Campo | Tipo |
|---|---|
| id | uuid |
| tenant_id | uuid |
| name | text |
| phone | text |
| email | text |
| address | jsonb |
| status | enum |
| custom_data | jsonb |
| created_at | timestamp |
| updated_at | timestamp |

## 3.7 customer_entities

Entidades vinculadas ao cliente.

Exemplos por nicho:

- pet;
- veículo;
- paciente;
- aluno;
- imóvel;
- dependente;
- equipamento.

| Campo | Tipo |
|---|---|
| id | uuid |
| tenant_id | uuid |
| customer_id | uuid |
| entity_type | text |
| name | text |
| status | enum |
| custom_data | jsonb |
| created_at | timestamp |
| updated_at | timestamp |

## 3.8 products

Produtos do tenant.

| Campo | Tipo |
|---|---|
| id | uuid |
| tenant_id | uuid |
| name | text |
| description | text |
| category | text |
| price | decimal |
| availability_status | enum |
| active | boolean |
| custom_data | jsonb |
| created_at | timestamp |
| updated_at | timestamp |

## 3.9 services

Serviços do tenant.

| Campo | Tipo |
|---|---|
| id | uuid |
| tenant_id | uuid |
| name | text |
| description | text |
| category | text |
| base_price | decimal |
| duration_minutes | integer |
| requires_evaluation | boolean |
| allows_scheduling | boolean |
| active | boolean |
| custom_data | jsonb |
| created_at | timestamp |
| updated_at | timestamp |

## 3.10 plans

Planos, pacotes ou assinaturas oferecidas pelo tenant.

| Campo | Tipo |
|---|---|
| id | uuid |
| tenant_id | uuid |
| name | text |
| description | text |
| price | decimal |
| recurrence | text |
| rules | text |
| active | boolean |
| custom_data | jsonb |
| created_at | timestamp |
| updated_at | timestamp |

## 3.11 agent_configs

Configuração do agente do tenant.

| Campo | Tipo |
|---|---|
| id | uuid |
| tenant_id | uuid |
| agent_name | text |
| tone_of_voice | text |
| welcome_message | text |
| off_hours_message | text |
| fallback_message | text |
| handoff_enabled | boolean |
| human_confirmation_required | boolean |
| forbidden_topics | jsonb |
| rules | jsonb |
| custom_data | jsonb |
| config | jsonb |
| created_at | timestamp |
| updated_at | timestamp |

## 3.12 conversations

Conversas por canal.

| Campo | Tipo |
|---|---|
| id | uuid |
| tenant_id | uuid |
| customer_id | uuid |
| channel | enum |
| external_id | text |
| status | enum |
| assigned_to_user_id | uuid |
| agent_paused | boolean |
| last_message_at | timestamp |
| created_at | timestamp |
| updated_at | timestamp |

## 3.13 messages

Mensagens da conversa.

| Campo | Tipo |
|---|---|
| id | uuid |
| tenant_id | uuid |
| conversation_id | uuid |
| sender_type | enum |
| direction | enum |
| content | text |
| metadata | jsonb |
| external_id | text |
| created_at | timestamp |

## 3.14 requests

Solicitações geradas a partir de conversas ou criadas manualmente.

Tipos:

- produto;
- serviço;
- agendamento;
- orçamento;
- plano;
- suporte;
- reclamação;
- handoff.

| Campo | Tipo |
|---|---|
| id | uuid |
| tenant_id | uuid |
| customer_id | uuid |
| customer_entity_id | uuid |
| conversation_id | uuid |
| type | enum |
| status | enum |
| source | enum |
| title | text |
| description | text |
| collected_data | jsonb |
| custom_data | jsonb |
| created_at | timestamp |
| updated_at | timestamp |

## 3.15 workflow_templates

Modelos de workflows.

| Campo | Tipo |
|---|---|
| id | uuid |
| niche_id | uuid |
| key | text |
| name | text |
| description | text |
| trigger_intent | text |
| steps | jsonb |
| priority | integer |
| status | enum |
| created_at | timestamp |
| updated_at | timestamp |

## 3.16 tenant_workflows

Workflows habilitados para o tenant.

| Campo | Tipo |
|---|---|
| id | uuid |
| tenant_id | uuid |
| workflow_template_id | uuid |
| enabled | boolean |
| custom_config | jsonb |
| priority | integer |
| created_at | timestamp |
| updated_at | timestamp |

## 3.17 workflow_runs

Execução de workflow em conversa.

| Campo | Tipo |
|---|---|
| id | uuid |
| tenant_id | uuid |
| conversation_id | uuid |
| workflow_template_id | uuid |
| tenant_workflow_id | uuid |
| status | enum |
| current_step_key | text |
| collected_data | jsonb |
| started_at | timestamp |
| completed_at | timestamp |

## 3.18 features

Features globais do sistema.

| Campo | Tipo |
|---|---|
| id | uuid |
| key | text |
| name | text |
| description | text |
| group | text |
| status | enum |
| created_at | timestamp |
| updated_at | timestamp |

## 3.19 billing_plans

Planos comerciais.

| Campo | Tipo |
|---|---|
| id | uuid |
| key | text |
| name | text |
| description | text |
| price | decimal |
| billing_period | enum |
| status | enum |
| created_at | timestamp |
| updated_at | timestamp |

## 3.20 tenant_features

Overrides de features por tenant.

| Campo | Tipo |
|---|---|
| id | uuid |
| tenant_id | uuid |
| feature_id | uuid |
| enabled | boolean |
| source | enum |
| expires_at | timestamp |
| created_at | timestamp |
| updated_at | timestamp |

---

## 4. Funcionalidades do MVP

## 4.1 Platform Admin

### Requisitos

- Criar tenant.
- Editar tenant.
- Bloquear tenant.
- Criar nicho.
- Editar nicho.
- Criar template.
- Editar template.
- Ativar/inativar template.
- Criar feature.
- Gerenciar planos comerciais.
- Liberar feature manualmente para tenant.
- Ver uso básico por tenant.

### Critérios de aceite

- Apenas `platform_admin` pode acessar rotas administrativas.
- Nichos e templates não podem ser criados por tenants.
- Todo tenant deve pertencer a um nicho.
- Um template deve pertencer a um nicho e entidade.

---

## 4.2 Tenant

### Requisitos

- Editar perfil da empresa.
- Preencher campos fixos.
- Preencher campos personalizados vindos do template.
- Configurar horário de atendimento.
- Configurar formas de pagamento.
- Configurar áreas atendidas.
- Configurar canais de notificação.

### Critérios de aceite

- Tenant só acessa seus próprios dados.
- Campos personalizados devem ser validados com base no template do nicho.
- Dados críticos devem ser salvos em colunas fixas.
- Dados variáveis devem ser salvos em `custom_data`.

---

## 4.3 Agente

### Requisitos

- Configurar nome.
- Configurar tom de voz.
- Configurar mensagem inicial.
- Configurar mensagem fora do horário.
- Configurar fallback.
- Configurar regras e assuntos proibidos.
- Responder com base no contexto do tenant.
- Não responder após handoff humano.
- Criar solicitações durante workflows.

### Critérios de aceite

- O agente deve respeitar tenant, nicho, templates, workflows e regras.
- O agente deve acionar humano em casos sensíveis.
- O agente não deve inventar dados não cadastrados.
- O agente deve registrar mensagens e eventos.

---

## 4.4 WhatsApp via Pilot Status

### Requisitos

- Receber webhook de mensagens.
- Identificar tenant pelo número.
- Criar conversa se não existir.
- Salvar mensagem recebida.
- Enfileirar processamento.
- Enviar resposta pelo Pilot Status.
- Notificar responsável em caso de handoff.

### Critérios de aceite

- Mensagem recebida deve ser persistida antes do processamento.
- Falhas no envio devem ser registradas.
- Webhook deve validar origem ou token.
- O processamento deve ocorrer em worker/background job.

---

## 4.5 Clientes e entidades

### Requisitos

- Criar cliente manualmente.
- Criar cliente a partir de conversa.
- Editar cliente.
- Listar clientes.
- Criar entidade vinculada.
- Editar entidade vinculada.
- Salvar campos específicos em `custom_data`.

### Critérios de aceite

- Cliente sempre pertence a um tenant.
- Entidade sempre pertence a cliente e tenant.
- Campos específicos devem seguir template do nicho.

---

## 4.6 Catálogo

### Requisitos

- CRUD de produtos.
- CRUD de serviços.
- CRUD de planos.
- Marcar itens como ativos/inativos.
- Consultar catálogo pelo agente.
- Campos específicos por template.

### Critérios de aceite

- Produto, serviço e plano sempre pertencem a tenant.
- Agente só consulta itens ativos.
- Campos customizados devem respeitar template.

---

## 4.7 Solicitações

### Requisitos

- Criar solicitação manual.
- Criar solicitação via agente.
- Atualizar status.
- Vincular cliente.
- Vincular entidade do cliente quando necessário.
- Vincular conversa.
- Salvar dados coletados.

### Critérios de aceite

- Toda solicitação deve ter tipo e status.
- Toda solicitação deve estar vinculada a tenant.
- Solicitações criadas pela IA devem registrar origem `agent`.

---

## 4.8 Dashboard

### Requisitos

Exibir:

- total de conversas;
- conversas respondidas por IA;
- handoffs;
- clientes criados;
- solicitações criadas;
- pedidos;
- agendamentos;
- orçamentos;
- interesses em planos;
- conversas fora do horário;
- uso estimado da IA.

### Critérios de aceite

- Dashboard deve respeitar `tenant_id`.
- Métricas devem ser filtráveis por período.
- Usuários viewer podem visualizar, mas não editar.

---

## 5. Feature flags do MVP

| Feature key | Descrição |
|---|---|
| `platform_tenant_management` | Gestão de tenants |
| `platform_niche_management` | Gestão de nichos |
| `platform_niche_templates` | Gestão de templates |
| `tenant_profile_view` | Ver perfil da empresa |
| `tenant_profile_edit` | Editar perfil da empresa |
| `whatsapp_ai_attendance` | IA no WhatsApp |
| `conversation_history` | Histórico de conversas |
| `human_handoff` | Handoff humano |
| `customer_management` | Gestão de clientes |
| `customer_entities` | Entidades do cliente |
| `product_catalog` | Catálogo de produtos |
| `service_catalog` | Catálogo de serviços |
| `plans_catalog` | Catálogo de planos |
| `requests_management` | Gestão de solicitações |
| `agent_configuration` | Configuração do agente |
| `agent_rules` | Regras do agente |
| `tenant_workflows` | Workflows do tenant |
| `workflow_runs` | Execução de workflows |
| `basic_dashboard` | Dashboard básico |
| `ai_usage_tracking` | Uso de IA |

---

## 6. Workflows mínimos do MVP

| Workflow | Trigger intent |
|---|---|
| Atendimento inicial | `initial_contact` |
| Classificação de intenção | `intent_classification` |
| Cadastro de cliente | `customer_registration` |
| Cadastro de entidade | `customer_entity_registration` |
| Consulta de produto | `product_inquiry` |
| Pedido de produto | `product_order_request` |
| Consulta de serviço | `service_inquiry` |
| Solicitação de agendamento | `appointment_request` |
| Interesse em plano | `plan_interest` |
| Orçamento | `quote_request` |
| Handoff humano | `human_handoff_request` |
| Fora do horário | `off_hours_contact` |
| Reclamação | `complaint` |
| Fora do escopo | `out_of_scope_question` |

---

## 7. Requisitos não funcionais

## 7.1 Segurança

- Isolamento obrigatório por tenant.
- Autenticação em rotas privadas.
- Autorização por role.
- Tokens e segredos fora do código.
- Webhooks protegidos.
- Logs sem vazamento de dados sensíveis.

## 7.2 Performance

- Paginação em listagens.
- Índices por `tenant_id`.
- Índices em campos de busca.
- Índices GIN em `custom_data` quando necessário.
- Processamento assíncrono de mensagens.

## 7.3 Deploy

- Projeto em Docker.
- Deploy em VPS Hostinger.
- Container isolado dos demais projetos.
- Proxy reverso compartilhado.
- Rede Docker própria.
- Variáveis de ambiente específicas.
- Volumes persistentes.
- Backup documentado.
