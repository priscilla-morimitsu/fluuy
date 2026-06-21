-- CreateEnum
CREATE TYPE "ServiceAvailabilityRuleStatus" AS ENUM ('active', 'inactive');

-- CreateTable
CREATE TABLE "service_availability_rules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "professional_id" TEXT,
    "location_id" TEXT,
    "delivery_mode" "ServiceDeliveryMode" NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "slot_duration_minutes" INTEGER,
    "buffer_before_minutes" INTEGER NOT NULL DEFAULT 0,
    "buffer_after_minutes" INTEGER NOT NULL DEFAULT 0,
    "status" "ServiceAvailabilityRuleStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_availability_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_availability_rules_tenant_id_idx" ON "service_availability_rules"("tenant_id");

-- CreateIndex
CREATE INDEX "service_availability_rules_service_id_idx" ON "service_availability_rules"("service_id");

-- CreateIndex
CREATE INDEX "service_availability_rules_service_id_weekday_idx" ON "service_availability_rules"("service_id", "weekday");

-- AddForeignKey
ALTER TABLE "service_availability_rules" ADD CONSTRAINT "service_availability_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_availability_rules" ADD CONSTRAINT "service_availability_rules_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_availability_rules" ADD CONSTRAINT "service_availability_rules_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_availability_rules" ADD CONSTRAINT "service_availability_rules_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
