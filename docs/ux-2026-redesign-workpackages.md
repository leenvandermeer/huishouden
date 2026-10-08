# UX 2026 redesign werkpakketten

Status: WP-01 t/m WP-16 allemaal afgerond en naar productie gedeployed. Laatste update: 2026-09-03.

## Richting

De app wordt een moderne financiele cockpit voor dagelijks privegebruik: rustig genoeg voor herhaald gebruik, rijk genoeg om direct te zien wat aandacht vraagt, en mobiel net zo bruikbaar als desktop. De stijl gebruikt compacte data-visualisatie, glasachtige lagen, duidelijke statuskleuren, goede touch targets en minder administratieve saaiheid.

## Principes

- Eerst inzicht, daarna beheer.
- Geldstromen zijn visueel gescheiden: binnengekomen, uitgegeven, sparen, beleggen en maandruimte.
- Mobiel is geen verkleinde desktop maar een snelle cockpit met bottom navigation.
- MacBook/laptop is een eigen tussenprofiel: geen brede tabellen of groot-schermkolommen als de sidebar het werkvlak smaller maakt.
- Groot scherm gebruikt een brede werkruimte met vaste navigatie, scanbare panelen en grafische context.
- Design tokens sturen alle schermen; losse pagina's mogen geen eigen kleurwereld bouwen.
- Geen productie-deploy zonder expliciete toestemming.
- Toegankelijkheid is geen nagebootste optie maar een basisverecht: elke verbetering moet voldoen aan WCAG 2.1 AA.

## WP-01 - Design foundation en shell

Status: herstart lokaal gebouwd, getest en gedeployed als eerste 2026-richting.

Doel: de hele applicatie direct moderner laten voelen zonder domeinlogica te wijzigen.

- Nieuwe kleur- en oppervlakteset met meer contrast, warmte en statusaccenten zonder ruitjesheader.
- App-shell vernieuwd met premium zijbalk, mobiele header en bottom navigation.
- Dashboard opnieuw opgezet als command cockpit met maandantwoord, flow-rail, radar en snelle routes.
- Moderne browserlaag toegevoegd met CSS view transitions, container queries en scroll-snap rails.
- Lokaal getest op desktop en mobiel via testinstance op poort 3010.

## WP-02 - Dashboard als persoonlijke finance cockpit

Status: gebouwd, lokaal getest en productie-live met meerdere moderne SVG/CSS-visualisaties.

Doel: het dashboard moet in een oogopslag antwoord geven op rondkomen, cashflow, vermogen en acties.

- Bovenste maandantwoord scherper visualiseren.
- Cashflow-waterfall toegevoegd voor inkomen, opnemen, uitgaven, sparen, beleggen en resultaat.
- Maanddruk-ring toegevoegd voor verhouding tussen binnengekomen geld en vastgelegde bedragen.
- Uitgavenmix-donut toegevoegd voor grootste gewone uitgaven.
- Mobiele volgorde geoptimaliseerd zodat de eerste grafiek in de eerste viewport verschijnt.

## WP-03 - Rapportages als interactieve analyse

Status: redesign-overlay gebouwd, lokaal getest en productie-live op desktop en mobiel; dashboardwidgets verwijderd uit rapportages na UX-review.

Doel: rapportages moeten minder tabelachtig en meer analytisch worden.

- Command-panel toegevoegd met analyseframe voor binnengekomen, uitgegeven en beleggen.
- Maand-, kwartaal- en jaarweergave gekoppeld aan dezelfde compacte filterlaag.
- Dashboardwidgets zoals periodeflow, maandlijn en uitgavenmix horen niet in rapportages en zijn daar verwijderd.
- Rapportages blijven gericht op periodekeuze, maandcontrole, maandbeeld, rondkomen per periode en specificaties.
- Sparen en beleggen blijven visueel apart van gewone uitgaven.

## WP-04 - Transacties en categoriseren als werklijst

Status: redesign-overlay gebouwd, lokaal getest en productie-live op desktop, MacBook/laptop en mobiel.

Doel: veel transacties snel kunnen scannen, filteren en corrigeren.

