Você está integrando com a API do Pilot Status — uma plataforma de envio e automação de mensagens para usuários finais.

## Base URL
https://pilotstatus.online/v1

## Autenticação
Toda requisição exige um destes headers:
x-api-key: <sua_api_key>
x-api-key-id: <id_da_api_key>

As chaves possuem prefixos: ps_test_* (TEST) ou ps_live_* (LIVE). Cada chave é vinculada a um projeto.

## Escopo (projeto + ambiente)
A plataforma inteira é escopada por projeto e ambiente. API keys, templates, logs, webhooks e analytics são sempre filtrados pelo projeto e ambiente (TEST ou LIVE) da API key usada (x-api-key ou x-api-key-id).

## Compliance e anti-spam
- Alto volume e envio não solicitado podem acionar mecanismos anti-spam do WhatsApp (limites, bloqueios e banimentos).
- Você é responsável por opt-in/consentimento, uso lícito e conformidade com leis e políticas do WhatsApp.
- Não tente burlar limitações; prefira throttling, segmentação, controle de frequência e instruções de opt-out/parar.

## Ambientes
- TEST: sandbox — templates são aprovados automaticamente. Envios: telefone do Perfil (e número Pilot Status quando aplicável), ou um grupo WhatsApp listado em `GET /v1/groups` com nome exato **Pilot Status Group** quando a API key tem **instância WhatsApp vinculada** e a sessão está **OPEN**. Envios com `newsletterId` (**@newsletter**) **não** são permitidos em TEST (HTTP **403** `NEWSLETTER_NOT_ALLOWED_IN_TEST`).
- LIVE: tráfego real — templates precisam de aprovação, exige aprovação de Produção. Retorna 403 se não aprovado.

## Categorias de template e regras de envio
- Todo template tem uma categoria definida na criação: OTP, UTILIDADE ou MARKETING (não pode ser alterada depois).
- Se estiver enviando pelo número da Pilot Status: OTP pode enviar sem opt-in; UTILIDADE exige opt-in do destino; MARKETING não pode ser enviado (conecte seu próprio número). Tentar MARKETING na instância/número padrão da Pilot Status retorna HTTP 403 com código TEMPLATE_CATEGORY_MARKETING_REQUIRES_OWN_NUMBER.

## Endpoints

### 1. Enviar mensagem
POST /v1/messages/send
Content-Type: application/json
x-api-key: <key> (ou x-api-key-id: <id_da_api_key>)

Body:
{
  "templateId": "string (do dashboard)",
  "destinationNumber": "+5511999999999 (E.164)",
  "groupId": "5511967435133-1561472255@g.us", // JID do grupo (exclusivo com destinationNumber e newsletterId)
  "newsletterId": "120363426657042325@newsletter", // JID do canal (exclusivo com destinationNumber e groupId)
  "variables": { "name": "João" },
  "labels": ["vip", "prioridade"], // opcional: marca o destino com Labels (escopo do tenant); processado de forma assíncrona
  "deliverAt": "2026-12-18T19:27:00Z", // ISO8601 (opcional)
  "deliverUntil": "2026-12-18T19:30:00Z", // ISO8601 (opcional)
  "marketingOptions": { "aiRewriteEnabled": true } // opcional: só MARKETING — ativa variação automática do texto (anti-spam)
}

