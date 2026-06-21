"use server";

import { revalidatePath } from "next/cache";

import { Prisma } from "@/generated/prisma/client";
import type { AdminActionResult } from "@/lib/admin/action-result";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";
import { deleteImage, saveImage, UploadError } from "@/lib/upload";
import {
  offerPlanCategoryCreateSchema,
  offerPlanCreateSchema,
  offerPlanProductItemSchema,
  offerPlanServiceItemSchema,
  offerPlanStatusSchema,
  slugify,
  type OfferPlanProductItemInput,
  type OfferPlanServiceItemInput,
} from "@/lib/validations/offer-plan";
import { validateCustomData, type TemplateField } from "@/lib/validations/template";

import { getOfferPlan, offerPlanTemplateFields, type OfferPlanDetail } from "./data";

export type OfferPlanActionResult = AdminActionResult;
export type OfferPlanDetailResult = { ok: true; offerPlan: OfferPlanDetail } | { error: string };
export type OfferPlanCategoryActionResult =
  | { ok: true; category: { id: string; name: string; slug: string; status: "active" | "inactive"; planCount: number } }
  | { error: string };

// Commercial catalog — owner/manager only (operator is read-only, like the
// services catalog). viewer never reaches a write path.
const WRITE_ROLES = ["tenant_owner", "tenant_manager"] as const;
const FEATURE = "plans_catalog";

function fail(err: unknown): { error: string } {
  if (err instanceof ForbiddenError || err instanceof UnauthorizedError) {
    return { error: "Você não tem permissão para esta ação." };
  }
  if (err instanceof UploadError) return { error: err.message };
  console.error("[offer-plans] action error:", err);
  return { error: "Não foi possível concluir a operação." };
}

function parseForm(formData: FormData) {
  const bool = (k: string) => formData.get(k) === "on" || formData.get(k) === "true";
  return {
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    categoryId: formData.get("categoryId") ?? "",
    type: formData.get("type"),
    price: formData.get("price"),
    promotionalPrice: formData.get("promotionalPrice") ?? "",
    billingCycle: formData.get("billingCycle") ?? "",
    autoRenew: bool("autoRenew"),
    expiresAfterDays: formData.get("expiresAfterDays") ?? "",
    usageLimit: formData.get("usageLimit") ?? "",
    allowScheduling: bool("allowScheduling"),
    status: formData.get("status"),
    availableForSale: bool("availableForSale"),
    internalNotes: formData.get("internalNotes") ?? "",
  };
}

function readCustomData(fields: TemplateField[], formData: FormData): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = formData.get(`custom_${field.key}`);
    if (field.type === "boolean") data[field.key] = raw === "on" || raw === "true";
    else if (field.type === "number") {
      if (raw !== null && raw !== "") data[field.key] = Number(raw);
    } else if (raw !== null && raw !== "") data[field.key] = String(raw);
  }
  return data;
}

function readServiceItems(
  formData: FormData,
): { ok: true; items: OfferPlanServiceItemInput[] } | { ok: false; error: string } {
  const count = Number(formData.get("svcCount") ?? 0);
  const items: OfferPlanServiceItemInput[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < count; i++) {
    const g = (k: string) => String(formData.get(`svc${i}_${k}`) ?? "");
    const serviceId = g("serviceId");
    if (!serviceId) continue;
    if (seen.has(serviceId)) continue;
    seen.add(serviceId);
    const parsed = offerPlanServiceItemSchema.safeParse({
      serviceId,
      quantity: g("quantity"),
      usageLimit: g("usageLimit"),
      durationOverrideMinutes: g("durationOverrideMinutes"),
      priceOverride: g("priceOverride"),
      included: g("included") === "on" || g("included") === "true",
      sortOrder: i,
    });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Serviço inválido." };
    items.push(parsed.data);
  }
  return { ok: true, items };
}

