"use client";

import { useActionState, useEffect, useState } from "react";

import { StatusSwitchItem, type StatusOption } from "@/components/forms/status-switch-item";
import { Field } from "@/components/ui/field";
import { FormDrawerForm, FormSection } from "@/components/ui/form-drawer";
import { Combobox } from "@/components/ui/combobox";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/masked-inputs";
import { MultiSelect } from "@/components/ui/multiselect";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { actionError, actionOk } from "@/lib/admin/action-result";
import { PRODUCT_UNITS } from "@/lib/validations/product";
import type { TemplateField } from "@/lib/validations/template";

import { createProductAction, updateProductAction, type ProductActionResult } from "./actions";
import { CategoryCombobox } from "./category-combobox";

const STATUS_OPTIONS: StatusOption[] = [
  {
    value: "draft",
    label: "Rascunho",
    description: "Rascunho — o produto não aparece para clientes nem para a IA.",
    confirm: {
      title: "Voltar para rascunho?",
      message: "O produto deixa de ser oferecido e fica oculto até ser publicado novamente.",
      confirmLabel: "Voltar para rascunho",
    },
  },
  {
    value: "active",
    label: "Ativo",
    tone: "positive",
    description: "Ativo — o produto está publicado e disponível.",
    confirm: {
      title: "Publicar produto?",
      message: "O produto passa a ser exibido para clientes e oferecido pela IA.",
      confirmLabel: "Ativar",
    },
  },
  {
    value: "inactive",
    label: "Inativo",
    description: "Inativo — o produto fica oculto.",
    confirm: {
      title: "Inativar produto?",
      message: "O produto deixa de ser exibido para clientes e a IA para de oferecê-lo.",
      confirmLabel: "Inativar",
    },
  },
];
const UNIT_LABELS: Record<(typeof PRODUCT_UNITS)[number], string> = {
  unit: "Unidade",
  kg: "Quilograma (kg)",
  g: "Grama (g)",
  l: "Litro (L)",
  ml: "Mililitro (mL)",
  package: "Pacote",
  box: "Caixa",
  service_bundle: "Pacote de serviços",
  other: "Outro",
};

export type ProductCategoryOption = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "inactive";
  productCount: number;
};

export type ProductInitial = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  brand: string | null;
  sku: string | null;
  barcode: string | null;
  salePrice: string;
  promotionalPrice: string | null;
  costPrice: string | null;
  unit: string | null;
  imageUrl: string | null;
  status: string;
  availableForSale: boolean;
  internalNotes: string | null;
  customData: Record<string, unknown>;
};

function CustomField({ field, value }: { field: TemplateField; value: unknown }) {
  const name = `custom_${field.key}`;
  if (field.type === "boolean") return <BooleanField name={name} defaultChecked={value === true} label={field.label} />;
  return (
    <Field label={field.label} htmlFor={name} required={field.required} className="col-span-full">
      {field.type === "textarea" ? (
        <Textarea id={name} name={name} rows={2} defaultValue={value != null ? String(value) : ""} />
      ) : field.type === "number" ? (
        <Input id={name} name={name} type="number" step="any" defaultValue={value != null ? String(value) : ""} />
      ) : field.type === "select" ? (
        <Combobox id={name} name={name} defaultValue={value != null ? String(value) : ""} options={(field.options ?? []).map((o) => ({ value: o, label: o }))} />
      ) : field.type === "multiselect" ? (
        <MultiSelect id={name} name={name} defaultValue={Array.isArray(value) ? value.map(String) : []} options={(field.options ?? []).map((o) => ({ value: o, label: o }))} />
      ) : (
        <Input id={name} name={name} defaultValue={value != null ? String(value) : ""} />
      )}
    </Field>
  );
}

function BooleanField({ name, defaultChecked, label }: { name: string; defaultChecked: boolean; label: string }) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <Field label={label} className="col-span-full">
      <input type="hidden" name={name} value={on ? "on" : ""} />
      <Switch checked={on} onCheckedChange={setOn} />
    </Field>
  );
}

