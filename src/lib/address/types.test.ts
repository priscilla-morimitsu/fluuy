import { describe, expect, it } from "vitest";

import { isValidUf, normalizeCep, normalizeUf, UF_VALUES } from "./types";

describe("address normalizers", () => {
  it("normalizeCep keeps digits and caps at 8", () => {
    expect(normalizeCep("58030-280")).toBe("58030280");
    expect(normalizeCep("58030280999")).toBe("58030280");
    expect(normalizeCep("abc")).toBe("");
  });

  it("normalizeUf uppercases valid UFs and rejects others", () => {
    expect(normalizeUf("pb")).toBe("PB");
    expect(normalizeUf(" sp ")).toBe("SP");
    expect(normalizeUf("xx")).toBe("");
  });

  it("has all 27 UFs", () => {
    expect(UF_VALUES).toHaveLength(27);
    expect(isValidUf("PB")).toBe(true);
    expect(isValidUf("ZZ")).toBe(false);
  });
});
