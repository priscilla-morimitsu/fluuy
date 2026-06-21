import "dotenv/config";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// ── Mocks: isolate the action from the request/Next runtime ─────────────────
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { sendInvite } = vi.hoisted(() => ({ sendInvite: vi.fn(async () => {}) }));
vi.mock("@/lib/auth/providers/resend", () => ({ sendCollaboratorInviteEmail: sendInvite }));

// Avoid pulling next-auth (via rbac → auth) into the test runtime; the action
// only needs the error classes for its `instanceof` checks.
vi.mock("@/lib/rbac", () => ({
  ForbiddenError: class ForbiddenError extends Error {},
  UnauthorizedError: class UnauthorizedError extends Error {},
}));

vi.mock("@/lib/upload", () => ({
  saveImage: vi.fn(async () => "/api/uploads/x.png"),
  deleteImage: vi.fn(async () => {}),
  UploadError: class UploadError extends Error {},
}));

// The action's only auth/tenant gate — return a controllable context.
const ctx = vi.hoisted(() => ({ tenantId: "", nicheId: "", name: "Teste", role: "tenant_owner" as string }));
vi.mock("@/lib/tenant-context", () => ({
  resolveTenantContext: vi.fn(async () => ({
    tenant: { id: ctx.tenantId, nicheId: ctx.nicheId, slug: "itest", name: ctx.name },
    userId: "acting-user",
    role: ctx.role,
  })),
}));

import { prisma } from "@/lib/prisma";

import {
  createCollaboratorAction,
  createCollaboratorRoleAction,
  deleteCollaboratorAction,
  deleteCollaboratorRoleAction,
  updateCollaboratorAction,
} from "./actions";

function fd(fields: Record<string, string>): FormData {
  const f = new FormData();
  f.set("name", "Colaborador Teste");
  f.set("status", "active");
  f.set("hasSystemAccess", "");
  f.set("isServiceProfessional", "");
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

const ok = (r: unknown): r is { ok: true } => Boolean(r && typeof r === "object" && "ok" in r);
const err = (r: unknown): string | undefined =>
  r && typeof r === "object" && "error" in r ? (r as { error: string }).error : undefined;

async function onlyCollaborator() {
  const list = await prisma.collaborator.findMany({ where: { tenantId: ctx.tenantId } });
  expect(list).toHaveLength(1);
  return list[0];
}

beforeAll(async () => {
  const niche = await prisma.niche.create({
    data: { key: `itest-${Date.now()}`, name: "iTest", status: "active" },
  });
  const tenant = await prisma.tenant.create({
    data: { nicheId: niche.id, name: "iTest Tenant", slug: `itest-${Date.now()}`, status: "active" },
  });
  ctx.tenantId = tenant.id;
  ctx.nicheId = niche.id;
});

afterEach(async () => {
  ctx.role = "tenant_owner";
  sendInvite.mockClear();
  await prisma.collaborator.deleteMany({ where: { tenantId: ctx.tenantId } });
  await prisma.tenantUser.deleteMany({ where: { tenantId: ctx.tenantId } });
  await prisma.professional.deleteMany({ where: { tenantId: ctx.tenantId } });
  await prisma.collaboratorRole.deleteMany({ where: { tenantId: ctx.tenantId } });
  await prisma.collaboratorDepartment.deleteMany({ where: { tenantId: ctx.tenantId } });
  await prisma.user.deleteMany({ where: { email: { endsWith: "@itest.local" } } });
});

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { id: ctx.tenantId } });
  await prisma.niche.deleteMany({ where: { id: ctx.nicheId } });
  await prisma.$disconnect();
});

