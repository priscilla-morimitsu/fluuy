import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { onlyDigits } from "@/lib/masks";
import { prisma } from "@/lib/prisma";
import {
  leadToCustomerConversionSchema,
  whatsappLeadInputSchema,
} from "@/lib/validations/customer";

import { customerDataFromLead } from "./lead-mapping";

/**
 * Tenant lead → Customer conversion + WhatsApp identity resolution.
 *
 * These are server-side building blocks for the (future) WhatsApp inbox and
 * order/appointment flows: there is no WhatsApp ingestion or Order/Appointment
 * model yet, so nothing calls them in the UI. The caller is responsible for
 * resolving the tenant, checking the `lead_management` feature and the user's
 * role, and revalidating paths. `tenantId` always comes from the resolved
 * session — never from client input.
 *
 * Rule (spec): a new WhatsApp contact without a matching Customer becomes a
 * Lead first; conversion preserves any existing Customer data and links both
 * sides via Customer.leadId / CustomerLead.convertedCustomerId.
 */

const CUSTOMER_SELECT = {
  id: true,
  name: true,
  phone: true,
  whatsapp: true,
  status: true,
  leadId: true,
} satisfies Prisma.CustomerSelect;

type ResolvedCustomer = Prisma.CustomerGetPayload<{ select: typeof CUSTOMER_SELECT }>;
type ResolvedLead = Prisma.CustomerLeadGetPayload<object>;

export type WhatsappResolution =
  | { kind: "customer"; customer: ResolvedCustomer }
  | { kind: "lead"; lead: ResolvedLead }
  | { kind: "none" };

/** Match an existing Customer or open Lead for an inbound phone (tenant-scoped). */
export async function resolveCustomerOrLeadByWhatsapp(
  tenantId: string,
  rawPhone: string,
): Promise<WhatsappResolution> {
  const digits = onlyDigits(rawPhone);
  if (digits.length < 10) return { kind: "none" };

  const customer = await prisma.customer.findFirst({
    where: { tenantId, OR: [{ phoneNormalized: digits }, { whatsappNormalized: digits }] },
    select: CUSTOMER_SELECT,
  });
  if (customer) return { kind: "customer", customer };

  const lead = await prisma.customerLead.findFirst({
    where: {
      tenantId,
      status: { not: "converted" },
      OR: [{ phoneNormalized: digits }, { whatsappNormalized: digits }],
    },
  });
  if (lead) return { kind: "lead", lead };

  return { kind: "none" };
}

export type FindOrCreateLeadResult =
  | { ok: true; kind: "customer"; customerId: string }
  | { ok: true; kind: "lead"; lead: ResolvedLead }
  | { ok: false; error: string };

/**
 * Inbound WhatsApp message with no matching Customer → find/create a Lead first.
 * Enriches an existing lead only on empty fields (never overwrites known data).
 */
export async function findOrCreateLeadFromWhatsapp(
  tenantId: string,
  input: unknown,
): Promise<FindOrCreateLeadResult> {
  const parsed = whatsappLeadInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;
  const digits = onlyDigits(d.phone);
  const whatsDigits = d.whatsapp ? onlyDigits(d.whatsapp) : null;

  const customer = await prisma.customer.findFirst({
    where: { tenantId, OR: [{ phoneNormalized: digits }, { whatsappNormalized: digits }] },
    select: { id: true },
  });
  if (customer) return { ok: true, kind: "customer", customerId: customer.id };

  const existing = await prisma.customerLead.findFirst({ where: { tenantId, phoneNormalized: digits } });
  if (existing) {
    const lead = await prisma.customerLead.update({
      where: { id: existing.id },
      data: {
        name: existing.name ?? d.name,
        whatsapp: existing.whatsapp ?? d.whatsapp,
        whatsappNormalized: existing.whatsappNormalized ?? whatsDigits,
        email: existing.email ?? d.email,
        source: existing.source ?? d.source ?? "whatsapp",
        message: existing.message ?? d.message,
      },
    });
    return { ok: true, kind: "lead", lead };
  }

  const lead = await prisma.customerLead.create({
    data: {
      tenantId,
      name: d.name,
      phone: d.phone,
      phoneNormalized: digits,
      whatsapp: d.whatsapp,
      whatsappNormalized: whatsDigits,
      email: d.email,
      source: d.source ?? "whatsapp",
      status: "new",
      message: d.message,
    },
  });
  return { ok: true, kind: "lead", lead };
}

