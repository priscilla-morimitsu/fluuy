"use client";

import { Plus, Tag, X } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { AffixInput, Field } from "@/components/ui/field";
import { FormDrawerForm, FormSection } from "@/components/ui/form-drawer";
import { ImageUpload } from "@/components/ui/image-upload";
import { CurrencyInput } from "@/components/ui/masked-inputs";
import { Segmented } from "@/components/ui/segmented";
import { SwitchCard } from "@/components/ui/switch-card";
import { Textarea } from "@/components/ui/textarea";
import { actionError, actionOk } from "@/lib/admin/action-result";
import {
  OFFER_PLAN_BILLING_CYCLE_LABELS,
  OFFER_PLAN_BILLING_CYCLES,
  OFFER_PLAN_STATUS_LABELS,
  OFFER_PLAN_STATUSES,
  OFFER_PLAN_TYPE_LABELS,
  OFFER_PLAN_TYPES,
  type OfferPlanType,
} from "@/lib/validations/offer-plan";
import type { TemplateField } from "@/lib/validations/template";

import {
  createOfferPlanAction,
  createOfferPlanCategoryAction,
  updateOfferPlanAction,
  type OfferPlanActionResult,
} from "./actions";

export type OfferPlanCategoryOption = { id: string; name: string };
export type CatalogOption = { id: string; name: string };

export type ServiceItemInitial = {
  serviceId: string;
  quantity: number;
  usageLimit: number | null;
  durationOverrideMinutes: number | null;
  priceOverride: string | null;
  included: boolean;
};
export type ProductItemInitial = {
  productId: string;
  quantity: number;
  usageLimit: number | null;
  priceOverride: string | null;
  included: boolean;
};

export type OfferPlanInitial = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  type: string;
  price: string;
  promotionalPrice: string | null;
  billingCycle: string | null;
  autoRenew: boolean;
  expiresAfterDays: number | null;
  usageLimit: number | null;
  allowScheduling: boolean;
  status: string;
  availableForSale: boolean;
  imageUrl: string | null;
  internalNotes: string | null;
  customData: Record<string, unknown>;
  serviceItems: ServiceItemInitial[];
  productItems: ProductItemInitial[];
};

const STATUS_OPTIONS = OFFER_PLAN_STATUSES.map((s) => ({ value: s, label: OFFER_PLAN_STATUS_LABELS[s] }));
const TYPE_OPTIONS = OFFER_PLAN_TYPES.map((t) => ({ value: t, label: OFFER_PLAN_TYPE_LABELS[t] }));
const CYCLE_OPTIONS = OFFER_PLAN_BILLING_CYCLES.map((c) => ({ value: c, label: OFFER_PLAN_BILLING_CYCLE_LABELS[c] }));

let svcUid = 0;
let prodUid = 0;
type SvcRow = ServiceItemInitial & { uid: string };
type ProdRow = ProductItemInitial & { uid: string };

