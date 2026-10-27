# Financieel rekencontract 1.1.0

Status: normatief voor Vandaag, rapportages en nieuwe resultaat-exports. Tijdzone: `Europe/Amsterdam`.

Dit document beschrijft wat de financiële begrippen betekenen en hoe bedragen reproduceerbaar worden berekend. De uitvoerbare constanten en formule staan in `src/modules/finance/financial-contract.ts`.

## Peildatum en horizon

- **Peildatum**: de Amsterdamse kalenderdatum waarop de prognose wordt gemaakt.
- **Horizon**: de datum van het eerstvolgende herkende of geplande structurele inkomen.
- Als geen volgend structureel inkomen bekend is, wordt de laatste kalenderdag van de maand gebruikt.
- Betalingen op of vóór de horizon staan in de tijdlijn. Voor tijdsevenredige dagelijkse uitgaven telt de inkomensdag zelf niet mee: het bedrag is bedoeld om die dag te bereiken.
- Een inkomstenbron met een datum vóór de peildatum mag nooit als horizon worden gebruikt.

## Primaire begrippen

| Begrip | Definitie |
| --- | --- |
| Op betaalrekeningen | Actuele bankstand van alle actieve betaalrekeningen op de peildatum. |
| Vaste lasten vóór inkomen | Verwachte vaste afschrijvingen vanaf de peildatum tot vóór de gekozen horizon. |
| Verwachte uitgaven vóór inkomen | Tijdsevenredig deel van de variabele maandbudgetten dat naar verwachting vóór de horizon wordt uitgegeven. |
| Bewuste reserveringen | Geld dat expliciet apart is gezet en daarom niet vrij beschikbaar is. |
| Onzekerheidsbuffer | Voorzichtige marge voor geschatte datums of een inkomensbron met beperkte historische zekerheid. |
| Veilig te besteden | Bankstand min vaste lasten, verwachte uitgaven, bewuste reserveringen en onzekerheidsbuffer tot de horizon. |
| Binnengekomen | Feitelijke positieve kasstroom in een gekozen historische periode, exclusief interne overboekingen en opname uit sparen/beleggen. |
| Structurele inkomstenbron | Herhaald of handmatig gepland inkomen dat voor een toekomstige horizon mag worden gebruikt. |

`Binnengekomen` en `structurele inkomstenbron` zijn bewust verschillend: een incidenteel betaalverzoek telt historisch als binnengekomen geld, maar mag niet automatisch de prognosehorizon bepalen.

## Hoofdformule

```text
veilig te besteden
= stand op betaalrekeningen
− vaste lasten vóór horizon
− verwachte uitgaven vóór horizon
− bewuste reserveringen
− onzekerheidsbuffer
```

Alle invoercomponenten worden eerst op eurocenten afgerond. Aftrekposten kunnen niet negatief zijn. De uitkomst mag wel negatief zijn: dat is een echt tekort en wordt niet op nul verborgen.

In versie 1.1.0 ondersteunt de formule bewuste reserveringen, maar Vandaag geeft hiervoor nog `€ 0,00` door. Sparen en beleggen worden niet stilzwijgend als dagelijkse uitgaven behandeld. Expliciete reserveringsplanning is een uitbreidingswens.

## Zekerheid en onzekerheidsbuffer

Elke prognosebron gebruikt een van deze zichtbare statussen:

| Status | Betekenis |
| --- | --- |
| Zelf ingevuld | Bedrag of datum wordt door de gebruiker beheerd. |
| Sterke schatting | Minimaal vijf bruikbare perioden ondersteunen een voldoende stabiel patroon. |
| Voorlopige schatting | Twee tot vier bruikbare perioden ondersteunen het patroon. |
| Afwijking | De laatste waarneming wijkt bij voldoende historie minstens 40% van de mediaan af. |

De onzekerheidsbuffer is reproduceerbaar:

- 10% van een geschatte vaste last met lage zekerheid;
- 5% van een geschatte vaste last met gemiddelde zekerheid;
- nul voor hoge zekerheid of een zelf ingevulde datum;
- daarnaast twee dagen verwachte budgetuitgaven bij lage inkomenszekerheid of status `Afwijking`, één dag bij gemiddelde zekerheid en nul bij hoge zekerheid;
- inkomenszekerheid wordt laag zodra het verschil tussen minimum en maximum minstens 40% van de mediaan is, of de laatste waarneming bij voldoende historie minstens 40% afwijkt. Meer waarnemingen nemen deze bedragsonzekerheid niet weg;
- dit is een reproduceerbare voorzichtigheidsmarge, geen gekalibreerde voorspelling van betaalvertraging. Een handmatig beheerde bron blijft zelf ingevuld.

De buffer is een aftrekpost in de berekening en wordt apart getoond. Zij wordt dus niet verborgen in een ander bedrag.

## Verwachte uitgaven uit maandbudgetten

Per actieve budgetcategorie:

```text
budgettempo per dag = max(gepland, 0) / dagen in huidige maand
historisch tempo per dag = mediaan(werkelijke uitgaven per dag per historische maand)
verwacht voor periode = max(budgettempo, historisch tempo) × dagen tot horizon
```

