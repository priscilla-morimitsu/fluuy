# PRD — Fluuy

## 1. Visão geral

O Fluuy é uma plataforma SaaS multi-tenant e multi-nicho para automação de atendimento, vendas, suporte, captação de leads, solicitações, agendamentos, pedidos, relacionamento e análise operacional por meio de agentes de IA integrados a canais de conversa, inicialmente WhatsApp.

O sistema deve permitir que diferentes tipos de negócios configurem uma atendente inteligente capaz de entender o contexto da empresa, responder clientes, coletar dados, registrar solicitações, conduzir workflows, acionar humanos quando necessário e gerar informações úteis para gestão.

O produto deve ser desenhado para atender diferentes nichos sem exigir recriação estrutural a cada novo segmento. Para isso, a plataforma deve combinar uma base comum de entidades, regras e funcionalidades com templates de nicho, campos personalizados, feature flags, workflows configuráveis e regras de agente.

---

## 2. Objetivo do produto

Construir uma plataforma que permita a pequenos e médios negócios automatizar partes relevantes do atendimento e da operação comercial por canais de mensagem, com foco em:

- reduzir tempo de resposta;
- aumentar a qualidade e consistência do atendimento;
- organizar demandas vindas de conversas;
- captar e qualificar leads;
- registrar pedidos, solicitações, orçamentos e agendamentos;
- apresentar produtos, serviços e planos;
- diminuir trabalho manual da equipe;
- melhorar acompanhamento comercial;
- gerar relatórios e sugestões de melhoria;
- permitir evolução para diferentes nichos e modelos de negócio.

---

## 3. Problema

Negócios que dependem de atendimento por WhatsApp e canais similares geralmente enfrentam:

- demora para responder clientes;
- perda de vendas por falta de retorno;
- excesso de perguntas repetidas;
- baixa padronização de respostas;
- ausência de histórico estruturado;
- dificuldade para organizar pedidos, agendamentos e orçamentos;
- pouca visibilidade sobre oportunidades perdidas;
- atendimento limitado ao horário comercial;
- dependência total de humanos para tarefas operacionais simples;
- dificuldade em transformar conversas em dados, métricas e ações;
- baixa capacidade de realizar follow-up.

Esses problemas aparecem em diferentes nichos, como clínicas, salões, oficinas, lojas, restaurantes, imobiliárias, prestadores de serviço e negócios com produtos, serviços ou recorrência.

---

## 4. Público-alvo

### 4.1 Clientes pagantes da plataforma

Empresas de pequeno e médio porte que atendem clientes por WhatsApp ou canais conversacionais e vendem:

- produtos;
- serviços;
- planos;
- pacotes;
- assinaturas;
- orçamentos;
- agendamentos;
- atendimento consultivo;
- suporte recorrente.

### 4.2 Nichos possíveis

O sistema deve ser modelado para atender diferentes nichos, incluindo, mas não limitado a:

| Nicho | Tipo de oferta comum |
|---|---|
| Clínicas médicas | Serviços, consultas, exames, retornos |
| Clínicas odontológicas | Serviços, procedimentos, avaliações, planos |
| Psicólogos | Serviços, agendamentos, recorrência |
| Nutricionistas | Serviços, consultas, acompanhamento |
| Salões de beleza | Serviços, produtos, pacotes |
| Clínicas de estética | Serviços, pacotes, recorrência |
| Petshops | Produtos, serviços, planos |
| Oficinas mecânicas | Serviços, orçamentos, revisões |
| Imobiliárias | Atendimento, captação, visitas, imóveis |
| Restaurantes | Produtos, pedidos, entregas |
| Lojas | Produtos, pedidos, entregas |
| Academias | Planos, matrículas, recorrência |
| Cursos e escolas | Matrículas, alunos, turmas, atendimento |

---

## 5. Personas

## 5.1 Platform Admin

Usuário interno da Fluuy.

Responsabilidades:

