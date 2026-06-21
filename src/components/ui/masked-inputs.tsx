"use client";

import { ChevronDown, Hash, MapPin, Search } from "lucide-react";
import * as React from "react";

import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { AffixInput } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  isValidCpfCnpj,
  maskCep,
  maskCpfCnpj,
  maskCurrencyBRL,
  maskPhoneBR,
  onlyDigits,
  parseCurrencyBRL,
} from "@/lib/masks";
import { cn } from "@/lib/utils";

/* ── CEP ── */
export function CepInput({
  name,
  id,
  defaultValue = "",
  onSearch,
  onComplete,
  loading,
  invalid,
  disabled,
  required,
  ...rest
}: {
  name?: string;
  id?: string;
  defaultValue?: string;
  onSearch?: (cep: string) => void;
  onComplete?: (cep: string) => void;
  loading?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  required?: boolean;
} & Pick<React.ComponentProps<"input">, "placeholder">) {
  const [digits, setDigits] = React.useState(onlyDigits(defaultValue).slice(0, 8));

  return (
    <>
      {name && <input type="hidden" name={name} value={digits} />}
      <AffixInput
        id={id}
        inputMode="numeric"
        leadIcon={<MapPin />}
        loading={loading}
        invalid={invalid}
        disabled={disabled}
        required={required}
        value={maskCep(digits)}
        placeholder="00000-000"
        onChange={(e) => {
          const d = onlyDigits(e.target.value).slice(0, 8);
          setDigits(d);
          if (d.length === 8) onComplete?.(d);
        }}
        onBlur={() => digits.length === 8 && onSearch?.(digits)}
        trail={
          onSearch ? (
            <button
              type="button"
              aria-label="Buscar endereço pelo CEP"
              onClick={() => onSearch(digits)}
              disabled={digits.length !== 8 || disabled}
              className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-(--glass-bg-hover) disabled:opacity-40"
            >
              <Search className="size-4" />
            </button>
          ) : undefined
        }
        {...rest}
      />
    </>
  );
}

/* ── Phone — integrated country (DDI) combobox, default 🇧🇷 +55, no phone icon ── */
const PHONE_COUNTRIES = [
  { code: "+55", flag: "🇧🇷", name: "Brasil" },
  { code: "+1", flag: "🇺🇸", name: "Estados Unidos" },
  { code: "+351", flag: "🇵🇹", name: "Portugal" },
  { code: "+44", flag: "🇬🇧", name: "Reino Unido" },
  { code: "+34", flag: "🇪🇸", name: "Espanha" },
  { code: "+54", flag: "🇦🇷", name: "Argentina" },
  { code: "+1", flag: "🇨🇦", name: "Canadá" },
] as const;