export default function OfferPlanForm({
  slug,
  categories,
  services,
  products,
  templateFields,
  initial,
  onSuccess,
  onCancel,
}: {
  slug: string;
  categories: OfferPlanCategoryOption[];
  services: CatalogOption[];
  products: CatalogOption[];
  templateFields: TemplateField[];
  initial?: OfferPlanInitial;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const isEdit = Boolean(initial);
  const action = isEdit
    ? updateOfferPlanAction.bind(null, slug, initial!.id)
    : createOfferPlanAction.bind(null, slug);
  const [state, formAction, pending] = useActionState<OfferPlanActionResult, FormData>(action, undefined);

  const [cats, setCats] = useState(categories);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [creatingCat, startCreateCat] = useTransition();

  const [type, setType] = useState<OfferPlanType>(
    (OFFER_PLAN_TYPES as readonly string[]).includes(initial?.type ?? "")
      ? (initial!.type as OfferPlanType)
      : "recurring_plan",
  );

  const [removedImage, setRemovedImage] = useState(false);
  const showCurrentImage = Boolean(initial?.imageUrl) && !removedImage;

  const [svcRows, setSvcRows] = useState<SvcRow[]>(
    () => (initial?.serviceItems ?? []).map((i) => ({ ...i, uid: `svc-${(svcUid += 1)}` })),
  );
  const [prodRows, setProdRows] = useState<ProdRow[]>(
    () => (initial?.productItems ?? []).map((i) => ({ ...i, uid: `prod-${(prodUid += 1)}` })),
  );

  useEffect(() => {
    if (actionOk(state)) onSuccess?.();
  }, [state, onSuccess]);

  const handleCategoryChange = (value: string) => {
    if (value === "" || cats.some((c) => c.id === value)) {
      setCategoryId(value);
      return;
    }
    startCreateCat(async () => {
      const res = await createOfferPlanCategoryAction(slug, value);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setCats((prev) => [...prev, { id: res.category.id, name: res.category.name }]);
      setCategoryId(res.category.id);
      toast.success("Categoria criada.");
    });
  };

  const isRecurring = type === "recurring_plan";

  const addSvc = () =>
    setSvcRows((p) => [
      ...p,
      { uid: `svc-${(svcUid += 1)}`, serviceId: "", quantity: 1, usageLimit: null, durationOverrideMinutes: null, priceOverride: null, included: true },
    ]);
  const addProd = () =>
    setProdRows((p) => [
      ...p,
      { uid: `prod-${(prodUid += 1)}`, productId: "", quantity: 1, usageLimit: null, priceOverride: null, included: true },
    ]);

  return (
    <FormDrawerForm
      action={formAction}
      pending={pending}
      error={actionError(state)}
      onCancel={onCancel}
      submitLabel={isEdit ? "Salvar alterações" : "Criar plano/pacote"}
    >
      <input type="hidden" name="categoryId" value={categoryId} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="svcCount" value={svcRows.length} />
      <input type="hidden" name="prodCount" value={prodRows.length} />
      {removedImage && <input type="hidden" name="removeImage" value="true" />}

      <FormSection title="Informações principais">
        <Field label="Nome" htmlFor="name" required className="col-span-full">
          <AffixInput id="name" name="name" required maxLength={150} defaultValue={initial?.name} />
        </Field>
        <Field label="Tipo" htmlFor="type" required className="col-span-full">
          <Combobox
            id="type"
            value={type}
            onValueChange={(v) => setType(v as OfferPlanType)}
            options={TYPE_OPTIONS}
            placeholder="Selecione o tipo"
            emptyText="Sem opções."
          />
        </Field>
        <Field label="Categoria" htmlFor="categoryId" className="col-span-full" hint="Digite para criar uma nova categoria.">
          <Combobox
            id="categoryId"
            value={categoryId}
            onValueChange={handleCategoryChange}
            options={cats.map((c) => ({ value: c.id, label: c.name }))}
            allowCustom
            loading={creatingCat}
            placeholder="Selecione ou crie…"
            searchPlaceholder="Buscar ou criar categoria…"
            emptyText="Nenhuma categoria."
          />
        </Field>
        <Field label="Descrição" htmlFor="description" className="col-span-full">
          <Textarea id="description" name="description" rows={3} maxLength={2000} defaultValue={initial?.description ?? ""} />
        </Field>
      </FormSection>

      <FormSection title="Preço">
        <Field label="Preço" htmlFor="price" required>
          <CurrencyInput id="price" name="price" required defaultValue={initial?.price ?? ""} />
        </Field>
        <Field label="Preço promocional" htmlFor="promotionalPrice">
          <CurrencyInput id="promotionalPrice" name="promotionalPrice" defaultValue={initial?.promotionalPrice ?? ""} />
        </Field>
      </FormSection>

      <FormSection title="Recorrência e validade">
        {isRecurring && (
          <>
            <Field label="Ciclo de cobrança" htmlFor="billingCycle" required>
              <Combobox
                id="billingCycle"
                name="billingCycle"
                defaultValue={initial?.billingCycle ?? ""}
                options={CYCLE_OPTIONS}
                placeholder="Selecione o ciclo"
                emptyText="Sem opções."
              />
            </Field>
            <SwitchCard
              title="Renovação automática"
              hint="O plano renova ao fim de cada ciclo."
              name="autoRenew"
              defaultChecked={initial?.autoRenew ?? false}
              className="col-span-full"
            />
          </>
        )}
        {!isRecurring && (
          <Field label="Validade (dias)" htmlFor="expiresAfterDays" hint="Dias até o pacote expirar.">
            <AffixInput
              id="expiresAfterDays"
              name="expiresAfterDays"
              type="number"
              min={1}
              step={1}
              suffix="dias"
              defaultValue={initial?.expiresAfterDays ?? ""}
            />
          </Field>
        )}
        <Field label="Limite de uso geral" htmlFor="usageLimit" hint="Opcional.">
          <AffixInput id="usageLimit" name="usageLimit" type="number" min={1} step={1} defaultValue={initial?.usageLimit ?? ""} />
        </Field>
      </FormSection>

      <FormSection title="Serviços incluídos">
        <div className="col-span-full flex flex-col gap-3">
          {svcRows.length === 0 && <p className="text-sm text-muted-foreground">Nenhum serviço incluído.</p>}
          {svcRows.map((row, i) => (
            <div key={row.uid} className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Serviço {i + 1}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSvcRows((p) => p.filter((r) => r.uid !== row.uid))}>
                  <X />
                </Button>
              </div>
              <Field label="Serviço" htmlFor={`svc${i}_serviceId`}>
                <Combobox
                  id={`svc${i}_serviceId`}
                  name={`svc${i}_serviceId`}
                  defaultValue={row.serviceId}
                  options={services.map((s) => ({ value: s.id, label: s.name }))}
                  placeholder="Selecione um serviço"
                  searchPlaceholder="Buscar serviço…"
                  emptyText="Nenhum serviço ativo."
                />
              </Field>
              <div className="grid grid-cols-2 gap-2 @[440px]:grid-cols-4">
                <Field label="Qtd." htmlFor={`svc${i}_quantity`}>
                  <AffixInput id={`svc${i}_quantity`} name={`svc${i}_quantity`} type="number" min={1} step={1} defaultValue={row.quantity} />
                </Field>
                <Field label="Limite uso" htmlFor={`svc${i}_usageLimit`}>
                  <AffixInput id={`svc${i}_usageLimit`} name={`svc${i}_usageLimit`} type="number" min={1} step={1} defaultValue={row.usageLimit ?? ""} />
                </Field>
                <Field label="Duração" htmlFor={`svc${i}_durationOverrideMinutes`}>
                  <AffixInput id={`svc${i}_durationOverrideMinutes`} name={`svc${i}_durationOverrideMinutes`} type="number" min={1} step={1} suffix="min" defaultValue={row.durationOverrideMinutes ?? ""} />
                </Field>
                <Field label="Preço item" htmlFor={`svc${i}_priceOverride`}>
                  <CurrencyInput id={`svc${i}_priceOverride`} name={`svc${i}_priceOverride`} defaultValue={row.priceOverride ?? ""} />
                </Field>
              </div>
              <SwitchCard title="Incluído no preço" name={`svc${i}_included`} defaultChecked={row.included} />
            </div>
          ))}
          <div>
            <Button type="button" variant="ghost" size="sm" onClick={addSvc} disabled={services.length === 0}>
              <Plus /> Adicionar serviço
            </Button>
          </div>
        </div>
      </FormSection>

      <FormSection title="Produtos incluídos">
        <div className="col-span-full flex flex-col gap-3">
          {prodRows.length === 0 && <p className="text-sm text-muted-foreground">Nenhum produto incluído.</p>}
          {prodRows.map((row, i) => (
            <div key={row.uid} className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Produto {i + 1}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setProdRows((p) => p.filter((r) => r.uid !== row.uid))}>
                  <X />
                </Button>
              </div>
              <Field label="Produto" htmlFor={`prod${i}_productId`}>
                <Combobox
                  id={`prod${i}_productId`}
                  name={`prod${i}_productId`}
                  defaultValue={row.productId}
                  options={products.map((p) => ({ value: p.id, label: p.name }))}
                  placeholder="Selecione um produto"
                  searchPlaceholder="Buscar produto…"
                  emptyText="Nenhum produto ativo."
                />
              </Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Qtd." htmlFor={`prod${i}_quantity`}>
                  <AffixInput id={`prod${i}_quantity`} name={`prod${i}_quantity`} type="number" min={1} step={1} defaultValue={row.quantity} />
                </Field>
                <Field label="Limite uso" htmlFor={`prod${i}_usageLimit`}>
                  <AffixInput id={`prod${i}_usageLimit`} name={`prod${i}_usageLimit`} type="number" min={1} step={1} defaultValue={row.usageLimit ?? ""} />
                </Field>
                <Field label="Preço item" htmlFor={`prod${i}_priceOverride`}>
                  <CurrencyInput id={`prod${i}_priceOverride`} name={`prod${i}_priceOverride`} defaultValue={row.priceOverride ?? ""} />
                </Field>
              </div>
              <SwitchCard title="Incluído no preço" name={`prod${i}_included`} defaultChecked={row.included} />
            </div>
          ))}
          <div>
            <Button type="button" variant="ghost" size="sm" onClick={addProd} disabled={products.length === 0}>
              <Plus /> Adicionar produto
            </Button>
          </div>
        </div>
      </FormSection>

      <FormSection title="Agendamento e publicação">
        <SwitchCard
          title="Permite agendamento"
          hint="Cliente pode agendar serviços deste plano."
          name="allowScheduling"
          defaultChecked={initial?.allowScheduling ?? true}
          className="col-span-full"
        />
        <SwitchCard
          title="Disponível para venda"
          hint="A IA só oferece planos ativos e disponíveis."
          name="availableForSale"
          defaultChecked={initial?.availableForSale ?? true}
          className="col-span-full"
        />
        <Field label="Status" htmlFor="status" className="col-span-full">
          <Segmented name="status" ariaLabel="Status" defaultValue={initial?.status ?? "draft"} options={STATUS_OPTIONS} />
        </Field>
      </FormSection>

      <FormSection title="Imagem">
        <div className="col-span-full flex flex-col gap-2">
          {showCurrentImage && (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={initial!.imageUrl!} alt="" className="size-[120px] rounded-xl border border-border object-cover" />
              <button
                type="button"
                onClick={() => setRemovedImage(true)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" /> Remover imagem atual
              </button>
            </div>
          )}
          <ImageUpload name="image" size="M" label={showCurrentImage ? "Substituir imagem" : "Enviar imagem"} hint="PNG, JPG ou WEBP · até 5 MB" />
        </div>
      </FormSection>

      <FormSection title="Observações internas">
        <Field label="Notas internas" htmlFor="internalNotes" className="col-span-full" hint="Não exibidas para clientes nem para a IA.">
          <Textarea id="internalNotes" name="internalNotes" rows={2} maxLength={2000} defaultValue={initial?.internalNotes ?? ""} />
        </Field>
      </FormSection>

      {templateFields.length > 0 && (
        <FormSection title="Campos específicos do nicho">
          {templateFields.map((field) => {
            const name = `custom_${field.key}`;
            const value = initial?.customData?.[field.key];
            if (field.type === "boolean") {
              return (
                <SwitchCard key={field.key} title={field.label} name={name} defaultChecked={Boolean(value)} className="col-span-full" />
              );
            }
            if ((field.type === "select" || field.type === "multiselect") && field.options) {
              return (
                <Field key={field.key} label={field.label} htmlFor={name} required={field.required} className="col-span-full">
                  <Combobox
                    id={name}
                    name={name}
                    defaultValue={value != null ? String(value) : ""}
                    options={field.options.map((o) => ({ value: o, label: o }))}
                    placeholder="Selecione"
                    searchPlaceholder="Buscar…"
                    emptyText="Sem opções."
                  />
                </Field>
              );
            }
            if (field.type === "textarea") {
              return (
                <Field key={field.key} label={field.label} htmlFor={name} required={field.required} className="col-span-full">
                  <Textarea id={name} name={name} rows={2} defaultValue={value != null ? String(value) : ""} required={field.required} />
                </Field>
              );
            }
            return (
              <Field key={field.key} label={field.label} htmlFor={name} required={field.required}>
                <AffixInput
                  id={name}
                  name={name}
                  leadIcon={<Tag />}
                  type={field.type === "number" ? "number" : "text"}
                  defaultValue={value != null ? String(value) : ""}
                  required={field.required}
                />
              </Field>
            );
          })}
        </FormSection>
      )}
    </FormDrawerForm>
  );
}