- criar e gerenciar tenants;
- criar e gerenciar nichos;
- criar templates por nicho;
- configurar feature flags;
- configurar planos comerciais;
- configurar limites;
- acompanhar uso da plataforma;
- monitorar erros;
- gerenciar integrações;
- controlar status dos tenants.

## 5.2 Tenant Owner

Dono ou responsável principal pela empresa cliente.

Responsabilidades:

- preencher dados da empresa;
- configurar atendimento;
- configurar agente;
- cadastrar produtos, serviços e planos;
- acompanhar conversas;
- acompanhar solicitações;
- visualizar métricas;
- gerenciar usuários do tenant;
- configurar integrações disponíveis;
- receber notificações operacionais.

## 5.3 Tenant Manager

Gerente ou responsável operacional.

Responsabilidades:

- editar dados operacionais;
- acompanhar conversas;
- responder clientes;
- gerenciar solicitações;
- atualizar produtos, serviços, horários e disponibilidade;
- visualizar relatórios;
- acompanhar performance do atendimento.

## 5.4 Tenant Operator

Atendente ou colaborador operacional.

Responsabilidades:

- visualizar conversas;
- assumir atendimentos;
- responder manualmente;
- atualizar status de solicitações;
- registrar informações de clientes;
- acompanhar pedidos e agendamentos.

## 5.5 Tenant Viewer

Usuário com acesso somente leitura.

Responsabilidades:

- visualizar conversas;
- visualizar clientes;
- visualizar solicitações;
- visualizar relatórios;
- sem permissão de edição.

## 5.6 AI Agent

Agente automatizado.

Responsabilidades:

- responder mensagens;
- identificar intenção;
- coletar dados;
- consultar dados cadastrados;
- executar workflows;
- criar ou atualizar registros;
- respeitar regras do tenant e do nicho;
- transferir para humano quando necessário;
- registrar eventos e contexto da conversa.

---

## 6. Escopo do produto

O Fluuy deve ser composto por módulos reutilizáveis, configuráveis por nicho e tenant.

### Módulos principais

- Administração da plataforma;
- Gestão de tenants;
- Gestão de nichos;
- Templates por nicho;
- Feature flags;
- Planos comerciais e limites;
- Usuários, roles e permissões;
- Perfil da empresa;
- Configuração do agente;
- Base de conhecimento;
- Clientes;
- Entidades vinculadas ao cliente;
- Catálogo de produtos;
- Catálogo de serviços;
- Planos, pacotes e assinaturas;
- Solicitações;
- Conversas;
- Mensagens;
- Workflows;
- Handoff humano;
- Notificações;
- Relatórios;
- Métricas;
- Integrações;
- Uso de IA e logs.

---

## 7. Princípios de produto

## 7.1 Multi-nicho desde a base

O sistema não deve ser modelado para um nicho específico. Toda entidade deve ser pensada para aceitar variações por nicho através de templates, campos personalizados e workflows.

## 7.2 Core comum + extensão por template

A plataforma deve ter entidades fixas para o que é comum entre os negócios e campos dinâmicos para o que muda por nicho.

Exemplo de core comum:

- empresa;
- cliente;
- entidade do cliente;
- produto;
- serviço;
- plano;
- solicitação;
- conversa;
- mensagem;
- workflow;
- agente.

Exemplo de extensão por template:

- campos específicos de um paciente;
- campos específicos de um veículo;
- campos específicos de um pet;
- campos específicos de um imóvel;
- campos específicos de um aluno;
- campos específicos de um procedimento.

## 7.3 Configuração antes de customização por código

Sempre que possível, as diferenças entre nichos devem ser resolvidas por:

- templates;
- feature flags;
- workflows;
- regras do agente;
- campos em `custom_data`;
- configurações por tenant.

Evitar hardcode de regras de um nicho na aplicação.

## 7.4 Segurança multi-tenant

Todas as consultas e ações relacionadas a dados de clientes da plataforma devem respeitar isolamento por `tenant_id`.

## 7.5 IA com limites claros