function readProductItems(
  formData: FormData,
): { ok: true; items: OfferPlanProductItemInput[] } | { ok: false; error: string } {
  const count = Number(formData.get("prodCount") ?? 0);
  const items: OfferPlanProductItemInput[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < count; i++) {
    const g = (k: string) => String(formData.get(`prod${i}_${k}`) ?? "");
    const productId = g("productId");
    if (!productId) continue;
    if (seen.has(productId)) continue;
    seen.add(productId);
    const parsed = offerPlanProductItemSchema.safeParse({
      productId,
      quantity: g("quantity"),
      usageLimit: g("usageLimit"),
      priceOverride: g("priceOverride"),
      included: g("included") === "on" || g("included") === "true",
      sortOrder: i,
    });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Produto inválido." };
    items.push(parsed.data);
  }
  return { ok: true, items };
}

async function assertCategory(tenantId: string, categoryId: string | null): Promise<boolean> {
  if (!categoryId) return true;
  const c = await prisma.offerPlanCategory.findFirst({ where: { id: categoryId, tenantId }, select: { id: true } });
  return Boolean(c);
}

async function ownedServiceIds(tenantId: string, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await prisma.service.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true } });
  return new Set(rows.map((r) => r.id));
}

async function ownedProductIds(tenantId: string, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await prisma.product.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true } });
  return new Set(rows.map((r) => r.id));
}

