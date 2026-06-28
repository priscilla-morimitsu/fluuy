"use client";

import { Check, Loader2, Maximize2, Minimize2 } from "lucide-react";
import * as React from "react";

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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * Labels for fields the save-confirmation dialog can report as changed. Keys are
 * FormData field names; values are the human label shown in the dialog list.
 */
export type ConfirmFieldLabels = Record<string, string>;

/**
 * Fluuy Design System — FormDrawer.
 * Right-side glass drawer for create/edit forms. The panel is a flex column:
 * **fixed** header, scrollable body (container-query context for the grid) and a
 * **fixed** footer. The default footer carries the required hint + Cancelar/
 * Salvar; pass `hideFooter` (and usually `contentScrolls={false}`) when the body
 * provides its own pinned footer — e.g. a multi-step form. Link the footer Save
 * to the body <form> via `formId`.
 */
export function FormDrawer({
  open,
  onOpenChange,
  title,
  description,
  formId,
  loading = false,
  submitLabel = "Salvar",
  cancelLabel = "Cancelar",
  onCancel,
  showRequiredHint = true,
  /** When false, the body fills the height and the child handles its own scroll. */
  contentScrolls = true,
  /** Hide the default footer (the body supplies a pinned footer instead). */
  hideFooter = false,
  /**
   * Renders a fullscreen toggle in the header that widens the panel (content
   * max-width ≈720px when expanded). On by default so every form sheet can be
   * expanded/collapsed; pass `false` to pin a sheet to the compact width.
   */
  allowFullscreen = true,
  /** Use an opaque surface instead of the translucent glass panel. */
  solid = false,
  /**
   * Suppress the default header text (title/description) when the body supplies
   * its own header — e.g. a breadcrumb header. The title stays as an sr-only
   * label for accessibility and the fullscreen toggle is still rendered.
   */
  hideHeaderText = false,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  formId?: string;
  loading?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  showRequiredHint?: boolean;
  contentScrolls?: boolean;
  hideFooter?: boolean;
  allowFullscreen?: boolean;
  solid?: boolean;
  hideHeaderText?: boolean;
  children: React.ReactNode;
}) {
  const [fullscreen, setFullscreen] = React.useState(false);
  // Reset to the compact width whenever the drawer closes.
  const handleOpenChange = (next: boolean) => {
    if (!next) setFullscreen(false);
    onOpenChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        showCloseButton
        className={cn(
          "flex h-full flex-col gap-0 border-l p-0",
          solid
            ? "bg-popover border-border"
            : "glass-drawer border-(--glass-border)",
          allowFullscreen && fullscreen
            ? // Expanded: full viewport width.
              "data-[side=right]:w-screen data-[side=right]:max-w-none data-[side=right]:sm:w-screen data-[side=right]:sm:max-w-none"
            : // Responsive width: 100% mobile · 460px tablet · ~40% (480–620px) HD+
              cn(
                "data-[side=right]:w-full data-[side=right]:sm:w-[460px] data-[side=right]:sm:max-w-[90vw]",
                "data-[side=right]:xl:w-[40vw] data-[side=right]:xl:min-w-[480px] data-[side=right]:xl:max-w-[620px]"
              )
        )}
      >
        <SheetHeader
          className={cn(
            "shrink-0",
            hideHeaderText ? "p-0" : "border-b border-(--glass-border) p-5"
          )}
        >
          {allowFullscreen && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setFullscreen((v) => !v)}
              aria-label={fullscreen ? "Recolher painel" : "Expandir painel"}
              aria-pressed={fullscreen}
              className="absolute end-12 top-4"
            >
              {fullscreen ? <Minimize2 /> : <Maximize2 />}
            </Button>
          )}
          <SheetTitle className={hideHeaderText ? "sr-only" : undefined}>{title}</SheetTitle>
          {description && !hideHeaderText && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>

        <div
          className={cn(
            "@container min-h-0 flex-1",
            contentScrolls ? "overflow-y-auto p-5" : "flex flex-col"
          )}
        >
          {children}
        </div>

        {!hideFooter && (
          <div className="flex shrink-0 items-center gap-3 border-t border-(--glass-border) p-4">
            {showRequiredHint && (
              <span className="mr-auto text-xs text-muted-foreground">
                <span className="text-destructive">*</span> campos obrigatórios
              </span>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => (onCancel ? onCancel() : onOpenChange(false))}
              className={showRequiredHint ? "" : "ml-auto"}
            >
              {cancelLabel}
            </Button>
            <Button type="submit" form={formId} variant="brand" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              {loading ? "Salvando…" : submitLabel}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/**
 * Single-step form body for a FormDrawer (use the drawer with
 * `hideFooter contentScrolls={false}`). Fills the panel: scrollable sections
 * (a container-query context) + a pinned footer with the required hint and
 * Cancelar / Salvar (loading). The Save button submits the form natively.
 */
export function FormDrawerForm({
  action,
  pending = false,
  error,
  submitLabel = "Salvar",
  cancelLabel = "Cancelar",
  onCancel,
  showRequiredHint = true,
  confirmOnSave = false,
  confirmTitle = "Confirmar alterações?",
  initialValues,
  fieldLabels,
  children,
}: {
  action: React.ComponentProps<"form">["action"];
  pending?: boolean;
  error?: string | null;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  showRequiredHint?: boolean;
  /**
   * When true (typically on edit), submitting first opens a confirmation dialog
   * listing the fields that changed vs. {@link initialValues}. The save only
   * proceeds after the user confirms.
   */
  confirmOnSave?: boolean;
  confirmTitle?: string;
  /** Baseline values (FormData field name → string) to diff against on save. */
  initialValues?: Record<string, string>;
  /** FormData field name → human label, shown in the changed-fields list. */
  fieldLabels?: ConfirmFieldLabels;
  children: React.ReactNode;
}) {
  const internalRef = React.useRef<HTMLFormElement>(null);
  const [changed, setChanged] = React.useState<string[] | null>(null);
  const confirmedRef = React.useRef(false);

  const computeChanged = (form: HTMLFormElement): string[] => {
    const data = new FormData(form);
    const labels = fieldLabels ?? {};
    const base = initialValues ?? {};
    const result: string[] = [];
    for (const [name, label] of Object.entries(labels)) {
      const next = data.getAll(name).map(String).join(", ");
      const prev = base[name] ?? "";
      if (next !== prev) result.push(label);
    }
    return result;
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    if (!confirmOnSave || confirmedRef.current) {
      confirmedRef.current = false;
      return;
    }
    e.preventDefault();
    const fields = computeChanged(e.currentTarget);
    // Nothing tracked changed → confirm anyway so the user is always asked.
    setChanged(fields);
  };

  const confirmSave = () => {
    confirmedRef.current = true;
    setChanged(null);
    internalRef.current?.requestSubmit();
  };

  return (
    <form ref={internalRef} action={action} onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="@container flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5">
        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {children}
      </div>
      <div className="flex shrink-0 items-center gap-3 border-t border-(--glass-border) p-4">
        {showRequiredHint && (
          <span className="mr-auto text-xs text-muted-foreground">
            <span className="text-destructive">*</span> campos obrigatórios
          </span>
        )}
        <Button type="button" variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button type="submit" variant="brand" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          {pending ? "Salvando…" : submitLabel}
        </Button>
      </div>

      <AlertDialog open={changed !== null} onOpenChange={(open) => !open && setChanged(null)}>
        <AlertDialogContent overlayClassName="bg-transparent supports-backdrop-filter:backdrop-blur-none">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {changed && changed.length > 0
                ? "Você alterou os campos abaixo. Confirme para salvar as alterações."
                : "Confirme para salvar este registro."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {changed && changed.length > 0 && (
            <ul className="flex flex-col gap-1 rounded-lg border border-border bg-muted/40 p-3 text-sm">
              {changed.map((label) => (
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

/** A titled group of fields, laid out with the {@link FormGrid}. */
export function FormSection({
  title,
  children,
  className,
}: {
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-3.5", className)}>
      {title && (
        <h3 className="text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase">
          {title}
        </h3>
      )}
      <FormGrid>{children}</FormGrid>
    </section>
  );
}

/**
 * Container-query grid: 1 column, 2 columns once the drawer body is ≥440px.
 * Long fields opt into full width with `className="col-span-full"` on the Field.
 */
export function FormGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-3.5 @[400px]:grid-cols-2", className)}>
      {children}
    </div>
  );
}
