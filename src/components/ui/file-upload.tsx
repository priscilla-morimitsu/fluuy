"use client";

import { FileText, UploadCloud, X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Fluuy Design System — FileUpload.
 * Dashed dropzone (click or drag-and-drop) + a list of chosen files with name,
 * size and remove. Backed by a real `<input type="file">` (form-friendly via
 * `name`, submits multipart). Files over `maxSizeMB` are flagged. Live upload
 * progress requires an upload endpoint (storage phase).
 */
export function FileUpload({
  name,
  accept,
  multiple = false,
  maxSizeMB,
  hint,
  id,
  disabled,
}: {
  name?: string;
  accept?: string;
  multiple?: boolean;
  maxSizeMB?: number;
  hint?: React.ReactNode;
  id?: string;
  disabled?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [files, setFiles] = React.useState<File[]>([]);
  const [dragOver, setDragOver] = React.useState(false);

  const maxBytes = maxSizeMB ? maxSizeMB * 1024 * 1024 : undefined;

  const sync = (list: File[]) => {
    const dt = new DataTransfer();
    list.forEach((f) => dt.items.add(f));
    if (inputRef.current) inputRef.current.files = dt.files;
    setFiles(list);
  };

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = multiple ? [...files, ...Array.from(incoming)] : Array.from(incoming).slice(0, 1);
    sync(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!disabled) addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors",
          dragOver ? "border-[var(--lime-400)] bg-(--lime-50)" : "border-border hover:border-[var(--neutral-300)]",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <UploadCloud className="size-6 text-muted-foreground" />
        <span className="text-sm text-foreground">
          Arraste arquivos ou <span className="font-medium underline">selecione</span>
        </span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => addFiles(e.target.files)}
          className="sr-only"
        />
      </label>

      {files.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {files.map((file, i) => {
            const tooBig = maxBytes != null && file.size > maxBytes;
            return (
              <li
                key={`${file.name}-${i}`}
                className={cn(
                  "flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm",
                  tooBig ? "border-destructive" : "border-border"
                )}
              >
                <FileText className={cn("size-4 shrink-0", tooBig ? "text-destructive" : "text-muted-foreground")} />
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <span className={cn("shrink-0 text-xs", tooBig ? "text-destructive" : "text-muted-foreground")}>
                  {tooBig ? `Excede ${maxSizeMB} MB` : formatBytes(file.size)}
                </span>
                <button
                  type="button"
                  aria-label={`Remover ${file.name}`}
                  onClick={() => sync(files.filter((_, idx) => idx !== i))}
                  className="grid size-5 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-(--glass-bg-hover)"
                >
                  <X className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
