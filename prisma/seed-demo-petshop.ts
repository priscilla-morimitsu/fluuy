import "dotenv/config";

import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

// ──────────────────────────────────────────────────────────────────────────
// Demo tenant "Demo Petshop" — base realista para demonstrar o agente da Fluuy
// (atendimento, venda, agendamento, suporte) no nicho petshop.
//
// Self-contained e idempotente: cria/atualiza o tenant, o dono, habilita as
// features e popula TODO o catálogo + clientes/pets + pedidos + agenda + WhatsApp
// com dados próximos da realidade de um petshop de bairro em São Paulo.
//
// Pré-requisito: rode `npm run db:seed` uma vez (cria as features globais e a
// niche "pets"). Depois: `npm run db:seed:demo:petshop`.
//
// Pets são gravados como CustomerEntity(entityType="pet") + custom_data — é o que
// a UI atual consome (listPets lê customer_entities). Ver memória
// templates-out-of-mvp / customers-crud-phases.
// ──────────────────────────────────────────────────────────────────────────

const TENANT_SLUG = "demo-petshop";
const TENANT_NAME = "Demo Petshop";
const OWNER_EMAIL = process.env.DEMO_OWNER_EMAIL ?? "dono@demopetshop.com";
const OWNER_PASSWORD = process.env.DEMO_OWNER_PASSWORD ?? "demo1234";

// ── PERFIL DO DEMO (as "respostas" das 5 perguntas de onboarding) ───────────
// Adapte este bloco por cliente para ajustar a simulação. Ver
// .claude/docs/demo/petshop-demo.md (perguntas → parâmetros).
const PROFILE = {
  oferece: { banhoTosa: true, veterinario: true, vacinacao: true, hotelCreche: true, levaETraz: true },
  horario: "Seg a Sex 8h–19h, Sáb 8h–14h",
  bairros: ["Vila Mariana", "Saúde", "Ipiranga", "Moema", "Vila Clementino"],
} as const;

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
};

const DAY = 24 * 60 * 60 * 1000;
const now = new Date();
const at = (offsetDays: number, hour = 9, minute = 0) => {
  const d = new Date(now.getTime() + offsetDays * DAY);
  d.setHours(hour, minute, 0, 0);
  return d;
};

async function wipeTenantData(tenantId: string) {
  // FK-safe: filhos antes dos pais. Tudo filtrado por tenantId (não toca outros tenants).
  await prisma.messageDelivery.deleteMany({ where: { tenantId } });
  await prisma.conversationMessage.deleteMany({ where: { tenantId } });
  await prisma.conversationAssignment.deleteMany({ where: { tenantId } });
  await prisma.conversation.deleteMany({ where: { tenantId } });
  await prisma.messageWebhookEventLog.deleteMany({ where: { tenantId } });
  await prisma.messageTemplateMapping.deleteMany({ where: { tenantId } });
  await prisma.messageConsent.deleteMany({ where: { tenantId } });
  await prisma.whatsAppAccount.deleteMany({ where: { tenantId } });
  await prisma.messagingProviderAccount.deleteMany({ where: { tenantId } });

  await prisma.appointmentReminder.deleteMany({ where: { tenantId } });
  await prisma.appointmentStatusHistory.deleteMany({ where: { tenantId } });
  await prisma.appointment.deleteMany({ where: { tenantId } });

  await prisma.orderStatusHistory.deleteMany({ where: { tenantId } });
  await prisma.orderPayment.deleteMany({ where: { tenantId } });
  await prisma.orderItem.deleteMany({ where: { tenantId } });
  await prisma.orderAddress.deleteMany({ where: { tenantId } });
  await prisma.order.deleteMany({ where: { tenantId } });
  await prisma.orderSequence.deleteMany({ where: { tenantId } });

  await prisma.offerPlanServiceItem.deleteMany({ where: { tenantId } });
  await prisma.offerPlanProductItem.deleteMany({ where: { tenantId } });
  await prisma.offerPlan.deleteMany({ where: { tenantId } });
  await prisma.offerPlanCategory.deleteMany({ where: { tenantId } });

  await prisma.serviceAvailabilityRule.deleteMany({ where: { tenantId } });
  await prisma.serviceProfessional.deleteMany({ where: { tenantId } });
  await prisma.serviceLocation.deleteMany({ where: { tenantId } });
  await prisma.service.deleteMany({ where: { tenantId } });
  await prisma.serviceCategory.deleteMany({ where: { tenantId } });

  await prisma.professionalSpecialtyAssignment.deleteMany({ where: { tenantId } });
  await prisma.professionalSpecialty.deleteMany({ where: { tenantId } });
  await prisma.professionalLocation.deleteMany({ where: { tenantId } });
  await prisma.collaborator.deleteMany({ where: { tenantId } });
  await prisma.collaboratorRole.deleteMany({ where: { tenantId } });
  await prisma.collaboratorDepartment.deleteMany({ where: { tenantId } });
  await prisma.professional.deleteMany({ where: { tenantId } });
  await prisma.location.deleteMany({ where: { tenantId } });

  await prisma.customerTagAssignment.deleteMany({ where: { tenantId } });
  await prisma.customerEntity.deleteMany({ where: { tenantId } });
  await prisma.customerAddress.deleteMany({ where: { tenantId } });
  await prisma.customer.deleteMany({ where: { tenantId } });
  await prisma.customerTag.deleteMany({ where: { tenantId } });
  await prisma.customerLead.deleteMany({ where: { tenantId } });

  await prisma.product.deleteMany({ where: { tenantId } });
  await prisma.productCategory.deleteMany({ where: { tenantId } });
}

