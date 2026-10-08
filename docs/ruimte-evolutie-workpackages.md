# Van Huishouden naar Ruimte — evolutionaire werkpakketten

Status: WP-R01 t/m WP-R13 afgerond, naar productie gedeployed en gevalideerd. De bestaande productieapp en het bestaande datamodel zijn gedurende de volledige evolutie het fundament gebleven.

## Productvisie

De app ontwikkelt van een registrerend huishoudboekje naar een rustige financiële assistent die dagelijks drie vragen beantwoordt:

1. Wat kan ik vandaag veilig uitgeven?
2. Wat komt er binnenkort aan?
3. Welke beslissing verdient mijn aandacht?

`Ruimte` is de voorlopige productnaam. Een definitieve naamswijziging gebeurt pas na een apart besluit; routes, gegevens en exports blijven tijdens de evolutie achterwaarts compatibel.

## Wat we behouden

- Next.js-app, PostgreSQL-datamodel, Docker-deploy en bestaande authenticatie.
- Rabobank- en generieke CSV-import, ontdubbeling en categorisatieregels.
- Transacties, categorieën, budgetten, rekeningen, saldocontrole, sparen en rapportages.
- Herkenning van maandelijkse en vierwekelijkse patronen.
- Back-up, restore, auditlog en rollen.
- De huidige warme visuele basis, Instrument Sans, TanStack Table en ECharts.
- CSV als volwaardig uitvoerformaat, niet als bijzaak.

De verandering wordt dus scherm voor scherm en berekening voor berekening ingevoerd. Bestaande data hoeft niet te worden gemigreerd naar een nieuw product.

## Overkoepelende definitie van klaar

Ieder werkpakket is pas klaar wanneer:

- mobiel 390 × 844, MacBook 1512 × 982 en extern scherm 2048 × 1080 zijn gecontroleerd;
- bedragen op scherm en in CSV tot op de cent aansluiten;
- aannames, schattingen en handmatige waarden herkenbaar zijn;
- toetsenbord, focus, semantiek en contrast bruikbaar zijn;
- lint, typecheck, unit-/integratietests, productiebuild en UX-smoke slagen;
- documentatie is bijgewerkt en productie na deploy is gevalideerd;
- bestaande CSV- en back-upexports niet regressief veranderen zonder expliciete versie-upgrade.

## Release A — Betrouwbare betekenis

### WP-R01 — Begrippen en rekencontract

Status: afgerond, naar productie gedeployed en gevalideerd op 21 september 2026. Contract 1.0.0, centrale formule, categorie-inclusies, CSV-metadata, normatieve voorbeelden en regressietests zijn geïmplementeerd.

Doel: één woordenboek en één rekenmodel voor alle schermen, grafieken en exports.

Werk:

- Definieer `bankstand`, `veilig te besteden`, `verwachte uitgaven`, `vaste verplichtingen`, `reservering`, `inkomstenbron` en `vermogen`.
- Leg vast welke categorieën wel en niet meetellen in ieder bedrag.
- Maak de peildatum en horizon onderdeel van iedere prognose.
- Verwijder misleidende termen zoals “gereserveerd” wanneer geld alleen statistisch wordt verwacht.
- Publiceer voorbeeldberekeningen met echte randgevallen: einde maand, meerdere inkomstenbronnen, vierwekelijks inkomen en ontbrekende datum.

Acceptatie:

- Dezelfde term heeft nergens twee betekenissen.
- Iedere primaire uitkomst kan vanuit bronregels worden nagerekend.
- Het rekencontract krijgt unit-tests en een versienummer voor exports.

### WP-R02 — Uitlegbaarheidslaag

Status: afgerond, naar productie gedeployed en gevalideerd op 21 september 2026. De vier bronstatussen, brontransacties, periode/bandbreedte, mobiele uitleg-sheet en directe bevestig-/uitsluitacties zijn geïmplementeerd.

Doel: iedere belangrijke uitkomst laat zien waar die vandaan komt.

Werk:

- Introduceer statussen `Zelf ingevuld`, `Sterke schatting`, `Voorlopige schatting` en `Afwijking`.
- Toon brontransacties, gebruikte periode, frequentie, bedragsspreiding en laatste waarneming.
- Voeg een compacte “Waarom dit bedrag?”-weergave toe die op mobiel als sheet opent.
- Sla geen afgeleide waarheid op als die reproduceerbaar uit brondata is.

