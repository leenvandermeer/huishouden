"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { CircleUserRound, Ellipsis, LogOut, Plus, Settings, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { beheerNavigationItems, isNavigationItemActive, navigationGroups, type NavigationItem } from "@/lib/navigation";
import type { AuthenticatedUser } from "@/modules/auth/service";
import { ThemeSelector } from "./theme-selector";

function SidebarLink({ item, pathname, onNavigate }: { item: NavigationItem; pathname: string; onNavigate?: () => void }) {
  const active = isNavigationItemActive(pathname, item);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex min-h-10 items-center gap-3 rounded-lg border px-2.5 py-1.5 text-[0.82rem] font-medium transition-colors duration-150",
        active
          ? "border-transparent bg-[var(--color-brand-subtle)] text-brand"
          : "border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]",
      )}
    >
      <span className={cn("grid h-6 w-6 shrink-0 place-items-center transition-colors", active ? "text-brand" : "text-[var(--color-text-subtle)] group-hover:text-[var(--color-text)]")}>
        <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={active ? 2.3 : 1.8} />
      </span>
      <span>{item.label}</span>
    </Link>
  );
}

function NavigationContent({ pathname, user, onNavigate }: { pathname: string; user: AuthenticatedUser; onNavigate?: () => void }) {
  const canMutate = user.role !== "readonly";
  return (
    <>
      <div className="flex h-16 items-center border-b border-border px-3">
        <Link href="/dashboard" onClick={onNavigate} className="flex min-w-0 items-center gap-3" aria-label="Huishouden vandaag">
          <span className="brand-monogram" aria-hidden="true">H</span>
          <span>
            <strong className="block truncate text-[0.95rem] leading-none tracking-[-0.02em] text-[var(--color-text)]">Huishouden</strong>
            <span className="mt-1.5 block truncate text-[0.7rem] leading-none text-[var(--color-text-subtle)]">van {user.name.split(" ")[0]}</span>
          </span>
        </Link>
      </div>

      <nav aria-label="Hoofdnavigatie" className="flex-1 overflow-y-auto px-2.5 py-3">
        {navigationGroups.map((group) => (
          <section key={group.label} className="mb-3">
            <h2 className="mb-1.5 px-2.5 text-[0.68rem] font-medium text-[var(--color-text-subtle)]">{group.label}</h2>
            <div className="space-y-1">
              {group.items.map((item) => (
                <SidebarLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
              ))}
            </div>
          </section>
        ))}
      </nav>

      <div className="border-t border-border p-2.5">
        <ThemeSelector compact />
        {canMutate ? (
          <Link href="/importeren" onClick={onNavigate} className="mt-2 flex min-h-9 items-center justify-center gap-1.5 rounded-md bg-brand px-2.5 text-xs font-semibold text-white shadow-[var(--shadow-sm)] transition hover:bg-[var(--color-brand-hover)]">
            <Plus aria-hidden="true" size={14} /> Importeren
          </Link>
        ) : null}
        <div className="mt-2 flex items-center gap-2 rounded-md border border-border bg-white/70 px-2 py-1.5">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-[var(--color-accent-subtle)] text-[0.68rem] font-bold text-accent">{user.name.slice(0, 1).toUpperCase()}</span>
          <span className="min-w-0">
            <strong className="block truncate text-xs text-[var(--color-text)]">{user.name}</strong>
            <span className="block truncate text-[0.7rem] text-[var(--color-text-subtle)]">{user.email}</span>
          </span>
          <form action="/api/auth/logout" method="post" className="ml-auto">
            <button type="submit" aria-label="Uitloggen" title="Uitloggen" className="touch-target grid place-items-center rounded-lg text-[var(--color-text-subtle)] hover:bg-[var(--color-surface)] hover:text-brand">
              <LogOut aria-hidden="true" size={14} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export function AppShell({ children, user }: { children: ReactNode; user: AuthenticatedUser }) {
  const pathname = usePathname();
  const mobilePrimary: NavigationItem[] = [
    navigationGroups[0].items[0],
    navigationGroups[1].items[0],
    { ...navigationGroups[2].items[0], matchPrefixes: ["/rapportages", "/inzicht"] },
  ];
  const isMoreActive = !mobilePrimary.some((item) => isNavigationItemActive(pathname, item));
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuDialogRef = useRef<HTMLElement>(null);
  const closeMenuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const fallbackFocus = menuButtonRef.current;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    closeMenuButtonRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
      (previouslyFocused ?? fallbackFocus)?.focus();
    };
  }, [menuOpen]);

  function keepFocusInMenu(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key !== "Tab") return;
    const focusable = menuDialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="app-chrome">
      <a href="#hoofdinhoud" className="fixed left-4 top-4 z-[calc(var(--z-modal)+1)] -translate-y-24 rounded-full bg-brand px-4 py-3 font-semibold text-white shadow-[var(--shadow-dropdown)] transition focus:translate-y-0">
        Naar hoofdinhoud
      </a>
      <div aria-live="polite" aria-atomic="true" className="sr-only" id="live-announcer"></div>

      <aside className="shell-sidebar fixed inset-y-0 left-0 z-[var(--z-sidebar)] hidden w-[var(--sidebar-width)] flex-col border-r border-border md:flex">
        <NavigationContent pathname={pathname} user={user} />
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-[var(--z-modal)] md:hidden" role="presentation">
          <button type="button" aria-label="Menu sluiten" className="absolute inset-0 bg-[#060e1a]/45" onClick={() => setMenuOpen(false)} />
          <aside ref={menuDialogRef} id="mobile-navigation-dialog" role="dialog" aria-modal="true" aria-label="Meer navigatie" onKeyDown={keepFocusInMenu} className="mobile-sheet absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-[1.75rem] bg-white pb-[env(safe-area-inset-bottom,0px)] shadow-[var(--shadow-dropdown)]">
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-[var(--color-border-strong)]" aria-hidden="true" />
            <div className="flex items-center justify-between px-5 pb-3 pt-3">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text)]">Meer</h2>
                <p className="text-sm text-[var(--color-text-muted)]">Transacties en instellingen</p>
              </div>
              <button ref={closeMenuButtonRef} type="button" onClick={() => setMenuOpen(false)} className="touch-target grid place-items-center rounded-xl bg-[var(--color-surface)] text-brand" aria-label="Menu sluiten">
              <X aria-hidden="true" size={21} />
              </button>
            </div>
            <MobileMenuContent pathname={pathname} user={user} onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      ) : null}

      <main id="hoofdinhoud" tabIndex={-1} aria-label="Hoofdinhoud" className="app-main min-h-screen focus:outline-none">
        <div className="page-content">{children}</div>
      </main>

      <nav aria-label="Mobiele hoofdnavigatie" className="shell-bottom-nav fixed inset-x-3 bottom-2 z-[var(--z-mobile-nav)] grid h-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom,0px))] grid-cols-4 rounded-[1.45rem] px-1 pb-[env(safe-area-inset-bottom,0px)] md:hidden">
        {mobilePrimary.map((item) => {
          const active = isNavigationItemActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("touch-target flex min-w-0 flex-col items-center justify-center gap-0.5 text-[0.64rem] font-bold", active ? "text-brand" : "text-[var(--color-text-subtle)]")}>
              <span className={cn("grid h-8 w-12 place-items-center rounded-full transition-colors", active ? "bg-[var(--color-brand-subtle)] text-brand" : "bg-transparent")}>
                <Icon aria-hidden="true" size={20} strokeWidth={active ? 2.5 : 2} />
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
        <button ref={menuButtonRef} type="button" onClick={() => setMenuOpen(true)} aria-current={isMoreActive ? "page" : undefined} aria-expanded={menuOpen} aria-controls="mobile-navigation-dialog" className={cn("touch-target flex min-w-0 flex-col items-center justify-center gap-0.5 text-[0.64rem] font-bold", isMoreActive ? "text-brand" : "text-[var(--color-text-subtle)]")}>
          <span className={cn("grid h-8 w-12 place-items-center rounded-full transition-colors", isMoreActive ? "bg-[var(--color-brand-subtle)] text-brand" : "bg-transparent")}>
            <Ellipsis aria-hidden="true" size={21} strokeWidth={isMoreActive ? 2.5 : 2} />
          </span>
          <span>Meer</span>
        </button>
      </nav>
    </div>
  );
}

