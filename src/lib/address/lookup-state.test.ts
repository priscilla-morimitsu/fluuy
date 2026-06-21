import { describe, expect, it } from "vitest";

import { afterCepLookup, afterFieldEdit, afterStreetLookup } from "./lookup-state";
import type { AddressSuggestion } from "./types";

const cepSug: AddressSuggestion = {
  cep: "58030280",
  street: "Rua Aristides Lobo",
  neighborhood: "Bairro dos Estados",
  city: "João Pessoa",
  state: "PB",
  source: "cep",
};

const streetSug: AddressSuggestion = { ...cepSug, source: "street" };

describe("address origin/reset rules", () => {
  it("CEP lookup marks source=cep and auto-fills 4 fields", () => {
    const l = afterCepLookup(cepSug);
    expect(l.source).toBe("cep");
    expect(l.lookupCep).toBe("58030280");
    expect(l.autoFilledFields).toEqual(["street", "neighborhood", "city", "state"]);
    expect(l.status).toBe("verified_by_cep");
  });

  it("editing an auto-filled field after a CEP lookup clears the CEP and goes mixed", () => {
    const l = afterCepLookup(cepSug);
    const r = afterFieldEdit(l, "neighborhood");
    expect(r.clearCep).toBe(true);
    expect(r.notice).toBe("cep_cleared");
    expect(r.lookup.source).toBe("mixed");
    expect(r.lookup.status).toBe("mixed");
  });

  it("number / complement do NOT invalidate the lookup", () => {
    const l = afterCepLookup(cepSug);
    for (const field of ["number", "complement", "reference"]) {
      const r = afterFieldEdit(l, field);
      expect(r.clearCep).toBe(false);
      expect(r.notice).toBeNull();
      expect(r.lookup.source).toBe("cep");
    }
  });

  it("editing an auto-filled field after a street lookup invalidates the street origin", () => {
    const l = afterStreetLookup("k", streetSug);
    expect(l.source).toBe("street");
    const r = afterFieldEdit(l, "city");
    expect(r.lookup.source).toBe("mixed");
    expect(r.clearCep).toBe(true); // CEP was auto-filled by the street lookup
  });
});