Notas:
- `deliverAt` é opcional; sem ele, a mensagem é enviada assim que possível.
- `deliverUntil` é opcional; define o limite máximo de tempo para a entrega da mensagem. Se não for entregue até esse momento, será marcada como FAILED. Se omitido, os limites padrão se aplicam: OTP (2 minutos), UTILITY (1 hora), MARKETING (4 horas).
- **MARKETING anti-spam:** cada envio MARKETING recebe atraso variável automático na fila (padrão **8–25 s**) e, opcionalmente, `marketingOptions.aiRewriteEnabled` pode variar o texto final preservando o sentido da mensagem.
- Se agendada e a plataforma não conseguir entregar em ~10 min após `deliverAt`, a mensagem pode ser marcada como FAILED (timeout).
- Envio para grupo ou canal: use **exatamente um** entre `destinationNumber` (E.164), `groupId` (…`@g.us`) ou `newsletterId` (…`@newsletter`). Obtenha `groupId` via webhooks `message.group` e JIDs de canal via `GET /v1/newsletters` (quando disponível) ou webhooks `message.newsletter`.
- Labels: `labels` (array de strings) cria/atualiza Labels e associa o destino. Se a API key tiver `retentionDays: 0`, as Labels são criadas mas o vínculo com número não é persistido (PII desligado).
- Variáveis do template (`variables`): todo `{{placeholder}}` no corpo do template (incluindo JSON, ex.: texto de botões) precisa existir como **chave** em `variables`. Cada valor deve ser **string JSON** com pelo menos um caractere que não seja espaço (`""` ou só espaços são rejeitados). Número, `null` ou chave ausente são rejeitados. **400** com `code`: **`MISSING_TEMPLATE_VARIABLES`** (`details.missingKeys`) ou **`INVALID_TEMPLATE_VARIABLE_VALUE`** (`details.invalidKeys`: `{ key, reason }`).

Resposta 202:
{ "id": "msg_abc", "correlationId": "corr_123", "status": "QUEUED", "createdAt": "ISO8601", "origin": "rótulo da instância WhatsApp" }

Correlação com webhooks (mesma regra da secção Webhooks em /docs):
- Guarde o id do 202 → mesmo valor que internalMessageId em message.sent/delivered/read/failed e messageRepliedId em message.reply quando existir.
- O messageId do WhatsApp não vem no 202; só após message.sent.
- No message.reply: quotedMessageId = messageId do message.sent original; o messageId do reply é a mensagem nova recebida.

Erros: 400 (validação da requisição ou códigos de variáveis acima), 401 (chave inválida), 403 (LIVE não aprovado / destino bloqueado em TEST / opt-in quando aplicável / MARKETING no número Pilot Status → código TEMPLATE_CATEGORY_MARKETING_REQUIRES_OWN_NUMBER), 404 (template sem versão aprovada), 429 (rate limit)

### 1b. Listar grupos do WhatsApp
GET /v1/groups
x-api-key: <key> (ou x-api-key-id: <id_da_api_key>)

Resposta 200:
{ "groups": [ { "id": "5511967435133-1561472255@g.us", "name": "Equipe vendas" } ] }

Notas:
- Usa a **mesma instância WhatsApp** que `POST /v1/messages/send` para esta API key (número vinculado quando houver, senão a instância padrão do tenant para este projeto).
- A instância precisa estar **conectada** na ligação primária; senão HTTP **409** com `code`: **WHATSAPP_INSTANCE_NOT_CONNECTED**.
- Em **TEST**, veja **Ambientes** acima (telefone vs grupo permitido vs newsletter bloqueada).
- **n8n:** o node oficial tem **Enviar para**: Telefone / Grupo / Newsletter; as listas vêm de `GET /v1/groups` e `GET /v1/newsletters` (pacote npm `n8n-nodes-pilot-status`).

### 1c. Listar newsletters do WhatsApp (canais)
GET /v1/newsletters
x-api-key: <key> (ou x-api-key-id: <id_da_api_key>)

Resposta 200:
{ "newsletters": [ { "id": "120363426657042325@newsletter", "name": "Nome do canal" } ] }

