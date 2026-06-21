-- CreateEnum
CREATE TYPE "CustomerLeadStatus" AS ENUM ('new', 'contacted', 'qualified', 'converted', 'discarded');

-- CreateTable
CREATE TABLE "customer_leads" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "phone_normalized" TEXT,
    "whatsapp" TEXT,
    "whatsapp_normalized" TEXT,
    "email" TEXT,
    "source" "CustomerSource",
    "status" "CustomerLeadStatus" NOT NULL DEFAULT 'new',
    "message" TEXT,
    "custom_data" JSONB NOT NULL DEFAULT '{}',
    "converted_customer_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_leads_tenant_id_idx" ON "customer_leads"("tenant_id");

-- CreateIndex
CREATE INDEX "customer_leads_tenant_id_status_idx" ON "customer_leads"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "customer_leads_tenant_id_whatsapp_normalized_idx" ON "customer_leads"("tenant_id", "whatsapp_normalized");

-- CreateIndex
CREATE UNIQUE INDEX "customer_leads_tenant_id_phone_normalized_key" ON "customer_leads"("tenant_id", "phone_normalized");

-- AddForeignKey
ALTER TABLE "customer_leads" ADD CONSTRAINT "customer_leads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
