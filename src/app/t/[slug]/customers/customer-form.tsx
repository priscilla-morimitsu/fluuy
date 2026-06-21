"use client";

import { Pencil, Plus, Star, Tag, Trash2, X } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { AddressFormFields } from "@/components/ui/address-fields";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { AffixInput, Field } from "@/components/ui/field";
import { FormDrawerForm, FormSection } from "@/components/ui/form-drawer";
import { DocumentInput, PhoneInput } from "@/components/ui/masked-inputs";
import { MultiSelect } from "@/components/ui/multiselect";
import { Segmented } from "@/components/ui/segmented";
import { Textarea } from "@/components/ui/textarea";
import type { AddressValue } from "@/lib/address/types";
import { actionError, actionOk } from "@/lib/admin/action-result";
import {
  CUSTOMER_ADDRESS_TYPE_LABELS,
  CUSTOMER_ADDRESS_TYPES,
  CUSTOMER_PERSON_TYPE_LABELS,
  CUSTOMER_PERSON_TYPES,
  CUSTOMER_SOURCE_LABELS,
  CUSTOMER_SOURCES,
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_STATUSES,
} from "@/lib/validations/customer";
import type { TemplateField } from "@/lib/validations/template";

import {
  createCustomerAction,
  createCustomerTagAction,
  deleteCustomerTagAction,
  updateCustomerAction,
  updateCustomerTagAction,
  type CustomerActionResult,
} from "./actions";

export type CustomerTagOption = { id: string; name: string; color: string | null; customerCount: number };

export type CustomerAddressInitial = {
  id: string;
  type: string;
  name: string | null;
  zipCode: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  country: string;
  reference: string | null;
  isDefault: boolean;
};

export type CustomerInitial = {
  id: string;
  name: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  personType: string | null;
  document: string | null;
  birthDate: string | null;
  status: string;
  source: string | null;
  consentAcceptedAt: string | null;
  consentSource: string | null;
  internalNotes: string | null;
  customData: Record<string, unknown>;
  tagIds: string[];
  addresses: CustomerAddressInitial[];
};

const STATUS_OPTIONS = CUSTOMER_STATUSES.map((s) => ({ value: s, label: CUSTOMER_STATUS_LABELS[s] }));
const SOURCE_OPTIONS = CUSTOMER_SOURCES.map((s) => ({ value: s, label: CUSTOMER_SOURCE_LABELS[s] }));
const PERSON_TYPE_OPTIONS = CUSTOMER_PERSON_TYPES.map((p) => ({ value: p, label: CUSTOMER_PERSON_TYPE_LABELS[p] }));
const ADDRESS_TYPE_OPTIONS = CUSTOMER_ADDRESS_TYPES.map((t) => ({ value: t, label: CUSTOMER_ADDRESS_TYPE_LABELS[t] }));

let addressUid = 0;
type AddressEntry = { uid: string; defaultValue: Partial<AddressValue>; type: string; name: string; isDefault: boolean };

function toEntry(a?: CustomerAddressInitial): AddressEntry {
  addressUid += 1;
  return {
    uid: `addr-${addressUid}`,
    type: a?.type ?? "main",
    name: a?.name ?? "",
    isDefault: a?.isDefault ?? false,
    defaultValue: a
      ? {
          cep: a.zipCode ?? "",
          street: a.street ?? "",
          number: a.number ?? "",
          complement: a.complement ?? "",
          neighborhood: a.neighborhood ?? "",
          city: a.city ?? "",
          state: a.state ?? "",
          country: a.country ?? "Brasil",
          reference: a.reference ?? "",
        }
      : {},
  };
}