- Transactiescherm kreeg een transactie-overzicht hero met selectie- en resultaatmix.
- Filterbalk is omgezet naar een surface command layer met compacte summary-pills.
- Mobiel gebruikt een enkele flow-card kolom; MacBook/laptop en groot scherm gebruiken een compacte transactietabel zodat categorieen snel ingevoerd kunnen worden.
- De transactietabel combineert categorie en type tot status en toont omschrijvingen bewust kort, zodat correctie-controls binnen het werkvlak blijven.
- In transactierijen is de categorie visueel leidend; tegenpartij en omschrijving zijn context. Specifieke parkeer-/ticketbetalingen zoals Vakantiepark De Heigraaf worden als `Parkeren` herkend in plaats van als brede vakantiereservering.
- Zoektekst gebruikt rustige debounce zonder remount tijdens typen.
- Categoriseren kreeg een review-inbox hero met werkvoorraad en het getoonde aantal.
- Batchkeuzes, reviewlijst en inline correcties gebruiken dezelfde moderne surface-laag.

## WP-05 - Planning, budgetten en sparen

Status: gebouwd, lokaal getest en productie-live.

Doel: planning voelt als vooruitkijken, niet als administratie achteraf.

- Budgetten als maandplan met voortgang en risico.
- Sparen is vereenvoudigd naar een spaarrekening-overzicht met de bankstand als bron van waarheid.
- Spaarmutaties worden feitelijk getoond als bij- en afschrijvingen; virtuele reserveringsverdelingen bepalen de cijfers niet meer in de primaire UX.
- De spaarpagina gebruikt widgetoverzicht bovenaan en transacties over de volledige breedte.
- Beleggen apart als vermogensopbouw tonen waar relevant.

## WP-06 - Beheer en import flows

Status: gebouwd, lokaal getest en productie-live.

Doel: beheer blijft krachtig maar minder prominent en minder druk.

- Importwizard visueel stroomlijnen.
- Beheerpagina opdelen in rustige control panels.
- Rekeningen, mappingregels en vaste lasten consistente CRUD-patronen geven.
- Readonly-UX toont kijkrechten zonder wijzig-, import-, export- of restore-acties; admin en owner krijgen alleen acties die bij hun rol horen.

## WP-07 - Visuele QA en productievoorbereiding

Status: afgerond voor WP-01 t/m WP-07; productievalidatie groen op 2026-08-30.

Doel: deployen nadat de UX aantoonbaar goed werkt en productie expliciet is vrijgegeven.

- Desktop en mobiel screenshots nalopen voor dashboard, rapportages, transacties en categoriseren.
- MacBook-profiel rond 1512px apart nalopen, omdat `xl`-breakpoints door de sidebar anders te vroeg groot-schermlayouts activeren.
- Overlap, truncatie, contrast en touch targets controleren.
- `npm run lint`, `npm run typecheck` en `npm run build`.
- Productie gedeployed via `bash scripts/deploy-remote.sh --confirm-production`.
- Productie gevalideerd via `bash scripts/validate-production.sh` op `https://huishouden.latero.nl`.

## WP-08 - Toegankelijkheid (a11y) en focus management

Status: afgerond, gedeployed 2026-09-03.

Doel: de hele applicatie gebruiksbaar maken voor iedereen, inclusief gebruikers die afhankelijk zijn van toetsenbordnavigatie of screenreaders.

- Skip-navigation link "Ga naar hoofdinhoud" toegevoegd aan root layout.
- Aria-live region toegevoegd aan app-shell voor dynamische updates.
- Focus management: main element heeft `aria-label` en `focus:outline-none`.
- Touch targets vergroot naar 44px (WCAG 2.1 AA).
- Focus ring duidelijker gemaakt (3px solid i.p.v. semi-transparent).
- `sr-only` class toegevoegd aan globals.css.

## WP-09 - Load states, skeleton screens en reactiesnelheid

Status: afgerond, gedeployed 2026-09-03.

Doel: de app altijd direct en vloeiend aanvoelen, ook tijdens data laden.

