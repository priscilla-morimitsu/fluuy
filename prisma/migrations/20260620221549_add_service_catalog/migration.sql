-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('draft', 'active', 'inactive');

-- CreateEnum
CREATE TYPE "ServiceCategoryStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "ServiceDeliveryMode" AS ENUM ('at_location', 'at_home', 'online');

-- CreateTable
CREATE TABLE "service_categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "ServiceCategoryStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "category_id" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "base_price" DECIMAL(12,2) NOT NULL,
    "promotional_price" DECIMAL(12,2),
    "estimated_duration_minutes" INTEGER,
    "status" "ServiceStatus" NOT NULL DEFAULT 'draft',
    "available_for_booking" BOOLEAN NOT NULL DEFAULT true,
    "requires_scheduling" BOOLEAN NOT NULL DEFAULT true,
    "delivery_modes" "ServiceDeliveryMode"[],
    "online_instructions" TEXT,
    "home_service_notes" TEXT,
    "image_url" TEXT,
    "internal_notes" TEXT,
    "custom_data" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_categories_tenant_id_idx" ON "service_categories"("tenant_id");

-- CreateIndex
CREATE INDEX "service_categories_tenant_id_status_idx" ON "service_categories"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "service_categories_tenant_id_slug_key" ON "service_categories"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "services_tenant_id_idx" ON "services"("tenant_id");

-- CreateIndex
CREATE INDEX "services_tenant_id_status_idx" ON "services"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "services_tenant_id_category_id_idx" ON "services"("tenant_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "services_tenant_id_slug_key" ON "services"("tenant_id", "slug");

-- AddForeignKey
ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
