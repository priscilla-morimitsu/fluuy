"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

import { cn } from "@/lib/utils";

/* Mounted detection without an effect: false on the server, true once the
 * client has hydrated. Avoids reading the resolved theme before hydration. */
const noopSubscribe = () => () => {};
const getMountedSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Fluuy Design System — ThemeToggle.
 * Icon button that flips between the light and dark themes (next-themes,
 * class strategy). Renders a stable icon until mounted, since the active theme
 * is only known on the client.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(noopSubscribe, getMountedSnapshot, getServerSnapshot);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      title={isDark ? "Tema claro" : "Tema escuro"}
      className={cn(
        "relative flex size-9 cursor-pointer items-center justify-center rounded-md border border-transparent text-foreground outline-none transition-colors hover:bg-(--glass-bg-hover) focus-visible:ring-3 focus-visible:ring-foreground/50 [&_svg]:size-[18px]",
        className
      )}
    >
      {isDark ? <Sun /> : <Moon />}
    </button>
  );
}
