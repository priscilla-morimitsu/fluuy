"use client";

import { Check, ChevronLeft, ChevronRight, Loader2, type LucideIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FormStep = { id: string; label: string; icon: LucideIcon };

type StepsContext = { active: string; setActive: (id: string) => void };
const Ctx = React.createContext<StepsContext | null>(null);

/**
 * Fluuy Design System — multi-step timeline.
 * Groups a large form by context. ALL step panels stay mounted (toggled via
 * `hidden`) so values persist across navigation. On save, `validate` returns
 * the first invalid element (DOM order across steps); FormSteps switches to its
 * step, focuses and scrolls it (no requestAnimationFrame). When valid, it
 * submits the surrounding <form>.
 */
export function FormSteps({
  steps,
  loading = false,
  submitLabel = "Salvar",
  cancelLabel = "Cancelar",
  onCancel,
  validate,
  children,
}: {
  steps: FormStep[];
  loading?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  /** Returns the first invalid field element, or null when the form is valid. */
  validate?: () => HTMLElement | null;
  children: React.ReactNode;
}) {
  const [active, setActive] = React.useState(steps[0]?.id ?? "");
  const rootRef = React.useRef<HTMLDivElement>(null);

  const index = Math.max(0, steps.findIndex((s) => s.id === active));
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  const goTo = (id: string) => setActive(id);

  const onSave = () => {
    const bad = validate?.();
    if (bad) {
      const panel = bad.closest<HTMLElement>(".step-panel");
      const stepId = panel?.dataset.step;
      if (stepId && stepId !== active) setActive(stepId);
      // Focus after the panel becomes visible — setTimeout(0), never rAF.
      setTimeout(() => {
        bad.focus();
        bad.scrollIntoView({ block: "center" });
      }, 0);
      return;
    }
    rootRef.current?.closest("form")?.requestSubmit();
  };

  return (
    <Ctx.Provider value={{ active, setActive }}>
      <div ref={rootRef} className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-(--glass-border) px-5 pt-5 pb-4">
        {/* Timeline */}
        <ol className="flex items-start">
          {steps.map((step, i) => {
            const done = i < index;
            const current = i === index;
            const Icon = step.icon;
            return (
              <React.Fragment key={step.id}>
                <li className="flex shrink-0 flex-col items-center gap-[7px]">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={current}
                    aria-label={step.label}
                    title={step.label}
                    onClick={() => goTo(step.id)}
                    className={cn(
                      "grid size-9 place-items-center rounded-full border text-xs font-bold transition-colors [&_svg]:size-[18px]",
                      current
                        ? "border-transparent bg-[var(--lime-300)] text-[var(--neutral-900)]"
                        : done
                          ? "border-transparent bg-[var(--lime-100)] text-[var(--neutral-900)]"
                          : "border-border bg-card text-muted-foreground hover:border-[var(--neutral-300)]"
                    )}
                  >
                    {done ? <Check /> : <Icon />}
                  </button>
                  <span
                    className={cn(
                      "max-w-[76px] text-center text-[11px] leading-tight",
                      current ? "font-semibold text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                </li>
                {i < steps.length - 1 && (
                  <span
                    className={cn(
                      "mx-1.5 mt-[18px] h-px flex-1 rounded-full",
                      done ? "bg-[var(--lime-300)]" : "bg-border"
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </ol>
        <p className="mt-3 text-center text-xs text-muted-foreground @[420px]:text-left">
          Etapa {index + 1} de {steps.length}
          <span className="@[420px]:hidden"> · {steps[index]?.label}</span>
        </p>
        </div>

        {/* Panels (all mounted) — only this region scrolls */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {/* Footer (pinned) */}
        <div className="flex shrink-0 items-center gap-3 border-t border-(--glass-border) px-4 py-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => (isFirst ? onCancel?.() : goTo(steps[index - 1].id))}
          >
            {isFirst ? (
              cancelLabel
            ) : (
              <>
                <ChevronLeft className="size-4" /> Voltar
              </>
            )}
          </Button>
          {isLast ? (
            <Button type="button" variant="brand" className="ml-auto" disabled={loading} onClick={onSave}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {loading ? "Salvando…" : submitLabel}
            </Button>
          ) : (
            <Button type="button" variant="brand" className="ml-auto" onClick={() => goTo(steps[index + 1].id)}>
              Avançar <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </Ctx.Provider>
  );
}

/** A step's panel. Stays mounted; hidden when not the active step. */
export function FormStepPanel({
  step,
  title,
  children,
  className,
}: {
  step: string;
  /** Section heading shown at the top of the panel. */
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(Ctx);
  const active = ctx?.active === step;
  return (
    <div className={cn("step-panel", className)} data-step={step} hidden={!active}>
      {title && (
        <h3 className="mb-3.5 text-base font-bold tracking-tight text-foreground">{title}</h3>
      )}
      {children}
    </div>
  );
}
