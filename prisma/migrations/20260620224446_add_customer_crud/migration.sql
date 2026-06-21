-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('active', 'inactive', 'blocked');

-- CreateEnum
CREATE TYPE "CustomerPersonType" AS ENUM ('individual', 'company');

-- CreateEnum
CREATE TYPE "CustomerSource" AS ENUM ('whatsapp', 'instagram', 'website', 'referral', 'manual', 'import', 'other');

-- CreateEnum
CREATE TYPE "CustomerAddressType" AS ENUM ('main', 'delivery', 'billing', 'home_service', 'other');

-- CreateEnum
CREATE TYPE "CustomerTagStatus" AS ENUM ('active', 'inactive');

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "lead_id" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phone_normalized" TEXT NOT NULL,
    "whatsapp" TEXT,
    "whatsapp_normalized" TEXT,
    "email" TEXT,
    "person_type" "CustomerPersonType",
    "document" TEXT,
    "document_normalized" TEXT,
    "birth_date" TIMESTAMP(3),
    "status" "CustomerStatus" NOT NULL DEFAULT 'active',
    "source" "CustomerSource",
    "consent_accepted_at" TIMESTAMP(3),
    "consent_source" TEXT,
    "internal_notes" TEXT,
    "custom_data" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_addresses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "type" "CustomerAddressType" NOT NULL DEFAULT 'main',
    "name" TEXT,
    "zip_code" TEXT,
    "street" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Brasil',
    "reference" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "custom_data" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_tags" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT,
    "description" TEXT,
    "status" "CustomerTagStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_tag_assignments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_tag_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customers_tenant_id_idx" ON "customers"("tenant_id");

-- CreateIndex
CREATE INDEX "customers_tenant_id_status_idx" ON "customers"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "customers_tenant_id_whatsapp_normalized_idx" ON "customers"("tenant_id", "whatsapp_normalized");

-- CreateIndex
CREATE UNIQUE INDEX "customers_tenant_id_phone_normalized_key" ON "customers"("tenant_id", "phone_normalized");

-- CreateIndex
CREATE INDEX "customer_addresses_tenant_id_idx" ON "customer_addresses"("tenant_id");

-- CreateIndex
CREATE INDEX "customer_addresses_customer_id_idx" ON "customer_addresses"("customer_id");

-- CreateIndex
CREATE INDEX "customer_tags_tenant_id_idx" ON "customer_tags"("tenant_id");

-- CreateIndex
CREATE INDEX "customer_tags_tenant_id_status_idx" ON "customer_tags"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "customer_tags_tenant_id_slug_key" ON "customer_tags"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "customer_tag_assignments_tenant_id_idx" ON "customer_tag_assignments"("tenant_id");

-- CreateIndex
CREATE INDEX "customer_tag_assignments_customer_id_idx" ON "customer_tag_assignments"("customer_id");

-- CreateIndex
CREATE INDEX "customer_tag_assignments_tag_id_idx" ON "customer_tag_assignments"("tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_tag_assignments_customer_id_tag_id_key" ON "customer_tag_assignments"("customer_id", "tag_id");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_tag_assignments" ADD CONSTRAINT "customer_tag_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_tag_assignments" ADD CONSTRAINT "customer_tag_assignments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_tag_assignments" ADD CONSTRAINT "customer_tag_assignments_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "customer_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
