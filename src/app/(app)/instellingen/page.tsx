import { ThemeSelector } from "@/components/layout/theme-selector";
import { PageHeader } from "@/components/ui";

export default function SettingsPage() {
  return (
    <>
      <PageHeader eyebrow="Persoonlijk" title="Instellingen" description="Kies hoe Huishouden er op dit apparaat uitziet." />
      <section className="mx-auto mb-12 w-full max-w-3xl" aria-labelledby="appearance-title">
        <div className="section-head">
          <h2 id="appearance-title">Weergave</h2>
          <p>Licht en donker blijven vaststaan. Automatisch volgt de instelling van je telefoon of computer.</p>
        </div>
        <div className="border border-border border-t-[var(--color-text)] bg-[var(--color-panel-strong)] p-5 md:p-6">
          <p className="text-[0.62rem] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Thema</p>
          <div className="mt-4 max-w-md"><ThemeSelector /></div>
        </div>
      </section>
    </>
  );
}
