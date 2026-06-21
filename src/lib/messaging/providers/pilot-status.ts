import "server-only";

import { MessagingProviderError } from "../errors";
import { toE164 } from "../phone";
import type {
  CancelMessagesResult,
  ConnectNumberResult,
  CreateApiKeyInput,
  CreateApiKeyResult,
  CreateNumberInput,
  CreateNumberResult,
  MessageStatusResult,
  MessagingProvider,
  NormalizedInternalStatus,
  NormalizedWebhookEvent,
  NumberStatusResult,
  OptInResult,
  ProviderGroup,
  ProviderLink,
  ProviderNewsletter,
  ProviderNumber,
  RemotePairingInput,
  RemotePairingResult,
  SendMessageInput,
  SendMessageResult,
} from "../types";

const DEFAULT_BASE_URL = "https://pilotstatus.online/v1";
const MAX_RETRIES = 2;
const TIMEOUT_MS = 30_000;

interface PilotStatusOptions {
  apiKey: string;
  baseUrl?: string;
}

/**
 * Concrete Pilot Status WhatsApp provider. The ONLY place allowed to know Pilot
 * Status endpoints, payload shapes and error codes. Implemented over fetch
 * (the SDK 0.1.3 doesn't cover the whole API and would add a partial dep).
 *
 * One instance carries one API key: construct with the parent/master key (ENV)
 * for instance/key management, or with a tenant's child key for sending.
 */
export class PilotStatusWhatsAppProvider implements MessagingProvider {
  readonly name = "pilot_status_whatsapp";
  readonly #apiKey: string;
  readonly #baseUrl: string;

  constructor({ apiKey, baseUrl }: PilotStatusOptions) {
    if (!apiKey) throw new Error("Pilot Status apiKey is required.");
    this.#apiKey = apiKey;
    this.#baseUrl = baseUrl ?? DEFAULT_BASE_URL;
  }

