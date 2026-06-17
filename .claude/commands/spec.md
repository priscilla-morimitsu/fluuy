# /spec

Cria ou atualiza um arquivo de especificação em `spec/` otimizado para consumo por IA — linguagem precisa, sem ambiguidade, auto-contido.

## Usage

```
/spec <descrição do que especificar>
/spec update <spec/arquivo.md>
```

## Naming convention

O arquivo deve seguir: `spec/[purpose]-[subject].md`

Onde `[purpose]` é um de: `schema`, `tool`, `data`, `infrastructure`, `process`, `architecture`, `design`

Exemplos: `spec/schema-user.md`, `spec/process-checkout.md`, `spec/architecture-api-gateway.md`

## Phase 1: Gather context

Se **criando**: leia os arquivos relevantes ao tema (modelos, rotas, schemas, README) para embasar a spec em código real — não em suposições.

Se **atualizando** (`/spec update <arquivo>`): leia o arquivo de spec existente primeiro, depois leia o código que mudou. Identifique quais seções precisam de atualização.

## Phase 2: Write spec

Produza um arquivo Markdown bem formado seguindo o template abaixo. Preencha todas as seções — omita uma seção apenas se genuinamente não aplicável, com uma nota explicando por quê.

```markdown
---
title: [Título conciso descrevendo o foco da spec]
version: 1.0
date_created: YYYY-MM-DD
last_updated: YYYY-MM-DD
tags: [lista de tags relevantes]
---

# Introdução

[Introdução curta: o que esta spec define e qual objetivo ela atinge.]

## 1. Propósito e escopo

[Descrição clara do propósito, escopo de aplicação, público-alvo e premissas.]

## 2. Definições

[Todos os acrônimos, abreviações e termos de domínio usados neste documento.]

| Termo | Definição |
|-------|-----------|
| ... | ... |

## 3. Requisitos, restrições e diretrizes

Use prefixos para classificar cada item:

- **REQ-001**: Requisito funcional
- **SEC-001**: Requisito de segurança
- **CON-001**: Restrição (constraint)
- **GUD-001**: Diretriz (guideline)
- **PAT-001**: Padrão a seguir

## 4. Interfaces e contratos de dados

[APIs, schemas, payloads, tipos. Use tabelas ou blocos de código.]

## 5. Critérios de aceitação

Formato Given-When-Then onde aplicável:

- **AC-001**: Given [contexto], When [ação], Then [resultado esperado]
- **AC-002**: The system shall [comportamento] when [condição]

## 6. Estratégia de testes

- **Níveis**: Unit, Integration, E2E
- **Frameworks**: [frameworks do projeto]
- **Cobertura mínima**: [threshold]
- **CI/CD**: [como os testes rodam no pipeline]

## 7. Racional e contexto

[Por que essas decisões foram tomadas. Alternativas consideradas e rejeitadas.]

## 8. Dependências e integrações externas

Foco em **o que** é necessário, não **como** implementar. Não liste versões de pacotes salvo quando são restrições arquiteturais.

- **EXT-001**: [Sistema externo] — [propósito e tipo de integração]
- **SVC-001**: [Serviço] — [capacidades necessárias e SLA]
- **INF-001**: [Componente de infra] — [requisitos e restrições]

## 9. Exemplos e casos de borda

\`\`\`
[Snippet de código ou exemplo de dados demonstrando a aplicação correta,
incluindo casos de borda relevantes]
\`\`\`

## 10. Critérios de validação

[Lista de critérios ou testes que devem ser satisfeitos para conformidade com esta spec.]

## 11. Specs relacionadas / leitura adicional

- [Link para spec relacionada 1]
- [Link para documentação externa relevante]
```

## Best practices for AI-ready specs

- Linguagem precisa, explícita, sem ambiguidade — sem metáforas ou referências dependentes de contexto
- Distinguir claramente entre requisitos, restrições e diretrizes (usar os prefixos REQ/SEC/CON/GUD/PAT)
- Formatação estruturada (headings, listas, tabelas) para fácil parsing por IA
- Definir todos os acrônimos e termos de domínio na seção 2
- Incluir exemplos e casos de borda na seção 9
- Documento auto-contido — não deve depender de contexto externo para ser entendido

## Rules

- Spec nova: salvar em `spec/[purpose]-[subject].md`. Criar o diretório `spec/` se não existir.
- Spec existente (`/spec update`): atualizar `last_updated` no frontmatter e apenas as seções afetadas pela mudança — não reescrever o documento todo.
- Todo claim na spec deve ser verificável no código — não inventar requisitos.
- Se uma seção não se aplica, escrevê-la com `N/A — [motivo em uma linha]`, não omiti-la silenciosamente.