Notas:
- Mesma **resolução de instância**, exigência **OPEN** e **409** `WHATSAPP_INSTANCE_NOT_CONNECTED` que `GET /v1/groups` (ligação primária). Se a API key não tiver instância WhatsApp vinculada, a API devolve **200** `{ "newsletters": [] }`.
- **Disponibilidade:** quando a **listagem de canais** WhatsApp não está ativa para o seu workspace, a API devolve mesmo **200** com `newsletters` **vazio** (mesmo com a instância conectada).
- A resposta fica **em cache por 1 hora**;
- **Painel:** em **Números**, cada linha conectada pode abrir **Listar newsletters** (sessão `GET /api/whatsapp-instances/<id>/newsletters`); a UI guarda cache no browser de **1 hora**, alinhado ao endpoint público.
- **n8n:** com **Enviar para** = **Newsletter (canal)**, o node carrega opções de `GET /v1/newsletters`. `POST /v1/messages/send` não exige chamada prévia se você já tiver o JID.

### 2. Consultar status da mensagem
GET /v1/messages/<messageId>
x-api-key: <key> (ou x-api-key-id: <id_da_api_key>)

Resposta 200:
{ "id": "msg_abc", "status": "SENT|QUEUED|READ|FAILED|CANCELED", "correlationId": "corr_123", "destinationNumber": "+55...", "template": "name", "createdAt": "ISO", "sentAt": "ISO|null", "readAt": "ISO|null", "errorMessage": "string|null" }

### 2b. Cancelar agendamentos (lote)
DELETE /v1/messages/cancel
Content-Type: application/json
x-api-key: <key> (ou x-api-key-id: <id_da_api_key>)

Body:
{ "messageIds": ["msg_abc", "msg_def"] }

Resposta 200:
{ "cancelled": ["msg_abc"], "failed": [{ "id": "msg_def", "reason": "string" }] }

Notas:
- DELETE com corpo JSON; curl/fetch/axios suportam.
- Define status CANCELED (registo mantido; não é FAILED). Só mensagens QUEUED com entrega futura.

Sobre status Lido:
- O status READ e readAt só ficam disponíveis quando o contato que recebeu a mensagem tem confirmação de leitura habilitada no WhatsApp (Configurações > Privacidade > Confirmações de leitura). A tela de Logs e os modais de Webhook exibem o mesmo aviso.

### 3. Analytics (dashboard)
GET /v1/analytics/dashboard?tz=America/Sao_Paulo
x-api-key: <key> (ou x-api-key-id: <id_da_api_key>)

Resposta 200:
{ "totalSent": 120, "totalFailed": 3, "sentPercentChange": 0, "failedPercentChange": 0, "failureRate": 2.44, "dailyMessages": [{ "date": "YYYY-MM-DD", "count": N }], "statusDistribution": { "queued": 10, "sent": 80, "failed": 2.5, "read": 7.5 } }

### 4. Verificar opt-in (somente LIVE, número Pilot Status)
GET /v1/messages/opt-in?destinationNumber=%2B5511999999999
x-api-key: <key> (ou x-api-key-id: <id_da_api_key>)

Resposta 200:
{ "authorized": true, "required": true, "enabled": true, "reason": null, "firstOptInAt": "ISO", "lastSeenAt": "ISO" }

### 5. Projetos
GET /v1/projects
POST /v1/projects
x-api-key: <key> (ou x-api-key-id: <id_da_api_key>)

Body:
{ "name": "Meu Projeto", "description": "Opcional" }

Exemplo de request (GET):
curl https://pilotstatus.online/v1/projects \
  -H "x-api-key: ps_test_your_token_here"

Exemplo de response (GET):
HTTP 200
[
  {
    "id": "proj_abc",
    "name": "Meu Projeto",
    "slug": "meu-projeto",
    "description": "",
    "productionApproved": false,
    "createdAt": "2026-02-24T15:00:00.000Z"
  }
]

Exemplo de request (POST):
curl -X POST https://pilotstatus.online/v1/projects \
  -H "Content-Type: application/json" \
  -H "x-api-key: ps_test_your_token_here" \
  -d '{ "name": "Meu Projeto", "description": "Opcional" }'