  // ── transport ──────────────────────────────────────────────────────────────
  async #request<T>(
    method: "GET" | "POST" | "DELETE",
    path: string,
    body?: unknown,
  ): Promise<T> {
    let lastError: MessagingProviderError | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch(`${this.#baseUrl}${path}`, {
          method,
          headers: {
            "x-api-key": this.#apiKey,
            ...(body ? { "content-type": "application/json" } : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
          cache: "no-store",
        });
      } catch (cause) {
        // Network/abort error — treat as retriable transport failure.
        lastError = new MessagingProviderError(
          `Pilot Status request failed: ${path}`,
          0,
          null,
          cause,
          true,
        );
        clearTimeout(timeout);
        if (attempt < MAX_RETRIES) {
          await sleep(backoffMs(attempt));
          continue;
        }
        throw lastError;
      }
      clearTimeout(timeout);

      const payload = await safeJson(res);
      if (res.ok) return payload as T;

      const code = extractCode(payload);
      const retriable = res.status === 429 || res.status >= 500;
      lastError = new MessagingProviderError(
        extractMessage(payload) ?? `Pilot Status error ${res.status} on ${path}`,
        res.status,
        code,
        payload,
        retriable,
      );

      if (retriable && attempt < MAX_RETRIES) {
        await sleep(backoffMs(attempt));
        continue;
      }
      throw lastError;
    }

    // Unreachable, but keeps the type checker happy.
    throw lastError ?? new MessagingProviderError(`Pilot Status request failed: ${path}`, 0);
  }

  // ── outbound ─────────────────────────────────────────────────────────────────
  sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
    const destinations = [input.destinationNumber, input.groupId, input.newsletterId].filter(Boolean);
    if (destinations.length !== 1) {
      throw new MessagingProviderError(
        "Exactly one of destinationNumber, groupId or newsletterId is required.",
        400,
        "INVALID_DESTINATION",
      );
    }
    const body: Record<string, unknown> = { templateId: input.templateId };
    if (input.destinationNumber) body.destinationNumber = toE164(input.destinationNumber);
    if (input.groupId) body.groupId = input.groupId;
    if (input.newsletterId) body.newsletterId = input.newsletterId;
    if (input.variables) body.variables = input.variables;
    if (input.labels) body.labels = input.labels;
    if (input.deliverAt) body.deliverAt = input.deliverAt;
    if (input.deliverUntil) body.deliverUntil = input.deliverUntil;
    if (input.marketingOptions) body.marketingOptions = input.marketingOptions;
    return this.#request<SendMessageResult>("POST", "/messages/send", body);
  }

  getMessageStatus(messageId: string): Promise<MessageStatusResult> {
    return this.#request<MessageStatusResult>("GET", `/messages/${encodeURIComponent(messageId)}`);
  }

  cancelMessages(messageIds: string[]): Promise<CancelMessagesResult> {
    return this.#request<CancelMessagesResult>("DELETE", "/messages/cancel", { messageIds });
  }

  // ── targets ──────────────────────────────────────────────────────────────────
  async listGroups(): Promise<ProviderGroup[]> {
    const res = await this.#request<{ groups: ProviderGroup[] }>("GET", "/groups");
    return res.groups ?? [];
  }

  async listNewsletters(): Promise<ProviderNewsletter[]> {
    const res = await this.#request<{ newsletters: ProviderNewsletter[] }>("GET", "/newsletters");
    return res.newsletters ?? [];
  }

  // ── numbers ──────────────────────────────────────────────────────────────────
  listNumbers(): Promise<ProviderNumber[]> {
    return this.#request<ProviderNumber[]>("GET", "/numbers");
  }

  createNumber(input: CreateNumberInput): Promise<CreateNumberResult> {
    return this.#request<CreateNumberResult>("POST", "/numbers", {
      name: input.name,
      number: toE164(input.number),
      linkToApiKey: input.linkToApiKey ?? true,
      linkMode: (input.linkMode ?? "dual").toUpperCase(),
    });
  }

  createRemotePairing(input: RemotePairingInput): Promise<RemotePairingResult> {
    return this.#request<RemotePairingResult>("POST", "/numbers/remote-pairing", {
      name: input.name,
      number: toE164(input.number),
      linkToApiKey: input.linkToApiKey ?? true,
      linkMode: (input.linkMode ?? "dual").toUpperCase(),
      sendViaWhatsApp: input.sendViaWhatsApp ?? false,
    });
  }

  getNumberStatus(instanceId: string, link: "primary" | "secondary" = "primary"): Promise<NumberStatusResult> {
    return this.#request<NumberStatusResult>(
      "GET",
      `/numbers/${encodeURIComponent(instanceId)}/status?link=${link}`,
    );
  }

  connectNumber(instanceId: string, link: "primary" | "secondary" = "primary"): Promise<ConnectNumberResult> {
    return this.#request<ConnectNumberResult>(
      "GET",
      `/numbers/${encodeURIComponent(instanceId)}/connect?link=${link}`,
    );
  }

  upgradeToDual(instanceId: string): Promise<{ secondaryLink: ProviderLink }> {
    return this.#request<{ secondaryLink: ProviderLink }>(
      "POST",
      `/numbers/${encodeURIComponent(instanceId)}/upgrade-to-dual`,
    );
  }

  async deleteNumber(instanceId: string): Promise<void> {
    await this.#request<unknown>("DELETE", `/numbers/${encodeURIComponent(instanceId)}`);
  }

  // ── credentials ──────────────────────────────────────────────────────────────
  createApiKeyForTenant(input: CreateApiKeyInput): Promise<CreateApiKeyResult> {
    return this.#request<CreateApiKeyResult>("POST", "/api-keys", {
      name: input.name,
      retentionDays: input.retentionDays ?? 30,
      webhookId: input.webhookId ?? null,
      whatsappInstanceId: input.whatsappInstanceId ?? null,
    });
  }

  // ── compliance ───────────────────────────────────────────────────────────────
  verifyOptIn(destinationNumber: string): Promise<OptInResult> {
    const param = encodeURIComponent(toE164(destinationNumber));
    return this.#request<OptInResult>("GET", `/messages/opt-in?destinationNumber=${param}`);
  }

  // ── webhooks ─────────────────────────────────────────────────────────────────
  parseWebhook(payload: unknown): NormalizedWebhookEvent | null {
    return parsePilotStatusWebhook(payload);
  }

  mapProviderStatus(providerStatus: string): NormalizedInternalStatus {
    return mapPilotStatusStatus(providerStatus);
  }
}

