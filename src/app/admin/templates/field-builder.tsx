"use client";

import { ChevronDown, ChevronUp, Code2, Copy, GripVertical, LayoutGrid, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { resolveStepIcon, STEP_ICON_NAMES } from "@/components/crud/step-icons";
import { Button } from "@/components/ui/button";
import { ChipsInput } from "@/components/ui/chips-input";
import { Combobox } from "@/components/ui/combobox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  FIELD_TYPE_GROUPS,
  FIELD_TYPE_LABELS,
  FIELD_TYPES,
  templateFieldSchema,
  templateLayoutSchema,
  validateLayout,
  WIDGETS_BY_TYPE,
  WIDGET_LABELS,
  type FieldType,
  type FieldWidget,
  type TemplateField,
  type TemplateLayout,
} from "@/lib/validations/template";

type FieldRow = {
  uid: string;
  key: string;
  keyTouched: boolean;
  label: string;
  type: FieldType;
  required: boolean;
  widget: FieldWidget | "";
  options: string[];
  min: string;
  max: string;
  step: string;
  width: "" | "half" | "full";
};

type BlockRow = { uid: string; label: string; fields: FieldRow[] };
type StepRow = { uid: string; label: string; icon: string; blocks: BlockRow[] };

let uidSeq = 0;
const nextUid = () => `b${uidSeq++}`;

const TYPE_OPTIONS = FIELD_TYPE_GROUPS.flatMap((g) =>
  g.types.map((t) => ({ value: t, label: `${FIELD_TYPE_LABELS[t]} · ${g.label}` })),
);

const ICON_OPTIONS = STEP_ICON_NAMES.map((n) => ({ value: n, label: n }));

const widgetsFor = (type: FieldType): readonly FieldWidget[] =>
  (WIDGETS_BY_TYPE as Record<string, readonly FieldWidget[]>)[type] ?? [];
const isChoice = (type: FieldType) => type === "select" || type === "multiselect";
const isNumeric = (type: FieldType) => type === "number" || type === "slider" || type === "currency";

function slugifyKey(label: string): string {
  const base = label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return /^[a-z]/.test(base) ? base : `f_${base}`;
}

function emptyField(): FieldRow {
  return { uid: nextUid(), key: "", keyTouched: false, label: "", type: "text", required: false, widget: "", options: [], min: "", max: "", step: "", width: "" };
}

function toFieldRow(field: TemplateField): FieldRow {
  return {
    uid: nextUid(),
    key: field.key,
    keyTouched: true,
    label: field.label,
    type: field.type,
    required: field.required,
    widget: field.widget ?? "",
    options: field.options ?? [],
    min: field.min != null ? String(field.min) : "",
    max: field.max != null ? String(field.max) : "",
    step: field.step != null ? String(field.step) : "",
    width: field.width ?? "",
  };
}

/** Serialises a field row to the clean TemplateField shape the schema validates. */
function toField(r: FieldRow): Record<string, unknown> {
  const numeric = isNumeric(r.type);
  const num = (s: string) => (s.trim() === "" ? undefined : Number(s));
  return {
    key: r.key,
    label: r.label,
    type: r.type,
    required: r.required,
    ...(isChoice(r.type) ? { options: r.options } : {}),
    ...(r.widget && widgetsFor(r.type).includes(r.widget) ? { widget: r.widget } : {}),
    ...(numeric && num(r.min) !== undefined ? { min: num(r.min) } : {}),
    ...(numeric && num(r.max) !== undefined ? { max: num(r.max) } : {}),
    ...(numeric && num(r.step) !== undefined ? { step: num(r.step) } : {}),
    ...(r.width ? { width: r.width } : {}),
  };
}

/** Seeds the builder from stored fields + optional layout. */
function seedSteps(fields: TemplateField[], layout: TemplateLayout | undefined): StepRow[] {
  const byKey = new Map(fields.map((f) => [f.key, f]));
  if (layout && layout.steps.length > 0) {
    const used = new Set<string>();
    const steps = layout.steps.map((s) => ({
      uid: nextUid(),
      label: s.label,
      icon: s.icon ?? "",
      blocks: s.blocks.map((b) => ({
        uid: nextUid(),
        label: b.label ?? "",
        fields: b.fieldKeys
          .map((k) => {
            const f = byKey.get(k);
            if (f) used.add(k);
            return f ? toFieldRow(f) : null;
          })
          .filter((r): r is FieldRow => r !== null),
      })),
    }));
    const orphans = fields.filter((f) => !used.has(f.key));
    if (orphans.length > 0) {
      const last = steps[steps.length - 1];
      last.blocks.push({ uid: nextUid(), label: "Outros", fields: orphans.map(toFieldRow) });
    }
    return steps;
  }
  // No layout → one step, one unlabeled block with all fields.
  return [
    {
      uid: nextUid(),
      label: "Etapa 1",
      icon: "",
      blocks: [{ uid: nextUid(), label: "", fields: fields.map(toFieldRow) }],
    },
  ];
}

