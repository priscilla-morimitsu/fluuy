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
import { MultiSelect } from "@/components/ui/multiselect";
import { Segmented } from "@/components/ui/segmented";
import { SwitchCard } from "@/components/ui/switch-card";
import { Textarea } from "@/components/ui/textarea";
import { actionError, actionOk } from "@/lib/admin/action-result";
import {
  LOCATION_TYPE_LABELS,
  LOCATION_TYPES,
  type LocationType,
} from "@/lib/validations/location";
import {
  SERVICE_DELIVERY_MODE_LABELS,
  SERVICE_DELIVERY_MODES,
  type ServiceDeliveryMode,
} from "@/lib/validations/service";
import type { TemplateField } from "@/lib/validations/template";

import {
  createLocationAction,
  createProfessionalAction,
  createServiceAction,
  createServiceCategoryAction,
  updateServiceAction,
  type ServiceActionResult,
} from "./actions";

export type ServiceCategoryOption = { id: string; name: string };
export type ProfessionalOption = { id: string; name: string };
export type LocationOption = { id: string; name: string; type: LocationType };

export type ServiceInitial = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  basePrice: string;
  promotionalPrice: string | null;
  estimatedDurationMinutes: number | null;
  status: string;
  availableForBooking: boolean;
  requiresScheduling: boolean;
  deliveryModes: string[];
  onlineInstructions: string | null;
  homeServiceNotes: string | null;
  imageUrl: string | null;
  internalNotes: string | null;
  customData: Record<string, unknown>;
  professionalIds: string[];
  locationIds: string[];
};

const STATUS_OPTIONS = [
  { value: "draft", label: "Rascunho" },
  { value: "active", label: "Ativo" },
  { value: "inactive", label: "Inativo" },
];