O agente deve ajudar na operação, mas deve respeitar regras de segurança, escopo permitido, handoff humano e limites definidos por nicho e tenant.

---

## 8. Estrutura multi-nicho

## 8.1 Nichos

Um nicho representa um segmento atendido pela plataforma.

Exemplos:

- `health_clinic`;
- `odontology`;
- `beauty_salon`;
- `pet_services`;
- `auto_repair`;
- `real_estate`;
- `restaurant`;
- `retail`;
- `education`.

A criação e edição de nichos deve ser exclusiva do `platform_admin`.

## 8.2 Templates

Templates definem campos e comportamentos específicos por nicho e entidade.

Cada template deve conter:

- nicho relacionado;
- entidade relacionada;
- nome;
- descrição;
- versão;
- status;
- campos;
- configurações opcionais;
- regras associadas;
- workflows associados, quando aplicável.

Entidades com suporte a templates:

- `tenant`;
- `customer`;
- `customer_entity`;
- `product`;
- `service`;
- `plan`;
- `request`;
- `agent_config`.

## 8.3 Campos personalizados

Campos específicos por nicho devem ser definidos em `templates.fields` e preenchidos em `custom_data` nas tabelas principais.

Tabelas com `custom_data`:

- `tenants`;
- `customers`;
- `customer_entities`;
- `products`;
- `services`;
- `plans`;
- `requests`;
- `agent_configs`.

---

## 9. Feature flags

A plataforma deve possuir controle de features para:

- habilitar recursos por plano;
- liberar recursos manualmente;
- testar funcionalidades em tenants específicos;
- controlar módulos por nicho;
- proteger recursos incompletos;
- comercializar add-ons.

Feature flags devem poder ser avaliadas por:

- plano comercial;
- tenant;
- role;
- nicho;
- ambiente;
- liberação manual;
- período de trial.

---

## 10. Workflows

Workflows representam fluxos operacionais executados pelo sistema e pelo agente.

Um workflow deve possuir:

- nome;
- descrição;
- `trigger_intent`;
- nicho aplicável;
- prioridade;
- status;
- passos;
- regras de coleta;
- regras de saída;
- handoff;
- dados coletados;
- ações executadas.

Exemplos de workflows genéricos:

| Workflow | Trigger intent | Finalidade |
|---|---|---|
| Atendimento inicial | `initial_contact` | Iniciar conversa e identificar necessidade |
| Classificação de intenção | `intent_classification` | Identificar objetivo do cliente |
| Cadastro de cliente | `customer_registration` | Coletar dados do cliente |
| Cadastro de entidade do cliente | `customer_entity_registration` | Coletar dados de entidade vinculada |
| Consulta de produto | `product_inquiry` | Responder dúvidas sobre produtos |
| Pedido de produto | `product_order_request` | Registrar intenção/pedido |
| Consulta de serviço | `service_inquiry` | Responder dúvidas sobre serviços |
| Solicitação de agendamento | `appointment_request` | Coletar dados para agendamento |
| Interesse em plano | `plan_interest` | Registrar interesse em plano/pacote |
| Orçamento | `quote_request` | Coletar dados para orçamento |
| Handoff humano | `human_handoff_request` | Transferir para humano |
| Fora do horário | `off_hours_contact` | Responder fora do expediente |
| Reclamação | `complaint` | Encaminhar caso sensível |
| Dúvida fora do escopo | `out_of_scope_question` | Evitar resposta inadequada |

---

## 11. Integrações

## 11.1 WhatsApp

A integração inicial com WhatsApp será realizada via **Pilot Status**.

A plataforma deve permitir:

- configurar número do agente por tenant;
- receber webhooks;
- identificar tenant;
- salvar mensagem;
- processar mensagem;
- enviar resposta;
- pausar agente;
- acionar handoff;
- notificar responsável.

## 11.2 Integrações futuras

- gateways de pagamento;
- ERP;
- Google Agenda;
- CRMs;
- plataformas de e-commerce;
- webhooks customizados;
- APIs externas por nicho.

