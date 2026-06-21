-- CreateEnum
CREATE TYPE "ProfessionalStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('physical_unit', 'room', 'office', 'store', 'clinic', 'other');

-- CreateEnum
CREATE TYPE "LocationStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "ServiceProfessionalStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "ServiceLocationStatus" AS ENUM ('active', 'inactive');

-- CreateTable
CREATE TABLE "professionals" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "status" "ProfessionalStatus" NOT NULL DEFAULT 'active',
    "custom_data" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professionals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LocationType" NOT NULL DEFAULT 'physical_unit',
    "address" JSONB,
    "status" "LocationStatus" NOT NULL DEFAULT 'active',
    "custom_data" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_professionals" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "delivery_modes" "ServiceDeliveryMode"[],
    "price_override" DECIMAL(12,2),
    "duration_override_minutes" INTEGER,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "status" "ServiceProfessionalStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_professionals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_locations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "status" "ServiceLocationStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "professionals_tenant_id_idx" ON "professionals"("tenant_id");

-- CreateIndex
CREATE INDEX "professionals_tenant_id_status_idx" ON "professionals"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "locations_tenant_id_idx" ON "locations"("tenant_id");

-- CreateIndex
CREATE INDEX "locations_tenant_id_status_idx" ON "locations"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "service_professionals_tenant_id_idx" ON "service_professionals"("tenant_id");

-- CreateIndex
CREATE INDEX "service_professionals_service_id_idx" ON "service_professionals"("service_id");

-- CreateIndex
CREATE INDEX "service_professionals_professional_id_idx" ON "service_professionals"("professional_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_professionals_service_id_professional_id_key" ON "service_professionals"("service_id", "professional_id");

-- CreateIndex
CREATE INDEX "service_locations_tenant_id_idx" ON "service_locations"("tenant_id");

-- CreateIndex
CREATE INDEX "service_locations_service_id_idx" ON "service_locations"("service_id");

-- CreateIndex
CREATE INDEX "service_locations_location_id_idx" ON "service_locations"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_locations_service_id_location_id_key" ON "service_locations"("service_id", "location_id");

-- AddForeignKey
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_professionals" ADD CONSTRAINT "service_professionals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_professionals" ADD CONSTRAINT "service_professionals_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_professionals" ADD CONSTRAINT "service_professionals_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_locations" ADD CONSTRAINT "service_locations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_locations" ADD CONSTRAINT "service_locations_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_locations" ADD CONSTRAINT "service_locations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
