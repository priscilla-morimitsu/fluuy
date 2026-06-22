"use server";

import { revalidatePath } from "next/cache";

import { Prisma } from "@/generated/prisma/client";
import type { AdminActionResult } from "@/lib/admin/action-result";
import { onlyDigits } from "@/lib/masks";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";
import {
  customerAddressSchema,
  customerCreateSchema,
  customerEntityCreateSchema,
  customerEntityStatusSchema,
  customerStatusSchema,
  customerTagCreateSchema,
  deriveEntityType,
  slugify,
  type CustomerAddressInput,
} from "@/lib/validations/customer";
import { deriveEntityName, validateCustomData, type TemplateField } from "@/lib/validations/template";

import {
  customerEntityTemplateFields,
  customerNicheLabels,
  customerTemplateFields,
  getCustomer,
  type CustomerDetail,
} from "./data";

export type CustomerActionResult = AdminActionResult;
export type CustomerDetailResult = { ok: true; customer: CustomerDetail } | { error: string };
export type CustomerTagActionResult =
  | {
      ok: true;
      tag: { id: string; name: string; slug: string; color: string | null; status: "active" | "inactive"; customerCount: number };
    }
  | { error: string };

// Operator can manage customers (attendance is operator work). Deletion and tag
// taxonomy removal stay owner/manager-only. viewer never reaches a write path.
const WRITE_ROLES = ["tenant_owner", "tenant_manager", "tenant_operator"] as const;
const ADMIN_ROLES = ["tenant_owner", "tenant_manager"] as const;
const FEATURE = "customer_management";
// Related entities live behind their own feature gate.
const ENTITY_FEATURE = "customer_entities";

function fail(err: unknown): { error: string } {
  if (err instanceof ForbiddenError || err instanceof UnauthorizedError) {
    return { error: "Você não tem permissão para esta ação." };
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return { error: "Já existe um cliente com este telefone." };
  }
  console.error("[customers] action error:", err);
  return { error: "Não foi possível concluir a operação." };
}

function parseForm(formData: FormData) {
  const g = (k: string) => formData.get(k);
  return {
    name: g("name"),
    phone: g("phone") ?? "",
    whatsapp: g("whatsapp") ?? "",
    email: g("email") ?? "",
    personType: g("personType") ?? "",
    document: g("document") ?? "",
    birthDate: g("birthDate") ?? "",
    status: g("status"),
    // Origin is system-assigned, never user-supplied. A record created/edited
    // through the panel is "manual"; other origins (ai, website…) are set by
    // their own intake paths (webhooks, lead capture).
    source: "manual",
    consentAcceptedAt: g("consentAcceptedAt") ?? "",
    consentSource: g("consentSource") ?? "",
    internalNotes: g("internalNotes") ?? "",
  };
}

function readCustomData(fields: TemplateField[], formData: FormData, prefix = "custom_"): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = formData.get(`${prefix}${field.key}`);
    if (field.type === "boolean") {
      // Only persist an explicit choice — an untouched select submits "".
      if (raw === "on" || raw === "true") data[field.key] = true;
      else if (raw === "false") data[field.key] = false;
    } else if (field.type === "number") {
      if (raw !== null && raw !== "") data[field.key] = Number(raw);
    } else if (raw !== null && raw !== "") {
      data[field.key] = String(raw);
    }
  }
  return data;
}

type EntityEntry = { id: string | null; name: string; status: "active" | "inactive"; customData: Record<string, unknown> };

/** Parse the customer form's entity (pets) repeater: pet{i}_* fields. */
function readEntities(
  fields: TemplateField[],
  formData: FormData,
): { ok: true; entries: EntityEntry[] } | { ok: false; error: string } {
  const count = Number(formData.get("petCount") ?? 0);
  const entries: EntityEntry[] = [];
  for (let i = 0; i < count; i++) {
    const id = String(formData.get(`pet${i}_id`) ?? "").trim() || null;
    const status = String(formData.get(`pet${i}_status`) ?? "active") === "inactive" ? "inactive" : "active";
    const customData = readCustomData(fields, formData, `pet${i}_custom_`);
    // Skip a brand-new row the user added but left entirely empty.
    if (!id && Object.keys(customData).length === 0) continue;
    const cdErrors = validateCustomData(fields, customData);
    if (cdErrors.length > 0) return { ok: false, error: cdErrors[0] };
    const name = deriveEntityName(fields, customData);
    if (!name) return { ok: false, error: "Informe o nome do pet." };
    entries.push({ id, name, status, customData });
  }
  return { ok: true, entries };
}

