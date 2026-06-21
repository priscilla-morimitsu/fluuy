"use client";

import { ChevronDown } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ButtonDropdownItem = {
  label: React.ReactNode;
  icon?: React.ReactNode;
  onSelect?: () => void;
  destructive?: boolean;
};

/**
 * Fluuy Design System — ButtonDropdown.
 * A single trigger button (label + ChevronDown) that opens a menu of related
 * actions. Use to group actions under one control (e.g. "Ações" → Editar /
 * Duplicar / Excluir).
 */
export function ButtonDropdown({
  label,
  items,
  variant = "default",
  size,
}: {
  label: React.ReactNode;
  items: ButtonDropdownItem[];
  variant?: "brand" | "default" | "secondary" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant={variant} size={size}>
            {label}
            <ChevronDown className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="start">
        {items.map((item, i) => (
          <DropdownMenuItem
            key={i}
            onClick={item.onSelect}
            className={item.destructive ? "text-destructive" : undefined}
          >
            {item.icon}
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
