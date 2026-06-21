-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('whatsapp', 'manual', 'instagram', 'website', 'api', 'other');

-- CreateEnum
CREATE TYPE "OrderChannel" AS ENUM ('whatsapp', 'panel', 'api', 'other');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('draft', 'pending_confirmation', 'confirmed', 'scheduled', 'in_progress', 'ready', 'out_for_delivery', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "OrderFulfillmentType" AS ENUM ('delivery', 'pickup', 'at_location', 'at_home', 'online');

-- CreateEnum
CREATE TYPE "OrderDiscountType" AS ENUM ('fixed', 'percentage');

-- CreateEnum
CREATE TYPE "OrderPaymentMethod" AS ENUM ('pix', 'credit_card', 'debit_card', 'cash', 'bank_transfer', 'payment_link', 'other');

-- CreateEnum
CREATE TYPE "OrderPaymentStatus" AS ENUM ('pending', 'paid', 'partial', 'refunded', 'cancelled', 'failed');

-- CreateEnum
CREATE TYPE "OrderItemType" AS ENUM ('product', 'service', 'offer_plan', 'custom');

-- CreateEnum
CREATE TYPE "OrderAddressType" AS ENUM ('delivery', 'pickup', 'at_location', 'at_home', 'billing', 'other');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('mercado_pago', 'manual');

-- AlterEnum
ALTER TYPE "TemplateEntityType" ADD VALUE 'order';

-- CreateTable
CREATE TABLE "order_sequences" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "next_number" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_number" INTEGER NOT NULL,
    "order_code" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "source" "OrderSource" NOT NULL,
    "channel" "OrderChannel" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'draft',
    "fulfillment_type" "OrderFulfillmentType",
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_type" "OrderDiscountType",
    "discount_value" DECIMAL(12,2),
    "delivery_fee" DECIMAL(12,2),
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payment_method" "OrderPaymentMethod",
    "payment_status" "OrderPaymentStatus" NOT NULL DEFAULT 'pending',
    "amount_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "customer_notes" TEXT,
    "internal_notes" TEXT,
    "custom_data" JSONB NOT NULL DEFAULT '{}',
    "confirmed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "created_by_agent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "item_type" "OrderItemType" NOT NULL,
    "product_id" TEXT,
    "service_id" TEXT,
    "offer_plan_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "discount_value" DECIMAL(12,2),
    "total" DECIMAL(12,2) NOT NULL,
    "scheduled_start_at" TIMESTAMP(3),
    "scheduled_end_at" TIMESTAMP(3),
    "appointment_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_addresses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "customer_address_id" TEXT,
    "type" "OrderAddressType" NOT NULL,
    "name" TEXT,
    "zip_code" TEXT,
    "street" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'BR',
    "reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_payments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'manual',
    "method" "OrderPaymentMethod" NOT NULL,
    "status" "OrderPaymentStatus" NOT NULL DEFAULT 'pending',
    "amount" DECIMAL(12,2) NOT NULL,
    "amount_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "provider_payment_id" TEXT,
    "provider_preference_id" TEXT,
    "provider_status" TEXT,
    "payment_url" TEXT,
    "qr_code" TEXT,
    "qr_code_base64" TEXT,
    "expires_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "raw_provider_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "from_status" "OrderStatus",
    "to_status" "OrderStatus" NOT NULL,
    "changed_by_user_id" TEXT,
    "changed_by_agent" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_sequences_tenant_id_key" ON "order_sequences"("tenant_id");

-- CreateIndex
CREATE INDEX "orders_tenant_id_idx" ON "orders"("tenant_id");

-- CreateIndex
CREATE INDEX "orders_tenant_id_status_idx" ON "orders"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "orders_tenant_id_payment_status_idx" ON "orders"("tenant_id", "payment_status");

-- CreateIndex
CREATE INDEX "orders_tenant_id_customer_id_idx" ON "orders"("tenant_id", "customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_tenant_id_order_number_key" ON "orders"("tenant_id", "order_number");

-- CreateIndex
CREATE INDEX "order_items_tenant_id_idx" ON "order_items"("tenant_id");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_addresses_tenant_id_idx" ON "order_addresses"("tenant_id");

-- CreateIndex
CREATE INDEX "order_addresses_order_id_idx" ON "order_addresses"("order_id");

-- CreateIndex
CREATE INDEX "order_payments_tenant_id_idx" ON "order_payments"("tenant_id");

-- CreateIndex
CREATE INDEX "order_payments_order_id_idx" ON "order_payments"("order_id");

-- CreateIndex
CREATE INDEX "order_payments_provider_payment_id_idx" ON "order_payments"("provider_payment_id");

-- CreateIndex
CREATE INDEX "order_status_history_tenant_id_idx" ON "order_status_history"("tenant_id");

-- CreateIndex
CREATE INDEX "order_status_history_order_id_idx" ON "order_status_history"("order_id");

-- AddForeignKey
ALTER TABLE "order_sequences" ADD CONSTRAINT "order_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_addresses" ADD CONSTRAINT "order_addresses_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
