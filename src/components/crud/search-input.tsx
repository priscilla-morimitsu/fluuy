"use client";

import { Search } from "lucide-react";
import { useRef, useState } from "react";

import { Input } from "@/components/ui/input";

import { useTableParams } from "./use-table-params";

/**
 * Quick-search bound to the `q` URL param, debounced so we don't hit the
 * server on every keystroke. Resets to page 1 on change.
 */
export function SearchInput({ placeholder = "Buscar..." }: { placeholder?: string }) {
  const [params, setParams] = useTableParams();
  const [value, setValue] = useState(params.q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onChange = (next: string) => {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setParams({ q: next || null, page: 1 });
    }, 350);
  };

  return (
    <div className="relative w-full max-w-xs">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-zinc-400" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Buscar"
        className="pl-8"
      />
    </div>
  );
}
