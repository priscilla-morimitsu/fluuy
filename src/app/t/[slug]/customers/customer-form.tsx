"use client";

import { Building2, Check, Copy, Loader2, Pencil, Plus, Star, Tag, Trash2, User, X } from "lucide-react";
import { type FormEventHandler, useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusSwitchItem, type StatusOption } from "@/components/forms/status-switch-item";
import { AddressFormFields } from "@/components/ui/address-fields";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { AffixInput, Field } from "@/components/ui/field";
import { FormSection } from "@/components/ui/form-drawer";
import { DocumentInput, PhoneInput } from "@/components/ui/masked-inputs";
import { MultiSelect } from "@/components/ui/multiselect";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { onlyDigits } from "@/lib/masks";
import type { AddressValue } from "@/lib/address/types";
import { actionError, actionOk } from "@/lib/admin/action-result";
import {
  CUSTOMER_ADDRESS_TYPE_LABELS,
  CUSTOMER_ADDRESS_TYPES,
  CUSTOMER_STATUS_LABELS,
  pluralizePt,
} from "@/lib/validations/customer";
import { deriveEntityName, type TemplateField } from "@/lib/validations/template";

import {
  createCustomerAction,
  createCustomerTagAction,
  deleteCustomerTagAction,
  updateCustomerAction,
  updateCustomerTagAction,
  type CustomerActionResult,
} from "./actions";
import { TemplateFieldInputs } from "./template-fields";

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

export type CustomerEntityInitial = {
  id: string;
  entityType: string;
  status: string;
  customData: Record<string, unknown>;
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
  entities: CustomerEntityInitial[];
};

type PersonType = "individual" | "company";

