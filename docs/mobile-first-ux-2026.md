# Mobile-first UX 2026

Datum: 18 september 2026  
Status: geïmplementeerd en geëvalueerd

## Onderzoeksvraag

Welk UX-model past het best bij een privé-huishoudboekje dat dagelijks op een telefoon wordt gebruikt en later als app kan worden uitgebracht?

## Marktbeeld

De relevante producten vallen grofweg in drie modellen:

| Product | Sterk patroon | Risico om niet over te nemen |
| --- | --- | --- |
| YNAB | Taken en transacties staan centraal; uitgavenanalyse is doorklikbaar vanuit categorieën. | Een methodegedreven budgetmodel vraagt te veel uitleg voor deze app. |
| Monarch Money | Aanpasbaar overzicht met vermogen, recente transacties, budgetvoortgang en aankomende lasten. | Te veel widgets op het startscherm maakt mobiel weer een dashboardmuur. |
| Wallet by BudgetBakers | Planning, budgetten, rapportages en rekeningoverzicht zijn duidelijk gescheiden. | De grote functiebreadte kan de primaire navigatie overbelasten. |
| MijnGeldzaken | Automatische categorisatie, saldoverloop en budget zijn herkenbaar voor de Nederlandse markt. | Een volledige beheernavigatie hoort niet in de dagelijkse mobiele hoofdnavigatie. |

Bronnen:

- YNAB Spending Breakdown: https://support.ynab.com/en_us/spending-breakdown-H1H7YxmD0
- Monarch dashboard en transactiereview: https://www.monarchmoney.com/customizable-dashboard-manual-transactions en https://www.monarchmoney.com/new-mobile-navigation
- Wallet productmodel en budgetten: https://support.budgetbakers.com/hc/en-us/articles/12212428113810-What-is-the-Wallet-app en https://support.budgetbakers.com/hc/en-us/articles/7076953735314-Setup-Budgets
- MijnGeldzaken functies: https://www.mijngeldzaken.nl/abonnementen
- Apple tab bars: https://developer.apple.com/design/human-interface-guidelines/tab-bars
- Android navigatiepatronen: https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns

## Gekozen model

De app gebruikt een taakgestuurde hybride van de bewezen patronen:

1. Vier stabiele primaire tabs: Vandaag, Transacties, Budgetten en Inzicht.
2. Eén vaste ingang `Meer` voor sparen, rapportages, import en beheer.
3. Het startscherm beantwoordt eerst de geldvraag: wat bleef deze maand over na uitgaven, sparen en beleggen?
4. Reviewwerk staat vóór analyse. Open categorieën en nieuwe imports zijn direct bereikbaar.
5. Detailinformatie gebruikt progressive disclosure: zoeken blijft direct zichtbaar; uitgebreide filters worden op mobiel geopend wanneer nodig.
6. Navigatie bevat labels én iconen en blijft zichtbaar op hoofdroutes, in lijn met platformrichtlijnen.
7. Interactieve doelen zijn op mobiel minimaal 44px hoog; formulieren gebruiken 16px tekst om ongewenst inzoomen op iOS te voorkomen.

## Eerste evaluatie

### Gevonden problemen

- De oude mobiele navigatie gebruikte vijf inhoudelijke bestemmingen én een hamburgermenu. Daardoor concurreerden twee navigatiemodellen.
- `Importeren` nam een primaire tab in, terwijl dit geen dagelijkse top-taak is.
- De eerste viewport van dashboard en transacties werd gedomineerd door grote uitleg en dashboardsamenvattingen.
- Transactiefilters stonden allemaal tegelijk open en duwden de werklijst ver naar beneden.
- Veel knoppen en pagers waren 28–32px hoog, ondanks de eerder gedocumenteerde 44px-doelstelling.
- `maximumScale: 1` blokkeerde toegankelijk inzoomen.
- De visuele laag gebruikte veel transparantie, verlopen en zeer kleine typografie, waardoor hiërarchie en rust verloren gingen.

### Toegepaste verbeteringen

- Bottom navigation teruggebracht tot vier dagelijkse bestemmingen plus `Meer`.
- Zijpaneel op mobiel vervangen door een bereikbare bottom sheet.
- Dashboard opnieuw opgebouwd rond één primair maandbedrag, taakrijen en scanbare maandstromen.
- Kernsaldi op mobiel als horizontale snap-rail geplaatst; dit houdt de eerste viewport compact zonder informatie te verbergen.
- Uitgebreide transactiefilters inklapbaar gemaakt en actieve filters geteld.
- Controls, periodepagers en acties voorzien van mobiele touch targets.
- Zoomblokkade verwijderd en `viewport-fit=cover` toegevoegd voor safe areas.
- Design foundation vereenvoudigd naar warme neutrale oppervlakken, donkergroen merkcontrast en spaarzame statuskleuren.

## Tweede evaluatie

Na de eerste implementatie is opnieuw getoetst op taakvolgorde, bereikbaarheid en informatiedichtheid.

- De primaire navigatie blijft nu stabiel op dashboard-, transactie-, budget- en inzichtsroutes.
- Secundaire onderdelen zijn maximaal één tap plus één keuze verwijderd.
- Zoeken en bedragen blijven zichtbaar wanneer geavanceerde filters gesloten zijn.
- Alle kernacties zijn zonder hover begrijpelijk en hebben tekstlabels.
- De startpagina bevat geen dubbele routes boven de vouw; import en verdiepende analyse zijn secundair geplaatst.
- Financiële kleuren dragen niet als enige betekenis: labels en statuswoorden blijven aanwezig.

## App-store gereedheid

Deze release maakt de webapp app-achtig en PWA-geschikt, maar een App Store-release vraagt later nog om een native container of native client, App Store privacy-informatie, screenshots per apparaatklasse, een volledig PNG-iconenpakket en een review van biometrische vergrendeling en sessiegedrag. Die distributiestap is bewust niet vermengd met deze UX-herbouw.
