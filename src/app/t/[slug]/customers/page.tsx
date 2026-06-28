import { notFound } from "next/navigation";

import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";
import { deriveEntityType } from "@/lib/validations/customer";

import {
  customerEntityTemplateFields,
  customerEntityTypes,
  customerNicheLabels,
  customerTemplateFields,
  customerTemplateLayout,
  listCustomerOptions,
  listCustomers,
  listCustomerTags,
  listPets,
} from "./data";
import CustomersClient from "./customers-client";

export default async function CustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;

  // Server-side gate: active membership + the customer_management feature. 404
  // (not 403) so the route doesn't leak tenant/feature existence.
  let ctx;
  try {
    ctx = await resolveTenantContext(slug, { feature: "customer_management" });
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) notFound();
    throw err;
  }
  const { tenant, role } = ctx;
  const canWrite = role === "tenant_owner" || role === "tenant_manager" || role === "tenant_operator";
  const canDelete = role === "tenant_owner" || role === "tenant_manager";

  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const num = (v: string | string[] | undefined) => {
    const n = Number(str(v));
    return Number.isFinite(n) ? n : undefined;
  };

  // Related entities (pets) sit behind their own feature gate — detect it
  // softly so the customers screen still works when it's off.
  let showPets = true;
  try {
    await resolveTenantContext(slug, { feature: "customer_entities" });
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) showPets = false;
    else throw err;
  }

  const listView = str(sp.listView) === "pets" && showPets ? "pets" : "clients";

  // Data load is wrapped so a transient DB/query failure renders an inline error
  // state ("Tentar novamente") instead of the route-level error boundary. The
  // auth/feature gates above keep their own 404/throw semantics.
  let loadError = false;
  let rows: Awaited<ReturnType<typeof listCustomers>>["rows"] = [];
  let filtered = 0;
  let total = 0;
  let tags: Awaited<ReturnType<typeof listCustomerTags>> = [];
  let templateFields: Awaited<ReturnType<typeof customerTemplateFields>> = [];
  let labels: Awaited<ReturnType<typeof customerNicheLabels>> = { customerLabel: null, entityLabel: null };
  let entityTemplateFields: Awaited<ReturnType<typeof customerEntityTemplateFields>> = [];
  let templateLayout: Awaited<ReturnType<typeof customerTemplateLayout>> = undefined;
  let entityTypes: string[] = [];
  let petData: Awaited<ReturnType<typeof listPets>> | null = null;
  let customerOptions: Awaited<ReturnType<typeof listCustomerOptions>> = [];

  try {
    [{ rows, filtered, total }, tags, templateFields, labels, entityTemplateFields, entityTypes, templateLayout] = await Promise.all([
      listCustomers(tenant.id, {
        q: str(sp.q),
        status: str(sp.status),
        source: str(sp.source),
        personType: str(sp.personType),
        tagId: str(sp.tagId),
        hasAddress: str(sp.hasAddress),
        hasConsent: str(sp.hasConsent),
        createdFrom: str(sp.createdFrom),
        createdTo: str(sp.createdTo),
        updatedFrom: str(sp.updatedFrom),
        updatedTo: str(sp.updatedTo),
        sortBy: str(sp.sortBy),
        sortDir: str(sp.sortDir),
        page: num(sp.page),
        pageSize: num(sp.pageSize),
      }),
      listCustomerTags(tenant.id),
      customerTemplateFields(tenant.nicheId),
      customerNicheLabels(tenant.nicheId),
      customerEntityTemplateFields(tenant.nicheId),
      customerEntityTypes(tenant.id),
      customerTemplateLayout(tenant.nicheId),
    ]);

    // The pet entity type used by listPets: prefer "pet" if present in stored
    // data, else the niche-derived type.
    const petType = entityTypes.find((t) => t === "pet") ?? deriveEntityType(labels.entityLabel);

    [petData, customerOptions] = await Promise.all([
      showPets && listView === "pets"
        ? listPets(tenant.id, petType, {
            q: str(sp.q),
            especie: str(sp.especie),
            sexo: str(sp.sexo),
            porte: str(sp.porte),
            sortBy: str(sp.sortBy),
            sortDir: str(sp.sortDir),
            page: num(sp.page),
            pageSize: num(sp.pageSize),
          })
        : Promise.resolve(null),
      showPets && canWrite ? listCustomerOptions(tenant.id) : Promise.resolve([]),
    ]);
  } catch (err) {
    console.error("[customers] page load error:", err);
    loadError = true;
  }

  const resolvedEntityType = deriveEntityType(labels.entityLabel);

  return (
    <CustomersClient
      slug={slug}
      rows={rows}
      filtered={filtered}
      total={total}
      tags={tags.map((t) => ({ id: t.id, name: t.name, color: t.color, customerCount: t.customerCount }))}
      templateFields={templateFields}
      templateLayout={templateLayout}
      customerLabel={labels.customerLabel}
      entityLabel={labels.entityLabel?.trim() || "Pet"}
      entityType={resolvedEntityType}
      entityTemplateFields={entityTemplateFields}
      entityTypes={showPets ? entityTypes : []}
      showPets={showPets}
      canWrite={canWrite}
      canDelete={canDelete}
      listView={listView}
      petRows={petData?.rows ?? []}
      petFiltered={petData?.filtered ?? 0}
      petTotal={petData?.total ?? 0}
      customerOptions={customerOptions}
      loadError={loadError}
    />
  );
}
