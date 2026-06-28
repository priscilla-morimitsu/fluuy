# Demo — Agente Fluuy no nicho Petshop ("Demo Petshop")

Roteiro e base de dados para **demonstrar o agente da Fluuy** simulando atendimento, venda,
agendamento e suporte para um dono de petshop (cliente da Fluuy).

- **Tenant:** Demo Petshop (`/t/demo-petshop`)
- **Login do dono:** `dono@demopetshop.com` / `demo1234`
- **Seed:** `npm run db:seed && npm run db:seed:demo:petshop` (idempotente — recria os dados do
  tenant a cada execução). Fonte: [prisma/seed-demo-petshop.ts](../../../prisma/seed-demo-petshop.ts).

A base traz dados próximos da realidade de um petshop de bairro em São Paulo: **25 produtos**
(marcas reais — Golden, Premier, Royal Canin, Whiskas…), **11 serviços** (banho/tosa por porte,
vet, vacina, hotel/creche, táxi dog), **5 planos**, **6 tutores com 8 pets**, **5 pedidos**,
**7 agendamentos** (3 criados pelo "agente"), **4 leads** e **3 conversas** de WhatsApp.

---

## 1. Onboarding: as 5 perguntas (adaptar a simulação ao cliente real)

Antes do demo, o agente de onboarding entrevista o **dono** com **no máximo 5 perguntas** e usa as
respostas para calibrar o tenant. Cada resposta mapeia para um parâmetro do seed (bloco `PROFILE`
+ catálogo em `seed-demo-petshop.ts`):

| # | Pergunta ao dono | Ajusta no demo |
|---|---|---|
| 1 | **Quais serviços você oferece?** (banho/tosa, veterinário, vacinação, hotel/creche, leva-e-traz) | quais `Service` + features (`service_catalog`, `appointments`, `deliveries`) |
| 2 | **Vende produtos/ração? Quais marcas principais?** | catálogo `Product` (marcas/linhas) + feature `product_catalog` |
| 3 | **Como é o preço de banho/tosa por porte?** | `Service.basePrice` + `customData.pricingBySize` |
| 4 | **Tem plano ou pacote mensal?** | `OfferPlan` (assinatura/pacote/combo) + feature `plans_catalog` |
| 5 | **Qual o horário e os bairros atendidos (entrega/leva-e-traz)?** | `Tenant.businessHours`, `serviceAreas`, `hasDelivery` |

> O "Demo Petshop" representa um petshop **completo** (as 5 respostas no cenário cheio). Para um
> cliente que, por exemplo, **não** tem veterinário, basta remover esses serviços/feature no seed
> e a simulação se ajusta. As perguntas são o suficiente para um demo crível sem fricção.

---

## 2. Roteiros de demonstração (com dados reais do Demo Petshop)

Os exemplos abaixo já funcionam contra a base semeada. As tools de leitura/escrita do MCP que o
agente usa estão em [../agent/zatten/03_tools_mcp_e_gatilhos.md](../agent/zatten/03_tools_mcp_e_gatilhos.md).

### 2.1 Atendimento (identificação)
- Cliente (tutor) escreve do número da **Juliana Costa**.
- Agente → `identificar_tutor` → "Olá, Juliana! Como posso ajudar com o **Thor** ou a **Luna**?"

### 2.2 Venda (produto)
- "Tem ração Golden de 15kg?" → `buscar_produtos` → *Ração Golden Fórmula Cães Adultos 15kg, de
  R$ 289,90 por **R$ 269,90**.*
- "Qual ração pro meu gato castrado?" → *Premier Gatos Castrados 1,5kg — **R$ 79,90** (promo).*
- "Quero 1 saco e um arranhador, entregam em Moema?" → `criar_pedido_rascunho` (entrega) →
  resumo + "a equipe confirma disponibilidade e pagamento".

### 2.3 Agendamento (banho/tosa)
- "Quero marcar banho pro Thor" → Thor é **porte grande** → `buscar_servicos` → *Banho **R$ 80***
  → `consultar_disponibilidade` → oferece horários (seg–sáb) → `criar_agendamento`
  (`pending_confirmation`, marcado como criado pelo agente).
- Mostra também **lembrete** automático no dia anterior.

### 2.4 Plano / recorrência
- "Banho sai caro toda semana, tem plano?" → `consultar_planos` → *Plano Banho Mensal — 4 banhos
  por **R$ 169,90/mês***; ou *Pacote 5 Banhos por R$ 200* → registra interesse + handoff p/ adesão.

### 2.5 Suporte
- "Cadê meu pedido?" → `status_pedido` → status do **PED-0001** (pago/retirada).
- "Meu cão está vomitando, o que dou?" → **guard-rail clínico**: não diagnostica, oferece consulta
  veterinária e/ou **transfere para a equipe**.

---

## 3. O que está pronto vs. o que falta para o demo ao vivo

| Item | Estado |
|---|---|
| Base de dados realista (Demo Petshop) | ✅ pronta e verificada |
| Consultar catálogo/tutor/pet/pedido/agenda (dados) | ✅ consultável (estrutura real) |
| Painel do tenant mostra tudo (login do dono) | ✅ |
| Agente ao vivo no WhatsApp (MCP) | 🟠 depende das **tools Fase 2/3** ([roadmap](../agent/zatten/04_endpoints_e_tabelas.md)) e da conexão Zatten |

Para o atendimento **ao vivo** via agente, faltam as tools de leitura (Fase 2) e escrita (Fase 3)
do MCP — hoje só `info_estabelecimento` está implementada. A base do Demo Petshop já está pronta
para essas tools consultarem e registrarem.

---

## 4. Resetar / re-popular
```bash
npm run db:seed             # uma vez (features globais + niche pets)
npm run db:seed:demo:petshop   # cria/atualiza e repopula o Demo Petshop
```
O seed limpa apenas os dados do tenant `demo-petshop` antes de recriar (não afeta outros tenants).
