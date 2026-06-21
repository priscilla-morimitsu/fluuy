"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type CommandItem = {
  /** Text shown and used for filtering. */
  label: string;
  icon?: React.ReactNode;
  /** Shortcut shown on the right (e.g. "⌘T"). */
  shortcut?: string;
  onSelect?: () => void;
};

export type CommandGroup = {
  label: string;
  items: CommandItem[];
};

/**
 * Fluuy Design System — CommandPalette.
 * Glass-lg overlay command menu (no glow). Filterable, fully keyboard-driven
 * (↑/↓ to move, Enter to run, Esc to close). Controlled via `open`/`onClose`.
 *
 * Mount it conditionally (`{open && <CommandPalette open … />}`) so its internal
 * search state resets on each open.
 */
export function CommandPalette({
  open,
  onClose,
  groups,
  placeholder = "Buscar comando…",
}: {
  open: boolean;
  onClose?: () => void;
  groups: CommandGroup[];
  placeholder?: string;
}) {
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);

  // Filtered groups + a flat list for keyboard navigation.
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        items: q
          ? g.items.filter((i) => i.label.toLowerCase().includes(q))
          : g.items,
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, query]);

  const flat = React.useMemo(() => filtered.flatMap((g) => g.items), [filtered]);

  if (!open) return null;

  // Clamp the active index against the current filtered list (derived, not
  // stored, so changing the query never needs a state-syncing effect).
  const safeActive =
    flat.length === 0 ? -1 : ((active % flat.length) + flat.length) % flat.length;

  const run = (item: CommandItem) => {
    onClose?.();
    item.onSelect?.();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => a + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => a - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flat[safeActive];
      if (item) run(item);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose?.();
    }
  };

  let index = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Paleta de comandos"
    >
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-(--overlay) backdrop-blur-[6px]"
        onClick={onClose}
      />
      <div
        className="glass relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-xl"
        onKeyDown={onKeyDown}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full border-b border-(--glass-border) bg-transparent px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {flat.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Nenhum comando encontrado
            </p>
          ) : (
            filtered.map((group) => (
              <div key={group.label} className="mb-1">
                <div className="px-2 py-1.5 text-[0.65rem] font-semibold tracking-wider text-muted-foreground uppercase">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  index += 1;
                  const itemIndex = index;
                  const isActive = itemIndex === safeActive;
                  return (
                    <button
                      key={group.label + item.label}
                      type="button"
                      onClick={() => run(item)}
                      onMouseMove={() => setActive(itemIndex)}
                      data-selected={isActive}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-foreground"
                      )}
                    >
                      {item.icon && (
                        <span className="flex size-4 shrink-0 items-center justify-center [&_svg]:size-4">
                          {item.icon}
                        </span>
                      )}
                      <span className="flex-1">{item.label}</span>
                      {item.shortcut && (
                        <kbd className="rounded border border-(--glass-border) px-1.5 py-0.5 font-mono text-[0.65rem] text-muted-foreground">
                          {item.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
