# Gecontroleerde uitrol

## Naamkeuze

De productnaam blijft **Huishouden**. De naam is direct begrijpelijk voor de brede doelgroep en sluit aan op bestaande installatie-, export- en App Store-identiteit. **Ruimte** is de naam van de vernieuwde ervaring en het rekenconcept, niet van een tweede applicatie.

Deze keuze voorkomt een stille merk- en routebreuk. Een toekomstige naamswijziging vereist een apart besluit met gebruikerstest, domeincontrole en migratie van manifest, 2FA-issuer en exportnamen.

## Eén product en één datamodel

De Ruimte-ervaring gebruikt de bestaande Next.js-app, PostgreSQL-tabellen, accounts, transacties en exports. Er is geen parallel datamodel en er worden geen financiële records gekopieerd om nieuwe schermen te voeden.

Release-identificatie staat centraal in `src/lib/product.ts`. De actuele release is zichtbaar via **Beheer → Productstatus**.

## Privacyarme productstatus

De statuspagina meet alleen:

- technische schermfouten in de laatste zeven dagen;
- dagen waarop een inkomstenbron ontbrak;
- dagen waarop geschatte bronnen nodig waren;
- uitgevoerde correcties in de laatste dertig dagen, afgeleid uit het bestaande auditlog.

Een productsignaal bevat alleen gebruiker, signaaltype, paginapad en release. Bedragen, transactieomschrijvingen, zoektermen en foutmeldingen worden niet opgeslagen. Per gebruiker, signaal, pagina en dag wordt maximaal één regel opgeslagen.

## Tijdelijke oude routes

Deze links blijven voorlopig werken:

| Oude route | Nieuwe bestemming |
| --- | --- |
| `/analyse` | `/inzicht?rapport=trends` |
| `/rapport` | `/rapportages` |
| `/geldplanning` | `/planning` |
| `/budget` | `/budgetten` |
| `/categoriseren` | `/transacties?mode=review` |
| `/dashboard/detail` | `/inzicht` |

De redirects worden niet eerder dan 22 december 2026 beoordeeld op verwijdering. Verwijderen mag alleen nadat bookmarks, productielogs en documentatie geen afhankelijkheid meer tonen.

## Deploy en rollback

Vóór iedere remote deploy maakt `deploy-remote.sh` op de server een broncode-snapshot in `.releases`. Productiegeheimen, back-ups, dependencies en buildoutput worden niet in die snapshot opgenomen. Snapshots blijven beschikbaar in `.releases`; Git-deploys bewaren ook de vorige commit in een `.commit`-bestand.

Snapshots bekijken:

```bash
bash scripts/rollback-remote.sh --list
```

Een release terugzetten:

```bash
bash scripts/rollback-remote.sh --confirm-production 20260922T184500Z
npm run prod:validate
```

Rollback herstelt alleen applicatiecode. Databasewijzigingen blijven staan en moeten daarom achterwaarts compatibel en bij voorkeur additief zijn. Migratie `040_product_events.sql` voldoet daaraan: de voorgaande applicatie kent de nieuwe tabel niet en blijft functioneren.

## Uitrolbesluit

Een release gaat alleen door als `npm run release:check` slaagt. Na deploy moet `npm run prod:validate` slagen. Bij een mislukte healthcheck of kernroute wordt eerst de vorige snapshot hersteld; financiële gegevens worden niet handmatig teruggedraaid.
