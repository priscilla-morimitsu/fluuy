"use client";

import { Check, ChevronsUpDown, Pencil, Plus, Trash2, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ManagedItem = { id: string; name: string; status: "active" | "inactive" };
type Entity = ManagedItem & { slug: string; memberCount?: number };
type EntityResult = { ok: true; entity: Entity } | { error: string };
type VoidResult = { ok: true } | { error: string } | undefined;

const byName = (a: ManagedItem, b: ManagedItem) => a.name.localeCompare(b.name, "pt-BR");

/**
 * Searchable picker with inline manage (create from search / rename / delete).
 * Reusable across domains — pass the create/update/delete server actions.
 * Submits the chosen id via a hidden input (`name`).
 */
export function ManagedCombobox({
  items,
  defaultValue,
  canManage,
  name,
  id,
  placeholder = "Selecione…",
  searchPlaceholder = "Buscar…",
  onCreate,
  onUpdate,
  onDelete,
}: {
  items: ManagedItem[];
  defaultValue?: string | null;
  canManage: boolean;
  name: string;
  id?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  onCreate: (name: string) => Promise<EntityResult>;
  onUpdate: (id: string, name: string) => Promise<EntityResult>;
  onDelete: (id: string) => Promise<VoidResult>;
}) {
  const [list, setList] = React.useState<ManagedItem[]>([...items].sort(byName));
  const [value, setValue] = React.useState<string>(defaultValue ?? "");
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [editing, setEditing] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const selected = list.find((c) => c.id === value);
  const visible = list.filter((c) => c.status === "active" || c.id === value);
  const filtered = search ? visible.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase())) : visible;
  const exact = visible.some((c) => c.name.toLowerCase() === search.trim().toLowerCase());

  async function create() {
    const n = search.trim();
    if (!n || busy) return;
    setBusy(true);
    const res = await onCreate(n);
    setBusy(false);
    if ("error" in res) return void toast.error(res.error);
    setList((p) => [...p, res.entity].sort(byName));
    setValue(res.entity.id);
    setSearch("");
    setOpen(false);
    toast.success("Criado.");
  }

  async function saveEdit(itemId: string) {
    const n = editName.trim();
    if (!n || busy) return;
    setBusy(true);
    const res = await onUpdate(itemId, n);
    setBusy(false);
    if ("error" in res) return void toast.error(res.error);
    setList((p) => p.map((c) => (c.id === itemId ? res.entity : c)).sort(byName));
    setEditing(null);
    toast.success("Atualizado.");
  }

  async function remove(itemId: string) {
    if (busy) return;
    setBusy(true);
    const res = await onDelete(itemId);
    setBusy(false);
    if (res && "error" in res) return void toast.error(res.error);
    setList((p) => p.filter((c) => c.id !== itemId));
    if (value === itemId) setValue("");
    toast.success("Excluído.");
  }

  const iconBtn =
    "grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-[var(--neutral-100)] hover:text-foreground disabled:opacity-40";

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={id}
          type="button"
          className="flex h-11 w-full items-center justify-between rounded-xl border border-border bg-card px-3 text-sm outline-none transition-colors hover:border-[var(--neutral-300)] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>{selected ? selected.name : placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-[260px] p-0">
          <Command shouldFilter={false}>
            <CommandInput placeholder={canManage ? `${searchPlaceholder} (ou criar)` : searchPlaceholder} value={search} onValueChange={setSearch} />
            <CommandList>
              {filtered.length === 0 && !(canManage && search.trim()) && <CommandEmpty>Nenhum item.</CommandEmpty>}
              <CommandGroup>
                {filtered.map((c) =>
                  editing === c.id ? (
                    <div key={c.id} className="flex items-center gap-1 px-1.5 py-1">
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void saveEdit(c.id);
                          } else if (e.key === "Escape") setEditing(null);
                        }}
                        className="h-8 w-full rounded-md border border-border bg-card px-2 text-sm outline-none focus:border-ring"
                      />
                      <button type="button" aria-label="Salvar" className={iconBtn} disabled={busy} onClick={() => saveEdit(c.id)}>
                        <Check className="size-4" />
                      </button>
                      <button type="button" aria-label="Cancelar" className={iconBtn} onClick={() => setEditing(null)}>
                        <X className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <div key={c.id} className="flex items-center gap-1 px-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setValue(c.id);
                          setOpen(false);
                        }}
                        className="flex h-9 flex-1 items-center gap-2 rounded-md px-1.5 text-left text-sm hover:bg-[var(--neutral-100)]"
                      >
                        <Check className={cn("size-4 shrink-0", value === c.id ? "opacity-100" : "opacity-0")} />
                        <span className="flex-1 truncate">{c.name}</span>
                        {c.status === "inactive" && <span className="text-xs text-muted-foreground">inativo</span>}
                      </button>
                      {canManage && (
                        <>
                          <button type="button" aria-label={`Editar ${c.name}`} className={iconBtn} onClick={() => { setEditing(c.id); setEditName(c.name); }}>
                            <Pencil className="size-3.5" />
                          </button>
                          <button type="button" aria-label={`Excluir ${c.name}`} className={iconBtn} disabled={busy} onClick={() => remove(c.id)}>
                            <Trash2 className="size-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  )
                )}
              </CommandGroup>
              {canManage && search.trim() && !exact && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={create}
                  className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-sm hover:bg-[var(--neutral-100)] disabled:opacity-50"
                >
                  <Plus className="size-4" /> Criar “{search.trim()}”
                </button>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}
