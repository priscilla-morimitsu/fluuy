# Planejamento de Implementação — Fluuy

## 1. Diretriz geral

O Fluuy deve ser implementado em versões evolutivas, começando por uma base multi-tenant e multi-nicho enxuta, validando em um nicho real e expandindo gradualmente para automações, pagamentos, relatórios avançados e multi-canal.

A implementação deve evitar hardcode de nicho específico. Diferenças entre nichos devem ser representadas por:

- `niches`;
- `templates`;
- `custom_data`;
- `workflow_templates`;
- `tenant_workflows`;
- `agent_configs`;
- `feature_flags`;
- `tenant_features`;
- `billing_plans`.

---

## 2. Arquitetura de deploy

O projeto será executado em contêiner Docker dentro de uma VPS da Hostinger compartilhada com outros projetos.

## 2.1 Serviços recomendados

| Serviço | Função |
|---|---|
| `fluuy-web` | Aplicação Next.js/API |
| `fluuy-worker` | Processamento de mensagens e jobs |
| `fluuy-db` | PostgreSQL, se o banco ficar na VPS |
| `fluuy-redis` | Fila/cache, se necessário |
| `reverse-proxy` | Proxy compartilhado da VPS |
| `pilot-status-webhook` | Endpoint dentro da aplicação/API |

## 2.2 Requisitos de infraestrutura

- Docker;
- Docker Compose;
- rede Docker própria do Fluuy;
- variáveis de ambiente separadas;
- volumes persistentes;
- proxy reverso;
- HTTPS;
- domínio/subdomínio;
- logs;
- backup;
- restart automático;
- estratégia de rollback.

## 2.3 Cuidados por compartilhar VPS

- não usar portas públicas conflitantes;
- não expor banco diretamente;
- usar prefixo `fluuy_` em containers, volumes e redes;
- limitar recursos quando necessário;
- separar `.env`;
- documentar comandos de start/stop/deploy;
- garantir que outros projetos não compartilhem secrets do Fluuy.

---

## 3. Desenvolvimento assistido por IA

O projeto deve usar specs, skills, hooks e MCPs.

## 3.1 Specs obrigatórias

Criar specs por módulo:

- `spec-auth.md`;
- `spec-tenants.md`;
- `spec-niches-templates.md`;
- `spec-features-billing.md`;
- `spec-agent.md`;
- `spec-whatsapp-pilot-status.md`;
- `spec-customers.md`;
- `spec-catalog.md`;
- `spec-requests.md`;
- `spec-workflows.md`;
- `spec-dashboard.md`;
- `spec-deploy-docker-vps.md`.

## 3.2 Skills sugeridas

- criar schema Prisma;
- criar migration;
- criar CRUD;
- criar endpoint seguro;
- criar server action;
- criar formulário dinâmico baseado em template;
- criar validação Zod;
- criar workflow;
- criar prompt de agente;
- revisar segurança multi-tenant;
- revisar feature flags;
- revisar role permissions;
- revisar Docker/deploy.

## 3.3 Hooks obrigatórios

- lint;
- typecheck;
- testes;
- validar migrations;
- impedir endpoint sem auth;
- verificar `tenant_id` em queries;
- impedir ação admin sem `platform_admin`;
- validar feature flag em módulo protegido;
- validar schema dos campos personalizados;
- impedir agente de responder após handoff;
- validar variáveis de ambiente obrigatórias.

## 3.4 MCPs recomendados

- Notion MCP para documentação;
- filesystem MCP para specs e código;
- GitHub MCP para issues, PRs e revisão;
- database MCP para schema e consultas;
- browser/docs MCP para documentação de bibliotecas;
- task/project MCP, se usado.

---

## 4. Versão 0 — Fundação técnica

## Objetivo

Preparar o ambiente técnico e a base do projeto.

## Entregas

- Repositório inicial.
- Next.js + TypeScript.
- Tailwind + shadcn/ui.
- Prisma.
- PostgreSQL.
- Dockerfile.
- Docker Compose.
- Configuração de `.env`.
- Estrutura de pastas.
- Configuração de lint/typecheck.
- Setup de autenticação.
- Deploy inicial na VPS Hostinger em Docker.
- Proxy reverso com domínio/subdomínio.
- Healthcheck da aplicação.