export type ConvertLeadResult =
  | { ok: true; customer: ResolvedCustomer; created: boolean }
  | { ok: false; error: string };

/**
 * Convert a tenant lead into a Customer (manual or order/appointment-triggered).
 * If a Customer already matches the lead's phone/WhatsApp, link to it and keep
 * its data; otherwise create the Customer from the lead. Idempotent: a lead
 * already converted returns its Customer.
 */
export async function convertLeadToCustomer(
  tenantId: string,
  leadId: string,
  overrides: unknown = {},
): Promise<ConvertLeadResult> {
  const parsed = leadToCustomerConversionSchema.safeParse(overrides ?? {});
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const lead = await prisma.customerLead.findFirst({ where: { id: leadId, tenantId } });
  if (!lead) return { ok: false, error: "Lead não encontrado." };

  // Already converted → return the linked customer (idempotent).
  if (lead.convertedCustomerId) {
    const linked = await prisma.customer.findFirst({
      where: { id: lead.convertedCustomerId, tenantId },
      select: CUSTOMER_SELECT,
    });
    if (linked) return { ok: true, customer: linked, created: false };
  }

  if (!lead.phone || onlyDigits(lead.phone).length < 10) {
    return { ok: false, error: "Lead sem telefone válido não pode virar cliente." };
  }
  const digits = lead.phoneNormalized ?? onlyDigits(lead.phone);
  const whatsDigits = lead.whatsappNormalized ?? (lead.whatsapp ? onlyDigits(lead.whatsapp) : null);

  // Existing customer with the same phone/WhatsApp → link instead of duplicating.
  const matchOr: Prisma.CustomerWhereInput[] = [{ phoneNormalized: digits }];
  if (whatsDigits) matchOr.push({ whatsappNormalized: whatsDigits });
  const existing = await prisma.customer.findFirst({ where: { tenantId, OR: matchOr }, select: CUSTOMER_SELECT });
  if (existing) {
    await prisma.$transaction([
      prisma.customerLead.update({
        where: { id: lead.id },
        data: { status: "converted", convertedCustomerId: existing.id },
      }),
      ...(existing.leadId
        ? []
        : [prisma.customer.updateMany({ where: { id: existing.id, tenantId }, data: { leadId: lead.id } })]),
    ]);
    return { ok: true, customer: existing, created: false };
  }

  const data = customerDataFromLead(lead, parsed.data);
  if (data.name.length < 2) return { ok: false, error: "Lead sem nome não pode virar cliente." };

  try {
    const customer = await prisma.$transaction(async (tx) => {
      const created = await tx.customer.create({
        data: { tenantId, ...data, customData: (lead.customData as Prisma.InputJsonValue) ?? {} },
        select: CUSTOMER_SELECT,
      });
      await tx.customerLead.update({
        where: { id: lead.id },
        data: { status: "converted", convertedCustomerId: created.id },
      });
      return created;
    });
    return { ok: true, customer, created: true };
  } catch (err) {
    // Race: a Customer with this phone was created concurrently → link to it.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const racer = await prisma.customer.findFirst({
        where: { tenantId, phoneNormalized: digits },
        select: CUSTOMER_SELECT,
      });
      if (racer) {
        await prisma.customerLead.update({
          where: { id: lead.id },
          data: { status: "converted", convertedCustomerId: racer.id },
        });
        return { ok: true, customer: racer, created: false };
      }
    }
    throw err;
  }
}
