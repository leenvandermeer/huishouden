# Architectuur huishoudboekje

De applicatie volgt dezelfde hoofdkeuzes als `Urenregistratie`.

Status: v2 productie-live op 23 september 2026. Database, login, rollen, bankimport, rapportages, transacties, sparen, vaste lasten, categoriebeheer, budgetten, slimme assistentie, export en selectief herstel draaien op PostgreSQL met echte transacties.

## Stack

- Next.js + React + TypeScript voor webapp, server routes en UI.
- PostgreSQL als enige database.
- Geldbedragen worden in de database als `numeric(14,2)` opgeslagen.
- Domeinlogica komt in `src/modules/finance`.
- UI-componenten blijven SQL-vrij.

## Applicatielagen

| Laag | Pad | Status |
| --- | --- | --- |
| Webschermen | `src/app` | v1 gereed, beschermd achter login |
| UI-componenten | `src/components` | v1 gereed met responsive 2026-shell, readonly UX en transactiewerklijsten |
| Domeinmodel | `src/modules/finance` | v1 basis gereed, bankimport-parser, aliases en repositories aanwezig |
| Database | `infra/sql/migrations` | PostgreSQL schema en migratierunner gereed voor lokaal en productie |
| Documentatie | `Requirements`, `docs`, `doc` | Bijgewerkt |

## Modules

- `accounts`: betaal- en spaarrekeningen; alle beheerde rekeningen zijn eigen rekeningen.
- `account_aliases`: bankrekening- of IBAN-varianten die imports aan bestaande rekeningen koppelen.
- `transactions`: banktransacties, interne overboekingen, correcties en categorisatie.
- `categories`: categorieen en subcategorieen met type inkomsten, vaste lasten, variabel, reservering of intern.
- `budgets` en `annual_budgets`: maand- en jaarbudgetten met historische vastlegging, carry-over, notities en bewuste uitzonderingen.
- `pots`: legacy tabel voor oude virtuele reserveringsverdelingen. De primaire UX en rapportageformules gebruiken deze tabel niet meer; sparen loopt via spaarrekeningstand en transacties in/uit.
- `fixed_expenses`: vaste lasten met frequentie en bedragshistorie.
- `imports`: CSV-, CAMT.053- en MT940-bankbestanden met fingerprints voor dubbele-importpreventie.
- `categorization_rules`: actieve herkenningsregels met categorie, transactietype en matchbron. Een regel zoekt met deeltekst in tegenpartij, omschrijving/detailomschrijving of beide.
- Dashboarddata wordt rechtstreeks uit transacties en actuele rekeningsaldi opgebouwd. `/dashboard` gebruikt die data bewust als compacte vandaagstatus met acties en routes. `/inzicht` gebruikt dezelfde maandseries voor grafieken, jaarmatrix, categorie-trends en verdiepende analyse; het saldoverloop rekent maand-eindsaldi vanaf de actuele bankstand terug. Rekeningen die expliciet van import zijn uitgesloten blijven beheerbaar, maar tellen niet mee in Vermogen, de vermogenshistorie, datakwaliteit of Vermogen-CSV.
- `pending_imports`: tijdelijke upload-preview voordat een bankbestand definitief wordt ingelezen.
- `import_mapping_presets`: herbruikbare kolommapping voor generieke CSV-bestanden.
- `ignored_suggestions`: bewust geweigerde voorstellen, bijvoorbeeld een vaste-lasten-kandidaat die eenmalig blijkt.
- `report_signal_statuses`: gebruikersstatus per periode voor deterministische rapportagecontrolepunten; een status verandert nooit de onderliggende financiële data.
- `rules`: deterministische herkenningsregels voor categorisatie.

## Rollen

- `owner`: volledige toegang, inclusief gebruikersbeheer en restore vanuit JSON back-up.
- `admin`: mag financiele data beheren, importeren, exporteren en corrigeren, maar geen gebruikers beheren of restore uitvoeren.
- `readonly`: mag data bekijken en eigen wachtwoord wijzigen, maar geen financiele data wijzigen, importeren, exporteren of herstellen.

## Security

Zie [security-audit-2026-08-30.md](security-audit-2026-08-30.md) voor de laatste audit. Gevoelige routes gebruiken no-store, exports en restores zijn rolgebonden, sessies worden server-side gevalideerd met een vaste maximale duur van 1 uur, en productie draait met expliciete securityheaders.

## Slimme assistentie

De productieversie gebruikt geen externe AI-koppeling. Slimme assistentie is deterministische code: categoriesuggesties, vaste-lastkandidaten, verklarende rapportageteksten, budgetvoorstellen, kasstroomadvies en signalen met een expliciete afhandelstatus. Financiele totalen, saldi en budgetberekeningen komen uitsluitend uit opgeslagen data. Zie [deterministic-assistance-v2.md](deterministic-assistance-v2.md).

## Lokale poorten

| Service | Hostpoort |
| --- | --- |
| Webapplicatie | 3001 |
| PostgreSQL | 5434 |

## Resterende productgrens

De app is releaseklaar voor dagelijks gebruik. CAMT/MT940, selectieve restore, bewaarde filters en conflictpreview zijn productie-live. Bewust resterend: 2FA/passkeys en uitgebreider sessiebeheer.
