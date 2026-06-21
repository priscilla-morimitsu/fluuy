-- CreateEnum
CREATE TYPE "MessagingProvider" AS ENUM ('pilot_status_whatsapp', 'meta_whatsapp', 'z_api', 'evolution_api', 'twilio', 'other');

-- CreateEnum
CREATE TYPE "MessagingEnvironment" AS ENUM ('test', 'live');

-- CreateEnum
CREATE TYPE "MessagingAccountStatus" AS ENUM ('active', 'inactive', 'error', 'pending_setup');

-- CreateEnum
CREATE TYPE "WhatsAppAccountStatus" AS ENUM ('connecting', 'open', 'close', 'disconnected', 'error', 'pending_pairing');

-- CreateEnum
CREATE TYPE "WhatsAppLinkMode" AS ENUM ('single', 'dual');

-- CreateEnum
CREATE TYPE "ConversationChannel" AS ENUM ('whatsapp');

-- CreateEnum
CREATE TYPE "ConversationTargetType" AS ENUM ('phone', 'group', 'newsletter');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('open', 'pending', 'resolved', 'archived', 'blocked');

-- CreateEnum
CREATE TYPE "ConversationAssigneeType" AS ENUM ('ai', 'human', 'paused', 'unassigned');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('inbound', 'outbound');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('text', 'template', 'button', 'system', 'group', 'newsletter', 'unknown');

-- CreateEnum
CREATE TYPE "MessageInternalStatus" AS ENUM ('queued', 'sent', 'delivered', 'read', 'failed', 'canceled', 'received');

-- CreateEnum
CREATE TYPE "TemplateCategory" AS ENUM ('otp', 'utility', 'marketing', 'unknown');

-- CreateEnum
CREATE TYPE "TemplateMappingStatus" AS ENUM ('draft', 'approved', 'rejected', 'pending', 'unknown');

-- CreateEnum
CREATE TYPE "WebhookProcessingStatus" AS ENUM ('received', 'processed', 'failed', 'ignored', 'duplicate');

-- CreateEnum
CREATE TYPE "MessageConsentStatus" AS ENUM ('unknown', 'opted_in', 'opted_out', 'required', 'not_required');

