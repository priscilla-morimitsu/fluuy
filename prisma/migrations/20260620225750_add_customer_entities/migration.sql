-- CreateEnum
CREATE TYPE "CustomerEntityStatus" AS ENUM ('active', 'inactive');

-- CreateTable
CREATE TABLE "customer_entities" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CustomerEntityStatus" NOT NULL DEFAULT 'active',
    "custom_data" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_entities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_entities_tenant_id_idx" ON "customer_entities"("tenant_id");

-- CreateIndex
CREATE INDEX "customer_entities_customer_id_idx" ON "customer_entities"("customer_id");

-- CreateIndex
CREATE INDEX "customer_entities_tenant_id_entity_type_idx" ON "customer_entities"("tenant_id", "entity_type");

-- AddForeignKey
ALTER TABLE "customer_entities" ADD CONSTRAINT "customer_entities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_entities" ADD CONSTRAINT "customer_entities_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
