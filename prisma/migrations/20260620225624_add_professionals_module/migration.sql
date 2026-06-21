-- CreateEnum
CREATE TYPE "ProfessionalSpecialtyStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "ProfessionalLocationStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "CollaboratorStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "CollaboratorRoleStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "CollaboratorDepartmentStatus" AS ENUM ('active', 'inactive');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TemplateEntityType" ADD VALUE 'professional';
ALTER TYPE "TemplateEntityType" ADD VALUE 'collaborator';

-- AlterTable
ALTER TABLE "professionals" ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "internal_notes" TEXT,
ADD COLUMN     "public_profile" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "user_id" TEXT,
ADD COLUMN     "whatsapp" TEXT;

-- CreateTable
CREATE TABLE "professional_specialties" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProfessionalSpecialtyStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professional_specialties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_specialty_assignments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "specialty_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professional_specialty_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_locations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "status" "ProfessionalLocationStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professional_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collaborator_roles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "CollaboratorRoleStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collaborator_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collaborator_departments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "CollaboratorDepartmentStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collaborator_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collaborators" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT,
    "professional_id" TEXT,
    "role_id" TEXT,
    "department_id" TEXT,
    "name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "phone" TEXT,
    "phone_normalized" TEXT,
    "whatsapp" TEXT,
    "whatsapp_normalized" TEXT,
    "email" TEXT,
    "document" TEXT,
    "document_normalized" TEXT,
    "status" "CollaboratorStatus" NOT NULL DEFAULT 'active',
    "has_system_access" BOOLEAN NOT NULL DEFAULT false,
    "tenant_role" "TenantUserRole",
    "is_service_professional" BOOLEAN NOT NULL DEFAULT false,
    "internal_notes" TEXT,
    "custom_data" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "professional_specialties_tenant_id_idx" ON "professional_specialties"("tenant_id");

-- CreateIndex
CREATE INDEX "professional_specialties_tenant_id_status_idx" ON "professional_specialties"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "professional_specialties_tenant_id_slug_key" ON "professional_specialties"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "professional_specialty_assignments_tenant_id_professional_i_idx" ON "professional_specialty_assignments"("tenant_id", "professional_id");

-- CreateIndex
CREATE INDEX "professional_specialty_assignments_tenant_id_specialty_id_idx" ON "professional_specialty_assignments"("tenant_id", "specialty_id");

-- CreateIndex
CREATE UNIQUE INDEX "professional_specialty_assignments_professional_id_specialt_key" ON "professional_specialty_assignments"("professional_id", "specialty_id");

-- CreateIndex
CREATE INDEX "professional_locations_tenant_id_professional_id_idx" ON "professional_locations"("tenant_id", "professional_id");

-- CreateIndex
CREATE INDEX "professional_locations_tenant_id_location_id_idx" ON "professional_locations"("tenant_id", "location_id");

-- CreateIndex
CREATE UNIQUE INDEX "professional_locations_professional_id_location_id_key" ON "professional_locations"("professional_id", "location_id");

-- CreateIndex
CREATE INDEX "collaborator_roles_tenant_id_idx" ON "collaborator_roles"("tenant_id");

-- CreateIndex
CREATE INDEX "collaborator_roles_tenant_id_status_idx" ON "collaborator_roles"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "collaborator_roles_tenant_id_slug_key" ON "collaborator_roles"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "collaborator_departments_tenant_id_idx" ON "collaborator_departments"("tenant_id");

-- CreateIndex
CREATE INDEX "collaborator_departments_tenant_id_status_idx" ON "collaborator_departments"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "collaborator_departments_tenant_id_slug_key" ON "collaborator_departments"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "collaborators_tenant_id_idx" ON "collaborators"("tenant_id");

-- CreateIndex
CREATE INDEX "collaborators_tenant_id_status_idx" ON "collaborators"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "collaborators_tenant_id_user_id_idx" ON "collaborators"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "collaborators_tenant_id_professional_id_idx" ON "collaborators"("tenant_id", "professional_id");

-- CreateIndex
CREATE INDEX "collaborators_tenant_id_document_normalized_idx" ON "collaborators"("tenant_id", "document_normalized");

-- CreateIndex
CREATE INDEX "professionals_tenant_id_user_id_idx" ON "professionals"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "professionals_tenant_id_email_idx" ON "professionals"("tenant_id", "email");

-- AddForeignKey
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_specialties" ADD CONSTRAINT "professional_specialties_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_specialty_assignments" ADD CONSTRAINT "professional_specialty_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_specialty_assignments" ADD CONSTRAINT "professional_specialty_assignments_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_specialty_assignments" ADD CONSTRAINT "professional_specialty_assignments_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "professional_specialties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_locations" ADD CONSTRAINT "professional_locations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_locations" ADD CONSTRAINT "professional_locations_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_locations" ADD CONSTRAINT "professional_locations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborator_roles" ADD CONSTRAINT "collaborator_roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborator_departments" ADD CONSTRAINT "collaborator_departments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborators" ADD CONSTRAINT "collaborators_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborators" ADD CONSTRAINT "collaborators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborators" ADD CONSTRAINT "collaborators_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborators" ADD CONSTRAINT "collaborators_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "collaborator_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborators" ADD CONSTRAINT "collaborators_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "collaborator_departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
