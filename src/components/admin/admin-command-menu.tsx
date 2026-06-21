"use client";

import { Building2, CreditCard, FileText, Home, Puzzle, Tags } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { CommandPalette, type CommandGroup } from "@/components/ui/command-palette";

/**
 * Headless admin ⌘K command menu. Mounted in the admin layout (already
 * platform-admin only): wires the global shortcut and the navigation palette.
 * The visible search entry lives in the Topbar.
 */
export function AdminCommandMenu() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => () => router.push(href);

  const groups: CommandGroup[] = [
    {
      label: "Navegação",
      items: [
        { label: "Tenants", icon: <Building2 />, onSelect: go("/admin/tenants") },
        { label: "Nichos", icon: <Tags />, onSelect: go("/admin/niches") },
        { label: "Templates", icon: <FileText />, onSelect: go("/admin/templates") },
        { label: "Features", icon: <Puzzle />, onSelect: go("/admin/features") },
        { label: "Planos comerciais", icon: <CreditCard />, onSelect: go("/admin/billing-plans") },
      ],
    },
    {
      label: "Geral",
      items: [{ label: "Início", icon: <Home />, onSelect: go("/") }],
    },
  ];

  return open ? (
    <CommandPalette
      open
      onClose={() => setOpen(false)}
      groups={groups}
      placeholder="Ir para…"
    />
  ) : null;
}
