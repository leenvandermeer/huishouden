# Huishouden

Prive huishoudboekje in dezelfde lijn als `Urenregistratie`: Next.js, TypeScript, server-first schermen, compacte Vdmeer cockpit-UX en een PostgreSQL-ready domeinmodel.

## Status

Huidige fase: **v1 prive-product met database, login, generieke bank CSV-import, categoriebeheer en echte transactiedata**.

De applicatie gebruikt PostgreSQL als verplichte runtime databron, echte login met sessies, idempotente bankbestand-import en beheerformulieren voor transactiecategorieen, regels, budgetten, sparen en vaste lasten. Runtime-schermen lezen nooit direct uit CSV.

## Snel starten

Vereisten: Node.js 22.12+, npm en een draaiende Docker-installatie.

Eerste installatie:

```bash
npm ci
cp .env.example .env.local
docker compose up -d postgres
npm run db:setup
bash scripts/dev.sh
```

Open daarna `http://localhost:3001`.

Ontwikkellogin:

- E-mail: `leen@vdmeer.local`
- Wachtwoord: `huishoudboekje-dev`

Daarna is voor dagelijks lokaal starten meestal alleen dit nodig:

```bash
bash scripts/dev.sh
```

De volledige installatie-, back-up-, restore- en productiehandleiding staat in [docs/installatie-en-beheer.md](docs/installatie-en-beheer.md).

De evolutionaire productroadmap van Huishouden naar de financiële assistent `Ruimte`, inclusief het CSV-exportcontract, staat in [docs/ruimte-evolutie-workpackages.md](docs/ruimte-evolutie-workpackages.md).
Het versievaste CSV-formaat, de kolommen en de beschikbare contextuele exports staan in [docs/csv-productcontract-v1.md](docs/csv-productcontract-v1.md).

De actuele definities, formules, categorie-inclusies en afrondingsregels staan in [docs/financieel-rekencontract-v1.md](docs/financieel-rekencontract-v1.md).

## Welke opdracht gebruik ik?

| Doel | Opdracht |
| --- | --- |
| Lokaal starten | `bash scripts/dev.sh` |
| Database bijwerken | `npm run db:migrate` |
| Alle releasecontroles | `npm run release:check` |
| Naar productie deployen | `bash scripts/deploy-remote.sh --confirm-production` |
| Productie controleren | `npm run prod:validate` |

## Testen en deployen

De releasecheck draait lint, TypeScript, tests, productie-build, databasemigraties en de deployguard. De opdracht deployt zelf niets.

```bash
npm run release:check
git add .
git commit -m "Beschrijf de wijziging"
git push origin main
bash scripts/deploy-remote.sh --confirm-production
npm run prod:validate
```

Zonder `--confirm-production` stopt de deploy bewust zonder productie te wijzigen. Deploys vereisen een schone lokale Git-checkout waarvan HEAD gelijk is aan GitHub `main`. De server haalt exact die commit op; er wordt geen lokale broncode meer via rsync verstuurd.

Back-ups maak en controleer je via `/exporteren`. Voer altijd eerst **Dry-run controleren** uit voordat je als eigenaar een restore start.

## Opgeleverd

