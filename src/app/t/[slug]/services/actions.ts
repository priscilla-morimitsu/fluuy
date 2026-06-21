"use server";

import { revalidatePath } from "next/cache";

import type { Prisma } from "@/generated/prisma/client";
import type { AdminActionResult } from "@/lib/admin/action-result";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";
import { deleteImage, saveImage, UploadError } from "@/lib/upload";
import { locationCreateSchema, type LocationType } from "@/lib/validations/location";
import { professionalQuickCreateSchema } from "@/lib/validations/professional";
import {
  SERVICE_DELIVERY_MODES,
  serviceAvailabilityRuleSchema,
  serviceAvailabilityRuleStatusSchema,
  serviceCategoryCreateSchema,
  serviceCreateSchema,
  serviceStatusSchema,
  slugify,
  type ServiceDeliveryMode,
} from "@/lib/validations/service";
import { validateCustomData, type TemplateField } from "@/lib/validations/template";

import { getService, serviceTemplateFields, type ServiceDetail } from "./data";

export type ServiceActionResult = AdminActionResult;
export type ServiceDetailResult = { ok: true; service: ServiceDetail } | { error: string };
export type ServiceCategoryActionResult =
  | { ok: true; category: { id: string; name: string; slug: string; status: "active" | "inactive"; serviceCount: number } }
  | { error: string };
export type ProfessionalQuickResult = { ok: true; professional: { id: string; name: string } } | { error: string };
export type LocationQuickResult = { ok: true; location: { id: string; name: string; type: LocationType } } | { error: string };

// operator is read-only for the catalog (product spec allows operator writes;
// services were confirmed owner/manager-only). viewer never reaches here.
const WRITE_ROLES = ["tenant_owner", "tenant_manager"] as const;
const FEATURE = "service_catalog";

function fail(err: unknown): { error: string } {
  if (err instanceof ForbiddenError || err instanceof UnauthorizedError) {
    return { error: "Você não tem permissão para esta ação." };
  }
  if (err instanceof UploadError) return { error: err.message };
  console.error("[services] action error:", err);
  return { error: "Não foi possível concluir a operação." };
}

function readDeliveryModes(formData: FormData): ServiceDeliveryMode[] {
  const allowed = new Set<string>(SERVICE_DELIVERY_MODES);
  return formData
    .getAll("deliveryModes")
    .map(String)
    .filter((v): v is ServiceDeliveryMode => allowed.has(v));
}

function readCustomData(fields: TemplateField[], formData: FormData): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = formData.get(`custom_${field.key}`);
    if (field.type === "boolean") {
      data[field.key] = raw === "on" || raw === "true";
    } else if (field.type === "number") {
      if (raw !== null && raw !== "") data[field.key] = Number(raw);
    } else if (raw !== null && raw !== "") {
      data[field.key] = String(raw);
    }
  }
  return data;
}

