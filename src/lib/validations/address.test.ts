import { describe, expect, it } from "vitest";

import { makeAddressSchema } from "./address";

const optional = makeAddressSchema();
const required = makeAddressSchema({ required: true });

describe("brazilian address schema", () => {
  it("normalizes CEP to digits when valid", () => {
    const r = optional.safeParse({ cep: "58030-280", state: "pb" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.cep).toBe("58030280");
      expect(r.data.state).toBe("PB");
      expect(r.data.country).toBe("Brasil");
    }
  });

  it("rejects a CEP without 8 digits", () => {
    const r = optional.safeParse({ cep: "5803" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("CEP deve ter 8 dígitos.");
  });

  it("rejects an invalid UF", () => {
    const r = optional.safeParse({ state: "ZZ" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("UF inválida.");
  });

  it("requires the core fields in required mode with pt-BR messages", () => {
    const r = required.safeParse({ cep: "", street: "", number: "", neighborhood: "", city: "", state: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const msgs = r.error.issues.map((i) => i.message);
      expect(msgs).toContain("Informe o CEP.");
      expect(msgs).toContain("Informe a rua.");
      expect(msgs).toContain("Informe o número ou S/N.");
      expect(msgs).toContain("Selecione o estado.");
    }
  });

  it("accepts a complete required address with number S/N", () => {
    const r = required.safeParse({
      cep: "58030280",
      street: "Rua Aristides Lobo",
      number: "S/N",
      neighborhood: "Centro",
      city: "João Pessoa",
      state: "PB",
    });
    expect(r.success).toBe(true);
  });

  it("validates latitude/longitude ranges", () => {
    expect(optional.safeParse({ latitude: 100 }).success).toBe(false);
    expect(optional.safeParse({ latitude: -23.5, longitude: -46.6 }).success).toBe(true);
  });
});
