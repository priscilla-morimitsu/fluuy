"use client";

import { Check, Loader2 } from "lucide-react";
import * as React from "react";

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
  children: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton
        className={cn(
          "glass-drawer flex h-full flex-col gap-0 border-l border-(--glass-border) p-0",
          // Responsive width: 100% mobile · 460px tablet · ~40% (480–620px) HD+
          "data-[side=right]:w-full data-[side=right]:sm:w-[460px] data-[side=right]:sm:max-w-[90vw]",
          "data-[side=right]:xl:w-[40vw] data-[side=right]:xl:min-w-[480px] data-[side=right]:xl:max-w-[620px]"
        )}
      >
        <SheetHeader className="shrink-0 border-b border-(--glass-border) p-5">
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
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
  formRef,
  children,
}: {
  action: React.ComponentProps<"form">["action"];
  pending?: boolean;
  error?: string | null;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  showRequiredHint?: boolean;
  formRef?: React.Ref<HTMLFormElement>;
  children: React.ReactNode;
}) {
  return (
    <form ref={formRef} action={action} className="flex min-h-0 flex-1 flex-col">
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
    </form>
  );
}

/** A titled group of fields. */
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
    <div className={cn("grid grid-cols-1 gap-3.5 @[440px]:grid-cols-2", className)}>
      {children}
    </div>
  );
}
