# Plano de implementação — Tela Clientes/Pets (petshop)

Fonte: `.claude/docs/specs/crud/spec-crud-customers-petshop.json`
Gap analysis base: inventário de `customers-client.tsx`, `customer-form.tsx`, `template-fields.tsx`,
`data.ts`, `actions.ts`, `[customerId]/entity-*.tsx`.

> Fora de escopo (spec): Topbar, Sidebar e navegação global — não tocar.
> Cada fase é entregável e revisável de forma independente; respeitar a ordem por dependência.

## Decisões dos 6 conflitos

| # | Conflito | Decisão | Justificativa |
|---|----------|---------|---------------|
| 1 | `nasc`/idade do pet | Adicionar `nasc` (Data de nascimento) ao template Pets canônico (`pets-templates.json` + `seed.ts`) como campo `text` (yyyy-MM-dd), renderizado com DatePicker; idade/faixa derivada no client | A spec depende disso; mantém a fonte de verdade no template (regra multi-nicho), sem coluna fixa |
| 2 | Stepper vs tabs no edit | create = stepper, edit = tabs (conforme spec); reaproveita os mesmos painéis | No edit o registro já existe; tabs dão acesso livre |
| 3 | PetSheet + tabela Pets + toggle | Construir, com `PetSheet` como editor único de pet reutilizado (form do cliente, detalhe e lista) | Evita 3 superfícies divergentes de edição de pet |
| 4 | `pageSize 8` e ordem de colunas | Manter o padrão global (default 20, `[10,20,50,100]`); adotar a ordem/labels de colunas da spec | Consistência com `fluuy_crud_screens_standard_spec` |
| 5 | personType PF/PJ | Implementar SwitchToggle PF/PJ + labels dinâmicos (Nome↔Razão social, CPF/CNPJ↔CNPJ) + ocultar nascimento p/ PJ | Melhora de UX, baixo risco |
| 6 | `ai` em `CUSTOMER_SOURCES` | Adicionar `ai` ("Agente IA") ao enum (Zod + Prisma + label) | Sem isso, o badge "Agente IA" nunca aparece via `source`; `OriginBadge` já resolve `ai` |

## Fase 0 — Fundações de dados (decisões #1 e #6)
- `CUSTOMER_SOURCES` += `"ai"` em `lib/validations/customer.ts` + `CUSTOMER_SOURCE_LABELS.ai = "Agente IA"`.
- Prisma: adicionar `ai` ao tipo de `source` (migração se for enum nativo; nada se for `String`).
- Template Pets: incluir `{ key:"nasc", label:"Data de nascimento", type:"text" }` em `pets-templates.json` e no `prisma/seed.ts`.
- `TemplateFieldInputs`: render de `nasc` como DatePicker + helper de idade/faixa etária (Filhote ≤1a · Adulto · Idoso ≥7a).
- Saída: dados/labels prontos; sem UI nova. Risco: baixo.

## Fase 1 — Paridade da tabela de Clientes
- Reordenar colunas: `select · status · name · pets · phone · district · tags · created · source · actions`.
- Header `Origem` → "Cadastro por" (mantendo `OriginBadge`).
- Coluna Bairro (já computada em `data.ts`) + filtro `district` searchable.
- Coluna "Cadastro em" (`createdAt`) — `data.ts` seleciona/ordena `createdAt`.
- Tags com "+N" (máx. 2 + contador).
- Coluna Pets como actionLink (0 → Adicionar; 1 → nome; N → "{n} pets"); abre aba Pets do ClientSheet até o PetSheet existir.
- Seleção de linhas (header indeterminate) + BulkActionsBar "Inativar selecionados" (só Clientes) com AlertDialog.
- Error state ("Tentar novamente").
- Filtro pets (com/sem).
- Dep.: Fase 0 (created/source).

## Fase 2 — ClientSheet (decisões #2 e #5)
- edit = tabs / create = stepper (mesmos painéis).
- `confirmOnSave` no edit (lista campos alterados) — portar para `FormDrawerForm` ou replicar o AlertDialog.
- personType PF/PJ SwitchToggle + labels dinâmicos + ocultar nascimento p/ PJ.
- WhatsApp: ação "Usar telefone principal".
- Notas internas com contador.
- Fullscreen no Sheet (Maximize2/Minimize2, maxWidth 720) — prop nova no `FormDrawer`.
- Breadcrumb "Clientes › {nome}" no edit.
- Dep.: independente da Fase 1.

## Fase 3 — PetSheet compartilhado (decisão #3, parte 1)
- Novo `PetSheet` (um pet): Dados do pet (nome; espécie+raça; nasc+idade; porte+peso kg+sexo; castrado switch-card; observações), Tutor adicional colapsável (+ endereço do tutor), Contato de emergência.
- `NewPetClientPickerDialog`.
- Reutilizar `PetSheet` no passo Pets do CustomerForm, na página de detalhe e (Fase 4) na lista. Consolidar a action de `customer_entity`.
- Confirmações de remoção (pet, tutor adicional, endereço) com AlertDialog.
- Dep.: Fase 0 (`nasc`).