/** Resolve the niche's primary entity type + active template (for the pets step). */
async function entityContext(slug: string, nicheId: string): Promise<{
  canEntities: boolean;
  entityType: string;
  fields: TemplateField[];
}> {
  try {
    await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: ENTITY_FEATURE });
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) {
      return { canEntities: false, entityType: "entity", fields: [] };
    }
    throw err;
  }
  const [labels, fields] = await Promise.all([
    customerNicheLabels(nicheId),
    customerEntityTemplateFields(nicheId),
  ]);
  return { canEntities: true, entityType: deriveEntityType(labels.entityLabel), fields };
}

/** Parse the dynamic address editor (indexed fields from AddressFormFields). */
function readAddresses(formData: FormData): { ok: true; addresses: CustomerAddressInput[] } | { ok: false; error: string } {
  const count = Number(formData.get("addressCount") ?? 0);
  const defaultIdx = String(formData.get("defaultAddressIndex") ?? "");
  const out: CustomerAddressInput[] = [];
  for (let i = 0; i < count; i++) {
    const g = (k: string) => String(formData.get(`addr${i}_${k}`) ?? "");
    const cep = onlyDigits(g("cep"));
    const street = g("street").trim();
    const city = g("city").trim();
    const neighborhood = g("neighborhood").trim();
    const number = g("number").trim();
    // Skip rows the user added but left empty.
    if (!cep && !street && !city && !neighborhood && !number) continue;
    const parsed = customerAddressSchema.safeParse({
      type: g("type") || "main",
      name: g("name"),
      zipCode: g("cep"),
      street,
      number,
      complement: g("complement"),
      neighborhood,
      city,
      state: g("state"),
      country: g("country"),
      reference: g("reference"),
      isDefault: String(i) === defaultIdx,
    });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Endereço inválido." };
    out.push(parsed.data);
  }
  // Exactly one default when there is at least one address.
  if (out.length > 0) {
    const defaults = out.filter((a) => a.isDefault);
    if (defaults.length === 0) out[0].isDefault = true;
    else if (defaults.length > 1) {
      let seen = false;
      for (const a of out) {
        if (a.isDefault && seen) a.isDefault = false;
        else if (a.isDefault) seen = true;
      }
    }
  }
  return { ok: true, addresses: out };
}

function readTagIds(formData: FormData): string[] {
  return [...new Set(formData.getAll("tagIds").map(String).filter(Boolean))];
}

