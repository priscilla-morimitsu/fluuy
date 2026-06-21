import { describe, expect, it } from "vitest";

import { collaboratorCreateSchema } from "./collaborator";

const base = {
  name: "Maria Silva",
  roleId: "",
  departmentId: "",
  phone: "",
  whatsapp: "",
  email: "",
  document: "",
  status: "active",
  hasSystemAccess: "",
  tenantRole: "",
  internalNotes: "",
};

describe("collaboratorCreateSchema — system access rules", () => {
  it("accepts a collaborator without system access (no e-mail/role needed)", () => {
    const r = collaboratorCreateSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it("requires e-mail when system access is on", () => {
    const r = collaboratorCreateSchema.safeParse({ ...base, hasSystemAccess: "on", tenantRole: "tenant_manager" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toContain("e-mail");
  });

  it("requires a tenant role when system access is on", () => {
    const r = collaboratorCreateSchema.safeParse({ ...base, hasSystemAccess: "on", email: "a@b.com" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toContain("papel");
  });

  it("accepts system access with e-mail + role", () => {
    const r = collaboratorCreateSchema.safeParse({ ...base, hasSystemAccess: "on", email: "a@b.com", tenantRole: "tenant_operator" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.hasSystemAccess).toBe(true);
  });

  it("rejects an invalid CPF", () => {
    const r = collaboratorCreateSchema.safeParse({ ...base, document: "11111111111" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toContain("CPF");
  });
});
