"use client";

import { Hash, MapPin, Search } from "lucide-react";
import * as React from "react";

import { Combobox, type ComboOption } from "@/components/ui/combobox";
import { AffixInput, Field } from "@/components/ui/field";
import { FormGrid } from "@/components/ui/form-drawer";
import {
  afterCepLookup,
  afterFieldEdit,
  afterStreetLookup,
  isInvalidatingField,
  NOTICE_MESSAGES,
  type EditNotice,
} from "@/lib/address/lookup-state";
import {
  emptyAddress,
  initialLookupState,
  isValidUf,
  normalizeCep,
  UFS,
  type AddressLookupState,
  type AddressSuggestion,
  type AddressValue,
} from "@/lib/address/types";
import { searchAddressByCep, searchAddressesByStreet } from "@/lib/address/viacep";
import { maskCep } from "@/lib/masks";

const UF_OPTIONS: ComboOption[] = UFS.map((u) => ({ value: u.value, label: `${u.value} - ${u.label}` }));
const streetKey = (s: AddressSuggestion) => `${s.cep}|${s.street}|${s.neighborhood}`;

type AddressErrors = Partial<Record<keyof AddressValue, string>>;

/**
 * Fluuy Design System — AddressFormFields.
 * Brazilian address block: CEP first (ViaCEP lookup), street/neighborhood/city/UF
 * as searchable comboboxes, with origin tracking + reset (editing an auto-filled
 * field clears the CEP and marks the source "mixed"). Submits normalized values
 * via hidden inputs (`${prefix}cep`, `${prefix}street`, …).
 */
