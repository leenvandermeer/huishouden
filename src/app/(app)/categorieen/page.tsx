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

  return (
    <>
      <PageHeader
        eyebrow="Indeling"
        title="Categorieën"
        description={canMutate ? "Maak duidelijke groepen voor je inkomsten en uitgaven." : "Je kunt de categorieën bekijken, maar niet aanpassen."}
        actions={<ButtonLink href="/mappingregels" variant="secondary">Automatisch indelen</ButtonLink>}
      />
      {!canMutate ? <div className="mb-3"><ReadonlyNotice /></div> : null}

      <section className="mb-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.8fr)]">
        {canMutate ? (
        <form action={saveCategory} className="rounded-[var(--radius-lg)] border border-border bg-white p-3 shadow-[var(--shadow-sm)]">
          <h2 className="text-sm font-semibold text-brand">Categorie aanmaken</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_12rem_auto] md:items-end">
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

        <section className="rounded-[var(--radius-lg)] border border-border bg-[var(--color-surface)] p-3">
          <h2 className="text-sm font-semibold text-brand">Handige indeling</h2>
          <div className="mt-2 grid gap-2 text-xs text-[var(--color-text-muted)]">
            <p className="rounded-md bg-white p-2">Gebruik herkenbare groepen, zoals Wonen, Boodschappen, Vervoer en Inkomsten.</p>
          </div>
        </section>
      </section>

      <section className="rounded-[var(--radius-lg)] border border-border bg-white shadow-[var(--shadow-sm)]">
          <div className="border-b border-border px-3 py-2">
            <h2 className="text-xs font-semibold text-brand">Categoriebeheer</h2>
          </div>
          <div className="divide-y divide-border">
            {categories.map((category) => (
              <article key={category.id} className="grid gap-2 p-3">
                {canMutate ? (
                <form action={saveCategory} className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_11rem_auto] lg:items-end">
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
                    <span className="text-[0.7rem] text-[var(--color-text-subtle)]">{category.parent ? `Onder ${category.parent}` : "Hoofdcategorie"}</span>
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
    <div className="rounded-md bg-[var(--color-surface)] p-2 text-xs">
      <dt className="text-[var(--color-text-subtle)]">{label}</dt>
      <dd className="mt-1 font-semibold text-[var(--color-text)]">{value}</dd>
    </div>
  );
}
