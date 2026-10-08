"use client";

import Link from "next/link";
import { Database, Download, FileUp, ListChecks, Shield, Users } from "lucide-react";

interface QuickAction {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  badge?: string;
  tone?: "primary" | "secondary";
}

const actions: QuickAction[] = [
  { href: "/importeren", icon: <FileUp size={18} />, label: "Importeren", description: "Bankbestanden uploaden", tone: "primary" },
  { href: "/categoriseren", icon: <ListChecks size={18} />, label: "Categoriseren", description: "Review inbox", badge: "Nieuw" },
  { href: "/rapportages", icon: <Database size={18} />, label: "Rapportage", description: "Maandanalyse bekijken" },
  { href: "/exporteren", icon: <Download size={18} />, label: "Backup", description: "JSON export downloaden" },
  { href: "/beheer/gebruikers", icon: <Users size={18} />, label: "Gebruikers", description: "2 actief" },
  { href: "/instellingen/2fa", icon: <Shield size={18} />, label: "Beveiliging", description: "2FA + wachtwoord" },
];

export function QuickActionsGrid({ reviewCount }: { reviewCount?: number }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-brand">Snelle acties</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {actions.map((action) => {
          const badge = action.label === "Categoriseren" && reviewCount ? `${reviewCount}` : action.badge;
          return (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg border p-3 transition-all duration-200",
                action.tone === "primary"
                  ? "border-brand bg-brand text-white shadow-sm hover:bg-[var(--color-brand-hover)] hover:shadow-md"
                  : "border-border bg-white shadow-sm hover:border-brand hover:shadow-md",
              )}
            >
              <span
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-lg transition-colors",
                  action.tone === "primary"
                    ? "bg-white/20 text-white"
                    : "bg-[var(--color-brand-subtle)] text-brand group-hover:bg-brand group-hover:text-white",
                )}
              >
                {action.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h3
                    className={cn(
                      "text-sm font-semibold",
                      action.tone === "primary" ? "text-white" : "text-brand",
                    )}
                  >
                    {action.label}
                  </h3>
                  {badge ? (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-1.5 py-0.5 text-[0.6rem] font-bold leading-none",
                        action.tone === "primary"
                          ? "bg-white/25 text-white"
                          : "bg-[var(--color-warning-subtle)] text-amber-800",
                      )}
                    >
                      {badge}
                    </span>
                  ) : null}
                </div>
                <p
                  className={cn(
                    "mt-0.5 text-xs",
                    action.tone === "primary" ? "text-white/80" : "text-[var(--color-text-muted)]",
                  )}
                >
                  {action.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
