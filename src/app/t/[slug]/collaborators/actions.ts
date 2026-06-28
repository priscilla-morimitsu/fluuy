"use server";

import { revalidatePath } from "next/cache";

import type { Prisma } from "@/generated/prisma/client";
import type { AdminActionResult } from "@/lib/admin/action-result";
import { readCustomData } from "@/lib/custom-data";
import { sendCollaboratorInviteEmail } from "@/lib/auth/providers/resend";
import { onlyDigits } from "@/lib/masks";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";
import { deleteImage, saveImage, UploadError } from "@/lib/upload";
import {
  collaboratorCreateSchema,
  collaboratorEntityCreateSchema,
  collaboratorStatusSchema,
  slugify,
  TENANT_ROLES,
} from "@/lib/validations/collaborator";
import { templateFieldSchema, validateCustomData, type TemplateField } from "@/lib/validations/template";

import { getCollaborator, type CollaboratorDetail } from "./queries";

export type CollaboratorActionResult = AdminActionResult;
export type CollaboratorEntityActionResult =
  | { ok: true; entity: { id: string; name: string; slug: string; status: "active" | "inactive"; memberCount: number } }
  | { error: string };

const WRITE_ROLES = ["tenant_owner", "tenant_manager"] as const;
const FEATURE = "collaborator_management";

function fail(err: unknown): { error: string } {
  if (err instanceof ForbiddenError || err instanceof UnauthorizedError) {
    return { error: "Você não tem permissão para esta ação." };
  }
  if (err instanceof UploadError) return { error: err.message };
  console.error("[collaborators] action error:", err);
  return { error: "Não foi possível concluir a operação." };
}

async function collaboratorTemplateFields(nicheId: string): Promise<TemplateField[]> {
  const template = await prisma.template.findFirst({
    where: { nicheId, entityType: "collaborator", status: "active" },
    orderBy: { version: "desc" },
    select: { fields: true },
  });
  const parsed = templateFieldSchema.array().safeParse(template?.fields ?? []);
  return parsed.success ? parsed.data : [];
}

function parseForm(formData: FormData) {
  return {
    name: formData.get("name"),
    roleId: formData.get("roleId") ?? "",
    departmentId: formData.get("departmentId") ?? "",
    phone: formData.get("phone") ?? "",
    whatsapp: formData.get("whatsapp") ?? "",
    email: formData.get("email") ?? "",
    document: formData.get("document") ?? "",
    status: formData.get("status"),
    hasSystemAccess: formData.get("hasSystemAccess") ?? "",
    tenantRole: formData.get("tenantRole") ?? "",
    isServiceProfessional: formData.get("isServiceProfessional") ?? "",
    professionalId: formData.get("professionalId") ?? "",
    internalNotes: formData.get("internalNotes") ?? "",
  };
}

/**
 * Reconciles a collaborator's Professional link. Returns the professionalId to
 * store, or a pt-BR error. Links an existing professional (validated against the
 * tenant), keeps the current one, or creates one from the collaborator's data.
 */
async function syncProfessionalLink(opts: {
  tenantId: string;
  isServiceProfessional: boolean;
  professionalId: string | null;
  currentProfessionalId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
}): Promise<{ professionalId: string | null } | { error: string }> {
  if (!opts.isServiceProfessional) return { professionalId: null };

  const chosen = opts.professionalId ?? opts.currentProfessionalId;
  if (chosen) {
    const p = await prisma.professional.findFirst({ where: { id: chosen, tenantId: opts.tenantId }, select: { id: true } });
    if (!p) return { error: "Profissional inválido." };
    return { professionalId: chosen };
  }

  const created = await prisma.professional.create({
    data: { tenantId: opts.tenantId, name: opts.name, email: opts.email, phone: opts.phone, status: "active" },
  });
  return { professionalId: created.id };
}

async function assertEntity(
  tenantId: string,
  model: "collaboratorRole" | "collaboratorDepartment",
  id: string | null,
): Promise<boolean> {
  if (!id) return true;
  const found =
    model === "collaboratorRole"
      ? await prisma.collaboratorRole.findFirst({ where: { id, tenantId }, select: { id: true } })
      : await prisma.collaboratorDepartment.findFirst({ where: { id, tenantId }, select: { id: true } });
  return Boolean(found);
}