Acceptatie:

- Vanaf Vandaag is iedere aftrekpost en ieder inkomen tot de bron te volgen.
- Een gebruiker kan een schatting bevestigen of corrigeren zonder beheerpagina te zoeken.

### WP-R03 — Inkomstenstromen 2.0

Status: afgerond, naar productie gedeployed en gevalideerd op 21 september 2026. Handmatige en herkende bronnen worden gecombineerd; maand-, vierweek-, kwartaal- en jaarpatronen, bandbreedte, zekerheid, afwijking en bevestigen/uitsluiten zijn geïmplementeerd.

Doel: meerdere structurele inkomsten als afzonderlijke stromen behandelen.

Bestaande basis: Timon en VDMeer Consultancy worden al apart herkend; betalingen van dezelfde bron binnen een maand worden samengevoegd.

Werk:

- Ondersteun salaris, onderneming, toeslag/uitkering en handmatig inkomen als gelijkwaardige bronnen.
- Bereken per bron bedrag of bandbreedte, frequentie, verwachte datum en zekerheid.
- Detecteer maand-, vierweek-, kwartaal- en jaarpatronen zonder incidentele bijschrijvingen als inkomen te promoveren.
- Toon de eerstvolgende bron op Vandaag en alle bronnen op Vooruit.
- Signaleer een gemiste of opvallend afwijkende betaling.

Acceptatie:

- Na Timon schuift VDMeer Consultancy automatisch door als eerstvolgende bron wanneer die datum eerder is.
- Deelbetalingen worden niet als losse maandinkomens gemiddeld.
- De gebruiker kan per bron de herkenning bevestigen of uitsluiten.

### WP-R04 — Veilig-te-besteden-engine 2.0

Status: afgerond, naar productie gedeployed en gevalideerd op 21 september 2026. De eerstvolgende inkomenshorizon, vaste volgorde op dezelfde dag, zichtbare onzekerheidsbuffer en prioritaire acties bij ontbrekend inkomen of tekort zijn geïmplementeerd.

Doel: een betrouwbaar bedrag tot een concrete horizon leveren.

Bestaande basis: vaste lasten en tijdsevenredige verwachte budgetuitgaven worden al tot het volgende inkomen berekend.

Werk:

- Splits harde verplichtingen, verwachte dagelijkse uitgaven en bewuste reserveringen.
- Gebruik de eerstvolgende inkomstenbron als horizon, met einde maand als terugval.
- Modelleer betalingen op dezelfde dag in een vaste, uitlegbare volgorde.
- Voeg onzekerheidsmarge toe bij geschatte datums of sterk wisselende bedragen.
- Maak negatieve ruimte en ontbrekende gegevens handelbaar met één duidelijke actie.

Acceptatie:

- Een onbesteed maandbudget wordt niet volledig afgetrokken als nog maar enkele dagen resteren.
- De berekening blijft stabiel rond maandgrens, weekend en schrikkeljaar.
- De optelsom in “Bekijk de berekening” sluit exact aan op het hoofdgetal.

## Release B — Dagelijkse beslissingen

### WP-R05 — Vandaag als primaire ervaring

Status: afgerond, naar productie gedeployed en gevalideerd op 21 september 2026. Het primaire bedrag noemt datum én inkomstenbron, de geldlijn en zekerheid staan in de eerste mobiele viewport, er is maximaal één hoofdactie en alle onderdelen linken naar hun bron.

Doel: binnen vijf seconden antwoord geven zonder dashboarddrukte.

Werk:

- Eén hoofdantwoord: veilig te besteden tot datum en inkomstenbron.
- Een compacte geldlijn met betalingen, dagelijkse uitgaven en inkomen.
- Maximaal drie signalen, gerangschikt op financiële impact en handelbaarheid.
- Progressieve uitleg: hoofdantwoord eerst, details op verzoek.
- Directe routes naar rekening, betaling, budget of inkomstenbron.

Acceptatie:

- De eerste mobiele viewport bevat bedrag, horizon, zekerheid en belangrijkste actie.
- Er verschijnen nooit meerdere concurrerende primaire waarschuwingen.
- Het scherm werkt ook zonder ingestelde budgetten of voldoende historie.