/** Controlled PF/PJ segmented toggle that submits via a hidden `personType` input. */
function PersonTypeToggle({ value, onChange }: { value: PersonType; onChange: (v: PersonType) => void }) {
  const options: { value: PersonType; label: string; icon: typeof User }[] = [
    { value: "individual", label: "Pessoa física", icon: User },
    { value: "company", label: "Pessoa jurídica", icon: Building2 },
  ];
  return (
    <div role="radiogroup" aria-label="Tipo de cliente" className="inline-flex h-11 items-center gap-1 rounded-xl bg-muted p-1 text-sm">
      <input type="hidden" name="personType" value={value} />
      {options.map((o) => {
        const Icon = o.icon;
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
              selected ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// Status options adapted to the customer context (persisted enum values).
const STATUS_OPTIONS: StatusOption[] = [
  {
    value: "active",
    label: CUSTOMER_STATUS_LABELS.active,
    description: `${CUSTOMER_STATUS_LABELS.active} — o cliente é atendido normalmente.`,
    tone: "positive",
    confirm: {
      title: "Reativar cliente?",
      message: "O cliente volta a ser atendido e os agentes de IA retomam a conversa.",
      confirmLabel: "Reativar",
    },
  },
  {
    value: "inactive",
    label: CUSTOMER_STATUS_LABELS.inactive,
    description: `${CUSTOMER_STATUS_LABELS.inactive} — o cliente fica suspenso temporariamente.`,
    confirm: {
      title: "Inativar cliente?",
      message: "O atendimento será suspenso temporariamente. As conversas em andamento ficam pausadas até a reativação.",
      confirmLabel: "Inativar",
    },
  },
  {
    value: "blocked",
    label: CUSTOMER_STATUS_LABELS.blocked,
    description: `${CUSTOMER_STATUS_LABELS.blocked} — o cliente não é atendido pela IA.`,
    tone: "danger",
    confirm: {
      title: "Bloquear cliente?",
      message: "O cliente deixa de ser atendido imediatamente e a IA não responde mais. Reverter exige desbloqueio manual.",
      confirmLabel: "Bloquear",
      danger: true,
    },
  },
];
const ADDRESS_TYPE_OPTIONS = CUSTOMER_ADDRESS_TYPES.map((t) => ({ value: t, label: CUSTOMER_ADDRESS_TYPE_LABELS[t] }));
const PET_STATUS_OPTIONS = [
  { value: "active", label: "Ativo" },
  { value: "inactive", label: "Inativo" },
];

type AddressEntry = { uid: string; defaultValue: Partial<AddressValue>; type: string; name: string; isDefault: boolean };

function toEntry(a?: CustomerAddressInitial): AddressEntry {
  return {
    uid: `addr-${crypto.randomUUID()}`,
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

type PetEntry = { uid: string; id: string | null; status: string; values: Record<string, unknown> };

function toPetEntry(e?: CustomerEntityInitial): PetEntry {
  return {
    uid: `pet-${crypto.randomUUID()}`,
    id: e?.id ?? null,
    status: e?.status === "inactive" ? "inactive" : "active",
    values: e?.customData ?? {},
  };
}

export default function CustomerForm({
  slug,
  tags,
  templateFields,
  customerLabel,
  entityLabel,
  entityType,
  entityTemplateFields,
  showPets,
  initial,
  onSuccess,
  onCancel,
}: {
  slug: string;
  tags: CustomerTagOption[];
  templateFields: TemplateField[];
  customerLabel: string;
  entityLabel: string;
  entityType: string;
  entityTemplateFields: TemplateField[];
  showPets: boolean;
  initial?: CustomerInitial;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const isEdit = Boolean(initial);
  const action = isEdit
    ? updateCustomerAction.bind(null, slug, initial!.id)
    : createCustomerAction.bind(null, slug);
  const [state, formAction, pending] = useActionState<CustomerActionResult, FormData>(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  // Status — controlled via the StatusSwitchItem (every change is confirmed).
  const [status, setStatus] = useState(initial?.status ?? "active");

  // Person type (PF/PJ) — drives dynamic field labels and the birthDate field.
  const [personType, setPersonType] = useState<PersonType>(
    initial?.personType === "company" ? "company" : "individual",
  );
  const isCompany = personType === "company";
  const nameLabel = isCompany ? "Razão social" : "Nome";
  const documentLabel = isCompany ? "CNPJ" : "CPF / CNPJ";

  // WhatsApp — remounted (via key) to seed a new default when the user copies the
  // main phone, since PhoneInput is internally uncontrolled.
  const [whatsappValue, setWhatsappValue] = useState(initial?.whatsapp ?? "");
  const [whatsappKey, setWhatsappKey] = useState(0);
  const copyPhoneToWhatsapp = () => {
    if (!formRef.current) return;
    const phone = String(new FormData(formRef.current).get("phone") ?? "");
    if (!phone) {
      toast.error("Informe o telefone principal primeiro.");
      return;
    }
    setWhatsappValue(phone);
    setWhatsappKey((k) => k + 1);
  };

  // Notas internas — character counter.
  const [notesLength, setNotesLength] = useState(initial?.internalNotes?.length ?? 0);

  // Confirm-before-save (edit only): list changed fields before persisting.
  const [changedFields, setChangedFields] = useState<string[] | null>(null);
  const confirmedRef = useRef(false);

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
  // Tracks whether any address was added, removed, edited or had its default changed,
  // so the save-confirmation diff can report "Endereços" as changed.
  const [addressesDirty, setAddressesDirty] = useState(false);
  const markAddressesDirty = () => setAddressesDirty(true);

  // Pets — the niche's related entities, edited inline. Same uid/index scheme as
  // addresses; each row submits pet{i}_id / pet{i}_status / pet{i}_custom_*.
  const [pets, setPets] = useState<PetEntry[]>(
    () => (initial?.entities.filter((e) => e.entityType === entityType).map(toPetEntry) ?? []),
  );

  // Steps — Pets step only appears when the related-entities feature is on.
  const steps: { key: string; title: string }[] = [
    { key: "main", title: "Dados" },
    { key: "tags", title: "Tags e endereços" },
    ...(showPets ? [{ key: "pets", title: `${pluralizePt(entityLabel)}` }] : []),
    { key: "more", title: "Mais informações" },
  ];
  const [step, setStep] = useState(0);
  const isLast = step === steps.length - 1;
  const activeKey = steps[step]?.key;

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
    markAddressesDirty();
  };

  const removeAddress = (uid: string) => {
    setAddresses((prev) => {
      const next = prev.filter((e) => e.uid !== uid);
      setDefaultUid((d) => (d === uid ? next[0]?.uid ?? null : d));
      return next;
    });
    markAddressesDirty();
  };

  const addPet = () => setPets((prev) => [...prev, toPetEntry()]);
  const removePet = (uid: string) => setPets((prev) => prev.filter((p) => p.uid !== uid));
  const setPetStatus = (uid: string, value: string) =>
    setPets((prev) => prev.map((p) => (p.uid === uid ? { ...p, status: value } : p)));

  const defaultIndex = addresses.findIndex((e) => e.uid === defaultUid);
  const entityLower = entityLabel.toLowerCase();

  // Lightweight client gate so the user can't skip the only hard-required step.
  const goNext = () => {
    if (activeKey === "main" && formRef.current) {
      const data = new FormData(formRef.current);
      const name = String(data.get("name") ?? "").trim();
      const phone = onlyDigits(String(data.get("phone") ?? ""));
      if (name.length < 2) return toast.error("Informe o nome.");
      if (phone.length < 10) return toast.error("Informe um telefone principal válido.");
    }
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  // Compute the changed-fields list for the edit save-confirmation dialog.
  const computeChanged = (form: HTMLFormElement): string[] => {
    const data = new FormData(form);
    const base = initial;
    if (!base) return [];
    const result: string[] = [];
    const cmp = (label: string, next: string, prev: string) => {
      if (next.trim() !== prev.trim()) result.push(label);
    };
    cmp("Status", status, base.status);
    cmp(nameLabel, String(data.get("name") ?? ""), base.name);
    cmp("Tipo de cliente", personType, base.personType ?? "individual");
    cmp("Telefone principal", String(data.get("phone") ?? ""), base.phone);
    cmp("WhatsApp", String(data.get("whatsapp") ?? ""), base.whatsapp ?? "");
    cmp("E-mail", String(data.get("email") ?? ""), base.email ?? "");
    cmp(documentLabel, String(data.get("document") ?? ""), base.document ?? "");
    cmp("Notas internas", String(data.get("internalNotes") ?? ""), base.internalNotes ?? "");
    if (!isCompany) {
      cmp("Data de nascimento", String(data.get("birthDate") ?? ""), base.birthDate ?? "");
    }
    cmp("Tags", [...tagIds].sort().join(","), [...base.tagIds].sort().join(","));
    if (addressesDirty) result.push("Endereços");
    return result;
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    // Create keeps the native multi-step submit; only edit confirms first.
    if (!isEdit || confirmedRef.current) {
      confirmedRef.current = false;
      return;
    }
    e.preventDefault();
    setChangedFields(computeChanged(e.currentTarget));
  };

  const confirmSave = () => {
    confirmedRef.current = true;
    setChangedFields(null);
    formRef.current?.requestSubmit();
  };

  return (
    <form ref={formRef} action={formAction} onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="@container flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5">
        {/* Navigation — tabs (free) on edit, sequential stepper on create */}
        {isEdit ? (
          <div
            role="tablist"
            aria-label="Seções do cliente"
            className="flex flex-wrap items-center gap-1.5 text-xs"
            onKeyDown={(e) => {
              if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
              e.preventDefault();
              const dir = e.key === "ArrowRight" ? 1 : -1;
              const nextIndex = (step + dir + steps.length) % steps.length;
              setStep(nextIndex);
              const nextTab = e.currentTarget.querySelector<HTMLButtonElement>(`#tab-${steps[nextIndex].key}`);
              nextTab?.focus();
            }}
          >
            {steps.map((s, i) => (
              <button
                key={s.key}
                id={`tab-${s.key}`}
                type="button"
                role="tab"
                aria-selected={i === step}
                aria-controls={`tabpanel-${s.key}`}
                tabIndex={i === step ? 0 : -1}
                onClick={() => setStep(i)}
                className={
                  "rounded-full border px-2.5 py-1 font-medium transition-colors " +
                  (i === step
                    ? "border-[var(--lime-400)] bg-(--lime-50) text-foreground"
                    : "border-border text-muted-foreground hover:bg-muted")
                }
              >
                {s.title}
              </button>
            ))}
          </div>
        ) : (
          <ol className="flex flex-wrap items-center gap-1.5 text-xs">
            {steps.map((s, i) => (
              <li key={s.key} className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  className={
                    "rounded-full border px-2.5 py-1 font-medium transition-colors " +
                    (i === step
                      ? "border-[var(--lime-400)] bg-(--lime-50) text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted")
                  }
                  aria-current={i === step ? "step" : undefined}
                >
                  {i + 1}. {s.title}
                </button>
                {i < steps.length - 1 && <span className="text-muted-foreground/50">›</span>}
              </li>
            ))}
          </ol>
        )}

        {actionError(state) && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {actionError(state)}
          </p>
        )}

        {/* Hidden submit state for tags + addresses + pets */}
        {tagIds.map((id) => (
          <input key={id} type="hidden" name="tagIds" value={id} />
        ))}
        <input type="hidden" name="addressCount" value={addresses.length} />
        <input type="hidden" name="defaultAddressIndex" value={defaultIndex >= 0 ? defaultIndex : ""} />
        {showPets && <input type="hidden" name="petCount" value={pets.length} />}

        {/* Step 1 — Dados */}
        <div
          hidden={activeKey !== "main"}
          className="flex flex-col gap-5"
          {...(isEdit ? { role: "tabpanel", id: "tabpanel-main", "aria-labelledby": "tab-main" } : {})}
        >
          <FormSection title="Informações principais">
            <div className="col-span-full">
              <StatusSwitchItem title="Status do cliente" name="status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
            </div>
            <Field label="Tipo de cliente" className="col-span-full">
              <PersonTypeToggle value={personType} onChange={setPersonType} />
            </Field>
            <Field label={nameLabel} htmlFor="name" required className="col-span-full">
              <AffixInput
                id="name"
                name="name"
                maxLength={150}
                defaultValue={initial?.name}
                leadIcon={isCompany ? <Building2 /> : <User />}
              />
            </Field>
          </FormSection>

          <FormSection title="Contato">
            <Field label="Telefone principal" htmlFor="phone" required hint="Usado para identificar o cliente no WhatsApp.">
              <PhoneInput id="phone" name="phone" defaultValue={initial?.phone ?? ""} />
            </Field>
            <Field label="WhatsApp" htmlFor="whatsapp" hint="Deixe em branco se for igual ao telefone.">
              <div className="flex flex-col gap-1.5">
                <PhoneInput key={`whatsapp-${whatsappKey}`} id="whatsapp" name="whatsapp" defaultValue={whatsappValue} />
                <Button type="button" variant="ghost" size="sm" className="self-start" onClick={copyPhoneToWhatsapp}>
                  <Copy /> Usar telefone principal
                </Button>
              </div>
            </Field>
            <Field label="E-mail" htmlFor="email" className="col-span-full">
              <AffixInput id="email" name="email" type="email" defaultValue={initial?.email ?? ""} placeholder="email@exemplo.com" />
            </Field>
          </FormSection>

          <FormSection title="Documento e dados pessoais">
            <Field label={documentLabel} htmlFor="document" hint="Opcional. Não exibido para a IA nem para o cliente.">
              <DocumentInput id="document" name="document" defaultValue={initial?.document ?? ""} />
            </Field>
            {/* Kept mounted (visually hidden for companies) so the hidden yyyy-MM-dd
                input is always submitted and an existing birthDate is never wiped. */}
            <div hidden={isCompany}>
              <Field label="Data de nascimento" htmlFor="birthDate">
                <DatePicker id="birthDate" name="birthDate" value={birthDate} onChange={setBirthDate} />
              </Field>
            </div>
          </FormSection>
        </div>

        {/* Step 2 — Tags e endereços */}
        <div
          hidden={activeKey !== "tags"}
          className="flex flex-col gap-5"
          {...(isEdit ? { role: "tabpanel", id: "tabpanel-tags", "aria-labelledby": "tab-tags" } : {})}
        >
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Editar tag ${t.name}`}
                          onClick={() => setEditingTag({ id: t.id, name: t.name })}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Excluir tag ${t.name}`}
                          disabled={tagBusy}
                          onClick={() => removeTag(t.id)}
                        >
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
                        onClick={() => {
                          setDefaultUid(entry.uid);
                          markAddressesDirty();
                        }}
                      >
                        <Star className={defaultUid === entry.uid ? "fill-current" : ""} />
                        {defaultUid === entry.uid ? "Padrão" : "Definir padrão"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Remover endereço ${i + 1}`}
                        onClick={() => removeAddress(entry.uid)}
                      >
                        <X />
                      </Button>
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 @[440px]:grid-cols-2">
                    <Field label="Tipo" htmlFor={`addr${i}_type`}>
                      <Combobox
                        id={`addr${i}_type`}
                        name={`addr${i}_type`}
                        defaultValue={entry.type}
                        options={ADDRESS_TYPE_OPTIONS}
                        onValueChange={markAddressesDirty}
                      />
                    </Field>
                    <Field label="Identificação" htmlFor={`addr${i}_name`} hint="Ex.: Casa, Trabalho">
                      <AffixInput
                        id={`addr${i}_name`}
                        name={`addr${i}_name`}
                        defaultValue={entry.name}
                        maxLength={120}
                        onChange={markAddressesDirty}
                      />
                    </Field>
                  </div>
                  <AddressFormFields prefix={`addr${i}_`} defaultValue={entry.defaultValue} onChange={markAddressesDirty} />
                </div>
              ))}
              <div>
                <Button type="button" variant="ghost" size="sm" onClick={addAddress}>
                  <Plus /> Adicionar endereço
                </Button>
              </div>
            </div>
          </FormSection>
        </div>

        {/* Step 3 — Pets (related entities) */}
        {showPets && (
          <div
            hidden={activeKey !== "pets"}
            className="flex flex-col gap-4"
            {...(isEdit ? { role: "tabpanel", id: "tabpanel-pets", "aria-labelledby": "tab-pets" } : {})}
          >
            <p className="text-sm text-muted-foreground">
              O cliente é o tutor principal. Adicione um ou mais {pluralizePt(entityLabel).toLowerCase()} vinculados a ele.
            </p>
            {pets.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum {entityLower} adicionado.</p>
            )}
            {pets.map((pet, i) => (
              <div key={pet.uid} className="flex flex-col gap-3 rounded-lg border border-border p-3">
                <input type="hidden" name={`pet${i}_id`} value={pet.id ?? ""} />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {deriveEntityName(entityTemplateFields, pet.values) || `${entityLabel} ${i + 1}`}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Remover ${entityLabel} ${i + 1}`}
                    onClick={() => removePet(pet.uid)}
                  >
                    <X />
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-3.5 @[440px]:grid-cols-2">
                  <TemplateFieldInputs fields={entityTemplateFields} prefix={`pet${i}_custom_`} values={pet.values} />
                  <Field label="Status" htmlFor={`pet${i}_status`}>
                    <Combobox
                      id={`pet${i}_status`}
                      name={`pet${i}_status`}
                      value={pet.status}
                      onValueChange={(v) => setPetStatus(pet.uid, v)}
                      options={PET_STATUS_OPTIONS}
                    />
                  </Field>
                </div>
              </div>
            ))}
            <div>
              <Button type="button" variant="ghost" size="sm" onClick={addPet}>
                <Plus /> Adicionar {entityLower}
              </Button>
            </div>
          </div>
        )}

        {/* Last step — Consentimento, observações e campos do nicho */}
        <div
          hidden={activeKey !== "more"}
          className="flex flex-col gap-5"
          {...(isEdit ? { role: "tabpanel", id: "tabpanel-more", "aria-labelledby": "tab-more" } : {})}
        >
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
            <Field
              label="Notas internas"
              htmlFor="internalNotes"
              className="col-span-full"
              hint="Não exibidas para clientes nem para a IA."
              counter={`${notesLength}/2000`}
            >
              <Textarea
                id="internalNotes"
                name="internalNotes"
                rows={3}
                maxLength={2000}
                defaultValue={initial?.internalNotes ?? ""}
                onChange={(e) => setNotesLength(e.target.value.length)}
              />
            </Field>
          </FormSection>

          {templateFields.length > 0 && (
            <FormSection title="Campos específicos do nicho">
              <TemplateFieldInputs fields={templateFields} values={initial?.customData} />
            </FormSection>
          )}
        </div>
      </div>

      {/* Footer — edit: Cancelar / Salvar · create: stepper navigation */}
      <div className="flex shrink-0 items-center gap-3 border-t border-(--glass-border) p-4">
        {isEdit ? (
          <>
            <span className="mr-auto text-xs text-muted-foreground">
              <span className="text-destructive">*</span> campos obrigatórios
            </span>
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" variant="brand" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </>
        ) : (
          <>
            <span className="mr-auto text-xs text-muted-foreground">
              <span className="text-destructive">*</span> campos obrigatórios · Passo {step + 1} de {steps.length}
            </span>
            {step > 0 ? (
              <Button type="button" variant="secondary" onClick={() => setStep((s) => Math.max(s - 1, 0))}>
                Voltar
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            {isLast ? (
              <Button type="submit" variant="brand" disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                {pending ? "Salvando…" : `Criar ${customerLabel.toLowerCase()}`}
              </Button>
            ) : (
              <Button type="button" variant="brand" onClick={goNext}>
                Avançar
              </Button>
            )}
          </>
        )}
      </div>

      <AlertDialog open={changedFields !== null} onOpenChange={(open) => !open && setChangedFields(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              {changedFields && changedFields.length > 0
                ? "Você alterou os campos abaixo. Confirme para salvar as alterações."
                : "Confirme para salvar este cliente."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {changedFields && changedFields.length > 0 && (
            <ul className="flex flex-col gap-1 rounded-lg border border-border bg-muted/40 p-3 text-sm">
              {changedFields.map((label) => (
                <li key={label} className="flex items-center gap-2">
                  <Check className="size-3.5 text-success" aria-hidden />
                  {label}
                </li>
              ))}
            </ul>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmSave();
              }}
            >
              Salvar alterações
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
