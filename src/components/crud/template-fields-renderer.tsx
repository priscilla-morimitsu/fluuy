"use client";

import { useState } from "react";

import { CustomFieldInput } from "@/components/crud/custom-field-input";
import { resolveStepIcon } from "@/components/crud/step-icons";
import { cn } from "@/lib/utils";
import type { TemplateField, TemplateLayout } from "@/lib/validations/template";

/**
 * Renders a template's custom_data inputs. With a step/block `layout` it shows
 * an embedded timeline (clickable steps) with titled blocks; without one it
 * falls back to a flat 2-column grid. ALL step panels stay mounted (toggled via
 * `hidden`) so the surrounding form's single submit captures every field — the
 * timeline only organises the custom-fields section, it does not own the form.
 */
export function TemplateFieldsRenderer({
  fields,
  layout,
  values,
  prefix = "custom_",
}: {
  fields: TemplateField[];
  layout?: TemplateLayout | null;
  values?: Record<string, unknown>;
  prefix?: string;
}) {
  const steps = layout?.steps ?? [];
  const [active, setActive] = useState(0);

  if (steps.length === 0) {
    return <FieldGrid fields={fields} values={values} prefix={prefix} />;
  }

  const byKey = new Map(fields.map((f) => [f.key, f]));
  // Fields not referenced by any block render in a trailing "Outros" block of
  // the last step, so a layout can never hide a field from the form.
  const referenced = new Set(steps.flatMap((s) => s.blocks.flatMap((b) => b.fieldKeys)));
  const orphans = fields.filter((f) => !referenced.has(f.key));

  const renderBlocks = (step: TemplateLayout["steps"][number], isLast: boolean) => (
    <>
      {step.blocks.map((block, bi) => (
        <section key={bi} className="flex flex-col gap-3.5">
          {block.label && (
            <h4 className="text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase">{block.label}</h4>
          )}
          <FieldGrid
            fields={block.fieldKeys.map((k) => byKey.get(k)).filter((f): f is TemplateField => Boolean(f))}
            values={values}
            prefix={prefix}
          />
        </section>
      ))}
      {isLast && orphans.length > 0 && (
        <section className="flex flex-col gap-3.5">
          <h4 className="text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase">Outros</h4>
          <FieldGrid fields={orphans} values={values} prefix={prefix} />
        </section>
      )}
    </>
  );

  // A single step needs no timeline — just render its blocks ("só blocos").
  if (steps.length === 1) {
    return <div className="col-span-full flex flex-col gap-5">{renderBlocks(steps[0], true)}</div>;
  }

  return (
    <div className="col-span-full flex flex-col gap-5">
      <ol className="flex items-start">
        {steps.map((step, i) => {
          const Icon = resolveStepIcon(step.icon);
          const current = i === active;
          return (
            <li key={i} className="contents">
              <div className="flex shrink-0 flex-col items-center gap-[7px]">
                <button
                  type="button"
                  role="tab"
                  aria-selected={current}
                  aria-label={step.label}
                  title={step.label}
                  onClick={() => setActive(i)}
                  className={cn(
                    "grid size-9 place-items-center rounded-full border text-xs font-bold transition-colors [&_svg]:size-[18px]",
                    current
                      ? "border-transparent bg-[var(--lime-300)] text-[var(--neutral-900)]"
                      : "border-border bg-card text-muted-foreground hover:border-[var(--neutral-300)]",
                  )}
                >
                  <Icon />
                </button>
                <span
                  className={cn(
                    "max-w-[76px] text-center text-[11px] leading-tight",
                    current ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && <span className="mx-1.5 mt-[18px] h-px flex-1 rounded-full bg-border" />}
            </li>
          );
        })}
      </ol>

      {steps.map((step, i) => (
        <div key={i} hidden={i !== active} className="flex flex-col gap-5">
          {renderBlocks(step, i === steps.length - 1)}
        </div>
      ))}
    </div>
  );
}

function FieldGrid({
  fields,
  values,
  prefix,
}: {
  fields: TemplateField[];
  values?: Record<string, unknown>;
  prefix: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-3.5 @[440px]:grid-cols-2">
      {fields.map((field) => (
        <CustomFieldInput key={field.key} field={field} value={values?.[field.key]} prefix={prefix} />
      ))}
    </div>
  );
}