Exemplo de response (POST):
HTTP 201
{ "id": "proj_abc", "name": "Meu Projeto", "slug": "meu-projeto", "description": "Opcional", "productionApproved": false, "createdAt": "2026-02-24T15:00:00.000Z" }

### 6. API Keys
GET /v1/api-keys
POST /v1/api-keys
x-api-key: <key> (ou x-api-key-id: <id_da_api_key>)

Body:
{ "name": "Backend Key", "retentionDays": 30, "webhookId": null, "whatsappInstanceId": null }

Notas:
- A nova key herda o mesmo projeto e o mesmo ambiente (TEST/LIVE) da sua API key atual (x-api-key ou x-api-key-id).
- A key raw é exibida apenas uma vez na resposta de criação.

### SaaS multi-clientes (um projeto, vários números por cliente)
- Crie uma “API key pai” no dashboard para o projeto desejado.
- Use a key pai para criar “keys filhas” via POST /v1/api-keys (elas herdam o mesmo projeto/ambiente).
- Para cada cliente que quer conectar o próprio WhatsApp, chame POST /v1/numbers usando a key filha daquele cliente (o número fica vinculado à key usada na chamada por padrão) e exiba o QR code retornado.
- Envie mensagens usando a mesma key filha para rotear pelo número conectado daquele cliente.

Exemplo de request (GET):
curl https://pilotstatus.online/v1/api-keys \
  -H "x-api-key: ps_test_your_token_here"

Exemplo de response (GET):
HTTP 200
[
  {
    "id": "key_abc",
    "name": "Backend Key",
    "keyPrefix": "ps_test_",
    "environment": "TEST",
    "lastUsedAt": null,
    "createdAt": "2026-02-24T15:00:00.000Z",
    "webhookId": null,
    "projectId": "proj_abc",
    "webhook": null,
    "whatsappInstanceId": null,
    "whatsappInstance": null,
    "retentionDays": 30
  }
]

Exemplo de request (POST):
curl -X POST https://pilotstatus.online/v1/api-keys \
  -H "Content-Type: application/json" \
  -H "x-api-key: ps_test_your_token_here" \
  -d '{ "name": "Backend Key", "retentionDays": 30 }'

Exemplo de response (POST):
HTTP 201
{ "id": "key_abc", "name": "Backend Key", "environment": "TEST", "key": "ps_test_***", "keyPrefix": "ps_test_", "createdAt": "2026-02-24T15:00:00.000Z", "webhookId": null, "whatsappInstanceId": null, "retentionDays": 30 }

### 7. Números (WhatsApp)
GET /v1/numbers
POST /v1/numbers
GET /v1/numbers/<id>/connect
GET /v1/numbers/<id>/status
POST /v1/numbers/<id>/upgrade-to-dual
DELETE /v1/numbers/<id>
x-api-key: <key> (ou x-api-key-id: <id_da_api_key>)

Body:
{ "name": "Meu WhatsApp", "number": "+5511999999999", "linkToApiKey": true, "linkMode": "SINGLE" }

Notas:
- GET /v1/numbers devolve um array JSON com todas as instâncias WhatsApp do tenant (credenciais de sessão não são devolvidas; primaryLink/secondaryLink seguem o mesmo mapeamento que a lista do painel Números; a listagem não força atualização em massa do estado da conexão — use GET .../status por id quando precisar).
- **Painel Números:** com pelo menos uma ligação **OPEN**, cada linha oferece **Listar grupos** e **Listar newsletters** (modais com sessão). A **listagem de canais (newsletter)** só mostra JIDs quando o Pilot Status consegue obtê-los dessa ligação; se a listagem de canais não estiver disponível para o seu workspace, a interface explica em vez de simular uma tabela cheia.
- linkMode é opcional: "SINGLE" (padrão) ou "DUAL". Sem o campo, o comportamento é o legado.
- Com Dual Link disponível para a sua organização, "DUAL" provisiona uma segunda conexão; a resposta inclui primaryLink e secondaryLink. Os campos legados qrcodeBase64 e pairingCode continuam só da conexão primária.
- GET /connect e GET /status aceitam query opcional ?link=primary (padrão) ou ?link=secondary.
- POST /upgrade-to-dual promove um número SINGLE existente e devolve { secondaryLink: { qrcodeBase64, pairingCode } }.