function MobileMenuContent({ pathname, user, onNavigate }: { pathname: string; user: AuthenticatedUser; onNavigate: () => void }) {
  const canMutate = user.role !== "readonly";
  const allItems = [...navigationGroups.flatMap((group) => group.items), ...beheerNavigationItems];
  const itemsFor = (hrefs: string[]) => hrefs.map((href) => allItems.find((item) => item.href === href)).filter((item): item is NavigationItem => Boolean(item));
  const menuGroups: Array<{ label: string; items: NavigationItem[] }> = [
    {
      label: "Geldzaken",
      items: itemsFor(["/vermogen", "/budgetten", "/vaste-lasten", "/transacties", "/rekeningen", "/categoriseren", ...(canMutate ? ["/importeren"] : [])]),
    },
    {
      label: "Instellingen",
      items: [
        ...itemsFor(["/beheer", "/categorieen", "/mappingregels", "/exporteren", "/audit"]),
        { label: "Weergave", href: "/instellingen", icon: Settings, matchPrefix: "/instellingen" },
      ],
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav aria-label="Overige navigatie" className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {menuGroups.map((group) => (
          <section key={group.label} className="mb-5">
            <h3 className="mb-2 px-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">{group.label}</h3>
            <div className="grid grid-cols-2 gap-2">
              {group.items.map((item) => {
                const active = isNavigationItemActive(pathname, item);
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cn("flex min-h-[4.25rem] items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm font-bold", active ? "border-brand bg-[var(--color-brand-subtle)] text-brand" : "border-border bg-white text-[var(--color-text)]")}>
                    <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", active ? "bg-brand text-white" : "bg-[var(--color-surface)] text-brand")}><Icon aria-hidden="true" size={18} /></span>
                    <span className="min-w-0 leading-tight">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
      <div className="border-t border-border bg-[var(--color-surface)] px-4 py-3">
        <ThemeSelector />
        <div className="mt-3 flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-white"><CircleUserRound aria-hidden="true" size={20} /></span>
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-sm text-brand">{user.name}</strong>
            <span className="block truncate text-xs text-[var(--color-text-muted)]">{user.email}</span>
          </span>
          <form action="/api/auth/logout" method="post">
            <button type="submit" aria-label="Uitloggen" className="touch-target grid place-items-center rounded-xl bg-white text-brand"><LogOut aria-hidden="true" size={18} /></button>
          </form>
        </div>
      </div>
    </div>
  );
}
