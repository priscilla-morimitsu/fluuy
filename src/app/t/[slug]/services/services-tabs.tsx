"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/** Sub-navigation for the Services module: Serviços | Profissionais. */
export function ServicesTabs({ slug }: { slug: string }) {
  const pathname = usePathname();
  const onProfessionals = pathname.includes(`/services/professionals`);
  const tabs = [
    { href: `/t/${slug}/services`, label: "Serviços", active: !onProfessionals },
    { href: `/t/${slug}/services/professionals`, label: "Profissionais", active: onProfessionals },
  ];

  return (
    <nav className="flex gap-1 border-b border-border" aria-label="Seções de serviços">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.active ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            t.active
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
