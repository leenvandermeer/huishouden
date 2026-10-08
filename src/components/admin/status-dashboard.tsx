import { Landmark, ListFilter, ReceiptText, Route, Shield } from "lucide-react";

interface StatusItem {
  label: string;
  value: string;
  detail: string;
  tone: "success" | "warning" | "info" | "neutral";
  icon: React.ReactNode;
}

const toneStyles: Record<string, { bg: string; icon: string; dot: string; value: string }> = {
  success: {
    bg: "bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200/60",
    icon: "bg-emerald-100 text-emerald-600",
    dot: "bg-emerald-500",
    value: "text-emerald-800",
  },
  warning: {
    bg: "bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200/60",
    icon: "bg-amber-100 text-amber-600",
    dot: "bg-amber-500",
    value: "text-amber-800",
  },
  info: {
    bg: "bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/60",
    icon: "bg-blue-100 text-blue-600",
    dot: "bg-blue-500",
    value: "text-blue-800",
  },
  neutral: {
    bg: "bg-gradient-to-br from-gray-50 to-gray-100/50 border-gray-200/60",
    icon: "bg-gray-100 text-gray-500",
    dot: "bg-gray-400",
    value: "text-gray-700",
  },
};

export function StatusDashboard({ items, lastImport }: { items: StatusItem[]; lastImport?: string }) {
  return (
    <section className="rounded-xl border border-border bg-white p-4 shadow-sm">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((item) => {
          const style = toneStyles[item.tone];
          return (
            <div key={item.label} className={cn("relative overflow-hidden rounded-lg border p-3 transition-all duration-200 hover:shadow-md", style.bg)}>
              <div className="flex items-center justify-between">
                <span className={cn("grid h-7 w-7 place-items-center rounded-md", style.icon)}>
                  {item.icon}
                </span>
                <span className={cn("h-2 w-2 rounded-full", style.dot)} />
              </div>
              <p className={cn("mt-2 text-2xl font-bold tabular-nums", style.value)}>{item.value}</p>
              <p className="mt-0.5 text-[0.68rem] font-medium text-[var(--color-text-muted)]">{item.label}</p>
              <p className="text-[0.62rem] text-[var(--color-text-subtle)]">{item.detail}</p>
            </div>
          );
        })}
      </div>
      {lastImport ? (
        <p className="mt-3 text-center text-[0.68rem] text-[var(--color-text-subtle)]">
          {lastImport}
        </p>
      ) : null}
    </section>
  );
}

export function buildStatusItems(
  accounts: number,
  categories: number,
  activeCategories: number,
  transactions: number,
  activeRules: number,
  twoFactorEnabled: boolean,
): StatusItem[] {
  return [
    {
      label: "Rekeningen",
      value: String(accounts),
      detail: `${accounts} actief`,
      tone: accounts > 0 ? "success" : "neutral",
      icon: <Landmark size={14} />,
    },
    {
      label: "Categorieen",
      value: String(activeCategories),
      detail: `${categories - activeCategories} inactief`,
      tone: activeCategories > 0 ? "success" : "warning",
      icon: <ListFilter size={14} />,
    },
    {
      label: "Transacties",
      value: transactions > 999 ? `${Math.round(transactions / 100) / 10}k` : String(transactions),
      detail: transactions > 0 ? "Geimporteerd" : "Nog geen import",
      tone: transactions > 0 ? "success" : "neutral",
      icon: <ReceiptText size={14} />,
    },
    {
      label: "Regels",
      value: String(activeRules),
      detail: `${activeRules} actief`,
      tone: activeRules > 0 ? "success" : "neutral",
      icon: <Route size={14} />,
    },
    {
      label: "2FA",
      value: twoFactorEnabled ? "Aan" : "Uit",
      detail: twoFactorEnabled ? "Actief" : "Niet actief",
      tone: twoFactorEnabled ? "success" : "warning",
      icon: <Shield size={14} />,
    },
  ];
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