## Critérios de aceite

- Aplicação sobe localmente via Docker.
- Aplicação sobe na VPS via Docker.
- Banco conecta corretamente.
- Migrations rodam.
- Login básico funciona.
- Healthcheck responde.

---

## 5. Versão 1 — MVP Core Multi-nicho

## Objetivo

Criar a base multi-tenant e multi-nicho.

## Entregas

### Admin Fluuy

- CRUD de tenants.
- CRUD de nichos.
- CRUD de templates.
- CRUD de features.
- CRUD de planos comerciais simples.
- Ativação/bloqueio de tenant.

### Tenant

- Perfil da empresa.
- Dados de atendimento.
- Dados de localização.
- Formas de pagamento.
- Campos personalizados via template.
- Usuários e roles básicas.

### Base técnica

- Tabelas:
  - `users`;
  - `tenants`;
  - `tenant_users`;
  - `niches`;
  - `templates`;
  - `features`;
  - `billing_plans`;
  - `plan_features`;
  - `tenant_features`.

## Critérios de aceite

- Admin cria um nicho.
- Admin cria templates para o nicho.
- Admin cria tenant vinculado ao nicho.
- Tenant preenche dados fixos e personalizados.
- A aplicação respeita roles.
- A aplicação respeita isolamento por tenant.

---

## 6. Versão 2 — Catálogo, clientes e solicitações

## Objetivo

Permitir que tenants cadastrem sua operação básica.

## Entregas

### Clientes

- CRUD de clientes.
- CRUD de entidades vinculadas ao cliente.
- Campos personalizados por template.

### Catálogo

- CRUD de produtos.
- CRUD de serviços.
- CRUD de planos/pacotes.
- Disponibilidade simples.
- Campos personalizados por template.

### Solicitações

- CRUD de solicitações.
- Tipos de solicitação.
- Status.
- Vinculação com cliente, entidade, conversa e itens.
- Origem manual ou agente.

## Critérios de aceite

- Tenant cadastra clientes.
- Tenant cadastra entidade específica do cliente conforme nicho.
- Tenant cadastra produtos, serviços e planos.
- Tenant cria solicitações.
- Todos os registros respeitam `tenant_id`.

---

## 7. Versão 3 — WhatsApp + Agente operacional

## Objetivo

Integrar o atendimento via WhatsApp e permitir respostas automáticas com IA.

## Entregas

### Pilot Status

- Configuração do número do agente.
- Webhook de recebimento.
- Envio de mensagens.
- Identificação do tenant pelo número.
- Logs de integração.

### Conversas

- Criar conversa automaticamente.
- Salvar mensagens recebidas.
- Salvar mensagens enviadas.
- Histórico de conversa.
- Status de conversa.
- Pausar agente.
- Handoff humano.

### Agente

- Configuração do agente.
- Nome.
- Tom de voz.
- Mensagem inicial.
- Mensagem fora do horário.
- Regras.
- Assuntos proibidos.
- Uso de contexto do tenant.
- Uso do catálogo.
- Uso de clientes e solicitações.

### Worker

- Processar mensagem em background.
- Identificar intenção.
- Escolher workflow.
- Salvar resposta.
- Enviar resposta.

## Critérios de aceite

- Mensagem real chega via webhook.
- Conversa é criada.
- Mensagem é salva.
- Agente responde com contexto.
- Handoff interrompe agente.
- Tenant visualiza conversa.

---

## 8. Versão 4 — Workflows MVP

## Objetivo

Transformar conversas em fluxos estruturados.

## Entregas

- `workflow_templates`;
- `tenant_workflows`;
- `workflow_runs`;
- execução de passos em JSON;
- coleta de dados;
- criação de solicitação;
- atualização de cliente;
- atualização de entidade;
- handoff;
- finalização de workflow.

## Workflows iniciais

- atendimento inicial;
- classificação de intenção;
- cadastro de cliente;
- cadastro de entidade;
- consulta de produto;
- pedido de produto;
- consulta de serviço;
- solicitação de agendamento;
- interesse em plano;
- orçamento;
- handoff humano;
- fora do horário;
- reclamação;
- fora do escopo.

