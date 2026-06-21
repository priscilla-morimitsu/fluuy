import { ArrowLeft, ImageOff } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { glassButtonVariants } from "@/components/ui/glass";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";

import { getProduct } from "../queries";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const STATUS: Record<string, string> = { draft: "Rascunho", active: "Ativo", inactive: "Inativo" };
const price = (v: string | null) => (v ? money.format(Number(v)) : "—");

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string; productId: string }>;
}) {
  const { slug, productId } = await params;

  let ctx;
  try {
    ctx = await resolveTenantContext(slug, { feature: "product_catalog" });
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) notFound();
    throw err;
  }

  const product = await getProduct(ctx.tenant.id, productId);
  if (!product) notFound();

  const customEntries = Object.entries(product.customData ?? {});

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/t/${slug}/products`} className={glassButtonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft className="size-4" /> Produtos
      </Link>

      <div className="flex flex-wrap items-start gap-4">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt="" className="size-24 rounded-xl border border-border object-cover" />
        ) : (
          <span className="grid size-24 place-items-center rounded-xl border border-border bg-muted text-muted-foreground">
            <ImageOff className="size-6" />
          </span>
        )}
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="text-xl font-semibold">{product.name}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={product.status === "active" ? "success" : product.status === "draft" ? "warning" : "secondary"}>
              {STATUS[product.status] ?? product.status}
            </Badge>
            <Badge variant={product.availableForSale ? "success" : "secondary"}>
              {product.availableForSale ? "Disponível" : "Indisponível"}
            </Badge>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-3">
        <Row label="Preço de venda" value={price(product.salePrice)} />
        <Row label="Preço promocional" value={price(product.promotionalPrice)} />
        <Row label="Preço de custo (interno)" value={price(product.costPrice)} />
        <Row label="Marca" value={product.brand} />
        <Row label="SKU" value={product.sku} />
        <Row label="Código de barras" value={product.barcode} />
        <Row label="Unidade" value={product.unit} />
      </dl>

      {product.description && (
        <section className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold">Descrição</h3>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{product.description}</p>
        </section>
      )}

      {customEntries.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Campos específicos do nicho</h3>
          <dl className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-3">
            {customEntries.map(([key, value]) => (
              <Row key={key} label={key} value={Array.isArray(value) ? value.join(", ") : String(value)} />
            ))}
          </dl>
        </section>
      )}

      {product.internalNotes && (
        <section className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold">Observações internas</h3>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{product.internalNotes}</p>
        </section>
      )}
    </div>
  );
}