/** Reads a full collaborator for the edit drawer / detail (any active member). */
export async function fetchCollaboratorAction(slug: string, id: string): Promise<CollaboratorDetail | null> {
  const { tenant } = await resolveTenantContext(slug, { feature: FEATURE });
  return getCollaborator(tenant.id, id);
}

type TenantUserRole = (typeof TENANT_ROLES)[number];

/** True when `userId` is the tenant's only remaining active owner. */
async function isLastActiveOwner(tenantId: string, userId: string): Promise<boolean> {
  const owns = await prisma.tenantUser.findFirst({
    where: { tenantId, userId, role: "tenant_owner", status: "active" },
    select: { id: true },
  });
  if (!owns) return false;
  const ownerCount = await prisma.tenantUser.count({ where: { tenantId, role: "tenant_owner", status: "active" } });
  return ownerCount <= 1;
}

async function sendInviteSafely(email: string, tenantName: string) {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.AUTH_URL ?? "";
    await sendCollaboratorInviteEmail(email, tenantName, `${base}/login`);
  } catch (err) {
    // Best-effort: the user is already invited and can sign in via OTP even if
    // the courtesy e-mail fails (e.g. RESEND_FROM_EMAIL unset in dev).
    console.error("[collaborators] invite e-mail failed:", err);
  }
}

/**
 * Reconciles a collaborator's system access (User + TenantUser) for this tenant.
 * Returns the userId to store on the collaborator, or a pt-BR error string.
 */
async function syncSystemAccess(opts: {
  tenantId: string;
  tenantName: string;
  actingRole: TenantUserRole;
  currentUserId: string | null;
  hasSystemAccess: boolean;
  email: string | null;
  tenantRole: TenantUserRole | null;
  name: string;
}): Promise<{ userId: string | null } | { error: string }> {
  const { tenantId, actingRole, currentUserId, hasSystemAccess, email, tenantRole } = opts;

  if (!hasSystemAccess) {
    if (currentUserId) {
      if (await isLastActiveOwner(tenantId, currentUserId)) {
        return { error: "Não é possível remover o acesso do último proprietário do tenant." };
      }
      await prisma.tenantUser.deleteMany({ where: { tenantId, userId: currentUserId } });
    }
    return { userId: null };
  }

  if (!email || !tenantRole) return { error: "Informe e-mail e papel para conceder acesso." };
  if (tenantRole === "tenant_owner" && actingRole !== "tenant_owner") {
    return { error: "Apenas proprietários podem conceder o papel de Proprietário." };
  }

  // Resolve the user: keep the linked one, else find by e-mail, else invite.
  let userId = currentUserId;
  let invited = false;
  if (!userId) {
    const found = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (found) {
      userId = found.id;
    } else {
      const created = await prisma.user.create({ data: { name: opts.name, email, status: "invited" } });
      userId = created.id;
      invited = true;
    }
  }

  const membership = await prisma.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    select: { role: true, status: true },
  });

  if (membership) {
    if (membership.role === "tenant_owner" && tenantRole !== "tenant_owner" && (await isLastActiveOwner(tenantId, userId))) {
      return { error: "Não é possível rebaixar o último proprietário do tenant." };
    }
    await prisma.tenantUser.update({ where: { tenantId_userId: { tenantId, userId } }, data: { role: tenantRole } });
  } else {
    await prisma.tenantUser.create({
      data: { tenantId, userId, role: tenantRole, status: invited ? "invited" : "active" },
    });
  }

  if (invited) await sendInviteSafely(email, opts.tenantName);
  return { userId };
}

