import { Button, ButtonLink, FieldLabel, Input, PageHeader, Select, StatusBadge } from "@/components/ui";
import { ReadonlyNotice } from "@/components/finance/readonly-notice";
import { requireUser } from "@/modules/auth/service";
import { deleteCategory, saveCategory } from "@/modules/finance/actions";
import { getFinanceMetadata } from "@/modules/finance/data-source";

export default async function CategoriesPage() {
  const [user, { categories }] = await Promise.all([requireUser(), getFinanceMetadata()]);
  const canMutate = user.role !== "readonly";
  const activeCategories = categories.filter((category) => !category.validTo);
  const parentOptions = activeCategories.filter((category) => !category.parent);
  const subCategoryCount = activeCategories.length - parentOptions.length;
  const archivedCount = categories.length - activeCategories.length;

  return (
    <>
      <PageHeader
        eyebrow="Indeling"
        title="Categorieën"
        description={canMutate ? "Maak duidelijke groepen voor je inkomsten en uitgaven." : "Je kunt de categorieën bekijken, maar niet aanpassen."}
        actions={<ButtonLink href="/mappingregels" variant="secondary">Automatisch indelen</ButtonLink>}
        stats={[
          { label: "Actieve categorieën", value: activeCategories.length.toLocaleString("nl-NL"), detail: "in gebruik" },
          { label: "Hoofdgroepen", value: parentOptions.length.toLocaleString("nl-NL"), detail: "bovenste niveau" },
          { label: "Subcategorieën", value: subCategoryCount.toLocaleString("nl-NL"), detail: "onder een hoofdgroep" },
          { label: "Gearchiveerd", value: archivedCount.toLocaleString("nl-NL"), detail: "niet meer actief" },
        ]}
      />
      {!canMutate ? <div className="mb-8"><ReadonlyNotice /></div> : null}

      <section className="mb-12 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.6fr)]">
        {canMutate ? (
        <form action={saveCategory} className="border border-border bg-[var(--color-panel-strong)] p-5 md:p-6">
          <h2 className={CARD_LABEL}>Categorie aanmaken</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_12rem_auto] md:items-end">
            <div>
              <FieldLabel htmlFor="name">Categorie</FieldLabel>
              <Input id="name" name="name" placeholder="Kinderopvang" />
            </div>
            <div>
              <FieldLabel htmlFor="parent">Onder hoofdgroep</FieldLabel>
              <Select id="parent" name="parent" defaultValue="">
                <option value="">Hoofdcategorie</option>
                {parentOptions.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="kind">Type</FieldLabel>
              <KindSelect id="kind" name="kind" />
            </div>
            <Button type="submit" variant="primary">
              Aanmaken
            </Button>
          </div>
        </form>
        ) : null}

        <section className="border border-border bg-[var(--color-surface)] p-5 md:p-6">
          <h2 className={CARD_LABEL}>Handige indeling</h2>
          <p className="mt-4 font-[family-name:var(--font-serif-house)] text-[0.95rem] leading-7 text-[var(--color-text-muted)]">Gebruik herkenbare groepen, zoals Wonen, Boodschappen, Vervoer en Inkomsten.</p>
        </section>
      </section>

      <section className="mb-12">
          <div className="section-head">
            <h2>Categoriebeheer</h2>
            <p>Hernoem, verplaats of archiveer de groepen waarin je betalingen vallen.</p>
          </div>
          <div className="divide-y divide-border border-y border-border border-t-[var(--color-text)]">
            {categories.map((category) => (
              <article key={category.id} className="grid gap-3 px-1 py-5">
                {canMutate ? (
                <form action={saveCategory} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_11rem_auto] lg:items-end">
                  <input type="hidden" name="categoryId" value={category.id} />
                  <div>
                    <FieldLabel htmlFor={`name-${category.id}`}>Naam</FieldLabel>
                    <Input id={`name-${category.id}`} name="name" defaultValue={category.name} disabled={Boolean(category.validTo)} />
                  </div>
                  <div>
                    <FieldLabel htmlFor={`parent-${category.id}`}>Verplaatsen naar</FieldLabel>
                    <Select id={`parent-${category.id}`} name="parent" defaultValue={category.parent ?? ""} disabled={Boolean(category.validTo)}>
                      <option value="">Hoofdcategorie</option>
                      {parentOptions
                        .filter((option) => option.id !== category.id)
                        .map((option) => (
                          <option key={option.id} value={option.name}>
                            {option.name}
                          </option>
                        ))}
                    </Select>
                  </div>
                  <div>
                    <FieldLabel htmlFor={`kind-${category.id}`}>Type</FieldLabel>
                    <KindSelect id={`kind-${category.id}`} name="kind" defaultValue={category.kind} disabled={Boolean(category.validTo)} />
                  </div>
                  <Button type="submit" size="sm" disabled={Boolean(category.validTo)}>
                    Wijzigen
                  </Button>
                </form>
                ) : (
                  <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_11rem]">
                    <Info label="Naam" value={category.name} />
                    <Info label="Hoofdgroep" value={category.parent ?? "Hoofdcategorie"} />
                    <Info label="Type" value={category.kind.replaceAll("_", " ")} />
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={category.kind === "inkomen" ? "success" : category.kind === "interne_overboeking" ? "info" : category.kind === "vaste_last" ? "warning" : "neutral"}>
                      {category.kind.replaceAll("_", " ")}
                    </StatusBadge>
                    <span className="text-xs text-[var(--color-text-subtle)]">{category.parent ? `Onder ${category.parent}` : "Hoofdcategorie"}</span>
                    {category.validTo ? <StatusBadge tone="error">Gearchiveerd</StatusBadge> : null}
                  </div>
                  {canMutate ? <CategoryDeleteButton category={category} /> : null}
                </div>
              </article>
            ))}
          </div>
      </section>
    </>
  );
}

function KindSelect({ id, name, defaultValue = "variabele_uitgave", disabled = false }: { id: string; name: string; defaultValue?: string; disabled?: boolean }) {
  return (
    <Select id={id} name={name} defaultValue={defaultValue} disabled={disabled}>
      <option value="inkomen">Inkomen</option>
      <option value="vaste_last">Vaste last</option>
      <option value="variabele_uitgave">Variabele uitgave</option>
      <option value="reservering">Reservering</option>
      <option value="interne_overboeking">Interne overboeking</option>
    </Select>
  );
}

function CategoryDeleteButton({ category }: { category: { id: string; validTo?: string } }) {
  if (category.validTo) return <StatusBadge tone="neutral">Niet actief</StatusBadge>;
  if (["intern", "overig", "overig-inkomen"].includes(category.id)) return <StatusBadge tone="neutral">Systeem</StatusBadge>;

  return (
    <form action={deleteCategory}>
      <input type="hidden" name="categoryId" value={category.id} />
      <Button type="submit" size="sm" variant="danger">
        Verwijderen
      </Button>
    </form>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-border py-1 pl-3 text-sm">
      <dt className="text-[0.62rem] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">{label}</dt>
      <dd className="mt-1 text-[var(--color-text)]">{value}</dd>
    </div>
  );
}

const CARD_LABEL = "text-[0.62rem] font-normal uppercase tracking-[0.22em] text-[var(--color-text-muted)]";