### WP-R06 — Vooruit: 30/60/90 dagen

Status: afgerond, naar productie gedeployed en gevalideerd op 21 september 2026. De centrale Vooruit-tijdlijn combineert inkomsten, vaste lasten, reserveringen en eenmalige momenten, met 30/60/90 dagen, weekgroepen, laagste ruimte, rekening, zekerheid, wijzigen, bevestigen en een occurrence overslaan.

Doel: alle verwachte geldmomenten in één leesbare toekomstlijn tonen.

Werk:

- Combineer vaste lasten, inkomsten, reserveringen en incidentele geplande betalingen.
- Bied 30, 60 en 90 dagen als vaste horizonnen.
- Groepeer per week en toon laagste verwachte ruimte.
- Ondersteun wijzigen, bevestigen, overslaan en eenmalig maken.
- Toon rekening en zekerheid per moment.

Acceptatie:

- Een wijziging wordt onmiddellijk zichtbaar op Vandaag en in scenario’s.
- Vierwekelijkse betalingen blijven exact 28 dagen verschuiven.
- Geschatte en zelf ingevulde datums zijn visueel én tekstueel te onderscheiden.

### WP-R07 — Scenario’s zonder financiële spreadsheet

Status: afgerond, naar productie gedeployed en gevalideerd op 22 september 2026. Vier tijdelijke scenariotypen vergelijken het huidige pad met de gekozen wijziging op veilig te besteden, laagste saldo en maandultimo. De berekening wijzigt geen financiële data en is reproduceerbaar via Scenario-CSV.

Doel: de gevolgen van een beslissing bekijken zonder echte data te wijzigen.

Werk:

- Scenario’s voor eenmalige uitgave, maandelijkse last, extra reservering en inkomenswijziging.
- Vergelijk huidig pad en scenario op veilig te besteden, laagste saldo en maandultimo.
- Maak scenario’s tijdelijk; opslaan is een bewuste aparte actie.
- Bied een korte tekstuele conclusie naast de grafiek.

Acceptatie:

- Een scenario veroorzaakt geen transacties, budgetmutaties of auditgebeurtenissen zolang het niet wordt opgeslagen.
- Resultaten zijn reproduceerbaar en exporteerbaar naar CSV.

## Release C — Uitgaven en vermogen

### WP-R08 — Uitgavenwerkruimte

Status: afgerond, naar productie gedeployed en gevalideerd op 21 september 2026. Transacties en review-inbox vormen één werkruimte; serverfilters, opgeslagen filters, sortering, patroon/zekerheid, bronbestand, batchvoorvertoning en selectiegetrouwe CSV-export zijn geïmplementeerd.

Doel: zoeken, controleren en corrigeren als één taak laten voelen.

Bestaande basis: serverfilters, TanStack Table, mobiele kaarten, batchcorrectie en aparte tegenrekeningkolom.

Werk:

- Verenig Transacties en Review inbox als twee standen van dezelfde werkruimte.
- Bewaar filters, kolomkeuze en sortering per gebruiker.
- Voeg terugkerend patroon, afwijking en zekerheid als filterbare velden toe.
- Maak tegenpartij, IBAN, rekening en bronbestand direct inspecteerbaar.
- Houd mobiel taakgericht; geen verkleinde brede tabel.

Acceptatie:

- De volledige tabel past op MacBook en groot scherm zonder verborgen kernkolommen.
- Geselecteerde filters en sortering kunnen één-op-één naar CSV.
- Een batchcorrectie toont vooraf het exacte aantal geraakte transacties.

### WP-R09 — Vermogen en rekeningbankboeken

Status: afgerond, naar productie gedeployed en gevalideerd op 22 september 2026. De centrale Vermogen-pagina, vier rekeningsoorten, nettovermogensreconciliatie, rekeningkwaliteit, uniforme ECharts-ontwikkeling, directe rekeningroutes en Vermogen-CSV zijn geïmplementeerd.

Doel: betaalrekeningen, sparen, beleggen en eventuele schulden als één vermogen tonen, zonder hun betekenis te vermengen.

