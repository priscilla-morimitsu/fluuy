-- CreateEnum
CREATE TYPE "OfferPlanType" AS ENUM ('recurring_plan', 'prepaid_package', 'combo');

-- CreateEnum
CREATE TYPE "OfferPlanStatus" AS ENUM ('draft', 'active', 'inactive');

-- CreateEnum
CREATE TYPE "OfferPlanBillingCycle" AS ENUM ('monthly', 'quarterly', 'semiannual', 'yearly');

-- CreateEnum
CREATE TYPE "OfferPlanCategoryStatus" AS ENUM ('active', 'inactive');

-- CreateTable
CREATE TABLE "offer_plan_categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "OfferPlanCategoryStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offer_plan_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_plans" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "category_id" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "type" "OfferPlanType" NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "promotional_price" DECIMAL(12,2),
    "billing_cycle" "OfferPlanBillingCycle",
    "auto_renew" BOOLEAN NOT NULL DEFAULT false,
    "expires_after_days" INTEGER,
    "usage_limit" INTEGER,
    "allow_scheduling" BOOLEAN NOT NULL DEFAULT true,
    "status" "OfferPlanStatus" NOT NULL DEFAULT 'draft',
    "available_for_sale" BOOLEAN NOT NULL DEFAULT true,
    "image_url" TEXT,
    "internal_notes" TEXT,
    "custom_data" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offer_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_plan_service_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "offer_plan_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "usage_limit" INTEGER,
    "duration_override_minutes" INTEGER,
    "price_override" DECIMAL(12,2),
    "included" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offer_plan_service_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_plan_product_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "offer_plan_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "usage_limit" INTEGER,
    "price_override" DECIMAL(12,2),
    "included" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offer_plan_product_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "offer_plan_categories_tenant_id_idx" ON "offer_plan_categories"("tenant_id");

-- CreateIndex
CREATE INDEX "offer_plan_categories_tenant_id_status_idx" ON "offer_plan_categories"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "offer_plan_categories_tenant_id_slug_key" ON "offer_plan_categories"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "offer_plans_tenant_id_idx" ON "offer_plans"("tenant_id");

-- CreateIndex
CREATE INDEX "offer_plans_tenant_id_status_idx" ON "offer_plans"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "offer_plans_tenant_id_type_idx" ON "offer_plans"("tenant_id", "type");

-- CreateIndex
CREATE INDEX "offer_plans_tenant_id_category_id_idx" ON "offer_plans"("tenant_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "offer_plans_tenant_id_slug_key" ON "offer_plans"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "offer_plan_service_items_tenant_id_idx" ON "offer_plan_service_items"("tenant_id");

-- CreateIndex
CREATE INDEX "offer_plan_service_items_offer_plan_id_idx" ON "offer_plan_service_items"("offer_plan_id");

-- CreateIndex
CREATE INDEX "offer_plan_service_items_service_id_idx" ON "offer_plan_service_items"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "offer_plan_service_items_offer_plan_id_service_id_key" ON "offer_plan_service_items"("offer_plan_id", "service_id");

-- CreateIndex
CREATE INDEX "offer_plan_product_items_tenant_id_idx" ON "offer_plan_product_items"("tenant_id");

-- CreateIndex
CREATE INDEX "offer_plan_product_items_offer_plan_id_idx" ON "offer_plan_product_items"("offer_plan_id");

-- CreateIndex
CREATE INDEX "offer_plan_product_items_product_id_idx" ON "offer_plan_product_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "offer_plan_product_items_offer_plan_id_product_id_key" ON "offer_plan_product_items"("offer_plan_id", "product_id");

-- AddForeignKey
ALTER TABLE "offer_plan_categories" ADD CONSTRAINT "offer_plan_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_plans" ADD CONSTRAINT "offer_plans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_plans" ADD CONSTRAINT "offer_plans_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "offer_plan_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_plan_service_items" ADD CONSTRAINT "offer_plan_service_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_plan_service_items" ADD CONSTRAINT "offer_plan_service_items_offer_plan_id_fkey" FOREIGN KEY ("offer_plan_id") REFERENCES "offer_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_plan_service_items" ADD CONSTRAINT "offer_plan_service_items_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_plan_product_items" ADD CONSTRAINT "offer_plan_product_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_plan_product_items" ADD CONSTRAINT "offer_plan_product_items_offer_plan_id_fkey" FOREIGN KEY ("offer_plan_id") REFERENCES "offer_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_plan_product_items" ADD CONSTRAINT "offer_plan_product_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
