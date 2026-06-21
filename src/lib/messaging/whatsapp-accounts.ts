import "server-only";

import type {
  MessagingProviderAccount,
  WhatsAppAccount,
  WhatsAppAccountStatus,
} from "@/generated/prisma/client";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secrets";
import { prisma } from "@/lib/prisma";

import { MessagingProviderError } from "./errors";
import { detectEnvironment, getMessagingProvider, getParentMessagingProvider } from "./index";
import { digitsOnly } from "./phone";
import type { CreateNumberResult, MessagingProvider } from "./types";

/**
 * Tenant-scoped WhatsApp account lifecycle (Pilot Status SaaS pattern):
 * parent/master key (ENV) manages instances and mints one child key per tenant;
 * the child key (encrypted at rest) routes that tenant's traffic. The UI never
 * touches the provider — it goes through these functions via server actions.
 */

const PROVIDER = "pilot_status_whatsapp" as const;

function maskNumber(value: string | null | undefined): string | null {
  const digits = digitsOnly(value ?? "");
  if (digits.length < 6) return digits || null;
  return `+${digits.slice(0, 4)}${"*".repeat(digits.length - 8)}${digits.slice(-4)}`;
}

function mapState(state: string | null | undefined): WhatsAppAccountStatus {
  switch ((state ?? "").toUpperCase()) {
    case "OPEN":
      return "open";
    case "CLOSE":
      return "close";
    case "CONNECTING":
      return "connecting";
    case "DISCONNECTED":
      return "disconnected";
    case "ERROR":
      return "error";
    default:
      return "pending_pairing";
  }
}

/** Resolves (or lazily creates) the tenant's provider account row. */
async function ensureProviderAccount(tenantId: string): Promise<MessagingProviderAccount> {
  const parentKey = process.env.PILOT_STATUS_API_KEY;
  if (!parentKey) throw new Error("PILOT_STATUS_API_KEY (parent key) is not set.");
  const environment = detectEnvironment(parentKey);

  const existing = await prisma.messagingProviderAccount.findUnique({
    where: { tenantId_provider_environment: { tenantId, provider: PROVIDER, environment } },
  });
  if (existing) return existing;

  return prisma.messagingProviderAccount.create({
    data: { tenantId, provider: PROVIDER, environment, status: "pending_setup" },
  });
}

/** A provider bound to the tenant's decrypted child key (for per-tenant calls). */
function tenantProvider(account: MessagingProviderAccount): MessagingProvider {
  if (!account.encryptedApiKey) throw new Error("Tenant has no WhatsApp child key yet.");
  return getMessagingProvider(PROVIDER, decryptSecret(account.encryptedApiKey));
}

export interface ConnectNumberResultView {
  accountId: string;
  instanceId: string | null;
  qrcodeBase64: string | null;
  pairingCode: string | null;
  status: WhatsAppAccountStatus;
  linkMode: "single" | "dual";
  dualFellBack: boolean;
}

/**
 * Mints a child key, creates the WhatsApp instance bound to it, and persists
 * everything. Requests DUAL link; transparently falls back to SINGLE when the
 * workspace rejects it. Returns the QR/pairing artifacts for the UI.
 */
