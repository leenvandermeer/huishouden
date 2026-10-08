import Link from "next/link";
import { ArrowRight, Landmark, ListChecks, Coins, Shield, Users, Route } from "lucide-react";

interface ManagementCard {
  href: string;
  icon: React.ReactNode;
  label: string;
  detail: string;
  badge?: string;
  badgeTone?: "success" | "warning" | "info";
}

const badgeToneClasses = {
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  info: "bg-blue-100 text-blue-700",
};

export function ManagementSections({
  accounts,
  activeCategories,
  inactiveCategories,
  activeFixedExpenses,
  fixedCandidates,
  activeRules,
  userCount,
  disabledUserCount,
  twoFactorEnabled,
}: {
  accounts: number;
  activeCategories: number;
  inactiveCategories: number;
  activeFixedExpenses: number;
  fixedCandidates: number;
  activeRules: number;
  userCount: number;
  disabledUserCount: number;
  twoFactorEnabled: boolean;
}) {
  const geldstructuurCards: ManagementCard[] = [
    { href: "/rekeningen", icon: <Landmark size={16} />, label: "Rekeningen", detail: `${accounts} rekeningen`, badge: `${accounts}`, badgeTone: "success" },
    { href: "/categorieen", icon: <ListChecks size={16} />, label: "Categorieen", detail: `${activeCategories} actief, ${inactiveCategories} inactief`, badge: `${activeCategories}`, badgeTone: activeCategories > 0 ? "success" : "warning" },
    { href: "/vaste-lasten", icon: <Coins size={16} />, label: "Vaste Lasten", detail: `${activeFixedExpenses} actief, ${fixedCandidates} kandidaten`, badge: fixedCandidates > 0 ? `${fixedCandidates} kandidaten` : undefined, badgeTone: fixedCandidates > 0 ? "warning" : "success" },
    { href: "/mappingregels", icon: <Route size={16} />, label: "Mappingregels", detail: `${activeRules} actieve herkenningsregels`, badge: `${activeRules}`, badgeTone: "info" },
  ];

  const beveiligingsCards: ManagementCard[] = [
    {
      href: "/instellingen/2fa",
      icon: <Shield size={16} />,
      label: "Authenticator (2FA)",
      detail: twoFactorEnabled ? "Actief" : "Niet actief",
      badge: twoFactorEnabled ? "Actief" : "Uit",
      badgeTone: twoFactorEnabled ? "success" : "warning",
    },
    {
      href: "/beheer/gebruikers",
      icon: <Users size={16} />,
      label: "Gebruikers",
      detail: `${userCount} actief${disabledUserCount > 0 ? `, ${disabledUserCount} uitgeschakeld` : ""}`,
      badge: `${userCount}`,
      badgeTone: "success",
    },
  ];

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <ManagementSection title="Geldstructuur" cards={geldstructuurCards} />
      <ManagementSection title="Gebruikers & Beveiliging" cards={beveiligingsCards} />
    </section>
  );
}

function ManagementSection({ title, cards }: { title: string; cards: ManagementCard[] }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-brand">{title}</h2>
      <div className="grid gap-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-white p-3 shadow-sm transition-all duration-200 hover:border-brand hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--color-brand-subtle)] text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                {card.icon}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-brand">{card.label}</h3>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{card.detail}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {card.badge && card.badgeTone ? (
                <span className={cn("rounded-full px-2 py-0.5 text-[0.6rem] font-bold", badgeToneClasses[card.badgeTone])}>
                  {card.badge}
                </span>
              ) : null}
              <ArrowRight aria-hidden="true" size={14} className="text-[var(--color-text-subtle)] transition group-hover:translate-x-0.5 group-hover:text-brand" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