Bestaande basis: rekeningdetail met bankstand, ECharts-trend, saldocontrole en transacties.

Werk:

- Introduceer een centrale Vermogen-pagina met direct beschikbaar, gereserveerd en langetermijn.
- Maak iedere rekening vanuit bedragen en grafieken direct bereikbaar.
- Toon rekeningkwaliteit: peildatum, importstatus, saldoverschil en ontbrekende periode.
- Voeg aparte ontwikkeling toe voor betaalgeld, spaargeld, beleggingen en schuld.
- Houd interne overboekingen buiten inkomsten en uitgaven, maar zichtbaar in rekeningbankboeken.

Acceptatie:

- Totaal vermogen is exact te herleiden tot rekeningstanden.
- Interne overboekingen veranderen het totaalvermogen niet.
- Grafieken hebben dezelfde ECharts-interactie, ARIA-beschrijving en mobiele samenvatting.

### WP-R10 — Inzicht met besliswaarde

Status: afgerond, naar productie gedeployed en gevalideerd op 22 september 2026. Inzicht beantwoordt vier concrete geldvragen met een conclusie, vervolgstap en bronlink. Decoratieve herhaling is verwijderd en spaar- en beleggingsbewegingen worden niet langer als gewone uitgaven getoond.

Doel: alleen analyses tonen die een vraag beantwoorden.

Werk:

- Ontwikkeling van veilig te besteden en laagste maandruimte.
- Werkelijk versus gebruikelijk uitgavenpatroon.
- Structurele versus incidentele inkomsten en uitgaven.
- Maand-, kwartaal- en jaarvergelijking met dezelfde definities.
- Verwijder visualisaties die alleen decoreren of dezelfde informatie herhalen.

Acceptatie:

- Iedere grafiek heeft een expliciete vraag, conclusie en doorklik naar brontransacties.
- De tekstuele samenvatting blijft zonder grafiek volledig begrijpelijk.

## Release D — Data-eigenaarschap en productiehardheid

### WP-R11 — CSV-export als productcontract

Status: afgerond, naar productie gedeployed en gevalideerd op 22 september 2026. CSV-productcontract 1.0, selectiegetrouwe transacties, Vandaag-reconciliatie, Vooruit-planning, Vermogen en Scenario zijn productie-live en met regressietests aan hun schermmodel gekoppeld.

Doel: ieder relevant resultaat blijft buiten de app controleerbaar en bruikbaar.

Bestaande basis:

- volledige transactie-export;
- maand-, kwartaal- en jaarrapport in Excel-veilige CSV;
- JSON-back-up voor volledige restore.

Toevoegen:

1. **Gefilterde transacties CSV** — exact de actieve filters, periode, rekening, categorie, type en sortering.
2. **Vandaag-berekening CSV** — peildatum, horizon, bankstand, harde verplichtingen, verwachte uitgaven, reserveringen, inkomsten en eindbedrag.
3. **Vooruit CSV** — ieder verwacht moment met datum, bron, bedrag, frequentie, status en zekerheid.
4. **Scenario CSV** — basis, scenario, verschil en alle gebruikte aannames.
5. **Vermogen CSV** — rekeningstanden, peildata, typen en totalen.

CSV-contract:

- UTF-8 en veilig te openen in Nederlandse Excel.
- Datums als `YYYY-MM-DD`; bedragen blijven numeriek en niet als opgemaakte tekst.
- Geen formule-injectie vanuit geïmporteerde omschrijvingen.
- Metadata bevat exporttijd, rapporttype, filters, rekencontractversie en gebruikte peildatum.
- Velden `estimated`, `confidence` en `source` maken schattingen controleerbaar.
- Totalen verschillen maximaal €0,01 van het zichtbare scherm.
- Kolommen worden alleen via een gedocumenteerde exportversie gewijzigd.

Acceptatie:

- Voor ieder scherm met een berekend resultaat bestaat een knop `Exporteer CSV` in dezelfde context.
- Geautomatiseerde tests vergelijken schermmodel, rapportmodel en CSV-totalen.
- Bestaande rapport- en transactie-exports blijven werken.

### WP-R12 — Privacy, back-up en herstel