export default function ServiceForm({
  slug,
  categories,
  professionals,
  locations,
  templateFields,
  initial,
  onSuccess,
  onCancel,
}: {
  slug: string;
  categories: ServiceCategoryOption[];
  professionals: ProfessionalOption[];
  locations: LocationOption[];
  templateFields: TemplateField[];
  initial?: ServiceInitial;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const isEdit = Boolean(initial);
  const action = isEdit
    ? updateServiceAction.bind(null, slug, initial!.id)
    : createServiceAction.bind(null, slug);
  const [state, formAction, pending] = useActionState<ServiceActionResult, FormData>(action, undefined);

  const [cats, setCats] = useState(categories);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [creatingCat, startCreateCat] = useTransition();

  const [modes, setModes] = useState<ServiceDeliveryMode[]>(
    (initial?.deliveryModes ?? []).filter((m): m is ServiceDeliveryMode =>
      (SERVICE_DELIVERY_MODES as readonly string[]).includes(m),
    ),
  );
  const [requiresScheduling, setRequiresScheduling] = useState(initial?.requiresScheduling ?? true);
  const [removedImage, setRemovedImage] = useState(false);
  const showCurrentImage = Boolean(initial?.imageUrl) && !removedImage;

  // MultiSelect is uncontrolled (defaultValue), so inline-created items are
  // applied by appending to the options and bumping the remount key.
  const [profOptions, setProfOptions] = useState(professionals);
  const [profIds, setProfIds] = useState<string[]>(initial?.professionalIds ?? []);
  const [profKey, setProfKey] = useState(0);
  const [profCreating, startCreateProf] = useTransition();
  const [profDraft, setProfDraft] = useState<string | null>(null);

  const [locOptions, setLocOptions] = useState(locations);
  const [locIds, setLocIds] = useState<string[]>(initial?.locationIds ?? []);
  const [locKey, setLocKey] = useState(0);
  const [locCreating, startCreateLoc] = useTransition();
  const [locDraft, setLocDraft] = useState<{ name: string; type: LocationType } | null>(null);

  const addProfessional = (name: string) => {
    if (name.trim().length < 2) return;
    startCreateProf(async () => {
      const res = await createProfessionalAction(slug, name.trim());
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setProfOptions((prev) => [...prev, res.professional]);
      setProfIds((prev) => [...prev, res.professional.id]);
      setProfKey((k) => k + 1);
      setProfDraft(null);
      toast.success("Profissional criado.");
    });
  };

  const addLocation = (name: string, type: LocationType) => {
    if (name.trim().length < 2) return;
    startCreateLoc(async () => {
      const res = await createLocationAction(slug, name.trim(), type);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setLocOptions((prev) => [...prev, res.location]);
      setLocIds((prev) => [...prev, res.location.id]);
      setLocKey((k) => k + 1);
      setLocDraft(null);
      toast.success("Local criado.");
    });
  };

  useEffect(() => {
    if (actionOk(state)) onSuccess?.();
  }, [state, onSuccess]);

  const handleCategoryChange = (value: string) => {
    if (value === "" || cats.some((c) => c.id === value)) {
      setCategoryId(value);
      return;
    }
    // A typed value that isn't an existing id → create the category inline.
    startCreateCat(async () => {
      const res = await createServiceCategoryAction(slug, value);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setCats((prev) => [...prev, { id: res.category.id, name: res.category.name }]);
      setCategoryId(res.category.id);
      toast.success("Categoria criada.");
    });
  };

  return (
    <FormDrawerForm
      action={formAction}
      pending={pending}
      error={actionError(state)}
      onCancel={onCancel}
      submitLabel={isEdit ? "Salvar alterações" : "Criar serviço"}
    >
      <input type="hidden" name="categoryId" value={categoryId} />
      {removedImage && <input type="hidden" name="removeImage" value="true" />}

      <FormSection title="Dados gerais">
        <Field label="Nome" htmlFor="name" required className="col-span-full">
          <AffixInput id="name" name="name" required maxLength={150} defaultValue={initial?.name} />
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
          <Textarea
            id="description"
            name="description"
            rows={3}
            maxLength={2000}
            defaultValue={initial?.description ?? ""}
          />
        </Field>
      </FormSection>

      <FormSection title="Imagem">
        <div className="col-span-full flex flex-col gap-2">
          {showCurrentImage && (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={initial!.imageUrl!}
                alt=""
                className="size-[120px] rounded-xl border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => setRemovedImage(true)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" /> Remover imagem atual
              </button>
            </div>
          )}
          <ImageUpload
            name="image"
            size="M"
            label={showCurrentImage ? "Substituir imagem" : "Enviar imagem"}
            hint="PNG, JPG ou WEBP · até 5 MB"
          />
        </div>
      </FormSection>

      <FormSection title="Preço e duração">
        <Field label="Preço base" htmlFor="basePrice" required>
          <CurrencyInput id="basePrice" name="basePrice" required defaultValue={initial?.basePrice ?? ""} />
        </Field>
        <Field label="Preço promocional" htmlFor="promotionalPrice">
          <CurrencyInput
            id="promotionalPrice"
            name="promotionalPrice"
            defaultValue={initial?.promotionalPrice ?? ""}
          />
        </Field>
        <Field
          label="Duração estimada"
          htmlFor="estimatedDurationMinutes"
          required={requiresScheduling}
          hint={requiresScheduling ? "Obrigatória para serviços com agendamento." : "Opcional."}
        >
          <AffixInput
            id="estimatedDurationMinutes"
            name="estimatedDurationMinutes"
            type="number"
            min={1}
            step={1}
            suffix="min"
            defaultValue={initial?.estimatedDurationMinutes ?? ""}
          />
        </Field>
        <SwitchCard
          title="Exige agendamento"
          hint="O serviço precisa de horário marcado."
          name="requiresScheduling"
          defaultChecked={initial?.requiresScheduling ?? true}
          onChange={setRequiresScheduling}
          className="col-span-full"
        />
        <SwitchCard
          title="Disponível para reserva"
          hint="A IA só oferece serviços ativos e disponíveis."
          name="availableForBooking"
          defaultChecked={initial?.availableForBooking ?? true}
          className="col-span-full"
        />
      </FormSection>

      <FormSection title="Modalidades de atendimento">
        <Field label="Modalidades" htmlFor="deliveryModes" required className="col-span-full">
          <MultiSelect
            id="deliveryModes"
            name="deliveryModes"
            defaultValue={modes}
            onValueChange={(v) => setModes(v as ServiceDeliveryMode[])}
            options={SERVICE_DELIVERY_MODES.map((m) => ({ value: m, label: SERVICE_DELIVERY_MODE_LABELS[m] }))}
            placeholder="Selecione as modalidades…"
            emptyText="Sem modalidades."
          />
        </Field>
        {modes.includes("online") && (
          <Field label="Instruções para atendimento online" htmlFor="onlineInstructions" className="col-span-full">
            <Textarea
              id="onlineInstructions"
              name="onlineInstructions"
              rows={2}
              maxLength={2000}
              placeholder="Link da sala, plataforma, instruções de acesso…"
              defaultValue={initial?.onlineInstructions ?? ""}
            />
          </Field>
        )}
        {modes.includes("at_home") && (
          <Field label="Observações para atendimento em domicílio" htmlFor="homeServiceNotes" className="col-span-full">
            <Textarea
              id="homeServiceNotes"
              name="homeServiceNotes"
              rows={2}
              maxLength={2000}
              placeholder="Raio de atendimento, materiais necessários, observações…"
              defaultValue={initial?.homeServiceNotes ?? ""}
            />
          </Field>
        )}
      </FormSection>

      <FormSection title="Profissionais">
        <Field
          label="Profissionais que atendem"
          htmlFor="professionalIds"
          className="col-span-full"
          hint="Opcional. Vincule quem realiza o serviço."
        >
          <MultiSelect
            key={`prof-${profKey}`}
            id="professionalIds"
            name="professionalIds"
            defaultValue={profIds}
            onValueChange={setProfIds}
            options={profOptions.map((p) => ({ value: p.id, label: p.name }))}
            placeholder="Selecione profissionais…"
            searchPlaceholder="Buscar profissional…"
            emptyText="Nenhum profissional cadastrado."
          />
        </Field>
        <div className="col-span-full">
          {profDraft === null ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setProfDraft("")}>
              <Plus /> Novo profissional
            </Button>
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Nome do profissional" htmlFor="newProf" className="min-w-[180px] flex-1">
                <AffixInput
                  id="newProf"
                  value={profDraft}
                  onChange={(e) => setProfDraft(e.target.value)}
                  placeholder="Ex.: Dra. Ana Lima"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addProfessional(profDraft);
                    }
                  }}
                />
              </Field>
              <Button
                type="button"
                variant="secondary"
                disabled={profCreating || profDraft.trim().length < 2}
                onClick={() => addProfessional(profDraft)}
              >
                Adicionar
              </Button>
              <Button type="button" variant="ghost" onClick={() => setProfDraft(null)}>
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </FormSection>

      {modes.includes("at_location") && (
        <FormSection title="Locais físicos">
          <Field
            label="Locais de atendimento"
            htmlFor="locationIds"
            className="col-span-full"
            hint="Necessário para atendimento presencial com agendamento (exceto rascunho)."
          >
            <MultiSelect
              key={`loc-${locKey}`}
              id="locationIds"
              name="locationIds"
              defaultValue={locIds}
              onValueChange={setLocIds}
              options={locOptions.map((l) => ({
                value: l.id,
                label: l.name,
                description: LOCATION_TYPE_LABELS[l.type],
              }))}
              placeholder="Selecione locais…"
              searchPlaceholder="Buscar local…"
              emptyText="Nenhum local cadastrado."
            />
          </Field>
          <div className="col-span-full">
            {locDraft === null ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setLocDraft({ name: "", type: "physical_unit" })}
              >
                <Plus /> Novo local
              </Button>
            ) : (
              <div className="flex flex-wrap items-end gap-2">
                <Field label="Nome do local" htmlFor="newLoc" className="min-w-[160px] flex-1">
                  <AffixInput
                    id="newLoc"
                    value={locDraft.name}
                    onChange={(e) => setLocDraft({ ...locDraft, name: e.target.value })}
                    placeholder="Ex.: Unidade Centro"
                    autoFocus
                  />
                </Field>
                <Field label="Tipo" htmlFor="newLocType" className="w-40">
                  <Combobox
                    id="newLocType"
                    value={locDraft.type}
                    onValueChange={(v) => setLocDraft({ ...locDraft, type: v as LocationType })}
                    options={LOCATION_TYPES.map((t) => ({ value: t, label: LOCATION_TYPE_LABELS[t] }))}
                  />
                </Field>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={locCreating || locDraft.name.trim().length < 2}
                  onClick={() => addLocation(locDraft.name, locDraft.type)}
                >
                  Adicionar
                </Button>
                <Button type="button" variant="ghost" onClick={() => setLocDraft(null)}>
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        </FormSection>
      )}

      <FormSection title="Publicação">
        <Field label="Status" htmlFor="status" className="col-span-full">
          <Segmented name="status" ariaLabel="Status" defaultValue={initial?.status ?? "draft"} options={STATUS_OPTIONS} />
        </Field>
        <Field label="Notas internas" htmlFor="internalNotes" className="col-span-full" hint="Não exibidas para clientes nem para a IA.">
          <Textarea
            id="internalNotes"
            name="internalNotes"
            rows={2}
            maxLength={2000}
            defaultValue={initial?.internalNotes ?? ""}
          />
        </Field>
      </FormSection>

      {templateFields.length > 0 && (
        <FormSection title="Campos específicos do nicho">
          {templateFields.map((field) => {
            const name = `custom_${field.key}`;
            const value = initial?.customData?.[field.key];
            if (field.type === "boolean") {
              return (
                <SwitchCard
                  key={field.key}
                  title={field.label}
                  name={name}
                  defaultChecked={Boolean(value)}
                  className="col-span-full"
                />
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
                  <Textarea
                    id={name}
                    name={name}
                    rows={2}
                    defaultValue={value != null ? String(value) : ""}
                    required={field.required}
                  />
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
