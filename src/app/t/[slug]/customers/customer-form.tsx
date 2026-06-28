"use client";

import { Building2, Check, ChevronRight, Copy, Loader2, Mail, MapPin, PawPrint, Pencil, Plus, Tag, Trash2, User, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { AffixInput, Field } from "@/components/ui/field";
import { FormGrid, FormSection } from "@/components/ui/form-drawer";
import { GlassTimeline, type TimelineItem } from "@/components/ui/glass-timeline";
import { DocumentInput, PhoneInput } from "@/components/ui/masked-inputs";
import { MultiSelect } from "@/components/ui/multiselect";
import { SwitchToggle } from "@/components/ui/switch-toggle";
import { Textarea } from "@/components/ui/textarea";
import { onlyDigits } from "@/lib/masks";
import type { AddressValue } from "@/lib/address/types";
import { actionError, actionOk } from "@/lib/admin/action-result";
import {
  CUSTOMER_ADDRESS_TYPE_LABELS,
  CUSTOMER_ADDRESS_TYPES,
  CUSTOMER_STATUS_LABELS,
  pluralizePt,
} from "@/lib/validations/customer";
import { cn } from "@/lib/utils";
import {
  deriveEntityName,
  entityNameFieldKey,
  type TemplateField,
  type TemplateLayout,
} from "@/lib/validations/template";

import {
  createCustomerAction,
  createCustomerTagAction,
  deleteCustomerEntityAction,
  deleteCustomerTagAction,
  getCustomerAction,
  updateCustomerAction,
  updateCustomerTagAction,
  type CustomerActionResult,
} from "./actions";
import { PetSheet, type PetSheetPet } from "./pet-sheet";
import { TemplateFieldInputs } from "./template-fields";

/** Short "valor · valor · valor" summary of a pet's first non-name fields. */
function petSummary(fields: TemplateField[], values: Record<string, unknown>): string {
  const nameKey = entityNameFieldKey(fields);
  return fields
    .filter((f) => f.key !== nameKey)
    .map((f) => values[f.key])
    .filter((v) => v != null && String(v).trim() !== "")
    .slice(0, 3)
    .map((v) => (Array.isArray(v) ? v.join(", ") : String(v)))
    .join(" · ");
}

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

/** Controlled PF/PJ switch (single button) that submits via a hidden `personType` input. */
function PersonTypeToggle({ value, onChange }: { value: PersonType; onChange: (v: PersonType) => void }) {
  return (
    <SwitchToggle
      name="personType"
      value={value}
      onChange={(v) => onChange(v === "company" ? "company" : "individual")}
      a={{
        value: "individual",
        label: "Pessoa física",
        icon: <User />,
        tint: "var(--lime-200)",
        c: "var(--lime-600)",
        bd: "var(--lime-400)",
        solid: "var(--lime-300)",
        on: "var(--neutral-900)",
      }}
      b={{
        value: "company",
        label: "Pessoa jurídica",
        icon: <Building2 />,
        tint: "oklch(0.63 0.09 230 / 0.14)",
        c: "oklch(0.5 0.1 230)",
        bd: "oklch(0.63 0.09 230 / 0.42)",
        solid: "oklch(0.63 0.09 230)",
        on: "#fff",
      }}
    />
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
  templateLayout,
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
  templateLayout?: TemplateLayout;
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

  // Pets — the niche's related entities. On CREATE they're edited inline and
  // submitted with the customer (pet{i}_id / pet{i}_status / pet{i}_custom_*).
  // On EDIT they're managed independently through the dedicated PetSheet, so the
  // customer save opts out of touching entities (see `entitiesUnmanaged`).
  const [pets, setPets] = useState<PetEntry[]>(
    () => (initial?.entities.filter((e) => e.entityType === entityType).map(toPetEntry) ?? []),
  );

  // Edit-mode pet list (cards) + the PetSheet editor it opens. Seeded from the
  // loaded customer and refetched after each PetSheet save / delete.
  const initialPetList = (): PetSheetPet[] =>
    initial?.entities
      .filter((e) => e.entityType === entityType)
      .map((e) => ({ id: e.id, status: e.status, customData: e.customData })) ?? [];
  const [petList, setPetList] = useState<PetSheetPet[]>(initialPetList);
  const [petEditor, setPetEditor] = useState<{ pet?: PetSheetPet } | null>(null);
  const [petToDelete, setPetToDelete] = useState<PetSheetPet | null>(null);
  const [petsBusy, startPetsBusy] = useTransition();

  const refreshPets = () => {
    if (!initial) return;
    startPetsBusy(async () => {
      const res = await getCustomerAction(slug, initial.id);
      if ("customer" in res) {
        setPetList(
          res.customer.entities
            .filter((e) => e.entityType === entityType)
            .map((e) => ({ id: e.id, status: e.status, customData: e.customData })),
        );
      }
    });
  };

  const confirmDeletePet = () => {
    const pet = petToDelete;
    if (!pet || !initial) return;
    startPetsBusy(async () => {
      const res = await deleteCustomerEntityAction(slug, initial.id, pet.id);
      if (actionOk(res)) {
        toast.success(`${entityLabel} removido.`);
        setPetList((prev) => prev.filter((p) => p.id !== pet.id));
      } else {
        toast.error(actionError(res) ?? "Não foi possível remover.");
      }
      setPetToDelete(null);
    });
  };

  // Steps — mirror the design mockup: Identificação · Endereço · Detalhes · Pets
  // (the Pets step, when the related-entities feature is on, sits last).
  const steps: { key: string; title: string; icon: LucideIcon }[] = [
    { key: "ident", title: "Identificação", icon: User },
    { key: "address", title: "Endereço", icon: MapPin },
    { key: "details", title: "Detalhes", icon: Tag },
    ...(showPets ? [{ key: "pets", title: `${pluralizePt(entityLabel)}`, icon: PawPrint }] : []),
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
    if (activeKey === "ident" && formRef.current) {
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
        {/* Navigation — edit: tabs (free jumping) · create: glass timeline. */}
        {isEdit ? (
          <div
            role="tablist"
            aria-label="Seções do cliente"
            className="flex flex-wrap items-center gap-1.5"
            onKeyDown={(e) => {
              if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
              e.preventDefault();
              const dir = e.key === "ArrowRight" ? 1 : -1;
              const next = (step + dir + steps.length) % steps.length;
              setStep(next);
              e.currentTarget.querySelector<HTMLButtonElement>(`#tab-${steps[next].key}`)?.focus();
            }}
          >
            {steps.map((s, i) => {
              const Icon = s.icon;
              const active = i === step;
              return (
                <button
                  key={s.key}
                  id={`tab-${s.key}`}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={`tabpanel-${s.key}`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => setStep(i)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors [&_svg]:size-4",
                    active
                      ? "border-[var(--lime-300)] bg-[var(--lime-100)] text-foreground"
                      : "border-transparent text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Icon /> {s.title}
                </button>
              );
            })}
          </div>
        ) : (
          <div role="tablist" aria-label="Seções do cliente">
            <GlassTimeline
              items={steps.map<TimelineItem>((s, i) => {
                const Icon = s.icon;
                return {
                  id: s.key,
                  title: s.title,
                  icon: <Icon />,
                  status: i < step ? "completed" : i === step ? "current" : "upcoming",
                  buttonId: `tab-${s.key}`,
                  controls: `tabpanel-${s.key}`,
                };
              })}
              onItemClick={(_id, i) => setStep(i)}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              Etapa <span className="font-semibold text-foreground">{step + 1}</span> de {steps.length}
            </p>
          </div>
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
        {/* Create posts pets inline (pet{i}_*); edit manages them via the
            PetSheet and tells the action to leave entities untouched. */}
        {showPets && !isEdit && <input type="hidden" name="petCount" value={pets.length} />}
        {showPets && isEdit && <input type="hidden" name="entitiesUnmanaged" value="1" />}

        {/* Step 1 — Identificação */}
        <div
          hidden={activeKey !== "ident"}
          className="flex flex-col gap-5"
          role="tabpanel" id="tabpanel-ident" aria-labelledby="tab-ident"
        >
          <FormSection title="Situação cadastral">
            <div className="col-span-full">
              <StatusSwitchItem title="Status do cliente" name="status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
            </div>
          </FormSection>

          <FormSection title="Dados básicos">
            {/* Tipo de cliente takes only the width its toggle needs; Nome fills the rest. */}
            <div className="col-span-full flex flex-wrap items-end gap-3.5">
              <Field label="Tipo de cliente" className="shrink-0">
                <PersonTypeToggle value={personType} onChange={setPersonType} />
              </Field>
              <Field label={nameLabel} htmlFor="name" required className="min-w-[12rem] flex-1">
                <AffixInput
                  id="name"
                  name="name"
                  maxLength={150}
                  defaultValue={initial?.name}
                  leadIcon={isCompany ? <Building2 /> : <User />}
                />
              </Field>
            </div>
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

          <FormSection title="Canais de contato">
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
              <AffixInput id="email" name="email" type="email" leadIcon={<Mail />} defaultValue={initial?.email ?? ""} placeholder="email@exemplo.com" />
            </Field>
          </FormSection>
        </div>

        {/* Step 2 — Endereço */}
        <div
          hidden={activeKey !== "address"}
          className="flex flex-col gap-5"
          role="tabpanel" id="tabpanel-address" aria-labelledby="tab-address"
        >
          <section className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase">Endereços</h3>
              <Button type="button" tone="neutral" appearance="outline" size="sm" className="rounded-lg" onClick={addAddress}>
                <Plus /> Adicionar endereço
              </Button>
            </div>
            <div className="flex flex-col gap-4">
              {addresses.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado.</p>
              )}
              {addresses.map((entry, i) => {
                const isDefault = defaultUid === entry.uid;
                return (
                  <div
                    key={entry.uid}
                    className={cn(
                      "flex flex-col gap-3 rounded-lg border p-3",
                      isDefault ? "border-[var(--lime-500)]" : "border-border",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDefaultUid(entry.uid);
                          markAddressesDirty();
                        }}
                        aria-pressed={isDefault}
                        aria-label={`Definir endereço ${i + 1} como padrão`}
                        className="flex items-center gap-2"
                      >
                        <span
                          className={cn(
                            "grid size-4 shrink-0 place-items-center rounded-full border",
                            isDefault ? "border-[var(--lime-500)]" : "border-border",
                          )}
                        >
                          {isDefault && <span className="size-2 rounded-full bg-[var(--lime-500)]" />}
                        </span>
                        <span className="text-sm font-medium">Endereço {i + 1}</span>
                        {isDefault && <Badge variant="success">Padrão</Badge>}
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remover endereço ${i + 1}`}
                        onClick={() => removeAddress(entry.uid)}
                      >
                        <Trash2 className="text-destructive" />
                      </Button>
                    </div>
                    <FormGrid>
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
                    </FormGrid>
                    <AddressFormFields prefix={`addr${i}_`} defaultValue={entry.defaultValue} onChange={markAddressesDirty} />
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Step 3 — Detalhes */}
        <div
          hidden={activeKey !== "details"}
          className="flex flex-col gap-5"
          role="tabpanel" id="tabpanel-details" aria-labelledby="tab-details"
        >
          <FormSection title="Segmentação">
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
              <TemplateFieldInputs fields={templateFields} layout={templateLayout} values={initial?.customData} />
            </FormSection>
          )}
        </div>

        {/* Step 4 — Pets (related entities) */}
        {showPets && (
          <div
            hidden={activeKey !== "pets"}
            className="flex flex-col gap-4"
            role="tabpanel" id="tabpanel-pets" aria-labelledby="tab-pets"
          >
            {isEdit ? (
              // Edit — pets are real records: a card list that opens the dedicated
              // PetSheet for create/edit and deletes via the entity action.
              <>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase">
                    {pluralizePt(entityLabel)} do cliente
                  </h3>
                  <Button type="button" tone="neutral" appearance="outline" size="sm" className="rounded-lg" onClick={() => setPetEditor({})}>
                    <Plus /> Adicionar {entityLower}
                  </Button>
                </div>
                {petList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum {entityLower} adicionado.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {petList.map((pet, i) => {
                      const name = deriveEntityName(entityTemplateFields, pet.customData) || `${entityLabel} ${i + 1}`;
                      const summary = petSummary(entityTemplateFields, pet.customData);
                      return (
                        <li
                          key={pet.id}
                          className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3"
                        >
                          <button
                            type="button"
                            onClick={() => setPetEditor({ pet })}
                            className="flex flex-1 items-center gap-3 text-left"
                            aria-label={`Editar ${name}`}
                          >
                            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--lime-100)] text-[var(--lime-700)] [&_svg]:size-5">
                              <PawPrint />
                            </span>
                            <span className="flex min-w-0 flex-col">
                              <span className="truncate font-semibold text-foreground">{name}</span>
                              {summary && <span className="truncate text-xs text-muted-foreground">{summary}</span>}
                            </span>
                          </button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            tooltip={`Remover ${name}`}
                            disabled={petsBusy}
                            onClick={() => setPetToDelete(pet)}
                          >
                            <Trash2 className="text-destructive" />
                          </Button>
                          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            ) : (
              // Create — the customer doesn't exist yet, so pets are edited inline
              // and submitted with the form (pet{i}_*).
              <>
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
                  <Button type="button" tone="neutral" appearance="outline" size="sm" className="rounded-lg" onClick={addPet}>
                    <Plus /> Adicionar {entityLower}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
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

      {/* Dedicated pet create/edit sheet (edit mode only). Portals out of this
          form, so its own <form> isn't nested. Refetches the list on save. */}
      {isEdit && showPets && petEditor && (
        <PetSheet
          slug={slug}
          client={{ id: initial!.id, name: initial!.name }}
          entityType={entityType}
          entityLabel={entityLabel}
          templateFields={entityTemplateFields}
          pet={petEditor.pet}
          onClose={() => setPetEditor(null)}
          onSaved={refreshPets}
        />
      )}

      <AlertDialog open={petToDelete !== null} onOpenChange={(open) => !open && setPetToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {entityLower}?</AlertDialogTitle>
            <AlertDialogDescription>
              {petToDelete
                ? `"${deriveEntityName(entityTemplateFields, petToDelete.customData) || entityLabel}" será removido deste cliente. Esta ação não pode ser desfeita.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDeletePet();
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
