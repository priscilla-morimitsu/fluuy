"use server";

import { revalidatePath } from "next/cache";

import type { Prisma } from "@/generated/prisma/client";
import type { AdminActionResult } from "@/lib/admin/action-result";
import { readCustomData } from "@/lib/custom-data";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";
import { deleteImage, saveImage, UploadError } from "@/lib/upload";
import {
  productCategoryCreateSchema,
  productCreateSchema,
  productStatusSchema,
  slugify,
} from "@/lib/validations/product";
import { templateFieldSchema, validateCustomData, type TemplateField } from "@/lib/validations/template";

import { getProduct, type ProductDetail } from "./queries";

export type ProductActionResult = AdminActionResult;
export type CategoryActionResult =
  | { ok: true; category: { id: string; name: string; slug: string; status: "active" | "inactive"; productCount: number } }
  | { error: string };

const WRITE_ROLES = ["tenant_owner", "tenant_manager", "tenant_operator"] as const;
const ADMIN_ROLES = ["tenant_owner", "tenant_manager"] as const;
const FEATURE = "product_catalog";

function fail(err: unknown): { error: string } {
  if (err instanceof ForbiddenError || err instanceof UnauthorizedError) {
    return { error: "Você não tem permissão para esta ação." };
  }
  if (err instanceof UploadError) return { error: err.message };
  console.error("[products] action error:", err);
  return { error: "Não foi possível concluir a operação." };
}

async function productTemplateFields(nicheId: string): Promise<TemplateField[]> {
  const template = await prisma.template.findFirst({
    where: { nicheId, entityType: "product", status: "active" },
    orderBy: { version: "desc" },
    select: { fields: true },
  });
  const parsed = templateFieldSchema.array().safeParse(template?.fields ?? []);
  return parsed.success ? parsed.data : [];
}

