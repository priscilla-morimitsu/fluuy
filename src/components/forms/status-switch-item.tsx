"use client";

import { Ban, CircleHelp, Lock, TriangleAlert } from "lucide-react";
import { useState } from "react";

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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/**
 * Fluuy Design System — StatusSwitchItem.
 *
 * Choice Card that controls an entity's lifecycle status. It is options-driven
 * so it ADAPTS to the context where it is applied: each form passes the set of
 * statuses (with the persisted values), the pt-BR copy, and an impact message
 * per transition. EVERY change is funneled through an AlertDialog that describes
 * the impact before it is applied — the control never mutates state directly.
 *
 * - 2 options (ex.: ativo/inativo) → renders a Switch (option[0] = "ligado").
 * - 3+ options (ex.: rascunho/ativo/inativo, ativo/inativo/bloqueado) → renders
 *   selectable pills; choosing a different one opens its confirmation.
 *
 * Form-friendly: pass `name` to emit a hidden input carrying the current value.
 *
 * Spec: .claude/docs/specs/components/status/status-switch-spec.json
 */
export type StatusTone = "default" | "positive" | "danger";

export type StatusOption = {
  /** Value persisted/submitted for this status (the real enum value). */
  value: string;
  /** Short label (ex.: "Ativo"). */
  label: string;
  /** Sentence shown when this is the current status. */
  description: string;
  tone?: StatusTone;
  /** Impact dialog copy shown when transitioning TO this status. */
  confirm: {
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
  };
};

export function StatusSwitchItem({
  title,
  value,
  options,
  onChange,
  name,
  control = "auto",
  className,
}: {
  title: string;
  /** Current status value (controlled). Must match one of `options`. */
  value: string;
  options: StatusOption[];
  /** Called AFTER the user confirms the impact dialog. */
  onChange?: (next: string) => void | Promise<void>;
  /** When set, emits a hidden input so the status posts with the form. */
  name?: string;
  control?: "auto" | "switch" | "pills";
  className?: string;
}) {
  // The status being transitioned TO, awaiting confirmation.
  const [target, setTarget] = useState<StatusOption | null>(null);
  const [busy, setBusy] = useState(false);

  const current = options.find((o) => o.value === value) ?? options[0];

  // "Blockable" 3-state (positive + neutral toggled by a Switch, plus a danger
  // terminal state reached via a Bloquear/Desbloquear action) — the status spec
  // layout. Other shapes keep the Switch (2 options) or pills (3+ without that
  // active/inactive/blocked shape).
  const danger = options.find((o) => o.tone === "danger");
  const positive = options.find((o) => o.tone === "positive");
  const neutral = options.find((o) => o !== danger && o !== positive);
  const blockMode = control !== "pills" && options.length === 3 && Boolean(danger && positive && neutral);
  const isBlocked = blockMode && value === danger?.value;
  const useSwitch = !blockMode && (control === "switch" || (control === "auto" && options.length === 2));

  const confirm = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await onChange?.(target.value);
      setTarget(null);
    } finally {
      setBusy(false);
    }
  };

  // Active (positive current, not blocked) gets the lime highlight.
  const isSelected = current?.tone === "positive";

  return (
    <>
      {name && <input type="hidden" name={name} value={value} readOnly />}

      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border bg-card p-3.5 transition-colors",
          isSelected
            ? "border-[var(--lime-400)] bg-(--lime-50) shadow-[0_0_0_1px_var(--lime-400)]"
            : isBlocked
              ? "border-border bg-muted/40"
              : "border-border",
          className,
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            {isBlocked && <Ban className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
            {title}
          </span>
          <span className="text-xs text-muted-foreground">{current?.description}</span>
          {blockMode && !isBlocked && danger && (
            <button
              type="button"
              onClick={() => setTarget(danger)}
              className="mt-1 inline-flex w-fit items-center gap-1 text-xs font-medium text-destructive hover:underline"
            >
              <Ban className="size-3.5" aria-hidden /> Bloquear acesso
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {blockMode ? (
            isBlocked ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => positive && setTarget(positive)}>
                <Lock className="size-4" /> Desbloquear
              </Button>
            ) : (
              <Switch
                checked={value === positive?.value}
                aria-label={title}
                onCheckedChange={(checked) => {
                  const next = checked ? positive : neutral;
                  if (next && next.value !== value) setTarget(next);
                }}
              />
            )
          ) : useSwitch ? (
            <Switch
              checked={value === options[0]?.value}
              aria-label={title}
              onCheckedChange={(checked) => {
                const next = checked ? options[0] : options[1];
                if (next && next.value !== value) setTarget(next);
              }}
            />
          ) : (
            options
              .filter((o) => o.value !== value)
              .map((o) => (
                <button
                  key={o.value}
                  type="button"
                  aria-label={`${o.label} — status de ${title}`}
                  onClick={() => setTarget(o)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
                    o.tone === "danger"
                      ? "border-destructive/30 text-destructive hover:bg-destructive/10"
                      : o.tone === "positive"
                        ? "border-[var(--lime-400)] text-foreground hover:bg-(--lime-50)"
                        : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {o.tone === "danger" && <Ban className="size-3" aria-hidden />}
                  {o.label}
                </button>
              ))
          )}
        </div>
      </div>

      <AlertDialog open={target !== null} onOpenChange={(open) => !open && !busy && setTarget(null)}>
        <AlertDialogContent overlayClassName="bg-transparent supports-backdrop-filter:backdrop-blur-none">
          <AlertDialogHeader>
            <span
              className={cn(
                "flex size-9 items-center justify-center rounded-xl",
                target?.confirm.danger ? "bg-destructive/12 text-destructive" : "bg-(--lime-50) text-foreground",
              )}
              aria-hidden
            >
              {target?.confirm.danger ? <TriangleAlert className="size-5" /> : <CircleHelp className="size-5" />}
            </span>
            <AlertDialogTitle>{target?.confirm.title}</AlertDialogTitle>
            <AlertDialogDescription>{target?.confirm.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant={target?.confirm.danger ? "destructive" : "default"}
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void confirm();
              }}
            >
              {busy ? "Processando…" : target?.confirm.confirmLabel ?? target?.label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