## Fase 4 — Visão Pets (decisão #3, parte 2)
- Toggle Clientes/Pets (Segmented) controlando título/descrição/botão/tabela/filtros/colunas/empty.
- Camada de dados da lista de Pets (CustomerEntity type=pet + tutor; busca em customData.nome/raca/customer.name; filtros especie/sexo/porte; paginação).
- PetsTable (TanStack): especie(ícone+cor por sexo) · pet · raca · porte · idade(faixa) · tutor · chevron; rowClick→PetSheet.
- Botão Novo pet → NewPetClientPickerDialog → PetSheet.
- Empty/filtered/error de Pets.
- Dep.: Fases 0, 3.

## Fase 5 — QA & acabamento
- Acessibilidade (aria-selected/pressed, foco em dialogs, stopPropagation), responsivo (sheets 100vw, grids→1 coluna), `design-qa-review` + `accessibility-auditor-wcag`.
- Atualizar specs/skills (toggle de visão, PetSheet, `ai` em source, `nasc`).
- Testes das actions (diff de pets, anti-IDOR, source preservado).

## Status de implementação (2026-06-22)

- **Fase 0 — ✅ feita.** `ai` adicionado ao enum `CustomerSource` (Zod + Prisma; migração `20260622015817_add_customer_source_ai` aplicada + client regenerado) e label "Agente IA". `nasc` (Data de nascimento) adicionado ao template Pets (`seed.ts` + `pets-templates.json`). `TemplateFieldInputs` renderiza `nasc` como DatePicker + pílula de idade/faixa etária (`describePetAge`).
- **Fase 1 — ✅ feita.** Tabela de Clientes: ordem de colunas da spec, "Cadastro por", coluna Bairro + filtro `district`, coluna "Cadastro em" (`createdAt`), tags "+N", coluna Pets como actionLink, seleção de linhas + BulkActionsBar "Inativar selecionados", filtro pets (com/sem). *Pendência:* error state da lista (precisa o `page.tsx` propagar erro) — não implementado.
- **Fase 2 — ✅ feita.** ClientSheet: edit=tabs / create=stepper, confirm-before-save (lista campos alterados), personType PF/PJ com labels dinâmicos + ocultar nascimento p/ PJ, "Usar telefone principal", contador de notas, `allowFullscreen` no `FormDrawer`.
- **Fase 3 — ✅ feita.** `PetSheet` (editor de 1 pet, agrupando tutor adicional / contato de emergência por prefixo de chave) + `NewPetClientPickerDialog`.
- **Fase 4 — ✅ feita.** Toggle Clientes/Pets, `listPets`/`listCustomerOptions` em `data.ts`, `pets-table.tsx` (espécie ícone+cor por sexo, idade derivada, tutor, chevron), filtros especie/sexo/porte, Novo pet → picker → PetSheet, empty/filtered states de Pets, `allowFullscreen` ativo nos drawers.
- **Fase 5 — ✅ feita.** Build verde, typecheck+lint limpos. Revisão de a11y/design-QA aplicada: 10 blockers corrigidos (cor-only no sexo do pet → sr-only; teclado nos toggles/tabs Clientes-Pets e edit; aria-labels em botões de ícone; perda de `birthDate` ao salvar PJ; diff de tags order-insensitive; IDOR nas writes de tag → tenant-scoped) + recomendados (validação de multiselect, título do PetSheet por entityLabel, reset do picker, overlay do AlertDialog, uid por crypto.randomUUID, navegação de URL batched, etc.). Specs atualizados (`ai` em CustomerSource, `nasc`, `allowFullscreen`).

### Desvios/decisões durante a execução
- Labels do toggle usam os rótulos dinâmicos do nicho (`Clientes`/`Pets`), consistente com o padrão de labels do código (não hardcoded).
- `PetSheet.openContexts` `onOpenClient`/`onBackToPets` não foram fiados — as linhas da tabela de Pets abrem o PetSheet de edição direto.
- Filtros de Pets (especie/sexo/porte) casam pelos **valores de label persistidos** (ex.: "Cão"/"Macho"/"Pequeno"), pois o motor de templates persiste o label da opção, não um slug.
- Ordenação da tabela de Pets: só `name` é ordenável em SQL; chaves em `customData` caem para ordenação por nome.

## Sequência / paralelismo
- Fase 0 primeiro (fundação; toca enums/template/seed/template-fields).
- Após a 0: Fases 1, 2 e 3 em paralelo (partição por arquivo: 1 = customers-client + data.ts; 2 = customer-form + form-drawer; 3 = novos pet-sheet/dialog + actions de entity — sem editar customer-form nesta rodada).
- Fase 4 após 0+3. Fase 5 ao final.