## Critérios de aceite

- Agente inicia workflow correto.
- Dados coletados são salvos.
- Workflow mantém estado.
- Workflow cria solicitação.
- Workflow pode transferir para humano.
- Workflow pode finalizar.

---

## 9. Versão 5 — Dashboard e relatórios

## Objetivo

Gerar visibilidade de valor para o tenant.

## Entregas

### Dashboard

- Conversas totais.
- Conversas respondidas pela IA.
- Handoffs.
- Clientes criados.
- Solicitações criadas.
- Pedidos.
- Agendamentos.
- Orçamentos.
- Interesses em planos.
- Conversas fora do horário.
- Uso de IA.

### Relatório simples

- Resumo semanal.
- Principais dúvidas.
- Itens mais perguntados.
- Oportunidades.
- Handoffs.
- Sugestões de melhoria.

## Critérios de aceite

- Métricas filtram por período.
- Métricas respeitam tenant.
- Relatório pode ser gerado.
- Tenant visualiza valor operacional.

---

## 10. Versão 6 — Validação comercial com nicho inicial

## Objetivo

Validar o uso real da plataforma em um nicho específico, usando a estrutura genérica criada nas versões anteriores.

## Entregas

- Criar template real do nicho.
- Configurar tenant real.
- Cadastrar dados reais.
- Ativar integração WhatsApp.
- Acompanhar conversas reais.
- Ajustar workflows.
- Coletar feedback.
- Medir disposição de pagamento.

## Critérios de aceite

- Tenant real usando o sistema.
- Conversas reais processadas.
- Solicitações úteis criadas.
- Dono/gestor percebe valor.
- Há feedback para priorização da próxima versão.

---

## 11. Versão 7 — Follow-ups e notificações

## Objetivo

Adicionar automações proativas.

## Entregas

- Notificações manuais.
- Notificações automáticas.
- Follow-up de orçamento.
- Follow-up de solicitação.
- Lembretes.
- Reativação simples.
- Jobs agendados.
- Templates de mensagem.

## Critérios de aceite

- Tenant cria lembrete.
- Sistema dispara mensagem programada.
- Follow-up respeita regras.
- Cliente não recebe mensagens duplicadas.

---

## 12. Versão 8 — Pagamentos e recorrência

## Objetivo

Adicionar monetização operacional para tenants.

## Entregas

- Integração com gateway de pagamento.
- Link de pagamento.
- Registro de pagamento.
- Planos/assinaturas de clientes finais.
- Renovação.
- Cancelamento.
- Estorno, se suportado.
- Webhooks de pagamento.

## Critérios de aceite

- Tenant gera cobrança.
- Sistema registra status.
- Webhook atualiza pagamento.
- Assinatura pode ser acompanhada.

---

## 13. Versão 9 — Integrações externas

## Objetivo

Conectar o Fluuy a ferramentas usadas pelos tenants.

## Entregas

- Google Agenda.
- ERP externo.
- Importação de produtos.
- Estoque simples.
- Webhooks customizados.
- API pública inicial.

## Critérios de aceite

- Integração pode ser ativada por tenant.
- Tokens são armazenados com segurança.
- Dados externos são sincronizados.
- Falhas são logadas.

---

## 14. Versão 10 — Sistema completo

## Objetivo

Evoluir para plataforma multi-nicho madura.

## Entregas

- Multi-canal além de WhatsApp.
- Construtor visual de workflows.
- RAG avançado.
- Base de conhecimento com arquivos.
- Segmentação avançada.
- Campanhas.
- BI avançado.
- Marketplace.
- Billing completo do Fluuy.
- Add-ons.
- Auditoria avançada.
- Logs estruturados.
- Permissões granulares.
- Templates versionados.
- Biblioteca de nichos.
- Clonagem de templates.
- Métricas comparativas por nicho.
- Sugestões automáticas de melhoria.

## Critérios de aceite

- Novo nicho pode ser criado sem alteração estrutural.
- Tenant pode operar com automações avançadas.
- Plataforma suporta múltiplos tenants em produção.
- Admin consegue gerenciar planos, limites, uso e features.
- Sistema possui observabilidade, segurança e escalabilidade adequadas.
