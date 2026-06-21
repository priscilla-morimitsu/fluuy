import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { PRODUCT_SORTABLE, productStatusSchema } from "@/lib/validations/product";

const PAGE_SIZES = [10, 20, 50, 100];
const SORTABLE = new Set<string>(PRODUCT_SORTABLE);

export type ProductListParams = {
  q?: string;
  categoryId?: string;
  status?: string;
  availableForSale?: string;
  brand?: string;
  sortBy?: string;
  sortDir?: string;
  page?: number;
  pageSize?: number;
};

/** Tenant-scoped, filtered, sorted, paginated product list for the table. */
export async function listProducts(tenantId: string, params: ProductListParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = PAGE_SIZES.includes(params.pageSize ?? 20) ? (params.pageSize ?? 20) : 20;

  const where: Prisma.ProductWhereInput = { tenantId };
  if (params.q) {
    where.OR = [
      { name: { contains: params.q, mode: "insensitive" } },
      { brand: { contains: params.q, mode: "insensitive" } },
      { sku: { contains: params.q, mode: "insensitive" } },
      { barcode: { contains: params.q, mode: "insensitive" } },
    ];
  }
  if (params.categoryId) where.categoryId = params.categoryId;
  const status = productStatusSchema.safeParse(params.status);
  if (status.success) where.status = status.data;
  if (params.availableForSale === "true") where.availableForSale = true;
  if (params.availableForSale === "false") where.availableForSale = false;
  if (params.brand) where.brand = { contains: params.brand, mode: "insensitive" };

  const dir: Prisma.SortOrder = params.sortDir === "asc" ? "asc" : "desc";
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    params.sortBy && SORTABLE.has(params.sortBy) ? { [params.sortBy]: dir } : { createdAt: "desc" };

  const select = {
    id: true,
    name: true,
    slug: true,
    brand: true,
    sku: true,
    barcode: true,
    unit: true,
    salePrice: true,
    promotionalPrice: true,
    imageUrl: true,
    status: true,
    availableForSale: true,
    createdAt: true,
    updatedAt: true,
    category: { select: { id: true, name: true } },
    // costPrice/internalNotes/customData are deliberately excluded.
  } satisfies Prisma.ProductSelect;

  const [rows, filtered, total] = await prisma.$transaction([
    prisma.product.findMany({ where, orderBy, select, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.product.count({ where }),
    prisma.product.count({ where: { tenantId } }),
  ]);

  return {
    rows: rows.map((r) => ({
      ...r,
      salePrice: r.salePrice.toString(),
      promotionalPrice: r.promotionalPrice?.toString() ?? null,
    })),
    filtered,
    total,
    page,
    pageSize,
  };
}

export type ProductListRow = Awaited<ReturnType<typeof listProducts>>["rows"][number];
