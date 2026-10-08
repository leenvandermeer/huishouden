import { ThemeSelector } from "@/components/layout/theme-selector";
import { PageHeader } from "@/components/ui";

export default function SettingsPage() {
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-5">
      <PageHeader eyebrow="Persoonlijk" title="Instellingen" description="Kies hoe Huishouden er op dit apparaat uitziet." />
      <section className="surface-panel rounded-[var(--radius-lg)] p-4 sm:p-5" aria-labelledby="appearance-title">
        <h2 id="appearance-title" className="text-lg font-semibold text-[var(--color-brand-strong)]">Weergave</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">Licht en donker blijven vaststaan. Automatisch volgt de instelling van je telefoon of computer.</p>
        <div className="mt-4 max-w-md"><ThemeSelector /></div>
      </section>
    </div>
  );
}