- Login-scherm voor prive toegang.
- Echte login met Argon2-wachtwoordhash en sessie-cookie.
- Responsive applicatieschil met desktop-sidebar en mobiele navigatie.
- Beheer-ingang met rekeningen, categorieen, vaste lasten, import, export, toegang en instellingen.
- Terugkerende inkomsten en vaste lasten ondersteunen maandelijks, elke vier weken, per kwartaal en jaarlijks; vierwekelijkse patronen worden uit transacties herkend.
- Rapportages als analyseplek met standaard de actuele maand, periodekiezer voor maand/kwartaal/jaar en tabs voor Uitgaven en Rondkomen.
- Rapportages hebben een aparte Acties-weergave voor deterministische controlepunten, met directe bronroute en auditbare status open, afgehandeld of genegeerd.
- Vandaag-dashboard op `/dashboard` voor snelle status, open acties, maandkorting en routes.
- Analyse op `/inzicht` als centrale financiele cockpit met saldoverloop, vooruitblik, jaarmatrix, vaste-lastenmonitor, categorie-trends, buffer/spaargeld en budget-vs-werkelijk.
- Rekeningen voor betaal- en spaarrekeningen, inclusief aliases, samenvoegen van dubbele rekeningen, saldocontrole en exact herijkmoment.
- CSV-importwizard via `/importeren`; Rabobank CSV en generieke bankbestanden met herkenbare kolomnamen worden ondersteund.
- Import-preview met tellingen voor bestanden, rekeningen, transacties, bestaande transacties en verwachte nieuwe transacties.
- Kolommapping voor generieke bankbestanden wanneer verplichte kolommen niet automatisch worden herkend.
- Herbruikbare kolommapping-presets voor generieke CSV-bestanden.
- Persistente bankimport naar PostgreSQL.
- Importcontrole met afsluitchecklist, saldocontrole per rekening, reviewpunten en directe vervolgstappen na upload.
- Laatste imports kunnen bewust worden teruggedraaid; transacties, saldi, potjes en importmetadata worden daarna opnieuw opgebouwd.
- Transacties met categorie, type, kruispost/interne overboeking, regelsuggesties en deterministische fingerprint.
- Overboekingen tussen eigen rekeningen worden als kruispost gemarkeerd en tellen netto niet mee als inkomen of uitgave.
- Handmatige transactiecategoriecorrectie met optionele regel op tegenpartij, omschrijving/detailomschrijving of beide.
- Categorie-review inbox op `/categoriseren` voor nieuwe of algemene posten na import.
- Categoriebeheer met aanmaken, wijzigen, verplaatsen en verwijderen/archiveren.
- Apart mappingregelscherm met uitgebreide standaardset voor herkenningsregels zoals Albert Heijn/Jumbo naar Boodschappen.
- Importscherm voor bankbestanden met bestandsfingerprint als duplicaatcontrole.
- Beheerformulieren voor vaste lasten, import, export, categorieen, gebruikers en instellingen.
- Rekeningen hebben detailpagina's met saldoverloop, aliases, saldocontrole en recente transacties.
- Sparen toont de spaarrekening als bankboek met bankstand, bijschrijvingen en afschrijvingen.
- Budgetten zijn bewuste maandplannen; werkelijke uitgaven worden alleen aan bestaande budgetten gekoppeld.
- Budgetten en Vooruit delen een kasstroomadvies dat de 30-dagenplanning combineert met het nog resterende variabele budget en het laagste verwachte saldo.
- Budgetscherm begint leeg per maand: importeren maakt geen budgetten aan. Je maakt, wijzigt, kopieert of verwijdert budgetten handmatig; historische voorstellen zijn alleen optionele hulp bij bestaande keuzes.
- Budgetplannen kunnen van een eerdere maand naar de gekozen maand worden gekopieerd.
- Vaste lasten tonen kandidaten uit terugkerende PostgreSQL-transacties en kunnen bij acceptatie aan categorieen worden gekoppeld.
- Rapportages gesplitst in Uitgaven en Rondkomen, met maand-, kwartaal- en jaarcashflow, prive-uitgavenrapport, referentie/forecast, categorieverschillen en duurdere posten.
- Begrotingsrapporten tonen alle posten volledig; sectietotalen blijven exact herleidbaar naar de onderliggende regels.
- Exporteren met volledige JSON back-up inclusief manifest en CSV-transactieexport.
- Een centrale Vermogen-pagina voor betaalgeld, sparen, beleggingen en schulden, met rekeningkwaliteit en een herleidbare CSV-export.
- Volledige of selectieve restore vanuit JSON back-up met checksumcontrole, conflictpreview en database-transactie.
- Auditlog voor imports, exports en beheermutaties.
- Security-hardening met no-store op gevoelige routes, uploadlimieten, vaste sessie-expiry van 1 uur en productieheaders.
- Rollenmodel: `owner` beheert alles inclusief gebruikers en restore, `admin` beheert financiele data/export, `readonly` kan kijken en eigen wachtwoord wijzigen.
- Beheerpagina voor eigen wachtwoord wijzigen; gebruikers toevoegen of uitschakelen is alleen voor `owner`.
- Beheerscript `npm run user:set-password -- email` reset een gebruikerswachtwoord via `USER_PASSWORD` en verifieert de hash direct.
- Productievalidatie via `npm run prod:validate` controleert health, login, kernroutes, resetpagina en loginformulier.
- Transactiescherm met server-side PostgreSQL-filters, URL-parameters, samenvatting en paginering.
- `/dashboard` is bewust compact: vandaagstatus, review/import-acties, saldi en routes. Grafieken en verdiepende widgets staan centraal op `/inzicht`.
- Rekeningstanden kunnen handmatig op actuele bankstand/peildatum worden gezet wanneer historie ontbreekt.
- Rekeningdetailpagina's tonen saldocontrole tussen bankstand en transactieverloop.
- Rapportages hebben maandafsluiting met controle-notitie.
- PostgreSQL-startschema in `infra/sql/migrations/001_initial.sql`.

## Documentatie

