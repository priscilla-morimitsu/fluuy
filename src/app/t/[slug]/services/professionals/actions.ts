"use server";

import { revalidatePath } from "next/cache";

import type { Prisma } from "@/generated/prisma/client";
import type { AdminActionResult } from "@/lib/admin/action-result";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";
import {
  professionalCreateSchema,
  professionalSpecialtyCreateSchema,
  professionalStatusSchema,
} from "@/lib/validations/professional";
import { slugify } from "@/lib/validations/service";
import { validateCustomData, type TemplateField } from "@/lib/validations/template";

import { getProfessional, professionalTemplateFields, type ProfessionalDetail } from "./data";

export type ProfessionalActionResult = AdminActionResult;
export type ProfessionalDetailResult = { ok: true; professional: ProfessionalDetail } | { error: string };
export type SpecialtyActionResult =
  | { ok: true; specialty: { id: string; name: string; slug: string; status: "active" | "inactive"; professionalCount: number } }
  | { error: string };

const WRITE_ROLES = ["tenant_owner", "tenant_manager"] as const;
const FEATURE = "service_catalog"; // professional_management não existe ainda; fallback previsto na spec

function fail(err: unknown): { error: string } {
  if (err instanceof ForbiddenError || err instanceof UnauthorizedError) {
    return { error: "Você não tem permissão para esta ação." };
  }
  console.error("[professionals] action error:", err);
  return { error: "Não foi possível concluir a operação." };
}

function readIds(formData: FormData, key: string): string[] {
  return [...new Set(formData.getAll(key).map(String).filter(Boolean))];
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

function parseForm(formData: FormData) {
  return {
    name: formData.get("name"),
    title: formData.get("title"),
    bio: formData.get("bio") ?? "",
    avatarUrl: formData.get("avatarUrl") ?? "",
    phone: formData.get("phone") ?? "",
    whatsapp: formData.get("whatsapp") ?? "",
    email: formData.get("email") ?? "",
    status: formData.get("status"),
    publicProfile: formData.get("publicProfile") === "on" || formData.get("publicProfile") === "true",
    internalNotes: formData.get("internalNotes") ?? "",
  };
}

async function ownedIds<T extends { id: string }>(
  rows: Promise<T[]>,
): Promise<string[]> {
  return (await rows).map((r) => r.id);
}

async function validUserId(tenantId: string, userId: string | null): Promise<boolean> {
  if (!userId) return true;
  const membership = await prisma.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    select: { userId: true },
  });
  return Boolean(membership);
}

async function resolveRelations(tenantId: string, formData: FormData) {
  const specialtyIds = await ownedIds(
    prisma.professionalSpecialty.findMany({
      where: { tenantId, id: { in: readIds(formData, "specialtyIds") } },
      select: { id: true },
    }),
  );
  const serviceIds = await ownedIds(
    prisma.service.findMany({
      where: { tenantId, id: { in: readIds(formData, "serviceIds") } },
      select: { id: true },
    }),
  );
  const locationIds = await ownedIds(
    prisma.location.findMany({
      where: { tenantId, id: { in: readIds(formData, "locationIds") } },
      select: { id: true },
    }),
  );
  return { specialtyIds, serviceIds, locationIds };
}

export async function getProfessionalAction(slug: string, id: string): Promise<ProfessionalDetailResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const professional = await getProfessional(tenant.id, id);
    if (!professional) return { error: "Profissional não encontrado." };
    return { ok: true, professional };
  } catch (err) {
    return fail(err);
  }
}