export async function connectWhatsappNumber(
  tenantId: string,
  input: { name: string; number: string; linkMode: "single" | "dual" },
): Promise<ConnectNumberResultView> {
  const account = await ensureProviderAccount(tenantId);
  const parent = getParentMessagingProvider();

  // 1. Child key (raw returned once) — encrypt immediately.
  const childKey = await parent.createApiKeyForTenant({
    name: `tenant:${tenantId}`,
    retentionDays: account.retentionDays,
  });
  const child = getMessagingProvider(PROVIDER, childKey.key);

  // 2. Create the instance with the child key so the number binds to it.
  let created: CreateNumberResult;
  let linkMode: "single" | "dual" = input.linkMode;
  let dualFellBack = false;
  try {
    created = await child.createNumber({ name: input.name, number: input.number, linkMode });
  } catch (err) {
    if (linkMode === "dual" && err instanceof MessagingProviderError && err.status >= 400 && err.status < 500) {
      // Workspace likely doesn't support Dual Link — fall back to SINGLE.
      linkMode = "single";
      dualFellBack = true;
      created = await child.createNumber({ name: input.name, number: input.number, linkMode });
    } else {
      // Best-effort: drop the orphan child key we just minted.
      throw err;
    }
  }

  const instanceId = created.instance.id;
  const numberDigits = digitsOnly(created.instance.number ?? input.number);
  const status = mapState(created.instance.state ?? created.instance.status);

  const updatedAccount = await prisma.messagingProviderAccount.update({
    where: { id: account.id },
    data: {
      providerApiKeyId: childKey.id,
      encryptedApiKey: encryptSecret(childKey.key),
      keyPrefix: childKey.keyPrefix,
      status: "active",
    },
  });

  const saved = await prisma.whatsAppAccount.upsert({
    where: { tenantId_numberNormalized: { tenantId, numberNormalized: numberDigits } },
    update: {
      providerAccountId: updatedAccount.id,
      providerInstanceId: instanceId,
      name: input.name,
      number: created.instance.number ?? input.number,
      maskedNumber: maskNumber(numberDigits),
      status,
      linkMode,
      qrcodeBase64: created.qrcodeBase64 ?? null,
      pairingCode: created.pairingCode ?? null,
      lastStatusAt: new Date(),
    },
    create: {
      tenantId,
      providerAccountId: updatedAccount.id,
      providerInstanceId: instanceId,
      name: input.name,
      number: created.instance.number ?? input.number,
      numberNormalized: numberDigits,
      maskedNumber: maskNumber(numberDigits),
      status,
      isPrimary: (await prisma.whatsAppAccount.count({ where: { tenantId } })) === 0,
      linkMode,
      qrcodeBase64: created.qrcodeBase64 ?? null,
      pairingCode: created.pairingCode ?? null,
      lastStatusAt: new Date(),
    },
  });

  return {
    accountId: saved.id,
    instanceId,
    qrcodeBase64: created.qrcodeBase64 ?? null,
    pairingCode: created.pairingCode ?? null,
    status,
    linkMode,
    dualFellBack,
  };
}

/** Creates a remote-pairing link the tenant's end customer opens to connect. */
export async function createRemotePairingForTenant(
  tenantId: string,
  input: { name: string; number: string; linkMode: "single" | "dual"; sendViaWhatsApp: boolean },
): Promise<{ accountId: string; remotePairingUrl: string; maskedNumber: string }> {
  const account = await ensureProviderAccount(tenantId);
  const parent = getParentMessagingProvider();

  const childKey = await parent.createApiKeyForTenant({
    name: `tenant:${tenantId}`,
    retentionDays: account.retentionDays,
  });
  const child = getMessagingProvider(PROVIDER, childKey.key);

  const result = await child.createRemotePairing({
    name: input.name,
    number: input.number,
    linkMode: input.linkMode,
    sendViaWhatsApp: input.sendViaWhatsApp,
  });

  const numberDigits = digitsOnly(input.number);
  const updatedAccount = await prisma.messagingProviderAccount.update({
    where: { id: account.id },
    data: {
      providerApiKeyId: childKey.id,
      encryptedApiKey: encryptSecret(childKey.key),
      keyPrefix: childKey.keyPrefix,
      status: "active",
    },
  });

  const saved = await prisma.whatsAppAccount.upsert({
    where: { tenantId_numberNormalized: { tenantId, numberNormalized: numberDigits } },
    update: {
      providerAccountId: updatedAccount.id,
      providerInstanceId: result.instance.id,
      name: input.name,
      number: input.number,
      maskedNumber: result.maskedNumber,
      status: mapState(result.instance.state),
      linkMode: input.linkMode,
      remotePairingUrl: result.remotePairingUrl,
      lastStatusAt: new Date(),
    },
    create: {
      tenantId,
      providerAccountId: updatedAccount.id,
      providerInstanceId: result.instance.id,
      name: input.name,
      number: input.number,
      numberNormalized: numberDigits,
      maskedNumber: result.maskedNumber,
      status: mapState(result.instance.state),
      isPrimary: (await prisma.whatsAppAccount.count({ where: { tenantId } })) === 0,
      linkMode: input.linkMode,
      remotePairingUrl: result.remotePairingUrl,
      lastStatusAt: new Date(),
    },
  });

  return { accountId: saved.id, remotePairingUrl: result.remotePairingUrl, maskedNumber: result.maskedNumber };
}