/** A structured layout is only worth persisting once the user goes beyond a single plain block. */
function hasStructure(steps: StepRow[]): boolean {
  if (steps.length > 1) return true;
  const s = steps[0];
  if (!s) return false;
  return s.blocks.length > 1 || Boolean(s.icon) || s.label !== "Etapa 1" || s.blocks.some((b) => b.label !== "");
}

function buildFlatFields(steps: StepRow[]): Record<string, unknown>[] {
  return steps.flatMap((s) => s.blocks.flatMap((b) => b.fields.map(toField)));
}

function buildLayout(steps: StepRow[]): TemplateLayout {
  return {
    steps: steps.map((s) => ({
      label: s.label,
      icon: s.icon || undefined,
      blocks: s.blocks.map((b) => ({ label: b.label || undefined, fieldKeys: b.fields.map((f) => f.key) })),
    })),
  };
}

/**
 * The editable JSON shape for the "código" mode. Flat templates serialise to
 * `{ fields: [...] }`; structured ones to `{ steps: [{ label, icon?, blocks:
 * [{ label?, fields: [...] }] }] }` — fields are inlined (not key refs) so the
 * whole template is editable in one place.
 */
function stepsToValue(steps: StepRow[]): Record<string, unknown> {
  if (!hasStructure(steps)) return { fields: buildFlatFields(steps) };
  return {
    steps: steps.map((s) => ({
      label: s.label,
      ...(s.icon ? { icon: s.icon } : {}),
      blocks: s.blocks.map((b) => ({ ...(b.label ? { label: b.label } : {}), fields: b.fields.map(toField) })),
    })),
  };
}

/** Parses the JSON-mode value back into builder rows. Accepts a bare fields
 * array, `{ fields }`, or `{ steps }`; validates with the template schemas. */
function valueToSteps(parsed: unknown): { ok: true; steps: StepRow[] } | { ok: false; error: string } {
  const asObj = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;

  // Flat: bare array or { fields }
  if (Array.isArray(parsed) || (asObj && "fields" in asObj && !("steps" in asObj))) {
    const raw = Array.isArray(parsed) ? parsed : asObj!.fields;
    const fields = templateFieldSchema.array().safeParse(raw);
    if (!fields.success) return { ok: false, error: fields.error.issues[0]?.message ?? "Campos inválidos." };
    return { ok: true, steps: seedSteps(fields.data, undefined) };
  }

  // Structured: { steps: [{ label, icon?, blocks: [{ label?, fields: [...] }] }] }
  if (asObj && Array.isArray(asObj.steps)) {
    const rawSteps = asObj.steps as Array<{ blocks?: Array<{ fields?: unknown }> }>;
    const flat: unknown[] = [];
    for (const s of rawSteps) for (const b of s.blocks ?? []) for (const f of (b.fields as unknown[]) ?? []) flat.push(f);
    const fields = templateFieldSchema.array().safeParse(flat);
    if (!fields.success) return { ok: false, error: fields.error.issues[0]?.message ?? "Campos inválidos." };

    const layout = templateLayoutSchema.safeParse({
      steps: (asObj.steps as Array<{ label?: unknown; icon?: unknown; blocks?: Array<{ label?: unknown; fields?: unknown }> }>).map((s) => ({
        label: s.label,
        icon: s.icon,
        blocks: (s.blocks ?? []).map((b) => ({
          label: b.label,
          fieldKeys: ((b.fields as Array<{ key?: string }>) ?? []).map((f) => f.key),
        })),
      })),
    });
    if (!layout.success) return { ok: false, error: layout.error.issues[0]?.message ?? "Layout inválido." };

    const check = validateLayout(fields.data, layout.data);
    if (!check.ok) return { ok: false, error: check.error };
    return { ok: true, steps: seedSteps(fields.data, layout.data) };
  }

  return { ok: false, error: 'O JSON deve conter "fields" ou "steps".' };
}

