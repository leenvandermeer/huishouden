"use client";

import Link from "next/link";
import { Upload, ListChecks, Wallet } from "lucide-react";

interface QuickAction {
  href: string;
  label: string;
  icon: React.ReactNode;
  variant?: "primary" | "secondary";
}

const defaultActions: QuickAction[] = [
  { href: "/importeren", label: "CSV importeren", icon: <Upload size={16} />, variant: "primary" },
  { href: "/categoriseren", label: "Categoriseren", icon: <ListChecks size={16} /> },
  { href: "/budgetten", label: "Budget bekijken", icon: <Wallet size={16} /> },
];

export function QuickActions({ actions = defaultActions }: { actions?: QuickAction[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={`inline-flex min-h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition-colors duration-200 ${
            action.variant === "primary"
              ? "border-brand bg-brand text-white shadow-[var(--shadow-sm)] hover:bg-[var(--color-brand-hover)]"
              : "border-border bg-white/86 text-brand shadow-[var(--shadow-sm)] hover:border-brand hover:bg-[var(--color-brand-subtle)]"
          }`}
        >
          {action.icon}
          {action.label}
        </Link>
      ))}
    </div>
  );
}
