"use client";

import * as React from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * Fluuy Design System — Drawer.
 * Convenience wrapper over the Sheet (glass-lg, no glow). Controlled via
 * `open`/`onClose`; slides from any side with a configurable size.
 */
export function Drawer({
  open,
  onClose,
  side = "right",
  title,
  description,
  children,
  footer,
  size = 360,
  className,
}: {
  open: boolean;
  onClose?: () => void;
  side?: "left" | "right" | "top" | "bottom";
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** Width (left/right) or height (top/bottom) in px. Default: 360. */
  size?: number;
  className?: string;
}) {
  const horizontal = side === "left" || side === "right";
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose?.();
      }}
    >
      <SheetContent
        side={side}
        // `glass-drawer` overrides the Sheet's solid surface with the (less
        // transparent) drawer glass tokens.
        className={cn("glass-drawer border-(--glass-border) sm:max-w-none", className)}
        style={horizontal ? { width: size } : { height: size }}
      >
        {(title || description) && (
          <SheetHeader>
            {title && <SheetTitle>{title}</SheetTitle>}
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
        )}
        <div className="flex-1 overflow-y-auto px-4">{children}</div>
        {footer && <SheetFooter>{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  );
}
