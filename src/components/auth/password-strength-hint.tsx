"use client";

import { Check, X } from "lucide-react";

const RULES: { label: string; test: (v: string) => boolean }[] = [
  { label: "Pelo menos 12 caracteres", test: (v) => v.length >= 12 },
  { label: "Uma letra maiúscula", test: (v) => /[A-Z]/.test(v) },
  { label: "Uma letra minúscula", test: (v) => /[a-z]/.test(v) },
  { label: "Um número", test: (v) => /[0-9]/.test(v) },
  { label: "Um caractere especial", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export function PasswordStrengthHint({ password }: { password: string }) {
  return (
    <ul className="flex flex-col gap-1 text-xs text-zinc-500" aria-live="polite">
      {RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li key={rule.label} className={`flex items-center gap-1.5 ${met ? "text-emerald-600" : ""}`}>
            {met ? <Check className="size-3" /> : <X className="size-3" />}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