-- CreateTable
CREATE TABLE "messaging_provider_accounts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider" "MessagingProvider" NOT NULL DEFAULT 'pilot_status_whatsapp',
    "environment" "MessagingEnvironment" NOT NULL DEFAULT 'test',
    "provider_project_id" TEXT,
    "provider_api_key_id" TEXT,
    "encrypted_api_key" TEXT,
    "key_prefix" TEXT,
    "retention_days" INTEGER NOT NULL DEFAULT 30,
    "status" "MessagingAccountStatus" NOT NULL DEFAULT 'pending_setup',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messaging_provider_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_accounts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "provider_instance_id" TEXT,
    "name" TEXT,
    "number" TEXT,
    "number_normalized" TEXT,
    "masked_number" TEXT,
    "status" "WhatsAppAccountStatus" NOT NULL DEFAULT 'pending_pairing',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "link_mode" "WhatsAppLinkMode" NOT NULL DEFAULT 'dual',
    "primary_state" TEXT,
    "secondary_state" TEXT,
    "is_fully_connected" BOOLEAN NOT NULL DEFAULT false,
    "remote_pairing_url" TEXT,
    "qrcode_base64" TEXT,
    "pairing_code" TEXT,
    "last_status_at" TIMESTAMP(3),
    "connected_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "whatsapp_account_id" TEXT,
    "channel" "ConversationChannel" NOT NULL DEFAULT 'whatsapp',
    "target_type" "ConversationTargetType" NOT NULL DEFAULT 'phone',
    "target_id" TEXT,
    "target_name" TEXT,
    "contact_number" TEXT,
    "contact_number_normalized" TEXT,
    "group_id" TEXT,
    "newsletter_id" TEXT,
    "customer_id" TEXT,
    "lead_id" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'open',
    "assignee_type" "ConversationAssigneeType" NOT NULL DEFAULT 'unassigned',
    "assigned_user_id" TEXT,
    "assigned_agent_id" TEXT,
    "last_message_at" TIMESTAMP(3),
    "last_inbound_at" TIMESTAMP(3),
    "last_outbound_at" TIMESTAMP(3),
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "opt_in_status" "MessageConsentStatus" NOT NULL DEFAULT 'unknown',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_messages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "content" TEXT,
    "message_type" "MessageType" NOT NULL DEFAULT 'text',
    "internal_status" "MessageInternalStatus" NOT NULL DEFAULT 'queued',
    "provider_status" TEXT,
    "provider_message_id" TEXT,
    "provider_internal_message_id" TEXT,
    "provider_correlation_id" TEXT,
    "quoted_message_id" TEXT,
    "message_replied_id" TEXT,
    "template_mapping_id" TEXT,
    "variables" JSONB NOT NULL DEFAULT '{}',
    "from_number" TEXT,
    "to_number" TEXT,
    "sent_by_user_id" TEXT,
    "sent_by_agent" BOOLEAN NOT NULL DEFAULT false,
    "received_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_deliveries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "conversation_message_id" TEXT NOT NULL,
    "provider" "MessagingProvider" NOT NULL DEFAULT 'pilot_status_whatsapp',
    "provider_status" TEXT,
    "internal_status" "MessageInternalStatus" NOT NULL,
    "raw_event_id" TEXT,
    "happened_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_template_mappings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "provider_template_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "TemplateCategory" NOT NULL DEFAULT 'unknown',
    "language" TEXT,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "status" "TemplateMappingStatus" NOT NULL DEFAULT 'unknown',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_template_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_webhook_event_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "provider" "MessagingProvider" NOT NULL DEFAULT 'pilot_status_whatsapp',
    "provider_account_id" TEXT,
    "event_type" TEXT NOT NULL,
    "provider_event_id" TEXT,
    "correlation_id" TEXT,
    "message_id" TEXT,
    "internal_message_id" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "masked_payload" JSONB NOT NULL DEFAULT '{}',
    "processing_status" "WebhookProcessingStatus" NOT NULL DEFAULT 'received',
    "error_message" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "message_webhook_event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_consents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "lead_id" TEXT,
    "phone_normalized" TEXT NOT NULL,
    "channel" "ConversationChannel" NOT NULL DEFAULT 'whatsapp',
    "opt_in_status" "MessageConsentStatus" NOT NULL DEFAULT 'unknown',
    "opt_in_source" TEXT,
    "opt_in_at" TIMESTAMP(3),
    "opt_out_at" TIMESTAMP(3),
    "last_seen_at" TIMESTAMP(3),
    "provider_required" BOOLEAN,
    "provider_authorized" BOOLEAN,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_assignments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "assignee_type" "ConversationAssigneeType" NOT NULL,
    "assigned_user_id" TEXT,
    "assigned_agent_id" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "messaging_provider_accounts_tenant_id_idx" ON "messaging_provider_accounts"("tenant_id");

-- CreateIndex
CREATE INDEX "messaging_provider_accounts_tenant_id_status_idx" ON "messaging_provider_accounts"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "messaging_provider_accounts_tenant_id_provider_environment_key" ON "messaging_provider_accounts"("tenant_id", "provider", "environment");

-- CreateIndex
CREATE INDEX "whatsapp_accounts_tenant_id_idx" ON "whatsapp_accounts"("tenant_id");

