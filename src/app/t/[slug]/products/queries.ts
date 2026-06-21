import "server-only";

import { prisma } from "@/lib/prisma";

/** Categories of a tenant with their product counts (for the manage combobox). */
export async function listCategories(tenantId: string) {
  const cats = await prisma.productCategory.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      status: true,
      _count: { select: { products: true } },
    },
  });
  return cats.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    status: c.status,
    productCount: c._count.products,
  }));
}

export type CategoryRow = Awaited<ReturnType<typeof listCategories>>[number];

/** Full product for the edit drawer / detail page — scoped to the tenant. */
export async function getProduct(tenantId: string, productId: string) {
  const p = await prisma.product.findFirst({ where: { id: productId, tenantId } }); // tenant-scoped
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    brand: p.brand,
    sku: p.sku,
    barcode: p.barcode,
    unit: p.unit,
    salePrice: p.salePrice.toString(),
    promotionalPrice: p.promotionalPrice?.toString() ?? null,
    costPrice: p.costPrice?.toString() ?? null,
    imageUrl: p.imageUrl,
    status: p.status,
    availableForSale: p.availableForSale,
    internalNotes: p.internalNotes,
    categoryId: p.categoryId,
    customData: (p.customData as Record<string, unknown>) ?? {},
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProduct>>>;
