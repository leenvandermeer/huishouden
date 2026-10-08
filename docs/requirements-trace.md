# Requirementdekking productieversie

Bron: [Requirements/Requirements.md](../Requirements/Requirements.md).

Statuslegenda:

- `v1`: werkend op PostgreSQL en aangeleverde transacties.
- `v1 voorbereid`: datamodel of grens is aanwezig; verdere automatisering is nog niet ingepland.
- `v2`: afgeronde verdieping boven op de v1-basis.

| Requirement | Werkpakket | v1-dekking | Status |
| --- | --- | --- | --- |
| BR01-BR05 | WP-03 | Rekeningscherm met bankagnostische betaal- en spaarrekeningen, rekeningtype, handmatige bankstand/peildatum plus exact herijkmoment, aliases en samenvoegen. | v1 |
| BR06-BR11 | WP-04 | Transacties, categorieen, transactietypes en interne overboekingen zijn gemodelleerd en geimporteerd. Categorieen zijn beheerbaar, mappingregels kunnen in bulk worden doorgevoerd en de review-inbox verwerkt algemene posten. | v1 |
| BR12 | WP-04 | Correcties/terugbetalingen zijn benoemd in scope; koppelservice volgt. | v1 voorbereid |
| BR13-BR17 | WP-06 | Vaste lasten zijn beheerbaar; kandidaten worden uit transacties herkend en kunnen met transactiekoppeling worden geaccepteerd. | v1 |
| BR18-BR21 | WP-05 | Historisch onafhankelijke maandbudgetten tonen gepland, werkelijk, resterend en verbruik; carry-over is optioneel. Jaarbudgetten en reserveringscategorieen hebben een expliciet eigen overzicht. | v2 |
| BR22-BR25, BR75 | WP-05 | Sparen is herijkt naar een spaarrekening-overzicht: bankstand is leidend en transacties in/uit verklaren de beweging. Virtuele reserveringsverdelingen sturen geen primaire cijfers meer. | v2 herijkt |
| BR26-BR30 | WP-06, WP-07 | Rapportages tonen maandcijfers, budgetactuals en werkelijk resultaat uit PostgreSQL-data. | v1 |
| BR31-BR36 | WP-01, WP-04, WP-07 | Rapportagecockpit, maandkeuze, doorklikbare schermen en direct reagerende filter-UI voor transacties zijn aanwezig; periodevergelijking staat in rapportages. | v1 |
| BR37-BR40 | WP-08 | Slimme assistentie blijft deterministisch: categoriesuggesties tonen score en reden en vereisen expliciete acceptatie; verklaringen en signalen zijn navolgbaar. | v2 |
| BR41 | WP-03 | Bankagnostisch import- en rekeningmodel is bankkoppeling-ready. | v1 voorbereid |
| BR42 | WP-01 | Responsive webapp voor computer, tablet en telefoon. | v1 |
| BR43 | WP-02, WP-08 | Login met sessie is aanwezig. Readonly kan kijken en eigen wachtwoord wijzigen, maar geen data muteren/exporteren. Admin mag data beheren/exporteren. Alleen owner mag gebruikers beheren en restore uitvoeren. | v1 |
| BR44 | WP-07 | Export/back-up is aanwezig via JSON back-up en CSV-transactieexport. | v1 |
| BR45 | WP-00, WP-04, WP-05 | Historische tabellen/validiteitsvelden zijn voorbereid in schema. | v1 voorbereid |
| BR46-BR48 | WP-00, WP-05 | Runtime gebruikt PostgreSQL als verplichte databron, zonder CSV-fallback; budgetten starten leeg en worden bewust handmatig aangemaakt of gekopieerd. | v1 |
| BR49-BR50 | WP-05 | Budgetvoorstellen ondersteunen 3/6 maanden; kopieren gebruikt een verplichte bulkpreview met nieuwe, gelijke, conflicterende en ongeldige regels. | v2 |
| BR51-BR54 | WP-01, WP-07 | Rapportages ondersteunen maand/kwartaal/jaar, historisch gemiddelde, verklaringen, actiesignalen en saldo-observaties als herleidbare ankers. | v2 |
| BR55-BR56 | WP-07 | Export met manifest en back-up zijn aanwezig; restore heeft een bestands- en selectiegebonden dry-run, selectieve gegevensgroepen, conflicttellingen en transactionele vervanging. | v2 |
| BR57 | WP-08 | Auditlog voor imports, exports en beheermutaties is aanwezig. | v1 |
| BR58 | WP-03 | Rabobank/generieke CSV, CAMT.053 en MT940 worden op inhoud herkend en via dezelfde gecontroleerde importroute verwerkt. | v2 |
| BR59 | WP-04 | Transacties gebruiken server-side PostgreSQL-filters, gefilterde totalen, URL-paginering, rustige debounce en gebruikersgebonden bewaarde filters. | v2 |
| BR60 | WP-02, WP-08 | Rollenbasis voor mutaties/export is aanwezig; wachtwoord wijzigen en gebruikersbeheer zijn aanwezig; sessiebeheer en 2FA/passkeys staan in v2. | v1 voorbereid |
| BR61-BR62 | WP-06 | Vaste-lasten-kandidaten tonen score, reden, bedragspatroon en dubbelen; acceptatie koppelt transacties en actieve lasten signaleren gemiste of afwijkende leveranciers. | v2 |
| BR63-BR66 | WP-07 | Rapportages tonen maandelijkse cashflow, referentie/forecast, categorieverschillen, prijs-/lastensignalen en volledig zichtbare rapportregels. | v1 |
| BR67-BR71 | WP-03, WP-04 | Importwizard met preview en kolommapping, handmatig rekeningen toevoegen, aliasbeheer, samenvoegen en categorie-review inbox zijn aanwezig. | v1 |
| BR72-BR75, BR77 | WP-01, WP-05, WP-08 | Planning toont sparen als bankboek met actuele stand, bijschrijvingen en afschrijvingen; oude reserveringsherkenning is geen primaire UX meer. | v2 herijkt |
| BR76, BR79 | UX6, UX8, UX10 | Importwizard toont controle na upload met nieuwe/overgeslagen transacties, rekeningen, saldocontrole, reviewpunten en directe vervolgstappen. Laatste imports kunnen met expliciete bevestiging worden teruggedraaid; transacties, saldi, potjes en importmetadata worden opnieuw opgebouwd. Generieke CSV-kolommapping kan als preset worden hergebruikt. | v2 herijkt |
| BR78, BR84 | WP-03 | Rekeningen hebben een detailpagina met saldoverloop, saldocontrole, aliases, transacties en link naar spaarmutaties. Het rekeningoverzicht toont bankstand, berekend saldo, saldoverschil, laatste import en exact herijkmoment. | v2 herijkt |
| BR80-BR82 | WP-01, WP-03, WP-04, WP-08 | Categorie-review toont filterbare batches, Beheer is gegroepeerd in businessblokken en Rapportages focussen zonder actiesignalenblok op analyse. | v1 |
| BR83 | WP-07 | Rapportages hebben maandafsluiting met gecontroleerd-status en notitie per maand. | v1 |

## Releasegrens

Voor dagelijks privegebruik zijn login, importwizard voor CSV/CAMT/MT940, rapportages, transacties, categorieen, kruisposten, maand- en jaarbudgetten, bewaarde filters, slimme voorstellen, export/back-up, selectieve restore en audit productie-live op echte data. Alleen BR60 resteert gedeeltelijk: uitgebreider sessiebeheer en 2FA/passkeys.