async function uniqueSlug(tenantId: string, name: string, excludeId?: string): Promise<string> {
  const base = slugify(name) || "produto";
  let slug = base;
  for (let i = 0; i < 5; i++) {
    const clash = await prisma.product.findFirst({
      where: { tenantId, slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (!clash) return slug;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

function parseForm(formData: FormData) {
  return {
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    categoryId: formData.get("categoryId") ?? "",
    brand: formData.get("brand") ?? "",
    sku: formData.get("sku") ?? "",
    barcode: formData.get("barcode") ?? "",
    salePrice: formData.get("salePrice"),
    promotionalPrice: formData.get("promotionalPrice") ?? "",
    costPrice: formData.get("costPrice") ?? "",
    unit: formData.get("unit") ?? "",
    status: formData.get("status"),
    availableForSale:
      formData.get("availableForSale") === "on" || formData.get("availableForSale") === "true",
    internalNotes: formData.get("internalNotes") ?? "",
  };
}

/** Reads a full product for the edit drawer / detail (any active member). */
export async function fetchProductAction(slug: string, productId: string): Promise<ProductDetail | null> {
  const { tenant } = await resolveTenantContext(slug, { feature: FEATURE });
  return getProduct(tenant.id, productId);
}

async function assertCategory(tenantId: string, categoryId: string | null): Promise<boolean> {
  if (!categoryId) return true;
  const cat = await prisma.productCategory.findFirst({
    where: { id: categoryId, tenantId },
    select: { id: true },
  });
  return Boolean(cat);
}

export async function createProductAction(
  slug: string,
  _prev: ProductActionResult,
  formData: FormData,
): Promise<ProductActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const parsed = productCreateSchema.safeParse(parseForm(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const d = parsed.data;

    if (!(await assertCategory(tenant.id, d.categoryId))) return { error: "Categoria inválida." };

    const fields = await productTemplateFields(tenant.nicheId);
    const customData = readCustomData(fields, formData);
    const cdErrors = validateCustomData(fields, customData);
    if (cdErrors.length > 0) return { error: cdErrors[0] };

    const image = formData.get("image");
    const imageUrl =
      image instanceof File && image.size > 0 ? await saveImage(image, `products/${tenant.id}`) : null;

    await prisma.product.create({
      data: {
        tenantId: tenant.id,
        categoryId: d.categoryId,
        name: d.name,
        slug: await uniqueSlug(tenant.id, d.name),
        description: d.description,
        brand: d.brand,
        sku: d.sku,
        barcode: d.barcode,
        salePrice: d.salePrice.toFixed(2),
        promotionalPrice: d.promotionalPrice?.toFixed(2) ?? null,
        costPrice: d.costPrice?.toFixed(2) ?? null,
        unit: d.unit,
        imageUrl,
        status: d.status,
        availableForSale: d.availableForSale,
        internalNotes: d.internalNotes,
        customData: customData as Prisma.InputJsonValue,
      },
    });

    revalidatePath(`/t/${slug}/products`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function updateProductAction(
  slug: string,
  productId: string,
  _prev: ProductActionResult,
  formData: FormData,
): Promise<ProductActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const existing = await prisma.product.findFirst({
      where: { id: productId, tenantId: tenant.id },
      select: { id: true, name: true, slug: true, imageUrl: true },
    });
    if (!existing) return { error: "Produto não encontrado." };

    const parsed = productCreateSchema.safeParse(parseForm(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const d = parsed.data;

    if (!(await assertCategory(tenant.id, d.categoryId))) return { error: "Categoria inválida." };

    const fields = await productTemplateFields(tenant.nicheId);
    const customData = readCustomData(fields, formData);
    const cdErrors = validateCustomData(fields, customData);
    if (cdErrors.length > 0) return { error: cdErrors[0] };

    let imageUrl: string | null | undefined;
    const image = formData.get("image");
    if (image instanceof File && image.size > 0) {
      imageUrl = await saveImage(image, `products/${tenant.id}`);
      await deleteImage(existing.imageUrl);
    } else if (formData.get("removeImage") === "true") {
      imageUrl = null;
      await deleteImage(existing.imageUrl);
    }

    await prisma.product.updateMany({
      where: { id: productId, tenantId: tenant.id },
      data: {
        categoryId: d.categoryId,
        name: d.name,
        slug: existing.name === d.name ? existing.slug : await uniqueSlug(tenant.id, d.name, productId),
        description: d.description,
        brand: d.brand,
        sku: d.sku,
        barcode: d.barcode,
        salePrice: d.salePrice.toFixed(2),
        promotionalPrice: d.promotionalPrice?.toFixed(2) ?? null,
        costPrice: d.costPrice?.toFixed(2) ?? null,
        unit: d.unit,
        ...(imageUrl !== undefined ? { imageUrl } : {}),
        status: d.status,
        availableForSale: d.availableForSale,
        internalNotes: d.internalNotes,
        customData: customData as Prisma.InputJsonValue,
      },
    });

    revalidatePath(`/t/${slug}/products`);
    revalidatePath(`/t/${slug}/products/${productId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteProductAction(slug: string, productId: string): Promise<ProductActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...ADMIN_ROLES], feature: FEATURE });
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId: tenant.id },
      select: { id: true, imageUrl: true },
    });
    if (!product) return { error: "Produto não encontrado." };
    // No models reference products yet (orders/requests/conversations are
    // future work). When they exist, block here and suggest inactivating.
    await prisma.product.deleteMany({ where: { id: productId, tenantId: tenant.id } });
    await deleteImage(product.imageUrl);
    revalidatePath(`/t/${slug}/products`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function setProductStatusAction(
  slug: string,
  productId: string,
  status: string,
): Promise<ProductActionResult> {
  try {
    const parsedStatus = productStatusSchema.safeParse(status);
    if (!parsedStatus.success) return { error: "Status inválido." };
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const res = await prisma.product.updateMany({
      where: { id: productId, tenantId: tenant.id },
      data: { status: parsedStatus.data },
    });
    if (res.count === 0) return { error: "Produto não encontrado." };
    revalidatePath(`/t/${slug}/products`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function setProductAvailabilityAction(
  slug: string,
  productId: string,
  available: boolean,
): Promise<ProductActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...WRITE_ROLES], feature: FEATURE });
    const res = await prisma.product.updateMany({
      where: { id: productId, tenantId: tenant.id },
      data: { availableForSale: Boolean(available) },
    });
    if (res.count === 0) return { error: "Produto não encontrado." };
    revalidatePath(`/t/${slug}/products`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function createProductCategoryAction(slug: string, name: string): Promise<CategoryActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...ADMIN_ROLES], feature: FEATURE });
    const parsed = productCategoryCreateSchema.safeParse({ name });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const catSlug = slugify(parsed.data.name);
    const clash = await prisma.productCategory.findFirst({
      where: { tenantId: tenant.id, slug: catSlug },
      select: { id: true },
    });
    if (clash) return { error: "Categoria já existe." };
    const cat = await prisma.productCategory.create({
      data: { tenantId: tenant.id, name: parsed.data.name, slug: catSlug, description: parsed.data.description },
    });
    revalidatePath(`/t/${slug}/products`);
    return { ok: true, category: { id: cat.id, name: cat.name, slug: cat.slug, status: cat.status, productCount: 0 } };
  } catch (err) {
    return fail(err);
  }
}

export async function updateProductCategoryAction(
  slug: string,
  id: string,
  name: string,
): Promise<CategoryActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...ADMIN_ROLES], feature: FEATURE });
    const existing = await prisma.productCategory.findFirst({
      where: { id, tenantId: tenant.id },
      select: { id: true, _count: { select: { products: true } } },
    });
    if (!existing) return { error: "Categoria não encontrada." };
    const parsed = productCategoryCreateSchema.safeParse({ name });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const catSlug = slugify(parsed.data.name);
    const clash = await prisma.productCategory.findFirst({
      where: { tenantId: tenant.id, slug: catSlug, NOT: { id } },
      select: { id: true },
    });
    if (clash) return { error: "Categoria já existe." };
    const cat = await prisma.productCategory.update({
      where: { id },
      data: { name: parsed.data.name, slug: catSlug },
    });
    revalidatePath(`/t/${slug}/products`);
    return {
      ok: true,
      category: { id: cat.id, name: cat.name, slug: cat.slug, status: cat.status, productCount: existing._count.products },
    };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteProductCategoryAction(
  slug: string,
  id: string,
): Promise<ProductActionResult> {
  try {
    const { tenant } = await resolveTenantContext(slug, { roles: [...ADMIN_ROLES], feature: FEATURE });
    const cat = await prisma.productCategory.findFirst({
      where: { id, tenantId: tenant.id },
      select: { id: true, _count: { select: { products: true } } },
    });
    if (!cat) return { error: "Categoria não encontrada." };
    if (cat._count.products > 0) {
      return { error: "Esta categoria possui produtos vinculados. Inative-a ou mova os produtos antes de excluir." };
    }
    await prisma.productCategory.delete({ where: { id } });
    revalidatePath(`/t/${slug}/products`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