async function main() {
  // ── Niche (defensivo) + features (de db:seed) ─────────────────────────────
  const niche = await prisma.niche.upsert({
    where: { key: "pets" },
    update: {},
    create: { key: "pets", name: "Pets", description: "Petshops e clínicas veterinárias", customerLabel: "Tutor", entityLabel: "Pet" },
  });

  const features = await prisma.feature.findMany({ where: { group: { not: "platform" } } });
  if (features.length === 0) {
    throw new Error("Nenhuma feature encontrada. Rode 'npm run db:seed' antes de 'npm run db:seed:demo:petshop'.");
  }

  // ── Tenant "Demo Petshop" ─────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: TENANT_SLUG },
    update: { name: TENANT_NAME, status: "active" },
    create: { nicheId: niche.id, name: TENANT_NAME, slug: TENANT_SLUG, status: "active" },
  });
  const tenantId = tenant.id;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      legalName: "Demo Petshop Comércio e Serviços LTDA",
      document: "11.222.333/0001-44",
      description: "Petshop completo: banho & tosa, veterinário, vacinação, hotel/creche, alimentação e acessórios.",
      publicPhone: "(11) 4000-2000",
      publicEmail: "contato@demopetshop.com",
      notificationPhone: "(11) 98000-2000",
      address: {
        zipCode: "04101-000",
        street: "Rua Domingos de Morais",
        number: "1500",
        neighborhood: "Vila Mariana",
        city: "São Paulo",
        state: "SP",
        country: "Brasil",
      },
      businessHours: {
        mon: [{ open: "08:00", close: "19:00" }],
        tue: [{ open: "08:00", close: "19:00" }],
        wed: [{ open: "08:00", close: "19:00" }],
        thu: [{ open: "08:00", close: "19:00" }],
        fri: [{ open: "08:00", close: "19:00" }],
        sat: [{ open: "08:00", close: "14:00" }],
        sun: [],
      },
      serviceAreas: PROFILE.bairros,
      paymentMethods: ["pix", "credit_card", "debit_card", "cash"],
      hasProducts: true,
      hasServices: true,
      hasPlans: true,
      hasDelivery: true,
      hasPickup: true,
      acceptsOnlinePayment: true,
    },
  });

  // ── Dono (owner) ──────────────────────────────────────────────────────────
  const owner = await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    update: {},
    create: { name: "Dono (Demo Petshop)", email: OWNER_EMAIL, emailVerifiedAt: new Date() },
  });
  await prisma.authCredential.upsert({
    where: { userId: owner.id },
    update: {},
    create: { userId: owner.id, passwordHash: await bcrypt.hash(OWNER_PASSWORD, 12) },
  });
  await prisma.tenantUser.upsert({
    where: { tenantId_userId: { tenantId, userId: owner.id } },
    update: { role: "tenant_owner", status: "active" },
    create: { tenantId, userId: owner.id, role: "tenant_owner", status: "active" },
  });

  // ── Features habilitadas ──────────────────────────────────────────────────
  for (const feature of features) {
    await prisma.tenantFeature.upsert({
      where: { tenantId_featureId: { tenantId, featureId: feature.id } },
      update: { enabled: true },
      create: { tenantId, featureId: feature.id, enabled: true },
    });
  }

  console.log(`Limpando dados de '${TENANT_SLUG}'…`);
  await wipeTenantData(tenantId);

  // ── Locais + profissionais ────────────────────────────────────────────────
  const locLoja = await prisma.location.create({
    data: { tenantId, name: "Loja Vila Mariana", type: "store", status: "active", address: { street: "Rua Domingos de Morais", number: "1500", city: "São Paulo", state: "SP" } },
  });
  const locClinica = await prisma.location.create({
    data: { tenantId, name: "Clínica Veterinária", type: "clinic", status: "active", address: { street: "Rua Domingos de Morais", number: "1500", city: "São Paulo", state: "SP" } },
  });

  const profVet = await prisma.professional.create({
    data: { tenantId, name: "Dra. Paula Ribeiro", title: "Médica Veterinária", bio: "Clínica geral de cães e gatos.", phone: "(11) 98111-0001", whatsapp: "(11) 98111-0001", email: "paula@demopetshop.com", status: "active", customData: { registro: "CRMV-SP 56789" } },
  });
  const profTosa = await prisma.professional.create({
    data: { tenantId, name: "Marcos Tosador", title: "Tosador", bio: "Tosa higiênica, na tesoura e da raça.", phone: "(11) 98111-0002", status: "active" },
  });
  const profBanho = await prisma.professional.create({
    data: { tenantId, name: "Camila Banhista", title: "Banhista", phone: "(11) 98111-0003", status: "active" },
  });
  await prisma.professionalLocation.createMany({
    data: [
      { tenantId, professionalId: profVet.id, locationId: locClinica.id },
      { tenantId, professionalId: profTosa.id, locationId: locLoja.id },
      { tenantId, professionalId: profBanho.id, locationId: locLoja.id },
    ],
  });

  // ── Categorias + produtos (marcas e preços reais — SP, 2026) ──────────────
  const catRacaoCao = await prisma.productCategory.create({ data: { tenantId, name: "Ração — Cães", slug: "racao-caes", status: "active" } });
  const catRacaoGato = await prisma.productCategory.create({ data: { tenantId, name: "Ração — Gatos", slug: "racao-gatos", status: "active" } });
  const catPetiscos = await prisma.productCategory.create({ data: { tenantId, name: "Petiscos e Suplementos", slug: "petiscos", status: "active" } });
  const catHigiene = await prisma.productCategory.create({ data: { tenantId, name: "Higiene", slug: "higiene", status: "active" } });
  const catFarmacia = await prisma.productCategory.create({ data: { tenantId, name: "Farmácia Pet", slug: "farmacia", status: "active" } });
  const catAcessorios = await prisma.productCategory.create({ data: { tenantId, name: "Acessórios e Brinquedos", slug: "acessorios", status: "active" } });
  const catGatos = await prisma.productCategory.create({ data: { tenantId, name: "Mundo Gato", slug: "mundo-gato", status: "active" } });

  const productSpecs = [
    // Ração cães
    { name: "Ração Golden Fórmula Cães Adultos Frango e Carne 15kg", cat: catRacaoCao.id, brand: "Golden", sale: 289.9, promo: 269.9, cost: 210, unit: "package", cd: { especie: "Cão", peso_kg: 15, linha_premium: true, lifeStage: "Adulto" } },
    { name: "Ração Premier Raças Específicas Adultos 12kg", cat: catRacaoCao.id, brand: "Premier", sale: 339.9, cost: 250, unit: "package", cd: { especie: "Cão", peso_kg: 12, linha_premium: true, lifeStage: "Adulto" } },
    { name: "Ração Royal Canin Medium Adult 15kg", cat: catRacaoCao.id, brand: "Royal Canin", sale: 549.9, cost: 420, unit: "package", cd: { especie: "Cão", peso_kg: 15, linha_premium: true, lifeStage: "Adulto" } },
    { name: "Ração GranPlus Menu Adultos Carne 15kg", cat: catRacaoCao.id, brand: "GranPlus", sale: 159.9, promo: 149.9, cost: 110, unit: "package", cd: { especie: "Cão", peso_kg: 15, linha_premium: false, lifeStage: "Adulto" } },
    { name: "Ração Golden Fórmula Filhotes Frango e Carne 15kg", cat: catRacaoCao.id, brand: "Golden", sale: 309.9, cost: 225, unit: "package", cd: { especie: "Cão", peso_kg: 15, linha_premium: true, lifeStage: "Filhote" } },
    { name: "Ração Úmida Pedigree Lata Carne 280g", cat: catRacaoCao.id, brand: "Pedigree", sale: 8.9, cost: 5, unit: "unit", cd: { especie: "Cão" } },
    // Ração gatos
    { name: "Ração Whiskas Gatos Adultos Carne 3kg", cat: catRacaoGato.id, brand: "Whiskas", sale: 79.9, cost: 55, unit: "package", cd: { especie: "Gato", peso_kg: 3, lifeStage: "Adulto" } },
    { name: "Ração Premier Gatos Castrados Frango 1,5kg", cat: catRacaoGato.id, brand: "Premier", sale: 84.9, promo: 79.9, cost: 60, unit: "package", cd: { especie: "Gato", peso_kg: 1.5, linha_premium: true, lifeStage: "Adulto", castrado: true } },
    { name: "Ração Royal Canin Urinary S/O Feline 1,5kg", cat: catRacaoGato.id, brand: "Royal Canin", sale: 169.9, cost: 130, unit: "package", cd: { especie: "Gato", peso_kg: 1.5, terapeutica: true, observacao: "Dieta terapêutica — indicação veterinária" } },
    { name: "Sachê Whiskas Gatos Sabores 85g", cat: catRacaoGato.id, brand: "Whiskas", sale: 2.79, cost: 1.6, unit: "unit", cd: { especie: "Gato" } },
    // Petiscos / suplementos
    { name: "Bifinho Petitos Carne 60g", cat: catPetiscos.id, brand: "Petitos", sale: 6.9, cost: 3.5, unit: "unit", cd: { especie: "Cão" } },
    { name: "Osso Natural Defumado Médio", cat: catPetiscos.id, brand: "Bassar", sale: 14.9, cost: 8, unit: "unit", cd: { especie: "Cão" } },
    { name: "Suplemento Condroplus 60 comprimidos", cat: catPetiscos.id, brand: "Avert", sale: 119.9, cost: 85, unit: "box", cd: { especie: "Cão", observacao: "Suplemento articular (OTC)" } },
    // Higiene
    { name: "Shampoo Sanol Dog Neutro 500ml", cat: catHigiene.id, brand: "Sanol", sale: 27.9, cost: 15, unit: "unit", cd: { especie: "Outro" } },
    { name: "Colônia Pet Perfume 120ml", cat: catHigiene.id, brand: "PetSociety", sale: 22.9, cost: 11, unit: "unit", cd: { especie: "Outro" } },
    { name: "Lenço Umedecido Pet 100un", cat: catHigiene.id, brand: "PetClean", sale: 19.9, cost: 9, unit: "package", cd: { especie: "Outro" } },
    { name: "Tapete Higiênico Cães 30un", cat: catHigiene.id, brand: "PremiumPads", sale: 49.9, promo: 44.9, cost: 28, unit: "package", cd: { especie: "Cão" } },
    // Farmácia
    { name: "Antipulgas Bravecto Cães 10–20kg", cat: catFarmacia.id, brand: "Bravecto", sale: 199.9, cost: 150, unit: "unit", cd: { especie: "Cão", observacao: "Antiparasitário — confirmar peso/indicação" } },
    { name: "Vermífugo Vermivet 660mg 4 comprimidos", cat: catFarmacia.id, brand: "Biovet", sale: 18.9, cost: 9, unit: "box", cd: { especie: "Cão" } },
    // Acessórios / brinquedos
    { name: "Coleira Peitoral Ajustável Tam M", cat: catAcessorios.id, brand: "PetStyle", sale: 59.9, cost: 28, unit: "unit", cd: { especie: "Cão" } },
    { name: "Comedouro Inox Duplo 1L", cat: catAcessorios.id, brand: "Chalesco", sale: 39.9, cost: 18, unit: "unit", cd: { especie: "Outro" } },
    { name: "Brinquedo Mordedor Kong Classic M", cat: catAcessorios.id, brand: "Kong", sale: 69.9, cost: 40, unit: "unit", cd: { especie: "Cão" } },
    // Mundo gato
    { name: "Areia Higiênica Pipicat 4kg", cat: catGatos.id, brand: "Pipicat", sale: 24.9, cost: 13, unit: "package", cd: { especie: "Gato" } },
    { name: "Areia Sílica Premium Gatos 1,6kg", cat: catGatos.id, brand: "Gato Feliz", sale: 29.9, cost: 16, unit: "package", cd: { especie: "Gato" } },
    { name: "Arranhador Torre para Gatos", cat: catGatos.id, brand: "Chalesco", sale: 129.9, promo: 119.9, cost: 75, unit: "unit", cd: { especie: "Gato" } },
  ] as const;

  const products = await Promise.all(
    productSpecs.map((p) =>
      prisma.product.create({
        data: {
          tenantId,
          name: p.name,
          slug: slugify(p.name),
          categoryId: p.cat,
          brand: p.brand,
          salePrice: p.sale,
          promotionalPrice: "promo" in p ? p.promo : null,
          costPrice: p.cost,
          unit: p.unit as never,
          status: "active",
          availableForSale: true,
          customData: p.cd,
        },
      }),
    ),
  );

  // ── Categorias + serviços (preço por porte em custom_data) ────────────────
  const catBanhoTosa = await prisma.serviceCategory.create({ data: { tenantId, name: "Banho & Tosa", slug: "banho-tosa", status: "active" } });
  const catVet = await prisma.serviceCategory.create({ data: { tenantId, name: "Veterinário", slug: "veterinario", status: "active" } });
  const catHospedagem = await prisma.serviceCategory.create({ data: { tenantId, name: "Hotel & Creche", slug: "hotel-creche", status: "active" } });
  const catLeva = await prisma.serviceCategory.create({ data: { tenantId, name: "Leva e Traz", slug: "leva-e-traz", status: "active" } });

  const mk = (data: Parameters<typeof prisma.service.create>[0]["data"]) => prisma.service.create({ data });

  const svcBanho = await mk({ tenantId, categoryId: catBanhoTosa.id, name: "Banho", slug: "banho", description: "Banho com shampoo, secagem e perfume. Preço varia por porte e pelagem.", basePrice: 45, estimatedDurationMinutes: 90, status: "active", deliveryModes: ["at_location"], customData: { pricingBySize: { pequeno: 45, medio: 60, grande: 80, gigante: 110 }, requiresVaccinationCard: true } });
  const svcTosaHig = await mk({ tenantId, categoryId: catBanhoTosa.id, name: "Tosa Higiênica", slug: "tosa-higienica", description: "Tosa de patas, barriga e região íntima.", basePrice: 35, estimatedDurationMinutes: 45, status: "active", deliveryModes: ["at_location"], customData: { pricingBySize: { pequeno: 35, medio: 45, grande: 60 } } });
  const svcTosaCompleta = await mk({ tenantId, categoryId: catBanhoTosa.id, name: "Tosa Completa (Máquina/Tesoura)", slug: "tosa-completa", description: "Tosa na máquina ou tesoura. Tosa da raça pode exigir avaliação.", basePrice: 70, estimatedDurationMinutes: 120, status: "active", deliveryModes: ["at_location"], customData: { pricingBySize: { pequeno: 70, medio: 90, grande: 120 }, requiresEvaluation: true } });
  const svcBanhoTosa = await mk({ tenantId, categoryId: catBanhoTosa.id, name: "Banho + Tosa Higiênica", slug: "banho-tosa-higienica", description: "Combo banho completo + tosa higiênica.", basePrice: 90, promotionalPrice: 80, estimatedDurationMinutes: 150, status: "active", deliveryModes: ["at_location"], customData: { pricingBySize: { pequeno: 90, medio: 120, grande: 160 } } });
  const svcHidratacao = await mk({ tenantId, categoryId: catBanhoTosa.id, name: "Hidratação", slug: "hidratacao", basePrice: 40, estimatedDurationMinutes: 30, status: "active", deliveryModes: ["at_location"] });
  const svcUnha = await mk({ tenantId, categoryId: catBanhoTosa.id, name: "Corte de Unhas", slug: "corte-de-unhas", basePrice: 20, estimatedDurationMinutes: 15, status: "active", requiresScheduling: false, deliveryModes: ["at_location"] });
  const svcConsulta = await mk({ tenantId, categoryId: catVet.id, name: "Consulta Veterinária", slug: "consulta-veterinaria", description: "Consulta clínica geral.", basePrice: 120, estimatedDurationMinutes: 30, status: "active", deliveryModes: ["at_location", "online"], onlineInstructions: "Teleorientação por vídeo no WhatsApp." });
  const svcVacina = await mk({ tenantId, categoryId: catVet.id, name: "Vacinação", slug: "vacinacao", description: "V10/V8, antirrábica e felinas. Protocolo definido pelo veterinário.", basePrice: 90, estimatedDurationMinutes: 20, status: "active", deliveryModes: ["at_location", "at_home"], homeServiceNotes: "Vacinação a domicílio nos bairros atendidos." });
  const svcHotel = await mk({ tenantId, categoryId: catHospedagem.id, name: "Hospedagem (diária)", slug: "hospedagem-diaria", description: "Hotelzinho com recreação. Exige carteira de vacinação em dia.", basePrice: 80, estimatedDurationMinutes: 1440, status: "active", deliveryModes: ["at_location"], customData: { requiresVaccinationCard: true } });
  const svcCreche = await mk({ tenantId, categoryId: catHospedagem.id, name: "Creche (diária)", slug: "creche-diaria", basePrice: 55, estimatedDurationMinutes: 600, status: "active", deliveryModes: ["at_location"], customData: { requiresVaccinationCard: true } });
  const svcTaxi = await mk({ tenantId, categoryId: catLeva.id, name: "Táxi Dog (leva e traz)", slug: "taxi-dog", description: "Busca e entrega do pet para banho/tosa/consulta.", basePrice: 25, estimatedDurationMinutes: 30, status: "active", deliveryModes: ["at_home"], homeServiceNotes: "Disponível nos bairros atendidos." });

  await prisma.serviceProfessional.createMany({
    data: [
      { tenantId, serviceId: svcBanho.id, professionalId: profBanho.id, isPrimary: true },
      { tenantId, serviceId: svcTosaHig.id, professionalId: profTosa.id, isPrimary: true },
      { tenantId, serviceId: svcTosaCompleta.id, professionalId: profTosa.id, isPrimary: true },
      { tenantId, serviceId: svcBanhoTosa.id, professionalId: profTosa.id, isPrimary: true },
      { tenantId, serviceId: svcConsulta.id, professionalId: profVet.id, isPrimary: true },
      { tenantId, serviceId: svcVacina.id, professionalId: profVet.id, isPrimary: true },
    ],
  });
  await prisma.serviceLocation.createMany({
    data: [
      { tenantId, serviceId: svcBanho.id, locationId: locLoja.id },
      { tenantId, serviceId: svcTosaHig.id, locationId: locLoja.id },
      { tenantId, serviceId: svcTosaCompleta.id, locationId: locLoja.id },
      { tenantId, serviceId: svcBanhoTosa.id, locationId: locLoja.id },
      { tenantId, serviceId: svcConsulta.id, locationId: locClinica.id },
      { tenantId, serviceId: svcVacina.id, locationId: locClinica.id },
      { tenantId, serviceId: svcHotel.id, locationId: locLoja.id },
      { tenantId, serviceId: svcCreche.id, locationId: locLoja.id },
    ],
  });
  // Disponibilidade de banho/tosa: seg–sáb 09:00–17:00
  await prisma.serviceAvailabilityRule.createMany({
    data: [1, 2, 3, 4, 5, 6].flatMap((weekday) =>
      [svcBanho.id, svcTosaHig.id, svcBanhoTosa.id].map((serviceId) => ({
        tenantId,
        serviceId,
        locationId: locLoja.id,
        deliveryMode: "at_location" as never,
        weekday,
        startTime: "09:00",
        endTime: weekday === 6 ? "13:00" : "17:00",
        slotDurationMinutes: 60,
      })),
    ),
  });

  // ── Planos & pacotes ──────────────────────────────────────────────────────
  const planCatBanho = await prisma.offerPlanCategory.create({ data: { tenantId, name: "Planos de Banho", slug: "planos-banho", status: "active" } });
  const planCatBemEstar = await prisma.offerPlanCategory.create({ data: { tenantId, name: "Bem-estar", slug: "bem-estar", status: "active" } });

  const planMensal = await prisma.offerPlan.create({ data: { tenantId, categoryId: planCatBanho.id, name: "Plano Banho Mensal", slug: "plano-banho-mensal", description: "4 banhos por mês com preço reduzido e prioridade na agenda.", type: "recurring_plan", price: 169.9, billingCycle: "monthly", autoRenew: true, status: "active" } });
  await prisma.offerPlanServiceItem.create({ data: { tenantId, offerPlanId: planMensal.id, serviceId: svcBanho.id, quantity: 4, usageLimit: 4 } });

  const planPacote = await prisma.offerPlan.create({ data: { tenantId, categoryId: planCatBanho.id, name: "Pacote 5 Banhos", slug: "pacote-5-banhos", description: "Compre 5 banhos com desconto. Validade de 6 meses.", type: "prepaid_package", price: 200, expiresAfterDays: 180, usageLimit: 5, status: "active" } });
  await prisma.offerPlanServiceItem.create({ data: { tenantId, offerPlanId: planPacote.id, serviceId: svcBanho.id, quantity: 5, usageLimit: 5 } });

  const planCombo = await prisma.offerPlan.create({ data: { tenantId, categoryId: planCatBanho.id, name: "Combo Banho + Tosa Higiênica", slug: "combo-banho-tosa", description: "Banho completo + tosa higiênica por preço fechado.", type: "combo", price: 99.9, status: "active" } });
  await prisma.offerPlanServiceItem.createMany({ data: [
    { tenantId, offerPlanId: planCombo.id, serviceId: svcBanho.id, quantity: 1 },
    { tenantId, offerPlanId: planCombo.id, serviceId: svcTosaHig.id, quantity: 1 },
  ] });

  const planCreche = await prisma.offerPlan.create({ data: { tenantId, categoryId: planCatBemEstar.id, name: "Plano Creche Mensal", slug: "plano-creche-mensal", description: "20 diárias de creche por mês.", type: "recurring_plan", price: 499.9, billingCycle: "monthly", autoRenew: true, status: "active" } });
  await prisma.offerPlanServiceItem.create({ data: { tenantId, offerPlanId: planCreche.id, serviceId: svcCreche.id, quantity: 20, usageLimit: 20 } });

  const planBemEstar = await prisma.offerPlan.create({ data: { tenantId, categoryId: planCatBemEstar.id, name: "Plano Bem-estar", slug: "plano-bem-estar", description: "1 banho/mês + 1 consulta de rotina/mês.", type: "recurring_plan", price: 139.9, billingCycle: "monthly", autoRenew: true, status: "active" } });
  await prisma.offerPlanServiceItem.createMany({ data: [
    { tenantId, offerPlanId: planBemEstar.id, serviceId: svcBanho.id, quantity: 1, usageLimit: 1 },
    { tenantId, offerPlanId: planBemEstar.id, serviceId: svcConsulta.id, quantity: 1, usageLimit: 1 },
  ] });

  // ── Tags + clientes (tutores) + pets (CustomerEntity) ─────────────────────
  const tagVip = await prisma.customerTag.create({ data: { tenantId, name: "VIP", slug: "vip", color: "#f59e0b", status: "active" } });
  const tagRecorrente = await prisma.customerTag.create({ data: { tenantId, name: "Recorrente", slug: "recorrente", color: "#10b981", status: "active" } });
  const tagNovo = await prisma.customerTag.create({ data: { tenantId, name: "Novo", slug: "novo", color: "#3b82f6", status: "active" } });

  const customerSpecs = [
    { name: "Mariana Alves", phone: "(11) 91234-0001", email: "mariana.alves@email.com", source: "whatsapp", tags: [tagVip.id, tagRecorrente.id], bairro: "Vila Mariana",
      pets: [{ name: "Rex", cd: { nome: "Rex", especie: "Cão", raca: "Labrador", porte: "Grande", peso_kg: 28, sexo: "Macho", castrado: true, observacoes_saude: "Alergia a frango." } }] },
    { name: "Pedro Santos", phone: "(11) 91234-0002", email: "pedro.santos@email.com", source: "instagram", tags: [tagNovo.id], bairro: "Saúde",
      pets: [{ name: "Mimi", cd: { nome: "Mimi", especie: "Gato", raca: "Siamês", porte: "Pequeno", peso_kg: 4, sexo: "Fêmea", castrado: true } }] },
    { name: "Juliana Costa", phone: "(11) 91234-0003", email: "juliana.costa@email.com", source: "referral", tags: [tagVip.id], bairro: "Moema",
      pets: [
        { name: "Thor", cd: { nome: "Thor", especie: "Cão", raca: "Golden Retriever", porte: "Grande", peso_kg: 32, sexo: "Macho", castrado: false } },
        { name: "Luna", cd: { nome: "Luna", especie: "Cão", raca: "Poodle", porte: "Pequeno", peso_kg: 8, sexo: "Fêmea", castrado: true } },
      ] },
    { name: "Ricardo Lima", phone: "(11) 91234-0004", email: "ricardo.lima@email.com", source: "website", tags: [tagRecorrente.id], bairro: "Ipiranga",
      pets: [{ name: "Bob", cd: { nome: "Bob", especie: "Cão", raca: "Vira-lata (SRD)", porte: "Médio", peso_kg: 15, sexo: "Macho", castrado: true } }] },
    { name: "Fernanda Oliveira", phone: "(11) 91234-0005", email: "fernanda.o@email.com", source: "manual", tags: [tagNovo.id], bairro: "Vila Clementino",
      pets: [
        { name: "Nina", cd: { nome: "Nina", especie: "Gato", raca: "Persa", porte: "Pequeno", peso_kg: 5, sexo: "Fêmea", castrado: false } },
        { name: "Pretinho", cd: { nome: "Pretinho", especie: "Gato", raca: "Vira-lata (SRD)", porte: "Pequeno", peso_kg: 4, sexo: "Macho", castrado: true } },
      ] },
    { name: "Carlos Eduardo", phone: "(11) 91234-0006", email: "cadu@email.com", source: "whatsapp", tags: [tagRecorrente.id], bairro: "Vila Mariana",
      pets: [{ name: "Bidu", cd: { nome: "Bidu", especie: "Cão", raca: "Shih Tzu", porte: "Pequeno", peso_kg: 6, sexo: "Macho", castrado: true, observacoes_saude: "Tosa da raça a cada 45 dias." } }] },
  ] as const;

  const customers: { id: string; name: string; phone: string; pets: { id: string; name: string }[] }[] = [];
  for (const [idx, spec] of customerSpecs.entries()) {
    const customer = await prisma.customer.create({
      data: {
        tenantId,
        name: spec.name,
        phone: spec.phone,
        phoneNormalized: normalizePhone(spec.phone),
        whatsapp: spec.phone,
        whatsappNormalized: normalizePhone(spec.phone),
        email: spec.email,
        personType: "individual",
        status: "active",
        source: spec.source as never,
        consentAcceptedAt: idx % 3 === 0 ? at(-40) : null,
        addresses: {
          create: { tenantId, type: "main", isDefault: true, zipCode: "04101-000", street: "Rua Domingos de Morais", number: `${100 + idx}`, neighborhood: spec.bairro, city: "São Paulo", state: "SP" },
        },
      },
    });
    if (spec.tags.length) {
      await prisma.customerTagAssignment.createMany({ data: spec.tags.map((tagId) => ({ tenantId, customerId: customer.id, tagId })) });
    }
    const pets: { id: string; name: string }[] = [];
    for (const pet of spec.pets) {
      const entity = await prisma.customerEntity.create({ data: { tenantId, customerId: customer.id, entityType: "pet", name: pet.name, status: "active", customData: pet.cd } });
      pets.push({ id: entity.id, name: pet.name });
    }
    customers.push({ id: customer.id, name: spec.name, phone: spec.phone, pets });
  }

  // ── Leads (CRM) ───────────────────────────────────────────────────────────
  await prisma.customerLead.createMany({
    data: [
      { tenantId, name: "Carla Dias", phone: "(11) 92345-0001", phoneNormalized: normalizePhone("(11) 92345-0001"), email: "carla.dias@email.com", source: "whatsapp", status: "new", message: "Olá! Quanto fica o banho e tosa de um golden?" },
      { tenantId, name: "Bruno Rocha", phone: "(11) 92345-0002", phoneNormalized: normalizePhone("(11) 92345-0002"), source: "instagram", status: "contacted", message: "Vocês fazem tosa na tesoura para shih tzu?" },
      { tenantId, name: "Patrícia Gomes", phone: "(11) 92345-0003", phoneNormalized: normalizePhone("(11) 92345-0003"), source: "website", status: "qualified", message: "Tem plano mensal de banho?" },
      { tenantId, name: "Anderson Melo", phone: "(11) 92345-0004", phoneNormalized: normalizePhone("(11) 92345-0004"), source: "whatsapp", status: "new", message: "Vocês buscam o pet em casa? Moro em Moema." },
    ],
  });

  // ── Pedidos ───────────────────────────────────────────────────────────────
  await prisma.orderSequence.create({ data: { tenantId, nextNumber: 0 } });
  const orderSpecs = [
    { customerIdx: 0, status: "completed", paymentStatus: "paid", paymentMethod: "pix", fulfillmentType: "pickup", items: [{ type: "product", name: products[0].name, qty: 1, price: 269.9 }, { type: "product", name: products[10].name, qty: 3, price: 6.9 }] },
    { customerIdx: 3, status: "out_for_delivery", paymentStatus: "paid", paymentMethod: "credit_card", fulfillmentType: "delivery", items: [{ type: "product", name: products[6].name, qty: 1, price: 79.9 }, { type: "product", name: products[22].name, qty: 1, price: 24.9 }] },
    { customerIdx: 2, status: "confirmed", paymentStatus: "pending", paymentMethod: "pix", fulfillmentType: "pickup", items: [{ type: "service", name: svcBanhoTosa.name, qty: 1, price: 160 }] },
    { customerIdx: 1, status: "pending_confirmation", paymentStatus: "pending", paymentMethod: "pix", fulfillmentType: "delivery", items: [{ type: "product", name: products[8].name, qty: 1, price: 169.9 }] },
    { customerIdx: 5, status: "completed", paymentStatus: "paid", paymentMethod: "debit_card", fulfillmentType: "pickup", items: [{ type: "service", name: svcTosaCompleta.name, qty: 1, price: 70 }] },
  ] as const;

  let orderNumber = 0;
  for (const spec of orderSpecs) {
    orderNumber += 1;
    const subtotal = spec.items.reduce((sum, i) => sum + i.qty * i.price, 0);
    const deliveryFee = spec.fulfillmentType === "delivery" ? 12 : 0;
    const total = subtotal + deliveryFee;
    await prisma.order.create({
      data: {
        tenantId,
        orderNumber,
        orderCode: `PED-${String(orderNumber).padStart(4, "0")}`,
        customerId: customers[spec.customerIdx].id,
        source: "whatsapp",
        channel: "panel",
        status: spec.status as never,
        fulfillmentType: spec.fulfillmentType as never,
        subtotal,
        deliveryFee: deliveryFee || null,
        total,
        paymentMethod: spec.paymentMethod as never,
        paymentStatus: spec.paymentStatus as never,
        amountPaid: spec.paymentStatus === "paid" ? total : 0,
        confirmedAt: spec.status !== "pending_confirmation" ? at(-3) : null,
        completedAt: spec.status === "completed" ? at(-2) : null,
        items: { create: spec.items.map((i, idx) => ({ tenantId, itemType: i.type as never, name: i.name, quantity: i.qty, unitPrice: i.price, total: i.qty * i.price, sortOrder: idx })) },
        payments: { create: { tenantId, provider: "manual", method: spec.paymentMethod as never, status: spec.paymentStatus as never, amount: total, amountPaid: spec.paymentStatus === "paid" ? total : 0, paidAt: spec.paymentStatus === "paid" ? at(-2) : null } },
        statusHistory: { create: { tenantId, toStatus: spec.status as never, reason: "Pedido de demonstração" } },
      },
    });
  }

  // ── Agendamentos (alguns criados pelo agente) ─────────────────────────────
  const apptSpecs = [
    { customerIdx: 0, service: svcBanho, prof: profBanho, day: -6, hour: 10, status: "completed", source: "manual", byAgent: false },
    { customerIdx: 5, service: svcTosaCompleta, prof: profTosa, day: -2, hour: 14, status: "completed", source: "whatsapp", byAgent: false },
    { customerIdx: 2, service: svcBanho, prof: profBanho, day: 0, hour: 11, status: "confirmed", source: "ai", byAgent: true },
    { customerIdx: 1, service: svcConsulta, prof: profVet, day: 1, hour: 9, status: "confirmed", source: "manual", byAgent: false },
    { customerIdx: 3, service: svcBanhoTosa, prof: profTosa, day: 2, hour: 15, status: "requested", source: "ai", byAgent: true },
    { customerIdx: 4, service: svcVacina, prof: profVet, day: 3, hour: 16, status: "pending_confirmation", source: "ai", byAgent: true },
    { customerIdx: 2, service: svcBanho, prof: profBanho, day: 5, hour: 9, status: "requested", source: "whatsapp", byAgent: false },
  ] as const;

  for (const spec of apptSpecs) {
    const start = at(spec.day, spec.hour);
    const end = new Date(start.getTime() + (spec.service.estimatedDurationMinutes ?? 60) * 60 * 1000);
    const cust = customers[spec.customerIdx];
    const appt = await prisma.appointment.create({
      data: {
        tenantId,
        customerId: cust.id,
        customerEntityId: cust.pets[0]?.id ?? null,
        serviceId: spec.service.id,
        responsibleType: "professional",
        professionalId: spec.prof.id,
        locationId: locLoja.id,
        modality: "at_location",
        status: spec.status as never,
        source: spec.source as never,
        createdByAgent: spec.byAgent,
        startAt: start,
        endAt: end,
        confirmedAt: spec.status === "confirmed" || spec.status === "completed" ? at(spec.day - 1) : null,
        completedAt: spec.status === "completed" ? end : null,
        statusHistory: { create: { tenantId, toStatus: spec.status as never, changedByAgent: spec.byAgent } },
      },
    });
    if (spec.day >= 0) {
      await prisma.appointmentReminder.create({ data: { tenantId, appointmentId: appt.id, channel: "whatsapp", scheduledFor: new Date(start.getTime() - DAY), status: "pending" } });
    }
  }

  // ── WhatsApp + conversas (mostra o atendimento) ───────────────────────────
  const providerAccount = await prisma.messagingProviderAccount.create({ data: { tenantId, provider: "pilot_status_whatsapp", environment: "test", providerProjectId: "demo-petshop", keyPrefix: "ps_demo", status: "active" } });
  const waAccount = await prisma.whatsAppAccount.create({ data: { tenantId, providerAccountId: providerAccount.id, name: "Atendimento Demo Petshop", number: "(11) 4000-2000", numberNormalized: normalizePhone("(11) 4000-2000"), maskedNumber: "(11) 4000-****", status: "open", isPrimary: true, isFullyConnected: true, connectedAt: at(-25) } });
  await prisma.messageTemplateMapping.createMany({
    data: [
      { tenantId, providerAccountId: providerAccount.id, providerTemplateId: "tpl_lembrete", name: "lembrete_agendamento", category: "utility", language: "pt_BR", status: "approved", isDefault: true, variables: ["nome", "data", "servico"] },
      { tenantId, providerAccountId: providerAccount.id, providerTemplateId: "tpl_promo", name: "promocao_banho", category: "marketing", language: "pt_BR", status: "approved", variables: ["nome"] },
    ],
  });

  const convoSpecs = [
    { customerIdx: 0, assignee: "ai", status: "open", messages: [
      { dir: "inbound", text: "Oi! Queria agendar um banho pro Rex 🐶" },
      { dir: "outbound", text: "Olá, Mariana! 🐾 O Rex é porte grande, o banho fica R$ 80. Tenho amanhã às 9h ou 11h. Qual prefere?", agent: true },
      { dir: "inbound", text: "Pode ser às 9h!" },
      { dir: "outbound", text: "Anotado: Banho do Rex amanhã às 9h. Deixei como a confirmar e a equipe confirma já já ✅", agent: true },
    ] },
    { customerIdx: 1, assignee: "human", status: "pending", messages: [
      { dir: "inbound", text: "Vocês têm ração para gato castrado?" },
      { dir: "outbound", text: "Temos sim! Premier Gatos Castrados 1,5kg está R$ 79,90 na promoção. Quer que eu separe?", agent: true },
      { dir: "inbound", text: "Quero, e vocês entregam na Saúde?" },
    ] },
    { customerIdx: 2, assignee: "paused", status: "open", messages: [
      { dir: "inbound", text: "A Luna tá com a unha muito grande, vocês fazem corte avulso?" },
      { dir: "outbound", text: "Fazemos sim, corte de unhas R$ 20, sem precisar agendar. Pode trazer no horário comercial 🐩", agent: true },
    ] },
  ] as const;

  for (const spec of convoSpecs) {
    const cust = customers[spec.customerIdx];
    const conv = await prisma.conversation.create({
      data: { tenantId, whatsappAccountId: waAccount.id, channel: "whatsapp", targetType: "phone", contactNumber: cust.phone, contactNumberNormalized: normalizePhone(cust.phone), targetName: cust.name, customerId: cust.id, status: spec.status as never, assigneeType: spec.assignee as never, optInStatus: "opted_in", lastMessageAt: at(0, 12), lastInboundAt: at(0, 12), unreadCount: spec.assignee === "human" ? 1 : 0 },
    });
    let i = 0;
    for (const msg of spec.messages) {
      i += 1;
      await prisma.conversationMessage.create({
        data: { tenantId, conversationId: conv.id, direction: msg.dir as never, content: msg.text, messageType: "text", internalStatus: msg.dir === "inbound" ? "received" : "delivered", sentByAgent: "agent" in msg ? Boolean(msg.agent) : false, fromNumber: msg.dir === "inbound" ? normalizePhone(cust.phone) : waAccount.numberNormalized, toNumber: msg.dir === "inbound" ? waAccount.numberNormalized : normalizePhone(cust.phone), receivedAt: msg.dir === "inbound" ? at(0, 11, i) : null, sentAt: msg.dir === "outbound" ? at(0, 11, i) : null, deliveredAt: msg.dir === "outbound" ? at(0, 11, i) : null },
      });
    }
  }

  console.log("✅ Demo Petshop populado:");
  console.log(`   tenant: ${TENANT_NAME} (/${TENANT_SLUG}) · login dono: ${OWNER_EMAIL} / ${OWNER_PASSWORD}`);
  console.log(`   • ${products.length} produtos, 11 serviços, 5 planos`);
  console.log(`   • ${customerSpecs.length} clientes (com pets/endereços/tags), 4 leads`);
  console.log(`   • 3 profissionais, 2 locais, ${orderSpecs.length} pedidos, ${apptSpecs.length} agendamentos`);
  console.log(`   • WhatsApp conectado + ${convoSpecs.length} conversas`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
