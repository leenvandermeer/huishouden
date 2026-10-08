# Architectuur

Huishouden is een Next.js-webapplicatie met TypeScript, React en PostgreSQL. De financiële gegevens behoren tot één gedeelde huishoudadministratie. Rollen regelen toegang tot die administratie; het product biedt geen afzonderlijke administratie per aangemelde gebruiker.

## Applicatielagen

| Laag | Locatie | Verantwoordelijkheid |
| --- | --- | --- |
| Schermen en HTTP-routes | `src/app` | Navigatie, formulieren, import en export |
| Componenten | `src/components` | Herbruikbare interface en interactie |
| Financieel domein | `src/modules/finance` | Parsing, categorisering, budgetten en berekeningen |
| Toegang | `src/modules/auth` | Accounts, sessies, rollen en tweefactorauthenticatie |
| Databaseverbinding | `src/server/db` | Verplichte omgevingsconfiguratie en connection pool |
| Schema en migraties | `infra/sql/migrations` | Tabellen en incrementele schemawijzigingen |
| Beheer | `scripts` | Installatie, controles, release en herstel |

UI-componenten bevatten geen SQL. De repository voert databasebewerkingen uit; domeinfuncties maken financiële berekeningen controleerbaar en testbaar. Geldbedragen worden in PostgreSQL als numerieke waarden opgeslagen.

## Gegevensmodel

Rekeningen bevatten standen en peildata. Transacties verwijzen naar een rekening en eventueel een categorie en import. Rekeningnotaties verbinden bankbestanden met bestaande rekeningen. Budgetten zijn maand- of jaargebonden. Vaste lasten en inkomstenplanning voeden de vooruitblik. Statussen van rapportagecontrolepunten veranderen geen financiële gegevens.

Bestaande tabellen voor virtuele spaarpotten blijven beschikbaar voor compatibiliteit. De primaire spaarweergave en rapportagetotalen volgen rekeningstanden en transacties.

## Bankimport

Een upload wordt tijdelijk als preview vastgelegd. De toepassing herkent het formaat en telt bekende transacties. Na bevestiging verwerkt de server de bestanden binnen databasetransacties. Bestand- en transactiefingerprints beschermen tegen duplicaten. Een PostgreSQL advisory lock voorkomt gelijktijdige bankimportverwerking. Als niets nieuws is toegevoegd, vervalt de zware nacontrole.

Na nieuwe transacties worden overboekingen, categorisering en afgeleide gegevens gecontroleerd. Een import met meerdere bestanden gebruikt afzonderlijke databasetransacties per bestand; de volledige upload is geen alles-of-niets-transactie.

## Berekeningen en exports

Vandaag, planning en scenario’s gebruiken expliciete feiten en schattingen. Het [rekencontract](financieel-rekencontract-v1.md) bepaalt de formules, afronding en inkomenshorizon. Het [CSV-contract](csv-productcontract-v1.md) koppelt exports aan dezelfde schermmodellen, filters en sortering.

## Toegang en gegevensbescherming

Sessies worden aan de serverkant gecontroleerd. De rollen eigenaar, beheerder en alleen-lezen gebruiker hebben verschillende bevoegdheden. Gevoelige routes gebruiken no-store-headers. Geheimen worden uitsluitend via privéconfiguratie aangeleverd. Zie [veiligheid en privacy](veiligheid-en-privacy.md).
