import { z } from "zod";

export const PRODUCT_STATUSES = ["draft", "active", "inactive"] as const;
export const PRODUCT_UNITS = [
  "unit",
  "kg",
  "g",
  "l",
  "ml",
  "package",
  "box",
  "service_bundle",
  "other",
] as const;
export const PRODUCT_CATEGORY_STATUSES = ["active", "inactive"] as const;

/** Lowercase, accent-stripped, hyphenated slug (stable per-tenant identifier). */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

/** "1.234,56" / "1234.56" / number → Decimal-safe number, or null when empty. */
const decimalIn = z.preprocess(
  (v) => (v === "" || v == null ? null : typeof v === "number" ? v : Number(String(v))),
  z.number().finite().nonnegative().nullable()
);

export const productStatusSchema = z.enum(PRODUCT_STATUSES, { message: "Status inválido." });
export const productUnitSchema = z.enum(PRODUCT_UNITS);

export const productCreateSchema = z
  .object({
    name: z.string().trim().min(2, "Informe o nome do produto.").max(150),
    description: optText(2000),
    categoryId: z
      .string()
      .uuid()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    brand: optText(120),
    sku: optText(80),
    barcode: optText(30),
    salePrice: z.preprocess(
      (v) => (v === "" || v == null ? undefined : typeof v === "number" ? v : Number(String(v))),
      z.number({ message: "Informe o preço de venda." }).finite().nonnegative("Informe o preço de venda.")
    ),
    promotionalPrice: decimalIn,
    costPrice: decimalIn,
    unit: z
      .enum(PRODUCT_UNITS)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? (v as (typeof PRODUCT_UNITS)[number]) : null)),
    status: productStatusSchema,
    availableForSale: z.boolean(),
    internalNotes: optText(2000),
  })
  .refine(
    (d) => d.promotionalPrice == null || d.promotionalPrice <= d.salePrice,
    { message: "Preço promocional não pode ser maior que o preço de venda.", path: ["promotionalPrice"] }
  );

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export const productUpdateSchema = productCreateSchema;

export const productCategoryCreateSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da categoria.").max(120),
  description: optText(500),
});
export type ProductCategoryCreateInput = z.infer<typeof productCategoryCreateSchema>;

export const productCategoryUpdateSchema = productCategoryCreateSchema.extend({
  status: z.enum(PRODUCT_CATEGORY_STATUSES).default("active"),
});

export const PRODUCT_SORTABLE = [
  "name",
  "salePrice",
  "promotionalPrice",
  "status",
  "availableForSale",
  "createdAt",
  "updatedAt",
] as const;

export const productFiltersSchema = z.object({
  q: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.string().optional(),
  availableForSale: z.string().optional(),
  brand: z.string().optional(),
});