export async function createCollaboratorAction(
  slug: string,
  _prev: CollaboratorActionResult,
  formData: FormData,
): Promise<CollaboratorActionResult> {
  try {
    const { tenant, role: actingRole } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const parsed = collaboratorCreateSchema.safeParse(parseForm(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const d = parsed.data;

    if (!(await assertEntity(tenant.id, "collaboratorRole", d.roleId))) return { error: "Cargo/função inválido." };
    if (!(await assertEntity(tenant.id, "collaboratorDepartment", d.departmentId))) return { error: "Departamento inválido." };

    const fields = await collaboratorTemplateFields(tenant.nicheId);
    const customData = readCustomData(fields, formData);
    const cdErrors = validateCustomData(fields, customData);
    if (cdErrors.length > 0) return { error: cdErrors[0] };

    const access = await syncSystemAccess({
      tenantId: tenant.id,
      tenantName: tenant.name,
      actingRole: actingRole as TenantUserRole,
      currentUserId: null,
      hasSystemAccess: d.hasSystemAccess,
      email: d.email,
      tenantRole: d.tenantRole,
      name: d.name,
    });
    if ("error" in access) return { error: access.error };

    const link = await syncProfessionalLink({
      tenantId: tenant.id,
      isServiceProfessional: d.isServiceProfessional,
      professionalId: d.professionalId,
      currentProfessionalId: null,
      name: d.name,
      email: d.email,
      phone: d.phone,
    });
    if ("error" in link) return { error: link.error };

    const image = formData.get("avatar");
    const avatarUrl =
      image instanceof File && image.size > 0 ? await saveImage(image, `collaborators/${tenant.id}`) : null;

    await prisma.collaborator.create({
      data: {
        tenantId: tenant.id,
        name: d.name,
        roleId: d.roleId,
        departmentId: d.departmentId,
        phone: d.phone,
        phoneNormalized: d.phone ? onlyDigits(d.phone) : null,
        whatsapp: d.whatsapp,
        whatsappNormalized: d.whatsapp ? onlyDigits(d.whatsapp) : null,
        email: d.email,
        document: d.document,
        documentNormalized: d.document,
        status: d.status,
        hasSystemAccess: d.hasSystemAccess,
        tenantRole: d.hasSystemAccess ? d.tenantRole : null,
        userId: access.userId,
        isServiceProfessional: d.isServiceProfessional,
        professionalId: link.professionalId,
        internalNotes: d.internalNotes,
        avatarUrl,
        customData: customData as Prisma.InputJsonValue,
      },
    });

    revalidatePath(`/t/${slug}/collaborators`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function updateCollaboratorAction(
  slug: string,
  collaboratorId: string,
  _prev: CollaboratorActionResult,
  formData: FormData,
): Promise<CollaboratorActionResult> {
  try {
    const { tenant, role: actingRole } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const existing = await prisma.collaborator.findFirst({
      where: { id: collaboratorId, tenantId: tenant.id },
      select: { id: true, avatarUrl: true, userId: true, professionalId: true },
    });
    if (!existing) return { error: "Colaborador não encontrado." };

    const parsed = collaboratorCreateSchema.safeParse(parseForm(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const d = parsed.data;

    if (!(await assertEntity(tenant.id, "collaboratorRole", d.roleId))) return { error: "Cargo/função inválido." };
    if (!(await assertEntity(tenant.id, "collaboratorDepartment", d.departmentId))) return { error: "Departamento inválido." };

    const fields = await collaboratorTemplateFields(tenant.nicheId);
    const customData = readCustomData(fields, formData);
    const cdErrors = validateCustomData(fields, customData);
    if (cdErrors.length > 0) return { error: cdErrors[0] };

    const access = await syncSystemAccess({
      tenantId: tenant.id,
      tenantName: tenant.name,
      actingRole: actingRole as TenantUserRole,
      currentUserId: existing.userId,
      hasSystemAccess: d.hasSystemAccess,
      email: d.email,
      tenantRole: d.tenantRole,
      name: d.name,
    });
    if ("error" in access) return { error: access.error };

    const link = await syncProfessionalLink({
      tenantId: tenant.id,
      isServiceProfessional: d.isServiceProfessional,
      professionalId: d.professionalId,
      currentProfessionalId: existing.professionalId,
      name: d.name,
      email: d.email,
      phone: d.phone,
    });
    if ("error" in link) return { error: link.error };

    let avatarUrl: string | null | undefined;
    const image = formData.get("avatar");
    if (image instanceof File && image.size > 0) {
      avatarUrl = await saveImage(image, `collaborators/${tenant.id}`);
      await deleteImage(existing.avatarUrl);
    } else if (formData.get("removeAvatar") === "true") {
      avatarUrl = null;
      await deleteImage(existing.avatarUrl);
    }

    await prisma.collaborator.updateMany({
      where: { id: collaboratorId, tenantId: tenant.id },
      data: {
        name: d.name,
        roleId: d.roleId,
        departmentId: d.departmentId,
        phone: d.phone,
        phoneNormalized: d.phone ? onlyDigits(d.phone) : null,
        whatsapp: d.whatsapp,
        whatsappNormalized: d.whatsapp ? onlyDigits(d.whatsapp) : null,
        email: d.email,
        document: d.document,
        documentNormalized: d.document,
        status: d.status,
        hasSystemAccess: d.hasSystemAccess,
        tenantRole: d.hasSystemAccess ? d.tenantRole : null,
        userId: access.userId,
        isServiceProfessional: d.isServiceProfessional,
        professionalId: link.professionalId,
        internalNotes: d.internalNotes,
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        customData: customData as Prisma.InputJsonValue,
      },
    });

    revalidatePath(`/t/${slug}/collaborators`);
    revalidatePath(`/t/${slug}/collaborators/${collaboratorId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteCollaboratorAction(slug: string, collaboratorId: string): Promise<CollaboratorActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const c = await prisma.collaborator.findFirst({
      where: { id: collaboratorId, tenantId: tenant.id },
      select: { id: true, avatarUrl: true, userId: true, professionalId: true },
    });
    if (!c) return { error: "Colaborador não encontrado." };
    if (c.userId || c.professionalId) {
      return { error: "Este colaborador possui vínculos (acesso ao sistema ou profissional). Inative-o em vez de excluir." };
    }
    await prisma.collaborator.deleteMany({ where: { id: collaboratorId, tenantId: tenant.id } });
    await deleteImage(c.avatarUrl);
    revalidatePath(`/t/${slug}/collaborators`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function setCollaboratorStatusAction(
  slug: string,
  collaboratorId: string,
  status: string,
): Promise<CollaboratorActionResult> {
  try {
    const parsedStatus = collaboratorStatusSchema.safeParse(status);
    if (!parsedStatus.success) return { error: "Status inválido." };
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    if (parsedStatus.data === "inactive") {
      const c = await prisma.collaborator.findFirst({
        where: { id: collaboratorId, tenantId: tenant.id },
        select: { userId: true },
      });
      if (c?.userId && (await isLastActiveOwner(tenant.id, c.userId))) {
        return { error: "Não é possível inativar o último proprietário do tenant." };
      }
    }
    const res = await prisma.collaborator.updateMany({
      where: { id: collaboratorId, tenantId: tenant.id },
      data: { status: parsedStatus.data },
    });
    if (res.count === 0) return { error: "Colaborador não encontrado." };
    revalidatePath(`/t/${slug}/collaborators`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Re-sends the invite e-mail to a collaborator whose linked user is invited. */
export async function resendCollaboratorInviteAction(slug: string, collaboratorId: string): Promise<CollaboratorActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const c = await prisma.collaborator.findFirst({
      where: { id: collaboratorId, tenantId: tenant.id },
      select: { user: { select: { email: true, status: true } } },
    });
    if (!c?.user) return { error: "Este colaborador não tem acesso ao sistema." };
    if (c.user.status !== "invited") return { error: "Este usuário já ativou o acesso." };
    await sendCollaboratorInviteEmail(
      c.user.email,
      tenant.name,
      `${process.env.NEXT_PUBLIC_BASE_URL ?? process.env.AUTH_URL ?? ""}/login`,
    );
    return { ok: true };
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) return fail(err);
    console.error("[collaborators] resend invite failed:", err);
    return { error: "Não foi possível reenviar o convite (verifique a configuração de e-mail)." };
  }
}

// ── Roles ──────────────────────────────────────────────────────────────────
export async function createCollaboratorRoleAction(slug: string, name: string): Promise<CollaboratorEntityActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const parsed = collaboratorEntityCreateSchema.safeParse({ name });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const entSlug = slugify(parsed.data.name);
    const clash = await prisma.collaboratorRole.findFirst({ where: { tenantId: tenant.id, slug: entSlug }, select: { id: true } });
    if (clash) return { error: "Função já existe." };
    const role = await prisma.collaboratorRole.create({
      data: { tenantId: tenant.id, name: parsed.data.name, slug: entSlug, description: parsed.data.description },
    });
    revalidatePath(`/t/${slug}/collaborators`);
    return { ok: true, entity: { id: role.id, name: role.name, slug: role.slug, status: role.status, memberCount: 0 } };
  } catch (err) {
    return fail(err);
  }
}

export async function updateCollaboratorRoleAction(slug: string, id: string, name: string): Promise<CollaboratorEntityActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const existing = await prisma.collaboratorRole.findFirst({
      where: { id, tenantId: tenant.id },
      select: { id: true, _count: { select: { collaborators: true } } },
    });
    if (!existing) return { error: "Função não encontrada." };
    const parsed = collaboratorEntityCreateSchema.safeParse({ name });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const entSlug = slugify(parsed.data.name);
    const clash = await prisma.collaboratorRole.findFirst({ where: { tenantId: tenant.id, slug: entSlug, NOT: { id } }, select: { id: true } });
    if (clash) return { error: "Função já existe." };
    const role = await prisma.collaboratorRole.update({ where: { id }, data: { name: parsed.data.name, slug: entSlug } });
    revalidatePath(`/t/${slug}/collaborators`);
    return { ok: true, entity: { id: role.id, name: role.name, slug: role.slug, status: role.status, memberCount: existing._count.collaborators } };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteCollaboratorRoleAction(slug: string, id: string): Promise<CollaboratorActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const role = await prisma.collaboratorRole.findFirst({
      where: { id, tenantId: tenant.id },
      select: { id: true, _count: { select: { collaborators: true } } },
    });
    if (!role) return { error: "Função não encontrada." };
    if (role._count.collaborators > 0) return { error: "Esta função possui colaboradores vinculados. Inative-a ou mova os colaboradores." };
    await prisma.collaboratorRole.delete({ where: { id } });
    revalidatePath(`/t/${slug}/collaborators`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ── Departments ──────────────────────────────────────────────────────────────
export async function createCollaboratorDepartmentAction(slug: string, name: string): Promise<CollaboratorEntityActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const parsed = collaboratorEntityCreateSchema.safeParse({ name });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const entSlug = slugify(parsed.data.name);
    const clash = await prisma.collaboratorDepartment.findFirst({ where: { tenantId: tenant.id, slug: entSlug }, select: { id: true } });
    if (clash) return { error: "Departamento já existe." };
    const dep = await prisma.collaboratorDepartment.create({
      data: { tenantId: tenant.id, name: parsed.data.name, slug: entSlug, description: parsed.data.description },
    });
    revalidatePath(`/t/${slug}/collaborators`);
    return { ok: true, entity: { id: dep.id, name: dep.name, slug: dep.slug, status: dep.status, memberCount: 0 } };
  } catch (err) {
    return fail(err);
  }
}

export async function updateCollaboratorDepartmentAction(slug: string, id: string, name: string): Promise<CollaboratorEntityActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const existing = await prisma.collaboratorDepartment.findFirst({
      where: { id, tenantId: tenant.id },
      select: { id: true, _count: { select: { collaborators: true } } },
    });
    if (!existing) return { error: "Departamento não encontrado." };
    const parsed = collaboratorEntityCreateSchema.safeParse({ name });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const entSlug = slugify(parsed.data.name);
    const clash = await prisma.collaboratorDepartment.findFirst({ where: { tenantId: tenant.id, slug: entSlug, NOT: { id } }, select: { id: true } });
    if (clash) return { error: "Departamento já existe." };
    const dep = await prisma.collaboratorDepartment.update({ where: { id }, data: { name: parsed.data.name, slug: entSlug } });
    revalidatePath(`/t/${slug}/collaborators`);
    return { ok: true, entity: { id: dep.id, name: dep.name, slug: dep.slug, status: dep.status, memberCount: existing._count.collaborators } };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteCollaboratorDepartmentAction(slug: string, id: string): Promise<CollaboratorActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const dep = await prisma.collaboratorDepartment.findFirst({
      where: { id, tenantId: tenant.id },
      select: { id: true, _count: { select: { collaborators: true } } },
    });
    if (!dep) return { error: "Departamento não encontrado." };
    if (dep._count.collaborators > 0) return { error: "Este departamento possui colaboradores vinculados. Inative-o ou mova os colaboradores." };
    await prisma.collaboratorDepartment.delete({ where: { id } });
    revalidatePath(`/t/${slug}/collaborators`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