- Het historische tempo wordt alleen gebruikt met ten minste drie waargenomen afgeronde kalendermaanden, uit maximaal de zes vorige maanden. Maandbedragen worden eerst door het aantal dagen van hun eigen maand gedeeld.
- De eerste waargenomen maand van elke actieve rekening wordt als mogelijk onvolledig behandeld. Alleen maanden na de meest recente van die eerste maanden zijn bruikbaar. Dit is een conservatieve datadekkingsregel, geen bewijs van volledige imports.
- Maanden zonder uitgaven binnen deze periode tellen als nul. Interne overboekingen en gekoppelde interne transacties tellen niet mee.
- De periode stopt uiterlijk op de eerste dag van de volgende maand; een budget van deze maand wordt niet als budget voor de volgende maand gebruikt.
- Alleen actieve categorieën met een maandbudget en type `variabele_uitgave` of `reservering` doen mee.
- Een opgebruikt of overschreden budget stopt de verwachte uitgaven niet. Een lager resterend budget verlaagt de prognose dus niet automatisch.
- Het scherm vermeldt hoeveel van de verwachting voortkomt uit een hoger historisch tempo. Die verhoging is onderdeel van de verwachte uitgaven en wordt niet nogmaals afgetrokken. De CSV bevat dezelfde verhoging als metadata.
- Dit is een verwachting, geen reeds gemaakte uitgave of expliciete reservering. Zonder betrouwbare historie gebruikt de berekening het budgettempo.

## Categoriecontract

| Geldstroom | Categorieën | Historisch resultaat | Toekomstige horizon |
| --- | --- | --- | --- |
| Salaris | `salaris` | Inkomen | Ja |
| Onderneming | `inkomsten-onderneming` | Inkomen | Ja |
| Uitkering/toeslag | `uitkering-toeslagen` | Inkomen | Ja |
| Overig of incidenteel inkomen | onder andere `overig-inkomen` | Inkomen | Nee, tenzij handmatig gepland |
| Sparen/opname | `sparen`, `potje-opname`, `ontsparen` | Aparte spaarstroom | Nee |
| Beleggen | `beleggen` | Aparte vermogensstroom | Nee |
| Interne overboeking | soort `interne_overboeking` | Geen inkomen of uitgave op huishoudniveau | Nee |

Bij maandelijkse, kwartaal- en jaarbronnen worden betalingen van dezelfde bron binnen één kalendermaand opgeteld. Bij een herkend vierwekelijks ritme worden bedragen per betaaldag opgeteld, zodat twee betalingen in dezelfde maand niet samen één termijn worden. De bedragsschatting is de mediaan van maximaal zes recente betalingsperioden. Toekomstige waarnemingen tellen niet mee op een eerdere peildatum. Bronnen blijven onderling gescheiden. Daardoor worden salaris en ondernemingsinkomen niet tot één gemiddeld salaris vermengd.

## Voorbeelden

Alle namen, datums en bedragen hieronder zijn fictieve rekenvoorbeelden.

### 1. Bijna aan het einde van de maand

Gegevens op 21 september 2026:

```text
Maandbudgetten gepland                 € 1.500,00
Deze maand werkelijk uitgegeven         € 900,00
Onbesteed volgens oude benadering        € 600,00
Dagen tot volgend inkomen                       3
Dagen in september                             30
Verwacht vóór inkomen: 1.500 × 3 / 30    € 150,00
```

De prognose trekt dus €150,00 af en niet het volledige onbestede bedrag van €600,00.

### 2. Reconciliatie van Vandaag

```text
Op betaalrekeningen                     € 800,00
Vaste lasten vóór inkomen             − € 100,00
Verwachte uitgaven vóór inkomen       − € 150,00
Bewuste reserveringen                   − € 0,00
Onzekerheidsbuffer                      − € 0,00
Veilig te besteden                       € 550,00
```

De zichtbare onderdelen en de CSV-uitvoer moeten exact op €550,00 uitkomen.

### 3. Meerdere inkomstenbronnen

- Werkgever Voorbeeld wordt op 24 september verwacht.
- Onderneming Voorbeeld wordt rond 30 september verwacht.
- Op 21 september is 24 september de horizon.
- Na verwerking van het salaris kan Onderneming Voorbeeld automatisch de eerstvolgende bron worden.
- Losse incidentele bijschrijvingen, zoals een betaalverzoek, mogen deze volgorde niet overnemen.

### 4. Vierwekelijks patroon

Drie betalingen van €1.000 op 2 januari, 30 januari en 27 februari geven een termijnbedrag van €1.000, niet een mediaan maandbedrag van €1.500. Een bevestigde vierwekelijkse betaling schuift steeds exact 28 dagen op, ook in een weekend. Zij wordt niet behandeld als een kalendermaand en wordt op jaarbasis als dertien termijnen gerekend.

### 5. Geen bekende inkomensdatum