Status: afgerond, naar productie gedeployed en gevalideerd op 22 september 2026. Volledige back-ups hebben tabel- en totaalchecksums, herstel vereist een eenmalige geslaagde dry-run van exact hetzelfde bestand en beheer toont de laatste back-up- en herstelcontrole. Een echte back-up van 8.858 rijen is succesvol in een geïsoleerde rehearsaldatabase hersteld; auditregels zijn naar gewone taal vertaald en sleutelbeheer en offline-cachekeuze zijn gedocumenteerd.

Doel: financieel vertrouwen technisch afdwingen.

Werk:

- Versleutel gevoelige configuratie en documenteer sleutelbeheer.
- Maak automatische back-upcontrole en periodieke restore-rehearsal zichtbaar.
- Voeg exportmanifest, schema-compatibiliteit en checksumcontrole toe.
- Toon auditgebeurtenissen in gewone taal.
- Onderzoek een offline, alleen-lezen cache voor de laatste veilige stand.

Acceptatie:

- Een actuele productieback-up kan in een geïsoleerde testomgeving worden hersteld.
- Restore overschrijft nooit stilzwijgend data en vereist een geslaagde dry-run.
- De CSV-rapportexport blijft gescheiden van de volledige restoreback-up.

### WP-R13 — Migratie, naam en gecontroleerde uitrol

Status: afgerond, naar productie gedeployed en gevalideerd op 22 september 2026. De productnaam blijft bewust Huishouden en Ruimte benoemt de ervaring. Privacyarme productstatus, compatibele oude routes, release-identificatie, vijf broncode-snapshots en een expliciet beveiligde rollbackopdracht zijn toegevoegd zonder parallel financieel datamodel. Rollbackpunt `20260922T165702Z` is op de productieserver gecontroleerd.

Doel: de nieuwe productvorm invoeren zonder werkende functies te verliezen.

Werk:

- Lever per release achter een kleine, omkeerbare productgrens op.
- Meet fouten, ontbrekende brondata en gebruik van correctie-acties.
- Gebruik tijdelijke redirects en behoud bestaande deep links.
- Beslis pas na Release B definitief over de naam `Ruimte`.
- Verwijder oude schermen pas nadat functies, exports en routes aantoonbaar zijn overgenomen.

Acceptatie:

- Geen big-bangmigratie en geen tweede parallel datamodel.
- Iedere release heeft een rollbackpad zonder dataverlies.
- Installatie-, beheer- en gebruikersdocumentatie beschrijven de actuele situatie.

## Aanbevolen volgorde

| Volgorde | Werkpakket | Afhankelijk van | Indicatie |
| --- | --- | --- | --- |
| 1 | R01 Begrippen en rekencontract | — | klein |
| 2 | R02 Uitlegbaarheidslaag | R01 | middel |
| 3 | R03 Inkomstenstromen 2.0 | R01 | middel |
| 4 | R04 Veilig-te-besteden 2.0 | R01, R03 | middel |
| 5 | R05 Vandaag | R02, R04 | middel |
| 6 | R06 Vooruit | R02, R03 | groot |
| 7 | R11 CSV-productcontract, basis | R01 | middel |
| 8 | R08 Uitgavenwerkruimte | R01 | groot |
| 9 | R09 Vermogen | R01 | groot |
| 10 | R07 Scenario’s | R04, R06 | groot |
| 11 | R10 Inzicht | R04, R09 | groot |
| 12 | R12 Privacy en herstel | doorlopend | middel |
| 13 | R13 Naam en uitrol | Release B gereed | klein |

R11 begint vroeg met het exportcontract en loopt daarna mee met ieder resultaatgericht werkpakket. Zo ontstaat CSV niet pas aan het einde als los aangeplakte functie.

## Afgeronde eerste tranche

De eerste tranche is zonder structurele databasevervanging opgeleverd:

1. R01: rekencontract en centrale financiële begrippen.
2. R02: herbruikbare uitleg/status voor schattingen.
3. R03: beheer en bevestiging van meerdere inkomstenstromen.
4. R04: tests en randgevallen voor veilig te besteden.
5. R11a: CSV van de Vandaag-berekening met centenreconciliatie.

Deze tranche maakt de bestaande Vandaag-pagina aantoonbaar betrouwbaar voordat Vooruit, Scenario’s en Vermogen verder worden uitgebouwd.