- Skeleton componenten aangemaakt: `Skeleton`, `SkeletonText`, `SkeletonCard`, `SkeletonDashboard`, `SkeletonTransactions`.
- `loading.tsx` toegevoegd aan dashboard, transacties en categoriseren pagina's.
- CSS view transitions behouden tussen pagina-omwisselingen.

## WP-10 - Micro-interacties en feedback systemen

Status: afgerond, gedeployed 2026-09-03.

Doel: elke gebruikersactie een duidelijke, gerichte feedback geven zonder de interface te verstikken.

- `Toast` component aangemaakt met `useToast()` hook.
- `ToastProvider` geïntegreerd in app layout.
- Varianten: success, error, info.
- Auto-dismiss na 4 seconden.

## WP-11 - Zoek-UX verbeteringen en slimme suggesties

Status: afgerond, gedeployed 2026-09-03.

Doel: zoeken niet alleen krachtig maar ook voorspellend.

- `Autocomplete` component aangemaakt met keyboard-navigatie (arrow keys, Enter, Escape).
- ARIA `combobox` role voor toegankelijkheid.
- Suggesties gebaseerd op tegenpartijen uit de database.
- Geïntegreerd in het zoekveld van transacties.

## WP-12 - Mobiel gestuur-verbeteringen

Status: afgerond, gedeployed 2026-09-03.

Doel: mobiel niet alleen een verticaal formaat maar een natuurlijk bedieningservaring.

- CSS voor swipe-acties (links/rechts) toegevoegd aan globals.css.
- Pull-to-refresh indicator CSS.
- Long-press styling voor mobiele interactie.

## WP-13 - Dashboard personalisatie en slimme suggesties

Status: afgerond, gedeployed 2026-09-03.

Doel: het dashboard persoonlijk en relevant maken zonder individuele domeinlogica te wijzigen.

- "Acties" sectie toegevoegd aan dashboard met directe knoppen voor CSV importeren, Categoriseren en Budget bekijken.

## WP-14 - Navigatie en routing verbeteringen

Status: afgerond, gedeployed 2026-09-03.

Doel: navigatie intuïtief en direct, met altijd duidelijke locatiebepaling.

- `Breadcrumbs` component aangemaakt met `aria-label="Kruimelpad"` en `aria-current="page"`.
- Geïntegreerd in rekening detail pagina.

## WP-15 - Visueel design systeem verbeteringen

Status: afgerond, gedeployed 2026-09-03.

Doel: een consistent, professioneel en leesbaar visueel systeem zonder design-drift.

- Extra CSS design tokens toegevoegd voor font-sizes en spacing.
- `Tooltip` component aangemaakt.
- Verbeterde focus ring (3px solid i.p.v. semi-transparent).

## WP-16 - Procesflow verbeteringen

Status: afgerond (bestond al), gedeployed 2026-09-03.

Doel: complexe processen opdelen in natuurlijke stappen met duidelijke voortgang.

- Bulk-acties op transacties waren al aanwezig: selectie per regel, pagina, alle gefilterde transacties.
- Categorie selector voor bulk-wijziging.
- "Toepassen" knop met pending state feedback.
- `useFormStatus` voor optimistische UI feedback.

## Extra features (buiten WP-reeks)

Status: afgerond, gedeployed 2026-09-03.

### BR59: Bewaarde filters

- Database migratie `027_saved_filters.sql` voor opgeslagen filters per gebruiker.
- Repository functies: `getSavedFiltersFromDatabase`, `saveFilterToDatabase`, `deleteSavedFilter`.
- Server actions: `saveTransactionFilter`, `deleteTransactionFilter`.
- UI: "Filter opslaan" knop in het filterformulier + opgeslagen filters als snelle selectieknoppen.

### Account exclude-from-import

- Database migratie `028_account_exclude_from_import.sql`: `excluded_from_import` kolom op accounts.
- Toggle per rekening op `/rekeningen` om rekeningen uit te sluiten van import.
- Server action: `toggleAccountExcludeFromImport`.
- `excluded_from_import` veld toegevoegd aan `Account` type en database queries.

### Development tooling

- `scripts/dev.sh` aangemaakt: start dev server op een vrije poort, stopt Docker app-container, start postgres.
