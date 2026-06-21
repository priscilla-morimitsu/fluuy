import { describe, expect, it } from "vitest";

import { customerDataFromLead } from "@/lib/customers/lead-mapping";
import {
  customerAddressSchema,
  customerCreateSchema,
  customerEntityCreateSchema,
  customerLeadCreateSchema,
  pluralizePt,
  whatsappLeadInputSchema,
} from "@/lib/validations/customer";

const base = {
  name: "Maria Silva",
  phone: "+5511999998888",
  status: "active" as const,
};

describe("customerCreateSchema", () => {
  it("accepts a minimal valid customer", () => {
    const r = customerCreateSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.whatsapp).toBeNull();
      expect(r.data.email).toBeNull();
      expect(r.data.personType).toBeNull();
    }
  });

  it("requires a name of at least 2 chars", () => {
    expect(customerCreateSchema.safeParse({ ...base, name: "M" }).success).toBe(false);
  });

  it("rejects a phone without enough digits", () => {
    const r = customerCreateSchema.safeParse({ ...base, phone: "123" });
    expect(r.success).toBe(false);
  });

  it("rejects an invalid e-mail but accepts a valid one", () => {
    expect(customerCreateSchema.safeParse({ ...base, email: "not-an-email" }).success).toBe(false);
    const ok = customerCreateSchema.safeParse({ ...base, email: "maria@example.com" });
    expect(ok.success).toBe(true);
  });

  it("validates CPF/CNPJ check digits when a document is provided", () => {
    expect(customerCreateSchema.safeParse({ ...base, document: "111.111.111-11" }).success).toBe(false);
    const ok = customerCreateSchema.safeParse({ ...base, document: "529.982.247-25" });
    expect(ok.success).toBe(true);
  });

  it("rejects a future birth date", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    expect(customerCreateSchema.safeParse({ ...base, birthDate: future }).success).toBe(false);
  });

  it("requires a consent source when a consent date is set", () => {
    const r = customerCreateSchema.safeParse({ ...base, consentAcceptedAt: "2024-01-01" });
    expect(r.success).toBe(false);
    const ok = customerCreateSchema.safeParse({
      ...base,
      consentAcceptedAt: "2024-01-01",
      consentSource: "WhatsApp",
    });
    expect(ok.success).toBe(true);
  });
});

describe("customerAddressSchema", () => {
  it("normalizes a CEP to 8 digits and uppercases the UF", () => {
    const r = customerAddressSchema.safeParse({ zipCode: "58030-280", state: "pb", street: "Rua A" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.zipCode).toBe("58030280");
      expect(r.data.state).toBe("PB");
      expect(r.data.type).toBe("main");
      expect(r.data.country).toBe("Brasil");
    }
  });

  it("rejects a malformed CEP and an invalid UF", () => {
    expect(customerAddressSchema.safeParse({ zipCode: "123" }).success).toBe(false);
    expect(customerAddressSchema.safeParse({ state: "ZZ" }).success).toBe(false);
  });
});

describe("customerEntityCreateSchema", () => {
  it("normalizes the entity type to lowercase and defaults status", () => {
    const r = customerEntityCreateSchema.safeParse({ entityType: "PET", name: "Rex" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.entityType).toBe("pet");
      expect(r.data.status).toBe("active");
    }
  });

  it("rejects an entity type with invalid characters", () => {
    expect(customerEntityCreateSchema.safeParse({ entityType: "pet shop!", name: "Rex" }).success).toBe(false);
  });

  it("requires a name of at least 2 chars", () => {
    expect(customerEntityCreateSchema.safeParse({ entityType: "pet", name: "R" }).success).toBe(false);
  });
});

describe("customerLeadCreateSchema", () => {
  it("accepts an empty lead and defaults status to new", () => {
    const r = customerLeadCreateSchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.status).toBe("new");
  });

  it("rejects an invalid phone but accepts a valid one", () => {
    expect(customerLeadCreateSchema.safeParse({ phone: "123" }).success).toBe(false);
    expect(customerLeadCreateSchema.safeParse({ phone: "+5511988887777" }).success).toBe(true);
  });
});

describe("whatsappLeadInputSchema", () => {
  it("requires a valid phone", () => {
    expect(whatsappLeadInputSchema.safeParse({}).success).toBe(false);
    expect(whatsappLeadInputSchema.safeParse({ phone: "123" }).success).toBe(false);
    expect(whatsappLeadInputSchema.safeParse({ phone: "+5511988887777", name: "Ana" }).success).toBe(true);
  });
});

describe("customerDataFromLead", () => {
  const lead = {
    id: "lead-1",
    name: "Ana",
    phone: "+5511988887777",
    phoneNormalized: null,
    whatsapp: "+5511977776666",
    whatsappNormalized: null,
    email: "ana@example.com",
    source: "whatsapp" as const,
  };

  it("recomputes normalized phone/whatsapp and carries the lead id", () => {
    const d = customerDataFromLead(lead);
    expect(d.phoneNormalized).toBe("5511988887777");
    expect(d.whatsappNormalized).toBe("5511977776666");
    expect(d.leadId).toBe("lead-1");
    expect(d.status).toBe("active");
    expect(d.name).toBe("Ana");
  });

  it("applies name and status overrides", () => {
    const d = customerDataFromLead(lead, { name: "Ana Paula", status: "inactive" });
    expect(d.name).toBe("Ana Paula");
    expect(d.status).toBe("inactive");
  });
});

describe("pluralizePt", () => {
  it.each([
    ["Cliente", "Clientes"],
    ["Paciente", "Pacientes"],
    ["Tutor", "Tutores"],
    ["Interessado", "Interessados"],
  ])("pluralizes %s → %s", (input, expected) => {
    expect(pluralizePt(input)).toBe(expected);
  });
});