async function uniqueSlug(tenantId: string, name: string, excludeId?: string): Promise<string> {
  const base = slugify(name) || "plano";
  let slug = base;
  for (let i = 0; i < 5; i++) {
    const clash = await prisma.offerPlan.findFirst({
      where: { tenantId, slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (!clash) return slug;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

const dec = (v: number | null) => (v == null ? null : v.toFixed(2));

function serviceItemData(tenantId: string, it: OfferPlanServiceItemInput) {
  return {
    tenantId,
    serviceId: it.serviceId,
    quantity: it.quantity,
    usageLimit: it.usageLimit,
    durationOverrideMinutes: it.durationOverrideMinutes,
    priceOverride: dec(it.priceOverride),
    included: it.included,
    sortOrder: it.sortOrder,
  };
}

function productItemData(tenantId: string, it: OfferPlanProductItemInput) {
  return {
    tenantId,
    productId: it.productId,
    quantity: it.quantity,
    usageLimit: it.usageLimit,
    priceOverride: dec(it.priceOverride),
    included: it.included,
    sortOrder: it.sortOrder,
  };
}

/** Full offer plan for the edit drawer — owner/manager only (internalNotes). */
export async function getOfferPlanAction(slug: string, offerPlanId: string): Promise<OfferPlanDetailResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const offerPlan = await getOfferPlan(tenant.id, offerPlanId);
    if (!offerPlan) return { error: "Plano não encontrado." };
    return { ok: true, offerPlan };
  } catch (err) {
    return fail(err);
  }
}

/** Shared validate-and-shape step for create/update. */
async function buildWriteData(
  slug: string,
  formData: FormData,
): Promise<
  | { ok: false; error: string }
  | {
      ok: true;
      tenantId: string;
      nicheId: string;
      data: ReturnType<typeof offerPlanCreateSchema.parse>;
      customData: Record<string, unknown>;
      serviceItems: OfferPlanServiceItemInput[];
      productItems: OfferPlanProductItemInput[];
    }
> {
  const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
  const parsed = offerPlanCreateSchema.safeParse(parseForm(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;

  if (!(await assertCategory(tenant.id, d.categoryId))) return { ok: false, error: "Categoria inválida." };

  const fields = await offerPlanTemplateFields(tenant.nicheId);
  const customData = readCustomData(fields, formData);
  const cdErrors = validateCustomData(fields, customData);
  if (cdErrors.length > 0) return { ok: false, error: cdErrors[0] };

  const svc = readServiceItems(formData);
  if (!svc.ok) return svc;
  const prod = readProductItems(formData);
  if (!prod.ok) return prod;

  const ownedSvc = await ownedServiceIds(tenant.id, svc.items.map((i) => i.serviceId));
  if (svc.items.some((i) => !ownedSvc.has(i.serviceId))) return { ok: false, error: "Serviço inválido." };
  const ownedProd = await ownedProductIds(tenant.id, prod.items.map((i) => i.productId));
  if (prod.items.some((i) => !ownedProd.has(i.productId))) return { ok: false, error: "Produto inválido." };

  if (d.status !== "draft" && svc.items.length + prod.items.length === 0) {
    return { ok: false, error: "Adicione pelo menos um serviço ou produto." };
  }

  return {
    ok: true,
    tenantId: tenant.id,
    nicheId: tenant.nicheId,
    data: d,
    customData,
    serviceItems: svc.items,
    productItems: prod.items,
  };
}

export async function createOfferPlanAction(
  slug: string,
  _prev: OfferPlanActionResult,
  formData: FormData,
): Promise<OfferPlanActionResult> {
  try {
    const built = await buildWriteData(slug, formData);
    if (!built.ok) return { error: built.error };
    const { tenantId, data: d, customData, serviceItems, productItems } = built;

    const image = formData.get("image");
    const imageUrl =
      image instanceof File && image.size > 0 ? await saveImage(image, `offer-plans/${tenantId}`) : null;

    await prisma.offerPlan.create({
      data: {
        tenantId,
        categoryId: d.categoryId,
        name: d.name,
        slug: await uniqueSlug(tenantId, d.name),
        description: d.description,
        type: d.type,
        price: d.price.toFixed(2),
        promotionalPrice: dec(d.promotionalPrice),
        billingCycle: d.billingCycle,
        autoRenew: d.type === "recurring_plan" ? d.autoRenew : false,
        expiresAfterDays: d.expiresAfterDays,
        usageLimit: d.usageLimit,
        allowScheduling: d.allowScheduling,
        status: d.status,
        availableForSale: d.availableForSale,
        imageUrl,
        internalNotes: d.internalNotes,
        customData: customData as Prisma.InputJsonValue,
        serviceItems: { create: serviceItems.map((i) => serviceItemData(tenantId, i)) },
        productItems: { create: productItems.map((i) => productItemData(tenantId, i)) },
      },
    });

    revalidatePath(`/t/${slug}/plans`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function updateOfferPlanAction(
  slug: string,
  offerPlanId: string,
  _prev: OfferPlanActionResult,
  formData: FormData,
): Promise<OfferPlanActionResult> {
  try {
    const built = await buildWriteData(slug, formData);
    if (!built.ok) return { error: built.error };
    const { tenantId, data: d, customData, serviceItems, productItems } = built;

    const existing = await prisma.offerPlan.findFirst({
      where: { id: offerPlanId, tenantId },
      select: { id: true, name: true, slug: true, imageUrl: true },
    });
    if (!existing) return { error: "Plano não encontrado." };

    let imageUrl: string | null | undefined;
    const image = formData.get("image");
    if (image instanceof File && image.size > 0) {
      imageUrl = await saveImage(image, `offer-plans/${tenantId}`);
      await deleteImage(existing.imageUrl);
    } else if (formData.get("removeImage") === "true") {
      imageUrl = null;
      await deleteImage(existing.imageUrl);
    }

    await prisma.$transaction([
      prisma.offerPlan.updateMany({
        where: { id: offerPlanId, tenantId },
        data: {
          categoryId: d.categoryId,
          name: d.name,
          slug: existing.name === d.name ? existing.slug : await uniqueSlug(tenantId, d.name, offerPlanId),
          description: d.description,
          type: d.type,
          price: d.price.toFixed(2),
          promotionalPrice: dec(d.promotionalPrice),
          billingCycle: d.billingCycle,
          autoRenew: d.type === "recurring_plan" ? d.autoRenew : false,
          expiresAfterDays: d.expiresAfterDays,
          usageLimit: d.usageLimit,
          allowScheduling: d.allowScheduling,
          status: d.status,
          availableForSale: d.availableForSale,
          ...(imageUrl !== undefined ? { imageUrl } : {}),
          internalNotes: d.internalNotes,
          customData: customData as Prisma.InputJsonValue,
        },
      }),
      prisma.offerPlanServiceItem.deleteMany({ where: { offerPlanId, tenantId } }),
      prisma.offerPlanProductItem.deleteMany({ where: { offerPlanId, tenantId } }),
      ...serviceItems.map((i) =>
        prisma.offerPlanServiceItem.create({ data: { ...serviceItemData(tenantId, i), offerPlanId } }),
      ),
      ...productItems.map((i) =>
        prisma.offerPlanProductItem.create({ data: { ...productItemData(tenantId, i), offerPlanId } }),
      ),
    ]);

    revalidatePath(`/t/${slug}/plans`);
    revalidatePath(`/t/${slug}/plans/${offerPlanId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteOfferPlanAction(slug: string, offerPlanId: string): Promise<OfferPlanActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const plan = await prisma.offerPlan.findFirst({
      where: { id: offerPlanId, tenantId: tenant.id },
      select: { id: true, imageUrl: true },
    });
    if (!plan) return { error: "Plano não encontrado." };
    // Only items reference a plan today (Cascade). When sales/subscriptions exist,
    // block here and suggest inactivating instead of deleting.
    await prisma.offerPlan.deleteMany({ where: { id: offerPlanId, tenantId: tenant.id } });
    await deleteImage(plan.imageUrl);
    revalidatePath(`/t/${slug}/plans`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function setOfferPlanStatusAction(
  slug: string,
  offerPlanId: string,
  status: string,
): Promise<OfferPlanActionResult> {
  try {
    const parsedStatus = offerPlanStatusSchema.safeParse(status);
    if (!parsedStatus.success) return { error: "Status inválido." };
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const res = await prisma.offerPlan.updateMany({
      where: { id: offerPlanId, tenantId: tenant.id },
      data: { status: parsedStatus.data },
    });
    if (res.count === 0) return { error: "Plano não encontrado." };
    revalidatePath(`/t/${slug}/plans`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function setOfferPlanAvailabilityAction(
  slug: string,
  offerPlanId: string,
  available: boolean,
): Promise<OfferPlanActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const res = await prisma.offerPlan.updateMany({
      where: { id: offerPlanId, tenantId: tenant.id },
      data: { availableForSale: Boolean(available) },
    });
    if (res.count === 0) return { error: "Plano não encontrado." };
    revalidatePath(`/t/${slug}/plans`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ── Categories (managed inline from the combobox) ──────────────────────────
export async function createOfferPlanCategoryAction(slug: string, name: string): Promise<OfferPlanCategoryActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const parsed = offerPlanCategoryCreateSchema.safeParse({ name });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const catSlug = slugify(parsed.data.name);
    const clash = await prisma.offerPlanCategory.findFirst({
      where: { tenantId: tenant.id, slug: catSlug },
      select: { id: true },
    });
    if (clash) return { error: "Categoria já existe." };
    const cat = await prisma.offerPlanCategory.create({
      data: { tenantId: tenant.id, name: parsed.data.name, slug: catSlug, description: parsed.data.description },
    });
    revalidatePath(`/t/${slug}/plans`);
    return { ok: true, category: { id: cat.id, name: cat.name, slug: cat.slug, status: cat.status, planCount: 0 } };
  } catch (err) {
    return fail(err);
  }
}

export async function updateOfferPlanCategoryAction(
  slug: string,
  id: string,
  name: string,
): Promise<OfferPlanCategoryActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const existing = await prisma.offerPlanCategory.findFirst({
      where: { id, tenantId: tenant.id },
      select: { id: true, _count: { select: { offerPlans: true } } },
    });
    if (!existing) return { error: "Categoria não encontrada." };
    const parsed = offerPlanCategoryCreateSchema.safeParse({ name });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const catSlug = slugify(parsed.data.name);
    const clash = await prisma.offerPlanCategory.findFirst({
      where: { tenantId: tenant.id, slug: catSlug, NOT: { id } },
      select: { id: true },
    });
    if (clash) return { error: "Categoria já existe." };
    const cat = await prisma.offerPlanCategory.update({ where: { id }, data: { name: parsed.data.name, slug: catSlug } });
    revalidatePath(`/t/${slug}/plans`);
    return {
      ok: true,
      category: { id: cat.id, name: cat.name, slug: cat.slug, status: cat.status, planCount: existing._count.offerPlans },
    };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteOfferPlanCategoryAction(slug: string, id: string): Promise<OfferPlanActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const cat = await prisma.offerPlanCategory.findFirst({
      where: { id, tenantId: tenant.id },
      select: { id: true, _count: { select: { offerPlans: true } } },
    });
    if (!cat) return { error: "Categoria não encontrada." };
    if (cat._count.offerPlans > 0) {
      return { error: "Esta categoria possui planos vinculados. Inative-a ou mova os planos antes de excluir." };
    }
    await prisma.offerPlanCategory.delete({ where: { id } });
    revalidatePath(`/t/${slug}/plans`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
