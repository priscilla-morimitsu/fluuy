-- CreateEnum
CREATE TYPE "AppointmentResponsibleType" AS ENUM ('professional', 'tenant');

-- CreateEnum
CREATE TYPE "AppointmentModality" AS ENUM ('at_location', 'at_home', 'online');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('requested', 'pending_confirmation', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled');

-- CreateEnum
CREATE TYPE "AppointmentSource" AS ENUM ('manual', 'whatsapp', 'order', 'ai', 'api', 'other');

-- CreateEnum
CREATE TYPE "AppointmentReminderChannel" AS ENUM ('whatsapp', 'email', 'sms', 'internal');

-- CreateEnum
CREATE TYPE "AppointmentReminderStatus" AS ENUM ('pending', 'sent', 'failed', 'cancelled');

-- AlterEnum
ALTER TYPE "TemplateEntityType" ADD VALUE 'appointment';

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "customer_entity_id" TEXT,
    "service_id" TEXT NOT NULL,
    "responsible_type" "AppointmentResponsibleType" NOT NULL,
    "professional_id" TEXT,
    "location_id" TEXT,
    "order_id" TEXT,
    "order_item_id" TEXT,
    "modality" "AppointmentModality" NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'requested',
    "source" "AppointmentSource" NOT NULL DEFAULT 'manual',
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "address_snapshot" JSONB,
    "customer_notes" TEXT,
    "internal_notes" TEXT,
    "rescheduled_from_id" TEXT,
    "custom_data" JSONB NOT NULL DEFAULT '{}',
    "created_by_user_id" TEXT,
    "created_by_agent" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "no_show_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_status_history" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "from_status" "AppointmentStatus",
    "to_status" "AppointmentStatus" NOT NULL,
    "changed_by_user_id" TEXT,
    "changed_by_agent" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_reminders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "channel" "AppointmentReminderChannel" NOT NULL,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentReminderStatus" NOT NULL DEFAULT 'pending',
    "sent_at" TIMESTAMP(3),
    "error_message" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointments_tenant_id_idx" ON "appointments"("tenant_id");

-- CreateIndex
CREATE INDEX "appointments_tenant_id_start_at_idx" ON "appointments"("tenant_id", "start_at");

-- CreateIndex
CREATE INDEX "appointments_tenant_id_status_idx" ON "appointments"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "appointments_tenant_id_customer_id_idx" ON "appointments"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "appointments_tenant_id_service_id_idx" ON "appointments"("tenant_id", "service_id");

-- CreateIndex
CREATE INDEX "appointments_tenant_id_professional_id_idx" ON "appointments"("tenant_id", "professional_id");

-- CreateIndex
CREATE INDEX "appointments_tenant_id_location_id_idx" ON "appointments"("tenant_id", "location_id");

-- CreateIndex
CREATE INDEX "appointments_tenant_id_order_id_idx" ON "appointments"("tenant_id", "order_id");

-- CreateIndex
CREATE INDEX "appointment_status_history_tenant_id_appointment_id_idx" ON "appointment_status_history"("tenant_id", "appointment_id");

-- CreateIndex
CREATE INDEX "appointment_reminders_tenant_id_appointment_id_idx" ON "appointment_reminders"("tenant_id", "appointment_id");

-- CreateIndex
CREATE INDEX "appointment_reminders_tenant_id_scheduled_for_status_idx" ON "appointment_reminders"("tenant_id", "scheduled_for", "status");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_status_history" ADD CONSTRAINT "appointment_status_history_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_reminders" ADD CONSTRAINT "appointment_reminders_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