export function PhoneInput({
  name,
  id,
  defaultValue = "",
  invalid,
  disabled,
}: {
  name?: string;
  id?: string;
  defaultValue?: string;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const [digits, setDigits] = React.useState(onlyDigits(defaultValue).replace(/^55/, "").slice(0, 11));
  const [country, setCountry] = React.useState<{ code: string; flag: string; name: string }>(
    PHONE_COUNTRIES[0]
  );
  const [open, setOpen] = React.useState(false);

  return (
    <>
      {/* e164 when possible: <ddi><national digits> */}
      {name && <input type="hidden" name={name} value={digits ? `${country.code}${digits}` : ""} />}
      <div
        className={cn(
          "flex h-11 w-full items-center overflow-hidden rounded-xl border bg-card text-sm transition-colors focus-within:ring-3",
          invalid
            ? "border-destructive focus-within:ring-destructive/20"
            : "border-border hover:border-[var(--neutral-300)] focus-within:border-ring focus-within:ring-ring/25"
        )}
      >
        <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
          <PopoverTrigger
            id={id}
            type="button"
            disabled={disabled}
            aria-label={`País: ${country.name} ${country.code}`}
            className="flex h-full shrink-0 items-center gap-1.5 self-stretch border-r border-border bg-muted px-2.5 text-sm outline-none hover:bg-[var(--neutral-100)] disabled:cursor-not-allowed"
          >
            <span className="text-base leading-none">{country.flag}</span>
            {open && <span className="text-muted-foreground">{country.code}</span>}
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[240px] p-0">
            <Command>
              <CommandInput placeholder="Buscar país…" />
              <CommandList>
                <CommandEmpty>Nenhum país.</CommandEmpty>
                {PHONE_COUNTRIES.map((c) => (
                  <CommandItem
                    key={`${c.code}-${c.name}`}
                    value={`${c.name} ${c.code}`}
                    onSelect={() => {
                      setCountry(c);
                      setOpen(false);
                    }}
                  >
                    <span className="text-base">{c.flag}</span>
                    <span className="flex-1">{c.name}</span>
                    <span className="text-muted-foreground">{c.code}</span>
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <input
          type="tel"
          inputMode="numeric"
          disabled={disabled}
          aria-invalid={invalid || undefined}
          value={maskPhoneBR(digits)}
          placeholder="(11) 99999-9999"
          onChange={(e) => setDigits(onlyDigits(e.target.value).slice(0, 11))}
          className="h-full w-full min-w-0 flex-1 bg-transparent px-3 text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
      </div>
    </>
  );
}

/* ── CPF / CNPJ ── */
export function DocumentInput({
  name,
  id,
  defaultValue = "",
  disabled,
  required,
}: {
  name?: string;
  id?: string;
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  const [digits, setDigits] = React.useState(onlyDigits(defaultValue).slice(0, 14));

  const complete = digits.length === 11 || digits.length === 14;
  const valid = complete && isValidCpfCnpj(digits);
  const invalid = complete && !valid;

  return (
    <>
      {name && <input type="hidden" name={name} value={digits} />}
      <AffixInput
        id={id}
        inputMode="numeric"
        leadIcon={<Hash />}
        ok={valid}
        invalid={invalid}
        disabled={disabled}
        required={required}
        value={maskCpfCnpj(digits)}
        placeholder="CPF ou CNPJ"
        onChange={(e) => setDigits(onlyDigits(e.target.value).slice(0, 14))}
      />
    </>
  );
}

/* ── Currency (BRL) — simple, or recurring (/mês ⇄ /ano clickable) ── */
export function CurrencyInput({
  name,
  periodName,
  id,
  defaultValue = "",
  suffix,
  recurring = false,
  defaultPeriod = "monthly",
  invalid,
  disabled,
  required,
}: {
  name?: string;
  /** When `recurring`, submits the period ("monthly"|"yearly") under this name. */
  periodName?: string;
  id?: string;
  defaultValue?: string;
  suffix?: React.ReactNode;
  /** Adds a clickable /mês ⇄ /ano suffix. */
  recurring?: boolean;
  defaultPeriod?: "monthly" | "yearly";
  invalid?: boolean;
  disabled?: boolean;
  required?: boolean;
}) {
  const [digits, setDigits] = React.useState(onlyDigits(defaultValue));
  const [period, setPeriod] = React.useState<"monthly" | "yearly">(defaultPeriod);

  const recurringSuffix = (
    <button
      type="button"
      onClick={() => setPeriod((p) => (p === "monthly" ? "yearly" : "monthly"))}
      title="Alternar período"
      disabled={disabled}
      className="flex h-full items-center gap-1 px-1 text-sm outline-none disabled:cursor-not-allowed"
    >
      /{period === "monthly" ? "mês" : "ano"}
      <ChevronDown className="size-3 text-muted-foreground" />
    </button>
  );

  return (
    <>
      {/* Decimal string for Prisma Decimal / numeric columns. */}
      {name && (
        <input type="hidden" name={name} value={digits ? parseCurrencyBRL(maskCurrencyBRL(digits)).toFixed(2) : ""} />
      )}
      {recurring && periodName && <input type="hidden" name={periodName} value={period} />}
      <AffixInput
        id={id}
        inputMode="decimal"
        prefix="R$"
        suffix={recurring ? recurringSuffix : suffix}
        invalid={invalid}
        disabled={disabled}
        required={required}
        value={maskCurrencyBRL(digits)}
        placeholder="0,00"
        onChange={(e) => setDigits(onlyDigits(e.target.value))}
      />
    </>
  );
}