Exemplo de request (POST):
curl -X POST https://pilotstatus.online/v1/numbers \
  -H "Content-Type: application/json" \
  -H "x-api-key: ps_test_your_token_here" \
  -d '{ "name": "Meu WhatsApp", "number": "+5511999999999", "linkToApiKey": true }'

Exemplo de response (POST):
HTTP 201
{ "instance": { "id": "wa_abc", "instanceName": "PS-xxxxxxxx-xxxxxxxx", "number": "5511999999999", "name": "Meu WhatsApp", "status": "CONNECTING" }, "qrcodeBase64": "data:image/png;base64,...", "pairingCode": "ABCD-EFGH", "linkedApiKeyId": "key_current" }

Exemplo de request (GET lista):
curl https://pilotstatus.online/v1/numbers \
  -H "x-api-key: ps_test_your_token_here"

Exemplo de response (GET lista):
HTTP 200
[
  {
    "id": "wa_abc",
    "instanceName": "PS-xxxxxxxx-xxxxxxxx",
    "number": "5511999999999",
    "createdAt": "2026-02-24T15:00:00.000Z",
    "updatedAt": "2026-02-24T15:00:00.000Z",
    "name": "Meu WhatsApp",
    "apiKeys": [],
    "linkMode": "SINGLE",
    "primaryLink": { "state": "OPEN", "connectedAt": "2026-02-24T15:00:00.000Z" },
    "secondaryLink": null,
    "isFullyConnected": true
  }
]

Exemplo de request (GET):
curl https://pilotstatus.online/v1/numbers/wa_abc/status \
  -H "x-api-key: ps_test_your_token_here"

Exemplo de response (GET):
HTTP 200
{ "id": "wa_abc", "state": "OPEN" }

Gerar QR code novamente para um número existente (somente quando o status não é OPEN):
GET /v1/numbers/<id>/connect

Exemplo de request (GET):
curl https://pilotstatus.online/v1/numbers/wa_abc/connect \
  -H "x-api-key: ps_test_your_token_here"

Exemplo de response (GET):
HTTP 200
{ "qrcodeBase64": "data:image/png;base64,...", "pairingCode": "ABCD-EFGH" }

### Pareamento Remoto (Remote Pairing)

Para plataformas que gerenciam números para clientes finais e precisam gerar um link de conexão:

POST /v1/numbers/remote-pairing
x-api-key: <key> (ou x-api-key-id: <id_da_api_key>)

Body:
{ "name": "Cliente João", "number": "+5511999999999", "linkToApiKey": true, "linkMode": "SINGLE", "sendViaWhatsApp": true }

Resposta 201:
{ "instance": { ... "state": "CLOSE" }, "remotePairingUrl": "https://pilotstatus.com/connect/abc123-def456-...", "maskedNumber": "+551199****9999", "messageSent": true }

Diferenças em relação ao POST /v1/numbers:
- A instância é criada em estado CLOSE (não CONNECTING) — nenhum QR code é retornado
- remotePairingUrl é um link para o cliente final acessar (iframe, modal, link)
- Com sendViaWhatsApp: true, o Pilot Status envia uma mensagem template OTP para o número destino com o link
- Quando o cliente final acessa a URL e conecta, o webhook number.connected dispara normalmente

Endpoints públicos (sem autenticação — via token):
- GET /v1/remote-pairing/{token} → { valid, name, maskedNumber, linkMode, state }
- POST /v1/remote-pairing/{token}/connect → { qrcodeBase64, pairingCode, secondaryLink? }
- GET /v1/remote-pairing/{token}/status → { state, primaryLink, secondaryLink?, isFullyConnected }

