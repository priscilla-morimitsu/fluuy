# Domínio — Produtos de petshop

Análise do **mix de produtos** de petshops pequenos/médios brasileiros, estruturada para o
cadastro (`Product` + `ProductCategory`) e para o reconhecimento de intenção pelo agente.

> Lembrete do [Princípio #0](00_indice.md#2-princípio-0--o-agente-nunca-inventa-dados): isto é
> um **modelo de mercado**. O agente só cita produto/preço/disponibilidade que existir no
> `Product` **ativo** (`status = active`, `availableForSale = true`) do tenant.

---

## 1. Mapa de categorias (taxonomia de referência)

Estrutura típica de catálogo, pensada para virar `ProductCategory` (campo `name`/`slug`):

| Categoria | Subcategorias | Espécies-alvo |
|---|---|---|
| **Alimentação** | Ração seca, ração úmida (sachê/lata), alimentação natural/congelada, petiscos/snacks, suplementos e vitaminas, leite/substitutos, tilápia/feno (pets não-cão/gato) | Cão, gato, aves, roedores, peixes, répteis |
| **Higiene e banho** | Shampoo/condicionador, colônia/perfume, lenços umedecidos, sabonete, escova/pente, cortador de unha, produtos dentais (pasta/escova), tapete higiênico, areia sanitária, removedor de odor | Cão, gato |
| **Saúde / farmácia pet** | Antipulgas e carrapatos, vermífugos, suplementos articulares/dermatológicos, produtos OTC (sem prescrição), cones/colar elizabetano, curativos | Cão, gato |
| **Acessórios** | Coleira, peitoral, guia, cama/colchonete, casinha, comedouro/bebedouro, fonte de água, transporte (caixa/bolsa), roupas, plaquinha de identificação | Cão, gato, pequenos |
| **Brinquedos** | Mordedores, bolinhas, cordas, arranhadores (gato), brinquedos interativos/dispensadores, catnip | Cão, gato |
| **Para gatos (linha dedicada)** | Areia (sílica/grão fino/biodegradável), caixa de areia, arranhador, torre/nicho | Gato |
| **Aquarismo / pets alternativos** | Ração de peixe, filtros, substrato, gaiola/viveiro, acessórios para roedores/aves/répteis | Peixes, aves, roedores, répteis |
| **Linha veterinária prescrita** | Rações terapêuticas (renal, gastrointestinal, obesidade, hipoalergênica), medicamentos sob receita | Cão, gato (com restrição — ver §5) |

---

## 2. Atributos que o agente usa para qualificar um produto

O `Product` tem colunas fixas (`name`, `brand`, `salePrice`, `promotionalPrice`, `unit`,
`description`, `imageUrl`, `availableForSale`) e um `customData` (jsonb) para os atributos do
nicho. Para responder bem, o agente cruza a pergunta do tutor com:

| Atributo | Onde mora | Por que importa na conversa |
|---|---|---|
| Marca | `brand` | "Tem Golden / Premier / Royal Canin?" |
| Espécie indicada | `customData.species` | cão × gato × outros |
| Porte/idade indicados | `customData.size`, `customData.lifeStage` | filhote/adulto/sênior; mini/pequeno/médio/grande |
| Peso/volume da embalagem | `unit` + `customData.packageSize` | "ração de 15kg", "sachê 85g" |
| Sabor/proteína | `customData.flavor` | frango, carne, salmão |
| Necessidade especial | `customData.specialDiet` | castrado, hipoalergênico, light, renal |
| Preço e promoção | `salePrice`, `promotionalPrice` | só informa se cadastrado |
| Disponibilidade | `availableForSale`, `status` | nunca promete o que está inativo |
| Entrega/retirada | derivado de feature `deliveries` + cadastro | ver fluxo de pedido |

> Esses atributos de `customData` formam o **template de produto petshop** descrito na spec de
> validação (`03_Specs_Validacao_Petshops.md` §4.3). Eles são opcionais por produto; o agente
> degrada com elegância quando faltam (pergunta ou aciona humano em vez de supor).

---

## 3. Vocabulário do tutor → atributo (para o classificador)

Como o tutor fala vs. o que o agente precisa extrair:

| O tutor diz | Intenção | Slots a extrair |
|---|---|---|
| "Quanto é a ração do meu cachorro?" | `pet_product_inquiry` | espécie=cão; (faltam marca, porte, peso) |
| "Tem Golden 15kg pra adulto?" | `pet_product_inquiry` | marca=Golden; pacote=15kg; lifeStage=adulto |
| "Quero comprar areia pro gato" | `pet_product_order_request` | categoria=areia; espécie=gato |
| "Antipulga pra cachorro de 10kg" | `pet_product_inquiry` | categoria=antipulgas; peso=10kg |
| "Qual ração você indica pro meu filhote?" | `pet_food_recommendation` | lifeStage=filhote; (recomenda só do catálogo) |
| "Vcs entregam?" | `pet_product_order_request` (delivery) | fulfillment=delivery |

---

## 4. Decisões comerciais que afetam o agente

- **Ração é o carro-chefe e o gancho de recorrência.** A maioria das vendas e da margem
  recorrente vem de alimentação. Daí a importância das skills de **recompra de ração**
  ([C5](06_skills_agente.md)) e **recomendação** ([V3](06_skills_agente.md)).
- **Promoção e preço** só podem ser citados se estiverem no cadastro (`promotionalPrice`).
- **Cross-sell natural:** ração → petisco/suplemento; banho → shampoo/perfume; filhote →
  kit (comedouro, tapete, antipulga). O agente sugere cross-sell **somente** com itens ativos.
- **Unidades** (`ProductUnit`: `unit`, `kg`, `g`, `l`, `ml`, `package`, `box`…) afetam como o
  agente apresenta o preço ("R$ X / pacote de 15kg").

---

## 5. Limites específicos de produto (guard-rails)

O agente, ao falar de produtos:

- **não recomenda medicamento prescrito nem ração terapêutica** (renal, gastrointestinal etc.)
  como se fosse escolha livre — isso exige orientação veterinária. Trata como
  `pet_veterinary_sensitive_question` e oferece agendamento/handoff. Ver
  [08_limites_guardrails_compliance.md](08_limites_guardrails_compliance.md).
- **não afirma dosagem** de antipulgas/vermífugo por conta própria; informa apresentações
  cadastradas e orienta confirmação com o profissional.
- **não confirma estoque/quantidade** além de `availableForSale`; quando o tutor quer comprar,
  cria pedido em rascunho e a equipe confirma disponibilidade real.
- **não inventa marca/sabor** que não exista no catálogo; se não houver, registra a demanda
  (insight comercial) e oferece alternativa cadastrada.

---

## 6. Como o agente lê o catálogo (resumo técnico)

```
listarProdutos(tenantId, { status: 'active', availableForSale: true, filtros })
  → filtra por categoria/marca/espécie/porte (customData) conforme slots extraídos
  → ordena por relevância (match de slots) e promoção
  → retorna no máx. N itens (evitar "muro de texto" no WhatsApp)
```

Sempre `tenant_id` da sessão (nunca do cliente). Retornar **apenas** os campos necessários à
resposta (nome, marca, preço, embalagem, disponibilidade) — nunca o registro inteiro.

Ver as skills de vendas em [06_skills_agente.md](06_skills_agente.md) (V1, V2, V3) e os gatilhos
em [07_tabela_gatilhos_skills.md](07_tabela_gatilhos_skills.md).
