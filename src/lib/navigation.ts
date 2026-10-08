import {
  BarChart3,
  BadgeEuro,
  CalendarClock,
  Coins,
  DatabaseBackup,
  FileClock,
  Landmark,
  ListFilter,
  ListChecks,
  LayoutDashboard,
  Route,
  SlidersHorizontal,
  ReceiptText,
  Scale,
  Upload,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

export interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  matchPrefix?: string;
  matchPrefixes?: string[];
}

export interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

export const beheerNavigationItems: NavigationItem[] = [
  { label: "Instellingen", href: "/beheer", icon: SlidersHorizontal, matchPrefix: "/beheer" },
  { label: "Rekeningen", href: "/rekeningen", icon: Landmark, matchPrefix: "/rekeningen" },
  { label: "Categorieen", href: "/categorieen", icon: ListFilter },
  { label: "Review inbox", href: "/categoriseren", icon: ListChecks },
  { label: "Mappingregels", href: "/mappingregels", icon: Route },
  { label: "Vaste lasten & inkomen", href: "/vaste-lasten", icon: Coins },
  { label: "Importeren", href: "/importeren", icon: Upload },
  { label: "Exporteren", href: "/exporteren", icon: DatabaseBackup },
  { label: "Auditlog", href: "/audit", icon: FileClock },
];

export const navigationGroups: NavigationGroup[] = [
  {
    label: "Overzicht",
    items: [
      { label: "Vandaag", href: "/dashboard", icon: LayoutDashboard, matchPrefix: "/dashboard" },
      { label: "Vermogen", href: "/vermogen", icon: Scale, matchPrefixes: ["/vermogen", "/rekeningen"] },
    ],
  },
  {
    label: "Plannen",
    items: [
      { label: "Planning", href: "/planning", icon: WalletCards, matchPrefixes: ["/planning", "/scenario", "/sparen"] },
      { label: "Budgetten", href: "/budgetten", icon: BadgeEuro, matchPrefix: "/budgetten" },
      { label: "Vaste lasten", href: "/vaste-lasten", icon: CalendarClock, matchPrefix: "/vaste-lasten" },
    ],
  },
  {
    label: "Inzicht",
    items: [
      { label: "Rapporten", href: "/inzicht", icon: BarChart3, matchPrefixes: ["/inzicht", "/rapportages"] },
      { label: "Transacties", href: "/transacties", icon: ReceiptText, matchPrefix: "/transacties" },
    ],
  },
  {
    label: "Systeem",
    items: [
      { label: "Instellingen", href: "/beheer", icon: SlidersHorizontal, matchPrefix: "/beheer" },
    ],
  },
];

export function isNavigationItemActive(pathname: string, item: NavigationItem): boolean {
  if (item.href === "/") return pathname === "/";
  if (item.matchPrefixes?.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return true;
  const prefix = item.matchPrefix ?? item.href;
  return pathname === item.href || pathname.startsWith(`${prefix}/`);
}
