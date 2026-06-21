"use client";

import { ImagePlus, X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const SIZES = { P: 84, M: 120, G: 170 } as const;

/**
 * Fluuy Design System — ImageUpload.
 * Square dashed dropzone in three sizes (P logo/avatar · M · G) with a live
 * preview. Backed by a real `<input type="file" accept="image/*">` (`name`).
 */
export function ImageUpload({
  name,
  size = "M",
  label,
  hint = "PNG, JPG · até 2 MB",
  id,
  disabled,
  className,
  defaultUrl,
  removeFieldName,
}: {
  name?: string;
  size?: "P" | "M" | "G";
  label?: React.ReactNode;
  hint?: React.ReactNode;
  id?: string;
  disabled?: boolean;
  className?: string;
  /** Existing image to show on edit. */
  defaultUrl?: string;
  /** When set, emits a hidden `<input name=removeFieldName value="true">` once
   * the user clears a previously-saved (`defaultUrl`) image. */
  removeFieldName?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(defaultUrl ?? null);
  const [removed, setRemoved] = React.useState(false);
  const dim = SIZES[size];

  const onFile = (file?: File) => {
    if (file) {
      setPreview(URL.createObjectURL(file));
      setRemoved(false);
    }
  };

  return (
    <div className={cn("inline-flex flex-col items-start gap-1", className)}>
      <label
        style={{ width: size === "P" ? dim : undefined, height: dim }}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border border-dashed border-border bg-card text-center text-muted-foreground transition-colors hover:border-[var(--lime-400)] hover:bg-(--lime-50)",
          size !== "P" && "w-full",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <>
            <ImagePlus className={size === "P" ? "size-5" : "size-6"} />
            <span className="text-sm font-medium text-foreground">
              {label ?? (size === "P" ? "Logo" : "Enviar imagem")}
            </span>
            {size !== "P" && <span className="text-xs">{hint}</span>}
          </>
        )}
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="file"
          accept="image/*"
          disabled={disabled}
          onChange={(e) => onFile(e.target.files?.[0])}
          className="sr-only"
        />
      </label>
      {removeFieldName && removed && <input type="hidden" name={removeFieldName} value="true" />}
      {preview && (
        <button
          type="button"
          onClick={() => {
            setPreview(null);
            if (defaultUrl) setRemoved(true);
            if (inputRef.current) inputRef.current.value = "";
          }}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="size-3" /> Remover
        </button>
      )}
    </div>
  );
}