export default function ProductForm({
  slug,
  categories,
  templateFields,
  canManageCategories,
  initial,
  onSuccess,
  onCancel,
}: {
  slug: string;
  categories: ProductCategoryOption[];
  templateFields: TemplateField[];
  canManageCategories: boolean;
  initial?: ProductInitial;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const isEdit = Boolean(initial);
  const action = isEdit
    ? updateProductAction.bind(null, slug, initial!.id)
    : createProductAction.bind(null, slug);
  const [state, formAction, pending] = useActionState<ProductActionResult, FormData>(action, undefined);
  const [status, setStatus] = useState(initial?.status ?? "draft");
  const [available, setAvailable] = useState(initial?.availableForSale ?? true);
  const [descLen, setDescLen] = useState(initial?.description?.length ?? 0);

  useEffect(() => {
    if (actionOk(state)) onSuccess?.();
  }, [state, onSuccess]);

  return (
    <FormDrawerForm
      action={formAction}
      pending={pending}
      error={actionError(state)}
      onCancel={onCancel}
      submitLabel={isEdit ? "Salvar alterações" : "Criar produto"}
      confirmOnSave={isEdit}
      confirmTitle="Confirmar alterações do produto?"
      initialValues={
        initial && {
          name: initial.name,
          brand: initial.brand ?? "",
          sku: initial.sku ?? "",
          barcode: initial.barcode ?? "",
          description: initial.description ?? "",
          salePrice: initial.salePrice ?? "",
          promotionalPrice: initial.promotionalPrice ?? "",
          costPrice: initial.costPrice ?? "",
          status: initial.status,
          unit: initial.unit ?? "",
          internalNotes: initial.internalNotes ?? "",
        }
      }
      fieldLabels={{
        name: "Nome",
        brand: "Marca",
        sku: "SKU",
        barcode: "Código de barras",
        description: "Descrição",
        salePrice: "Preço de venda",
        promotionalPrice: "Preço promocional",
        costPrice: "Preço de custo",
        status: "Status",
        unit: "Unidade",
        internalNotes: "Notas internas",
      }}
    >
      <FormSection title="Informações principais">
        <div className="col-span-full">
          <StatusSwitchItem title="Status do produto" name="status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        </div>
        <Field label="Nome" htmlFor="name" required className="col-span-full">
          <Input id="name" name="name" required maxLength={150} defaultValue={initial?.name} placeholder="Ex.: Ração Premium 10kg" />
        </Field>
        <Field label="Categoria" htmlFor="categoryId" className="col-span-full">
          <CategoryCombobox id="categoryId" slug={slug} categories={categories} defaultValue={initial?.categoryId} canManage={canManageCategories} />
        </Field>
        <Field label="Marca" htmlFor="brand">
          <Input id="brand" name="brand" maxLength={120} defaultValue={initial?.brand ?? ""} />
        </Field>
        <Field label="SKU" htmlFor="sku">
          <Input id="sku" name="sku" maxLength={80} defaultValue={initial?.sku ?? ""} />
        </Field>
        <Field label="Código de barras" htmlFor="barcode">
          <Input id="barcode" name="barcode" maxLength={30} defaultValue={initial?.barcode ?? ""} />
        </Field>
        <Field label="Descrição" htmlFor="description" className="col-span-full" counter={`${descLen}/2000`}>
          <Textarea id="description" name="description" rows={3} maxLength={2000} defaultValue={initial?.description ?? ""} onChange={(e) => setDescLen(e.target.value.length)} />
        </Field>
      </FormSection>

      <FormSection title="Preços">
        <Field label="Preço de venda" htmlFor="salePrice" required>
          <CurrencyInput id="salePrice" name="salePrice" required defaultValue={initial?.salePrice ?? ""} />
        </Field>
        <Field label="Preço promocional" htmlFor="promotionalPrice" hint="≤ preço de venda">
          <CurrencyInput id="promotionalPrice" name="promotionalPrice" defaultValue={initial?.promotionalPrice ?? ""} />
        </Field>
        <Field label="Preço de custo" htmlFor="costPrice" hint="Interno — nunca exposto" className="col-span-full">
          <CurrencyInput id="costPrice" name="costPrice" defaultValue={initial?.costPrice ?? ""} />
        </Field>
      </FormSection>

      <FormSection title="Disponibilidade">
        <Field label="Unidade" htmlFor="unit">
          <Combobox id="unit" name="unit" defaultValue={initial?.unit ?? ""} placeholder="Selecione…" options={PRODUCT_UNITS.map((u) => ({ value: u, label: UNIT_LABELS[u] }))} />
        </Field>
        <Field label="Disponível para venda/atendimento" className="col-span-full">
          <input type="hidden" name="availableForSale" value={available ? "true" : "false"} />
          <Switch checked={available} onCheckedChange={setAvailable} />
        </Field>
      </FormSection>

      <FormSection title="Imagem">
        <div className="col-span-full">
          <ImageUpload name="image" defaultUrl={initial?.imageUrl ?? undefined} removeFieldName="removeImage" />
        </div>
      </FormSection>

      {templateFields.length > 0 && (
        <FormSection title="Campos específicos do nicho">
          {templateFields.map((field) => (
            <CustomField key={field.key} field={field} value={initial?.customData?.[field.key]} />
          ))}
        </FormSection>
      )}

      <FormSection title="Observações internas">
        <Field label="Notas internas" htmlFor="internalNotes" hint="Não exposto ao cliente nem à IA" className="col-span-full">
          <Textarea id="internalNotes" name="internalNotes" rows={2} maxLength={2000} defaultValue={initial?.internalNotes ?? ""} />
        </Field>
      </FormSection>
    </FormDrawerForm>
  );
}