export function AddressFormFields({
  prefix = "",
  defaultValue,
  onChange,
  required = false,
  disabled = false,
  errors = {},
  showReference = true,
}: {
  prefix?: string;
  defaultValue?: Partial<AddressValue>;
  onChange?: (value: AddressValue, lookup: AddressLookupState) => void;
  required?: boolean;
  disabled?: boolean;
  errors?: AddressErrors;
  showReference?: boolean;
}) {
  const [value, setValue] = React.useState<AddressValue>(() => emptyAddress(defaultValue));
  const [lookup, setLookup] = React.useState<AddressLookupState>(initialLookupState);
  const [cepLoading, setCepLoading] = React.useState(false);
  const [streetLoading, setStreetLoading] = React.useState(false);
  const [streetResults, setStreetResults] = React.useState<AddressSuggestion[]>([]);
  const [notice, setNotice] = React.useState<EditNotice>(null);
  const [filledByCep, setFilledByCep] = React.useState(false);
  const [cepNotFound, setCepNotFound] = React.useState(false);
  const streetTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const commit = (next: AddressValue, nextLookup: AddressLookupState) => {
    setValue(next);
    setLookup(nextLookup);
    onChange?.(next, nextLookup);
  };

  /** Set a single field, applying origin/reset rules for invalidating fields. */
  const setField = (field: keyof AddressValue, val: string) => {
    const next: AddressValue = { ...value, [field]: val };
    let nextLookup = lookup;
    if (isInvalidatingField(field as string)) {
      const r = afterFieldEdit(lookup, field as string);
      nextLookup = r.lookup;
      if (r.clearCep) next.cep = "";
      setNotice(r.notice);
      if (r.clearCep) setFilledByCep(false);
    }
    // Changing UF by hand drops a city/neighborhood that may not belong to it.
    if (field === "state") {
      next.city = "";
      next.neighborhood = "";
    }
    commit(next, nextLookup);
  };

  const doCepLookup = async (rawCep: string) => {
    const digits = normalizeCep(rawCep);
    if (digits.length !== 8) return;
    setCepLoading(true);
    setCepNotFound(false);
    const sug = await searchAddressByCep(digits);
    setCepLoading(false);
    if (sug) {
      const next: AddressValue = {
        ...value,
        cep: sug.cep,
        street: sug.street,
        neighborhood: sug.neighborhood,
        city: sug.city,
        state: sug.state,
        ibge: sug.ibge ?? "",
        ddd: sug.ddd ?? "",
        siafi: sug.siafi ?? "",
      };
      setNotice(null);
      setFilledByCep(true);
      commit(next, afterCepLookup(sug));
    } else {
      setFilledByCep(false);
      setCepNotFound(true);
    }
  };

  const onCepChange = (masked: string) => {
    const digits = normalizeCep(masked);
    const next = { ...value, cep: digits };
    setCepNotFound(false);
    commit(next, lookup);
    if (digits.length === 8) void doCepLookup(digits);
  };

  const runStreetSearch = (query: string) => {
    if (streetTimer.current) clearTimeout(streetTimer.current);
    streetTimer.current = setTimeout(async () => {
      if (!isValidUf(value.state) || value.city.trim().length < 1 || query.trim().length < 3) {
        setStreetResults([]);
        return;
      }
      setStreetLoading(true);
      const res = await searchAddressesByStreet({ uf: value.state, city: value.city, street: query });
      setStreetLoading(false);
      setStreetResults(res);
    }, 350);
  };

  const onStreetSelect = (val: string) => {
    const sug = streetResults.find((s) => streetKey(s) === val);
    if (sug) {
      const next: AddressValue = {
        ...value,
        cep: sug.cep || value.cep,
        street: sug.street,
        neighborhood: sug.neighborhood,
        city: sug.city,
        state: sug.state,
        ibge: sug.ibge ?? value.ibge,
        ddd: sug.ddd ?? value.ddd,
        siafi: sug.siafi ?? value.siafi,
      };
      setNotice(null);
      setFilledByCep(false);
      commit(next, afterStreetLookup(streetKey(sug), sug));
    } else {
      setField("street", val);
    }
  };

  const hidden = (k: keyof AddressValue) => `${prefix}${k}`;
  const fid = (k: string) => `${prefix}addr-${k}`;
  const streetOptions: ComboOption[] = streetResults.map((s) => ({
    value: streetKey(s),
    label: s.street,
    description: `${s.neighborhood} · ${s.city}`,
  }));

  return (
    <div className="flex flex-col gap-3.5">
      {/* Hidden, normalized values for the server action / Zod. */}
      <input type="hidden" name={hidden("cep")} value={value.cep} />
      <input type="hidden" name={hidden("street")} value={value.street} />
      <input type="hidden" name={hidden("number")} value={value.number} />
      <input type="hidden" name={hidden("complement")} value={value.complement} />
      <input type="hidden" name={hidden("neighborhood")} value={value.neighborhood} />
      <input type="hidden" name={hidden("city")} value={value.city} />
      <input type="hidden" name={hidden("state")} value={value.state} />
      <input type="hidden" name={hidden("country")} value={value.country} />
      {showReference && <input type="hidden" name={hidden("reference")} value={value.reference ?? ""} />}

      <FormGrid>
        {/* 1. CEP · 2. Número (same line) */}
        <Field
          label="CEP"
          htmlFor={fid("cep")}
          required={required}
          error={errors.cep}
          hint={cepNotFound ? "CEP não encontrado — preencha manualmente." : filledByCep ? "Endereço preenchido pelo CEP." : undefined}
        >
          <AffixInput
            id={fid("cep")}
            inputMode="numeric"
            leadIcon={<MapPin />}
            loading={cepLoading}
            invalid={Boolean(errors.cep)}
            disabled={disabled}
            placeholder="00000-000"
            value={maskCep(value.cep)}
            onChange={(e) => onCepChange(e.target.value)}
            trail={
              <button
                type="button"
                aria-label="Buscar endereço pelo CEP"
                onClick={() => void doCepLookup(value.cep)}
                disabled={value.cep.length !== 8 || disabled}
                className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-(--glass-bg-hover) disabled:opacity-40"
              >
                <Search className="size-4" />
              </button>
            }
          />
        </Field>
        <Field label="Número" htmlFor={fid("number")} required={required} error={errors.number}>
          <AffixInput
            id={fid("number")}
            leadIcon={<Hash />}
            disabled={disabled}
            invalid={Boolean(errors.number)}
            placeholder="123"
            value={value.number}
            onChange={(e) => setField("number", e.target.value)}
          />
        </Field>

        {/* 3. Logradouro (full width) */}
        <Field label="Logradouro" htmlFor={fid("street")} required={required} error={errors.street} className="col-span-full">
          <Combobox
            id={fid("street")}
            value={value.street}
            onValueChange={onStreetSelect}
            onSearchChange={runStreetSearch}
            options={streetOptions}
            loading={streetLoading}
            filter={false}
            allowCustom
            disabled={disabled}
            ariaInvalid={Boolean(errors.street)}
            placeholder="Rua, avenida…"
            searchPlaceholder="Digite a rua (mín. 3 letras)…"
            emptyText="Nenhuma rua encontrada — digite para usar manualmente."
          />
        </Field>

        {/* 4. Complemento · 5. Bairro */}
        <Field label="Complemento" htmlFor={fid("complement")} error={errors.complement}>
          <AffixInput
            id={fid("complement")}
            disabled={disabled}
            placeholder="Apto, bloco…"
            value={value.complement}
            onChange={(e) => setField("complement", e.target.value)}
          />
        </Field>
        <Field label="Bairro" htmlFor={fid("neighborhood")} required={required} error={errors.neighborhood}>
          <Combobox
            id={fid("neighborhood")}
            value={value.neighborhood}
            onValueChange={(v) => setField("neighborhood", v)}
            options={value.neighborhood ? [{ value: value.neighborhood, label: value.neighborhood }] : []}
            allowCustom
            disabled={disabled}
            ariaInvalid={Boolean(errors.neighborhood)}
            placeholder="Bairro"
            searchPlaceholder="Digite o bairro…"
            emptyText="Digite para usar o bairro."
          />
        </Field>

        {/* 6. Cidade · 7. UF */}
        <Field label="Cidade" htmlFor={fid("city")} required={required} error={errors.city}>
          <Combobox
            id={fid("city")}
            value={value.city}
            onValueChange={(v) => setField("city", v)}
            options={value.city ? [{ value: value.city, label: value.city }] : []}
            allowCustom
            disabled={disabled}
            ariaInvalid={Boolean(errors.city)}
            placeholder="Cidade"
            searchPlaceholder="Digite a cidade…"
            emptyText="Digite para usar a cidade."
          />
        </Field>
        <Field label="UF" htmlFor={fid("state")} required={required} error={errors.state}>
          <Combobox
            id={fid("state")}
            value={value.state}
            onValueChange={(v) => setField("state", v)}
            options={UF_OPTIONS}
            disabled={disabled}
            ariaInvalid={Boolean(errors.state)}
            placeholder="UF"
            searchPlaceholder="Buscar UF…"
            emptyText="UF não encontrada."
          />
        </Field>

        {/* País: submitted via the hidden input above; no visible field per spec. */}

        {/* 8. Referência (opcional, full width) */}
        {showReference && (
          <Field label="Referência" htmlFor={fid("reference")} className="col-span-full">
            <AffixInput
              id={fid("reference")}
              disabled={disabled}
              placeholder="Próximo a…"
              value={value.reference ?? ""}
              onChange={(e) => setField("reference", e.target.value)}
            />
          </Field>
        )}
      </FormGrid>

      {notice && (
        <p className="text-xs text-[color-mix(in_oklch,var(--warning),black_15%)]">
          {NOTICE_MESSAGES[notice]}
        </p>
      )}
    </div>
  );
}
