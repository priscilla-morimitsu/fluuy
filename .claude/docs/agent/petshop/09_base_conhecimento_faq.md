# Base de conhecimento — FAQ do agente petshop

Perguntas frequentes e tratamento de objeções. O agente combina **respostas estáveis** (aqui)
com **dados do tenant** (catálogo, horário, política). Campos entre `{{ }}` vêm do cadastro do
petshop — o agente **nunca** os inventa; se vazios, coleta/encaminha.

> Esta é a "knowledge base" que a página `/knowledge-base` deve alimentar. Mantê-la como
> conteúdo editável por tenant (sobrescreve/estende estas respostas-base).

---

## 1. Institucional (contexto: Atendimento — A4/A5/S7)

| Pergunta | Resposta-base |
|---|---|
| Horário de funcionamento | "Funcionamos {{horario_funcionamento}}. Posso já adiantar algo pra você?" |
| Endereço / como chegar | "Estamos em {{endereco}}. {{ponto_referencia}}" |
| Formas de pagamento | "Aceitamos {{formas_pagamento}}." (não processa pagamento aqui) |
| Estacionamento | "{{tem_estacionamento}}" |
| Atendem gato? | "{{atende_gatos}}" — se não cadastrado, não afirmar |
| Atendem em casa / leva-e-traz? | "{{tem_leva_e_traz}} — atendemos os bairros {{bairros_cobertura}}." |
| Precisa agendar? | "Para {{servicos_que_exigem_agendamento}} sim; posso marcar pra você agora." |
| Política de cancelamento | "{{politica_cancelamento}}" |

---

## 2. Banho & tosa (contexto: Agendamento — AG1/AG2)

| Pergunta | Resposta-base |
|---|---|
| Quanto custa o banho? | "O banho varia por porte e pelagem. Para {{porte}} fica {{preco}}. Qual o porte do seu pet?" (sem porte → "a partir de {{preco_minimo}}") |
| Quanto demora? | "Em média {{duracao}} (inclui secagem). O tempo varia com porte e pelagem." |
| Precisa de carteira de vacinação? | "{{exige_carteira}} — se exigirmos, é por segurança de todos os pets." |
| Tosa da raça do meu cão? | "Fazemos tosa higiênica, na máquina e na tesoura. Para tosa da raça, {{requer_avaliacao}}." |
| Meu cão é bravo/estressa | "Conta pra gente o comportamento dele — em alguns casos pedimos avaliação ou focinheira pra fazer com segurança." (registrar em `temperament`) |
| Tem horário hoje/amanhã/sábado? | (consulta agenda real — AG5) "Deixa eu ver os horários… {{horarios_disponiveis}}" |
| Filhote pode tomar banho? | "Depende da idade e da vacinação. Me diz a idade dele que eu confirmo a melhor recomendação com a equipe." (não dar regra clínica) |

---

## 3. Produtos / ração (contexto: Vendas — V1/V2/V3)

| Pergunta | Resposta-base |
|---|---|
| Tem a ração X / marca Y? | (consulta catálogo) "{{tem_produto}} — {{nome}} {{embalagem}} sai {{preco}}." |
| Qual ração indica? | "Pra um {{especie}} {{lifeStage}} de porte {{porte}}, temos {{opcoes_catalogo}}." (só catálogo; nada terapêutico) |
| Vocês entregam? | "{{tem_entrega}} para os bairros {{bairros}}. Quer que eu já monte seu pedido?" |
| Tem desconto/promoção? | "{{tem_promocao}}" — só se cadastrado |
| Ração pra cão com problema renal/alergia | ⚠️ "Ração terapêutica é indicada pelo veterinário. Posso agendar uma avaliação ou chamar a equipe." (S2) |

---

## 4. Planos e pacotes (contexto: Vendas — V6)

| Pergunta | Resposta-base |
|---|---|
| Tem plano de banho mensal? | "Temos {{planos_ativos}}. O {{nome_plano}} inclui {{itens}} por {{preco}}/{{ciclo}}." |
| Pacote sai mais barato? | "Sim — no pacote {{nome}} o banho fica {{preco_unitario}} contra {{preco_avulso}} avulso." (só números cadastrados) |
| Como assino? | "Posso registrar seu interesse e a equipe finaliza a adesão com você. Pode ser?" (não cobra) |

---

## 5. Veterinário / vacina (contexto: Agendamento/Suporte — AG3/AG4/S2)

| Pergunta | Resposta-base |
|---|---|
| Tem veterinário? | "{{tem_veterinario}} — atendimento {{tipo_vet}}." |
| Quais vacinas vocês aplicam? | "Aplicamos {{vacinas_catalogo}}. Qual seu pet precisa?" |
| Que vacina meu filhote precisa? | "O protocolo certo é definido pelo veterinário conforme idade e histórico. Posso agendar uma avaliação." (não prescrever) |
| Meu pet está {{sintoma}} | ⚠️ S2 — "Sinto muito que ele não esteja bem. Não consigo avaliar saúde por aqui, mas posso {{agendar_consulta}} e já chamar a equipe." |

---

## 6. Pós-venda e suporte (contexto: Suporte — S1/S4/S5/S6)

| Pergunta | Resposta-base |
|---|---|
| Cadê meu pedido? | (consulta `Order` do tutor) "Seu pedido {{numero}} está {{status}}." |
| Cuidados depois do banho/tosa | "{{orientacao_pos_servico}}" (geral; dúvida clínica → S2) |
| Quero reclamar | "Sinto muito por isso. Vou registrar e já chamar alguém da equipe pra te ajudar." (S4 + handoff) |
| Preciso do comprovante | "Posso verificar — a 2ª via/financeiro a equipe te envia. Já aciono." (S5) |
| Mudei de endereço/telefone | "Claro! Me confirma o novo {{dado}} que eu atualizo seu cadastro." (S6) |

---

## 7. Objeções comuns (vendas/captação)

| Objeção | Direção da resposta |
|---|---|
| "Tá caro" | reforçar valor cadastrado (qualidade, conveniência, leva-e-traz), oferecer **pacote/combo** que reduz o unitário — sem inventar desconto |
| "Vou pensar" | registrar como lead/oportunidade, oferecer guardar horário/segurar condição cadastrada, follow-up com consentimento |
| "O concorrente faz mais barato" | não desmerecer; destacar diferenciais cadastrados; oferecer o que está na alçada |
| "Meu pet tem medo/estressa" | acolher, explicar manejo/avaliação, dar segurança |
| "Não sei qual ração" | recomendação dentro do catálogo (V3); terapêutica → vet |
| "Só queria saber o preço" | informar (com porte) e **converter** suavemente para agendamento |

---

## 8. Coisas que o agente NÃO responde por aqui (encaminha)

- diagnóstico, sintoma, medicação, dosagem → **S2/S3**;
- cobrança, reembolso, nota fiscal → **humano**;
- exceção de política, caso jurídico, reclamação séria → **humano**;
- qualquer dado não cadastrado → coletar + encaminhar.

> Regras completas em [08_limites_guardrails_compliance.md](08_limites_guardrails_compliance.md).
> Modelos de frase em [10_mensagens_microcopy.md](10_mensagens_microcopy.md).
