import "dotenv/config";

import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

// MVP feature catalog — keys mapped in .claude/docs/02_Specs_MVP_Fluuy.md
// ("Feature flags do MVP"). Each `key` is the stable contract checked by the
// modules' UI/endpoints before they run.
const MVP_FEATURES: { key: string; name: string; description: string; group: string }[] = [
  { key: "platform_tenant_management", name: "Gestão de tenants", description: "Gestão de tenants", group: "platform" },
  { key: "platform_niche_management", name: "Gestão de nichos", description: "Gestão de nichos", group: "platform" },
  { key: "platform_niche_templates", name: "Gestão de templates", description: "Gestão de templates", group: "platform" },
  { key: "tenant_profile_view", name: "Ver perfil da empresa", description: "Ver perfil da empresa", group: "tenant" },
  { key: "tenant_profile_edit", name: "Editar perfil da empresa", description: "Editar perfil da empresa", group: "tenant" },
  { key: "whatsapp_integration", name: "Integração WhatsApp", description: "Conexão de números, templates e logs do WhatsApp", group: "attendance" },
  { key: "whatsapp_ai_attendance", name: "IA no WhatsApp", description: "IA no WhatsApp", group: "attendance" },
  { key: "conversation_history", name: "Histórico de conversas", description: "Histórico de conversas", group: "attendance" },
  { key: "human_handoff", name: "Handoff humano", description: "Handoff humano", group: "attendance" },
  { key: "customer_management", name: "Gestão de clientes", description: "Gestão de clientes", group: "customers" },
  { key: "customer_entities", name: "Entidades do cliente", description: "Entidades do cliente", group: "customers" },
  { key: "lead_management", name: "Gestão de leads", description: "Gestão de leads", group: "customers" },
  { key: "product_catalog", name: "Catálogo de produtos", description: "Catálogo de produtos", group: "catalog" },
  { key: "service_catalog", name: "Catálogo de serviços", description: "Catálogo de serviços", group: "catalog" },
  { key: "plans_catalog", name: "Catálogo de planos", description: "Catálogo de planos", group: "catalog" },
  { key: "requests_management", name: "Gestão de solicitações", description: "Gestão de solicitações", group: "requests" },
  { key: "agent_configuration", name: "Configuração do agente", description: "Configuração do agente", group: "agent" },
  { key: "agent_rules", name: "Regras do agente", description: "Regras do agente", group: "agent" },
  { key: "tenant_workflows", name: "Workflows do tenant", description: "Workflows do tenant", group: "workflows" },
  { key: "workflow_runs", name: "Execução de workflows", description: "Execução de workflows", group: "workflows" },
  { key: "basic_dashboard", name: "Dashboard básico", description: "Dashboard básico", group: "dashboard" },
  { key: "ai_usage_tracking", name: "Uso de IA", description: "Uso de IA", group: "ai" },
  { key: "collaborator_management", name: "Gestão de colaboradores", description: "Equipe/colaboradores do tenant", group: "team" },
  { key: "appointment_request", name: "Agenda", description: "Agendamentos e horários", group: "attendance" },
  { key: "product_order_request", name: "Pedidos de produtos", description: "Pedidos recebidos pelos clientes", group: "commerce" },
  { key: "delivery_management", name: "Entregas", description: "Gestão de entregas", group: "commerce" },
  { key: "knowledge_base", name: "Base de conhecimento", description: "Conteúdos que alimentam o agente", group: "agent" },
];

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@fluuy.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: "Fluuy Admin",
      email,
      isPlatformAdmin: true,
    },
  });

  await prisma.authCredential.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, passwordHash },
  });

  console.log(`Seeded platform admin: ${email}`);

  // Idempotent: update name/description/group on re-seed, but never touch
  // status (admins may have manually inactivated a feature).
  for (const feature of MVP_FEATURES) {
    await prisma.feature.upsert({
      where: { key: feature.key },
      update: { name: feature.name, description: feature.description, group: feature.group },
      create: feature,
    });
  }

  console.log(`Seeded ${MVP_FEATURES.length} MVP features.`);

  // ── Test tenant + owner user (idempotent) ──────────────────────────────
  const niche = await prisma.niche.upsert({
    where: { key: "pets" },
    update: {},
    create: {
      key: "pets",
      name: "Pets",
      description: "Petshops e clínicas veterinárias",
      customerLabel: "Tutor",
      entityLabel: "Pet",
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { slug: "petshop-da-maria" },
    update: {},
    create: {
      nicheId: niche.id,
      name: "Petshop da Maria",
      slug: "petshop-da-maria",
      status: "active",
      publicEmail: "contato@petshop.com",
    },
  });

  // Active product template for the niche → drives the product form's
  // "Campos específicos do nicho" section (validated server-side).
  const hasProductTemplate = await prisma.template.findFirst({
    where: { nicheId: niche.id, entityType: "product" },
    select: { id: true },
  });
  if (!hasProductTemplate) {
    await prisma.template.create({
      data: {
        nicheId: niche.id,
        entityType: "product",
        name: "Produto — Pets",
        status: "active",
        version: 1,
        fields: [
          { key: "especie", label: "Espécie", type: "select", required: false, options: ["Cão", "Gato", "Outro"] },
          { key: "peso_kg", label: "Peso (kg)", type: "number", required: false },
          { key: "linha_premium", label: "Linha premium", type: "boolean", required: false },
        ],
      },
    });
  }

  const tenantEmail = process.env.SEED_TENANT_EMAIL ?? "owner@petshop.com";
  const tenantPassword = process.env.SEED_TENANT_PASSWORD ?? "changeme123";

  const tenantUser = await prisma.user.upsert({
    where: { email: tenantEmail },
    update: {},
    create: { name: "Maria (Petshop)", email: tenantEmail, emailVerifiedAt: new Date() },
  });

  await prisma.authCredential.upsert({
    where: { userId: tenantUser.id },
    update: {},
    create: { userId: tenantUser.id, passwordHash: await bcrypt.hash(tenantPassword, 12) },
  });

  await prisma.tenantUser.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: tenantUser.id } },
    update: {},
    create: { tenantId: tenant.id, userId: tenantUser.id, role: "tenant_owner", status: "active" },
  });

  console.log(`Seeded test tenant '${tenant.slug}' with owner: ${tenantEmail}`);

  // Enable all non-platform features for the test tenant (so the modules show).
  const enabledFeatures = await prisma.feature.findMany({ where: { group: { not: "platform" } } });
  for (const feature of enabledFeatures) {
    await prisma.tenantFeature.upsert({
      where: { tenantId_featureId: { tenantId: tenant.id, featureId: feature.id } },
      update: { enabled: true },
      create: { tenantId: tenant.id, featureId: feature.id, enabled: true },
    });
  }
  console.log(`Enabled ${enabledFeatures.length} features for '${tenant.slug}'.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