Op 20 februari 2024 zonder herkenbaar volgend inkomen is de horizon 29 februari 2024. De interface markeert de planning als onvolledig; zij verzint geen salarisdatum.

### 6. Budget opgebruikt en hoger historisch tempo

Op 21 september: budget €300, al uitgegeven €450, nog drie dagen tot inkomen. Zonder voldoende historie wordt nog €30 verwacht: €300 / 30 × 3. Dit was in 1.0.0 nul. Bij historische dagtempo's €20, €22 en €200 gebruikt de schatting de mediaan €22 en verwacht zij €66. De historische verhoging is €36 en staat apart toegelicht, binnen de totale aftrek van €66.

## Betaaldatums en saldoraming

- Maand-, kwartaal- en jaarbetalingen worden steeds vanaf hun oorspronkelijke brondatum geprojecteerd. Een korte maand verlaagt de oorspronkelijke betaaldag niet blijvend.
- Bij vaste lasten worden historische dagen eerst naar dezelfde verwachte cyclus geprojecteerd en daarna gemiddeld. Pas de gezamenlijke datum wordt naar een volgende cyclus doorgeschoven als die vóór de peildatum ligt. Een peildatum midden in een betaalvenster mengt zo geen twee maanden.
- Een weekendcorrectie bij kalenderbetalingen gebruikt de historische voorkeur voor werkdagen. De bankspecifieke eerste-werkdagregel corrigeert alleen weekenden, geen feestdagen. Vierwekelijkse betalingen blijven exact 28 dagen volgen.
- De afzonderlijke saldoraming gebruikt actieve rekeningen en ten minste drie afgeronde kalendermaanden. Mogelijk onvolledige startmaanden worden uitgesloten. De actuele maand wordt niet als trainingsmaand gebruikt.
- De saldoraming vergelijkt gemiddelde en mediaan op opeenvolgende historische maandstappen, met telkens uitsluitend eerdere maanden als training. De mediaan wordt pas gekozen bij minstens zes toetsstappen en een minstens 10% lagere gemiddelde absolute fout. Dit is een selectieregel, geen bewijs van betere toekomstige nauwkeurigheid.
- Prognosepunten zijn ramingen voor het einde van de komende zes kalendermaanden. Het restant van de huidige maand telt mee naar rato van de dagen ná de peildatum. Deze tijdsverdeling kan afwijken van echte betaalmomenten; daarvoor dient Vooruit.
- De spreiding is historische steekproefstandaardafwijking maal de wortel van de tijdshorizon in maanden. Zij heeft geen kanspercentage. Historische foutmaten toetsen één maandstap, niet de nauwkeurigheid over zes maanden.
- Ontbrekende, verschillende, toekomstige of meer dan zeven dagen oude saldodatums en ontbrekende transactiehistorie leiden tot zichtbare meldingen. Historische saldi zijn reconstructies uit de huidige stand, geen bewezen historische bankafschriften.

## Verschil met versie 1.0.0

1. Vierwekelijks inkomen wordt per betalingsdag geschat in plaats van per kalendermaand.
2. Onstabiele of afwijkende inkomsten krijgen een voorzichtiger zekerheid en buffer.
3. Verwachte variabele uitgaven worden niet meer begrensd op onbesteed budget; een hoger historisch dagtempo kan de verwachting verhogen.
4. Kalenderprojecties, historische toetsing, maandafsluitingsramingen en datakwaliteitsmeldingen zijn expliciet beschreven.

De hoofdformule voor veilig te besteden blijft gelijk. De betekenis van de invoercomponenten en dus mogelijke uitkomsten veranderen; daarom vermelden scherm en exports versie 1.1.0. Historische exports met 1.0.0 blijven de toenmalige definities volgen.

## Afronding en reconciliatie

- Geldbedragen worden rekenkundig afgerond op twee decimalen.
- Dagen worden als Amsterdamse kalenderdagen behandeld; tijdstippen spelen niet mee.
- Op dezelfde kalenderdag worden uitgaven vóór inkomen verwerkt. Zo wordt een tijdelijk tekort niet verborgen.
- Schermmodel en CSV gebruiken dezelfde berekende waarden, niet twee los gebouwde optelsommen.
- Een verschil groter dan €0,01 tussen schermtotaal en export is een releaseblokkerende fout.

## Exportcontract

- Financiële resultaat-CSV’s vermelden `Rekencontract;1.1.0`.
- De volledige JSON-back-up en transactie-CSV vermelden dezelfde contractversie als metadata, los van de back-up-schemaversie.
- De back-up-schemaversie beschrijft herstelcompatibiliteit; de rekencontractversie beschrijft de betekenis van financiële uitkomsten.
- Een betekeniswijziging vereist een nieuwe contractversie en bijgewerkte voorbeelden en tests.

## Wijzigingsregels

Een volgende versie mag alleen worden ingevoerd wanneer:

1. het verschil met de vorige formule is beschreven;
2. regressietests voor oude en nieuwe randgevallen bestaan;
3. zichtbare labels en CSV-metadata tegelijk worden bijgewerkt;
4. productievalidatie de reconciliatie op echte data controleert.
