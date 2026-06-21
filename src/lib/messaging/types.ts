/**
 * Provider-agnostic messaging contract. UI and business logic depend ONLY on
 * this file — never on a concrete provider, its endpoints, or its SDK. Swapping
 * Pilot Status for Meta/Z-API/Twilio means writing one new MessagingProvider.
 */

export type ProviderEnvironment = "test" | "live";
export type ProviderLinkMode = "single" | "dual";

/** Internal, normalized message status. Decoupled from any providerStatus. */
export type NormalizedInternalStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "canceled"
  | "received";

// ── Sending ────────────────────────────────────────────────────────────────
export interface SendMessageInput {
  templateId: string;
  /** Exactly one of destinationNumber | groupId | newsletterId. */
  destinationNumber?: string;
  groupId?: string;
  newsletterId?: string;
  variables?: Record<string, string>;
  labels?: string[];
  deliverAt?: string;
  deliverUntil?: string;
  marketingOptions?: { aiRewriteEnabled?: boolean };
}

export interface SendMessageResult {
  id: string;
  correlationId?: string;
  status: string;
  createdAt: string;
  origin?: string;
}

export interface MessageStatusResult {
  id: string;
  status: string;
  correlationId?: string;
  destinationNumber?: string;
  template?: string;
  createdAt?: string;
  sentAt: string | null;
  readAt: string | null;
  errorMessage: string | null;
}

export interface CancelMessagesResult {
  cancelled: string[];
  failed: { id: string; reason: string }[];
}

// ── Targets ──────────────────────────────────────────────────────────────────
export interface ProviderGroup {
  id: string;
  name: string;
}
export interface ProviderNewsletter {
  id: string;
  name: string;
}

// ── API keys (child key per tenant) ──────────────────────────────────────────
export interface CreateApiKeyInput {
  name: string;
  retentionDays?: number;
  webhookId?: string | null;
  whatsappInstanceId?: string | null;
}
export interface CreateApiKeyResult {
  id: string;
  name: string;
  environment: "TEST" | "LIVE";
  /** Raw key — returned only once. Encrypt before persisting. */
  key: string;
  keyPrefix: string;
  createdAt: string;
  webhookId: string | null;
  whatsappInstanceId: string | null;
  retentionDays: number;
}

// ── Numbers / instances ──────────────────────────────────────────────────────
export interface ProviderLink {
  state: string;
  connectedAt?: string | null;
  qrcodeBase64?: string;
  pairingCode?: string;
}

export interface CreateNumberInput {
  name: string;
  number: string;
  linkToApiKey?: boolean;
  linkMode?: ProviderLinkMode;
}

export interface CreateNumberResult {
  instance: {
    id: string;
    instanceName?: string;
    number: string;
    name?: string;
    status?: string;
    state?: string;
  };
  qrcodeBase64?: string;
  pairingCode?: string;
  linkedApiKeyId?: string;
  primaryLink?: ProviderLink;
  secondaryLink?: ProviderLink | null;
}

export interface RemotePairingInput {
  name: string;
  number: string;
  linkToApiKey?: boolean;
  linkMode?: ProviderLinkMode;
  sendViaWhatsApp?: boolean;
}

export interface RemotePairingResult {
  instance: { id: string; state: string; number?: string };
  remotePairingUrl: string;
  maskedNumber: string;
  messageSent: boolean;
}

export interface NumberStatusResult {
  id: string;
  state: string;
  primaryLink?: ProviderLink;
  secondaryLink?: ProviderLink | null;
  isFullyConnected?: boolean;
}

export interface ConnectNumberResult {
  qrcodeBase64?: string;
  pairingCode?: string;
  secondaryLink?: ProviderLink | null;
}

export interface ProviderNumber {
  id: string;
  instanceName?: string;
  number: string;
  name?: string;
  linkMode?: string;
  primaryLink?: ProviderLink | null;
  secondaryLink?: ProviderLink | null;
  isFullyConnected?: boolean;
}

// ── Opt-in ───────────────────────────────────────────────────────────────────
export interface OptInResult {
  authorized: boolean;
  required: boolean;
  enabled: boolean;
  reason: string | null;
  firstOptInAt?: string;
  lastSeenAt?: string;
}

// ── Webhooks ─────────────────────────────────────────────────────────────────
/**
 * Normalized webhook event. The provider parses its raw payload into this shape
 * so the webhook route + processors stay provider-agnostic. `null` from
 * parseWebhook means "ignore" (unknown/irrelevant event) — respond 200.
 */
export type NormalizedWebhookEvent =
  | { type: "message.sent"; messageId: string; internalMessageId: string; destinationNumber?: string; content?: string; sentAt?: string; environment?: string; correlationId?: string }
  | { type: "message.delivered"; messageId: string; internalMessageId: string; deliveredAt?: string; environment?: string; correlationId?: string }
  | { type: "message.read"; messageId: string; internalMessageId: string; readAt?: string; environment?: string; correlationId?: string }
  | { type: "message.failed"; messageId: string; internalMessageId: string; errorMessage?: string; failedAt?: string; environment?: string; correlationId?: string }
  | { type: "message.received"; fromMe: boolean; from: string; destinationNumber?: string; content?: string; receivedAt?: string; messageId: string; environment?: string; correlationId?: string }
  | { type: "message.reply"; from: string; destinationNumber?: string; content?: string; replyContent?: string; receivedAt?: string; messageId: string; quotedMessageId?: string; messageRepliedId?: string; buttonId?: string; environment?: string; correlationId?: string }
  | { type: "message.group"; fromNumber?: string; fromName?: string; fromMe: boolean; groupId?: string; groupName?: string; content?: string; messageId: string; environment?: string }
  | { type: "number.connected"; instanceId?: string; number?: string; environment?: string };

// ── The contract ─────────────────────────────────────────────────────────────
export interface MessagingProvider {
  readonly name: string;

  // Outbound
  sendMessage(input: SendMessageInput): Promise<SendMessageResult>;
  getMessageStatus(messageId: string): Promise<MessageStatusResult>;
  cancelMessages(messageIds: string[]): Promise<CancelMessagesResult>;

  // Targets
  listGroups(): Promise<ProviderGroup[]>;
  listNewsletters(): Promise<ProviderNewsletter[]>;

  // Numbers / instances
  listNumbers(): Promise<ProviderNumber[]>;
  createNumber(input: CreateNumberInput): Promise<CreateNumberResult>;
  createRemotePairing(input: RemotePairingInput): Promise<RemotePairingResult>;
  getNumberStatus(instanceId: string, link?: "primary" | "secondary"): Promise<NumberStatusResult>;
  connectNumber(instanceId: string, link?: "primary" | "secondary"): Promise<ConnectNumberResult>;
  upgradeToDual(instanceId: string): Promise<{ secondaryLink: ProviderLink }>;
  deleteNumber(instanceId: string): Promise<void>;

  // Credentials
  createApiKeyForTenant(input: CreateApiKeyInput): Promise<CreateApiKeyResult>;

  // Compliance
  verifyOptIn(destinationNumber: string): Promise<OptInResult>;

  // Webhooks
  parseWebhook(payload: unknown): NormalizedWebhookEvent | null;
  mapProviderStatus(providerStatus: string): NormalizedInternalStatus;
}
