-- CreateEnum
CREATE TYPE "PetStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "PetSex" AS ENUM ('male', 'female');

-- CreateTable
CREATE TABLE "pets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" TEXT,
    "breed" TEXT,
    "birth_date" TIMESTAMP(3),
    "size" TEXT,
    "sex" "PetSex",
    "weight_kg" DECIMAL(6,2),
    "neutered" BOOLEAN,
    "temperament" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "health_notes" TEXT,
    "status" "PetStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pets_tenant_id_idx" ON "pets"("tenant_id");

-- CreateIndex
CREATE INDEX "pets_customer_id_idx" ON "pets"("customer_id");

-- CreateIndex
CREATE INDEX "pets_tenant_id_status_idx" ON "pets"("tenant_id", "status");

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
