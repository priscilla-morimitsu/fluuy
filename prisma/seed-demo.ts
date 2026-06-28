import "dotenv/config";

import { prisma } from "@/lib/prisma";

// ──────────────────────────────────────────────────────────────────────────
// Demo data for the test tenant "Petshop da Maria" (owner@petshop.com).
// Dev-only: fills every tenant module with realistic pt-BR data so all screens
// can be visualized with content. Idempotent — it wipes this tenant's
// tenant-scoped data first, then recreates it. Never touches users, the tenant
// row itself, niches, features or tenant_features (those come from `db:seed`).
//
// Run: npm run db:seed:demo  (run `npm run db:seed` first to create the tenant)
// ──────────────────────────────────────────────────────────────────────────

const TENANT_SLUG = "petshop-da-maria";

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// Normalize a BR phone to digits with country code (used for the *_normalized
// dedup columns). Display fields keep the formatted string.
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
  // FK-safe order: children before parents. Many relations cascade from the
  // tenant, but we delete explicitly so the script is self-documenting.
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

  await prisma.offerPlanProductItem.deleteMany({ where: { tenantId } });
  await prisma.product.deleteMany({ where: { tenantId } });
  await prisma.productCategory.deleteMany({ where: { tenantId } });
}

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
  if (!tenant) {
    throw new Error(
      `Tenant '${TENANT_SLUG}' não encontrado. Rode 'npm run db:seed' antes de 'npm run db:seed:demo'.`,
    );
  }
  const tenantId = tenant.id;

  console.log(`Limpando dados de demonstração de '${TENANT_SLUG}'…`);
  await wipeTenantData(tenantId);

  // ── Perfil do tenant ─────────────────────────────────────────────────────
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      legalName: "Maria Pet Comércio e Serviços LTDA",
      document: "12.345.678/0001-90",
      description: "Petshop completo: banho & tosa, veterinário, alimentação e acessórios.",
      publicPhone: "(11) 3000-1000",
      notificationPhone: "(11) 99999-1000",
      address: {
        zipCode: "01310-100",
        street: "Av. Paulista",
        number: "1000",
        neighborhood: "Bela Vista",
        city: "São Paulo",
        state: "SP",
        country: "Brasil",
      },
      businessHours: {
        mon: [{ open: "08:00", close: "18:00" }],
        tue: [{ open: "08:00", close: "18:00" }],
        wed: [{ open: "08:00", close: "18:00" }],
        thu: [{ open: "08:00", close: "18:00" }],
        fri: [{ open: "08:00", close: "18:00" }],
        sat: [{ open: "08:00", close: "13:00" }],
        sun: [],
      },
      hasProducts: true,
      hasServices: true,
      hasPlans: true,
      hasDelivery: true,
      hasPickup: true,
      acceptsOnlinePayment: true,
    },
  });

  // ── Locais ───────────────────────────────────────────────────────────────
  const locCentro = await prisma.location.create({
    data: {
      tenantId,
      name: "Unidade Centro",
      type: "store",
      status: "active",
      address: { street: "Av. Paulista", number: "1000", city: "São Paulo", state: "SP" },
    },
  });
  const locJardins = await prisma.location.create({
    data: {
      tenantId,
      name: "Unidade Jardins",
      type: "clinic",
      status: "active",
      address: { street: "Rua Oscar Freire", number: "500", city: "São Paulo", state: "SP" },
    },
  });

  // ── Profissionais ────────────────────────────────────────────────────────
  const profVet = await prisma.professional.create({
    data: {
      tenantId,
      name: "Dr. Carlos Mendes",
      title: "Médico Veterinário",
      bio: "Clínico geral com 10 anos de experiência em pequenos animais.",
      phone: "(11) 98888-0001",
      whatsapp: "(11) 98888-0001",
      email: "carlos@petshop.com",
      status: "active",
      customData: { registro: "CRMV-SP 12345" },
    },
  });
  const profTosa = await prisma.professional.create({
    data: {
      tenantId,
      name: "Ana Souza",
      title: "Tosadora",
      bio: "Especialista em tosa higiênica e tosa na tesoura.",
      phone: "(11) 98888-0002",
      email: "ana@petshop.com",
      status: "active",
    },
  });
  const profBanho = await prisma.professional.create({
    data: {
      tenantId,
      name: "João Lima",
      title: "Banhista",
      phone: "(11) 98888-0003",
      status: "active",
    },
  });

  await prisma.professionalLocation.createMany({
    data: [
      { tenantId, professionalId: profVet.id, locationId: locJardins.id },
      { tenantId, professionalId: profTosa.id, locationId: locCentro.id },
      { tenantId, professionalId: profBanho.id, locationId: locCentro.id },
    ],
  });

  // ── Especialidades ───────────────────────────────────────────────────────
  const espClinica = await prisma.professionalSpecialty.create({
    data: { tenantId, name: "Clínica Geral", slug: "clinica-geral", status: "active" },
  });
  const espTosa = await prisma.professionalSpecialty.create({
    data: { tenantId, name: "Tosa", slug: "tosa", status: "active" },
  });
  await prisma.professionalSpecialtyAssignment.createMany({
    data: [
      { tenantId, professionalId: profVet.id, specialtyId: espClinica.id },
      { tenantId, professionalId: profTosa.id, specialtyId: espTosa.id },
    ],
  });

  // ── Categorias de produto ────────────────────────────────────────────────
  const catAlim = await prisma.productCategory.create({
    data: { tenantId, name: "Alimentação", slug: "alimentacao", status: "active" },
  });
  const catHig = await prisma.productCategory.create({
    data: { tenantId, name: "Higiene", slug: "higiene", status: "active" },
  });
  const catAcc = await prisma.productCategory.create({
    data: { tenantId, name: "Acessórios", slug: "acessorios", status: "active" },
  });

  // ── Produtos ─────────────────────────────────────────────────────────────
  const products = await Promise.all(
    [
      {
        name: "Ração Premium Cães Adultos 15kg",
        categoryId: catAlim.id,
        brand: "GoldPet",
        salePrice: 219.9,
        promotionalPrice: 199.9,
        costPrice: 150,
        unit: "package",
        status: "active",
        customData: { especie: "Cão", peso_kg: 15, linha_premium: true },
      },
      {
        name: "Ração Gatos Castrados 3kg",
        categoryId: catAlim.id,
        brand: "FelineCare",
        salePrice: 89.9,
        costPrice: 55,
        unit: "package",
        status: "active",
        customData: { especie: "Gato", peso_kg: 3, linha_premium: false },
      },
      {
        name: "Shampoo Hidratante 500ml",
        categoryId: catHig.id,
        brand: "PetClean",
        salePrice: 34.9,
        costPrice: 18,
        unit: "unit",
        status: "active",
        customData: { especie: "Outro" },
      },
      {
        name: "Petisco Bifinho 500g",
        categoryId: catAlim.id,
        brand: "GoldPet",
        salePrice: 24.9,
        promotionalPrice: 19.9,
        costPrice: 12,
        unit: "package",
        status: "active",
        customData: { especie: "Cão" },
      },
      {
        name: "Coleira Ajustável M",
        categoryId: catAcc.id,
        brand: "PetStyle",
        salePrice: 49.9,
        costPrice: 22,
        unit: "unit",
        status: "active",
      },
      {
        name: "Brinquedo Mordedor",
        categoryId: catAcc.id,
        salePrice: 29.9,
        costPrice: 14,
        unit: "unit",
        status: "draft",
      },
    ].map((p) =>
      prisma.product.create({
        data: {
          tenantId,
          name: p.name,
          slug: slugify(p.name),
          categoryId: p.categoryId ?? null,
          brand: p.brand ?? null,
          salePrice: p.salePrice,
          promotionalPrice: p.promotionalPrice ?? null,
          costPrice: p.costPrice ?? null,
          unit: (p.unit as never) ?? null,
          status: p.status as never,
          customData: p.customData ?? {},
        },
      }),
    ),
  );

  // ── Categorias de serviço + serviços ─────────────────────────────────────
  const catBanho = await prisma.serviceCategory.create({
    data: { tenantId, name: "Banho & Tosa", slug: "banho-tosa", status: "active" },
  });
  const catVet = await prisma.serviceCategory.create({
    data: { tenantId, name: "Veterinário", slug: "veterinario", status: "active" },
  });

  const svcBanho = await prisma.service.create({
    data: {
      tenantId,
      categoryId: catBanho.id,
      name: "Banho Completo",
      slug: "banho-completo",
      description: "Banho com shampoo, secagem e perfume.",
      basePrice: 60,
      estimatedDurationMinutes: 60,
      status: "active",
      deliveryModes: ["at_location"],
    },
  });
  const svcTosa = await prisma.service.create({
    data: {
      tenantId,
      categoryId: catBanho.id,
      name: "Tosa Higiênica",
      slug: "tosa-higienica",
      basePrice: 45,
      promotionalPrice: 39,
      estimatedDurationMinutes: 45,
      status: "active",
      deliveryModes: ["at_location"],
    },
  });
  const svcConsulta = await prisma.service.create({
    data: {
      tenantId,
      categoryId: catVet.id,
      name: "Consulta Veterinária",
      slug: "consulta-veterinaria",
      basePrice: 120,
      estimatedDurationMinutes: 30,
      status: "active",
      deliveryModes: ["at_location", "online"],
      onlineInstructions: "Atendimento por vídeo-chamada via WhatsApp.",
    },
  });
  const svcVacina = await prisma.service.create({
    data: {
      tenantId,
      categoryId: catVet.id,
      name: "Vacinação",
      slug: "vacinacao",
      basePrice: 90,
      estimatedDurationMinutes: 20,
      status: "active",
      deliveryModes: ["at_location", "at_home"],
      homeServiceNotes: "Atendemos a domicílio na região central.",
    },
  });

  // service ↔ professional / location
  await prisma.serviceProfessional.createMany({
    data: [
      { tenantId, serviceId: svcBanho.id, professionalId: profBanho.id, isPrimary: true },
      { tenantId, serviceId: svcTosa.id, professionalId: profTosa.id, isPrimary: true },
      { tenantId, serviceId: svcConsulta.id, professionalId: profVet.id, isPrimary: true },
      { tenantId, serviceId: svcVacina.id, professionalId: profVet.id, isPrimary: true },
    ],
  });
  await prisma.serviceLocation.createMany({
    data: [
      { tenantId, serviceId: svcBanho.id, locationId: locCentro.id },
      { tenantId, serviceId: svcTosa.id, locationId: locCentro.id },
      { tenantId, serviceId: svcConsulta.id, locationId: locJardins.id },
      { tenantId, serviceId: svcVacina.id, locationId: locJardins.id },
    ],
  });
  // availability rules (seg–sex 09:00–17:00 para banho)
  await prisma.serviceAvailabilityRule.createMany({
    data: [1, 2, 3, 4, 5].map((weekday) => ({
      tenantId,
      serviceId: svcBanho.id,
      locationId: locCentro.id,
      deliveryMode: "at_location" as never,
      weekday,
      startTime: "09:00",
      endTime: "17:00",
      slotDurationMinutes: 60,
    })),
  });

  // ── Planos & pacotes ─────────────────────────────────────────────────────
  const planCat = await prisma.offerPlanCategory.create({
    data: { tenantId, name: "Planos de Banho", slug: "planos-banho", status: "active" },
  });
  const planMensal = await prisma.offerPlan.create({
    data: {
      tenantId,
      categoryId: planCat.id,
      name: "Plano Banho Mensal",
      slug: "plano-banho-mensal",
      description: "4 banhos por mês com desconto.",
      type: "recurring_plan",
      price: 199.9,
      billingCycle: "monthly",
      autoRenew: true,
      status: "active",
    },
  });
  await prisma.offerPlanServiceItem.create({
    data: { tenantId, offerPlanId: planMensal.id, serviceId: svcBanho.id, quantity: 4, usageLimit: 4 },
  });
  const planPacote = await prisma.offerPlan.create({
    data: {
      tenantId,
      categoryId: planCat.id,
      name: "Pacote 5 Banhos",
      slug: "pacote-5-banhos",
      description: "Compre 5 banhos e pague 4.",
      type: "prepaid_package",
      price: 240,
      expiresAfterDays: 180,
      usageLimit: 5,
      status: "active",
    },
  });
  await prisma.offerPlanServiceItem.create({
    data: { tenantId, offerPlanId: planPacote.id, serviceId: svcBanho.id, quantity: 5, usageLimit: 5 },
  });

  // ── Tags de clientes ─────────────────────────────────────────────────────
  const tagVip = await prisma.customerTag.create({
    data: { tenantId, name: "VIP", slug: "vip", color: "#f59e0b", status: "active" },
  });
  const tagNovo = await prisma.customerTag.create({
    data: { tenantId, name: "Novo", slug: "novo", color: "#10b981", status: "active" },
  });
  const tagInad = await prisma.customerTag.create({
    data: { tenantId, name: "Inadimplente", slug: "inadimplente", color: "#ef4444", status: "active" },
  });

  // ── Clientes (tutores) + endereços + pets ────────────────────────────────
  const customerSpecs = [
    {
      name: "Mariana Alves",
      phone: "(11) 91111-0001",
      email: "mariana.alves@email.com",
      source: "whatsapp",
      tags: [tagVip.id],
      pets: [
        {
          name: "Rex",
          customData: {
            nome: "Rex",
            especie: "Cão",
            raca: "Labrador",
            porte: "Grande",
            peso_kg: 28,
            sexo: "Macho",
            castrado: true,
            observacoes_saude: "Alergia a frango.",
            tutor2_nome: "Roberto Alves",
            tutor2_telefone: "(11) 91111-9001",
            tutor2_vinculo: "Cônjuge",
            tutor2_email: "roberto.alves@email.com",
            contato_emergencia_nome: "Clínica Vet 24h",
            contato_emergencia_telefone: "(11) 4000-2000",
            contato_emergencia_vinculo: "Veterinário",
            contato_emergencia_email: "emergencia@vet24h.com",
          },
        },
      ],
    },
    {
      name: "Pedro Santos",
      phone: "(11) 91111-0002",
      email: "pedro.santos@email.com",
      source: "instagram",
      tags: [tagNovo.id],
      pets: [
        {
          name: "Mimi",
          customData: { nome: "Mimi", especie: "Gato", raca: "Siamês", porte: "Pequeno", peso_kg: 4, sexo: "Fêmea", castrado: true },
        },
      ],
    },
    {
      name: "Juliana Costa",
      phone: "(11) 91111-0003",
      email: "juliana.costa@email.com",
      source: "referral",
      tags: [tagVip.id, tagInad.id],
      pets: [
        {
          name: "Thor",
          customData: { nome: "Thor", especie: "Cão", raca: "Golden", porte: "Grande", peso_kg: 32, sexo: "Macho", castrado: false },
        },
        {
          name: "Luna",
          customData: {
            nome: "Luna",
            especie: "Cão",
            raca: "Poodle",
            porte: "Pequeno",
            peso_kg: 8,
            sexo: "Fêmea",
            castrado: true,
            contato_emergencia_nome: "Marcos Costa",
            contato_emergencia_telefone: "(11) 91111-9003",
            contato_emergencia_vinculo: "Irmão",
          },
        },
      ],
    },
    {
      name: "Ricardo Lima",
      phone: "(11) 91111-0004",
      email: "ricardo.lima@email.com",
      source: "website",
      tags: [],
      pets: [
        {
          name: "Bob",
          customData: { nome: "Bob", especie: "Cão", raca: "Vira-lata (SRD)", porte: "Médio", peso_kg: 15, sexo: "Macho", castrado: true },
        },
      ],
    },
    {
      name: "Fernanda Oliveira",
      phone: "(11) 91111-0005",
      email: "fernanda.o@email.com",
      source: "manual",
      tags: [tagNovo.id],
      pets: [
        {
          name: "Nina",
          customData: { nome: "Nina", especie: "Gato", raca: "Persa", porte: "Pequeno", peso_kg: 5, sexo: "Fêmea", castrado: false },
        },
      ],
    },
  ] as const;

  const customers: { id: string; pets: { id: string }[] }[] = [];
  for (const spec of customerSpecs) {
    const customer = await prisma.customer.create({
      data: {
        tenantId,
        name: spec.name,
        phone: spec.phone,
        phoneNormalized: normalizePhone(spec.phone),
        whatsapp: spec.phone,
        whatsappNormalized: normalizePhone(spec.phone),
        email: spec.email ?? null,
        personType: "individual",
        status: "active",
        source: spec.source as never,
        // Alterna consentimento para a listagem exibir "Aceito" e "Aguardando".
        consentAcceptedAt: customers.length % 2 === 0 ? at(-30) : null,
        addresses: {
          create: {
            tenantId,
            type: "main",
            isDefault: true,
            zipCode: "01310-100",
            street: "Av. Paulista",
            number: `${100 + customers.length}`,
            neighborhood: "Bela Vista",
            city: "São Paulo",
            state: "SP",
          },
        },
      },
    });
    if (spec.tags.length) {
      await prisma.customerTagAssignment.createMany({
        data: spec.tags.map((tagId) => ({ tenantId, customerId: customer.id, tagId })),
      });
    }
    const pets: { id: string }[] = [];
    for (const pet of spec.pets) {
      const entity = await prisma.customerEntity.create({
        data: {
          tenantId,
          customerId: customer.id,
          entityType: "pet",
          name: pet.name,
          status: "active",
          customData: pet.customData,
        },
      });
      pets.push({ id: entity.id });
    }
    customers.push({ id: customer.id, pets });
  }

  // ── Leads (CRM) ──────────────────────────────────────────────────────────
  await prisma.customerLead.createMany({
    data: [
      {
        tenantId,
        name: "Carla Dias",
        phone: "(11) 92222-0001",
        phoneNormalized: normalizePhone("(11) 92222-0001"),
        email: "carla.dias@email.com",
        source: "whatsapp",
        status: "new",
        message: "Olá, gostaria de saber o preço do banho para golden retriever.",
      },
      {
        tenantId,
        name: "Bruno Rocha",
        phone: "(11) 92222-0002",
        phoneNormalized: normalizePhone("(11) 92222-0002"),
        source: "instagram",
        status: "contacted",
        message: "Vocês fazem tosa na tesoura?",
      },
      {
        tenantId,
        name: "Patrícia Gomes",
        phone: "(11) 92222-0003",
        phoneNormalized: normalizePhone("(11) 92222-0003"),
        source: "website",
        status: "qualified",
      },
    ],
  });

  // ── Equipe / colaboradores ───────────────────────────────────────────────
  const roleAtend = await prisma.collaboratorRole.create({
    data: { tenantId, name: "Atendente", slug: "atendente", status: "active" },
  });
  const roleGerente = await prisma.collaboratorRole.create({
    data: { tenantId, name: "Gerente", slug: "gerente", status: "active" },
  });
  const deptAtend = await prisma.collaboratorDepartment.create({
    data: { tenantId, name: "Atendimento", slug: "atendimento", status: "active" },
  });
  const deptClinica = await prisma.collaboratorDepartment.create({
    data: { tenantId, name: "Clínica", slug: "clinica", status: "active" },
  });
  await prisma.collaborator.createMany({
    data: [
      {
        tenantId,
        name: "Beatriz Martins",
        roleId: roleGerente.id,
        departmentId: deptAtend.id,
        phone: "(11) 93333-0001",
        email: "beatriz@petshop.com",
        status: "active",
        hasSystemAccess: true,
        tenantRole: "tenant_manager",
      },
      {
        tenantId,
        name: "Lucas Pereira",
        roleId: roleAtend.id,
        departmentId: deptAtend.id,
        phone: "(11) 93333-0002",
        status: "active",
      },
    ],
  });
  await prisma.collaborator.create({
    data: {
      tenantId,
      professionalId: profVet.id,
      name: "Dr. Carlos Mendes",
      roleId: roleGerente.id,
      departmentId: deptClinica.id,
      email: "carlos@petshop.com",
      status: "active",
      isServiceProfessional: true,
    },
  });

  // ── Pedidos ──────────────────────────────────────────────────────────────
  await prisma.orderSequence.create({ data: { tenantId, nextNumber: 0 } });
  const orderSpecs = [
    {
      customerIdx: 0,
      status: "completed",
      paymentStatus: "paid",
      paymentMethod: "pix",
      fulfillmentType: "pickup",
      items: [
        { type: "product", name: products[0].name, qty: 1, price: 199.9 },
        { type: "product", name: products[3].name, qty: 2, price: 19.9 },
      ],
    },
    {
      customerIdx: 1,
      status: "confirmed",
      paymentStatus: "pending",
      paymentMethod: "credit_card",
      fulfillmentType: "delivery",
      items: [{ type: "product", name: products[1].name, qty: 1, price: 89.9 }],
    },
    {
      customerIdx: 2,
      status: "pending_confirmation",
      paymentStatus: "pending",
      paymentMethod: "pix",
      fulfillmentType: "pickup",
      items: [
        { type: "service", name: svcBanho.name, qty: 1, price: 60 },
        { type: "product", name: products[2].name, qty: 1, price: 34.9 },
      ],
    },
    {
      customerIdx: 3,
      status: "cancelled",
      paymentStatus: "cancelled",
      paymentMethod: "cash",
      fulfillmentType: "pickup",
      items: [{ type: "product", name: products[4].name, qty: 1, price: 49.9 }],
    },
  ] as const;

  let orderNumber = 0;
  for (const spec of orderSpecs) {
    orderNumber += 1;
    const subtotal = spec.items.reduce((sum, i) => sum + i.qty * i.price, 0);
    const deliveryFee = spec.fulfillmentType === "delivery" ? 12 : 0;
    const total = subtotal + deliveryFee;
    const order = await prisma.order.create({
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
        confirmedAt: spec.status !== "pending_confirmation" && spec.status !== "cancelled" ? at(-3) : null,
        completedAt: spec.status === "completed" ? at(-2) : null,
        cancelledAt: spec.status === "cancelled" ? at(-1) : null,
        items: {
          create: spec.items.map((i, idx) => ({
            tenantId,
            itemType: i.type as never,
            name: i.name,
            quantity: i.qty,
            unitPrice: i.price,
            total: i.qty * i.price,
            sortOrder: idx,
          })),
        },
        payments: {
          create: {
            tenantId,
            provider: "manual",
            method: spec.paymentMethod as never,
            status: spec.paymentStatus as never,
            amount: total,
            amountPaid: spec.paymentStatus === "paid" ? total : 0,
            paidAt: spec.paymentStatus === "paid" ? at(-2) : null,
          },
        },
        statusHistory: {
          create: { tenantId, toStatus: spec.status as never, reason: "Pedido de demonstração" },
        },
      },
    });
    void order;
  }

  // ── Agendamentos ─────────────────────────────────────────────────────────
  const apptSpecs = [
    { customerIdx: 0, service: svcBanho, prof: profBanho, loc: locCentro, day: -5, hour: 10, status: "completed" },
    { customerIdx: 2, service: svcTosa, prof: profTosa, loc: locCentro, day: -1, hour: 14, status: "completed" },
    { customerIdx: 1, service: svcConsulta, prof: profVet, loc: locJardins, day: 0, hour: 11, status: "confirmed" },
    { customerIdx: 0, service: svcBanho, prof: profBanho, loc: locCentro, day: 1, hour: 9, status: "confirmed" },
    { customerIdx: 4, service: svcVacina, prof: profVet, loc: locJardins, day: 2, hour: 15, status: "requested" },
    { customerIdx: 3, service: svcConsulta, prof: profVet, loc: locJardins, day: 4, hour: 16, status: "pending_confirmation" },
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
        locationId: spec.loc.id,
        modality: "at_location",
        status: spec.status as never,
        source: "manual",
        startAt: start,
        endAt: end,
        confirmedAt: spec.status === "confirmed" || spec.status === "completed" ? at(spec.day - 1) : null,
        completedAt: spec.status === "completed" ? end : null,
        statusHistory: { create: { tenantId, toStatus: spec.status as never } },
      },
    });
    if (spec.day >= 0) {
      await prisma.appointmentReminder.create({
        data: {
          tenantId,
          appointmentId: appt.id,
          channel: "whatsapp",
          scheduledFor: new Date(start.getTime() - DAY),
          status: "pending",
        },
      });
    }
  }

  // ── WhatsApp: conta, número, templates e conversas ───────────────────────
  const providerAccount = await prisma.messagingProviderAccount.create({
    data: {
      tenantId,
      provider: "pilot_status_whatsapp",
      environment: "test",
      providerProjectId: "demo-project",
      keyPrefix: "ps_demo",
      status: "active",
    },
  });
  const waAccount = await prisma.whatsAppAccount.create({
    data: {
      tenantId,
      providerAccountId: providerAccount.id,
      name: "Atendimento Petshop",
      number: "(11) 3000-1000",
      numberNormalized: normalizePhone("(11) 3000-1000"),
      maskedNumber: "(11) 3000-****",
      status: "open",
      isPrimary: true,
      isFullyConnected: true,
      connectedAt: at(-20),
    },
  });
  await prisma.messageTemplateMapping.createMany({
    data: [
      {
        tenantId,
        providerAccountId: providerAccount.id,
        providerTemplateId: "tpl_lembrete",
        name: "lembrete_agendamento",
        category: "utility",
        language: "pt_BR",
        status: "approved",
        isDefault: true,
        variables: ["nome", "data", "servico"],
      },
      {
        tenantId,
        providerAccountId: providerAccount.id,
        providerTemplateId: "tpl_promo",
        name: "promocao_banho",
        category: "marketing",
        language: "pt_BR",
        status: "approved",
        variables: ["nome"],
      },
    ],
  });

  const convoSpecs = [
    {
      customerIdx: 0,
      assignee: "ai",
      status: "open",
      messages: [
        { dir: "inbound", text: "Oi! Queria agendar um banho pro Rex." },
        { dir: "outbound", text: "Olá Mariana! Claro 🐶 Temos horário amanhã às 9h, pode ser?", agent: true },
        { dir: "inbound", text: "Perfeito, pode marcar!" },
      ],
    },
    {
      customerIdx: 1,
      assignee: "human",
      status: "pending",
      messages: [
        { dir: "inbound", text: "Vocês têm ração para gato castrado?" },
        { dir: "outbound", text: "Temos sim! A de 3kg está R$ 89,90.", agent: false },
      ],
    },
    {
      customerIdx: 2,
      assignee: "paused",
      status: "open",
      messages: [
        { dir: "inbound", text: "Preciso remarcar a tosa da Luna." },
        { dir: "outbound", text: "Sem problemas, vou verificar a agenda e já te retorno.", agent: false },
      ],
    },
  ] as const;

  for (const spec of convoSpecs) {
    const cust = customerSpecs[spec.customerIdx];
    const conv = await prisma.conversation.create({
      data: {
        tenantId,
        whatsappAccountId: waAccount.id,
        channel: "whatsapp",
        targetType: "phone",
        contactNumber: cust.phone,
        contactNumberNormalized: normalizePhone(cust.phone),
        targetName: cust.name,
        customerId: customers[spec.customerIdx].id,
        status: spec.status as never,
        assigneeType: spec.assignee as never,
        optInStatus: "opted_in",
        lastMessageAt: at(0, 12),
        lastInboundAt: at(0, 12),
        unreadCount: spec.assignee === "human" ? 1 : 0,
      },
    });
    let i = 0;
    for (const msg of spec.messages) {
      i += 1;
      await prisma.conversationMessage.create({
        data: {
          tenantId,
          conversationId: conv.id,
          direction: msg.dir as never,
          content: msg.text,
          messageType: "text",
          internalStatus: msg.dir === "inbound" ? "received" : "delivered",
          sentByAgent: "agent" in msg ? Boolean(msg.agent) : false,
          fromNumber: msg.dir === "inbound" ? normalizePhone(cust.phone) : waAccount.numberNormalized,
          toNumber: msg.dir === "inbound" ? waAccount.numberNormalized : normalizePhone(cust.phone),
          receivedAt: msg.dir === "inbound" ? at(0, 11, i) : null,
          sentAt: msg.dir === "outbound" ? at(0, 11, i) : null,
          deliveredAt: msg.dir === "outbound" ? at(0, 11, i) : null,
        },
      });
    }
  }

  console.log("✅ Dados de demonstração criados:");
  console.log(`   • ${products.length} produtos, 4 serviços, 2 planos`);
  console.log(`   • ${customerSpecs.length} clientes (com pets, endereços e tags), 3 leads`);
  console.log(`   • 3 profissionais, 2 locais, 3 colaboradores`);
  console.log(`   • 4 pedidos, ${apptSpecs.length} agendamentos`);
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
