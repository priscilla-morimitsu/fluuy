import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { onlyDigits } from "@/lib/masks";

/**
 * Shared helpers for the MCP read tools (Phase 2). Everything here is
 * tenant-scoped by the caller (tenant comes from the bearer token) and resolves
 * the tutor by phone within the tenant — never trusting client-supplied ids.
 */

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Formats a Prisma Decimal / number / null as Brazilian currency. */
export function formatBRL(value: Prisma.Decimal | number | string | null | undefined): string {
  if (value == null) return "—";
  const n = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(n) ? BRL.format(n) : "—";
}

export interface TutorContext {
  id: string;
  name: string;
}

/**
 * Resolves a tenant customer (tutor) by the contact phone. Matches on the
 * normalized phone OR whatsapp (digits only). Returns null when not a customer
 * yet — callers should treat the contact as a lead, never invent data.
 */
export async function resolveTutor(
  tenantId: string,
  phone: string,
): Promise<TutorContext | null> {
  const digits = onlyDigits(phone);
  if (!digits) return null;

  const customer = await prisma.customer.findFirst({
    where: {
      tenantId,
      status: "active",
      OR: [{ phoneNormalized: digits }, { whatsappNormalized: digits }],
    },
    select: { id: true, name: true },
  });

  return customer;
}

/** Reads a string value from a customData/JSON object by key, if present. */
export function readJsonRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export interface TutorPet {
  name: string;
  species: string | null;
  breed: string | null;
  size: string | null;
  sex: string | null;
  healthNotes: string | null;
}

function str(record: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = record[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

/**
 * Lists a tutor's pets. The demo/MVP stores pets as CustomerEntity
 * (entityType="pet") with pt-BR custom_data keys (especie/raca/porte/sexo/
 * observacoes_saude) — see seed-demo-petshop. This reads that shape.
 */
export async function listTutorPets(tenantId: string, customerId: string): Promise<TutorPet[]> {
  const entities = await prisma.customerEntity.findMany({
    where: { tenantId, customerId, entityType: "pet", status: "active" },
    select: { name: true, customData: true },
    orderBy: { createdAt: "asc" },
  });

  return entities.map((e) => {
    const cd = readJsonRecord(e.customData);
    return {
      name: e.name,
      species: str(cd, "especie", "species"),
      breed: str(cd, "raca", "breed"),
      size: str(cd, "porte", "size"),
      sex: str(cd, "sexo", "sex"),
      healthNotes: str(cd, "observacoes_saude", "healthNotes"),
    };
  });
}