async function uniqueSlug(tenantId: string, name: string, excludeId?: string): Promise<string> {
  const base = slugify(name) || "servico";
  let slug = base;
  for (let i = 0; i < 5; i++) {
    const clash = await prisma.service.findFirst({
      where: { tenantId, slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (!clash) return slug;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

function parseForm(formData: FormData) {
  return {
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    categoryId: formData.get("categoryId") ?? "",
    basePrice: formData.get("basePrice"),
    promotionalPrice: formData.get("promotionalPrice") ?? "",
    estimatedDurationMinutes: formData.get("estimatedDurationMinutes") ?? "",
    status: formData.get("status"),
    availableForBooking:
      formData.get("availableForBooking") === "on" || formData.get("availableForBooking") === "true",
    requiresScheduling:
      formData.get("requiresScheduling") === "on" || formData.get("requiresScheduling") === "true",
    deliveryModes: readDeliveryModes(formData),
    onlineInstructions: formData.get("onlineInstructions") ?? "",
    homeServiceNotes: formData.get("homeServiceNotes") ?? "",
    internalNotes: formData.get("internalNotes") ?? "",
  };
}

async function assertCategory(tenantId: string, categoryId: string | null): Promise<boolean> {
  if (!categoryId) return true;
  const cat = await prisma.serviceCategory.findFirst({
    where: { id: categoryId, tenantId },
    select: { id: true },
  });
  return Boolean(cat);
}

function readIds(formData: FormData, key: string): string[] {
  return [...new Set(formData.getAll(key).map(String).filter(Boolean))];
}

/** Keep only the ids that actually belong to this tenant (defends against IDOR). */
async function ownedProfessionalIds(tenantId: string, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.professional.findMany({
    where: { tenantId, id: { in: ids } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

async function ownedLocationIds(tenantId: string, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.location.findMany({
    where: { tenantId, id: { in: ids } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/**
 * Spec rule: a service offered at_location that requires scheduling must have at
 * least one physical location linked — unless it's still a draft.
 */
function missingLocation(
  modes: ServiceDeliveryMode[],
  requiresScheduling: boolean,
  status: string,
  locationCount: number,
): boolean {
  return (
    modes.includes("at_location") && requiresScheduling && status !== "draft" && locationCount === 0
  );
}

/** Full service for the edit drawer — owner/manager only (carries internalNotes). */
export async function getServiceAction(slug: string, serviceId: string): Promise<ServiceDetailResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const service = await getService(tenant.id, serviceId);
    if (!service) return { error: "Serviço não encontrado." };
    return { ok: true, service };
  } catch (err) {
    return fail(err);
  }
}

export async function createServiceAction(
  slug: string,
  _prev: ServiceActionResult,
  formData: FormData,
): Promise<ServiceActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const parsed = serviceCreateSchema.safeParse(parseForm(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const d = parsed.data;

    if (!(await assertCategory(tenant.id, d.categoryId))) return { error: "Categoria inválida." };

    const fields = await serviceTemplateFields(tenant.nicheId);
    const customData = readCustomData(fields, formData);
    const cdErrors = validateCustomData(fields, customData);
    if (cdErrors.length > 0) return { error: cdErrors[0] };

    const professionalIds = await ownedProfessionalIds(tenant.id, readIds(formData, "professionalIds"));
    const locationIds = await ownedLocationIds(tenant.id, readIds(formData, "locationIds"));
    if (missingLocation(d.deliveryModes, d.requiresScheduling, d.status, locationIds.length)) {
      return { error: "Vincule ao menos um local físico para atendimento presencial, ou salve como rascunho." };
    }

    const image = formData.get("image");
    const imageUrl =
      image instanceof File && image.size > 0 ? await saveImage(image, `services/${tenant.id}`) : null;

    await prisma.service.create({
      data: {
        tenantId: tenant.id,
        categoryId: d.categoryId,
        name: d.name,
        slug: await uniqueSlug(tenant.id, d.name),
        description: d.description,
        basePrice: d.basePrice.toFixed(2),
        promotionalPrice: d.promotionalPrice?.toFixed(2) ?? null,
        estimatedDurationMinutes: d.estimatedDurationMinutes,
        status: d.status,
        availableForBooking: d.availableForBooking,
        requiresScheduling: d.requiresScheduling,
        deliveryModes: d.deliveryModes,
        onlineInstructions: d.deliveryModes.includes("online") ? d.onlineInstructions : null,
        homeServiceNotes: d.deliveryModes.includes("at_home") ? d.homeServiceNotes : null,
        imageUrl,
        internalNotes: d.internalNotes,
        customData: customData as Prisma.InputJsonValue,
        serviceProfessionals: {
          create: professionalIds.map((professionalId) => ({ tenantId: tenant.id, professionalId })),
        },
        serviceLocations: {
          create: locationIds.map((locationId) => ({ tenantId: tenant.id, locationId })),
        },
      },
    });

    revalidatePath(`/t/${slug}/services`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function updateServiceAction(
  slug: string,
  serviceId: string,
  _prev: ServiceActionResult,
  formData: FormData,
): Promise<ServiceActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const existing = await prisma.service.findFirst({
      where: { id: serviceId, tenantId: tenant.id },
      select: { id: true, name: true, slug: true, imageUrl: true },
    });
    if (!existing) return { error: "Serviço não encontrado." };

    const parsed = serviceCreateSchema.safeParse(parseForm(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const d = parsed.data;

    if (!(await assertCategory(tenant.id, d.categoryId))) return { error: "Categoria inválida." };

    const fields = await serviceTemplateFields(tenant.nicheId);
    const customData = readCustomData(fields, formData);
    const cdErrors = validateCustomData(fields, customData);
    if (cdErrors.length > 0) return { error: cdErrors[0] };

    const professionalIds = await ownedProfessionalIds(tenant.id, readIds(formData, "professionalIds"));
    const locationIds = await ownedLocationIds(tenant.id, readIds(formData, "locationIds"));
    if (missingLocation(d.deliveryModes, d.requiresScheduling, d.status, locationIds.length)) {
      return { error: "Vincule ao menos um local físico para atendimento presencial, ou salve como rascunho." };
    }

    let imageUrl: string | null | undefined;
    const image = formData.get("image");
    if (image instanceof File && image.size > 0) {
      imageUrl = await saveImage(image, `services/${tenant.id}`);
      await deleteImage(existing.imageUrl);
    } else if (formData.get("removeImage") === "true") {
      imageUrl = null;
      await deleteImage(existing.imageUrl);
    }

    // Update the service and re-sync its links atomically (replace-all keeps the
    // small join sets consistent without diffing).
    await prisma.$transaction([
      prisma.service.updateMany({
        where: { id: serviceId, tenantId: tenant.id },
        data: {
          categoryId: d.categoryId,
          name: d.name,
          slug: existing.name === d.name ? existing.slug : await uniqueSlug(tenant.id, d.name, serviceId),
          description: d.description,
          basePrice: d.basePrice.toFixed(2),
          promotionalPrice: d.promotionalPrice?.toFixed(2) ?? null,
          estimatedDurationMinutes: d.estimatedDurationMinutes,
          status: d.status,
          availableForBooking: d.availableForBooking,
          requiresScheduling: d.requiresScheduling,
          deliveryModes: d.deliveryModes,
          onlineInstructions: d.deliveryModes.includes("online") ? d.onlineInstructions : null,
          homeServiceNotes: d.deliveryModes.includes("at_home") ? d.homeServiceNotes : null,
          ...(imageUrl !== undefined ? { imageUrl } : {}),
          internalNotes: d.internalNotes,
          customData: customData as Prisma.InputJsonValue,
        },
      }),
      prisma.serviceProfessional.deleteMany({ where: { serviceId, tenantId: tenant.id } }),
      prisma.serviceLocation.deleteMany({ where: { serviceId, tenantId: tenant.id } }),
      ...professionalIds.map((professionalId) =>
        prisma.serviceProfessional.create({ data: { tenantId: tenant.id, serviceId, professionalId } }),
      ),
      ...locationIds.map((locationId) =>
        prisma.serviceLocation.create({ data: { tenantId: tenant.id, serviceId, locationId } }),
      ),
    ]);

    revalidatePath(`/t/${slug}/services`);
    revalidatePath(`/t/${slug}/services/${serviceId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteServiceAction(slug: string, serviceId: string): Promise<ServiceActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const service = await prisma.service.findFirst({
      where: { id: serviceId, tenantId: tenant.id },
      select: { id: true, imageUrl: true },
    });
    if (!service) return { error: "Serviço não encontrado." };
    // No models reference services yet (professionals/locations/availability and
    // appointments arrive in later phases). When they exist, block here and
    // suggest inactivating instead of deleting.
    await prisma.service.deleteMany({ where: { id: serviceId, tenantId: tenant.id } });
    await deleteImage(service.imageUrl);
    revalidatePath(`/t/${slug}/services`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function setServiceStatusAction(
  slug: string,
  serviceId: string,
  status: string,
): Promise<ServiceActionResult> {
  try {
    const parsedStatus = serviceStatusSchema.safeParse(status);
    if (!parsedStatus.success) return { error: "Status inválido." };
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const res = await prisma.service.updateMany({
      where: { id: serviceId, tenantId: tenant.id },
      data: { status: parsedStatus.data },
    });
    if (res.count === 0) return { error: "Serviço não encontrado." };
    revalidatePath(`/t/${slug}/services`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function setServiceAvailabilityAction(
  slug: string,
  serviceId: string,
  available: boolean,
): Promise<ServiceActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const res = await prisma.service.updateMany({
      where: { id: serviceId, tenantId: tenant.id },
      data: { availableForBooking: Boolean(available) },
    });
    if (res.count === 0) return { error: "Serviço não encontrado." };
    revalidatePath(`/t/${slug}/services`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function createServiceCategoryAction(
  slug: string,
  name: string,
): Promise<ServiceCategoryActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const parsed = serviceCategoryCreateSchema.safeParse({ name });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const catSlug = slugify(parsed.data.name);
    const clash = await prisma.serviceCategory.findFirst({
      where: { tenantId: tenant.id, slug: catSlug },
      select: { id: true },
    });
    if (clash) return { error: "Categoria já existe." };
    const cat = await prisma.serviceCategory.create({
      data: { tenantId: tenant.id, name: parsed.data.name, slug: catSlug, description: parsed.data.description },
    });
    revalidatePath(`/t/${slug}/services`);
    return { ok: true, category: { id: cat.id, name: cat.name, slug: cat.slug, status: cat.status, serviceCount: 0 } };
  } catch (err) {
    return fail(err);
  }
}

export async function updateServiceCategoryAction(
  slug: string,
  id: string,
  name: string,
): Promise<ServiceCategoryActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const existing = await prisma.serviceCategory.findFirst({
      where: { id, tenantId: tenant.id },
      select: { id: true, _count: { select: { services: true } } },
    });
    if (!existing) return { error: "Categoria não encontrada." };
    const parsed = serviceCategoryCreateSchema.safeParse({ name });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const catSlug = slugify(parsed.data.name);
    const clash = await prisma.serviceCategory.findFirst({
      where: { tenantId: tenant.id, slug: catSlug, NOT: { id } },
      select: { id: true },
    });
    if (clash) return { error: "Categoria já existe." };
    const cat = await prisma.serviceCategory.update({
      where: { id },
      data: { name: parsed.data.name, slug: catSlug },
    });
    revalidatePath(`/t/${slug}/services`);
    return {
      ok: true,
      category: { id: cat.id, name: cat.name, slug: cat.slug, status: cat.status, serviceCount: existing._count.services },
    };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteServiceCategoryAction(
  slug: string,
  id: string,
): Promise<ServiceActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const cat = await prisma.serviceCategory.findFirst({
      where: { id, tenantId: tenant.id },
      select: { id: true, _count: { select: { services: true } } },
    });
    if (!cat) return { error: "Categoria não encontrada." };
    if (cat._count.services > 0) {
      return { error: "Esta categoria possui serviços vinculados. Inative-a ou mova os serviços antes de excluir." };
    }
    await prisma.serviceCategory.delete({ where: { id } });
    revalidatePath(`/t/${slug}/services`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// Lightweight inline creation from the service form. Full Professional/Location
// management screens are a separate follow-up; here we only need a linkable row.
export async function createProfessionalAction(slug: string, name: string): Promise<ProfessionalQuickResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const parsed = professionalQuickCreateSchema.safeParse({ name });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const prof = await prisma.professional.create({
      data: { tenantId: tenant.id, name: parsed.data.name },
      select: { id: true, name: true },
    });
    revalidatePath(`/t/${slug}/services`);
    return { ok: true, professional: prof };
  } catch (err) {
    return fail(err);
  }
}

export async function createLocationAction(
  slug: string,
  name: string,
  type: string,
): Promise<LocationQuickResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const parsed = locationCreateSchema.safeParse({ name, type });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const loc = await prisma.location.create({
      data: { tenantId: tenant.id, name: parsed.data.name, type: parsed.data.type },
      select: { id: true, name: true, type: true },
    });
    revalidatePath(`/t/${slug}/services`);
    return { ok: true, location: loc };
  } catch (err) {
    return fail(err);
  }
}

// ── Availability rules (decoupled) ─────────────────────────────────────────
function parseRuleForm(formData: FormData) {
  return {
    deliveryMode: formData.get("deliveryMode"),
    professionalId: formData.get("professionalId") ?? "",
    locationId: formData.get("locationId") ?? "",
    weekday: formData.get("weekday"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    slotDurationMinutes: formData.get("slotDurationMinutes") ?? "",
    bufferBeforeMinutes: formData.get("bufferBeforeMinutes") ?? "",
    bufferAfterMinutes: formData.get("bufferAfterMinutes") ?? "",
    status: formData.get("status") ?? "active",
  };
}

export async function upsertServiceAvailabilityRuleAction(
  slug: string,
  serviceId: string,
  ruleId: string | null,
  _prev: ServiceActionResult,
  formData: FormData,
): Promise<ServiceActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const service = await prisma.service.findFirst({
      where: { id: serviceId, tenantId: tenant.id },
      select: { id: true, deliveryModes: true },
    });
    if (!service) return { error: "Serviço não encontrado." };

    const parsed = serviceAvailabilityRuleSchema.safeParse(parseRuleForm(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const d = parsed.data;

    if (!service.deliveryModes.includes(d.deliveryMode)) {
      return { error: "Modalidade não habilitada para este serviço." };
    }
    if (d.professionalId && (await ownedProfessionalIds(tenant.id, [d.professionalId])).length === 0) {
      return { error: "Profissional inválido." };
    }
    if (d.locationId && (await ownedLocationIds(tenant.id, [d.locationId])).length === 0) {
      return { error: "Local inválido." };
    }

    const data = {
      professionalId: d.professionalId,
      locationId: d.locationId,
      deliveryMode: d.deliveryMode,
      weekday: d.weekday,
      startTime: d.startTime,
      endTime: d.endTime,
      slotDurationMinutes: d.slotDurationMinutes,
      bufferBeforeMinutes: d.bufferBeforeMinutes,
      bufferAfterMinutes: d.bufferAfterMinutes,
      status: d.status,
    };

    if (ruleId) {
      const res = await prisma.serviceAvailabilityRule.updateMany({
        where: { id: ruleId, tenantId: tenant.id, serviceId },
        data,
      });
      if (res.count === 0) return { error: "Regra não encontrada." };
    } else {
      await prisma.serviceAvailabilityRule.create({ data: { tenantId: tenant.id, serviceId, ...data } });
    }

    revalidatePath(`/t/${slug}/services/${serviceId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteServiceAvailabilityRuleAction(
  slug: string,
  serviceId: string,
  ruleId: string,
): Promise<ServiceActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const res = await prisma.serviceAvailabilityRule.deleteMany({
      where: { id: ruleId, tenantId: tenant.id, serviceId },
    });
    if (res.count === 0) return { error: "Regra não encontrada." };
    revalidatePath(`/t/${slug}/services/${serviceId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function setServiceAvailabilityRuleStatusAction(
  slug: string,
  serviceId: string,
  ruleId: string,
  status: string,
): Promise<ServiceActionResult> {
  try {
    const parsedStatus = serviceAvailabilityRuleStatusSchema.safeParse(status);
    if (!parsedStatus.success) return { error: "Status inválido." };
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const res = await prisma.serviceAvailabilityRule.updateMany({
      where: { id: ruleId, tenantId: tenant.id, serviceId },
      data: { status: parsedStatus.data },
    });
    if (res.count === 0) return { error: "Regra não encontrada." };
    revalidatePath(`/t/${slug}/services/${serviceId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
