import { describe, expect, it } from "vitest";

import {
  offerPlanCreateSchema,
  offerPlanServiceItemSchema,
} from "@/lib/validations/offer-plan";

const base = {
  name: "Plano Banho Mensal",
  price: "100.00",
  autoRenew: false,
  allowScheduling: true,
  status: "draft" as const,
  availableForSale: true,
};

describe("offerPlanCreateSchema", () => {
  it("requires a billing cycle for recurring plans", () => {
    expect(offerPlanCreateSchema.safeParse({ ...base, type: "recurring_plan" }).success).toBe(false);
    const ok = offerPlanCreateSchema.safeParse({ ...base, type: "recurring_plan", billingCycle: "monthly" });
    expect(ok.success).toBe(true);
  });

  it("rejects a billing cycle on non-recurring types", () => {
    const r = offerPlanCreateSchema.safeParse({ ...base, type: "prepaid_package", billingCycle: "monthly" });
    expect(r.success).toBe(false);
    expect(offerPlanCreateSchema.safeParse({ ...base, type: "prepaid_package" }).success).toBe(true);
  });

  it("only allows autoRenew on recurring plans", () => {
    expect(offerPlanCreateSchema.safeParse({ ...base, type: "combo", autoRenew: true }).success).toBe(false);
    expect(
      offerPlanCreateSchema.safeParse({ ...base, type: "recurring_plan", billingCycle: "yearly", autoRenew: true }).success,
    ).toBe(true);
  });

  it("rejects a promotional price greater than the price", () => {
    const r = offerPlanCreateSchema.safeParse({ ...base, type: "combo", price: "100", promotionalPrice: "150" });
    expect(r.success).toBe(false);
  });

  it("requires a name with at least 2 chars", () => {
    expect(offerPlanCreateSchema.safeParse({ ...base, type: "combo", name: "P" }).success).toBe(false);
  });
});

describe("offerPlanServiceItemSchema", () => {
  const serviceId = "11111111-1111-4111-8111-111111111111";

  it("defaults quantity to 1 and requires a uuid serviceId", () => {
    const r = offerPlanServiceItemSchema.safeParse({ serviceId, quantity: "", included: true, sortOrder: 0 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.quantity).toBe(1);
    expect(offerPlanServiceItemSchema.safeParse({ serviceId: "nope", quantity: 1 }).success).toBe(false);
  });

  it("rejects a quantity below 1", () => {
    expect(offerPlanServiceItemSchema.safeParse({ serviceId, quantity: 0 }).success).toBe(false);
  });
});