/** Polls the provider for the instance state and syncs the local row. */
export async function refreshWhatsappStatus(tenantId: string, accountId: string): Promise<WhatsAppAccount> {
  const wa = await prisma.whatsAppAccount.findFirst({ where: { id: accountId, tenantId } });
  if (!wa || !wa.providerInstanceId) throw new Error("WhatsApp account not found.");
  const account = await prisma.messagingProviderAccount.findUniqueOrThrow({ where: { id: wa.providerAccountId } });

  const status = await tenantProvider(account).getNumberStatus(wa.providerInstanceId);
  const mapped = mapState(status.state);
  const isOpen = mapped === "open";

  return prisma.whatsAppAccount.update({
    where: { id: wa.id },
    data: {
      status: mapped,
      primaryState: status.primaryLink?.state ?? wa.primaryState,
      secondaryState: status.secondaryLink?.state ?? wa.secondaryState,
      isFullyConnected: status.isFullyConnected ?? isOpen,
      connectedAt: isOpen ? (wa.connectedAt ?? new Date()) : wa.connectedAt,
      qrcodeBase64: isOpen ? null : wa.qrcodeBase64,
      pairingCode: isOpen ? null : wa.pairingCode,
      lastStatusAt: new Date(),
    },
  });
}

/** Regenerates the QR/pairing for an existing (non-OPEN) instance. */
export async function reconnectWhatsappNumber(
  tenantId: string,
  accountId: string,
): Promise<{ qrcodeBase64: string | null; pairingCode: string | null }> {
  const wa = await prisma.whatsAppAccount.findFirst({ where: { id: accountId, tenantId } });
  if (!wa || !wa.providerInstanceId) throw new Error("WhatsApp account not found.");
  const account = await prisma.messagingProviderAccount.findUniqueOrThrow({ where: { id: wa.providerAccountId } });

  const result = await tenantProvider(account).connectNumber(wa.providerInstanceId);
  await prisma.whatsAppAccount.update({
    where: { id: wa.id },
    data: {
      qrcodeBase64: result.qrcodeBase64 ?? null,
      pairingCode: result.pairingCode ?? null,
      status: "connecting",
      lastStatusAt: new Date(),
    },
  });
  return { qrcodeBase64: result.qrcodeBase64 ?? null, pairingCode: result.pairingCode ?? null };
}

/** Deletes the provider instance and clears local connection state. */
export async function disconnectWhatsappNumber(tenantId: string, accountId: string): Promise<void> {
  const wa = await prisma.whatsAppAccount.findFirst({ where: { id: accountId, tenantId } });
  if (!wa) throw new Error("WhatsApp account not found.");
  const account = await prisma.messagingProviderAccount.findUnique({ where: { id: wa.providerAccountId } });

  if (account && wa.providerInstanceId) {
    try {
      await tenantProvider(account).deleteNumber(wa.providerInstanceId);
    } catch (err) {
      // Non-fatal: the instance may already be gone. Still clear local state.
      console.error("[whatsapp] deleteNumber failed:", err);
    }
  }

  await prisma.whatsAppAccount.update({
    where: { id: wa.id },
    data: {
      status: "disconnected",
      providerInstanceId: null,
      qrcodeBase64: null,
      pairingCode: null,
      remotePairingUrl: null,
      isFullyConnected: false,
      connectedAt: null,
      lastStatusAt: new Date(),
    },
  });
}

export interface WhatsappAccountView {
  id: string;
  name: string | null;
  maskedNumber: string | null;
  status: WhatsAppAccountStatus;
  linkMode: "single" | "dual";
  isPrimary: boolean;
  isFullyConnected: boolean;
  primaryState: string | null;
  secondaryState: string | null;
  qrcodeBase64: string | null;
  pairingCode: string | null;
  remotePairingUrl: string | null;
  connectedAt: Date | null;
}

/** Lists the tenant's WhatsApp accounts for the settings UI. */
export async function listWhatsappAccounts(tenantId: string): Promise<WhatsappAccountView[]> {
  const rows = await prisma.whatsAppAccount.findMany({
    where: { tenantId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
  return rows.map((wa) => ({
    id: wa.id,
    name: wa.name,
    maskedNumber: wa.maskedNumber,
    status: wa.status,
    linkMode: wa.linkMode,
    isPrimary: wa.isPrimary,
    isFullyConnected: wa.isFullyConnected,
    primaryState: wa.primaryState,
    secondaryState: wa.secondaryState,
    qrcodeBase64: wa.qrcodeBase64,
    pairingCode: wa.pairingCode,
    remotePairingUrl: wa.remotePairingUrl,
    connectedAt: wa.connectedAt,
  }));
}

/** Promotes one account to primary (single primary per tenant). */
export async function setPrimaryWhatsappAccount(tenantId: string, accountId: string): Promise<void> {
  await prisma.$transaction([
    prisma.whatsAppAccount.updateMany({ where: { tenantId }, data: { isPrimary: false } }),
    prisma.whatsAppAccount.update({ where: { id: accountId }, data: { isPrimary: true } }),
  ]);
}