export default function CustomerForm({
  slug,
  tags,
  templateFields,
  customerLabel,
  initial,
  onSuccess,
  onCancel,
}: {
  slug: string;
  tags: CustomerTagOption[];
  templateFields: TemplateField[];
  customerLabel: string;
  initial?: CustomerInitial;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const isEdit = Boolean(initial);
  const action = isEdit
    ? updateCustomerAction.bind(null, slug, initial!.id)
    : createCustomerAction.bind(null, slug);
  const [state, formAction, pending] = useActionState<CustomerActionResult, FormData>(action, undefined);

  // Tags — uncontrolled MultiSelect (defaultValue), remounted on inline create.
  const [tagOptions, setTagOptions] = useState(tags);
  const [tagIds, setTagIds] = useState<string[]>(initial?.tagIds ?? []);
  const [tagKey, setTagKey] = useState(0);
  const [tagDraft, setTagDraft] = useState<string | null>(null);
  const [tagBusy, startTagBusy] = useTransition();
  const [managingTags, setManagingTags] = useState(false);
  const [editingTag, setEditingTag] = useState<{ id: string; name: string } | null>(null);

  // Dates (DatePicker submits a hidden yyyy-MM-dd via `name`).
  const [birthDate, setBirthDate] = useState<Date | undefined>(
    initial?.birthDate ? new Date(`${initial.birthDate}T00:00:00`) : undefined,
  );
  const [consentDate, setConsentDate] = useState<Date | undefined>(
    initial?.consentAcceptedAt ? new Date(`${initial.consentAcceptedAt}T00:00:00`) : undefined,
  );

  // Addresses — dynamic editor. uid is the stable React key; the submit index is
  // the array position (so removing an item reindexes the hidden field names).
  const [addresses, setAddresses] = useState<AddressEntry[]>(
    () => (initial?.addresses.length ? initial.addresses.map(toEntry) : []),
  );
  const [defaultUid, setDefaultUid] = useState<string | null>(
    () => addresses.find((e) => e.isDefault)?.uid ?? addresses[0]?.uid ?? null,
  );

  useEffect(() => {
    if (actionOk(state)) onSuccess?.();
  }, [state, onSuccess]);

  const addTag = (name: string) => {
    const value = name.trim();
    if (value.length < 2) return;
    startTagBusy(async () => {
      const res = await createCustomerTagAction(slug, value);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setTagOptions((prev) => [...prev, { id: res.tag.id, name: res.tag.name, color: res.tag.color, customerCount: 0 }]);
      setTagIds((prev) => [...prev, res.tag.id]);
      setTagKey((k) => k + 1);
      setTagDraft(null);
      toast.success("Tag criada.");
    });
  };

  const saveTag = (id: string, name: string) => {
    const value = name.trim();
    if (value.length < 2) return;
    startTagBusy(async () => {
      const res = await updateCustomerTagAction(slug, id, value);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setTagOptions((prev) => prev.map((t) => (t.id === id ? { ...t, name: res.tag.name } : t)));
      setTagKey((k) => k + 1);
      setEditingTag(null);
      toast.success("Tag atualizada.");
    });
  };

  const removeTag = (id: string) => {
    startTagBusy(async () => {
      const res = await deleteCustomerTagAction(slug, id);
      if (res && "error" in res) {
        toast.error(res.error);
        return;
      }
      setTagOptions((prev) => prev.filter((t) => t.id !== id));
      setTagIds((prev) => prev.filter((t) => t !== id));
      setTagKey((k) => k + 1);
      toast.success("Tag excluída.");
    });
  };

  const addAddress = () => {
    const entry = toEntry();
    setAddresses((prev) => [...prev, entry]);
    setDefaultUid((d) => d ?? entry.uid);
  };

  const removeAddress = (uid: string) => {
    setAddresses((prev) => {
      const next = prev.filter((e) => e.uid !== uid);
      setDefaultUid((d) => (d === uid ? next[0]?.uid ?? null : d));
      return next;
    });
  };

  const defaultIndex = addresses.findIndex((e) => e.uid === defaultUid);

  return (
    <FormDrawerForm
      action={formAction}
      pending={pending}
      error={actionError(state)}
      onCancel={onCancel}
      submitLabel={isEdit ? "Salvar alterações" : `Criar ${customerLabel.toLowerCase()}`}
    >
      {/* Hidden submit state for tags + addresses */}
      {tagIds.map((id) => (
        <input key={id} type="hidden" name="tagIds" value={id} />
      ))}
      <input type="hidden" name="addressCount" value={addresses.length} />
      <input type="hidden" name="defaultAddressIndex" value={defaultIndex >= 0 ? defaultIndex : ""} />

      <FormSection title="Informações principais">
        <Field label="Nome" htmlFor="name" required className="col-span-full">
          <AffixInput id="name" name="name" required maxLength={150} defaultValue={initial?.name} />
        </Field>
        <Field label="Status" htmlFor="status">
          <Segmented name="status" ariaLabel="Status" defaultValue={initial?.status ?? "active"} options={STATUS_OPTIONS} />
        </Field>
        <Field label="Origem" htmlFor="source">
          <Combobox
            id="source"
            name="source"
            defaultValue={initial?.source ?? ""}
            options={SOURCE_OPTIONS}
            placeholder="Selecione a origem"
            searchPlaceholder="Buscar origem…"
            emptyText="Sem opções."
          />
        </Field>
        <Field label="Tipo de pessoa" htmlFor="personType">
          <Combobox
            id="personType"
            name="personType"
            defaultValue={initial?.personType ?? ""}
            options={PERSON_TYPE_OPTIONS}
            placeholder="Selecione"
            emptyText="Sem opções."
          />
        </Field>
      </FormSection>

      <FormSection title="Contato">
        <Field label="Telefone principal" htmlFor="phone" required hint="Usado para identificar o cliente no WhatsApp.">
          <PhoneInput id="phone" name="phone" defaultValue={initial?.phone ?? ""} />
        </Field>
        <Field label="WhatsApp" htmlFor="whatsapp" hint="Deixe em branco se for igual ao telefone.">
          <PhoneInput id="whatsapp" name="whatsapp" defaultValue={initial?.whatsapp ?? ""} />
        </Field>
        <Field label="E-mail" htmlFor="email" className="col-span-full">
          <AffixInput id="email" name="email" type="email" defaultValue={initial?.email ?? ""} placeholder="email@exemplo.com" />
        </Field>
      </FormSection>

      <FormSection title="Documento e dados pessoais">
        <Field label="CPF / CNPJ" htmlFor="document" hint="Opcional. Não exibido para a IA nem para o cliente.">
          <DocumentInput id="document" name="document" defaultValue={initial?.document ?? ""} />
        </Field>
        <Field label="Data de nascimento" htmlFor="birthDate">
          <DatePicker id="birthDate" name="birthDate" value={birthDate} onChange={setBirthDate} />
        </Field>
      </FormSection>

      <FormSection title="Tags">
        <Field label="Tags do cliente" htmlFor="tagsSelect" className="col-span-full">
          <MultiSelect
            key={`tags-${tagKey}`}
            id="tagsSelect"
            defaultValue={tagIds}
            onValueChange={setTagIds}
            options={tagOptions.map((t) => ({ value: t.id, label: t.name }))}
            placeholder="Selecione tags…"
            searchPlaceholder="Buscar tag…"
            emptyText="Nenhuma tag cadastrada."
          />
        </Field>
        <div className="col-span-full flex flex-wrap items-center gap-2">
          {tagDraft === null ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setTagDraft("")}>
              <Plus /> Nova tag
            </Button>
          ) : (
            <div className="flex flex-1 flex-wrap items-end gap-2">
              <Field label="Nome da tag" htmlFor="newTag" className="min-w-[160px] flex-1">
                <AffixInput
                  id="newTag"
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  placeholder="Ex.: VIP"
                  autoFocus
                  leadIcon={<Tag />}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag(tagDraft);
                    }
                  }}
                />
              </Field>
              <Button type="button" variant="secondary" disabled={tagBusy || tagDraft.trim().length < 2} onClick={() => addTag(tagDraft)}>
                Adicionar
              </Button>
              <Button type="button" variant="ghost" onClick={() => setTagDraft(null)}>
                Cancelar
              </Button>
            </div>
          )}
          {tagOptions.length > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setManagingTags((v) => !v)}>
              <Pencil /> Gerenciar tags
            </Button>
          )}
        </div>
        {managingTags && (
          <div className="col-span-full flex flex-col gap-2 rounded-lg border border-border p-3">
            {tagOptions.map((t) =>
              editingTag?.id === t.id ? (
                <div key={t.id} className="flex items-center gap-2">
                  <AffixInput
                    value={editingTag.name}
                    onChange={(e) => setEditingTag({ id: t.id, name: e.target.value })}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        saveTag(t.id, editingTag.name);
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" size="sm" disabled={tagBusy} onClick={() => saveTag(t.id, editingTag.name)}>
                    Salvar
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditingTag(null)}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div key={t.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">
                    {t.name}
                    {t.customerCount > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">{t.customerCount} cliente(s)</span>
                    )}
                  </span>
                  <span className="flex shrink-0 gap-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditingTag({ id: t.id, name: t.name })}>
                      <Pencil />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" disabled={tagBusy} onClick={() => removeTag(t.id)}>
                      <Trash2 />
                    </Button>
                  </span>
                </div>
              ),
            )}
          </div>
        )}
      </FormSection>

      <FormSection title="Endereços">
        <div className="col-span-full flex flex-col gap-4">
          {addresses.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum endereço. Adicione um endereço, se necessário.</p>
          )}
          {addresses.map((entry, i) => (
            <div key={entry.uid} className="flex flex-col gap-3 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Endereço {i + 1}</span>
                <span className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant={defaultUid === entry.uid ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setDefaultUid(entry.uid)}
                  >
                    <Star className={defaultUid === entry.uid ? "fill-current" : ""} />
                    {defaultUid === entry.uid ? "Padrão" : "Definir padrão"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeAddress(entry.uid)}>
                    <X />
                  </Button>
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 @[440px]:grid-cols-2">
                <Field label="Tipo" htmlFor={`addr${i}_type`}>
                  <Combobox id={`addr${i}_type`} name={`addr${i}_type`} defaultValue={entry.type} options={ADDRESS_TYPE_OPTIONS} />
                </Field>
                <Field label="Identificação" htmlFor={`addr${i}_name`} hint="Ex.: Casa, Trabalho">
                  <AffixInput id={`addr${i}_name`} name={`addr${i}_name`} defaultValue={entry.name} maxLength={120} />
                </Field>
              </div>
              <AddressFormFields prefix={`addr${i}_`} defaultValue={entry.defaultValue} />
            </div>
          ))}
          <div>
            <Button type="button" variant="ghost" size="sm" onClick={addAddress}>
              <Plus /> Adicionar endereço
            </Button>
          </div>
        </div>
      </FormSection>

      <FormSection title="Consentimento (LGPD)">
        <Field label="Consentimento aceito em" htmlFor="consentAcceptedAt">
          <DatePicker id="consentAcceptedAt" name="consentAcceptedAt" value={consentDate} onChange={setConsentDate} />
        </Field>
        <Field
          label="Origem do consentimento"
          htmlFor="consentSource"
          required={Boolean(consentDate)}
          hint="Ex.: WhatsApp, formulário do site."
        >
          <AffixInput id="consentSource" name="consentSource" defaultValue={initial?.consentSource ?? ""} maxLength={120} />
        </Field>
      </FormSection>

      <FormSection title="Observações internas">
        <Field label="Notas internas" htmlFor="internalNotes" className="col-span-full" hint="Não exibidas para clientes nem para a IA.">
          <Textarea id="internalNotes" name="internalNotes" rows={3} maxLength={2000} defaultValue={initial?.internalNotes ?? ""} />
        </Field>
      </FormSection>

      {templateFields.length > 0 && (
        <FormSection title="Campos específicos do nicho">
          {templateFields.map((field) => {
            const name = `custom_${field.key}`;
            const value = initial?.customData?.[field.key];
            if (field.type === "boolean") {
              return (
                <Field key={field.key} label={field.label} htmlFor={name} className="col-span-full">
                  <Combobox
                    id={name}
                    name={name}
                    defaultValue={value === true ? "true" : value === false ? "false" : ""}
                    options={[
                      { value: "true", label: "Sim" },
                      { value: "false", label: "Não" },
                    ]}
                    placeholder="Selecione"
                    emptyText="Sem opções."
                  />
                </Field>
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