/** Allowed values per field type, shown as a reference in JSON mode. */
const TYPE_REFERENCE = FIELD_TYPES.map((t) => ({
  type: t,
  label: FIELD_TYPE_LABELS[t],
  widgets: ((WIDGETS_BY_TYPE as Record<string, readonly string[]>)[t] ?? []) as readonly string[],
}));

/**
 * Visual builder for niche templates. Organises fields into a step → block
 * hierarchy (steps as top tabs, blocks as accordions) and serialises into the
 * hidden `fields` (flat, validated by templateSchema) and `layout` (stored in
 * templates.config) inputs the server action reads.
 */
export function FieldBuilder({ initial, layout }: { initial?: TemplateField[]; layout?: TemplateLayout }) {
  const [steps, setSteps] = useState<StepRow[]>(() => seedSteps(initial ?? [], layout));
  const [activeStep, setActiveStep] = useState(0);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<"visual" | "json">("visual");
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const baseId = useId();

  const structured = hasStructure(steps);

  const fullJson = () => JSON.stringify(stepsToValue(steps), null, 2);

  const switchMode = (next: "visual" | "json") => {
    if (next === "json") {
      setJsonText(fullJson());
      setJsonError(null);
    }
    setMode(next);
  };

  // Live-parse the JSON editor: valid input updates the builder rows (and thus
  // the hidden fields/layout inputs); invalid input just surfaces the message.
  const onJsonChange = (text: string) => {
    setJsonText(text);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setJsonError("JSON inválido.");
      return;
    }
    const result = valueToSteps(parsed);
    if (!result.ok) {
      setJsonError(result.error);
      return;
    }
    setJsonError(null);
    setSteps(result.steps);
    setActiveStep(0);
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(fullJson());
      toast.success("JSON copiado.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };
  const step = steps[Math.min(activeStep, steps.length - 1)];

  // ── step ops ──
  const addStep = () => {
    setSteps((ss) => [
      ...ss,
      { uid: nextUid(), label: `Etapa ${ss.length + 1}`, icon: "", blocks: [{ uid: nextUid(), label: "", fields: [] }] },
    ]);
    setActiveStep(steps.length);
  };
  const patchStep = (uid: string, changes: Partial<StepRow>) =>
    setSteps((ss) => ss.map((s) => (s.uid === uid ? { ...s, ...changes } : s)));
  const removeStep = (uid: string) => {
    setSteps((ss) => (ss.length <= 1 ? ss : ss.filter((s) => s.uid !== uid)));
    setActiveStep((i) => Math.max(0, i - 1));
  };
  const moveStep = (uid: string, dir: -1 | 1) =>
    setSteps((ss) => {
      const i = ss.findIndex((s) => s.uid === uid);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ss.length) return ss;
      const next = [...ss];
      [next[i], next[j]] = [next[j], next[i]];
      setActiveStep(j);
      return next;
    });

  // ── block ops (within the active step) ──
  const mutateBlocks = (fn: (blocks: BlockRow[]) => BlockRow[]) =>
    setSteps((ss) => ss.map((s) => (s.uid === step.uid ? { ...s, blocks: fn(s.blocks) } : s)));
  const addBlock = () => mutateBlocks((bs) => [...bs, { uid: nextUid(), label: "", fields: [] }]);
  const patchBlock = (uid: string, changes: Partial<BlockRow>) =>
    mutateBlocks((bs) => bs.map((b) => (b.uid === uid ? { ...b, ...changes } : b)));
  const removeBlock = (uid: string) => mutateBlocks((bs) => bs.filter((b) => b.uid !== uid));
  const moveBlock = (uid: string, dir: -1 | 1) =>
    mutateBlocks((bs) => {
      const i = bs.findIndex((b) => b.uid === uid);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= bs.length) return bs;
      const next = [...bs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  // ── field ops (within a block of the active step) ──
  const mutateFields = (blockUid: string, fn: (fields: FieldRow[]) => FieldRow[]) =>
    mutateBlocks((bs) => bs.map((b) => (b.uid === blockUid ? { ...b, fields: fn(b.fields) } : b)));
  const addField = (blockUid: string) => mutateFields(blockUid, (fs) => [...fs, emptyField()]);
  const patchField = (blockUid: string, uid: string, changes: Partial<FieldRow>) =>
    mutateFields(blockUid, (fs) => fs.map((f) => (f.uid === uid ? { ...f, ...changes } : f)));
  const removeField = (blockUid: string, uid: string) =>
    mutateFields(blockUid, (fs) => fs.filter((f) => f.uid !== uid));
  const moveField = (blockUid: string, uid: string, dir: -1 | 1) =>
    mutateFields(blockUid, (fs) => {
      const i = fs.findIndex((f) => f.uid === uid);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= fs.length) return fs;
      const next = [...fs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const onFieldLabel = (blockUid: string, uid: string, label: string) =>
    mutateFields(blockUid, (fs) =>
      fs.map((f) => (f.uid === uid ? { ...f, label, key: f.keyTouched ? f.key : slugifyKey(label) } : f)),
    );

  const toggleCollapse = (uid: string) =>
    setCollapsed((c) => {
      const next = new Set(c);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });

  const stepped = steps.length > 1;
  // Steps and blocks are optional, revealed progressively: with one step its
  // chrome is hidden (just fields = "campos soltos"); a block's accordion only
  // appears once a step holds more than one block.

  const renderFieldList = (block: BlockRow) => (
    <>
      {block.fields.map((r, i) => (
        <FieldRowEditor
          key={r.uid}
          row={r}
          index={i}
          count={block.fields.length}
          idBase={`${baseId}-${block.uid}-${r.uid}`}
          onLabel={(label) => onFieldLabel(block.uid, r.uid, label)}
          onPatch={(changes) => patchField(block.uid, r.uid, changes)}
          onMove={(dir) => moveField(block.uid, r.uid, dir)}
          onRemove={() => removeField(block.uid, r.uid)}
        />
      ))}
      <Button type="button" variant="secondary" size="sm" onClick={() => addField(block.uid)} className="w-fit">
        <Plus className="size-4" /> Campo
      </Button>
    </>
  );

  return (
    <div className="col-span-full flex flex-col gap-3">
      <input type="hidden" name="fields" value={JSON.stringify(buildFlatFields(steps))} />
      <input type="hidden" name="layout" value={structured ? JSON.stringify(buildLayout(steps)) : ""} />

      {/* View toggle (visual builder ⇄ JSON code) + copy the full template JSON. */}
      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-lg border border-border p-0.5">
          <button
            type="button"
            onClick={() => switchMode("visual")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition-colors [&_svg]:size-4",
              mode === "visual" ? "bg-[var(--lime-300)] font-medium text-[var(--neutral-900)]" : "text-muted-foreground hover:bg-(--glass-bg-hover)",
            )}
          >
            <LayoutGrid /> Visual
          </button>
          <button
            type="button"
            onClick={() => switchMode("json")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition-colors [&_svg]:size-4",
              mode === "json" ? "bg-[var(--lime-300)] font-medium text-[var(--neutral-900)]" : "text-muted-foreground hover:bg-(--glass-bg-hover)",
            )}
          >
            <Code2 /> JSON
          </button>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={copyJson} className="ml-auto">
          <Copy className="size-4" /> Copiar JSON
        </Button>
      </div>

      {mode === "json" ? (
        <div className="flex flex-col gap-2">
          <Textarea
            value={jsonText}
            onChange={(e) => onJsonChange(e.target.value)}
            rows={18}
            spellCheck={false}
            className="min-h-[320px] font-mono text-xs"
            aria-label="Template em JSON"
          />
          {jsonError ? (
            <p className="text-xs text-destructive">{jsonError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">JSON válido — sincronizado com o modo visual.</p>
          )}
          <details className="rounded-lg border border-border bg-card/40 p-3 text-xs">
            <summary className="cursor-pointer font-medium text-foreground">Valores permitidos</summary>
            <div className="mt-2 flex flex-col gap-1.5 text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">type:</span> {FIELD_TYPES.join(" · ")}
              </p>
              <p>
                <span className="font-medium text-foreground">width</span> (opcional): half · full
              </p>
              <p className="font-medium text-foreground">widget por tipo (opcional):</p>
              {TYPE_REFERENCE.filter((t) => t.widgets.length > 0).map((t) => (
                <p key={t.type} className="pl-2">
                  <span className="font-mono">{t.type}</span>: {t.widgets.join(" · ")}
                </p>
              ))}
              <p className="pt-1">
                Estrutura: <span className="font-mono">{'{ "fields": [...] }'}</span> ou{" "}
                <span className="font-mono">{'{ "steps": [{ "label", "icon", "blocks": [{ "label", "fields": [...] }] }] }'}</span>
              </p>
            </div>
          </details>
        </div>
      ) : (
        <>

      {/* Step tabs — only shown once there is more than one step. */}
      {stepped && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card/50 p-1.5">
          {steps.map((s, i) => {
            const Icon = resolveStepIcon(s.icon);
            const current = i === activeStep;
            return (
              <button
                key={s.uid}
                type="button"
                onClick={() => setActiveStep(i)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors [&_svg]:size-4",
                  current ? "bg-[var(--lime-300)] font-medium text-[var(--neutral-900)]" : "text-muted-foreground hover:bg-(--glass-bg-hover)",
                )}
              >
                <Icon />
                <span className="max-w-[120px] truncate">{s.label || `Etapa ${i + 1}`}</span>
              </button>
            );
          })}
        </div>
      )}

      {step && (
        <div className="flex flex-col gap-3">
          {/* Step header (name + icon + reorder/remove) — only in stepped mode. */}
          {stepped && (
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/40 p-3">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase">
                  Etapa {activeStep + 1} de {steps.length}
                </span>
                <div className="ml-auto flex items-center gap-1">
                  <Button type="button" variant="ghost" size="icon" aria-label="Mover etapa para a esquerda" disabled={activeStep === 0} onClick={() => moveStep(step.uid, -1)}>
                    <ChevronUp className="size-4 -rotate-90" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" aria-label="Mover etapa para a direita" disabled={activeStep === steps.length - 1} onClick={() => moveStep(step.uid, 1)}>
                    <ChevronDown className="size-4 -rotate-90" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" aria-label="Remover etapa" onClick={() => removeStep(step.uid)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 @[440px]:grid-cols-2">
                <Field label="Nome da etapa" htmlFor={`${baseId}-steplabel`} required>
                  <Input id={`${baseId}-steplabel`} value={step.label} onChange={(e) => patchStep(step.uid, { label: e.target.value })} placeholder="Ex.: Endereço" />
                </Field>
                <Field label="Ícone" htmlFor={`${baseId}-stepicon`} hint="Mostrado na timeline">
                  <Combobox
                    id={`${baseId}-stepicon`}
                    value={step.icon || "__none"}
                    onValueChange={(v) => patchStep(step.uid, { icon: v === "__none" ? "" : v })}
                    options={[{ value: "__none", label: "Padrão" }, ...ICON_OPTIONS]}
                    searchPlaceholder="Buscar ícone…"
                  />
                </Field>
              </div>
            </div>
          )}

          {/* Blocks — a single block renders its fields loose (no chrome); two or
              more reveal labelled, collapsible block cards. */}
          {step.blocks.length <= 1 && step.blocks[0] ? (
            <div className="flex flex-col gap-3">{renderFieldList(step.blocks[0])}</div>
          ) : (
            step.blocks.map((block, bi) => {
              const open = !collapsed.has(block.uid);
              return (
                <div key={block.uid} className="rounded-lg border border-border bg-card/40">
                  <div className="flex items-center gap-1 px-2.5 py-2">
                    <button type="button" onClick={() => toggleCollapse(block.uid)} className="flex flex-1 items-center gap-1.5 text-left text-sm font-medium" aria-expanded={open}>
                      {open ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4 rotate-90" />}
                      <GripVertical className="size-3.5 text-muted-foreground" />
                      {block.label || `Bloco ${bi + 1}`}
                      <span className="text-xs font-normal text-muted-foreground">· {block.fields.length} campo(s)</span>
                    </button>
                    <Button type="button" variant="ghost" size="icon" aria-label="Mover bloco para cima" disabled={bi === 0} onClick={() => moveBlock(block.uid, -1)}>
                      <ChevronUp className="size-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" aria-label="Mover bloco para baixo" disabled={bi === step.blocks.length - 1} onClick={() => moveBlock(block.uid, 1)}>
                      <ChevronDown className="size-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" aria-label="Remover bloco" onClick={() => removeBlock(block.uid)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                  {open && (
                    <div className="flex flex-col gap-3 border-t border-border p-3">
                      <Field label="Nome do bloco" htmlFor={`${baseId}-${block.uid}-label`} hint="Opcional">
                        <Input id={`${baseId}-${block.uid}-label`} value={block.label} onChange={(e) => patchBlock(block.uid, { label: e.target.value })} placeholder="Ex.: Residencial" />
                      </Field>
                      {renderFieldList(block)}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Optional grouping affordances. */}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={addBlock} className="w-fit">
              <Plus className="size-4" /> Bloco
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={addStep} className="w-fit">
              <Plus className="size-4" /> Etapa
            </Button>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}

function FieldRowEditor({
  row: r,
  index,
  count,
  idBase,
  onLabel,
  onPatch,
  onMove,
  onRemove,
}: {
  row: FieldRow;
  index: number;
  count: number;
  idBase: string;
  onLabel: (label: string) => void;
  onPatch: (changes: Partial<FieldRow>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const widgets = widgetsFor(r.type);
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium text-muted-foreground">Campo {index + 1}</span>
        <div className="ml-auto flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" aria-label="Mover para cima" disabled={index === 0} onClick={() => onMove(-1)}>
            <ChevronUp className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Mover para baixo" disabled={index === count - 1} onClick={() => onMove(1)}>
            <ChevronDown className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Remover campo" onClick={onRemove}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 @[440px]:grid-cols-2">
        <Field label="Rótulo" htmlFor={`${idBase}-label`} required>
          <Input id={`${idBase}-label`} value={r.label} onChange={(e) => onLabel(e.target.value)} placeholder="Ex.: Espécie" />
        </Field>
        <Field label="Chave (key)" htmlFor={`${idBase}-key`} hint="snake_case — nome em custom_data">
          <Input id={`${idBase}-key`} value={r.key} onChange={(e) => onPatch({ key: e.target.value, keyTouched: true })} className="font-mono" placeholder="species" />
        </Field>
        <Field label="Tipo" htmlFor={`${idBase}-type`} required>
          <Combobox id={`${idBase}-type`} value={r.type} onValueChange={(v) => onPatch({ type: v as FieldType, widget: "" })} options={TYPE_OPTIONS} searchPlaceholder="Buscar tipo…" />
        </Field>
        {widgets.length > 0 && (
          <Field label="Aparência (widget)" htmlFor={`${idBase}-widget`} hint="Opcional — padrão do tipo">
            <Combobox
              id={`${idBase}-widget`}
              value={r.widget || "__default"}
              onValueChange={(v) => onPatch({ widget: v === "__default" ? "" : (v as FieldWidget) })}
              options={[{ value: "__default", label: `Padrão (${WIDGET_LABELS[widgets[0]]})` }, ...widgets.map((w) => ({ value: w, label: WIDGET_LABELS[w] }))]}
            />
          </Field>
        )}
        <Field label="Largura" htmlFor={`${idBase}-width`} hint="Na linha do formulário">
          <Combobox
            id={`${idBase}-width`}
            value={r.width || "__auto"}
            onValueChange={(v) => onPatch({ width: v === "__auto" ? "" : (v as "half" | "full") })}
            options={[
              { value: "__auto", label: "Padrão do tipo" },
              { value: "half", label: "Meia linha" },
              { value: "full", label: "Linha inteira" },
            ]}
          />
        </Field>
      </div>

      {isChoice(r.type) && (
        <Field label="Opções" htmlFor={`${idBase}-options`} required hint="Digite e pressione Enter para cada opção">
          <ChipsInput id={`${idBase}-options`} defaultValue={r.options} onChange={(opts) => onPatch({ options: opts })} />
        </Field>
      )}

      {isNumeric(r.type) && (
        <div className="grid grid-cols-3 gap-3">
          <Field label="Mín." htmlFor={`${idBase}-min`}>
            <Input id={`${idBase}-min`} type="number" step="any" value={r.min} onChange={(e) => onPatch({ min: e.target.value })} />
          </Field>
          <Field label="Máx." htmlFor={`${idBase}-max`}>
            <Input id={`${idBase}-max`} type="number" step="any" value={r.max} onChange={(e) => onPatch({ max: e.target.value })} />
          </Field>
          <Field label="Passo" htmlFor={`${idBase}-step`}>
            <Input id={`${idBase}-step`} type="number" step="any" value={r.step} onChange={(e) => onPatch({ step: e.target.value })} />
          </Field>
        </div>
      )}

      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-foreground">
        <Switch checked={r.required} onCheckedChange={(c) => onPatch({ required: c })} />
        Obrigatório
      </label>
    </div>
  );
}
