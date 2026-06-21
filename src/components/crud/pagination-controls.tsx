"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";

import { useTableParams } from "./use-table-params";

const PAGE_SIZES = [10, 25, 50];

export function PaginationControls({ total }: { total: number }) {
  const [params, setParams] = useTableParams();
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
  const page = Math.min(params.page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <span>Por página</span>
        <Combobox
          value={String(params.pageSize)}
          onValueChange={(v) => setParams({ pageSize: Number(v), page: 1 })}
          options={PAGE_SIZES.map((s) => ({ value: String(s), label: String(s) }))}
          ariaLabel="Itens por página"
          className="h-9 w-[84px]"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-500">
          Página {page} de {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Página anterior"
          disabled={page <= 1}
          onClick={() => setParams({ page: page - 1 })}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Próxima página"
          disabled={page >= totalPages}
          onClick={() => setParams({ page: page + 1 })}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
