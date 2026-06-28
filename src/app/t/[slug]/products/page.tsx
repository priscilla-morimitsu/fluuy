import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";
import { templateFieldSchema, templateLayoutSchema } from "@/lib/validations/template";

import { listProducts } from "./data";
import ProductsClient from "./products-client";
import { listCategories } from "./queries";

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const num = (v: string | string[] | undefined) => {
    const n = Number(str(v));
    return Number.isFinite(n) ? n : undefined;
  };

  // Feature gate + role enforced server-side — hiding the menu is not enough.
  let ctx;
  try {
    ctx = await resolveTenantContext(slug, { feature: "product_catalog" });
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) notFound();
    throw err;
  }
  const { tenant, role } = ctx;

  const [list, categories, template] = await Promise.all([
    listProducts(tenant.id, {
      q: str(sp.q),
      categoryId: str(sp.categoryId),
      status: str(sp.status),
      availableForSale: str(sp.availableForSale),
      brand: str(sp.brand),
      sortBy: str(sp.sortBy),
      sortDir: str(sp.sortDir),
      page: num(sp.page),
      pageSize: num(sp.pageSize),
    }),
    listCategories(tenant.id),
    prisma.template.findFirst({
      where: { nicheId: tenant.nicheId, entityType: "product", status: "active" },
      orderBy: { version: "desc" },
      select: { fields: true, config: true },
    }),
  ]);

  const parsedFields = templateFieldSchema.array().safeParse(template?.fields ?? []);
  const parsedLayout = templateLayoutSchema.safeParse((template?.config as { layout?: unknown } | null)?.layout);
  const templateLayout = parsedLayout.success ? parsedLayout.data : undefined;

  return (
    <ProductsClient
      slug={slug}
      role={role}
      rows={list.rows}
      filtered={list.filtered}
      total={list.total}
      categories={categories}
      templateFields={parsedFields.success ? parsedFields.data : []}
      templateLayout={templateLayout}
    />
  );
}
