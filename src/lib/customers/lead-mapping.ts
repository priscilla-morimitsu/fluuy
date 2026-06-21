import { onlyDigits } from "@/lib/masks";
import type { CustomerSource, CustomerStatus } from "@/lib/validations/customer";

/** The lead fields the conversion mapping needs (subset of CustomerLead). */
export type LeadForConversion = {
  id: string;
  name: string | null;
  phone: string | null;
  phoneNormalized: string | null;
  whatsapp: string | null;
  whatsappNormalized: string | null;
  email: string | null;
  source: CustomerSource | null;
};

export type CustomerFromLead = {
  name: string;
  phone: string;
  phoneNormalized: string;
  whatsapp: string | null;
  whatsappNormalized: string | null;
  email: string | null;
  source: CustomerSource | null;
  status: CustomerStatus;
  leadId: string;
};

/**
 * Pure mapping from a tenant lead to the scalar fields of the Customer it
 * becomes. Normalized phone/whatsapp are recomputed when missing. The caller is
 * responsible for guarding a usable phone + name and for carrying custom_data.
 */
export function customerDataFromLead(
  lead: LeadForConversion,
  overrides: { name?: string | null; status?: CustomerStatus } = {},
): CustomerFromLead {
  const phone = (lead.phone ?? "").trim();
  return {
    name: (overrides.name ?? lead.name ?? "").trim(),
    phone,
    phoneNormalized: lead.phoneNormalized ?? onlyDigits(phone),
    whatsapp: lead.whatsapp,
    whatsappNormalized: lead.whatsappNormalized ?? (lead.whatsapp ? onlyDigits(lead.whatsapp) : null),
    email: lead.email,
    source: lead.source,
    status: overrides.status ?? "active",
    leadId: lead.id,
  };
}