- Requirements: [Requirements/Requirements.md](Requirements/Requirements.md)
- Release v1: [docs/release-v1-2026-08-30.md](docs/release-v1-2026-08-30.md)
- Architectuur: [docs/architecture.md](docs/architecture.md)
- Requirementtrace: [docs/requirements-trace.md](docs/requirements-trace.md)
- Zoek-UX plan: [docs/search-ux-plan.md](docs/search-ux-plan.md)
- UX 2026 redesign werkpakketten: [docs/ux-2026-redesign-workpackages.md](docs/ux-2026-redesign-workpackages.md)
- Mobile-first UX onderzoek en evaluatie: [docs/mobile-first-ux-2026.md](docs/mobile-first-ux-2026.md)
- Rekeningstanden: [docs/account-balances.md](docs/account-balances.md)
- Categoriebeheer en mappingregels: [docs/category-management.md](docs/category-management.md)
- Deterministische slimme assistentie v2: [docs/deterministic-assistance-v2.md](docs/deterministic-assistance-v2.md)
- Development workflow: [docs/development-workflow.md](docs/development-workflow.md)
- Installatie en beheer: [docs/installatie-en-beheer.md](docs/installatie-en-beheer.md)
- Naam, productstatus en rollback: [docs/gecontroleerde-uitrol.md](docs/gecontroleerde-uitrol.md)
- Security audit: [docs/security-audit-2026-08-30.md](docs/security-audit-2026-08-30.md)
- Back-up en herstel: [docs/back-up-en-herstel.md](docs/back-up-en-herstel.md)
- v2-roadmap: [docs/v2-roadmap.md](docs/v2-roadmap.md)

## Belangrijke ontwerpkeuzes

- Budgetten en spaarrekeningmutaties zijn verschillende concepten.
- De spaarrekening is de bron van waarheid voor sparen: bankstand, bijschrijvingen en afschrijvingen.
- Virtuele reserveringsverdelingen bepalen geen saldi, rapportcijfers of importcontroles meer in de primaire UX.
- `Naar spaarrekening` telt als geld dat apart gezet wordt; `Uit spaarrekening` telt als beschikbaar geld om de maand te betalen.
- `Beleggen` telt als geld dat uit de maandruimte gaat, maar staat apart van gewone uitgaven.
- Interne overboekingen/kruisposten tellen netto niet als inkomen of uitgave.
- Mappingregels zijn richtinggevoelig: inkomstenregels worden alleen op positieve bedragen toegepast en uitgavenregels alleen op negatieve bedragen.
- Mappingregels gebruiken deeltekstherkenning, zodat varianten zoals verschillende winkelnummers onder dezelfde regel kunnen vallen.
- Voor generieke tegenpartijen zoals eigen namen stelt de correctie-UI een combinatie van tegenpartij en omschrijving voor, zodat spaarrekeningmutaties richtinggevoelig gemapt kunnen worden.
- Onbekende transacties krijgen geen automatische `Overig`-categorie. `Overig` is een bewuste keuze in de correctie-UI.
- Bankkosten zijn geen kruispost; die vallen onder `Bankkosten`.
- Financiele totalen komen uit opgeslagen data en aangeleverde transacties.
- Samengevoegde rapportregels mogen de onderliggende totaalsom niet veranderen; ze maken alleen compacte doorsneden leesbaar.
- Slimme assistentie mag categorievoorstellen, signalen en verklarende analyses geven, maar hoeft geen externe AI-koppeling te gebruiken. Saldi, totalen en budgetten blijven altijd deterministisch uit PostgreSQL.

## Business requirements

De actuele business requirements staan in [Requirements/Requirements.md](Requirements/Requirements.md). V1 en de dagelijkse v2-verdieping zijn productie-live: login en rollen, bankimportwizard, rekeningen, transacties, categorieen, mappingregels, kruisposten, rapportages, maand- en jaarbudgetten, sparen, vaste lasten, bewaarde filters, categoriesuggesties en volledige/selectieve restore. De resterende productgrens ligt bij sterkere beveiliging zoals uitgebreider sessiebeheer en 2FA/passkeys. Zie [de v2-release](docs/release-v2-2026-09-23.md).

## Bankbestand importeren

Bankbestanden zijn alleen een importbron. Na import draaien rapportages, transacties, categorieen en budgetten uitsluitend op PostgreSQL.

Gebruik `/importeren` om een of meerdere CSV-, CAMT.053- of MT940-bestanden te uploaden. Je kunt een enkel rekeningbestand importeren of meerdere rekeningbestanden tegelijk selecteren; interne overboekingen worden dan binnen die gecombineerde upload herkend. De app toont eerst een preview en schrijft pas na bevestiging naar PostgreSQL.

Rabobank CSV blijft ondersteund. Generieke CSV-bestanden worden herkend met gangbare kolommen zoals `date`/`datum`, `amount`/`bedrag`, `iban`/`rekening`, `counterparty`/`tegenpartij`, `description`/`omschrijving` en optioneel `balance`/`saldo`. Als herkenning onvoldoende is, koppel je de kolommen in de preview handmatig.

Rekeningkoppeling gebeurt via IBAN/rekeningnummer en aliases. Voeg op `/rekeningen` een rekening toe of voeg aliases toe wanneer een bankbestand dezelfde rekening anders noemt. Dubbele rekeningen kunnen daar worden samengevoegd.

Rabobank-import loopt via dezelfde uploadflow; er is geen aparte lokale importtaak meer.