-- CreateIndex
CREATE INDEX "whatsapp_accounts_tenant_id_status_idx" ON "whatsapp_accounts"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "whatsapp_accounts_provider_account_id_idx" ON "whatsapp_accounts"("provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_accounts_tenant_id_number_normalized_key" ON "whatsapp_accounts"("tenant_id", "number_normalized");

-- CreateIndex
CREATE INDEX "conversations_tenant_id_idx" ON "conversations"("tenant_id");

-- CreateIndex
CREATE INDEX "conversations_tenant_id_status_idx" ON "conversations"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "conversations_tenant_id_assignee_type_idx" ON "conversations"("tenant_id", "assignee_type");

-- CreateIndex
CREATE INDEX "conversations_tenant_id_last_message_at_idx" ON "conversations"("tenant_id", "last_message_at");

-- CreateIndex
CREATE INDEX "conversations_customer_id_idx" ON "conversations"("customer_id");

-- CreateIndex
CREATE INDEX "conversations_lead_id_idx" ON "conversations"("lead_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_tenant_id_contact_number_normalized_key" ON "conversations"("tenant_id", "contact_number_normalized");

-- CreateIndex
CREATE INDEX "conversation_messages_tenant_id_idx" ON "conversation_messages"("tenant_id");

-- CreateIndex
CREATE INDEX "conversation_messages_conversation_id_idx" ON "conversation_messages"("conversation_id");

-- CreateIndex
CREATE INDEX "conversation_messages_tenant_id_internal_status_idx" ON "conversation_messages"("tenant_id", "internal_status");

-- CreateIndex
CREATE INDEX "conversation_messages_provider_internal_message_id_idx" ON "conversation_messages"("provider_internal_message_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_messages_tenant_id_provider_message_id_key" ON "conversation_messages"("tenant_id", "provider_message_id");

-- CreateIndex
CREATE INDEX "message_deliveries_tenant_id_idx" ON "message_deliveries"("tenant_id");

-- CreateIndex
CREATE INDEX "message_deliveries_conversation_message_id_idx" ON "message_deliveries"("conversation_message_id");

-- CreateIndex
CREATE INDEX "message_template_mappings_tenant_id_idx" ON "message_template_mappings"("tenant_id");

-- CreateIndex
CREATE INDEX "message_template_mappings_provider_account_id_idx" ON "message_template_mappings"("provider_account_id");

-- CreateIndex
CREATE INDEX "message_template_mappings_tenant_id_category_idx" ON "message_template_mappings"("tenant_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "message_template_mappings_tenant_id_provider_template_id_key" ON "message_template_mappings"("tenant_id", "provider_template_id");

-- CreateIndex
CREATE INDEX "message_webhook_event_logs_tenant_id_idx" ON "message_webhook_event_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "message_webhook_event_logs_event_type_idx" ON "message_webhook_event_logs"("event_type");

-- CreateIndex
CREATE INDEX "message_webhook_event_logs_received_at_idx" ON "message_webhook_event_logs"("received_at");

-- CreateIndex
CREATE INDEX "message_webhook_event_logs_correlation_id_idx" ON "message_webhook_event_logs"("correlation_id");

-- CreateIndex
CREATE UNIQUE INDEX "message_webhook_event_logs_provider_provider_event_id_key" ON "message_webhook_event_logs"("provider", "provider_event_id");

-- CreateIndex
CREATE INDEX "message_consents_tenant_id_idx" ON "message_consents"("tenant_id");

-- CreateIndex
CREATE INDEX "message_consents_tenant_id_opt_in_status_idx" ON "message_consents"("tenant_id", "opt_in_status");

-- CreateIndex
CREATE UNIQUE INDEX "message_consents_tenant_id_channel_phone_normalized_key" ON "message_consents"("tenant_id", "channel", "phone_normalized");

-- CreateIndex
CREATE INDEX "conversation_assignments_tenant_id_idx" ON "conversation_assignments"("tenant_id");

-- CreateIndex
CREATE INDEX "conversation_assignments_conversation_id_idx" ON "conversation_assignments"("conversation_id");

-- AddForeignKey
ALTER TABLE "messaging_provider_accounts" ADD CONSTRAINT "messaging_provider_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_accounts" ADD CONSTRAINT "whatsapp_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_accounts" ADD CONSTRAINT "whatsapp_accounts_provider_account_id_fkey" FOREIGN KEY ("provider_account_id") REFERENCES "messaging_provider_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_whatsapp_account_id_fkey" FOREIGN KEY ("whatsapp_account_id") REFERENCES "whatsapp_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_template_mapping_id_fkey" FOREIGN KEY ("template_mapping_id") REFERENCES "message_template_mappings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_deliveries" ADD CONSTRAINT "message_deliveries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_deliveries" ADD CONSTRAINT "message_deliveries_conversation_message_id_fkey" FOREIGN KEY ("conversation_message_id") REFERENCES "conversation_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_template_mappings" ADD CONSTRAINT "message_template_mappings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_template_mappings" ADD CONSTRAINT "message_template_mappings_provider_account_id_fkey" FOREIGN KEY ("provider_account_id") REFERENCES "messaging_provider_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_webhook_event_logs" ADD CONSTRAINT "message_webhook_event_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_consents" ADD CONSTRAINT "message_consents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_assignments" ADD CONSTRAINT "conversation_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_assignments" ADD CONSTRAINT "conversation_assignments_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