/** Keep only tag ids that belong to this tenant (defends against IDOR). */
async function ownedTagIds(tenantId: string, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.customerTag.findMany({
    where: { tenantId, id: { in: ids } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

function addressData(tenantId: string, a: CustomerAddressInput) {
  return {
    tenantId,
    type: a.type,
    name: a.name,
    zipCode: a.zipCode,
    street: a.street,
    number: a.number,
    complement: a.complement,
    neighborhood: a.neighborhood,
    city: a.city,
    state: a.state,
    country: a.country,
    reference: a.reference,
    isDefault: a.isDefault,
  };
}

/** Full customer for the edit drawer — carries sensitive fields, write roles only. */
export async function getCustomerAction(slug: string, customerId: string): Promise<CustomerDetailResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const customer = await getCustomer(tenant.id, customerId);
    if (!customer) return { error: "Cliente não encontrado." };
    return { ok: true, customer };
  } catch (err) {
    return fail(err);
  }
}

export async function createCustomerAction(
  slug: string,
  _prev: CustomerActionResult,
  formData: FormData,
): Promise<CustomerActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const parsed = customerCreateSchema.safeParse(parseForm(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const d = parsed.data;

    const fields = await customerTemplateFields(tenant.nicheId);
    const customData = readCustomData(fields, formData);
    const cdErrors = validateCustomData(fields, customData);
    if (cdErrors.length > 0) return { error: cdErrors[0] };

    const addresses = readAddresses(formData);
    if (!addresses.ok) return { error: addresses.error };
    const tagIds = await ownedTagIds(tenant.id, readTagIds(formData));

    // Related entities (pets) created inline from the customer form's step.
    const entityCtx = await entityContext(slug, tenant.nicheId);
    let entities: EntityEntry[] = [];
    if (entityCtx.canEntities) {
      const parsedEntities = readEntities(entityCtx.fields, formData);
      if (!parsedEntities.ok) return { error: parsedEntities.error };
      entities = parsedEntities.entries;
    }

    await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name: d.name,
        phone: d.phone,
        phoneNormalized: onlyDigits(d.phone),
        whatsapp: d.whatsapp,
        whatsappNormalized: d.whatsapp ? onlyDigits(d.whatsapp) : null,
        email: d.email,
        personType: d.personType,
        document: d.document,
        documentNormalized: d.document ? onlyDigits(d.document) : null,
        birthDate: d.birthDate ? new Date(d.birthDate) : null,
        status: d.status,
        source: d.source,
        consentAcceptedAt: d.consentAcceptedAt ? new Date(d.consentAcceptedAt) : null,
        consentSource: d.consentSource,
        internalNotes: d.internalNotes,
        customData: customData as Prisma.InputJsonValue,
        addresses: { create: addresses.addresses.map((a) => addressData(tenant.id, a)) },
        tagLinks: { create: tagIds.map((tagId) => ({ tenantId: tenant.id, tagId })) },
        entities: {
          create: entities.map((e) => ({
            tenantId: tenant.id,
            entityType: entityCtx.entityType,
            name: e.name,
            status: e.status,
            customData: e.customData as Prisma.InputJsonValue,
          })),
        },
      },
    });

    revalidatePath(`/t/${slug}/customers`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function updateCustomerAction(
  slug: string,
  customerId: string,
  _prev: CustomerActionResult,
  formData: FormData,
): Promise<CustomerActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const existing = await prisma.customer.findFirst({
      where: { id: customerId, tenantId: tenant.id },
      select: { id: true },
    });
    if (!existing) return { error: "Cliente não encontrado." };

    const parsed = customerCreateSchema.safeParse(parseForm(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const d = parsed.data;

    const fields = await customerTemplateFields(tenant.nicheId);
    const customData = readCustomData(fields, formData);
    const cdErrors = validateCustomData(fields, customData);
    if (cdErrors.length > 0) return { error: cdErrors[0] };

    const addresses = readAddresses(formData);
    if (!addresses.ok) return { error: addresses.error };
    const tagIds = await ownedTagIds(tenant.id, readTagIds(formData));

    // Related entities (pets): diff against what's stored for this entity type.
    const entityCtx = await entityContext(slug, tenant.nicheId);
    let entityOps: Prisma.PrismaPromise<unknown>[] = [];
    if (entityCtx.canEntities) {
      const parsedEntities = readEntities(entityCtx.fields, formData);
      if (!parsedEntities.ok) return { error: parsedEntities.error };
      const stored = await prisma.customerEntity.findMany({
        where: { customerId, tenantId: tenant.id, entityType: entityCtx.entityType },
        select: { id: true },
      });
      const storedIds = new Set(stored.map((e) => e.id));
      const incomingIds = new Set(parsedEntities.entries.filter((e) => e.id && storedIds.has(e.id)).map((e) => e.id));
      const toDelete = [...storedIds].filter((id) => !incomingIds.has(id));
      entityOps = [
        ...(toDelete.length
          ? [prisma.customerEntity.deleteMany({ where: { id: { in: toDelete }, customerId, tenantId: tenant.id } })]
          : []),
        ...parsedEntities.entries.map((e) =>
          e.id && storedIds.has(e.id)
            ? prisma.customerEntity.updateMany({
                where: { id: e.id, customerId, tenantId: tenant.id },
                data: { name: e.name, status: e.status, customData: e.customData as Prisma.InputJsonValue },
              })
            : prisma.customerEntity.create({
                data: {
                  tenantId: tenant.id,
                  customerId,
                  entityType: entityCtx.entityType,
                  name: e.name,
                  status: e.status,
                  customData: e.customData as Prisma.InputJsonValue,
                },
              }),
        ),
      ];
    }

    // Update the customer and re-sync addresses + tag links atomically
    // (replace-all keeps the small child sets consistent without diffing).
    await prisma.$transaction([
      prisma.customer.updateMany({
        where: { id: customerId, tenantId: tenant.id },
        data: {
          name: d.name,
          phone: d.phone,
          phoneNormalized: onlyDigits(d.phone),
          whatsapp: d.whatsapp,
          whatsappNormalized: d.whatsapp ? onlyDigits(d.whatsapp) : null,
          email: d.email,
          personType: d.personType,
          document: d.document,
          documentNormalized: d.document ? onlyDigits(d.document) : null,
          birthDate: d.birthDate ? new Date(d.birthDate) : null,
          status: d.status,
          // `source` is intentionally omitted on update — the original origin is
          // preserved and never overwritten by a panel edit.
          consentAcceptedAt: d.consentAcceptedAt ? new Date(d.consentAcceptedAt) : null,
          consentSource: d.consentSource,
          internalNotes: d.internalNotes,
          customData: customData as Prisma.InputJsonValue,
        },
      }),
      prisma.customerAddress.deleteMany({ where: { customerId, tenantId: tenant.id } }),
      prisma.customerTagAssignment.deleteMany({ where: { customerId, tenantId: tenant.id } }),
      ...addresses.addresses.map((a) =>
        prisma.customerAddress.create({ data: { ...addressData(tenant.id, a), customerId } }),
      ),
      ...tagIds.map((tagId) =>
        prisma.customerTagAssignment.create({ data: { tenantId: tenant.id, customerId, tagId } }),
      ),
      ...entityOps,
    ]);

    revalidatePath(`/t/${slug}/customers`);
    revalidatePath(`/t/${slug}/customers/${customerId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteCustomerAction(slug: string, customerId: string): Promise<CustomerActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...ADMIN_ROLES], feature: FEATURE });
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId: tenant.id },
      select: { id: true },
    });
    if (!customer) return { error: "Cliente não encontrado." };
    // Only addresses/tags reference a customer today (both Cascade). When orders,
    // appointments, conversations etc. arrive, block here and suggest inactivating
    // instead of deleting (see <delete_rules> in the spec).
    await prisma.customer.deleteMany({ where: { id: customerId, tenantId: tenant.id } });
    revalidatePath(`/t/${slug}/customers`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function setCustomerStatusAction(
  slug: string,
  customerId: string,
  status: string,
): Promise<CustomerActionResult> {
  try {
    const parsedStatus = customerStatusSchema.safeParse(status);
    if (!parsedStatus.success) return { error: "Status inválido." };
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const res = await prisma.customer.updateMany({
      where: { id: customerId, tenantId: tenant.id },
      data: { status: parsedStatus.data },
    });
    if (res.count === 0) return { error: "Cliente não encontrado." };
    revalidatePath(`/t/${slug}/customers`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ── Tags (managed inline from the combobox) ────────────────────────────────
export async function createCustomerTagAction(slug: string, name: string): Promise<CustomerTagActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const parsed = customerTagCreateSchema.safeParse({ name });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const tagSlug = slugify(parsed.data.name);
    const clash = await prisma.customerTag.findFirst({
      where: { tenantId: tenant.id, slug: tagSlug },
      select: { id: true },
    });
    if (clash) return { error: "Tag já existe." };
    const tag = await prisma.customerTag.create({
      data: { tenantId: tenant.id, name: parsed.data.name, slug: tagSlug, color: parsed.data.color, description: parsed.data.description },
    });
    revalidatePath(`/t/${slug}/customers`);
    return {
      ok: true,
      tag: { id: tag.id, name: tag.name, slug: tag.slug, color: tag.color, status: tag.status, customerCount: 0 },
    };
  } catch (err) {
    return fail(err);
  }
}

export async function updateCustomerTagAction(slug: string, id: string, name: string): Promise<CustomerTagActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const existing = await prisma.customerTag.findFirst({
      where: { id, tenantId: tenant.id },
      select: { id: true, color: true, status: true, _count: { select: { assignments: true } } },
    });
    if (!existing) return { error: "Tag não encontrada." };
    const parsed = customerTagCreateSchema.safeParse({ name });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const tagSlug = slugify(parsed.data.name);
    const clash = await prisma.customerTag.findFirst({
      where: { tenantId: tenant.id, slug: tagSlug, NOT: { id } },
      select: { id: true },
    });
    if (clash) return { error: "Tag já existe." };
    // Tenant-scoped write (consistent with every other mutation here). updateMany
    // doesn't return the row, so build the result from `existing` + parsed input.
    await prisma.customerTag.updateMany({
      where: { id, tenantId: tenant.id },
      data: { name: parsed.data.name, slug: tagSlug },
    });
    revalidatePath(`/t/${slug}/customers`);
    return {
      ok: true,
      tag: {
        id: existing.id,
        name: parsed.data.name,
        slug: tagSlug,
        color: existing.color,
        status: existing.status,
        customerCount: existing._count.assignments,
      },
    };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteCustomerTagAction(slug: string, id: string): Promise<CustomerActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...ADMIN_ROLES], feature: FEATURE });
    const tag = await prisma.customerTag.findFirst({
      where: { id, tenantId: tenant.id },
      select: { id: true, _count: { select: { assignments: true } } },
    });
    if (!tag) return { error: "Tag não encontrada." };
    if (tag._count.assignments > 0) {
      return { error: "Esta tag possui clientes vinculados. Inative-a ou remova os vínculos antes de excluir." };
    }
    await prisma.customerTag.deleteMany({ where: { id, tenantId: tenant.id } });
    revalidatePath(`/t/${slug}/customers`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ── Related entities (pets, vehicles, dependents…) ─────────────────────────-
async function assertCustomer(tenantId: string, customerId: string): Promise<boolean> {
  const c = await prisma.customer.findFirst({ where: { id: customerId, tenantId }, select: { id: true } });
  return Boolean(c);
}

export async function createCustomerEntityAction(
  slug: string,
  customerId: string,
  _prev: CustomerActionResult,
  formData: FormData,
): Promise<CustomerActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: ENTITY_FEATURE });
    if (!(await assertCustomer(tenant.id, customerId))) return { error: "Cliente não encontrado." };

    const parsed = customerEntityCreateSchema.safeParse({
      entityType: formData.get("entityType"),
      status: formData.get("status") ?? "active",
    });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const d = parsed.data;

    const fields = await customerEntityTemplateFields(tenant.nicheId);
    const customData = readCustomData(fields, formData);
    const cdErrors = validateCustomData(fields, customData);
    if (cdErrors.length > 0) return { error: cdErrors[0] };
    const name = deriveEntityName(fields, customData);
    if (!name) return { error: "Informe o nome." };

    await prisma.customerEntity.create({
      data: {
        tenantId: tenant.id,
        customerId,
        entityType: d.entityType,
        name,
        status: d.status,
        customData: customData as Prisma.InputJsonValue,
      },
    });
    revalidatePath(`/t/${slug}/customers/${customerId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function updateCustomerEntityAction(
  slug: string,
  customerId: string,
  entityId: string,
  _prev: CustomerActionResult,
  formData: FormData,
): Promise<CustomerActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: ENTITY_FEATURE });
    const existing = await prisma.customerEntity.findFirst({
      where: { id: entityId, customerId, tenantId: tenant.id },
      select: { id: true },
    });
    if (!existing) return { error: "Registro não encontrado." };

    const parsed = customerEntityCreateSchema.safeParse({
      entityType: formData.get("entityType"),
      status: formData.get("status") ?? "active",
    });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const d = parsed.data;

    const fields = await customerEntityTemplateFields(tenant.nicheId);
    const customData = readCustomData(fields, formData);
    const cdErrors = validateCustomData(fields, customData);
    if (cdErrors.length > 0) return { error: cdErrors[0] };
    const name = deriveEntityName(fields, customData);
    if (!name) return { error: "Informe o nome." };

    await prisma.customerEntity.updateMany({
      where: { id: entityId, customerId, tenantId: tenant.id },
      data: {
        entityType: d.entityType,
        name,
        status: d.status,
        customData: customData as Prisma.InputJsonValue,
      },
    });
    revalidatePath(`/t/${slug}/customers/${customerId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function setCustomerEntityStatusAction(
  slug: string,
  customerId: string,
  entityId: string,
  status: string,
): Promise<CustomerActionResult> {
  try {
    const parsedStatus = customerEntityStatusSchema.safeParse(status);
    if (!parsedStatus.success) return { error: "Status inválido." };
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: ENTITY_FEATURE });
    const res = await prisma.customerEntity.updateMany({
      where: { id: entityId, customerId, tenantId: tenant.id },
      data: { status: parsedStatus.data },
    });
    if (res.count === 0) return { error: "Registro não encontrado." };
    revalidatePath(`/t/${slug}/customers/${customerId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteCustomerEntityAction(
  slug: string,
  customerId: string,
  entityId: string,
): Promise<CustomerActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...ADMIN_ROLES], feature: ENTITY_FEATURE });
    const res = await prisma.customerEntity.deleteMany({
      where: { id: entityId, customerId, tenantId: tenant.id },
    });
    if (res.count === 0) return { error: "Registro não encontrado." };
    revalidatePath(`/t/${slug}/customers/${customerId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