describe("collaborator actions — integration (mocked auth, real DB)", () => {
  it("creates a plain collaborator (no access, no professional)", async () => {
    const r = await createCollaboratorAction("itest", undefined, fd({ name: "Sem Acesso" }));
    expect(ok(r)).toBe(true);
    const c = await onlyCollaborator();
    expect(c.name).toBe("Sem Acesso");
    expect(c.userId).toBeNull();
    expect(c.hasSystemAccess).toBe(false);
  });

  it("grants system access: creates an invited User + TenantUser and sends the invite", async () => {
    const r = await createCollaboratorAction(
      "itest",
      undefined,
      fd({ name: "Com Acesso", email: "grant@itest.local", hasSystemAccess: "on", tenantRole: "tenant_manager" }),
    );
    expect(ok(r)).toBe(true);
    const c = await onlyCollaborator();
    expect(c.userId).not.toBeNull();
    expect(c.hasSystemAccess).toBe(true);

    const user = await prisma.user.findUnique({ where: { email: "grant@itest.local" } });
    expect(user?.status).toBe("invited");
    const tu = await prisma.tenantUser.findFirst({ where: { tenantId: ctx.tenantId, userId: c.userId! } });
    expect(tu?.role).toBe("tenant_manager");
    expect(sendInvite).toHaveBeenCalledOnce();
  });

  it("blocks a manager from granting the owner role", async () => {
    ctx.role = "tenant_manager";
    const r = await createCollaboratorAction(
      "itest",
      undefined,
      fd({ name: "Promo", email: "promo@itest.local", hasSystemAccess: "on", tenantRole: "tenant_owner" }),
    );
    expect(err(r)).toMatch(/Proprietário/i);
    expect(await prisma.collaborator.count({ where: { tenantId: ctx.tenantId } })).toBe(0);
  });

  it("blocks removing access from the last active owner", async () => {
    await createCollaboratorAction(
      "itest",
      undefined,
      fd({ name: "Dono", email: "owner@itest.local", hasSystemAccess: "on", tenantRole: "tenant_owner" }),
    );
    const c = await onlyCollaborator();
    // A freshly-invited owner starts `invited`; the guard counts active owners
    // (the real founding owner is active), so activate it to exercise the rule.
    await prisma.tenantUser.updateMany({
      where: { tenantId: ctx.tenantId, userId: c.userId! },
      data: { status: "active" },
    });
    const r = await updateCollaboratorAction("itest", c.id, undefined, fd({ name: "Dono", hasSystemAccess: "" }));
    expect(err(r)).toMatch(/último proprietário/i);
    // Access must still be intact.
    const tu = await prisma.tenantUser.findFirst({ where: { tenantId: ctx.tenantId, role: "tenant_owner" } });
    expect(tu).not.toBeNull();
  });

  it("links a Professional created from the collaborator's data, then unlinks", async () => {
    const r = await createCollaboratorAction(
      "itest",
      undefined,
      fd({ name: "Profissional", email: "pro@itest.local", isServiceProfessional: "on" }),
    );
    expect(ok(r)).toBe(true);
    const c = await onlyCollaborator();
    expect(c.professionalId).not.toBeNull();
    const pro = await prisma.professional.findFirst({ where: { tenantId: ctx.tenantId } });
    expect(pro?.name).toBe("Profissional");

    const u = await updateCollaboratorAction("itest", c.id, undefined, fd({ name: "Profissional", isServiceProfessional: "" }));
    expect(ok(u)).toBe(true);
    const after = await prisma.collaborator.findUniqueOrThrow({ where: { id: c.id } });
    expect(after.professionalId).toBeNull();
    // The Professional record is preserved, just unlinked.
    expect(await prisma.professional.count({ where: { tenantId: ctx.tenantId } })).toBe(1);
  });

  it("blocks deleting a role that still has members", async () => {
    const roleRes = await createCollaboratorRoleAction("itest", "Atendente");
    expect("entity" in roleRes && roleRes.entity.id).toBeTruthy();
    const roleId = "entity" in roleRes ? roleRes.entity.id : "";
    await createCollaboratorAction("itest", undefined, fd({ name: "Com Função", roleId }));

    const del = await deleteCollaboratorRoleAction("itest", roleId);
    expect(err(del)).toMatch(/vinculad/i);
  });

  it("blocks deleting a collaborator that has system access", async () => {
    await createCollaboratorAction(
      "itest",
      undefined,
      fd({ name: "Com Acesso", email: "del@itest.local", hasSystemAccess: "on", tenantRole: "tenant_viewer" }),
    );
    const c = await onlyCollaborator();
    const r = await deleteCollaboratorAction("itest", c.id);
    expect(err(r)).toMatch(/vínculos|inative/i);
    expect(await prisma.collaborator.count({ where: { tenantId: ctx.tenantId } })).toBe(1);
  });
});
