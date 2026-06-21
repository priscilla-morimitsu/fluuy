import "server-only";

import type { Prisma, TemplateCategory, TemplateMappingStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const PROVIDER = "pilot_status_whatsapp" as const;

export interface TemplateMappingView {
  id: string;
  providerTemplateId: string;
  name: string;
  category: TemplateCategory;
  language: string | null;
  variables: string[];
  status: TemplateMappingStatus;
  isDefault: boolean;
}

export interface TemplateInput {
  providerTemplateId: string;
  name: string;
  category: TemplateCategory;
  language?: string;
  variables: string[];
  status: TemplateMappingStatus;
  isDefault: boolean;
}

function toView(t: {
  id: string;
  providerTemplateId: string;
  name: string;
  category: TemplateCategory;
  language: string | null;
  variables: Prisma.JsonValue;
  status: TemplateMappingStatus;
  isDefault: boolean;
}): TemplateMappingView {
  return {
    id: t.id,
    providerTemplateId: t.providerTemplateId,
    name: t.name,
    category: t.category,
    language: t.language,
    variables: Array.isArray(t.variables) ? t.variables.filter((v): v is string => typeof v === "string") : [],
    status: t.status,
    isDefault: t.isDefault,
  };
}

/** The tenant's active provider account (templates belong to it). */
async function requireProviderAccountId(tenantId: string): Promise<string> {
  const account = await prisma.messagingProviderAccount.findFirst({
    where: { tenantId, provider: PROVIDER },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (!account) throw new Error("Conecte um número de WhatsApp antes de cadastrar templates.");
  return account.id;
}

export async function listTemplates(tenantId: string): Promise<TemplateMappingView[]> {
  const rows = await prisma.messageTemplateMapping.findMany({
    where: { tenantId },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
  return rows.map(toView);
}

export async function createTemplate(tenantId: string, input: TemplateInput): Promise<void> {
  const providerAccountId = await requireProviderAccountId(tenantId);
  await prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.messageTemplateMapping.updateMany({ where: { tenantId }, data: { isDefault: false } });
    }
    await tx.messageTemplateMapping.create({
      data: {
        tenantId,
        providerAccountId,
        providerTemplateId: input.providerTemplateId,
        name: input.name,
        category: input.category,
        language: input.language ?? null,
        variables: input.variables as Prisma.InputJsonValue,
        status: input.status,
        isDefault: input.isDefault,
      },
    });
  });
}

export async function updateTemplate(tenantId: string, id: string, input: TemplateInput): Promise<void> {
  const existing = await prisma.messageTemplateMapping.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!existing) throw new Error("Template não encontrado.");
  await prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.messageTemplateMapping.updateMany({
        where: { tenantId, NOT: { id } },
        data: { isDefault: false },
      });
    }
    await tx.messageTemplateMapping.update({
      where: { id },
      data: {
        providerTemplateId: input.providerTemplateId,
        name: input.name,
        category: input.category,
        language: input.language ?? null,
        variables: input.variables as Prisma.InputJsonValue,
        status: input.status,
        isDefault: input.isDefault,
      },
    });
  });
}

export async function deleteTemplate(tenantId: string, id: string): Promise<void> {
  await prisma.messageTemplateMapping.deleteMany({ where: { id, tenantId } });
}
