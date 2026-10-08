# Financieel rekencontract 1.0.0

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

In versie 1.0.0 ondersteunt de formule bewuste reserveringen, maar Vandaag geeft hiervoor nog `€ 0,00` door. Sparen en beleggen worden niet stilzwijgend als dagelijkse uitgaven behandeld. Een expliciete reserveringsplanning volgt in een later werkpakket.

## Zekerheid en onzekerheidsbuffer

Elke prognosebron gebruikt een van deze zichtbare statussen:

| Status | Betekenis |
| --- | --- |
| Zelf ingevuld | Bedrag of datum wordt door de gebruiker beheerd. |
| Sterke schatting | Minimaal vijf bruikbare perioden ondersteunen het patroon. |
| Voorlopige schatting | Twee tot vier bruikbare perioden ondersteunen het patroon. |
| Afwijking | De laatste waarneming wijkt bij voldoende historie minstens 40% van de mediaan af. |

De onzekerheidsbuffer is reproduceerbaar:

- 10% van een geschatte vaste last met lage zekerheid;
- 5% van een geschatte vaste last met gemiddelde zekerheid;
- nul voor hoge zekerheid of een zelf ingevulde datum;
- daarnaast twee dagen verwachte budgetuitgaven bij lage inkomenszekerheid, één dag bij gemiddelde zekerheid en nul bij hoge zekerheid.

De buffer is een aftrekpost in de berekening en wordt apart getoond. Zij wordt dus niet verborgen in een ander bedrag.

## Verwachte uitgaven uit maandbudgetten

Per budgetcategorie:

```text
resterend maandbudget = max(gepland − werkelijk uitgegeven, 0)
verwacht voor periode = gepland × dagen tot horizon / dagen in maand
mee te rekenen bedrag = min(resterend maandbudget, verwacht voor periode)
```

- De periode stopt uiterlijk op de eerste dag van de volgende maand; een budget van deze maand wordt niet als budget voor de volgende maand gebruikt.
- Alleen actieve categorieën van het type `variabele_uitgave` of `reservering` doen mee.
- Een overschreden budget levert geen negatieve aftrek op.
- Dit is een verwachting en geen claim dat het resterende budget al gereserveerd of uitgegeven is.

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

Meerdere betalingen van dezelfde structurele bron binnen één maand worden vóór de inkomensschatting opgeteld. Bronnen blijven onderling gescheiden. Daardoor worden Timon en VDMeer Consultancy niet tot één gemiddeld salaris vermengd.

## Voorbeelden

### 1. Bijna aan het einde van de maand

Gegevens op 21 september 2026:

```text
Maandbudgetten gepland                 € 1.780,00
Deze maand werkelijk uitgegeven         € 946,18
Onbesteed volgens oude benadering        € 833,82
Dagen tot volgend inkomen                       3
Dagen in september                             30
Verwacht vóór inkomen: 1.780 × 3 / 30    € 178,00
```

De prognose trekt dus €178,00 af en niet het volledige onbestede bedrag van €833,82.

### 2. Reconciliatie van Vandaag

```text
Op betaalrekeningen                     € 684,74
Vaste lasten vóór inkomen             − € 110,09
Verwachte uitgaven vóór inkomen       − € 178,00
Bewuste reserveringen                   − € 0,00
Onzekerheidsbuffer                      − € 0,00
Veilig te besteden                       € 396,65
```

De zichtbare onderdelen en de CSV-uitvoer moeten exact op €396,65 uitkomen.

### 3. Meerdere inkomstenbronnen

- Stichting Timon wordt op 24 september verwacht.
- VDMeer Consultancy wordt rond 30 september verwacht.
- Op 21 september is 24 september de horizon.
- Na verwerking van Timon kan VDMeer Consultancy automatisch de eerstvolgende bron worden.
- Losse incidentele bijschrijvingen, zoals een betaalverzoek, mogen deze volgorde niet overnemen.

### 4. Vierwekelijks patroon

Een bevestigde vierwekelijkse betaling schuift steeds exact 28 dagen op. Zij wordt niet behandeld als een kalendermaand en wordt op jaarbasis als dertien termijnen gerekend.

### 5. Geen bekende inkomensdatum

Op 20 februari 2024 zonder herkenbaar volgend inkomen is de horizon 29 februari 2024. De interface markeert de planning als onvolledig; zij verzint geen salarisdatum.

## Afronding en reconciliatie

- Geldbedragen worden rekenkundig afgerond op twee decimalen.
- Dagen worden als Amsterdamse kalenderdagen behandeld; tijdstippen spelen niet mee.
- Op dezelfde kalenderdag worden uitgaven vóór inkomen verwerkt. Zo wordt een tijdelijk tekort niet verborgen.
- Schermmodel en CSV gebruiken dezelfde berekende waarden, niet twee los gebouwde optelsommen.
- Een verschil groter dan €0,01 tussen schermtotaal en export is een releaseblokkerende fout.

## Exportcontract

- Financiële resultaat-CSV’s vermelden `Rekencontract;1.0.0`.
- De volledige JSON-back-up en transactie-CSV vermelden dezelfde contractversie als metadata, los van de back-up-schemaversie.
- De back-up-schemaversie beschrijft herstelcompatibiliteit; de rekencontractversie beschrijft de betekenis van financiële uitkomsten.
- Een betekeniswijziging vereist een nieuwe contractversie en bijgewerkte voorbeelden en tests.

## Wijzigingsregels

Een volgende versie mag alleen worden ingevoerd wanneer:

1. het verschil met de vorige formule is beschreven;
2. regressietests voor oude en nieuwe randgevallen bestaan;
3. zichtbare labels en CSV-metadata tegelijk worden bijgewerkt;
4. productievalidatie de reconciliatie op echte data controleert.