O token expira após 24h ou após conexão bem-sucedida (uso único).

## Webhooks
Configure no dashboard. Webhooks podem ser restritos a números específicos ou ouvir todos. Eventos enviados via POST para sua URL:
- message.sent — { messageId, internalMessageId, environment, destinationNumber, content, status, sentAt, correlationId? }
- message.delivered — mesmo formato, status "DELIVERED", deliveredAt, correlationId?
- message.read — mesmo formato, status "READ", readAt, correlationId?
- message.failed — { messageId, internalMessageId, environment, destinationNumber, content, status, failedAt, errorMessage, correlationId? }
- message.reply — { from, destinationNumber, content, replyContent, receivedAt, messageId, quotedMessageId, messageRepliedId, environment, buttonId, correlationId? }
- message.received — { fromMe, from, destinationNumber, content, receivedAt, messageId, environment, correlationId? }
- message.group — { fromNumber, fromName, fromMe, groupId, groupName, content, environment, messageId, happenedAt }
- message.newsletter — { fromNumber, fromName, fromMe, newsletterId, newsletterName, content, environment, messageId, happenedAt } (`newsletterName` quando o nome do canal estiver disponível)

Notas do payload:
- Payloads de webhook do cliente não incluem: projectSlug, lastMessageId. O **correlationId** opcional (mesmo id de negócio do HTTP 202 quando existir) pode aparecer nos eventos de status de saída e em **message.reply** / **message.received** quando houver correlação com um envio anterior. Use messageId / messageRepliedId para rastreamento.
- **message.newsletter**: `newsletterName` é o nome de exibição do canal quando disponível; senão `null`. Use `newsletterId` (JID completo) e os campos do autor (`fromNumber`, `fromName`).
- message.reply: replyContent = resposta do contato; content = texto citado (pode vir vazio); use quotedMessageId com o messageId do message.sent original.
- message.read / status READ: só ocorre quando o destinatário tem confirmação de leitura habilitada no WhatsApp.

## SDK (Node.js / TypeScript)
npm i @pilot-status/sdk
Docs: https://www.npmjs.com/package/@pilot-status/sdk

import { PilotStatusClient } from "@pilot-status/sdk";
const client = new PilotStatusClient({ apiKey: process.env.PILOT_STATUS_API_KEY! });

## SDK (Python)
pip install pilot-status
Docs: https://pypi.org/project/pilot-status/

import os
from pilot_status import PilotStatusClient
client = PilotStatusClient(api_key=os.environ["PILOT_STATUS_API_KEY"])

## Formatação de texto WhatsApp (corpo do template)
Ao escrever o `body` do template (texto puro dentro do JSON), você pode usar os marcadores nativos do WhatsApp para o destinatário ver negrito, listas etc. Use apenas caracteres literais — nunca HTML. Variáveis continuam como `{{snake_case}}`.
- Itálico: _texto_
- Negrito: *texto*
- Tachado: ~texto~
- Bloco monospace: linha com três crases, conteúdo (pode ser várias linhas), depois linha de fechamento com três crases
- Código inline: crases simples em volta de um trecho curto (geralmente uma linha)
- Lista com marcadores: linha começa com "* " (asterisco + espaço) ou "- " (hífen + espaço)
- Lista numerada: linha começa com dígitos, ponto e espaço (ex.: "1. ")
- Citação: linha começa com "> " (maior + espaço)
Não confunda linha de lista com negrito: em listas o asterisco fica no início da linha seguido de espaço; negrito envolve palavras com asteriscos.

## Regras principais
- Nunca exponha API key no frontend — apenas backend.
- Números sempre em E.164, com +.
- Comece em TEST e só depois solicite LIVE no Perfil.
- Para 429/5xx, implemente retries com exponential backoff.
- Retenção é por API key (retentionDays). Com 0, PII não é persistido e webhooks podem vir com campos sensíveis vazios.