/**
 * Standalone webhook parser — usable from the webhook route, which has no tenant
 * API key to instantiate the provider class. Returns null for unknown/ignored
 * events (respond 200). Pilot Status posts `{ event, data }`.
 */
export function parsePilotStatusWebhook(payload: unknown): NormalizedWebhookEvent | null {
  {
    if (!isRecord(payload)) return null;
    const eventType = str(payload.event) ?? str(payload.type);
    const data = isRecord(payload.data) ? payload.data : payload;
    if (!eventType) return null;

    switch (eventType) {
      case "message.sent":
        return {
          type: "message.sent",
          messageId: str(data.messageId) ?? "",
          internalMessageId: str(data.internalMessageId) ?? "",
          destinationNumber: str(data.destinationNumber),
          content: str(data.content),
          sentAt: str(data.sentAt),
          environment: str(data.environment),
          correlationId: str(data.correlationId),
        };
      case "message.delivered":
        return {
          type: "message.delivered",
          messageId: str(data.messageId) ?? "",
          internalMessageId: str(data.internalMessageId) ?? "",
          deliveredAt: str(data.deliveredAt),
          environment: str(data.environment),
          correlationId: str(data.correlationId),
        };
      case "message.read":
        return {
          type: "message.read",
          messageId: str(data.messageId) ?? "",
          internalMessageId: str(data.internalMessageId) ?? "",
          readAt: str(data.readAt),
          environment: str(data.environment),
          correlationId: str(data.correlationId),
        };
      case "message.failed":
        return {
          type: "message.failed",
          messageId: str(data.messageId) ?? "",
          internalMessageId: str(data.internalMessageId) ?? "",
          errorMessage: str(data.errorMessage),
          failedAt: str(data.failedAt),
          environment: str(data.environment),
          correlationId: str(data.correlationId),
        };
      case "message.received":
        return {
          type: "message.received",
          fromMe: data.fromMe === true,
          from: str(data.from) ?? "",
          destinationNumber: str(data.destinationNumber),
          content: str(data.content),
          receivedAt: str(data.receivedAt),
          messageId: str(data.messageId) ?? "",
          environment: str(data.environment),
          correlationId: str(data.correlationId),
        };
      case "message.reply":
        return {
          type: "message.reply",
          from: str(data.from) ?? "",
          destinationNumber: str(data.destinationNumber),
          content: str(data.content),
          replyContent: str(data.replyContent),
          receivedAt: str(data.receivedAt),
          messageId: str(data.messageId) ?? "",
          quotedMessageId: str(data.quotedMessageId),
          messageRepliedId: str(data.messageRepliedId),
          buttonId: str(data.buttonId),
          environment: str(data.environment),
          correlationId: str(data.correlationId),
        };
      case "message.group":
        return {
          type: "message.group",
          fromNumber: str(data.fromNumber),
          fromName: str(data.fromName),
          fromMe: data.fromMe === true,
          groupId: str(data.groupId),
          groupName: str(data.groupName),
          content: str(data.content),
          messageId: str(data.messageId) ?? "",
          environment: str(data.environment),
        };
      case "number.connected":
        return {
          type: "number.connected",
          instanceId: str(data.instanceId) ?? str(data.id),
          number: str(data.number),
          environment: str(data.environment),
        };
      default:
        return null; // unknown / message.newsletter → ignore
    }
  }
}

export function mapPilotStatusStatus(providerStatus: string): NormalizedInternalStatus {
  switch (providerStatus.toUpperCase()) {
    case "QUEUED":
      return "queued";
    case "SENT":
      return "sent";
    case "DELIVERED":
      return "delivered";
    case "READ":
      return "read";
    case "FAILED":
      return "failed";
    case "CANCELED":
    case "CANCELLED":
      return "canceled";
    case "RECEIVED":
      return "received";
    default:
      return "queued";
  }
}

// ── helpers ────────────────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function backoffMs(attempt: number): number {
  return 250 * 2 ** attempt;
}
async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
function extractCode(payload: unknown): string | null {
  if (isRecord(payload) && typeof payload.code === "string") return payload.code;
  return null;
}
function extractMessage(payload: unknown): string | null {
  if (isRecord(payload)) {
    if (typeof payload.message === "string") return payload.message;
    if (typeof payload.error === "string") return payload.error;
  }
  return null;
}