export async function createProfessionalAction(
  slug: string,
  _prev: ProfessionalActionResult,
  formData: FormData,
): Promise<ProfessionalActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const parsed = professionalCreateSchema.safeParse(parseForm(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const d = parsed.data;

    const userIdRaw = String(formData.get("userId") ?? "") || null;
    if (!(await validUserId(tenant.id, userIdRaw))) return { error: "Usuário não pertence a este tenant." };

    const fields = await professionalTemplateFields(tenant.nicheId);
    const customData = readCustomData(fields, formData);
    const cdErrors = validateCustomData(fields, customData);
    if (cdErrors.length > 0) return { error: cdErrors[0] };

    const { specialtyIds, serviceIds, locationIds } = await resolveRelations(tenant.id, formData);

    await prisma.professional.create({
      data: {
        tenantId: tenant.id,
        userId: userIdRaw,
        name: d.name,
        title: d.title,
        bio: d.bio,
        avatarUrl: d.avatarUrl,
        phone: d.phone,
        whatsapp: d.whatsapp,
        email: d.email,
        status: d.status,
        publicProfile: d.publicProfile,
        internalNotes: d.internalNotes,
        customData: customData as Prisma.InputJsonValue,
        specialtyAssignments: { create: specialtyIds.map((specialtyId) => ({ tenantId: tenant.id, specialtyId })) },
        professionalLocations: { create: locationIds.map((locationId) => ({ tenantId: tenant.id, locationId })) },
        serviceProfessionals: { create: serviceIds.map((serviceId) => ({ tenantId: tenant.id, serviceId })) },
      },
    });

    revalidatePath(`/t/${slug}/services/professionals`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function updateProfessionalAction(
  slug: string,
  professionalId: string,
  _prev: ProfessionalActionResult,
  formData: FormData,
): Promise<ProfessionalActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const existing = await prisma.professional.findFirst({
      where: { id: professionalId, tenantId: tenant.id },
      select: { id: true },
    });
    if (!existing) return { error: "Profissional não encontrado." };

    const parsed = professionalCreateSchema.safeParse(parseForm(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const d = parsed.data;

    const userIdRaw = String(formData.get("userId") ?? "") || null;
    if (!(await validUserId(tenant.id, userIdRaw))) return { error: "Usuário não pertence a este tenant." };

    const fields = await professionalTemplateFields(tenant.nicheId);
    const customData = readCustomData(fields, formData);
    const cdErrors = validateCustomData(fields, customData);
    if (cdErrors.length > 0) return { error: cdErrors[0] };

    const { specialtyIds, serviceIds, locationIds } = await resolveRelations(tenant.id, formData);

    // Service links are synced by diff (not replace-all) to preserve the
    // ServiceProfessional override fields set from the service side.
    const existingServiceIds = (
      await prisma.serviceProfessional.findMany({
        where: { professionalId, tenantId: tenant.id },
        select: { serviceId: true },
      })
    ).map((s) => s.serviceId);
    const servicesToAdd = serviceIds.filter((id) => !existingServiceIds.includes(id));
    const servicesToRemove = existingServiceIds.filter((id) => !serviceIds.includes(id));

    await prisma.$transaction([
      prisma.professional.updateMany({
        where: { id: professionalId, tenantId: tenant.id },
        data: {
          userId: userIdRaw,
          name: d.name,
          title: d.title,
          bio: d.bio,
          avatarUrl: d.avatarUrl,
          phone: d.phone,
          whatsapp: d.whatsapp,
          email: d.email,
          status: d.status,
          publicProfile: d.publicProfile,
          internalNotes: d.internalNotes,
          customData: customData as Prisma.InputJsonValue,
        },
      }),
      prisma.professionalSpecialtyAssignment.deleteMany({ where: { professionalId, tenantId: tenant.id } }),
      ...specialtyIds.map((specialtyId) =>
        prisma.professionalSpecialtyAssignment.create({ data: { tenantId: tenant.id, professionalId, specialtyId } }),
      ),
      prisma.professionalLocation.deleteMany({ where: { professionalId, tenantId: tenant.id } }),
      ...locationIds.map((locationId) =>
        prisma.professionalLocation.create({ data: { tenantId: tenant.id, professionalId, locationId } }),
      ),
      ...(servicesToRemove.length
        ? [
            prisma.serviceProfessional.deleteMany({
              where: { professionalId, tenantId: tenant.id, serviceId: { in: servicesToRemove } },
            }),
          ]
        : []),
      ...servicesToAdd.map((serviceId) =>
        prisma.serviceProfessional.create({ data: { tenantId: tenant.id, professionalId, serviceId } }),
      ),
    ]);

    revalidatePath(`/t/${slug}/services/professionals`);
    revalidatePath(`/t/${slug}/services/professionals/${professionalId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteProfessionalAction(slug: string, professionalId: string): Promise<ProfessionalActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const professional = await prisma.professional.findFirst({
      where: { id: professionalId, tenantId: tenant.id },
      select: {
        id: true,
        _count: { select: { serviceProfessionals: true, availabilityRules: true } },
      },
    });
    if (!professional) return { error: "Profissional não encontrado." };
    if (professional._count.serviceProfessionals > 0 || professional._count.availabilityRules > 0) {
      return {
        error: "Este profissional possui registros vinculados e não pode ser excluído. Você pode inativá-lo.",
      };
    }
    // Specialties/locations are this professional's own associations (cascade).
    await prisma.professional.deleteMany({ where: { id: professionalId, tenantId: tenant.id } });
    revalidatePath(`/t/${slug}/services/professionals`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function setProfessionalStatusAction(
  slug: string,
  professionalId: string,
  status: string,
): Promise<ProfessionalActionResult> {
  try {
    const parsedStatus = professionalStatusSchema.safeParse(status);
    if (!parsedStatus.success) return { error: "Status inválido." };
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const res = await prisma.professional.updateMany({
      where: { id: professionalId, tenantId: tenant.id },
      data: { status: parsedStatus.data },
    });
    if (res.count === 0) return { error: "Profissional não encontrado." };
    revalidatePath(`/t/${slug}/services/professionals`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function setProfessionalPublicProfileAction(
  slug: string,
  professionalId: string,
  publicProfile: boolean,
): Promise<ProfessionalActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const res = await prisma.professional.updateMany({
      where: { id: professionalId, tenantId: tenant.id },
      data: { publicProfile: Boolean(publicProfile) },
    });
    if (res.count === 0) return { error: "Profissional não encontrado." };
    revalidatePath(`/t/${slug}/services/professionals`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function createProfessionalSpecialtyAction(slug: string, name: string): Promise<SpecialtyActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const parsed = professionalSpecialtyCreateSchema.safeParse({ name });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const specSlug = slugify(parsed.data.name);
    const clash = await prisma.professionalSpecialty.findFirst({
      where: { tenantId: tenant.id, slug: specSlug },
      select: { id: true },
    });
    if (clash) return { error: "Especialidade já existe." };
    const spec = await prisma.professionalSpecialty.create({
      data: { tenantId: tenant.id, name: parsed.data.name, slug: specSlug, description: parsed.data.description },
    });
    revalidatePath(`/t/${slug}/services/professionals`);
    return { ok: true, specialty: { id: spec.id, name: spec.name, slug: spec.slug, status: spec.status, professionalCount: 0 } };
  } catch (err) {
    return fail(err);
  }
}

export async function updateProfessionalSpecialtyAction(
  slug: string,
  id: string,
  name: string,
): Promise<SpecialtyActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const existing = await prisma.professionalSpecialty.findFirst({
      where: { id, tenantId: tenant.id },
      select: { id: true, _count: { select: { assignments: true } } },
    });
    if (!existing) return { error: "Especialidade não encontrada." };
    const parsed = professionalSpecialtyCreateSchema.safeParse({ name });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const specSlug = slugify(parsed.data.name);
    const clash = await prisma.professionalSpecialty.findFirst({
      where: { tenantId: tenant.id, slug: specSlug, NOT: { id } },
      select: { id: true },
    });
    if (clash) return { error: "Especialidade já existe." };
    const spec = await prisma.professionalSpecialty.update({
      where: { id },
      data: { name: parsed.data.name, slug: specSlug },
    });
    revalidatePath(`/t/${slug}/services/professionals`);
    return {
      ok: true,
      specialty: { id: spec.id, name: spec.name, slug: spec.slug, status: spec.status, professionalCount: existing._count.assignments },
    };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteProfessionalSpecialtyAction(slug: string, id: string): Promise<ProfessionalActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const spec = await prisma.professionalSpecialty.findFirst({
      where: { id, tenantId: tenant.id },
      select: { id: true, _count: { select: { assignments: true } } },
    });
    if (!spec) return { error: "Especialidade não encontrada." };
    if (spec._count.assignments > 0) {
      return { error: "Esta especialidade possui profissionais vinculados. Inative-a antes de excluir." };
    }
    await prisma.professionalSpecialty.delete({ where: { id } });
    revalidatePath(`/t/${slug}/services/professionals`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