---

## 12. Arquitetura e infraestrutura

## 12.1 Stack sugerida

- Next.js;
- TypeScript;
- PostgreSQL;
- Prisma;
- Supabase, se usado como apoio de auth/storage/db gerenciado;
- Tailwind CSS;
- shadcn/ui;
- OpenAI ou Anthropic;
- Worker com fila/background jobs;
- Pilot Status para WhatsApp;
- Docker;
- VPS Hostinger.

## 12.2 Deploy

O projeto será implantado em uma **VPS da Hostinger**, dentro de um **contêiner Docker**, compartilhando a VPS com outros projetos.

A arquitetura de deploy deve considerar:

- isolamento por container;
- rede Docker dedicada;
- variáveis de ambiente por projeto;
- proxy reverso para roteamento por domínio/subdomínio;
- HTTPS;
- logs por serviço;
- restart automático;
- volumes persistentes;
- backup do banco;
- monitoramento básico;
- separação entre aplicação web, worker e banco quando necessário.

Serviços esperados:

- container da aplicação web/API;
- container de worker;
- container de banco PostgreSQL ou conexão com banco externo;
- proxy reverso compartilhado na VPS;
- serviço de logs/monitoramento, se aplicável.

## 12.3 Cuidados por compartilhar VPS

Como a VPS terá outros projetos, o Fluuy deve:

- usar nomes de containers únicos;
- usar rede Docker própria;
- evitar conflito de portas;
- usar `.env` separado;
- não expor banco diretamente;
- limitar uso de recursos quando necessário;
- documentar comandos de deploy;
- documentar rollback;
- documentar backup;
- garantir que o proxy reverso direcione apenas o domínio do Fluuy para os containers do Fluuy.

---

## 13. Desenvolvimento assistido por IA

O projeto deve ser desenvolvido usando specs, skills, hooks e MCPs das ferramentas adotadas.

## 13.1 Specs

Cada módulo relevante deve ter uma especificação própria contendo:

- objetivo;
- entidades;
- campos;
- regras de negócio;
- permissões;
- endpoints;
- estados;
- fluxos;
- critérios de aceite;
- casos de erro.

## 13.2 Skills

Skills devem ser usadas para tarefas recorrentes, como:

- criar schema Prisma;
- criar migration;
- criar endpoint;
- criar formulário;
- criar listagem;
- criar validação;
- criar workflow;
- criar prompt do agente;
- criar testes;
- revisar segurança multi-tenant;
- revisar permissões;
- revisar performance.

## 13.3 Hooks

Hooks devem validar automaticamente:

- lint;
- typecheck;
- testes;
- migrations;
- autenticação em endpoints;
- uso de `tenant_id`;
- checagem de roles;
- existência de feature flag;
- consistência de templates;
- segurança contra acesso cross-tenant.

## 13.4 MCPs

MCPs devem ser usados para conectar:

- Notion/documentação;
- repositório;
- banco;
- filesystem;
- navegador/documentação externa;
- gestão de tarefas;
- ferramentas de IA.

---

## 14. Critérios de sucesso do produto

O produto será considerado viável quando:

- tenants conseguirem configurar sua operação;
- agentes responderem clientes com contexto correto;
- o sistema registrar dados estruturados a partir de conversas;
- handoff humano funcionar de forma confiável;
- o dashboard mostrar valor operacional;
- novos nichos puderem ser adicionados via templates sem reescrita relevante;
- o sistema conseguir operar com múltiplos tenants isolados;
- a plataforma gerar disposição real de pagamento.

---

## 15. Fora do escopo da versão inicial do produto

- marketplace completo;
- app mobile;
- construtor visual avançado de workflows;
- BI avançado;
- ERP nativo;
- gateway de pagamento próprio;
- emissão de nota fiscal;
- automações complexas de marketing;
- múltiplos canais além de WhatsApp;
- sistema de suporte omnichannel completo;
- customização livre de banco por tenant;
- criação de nichos por tenant.
