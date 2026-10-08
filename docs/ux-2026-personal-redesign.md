# Persoonlijke UX-richting 2026–2030

## Doel

Huishouden voelt als een persoonlijke financiële werkruimte en niet als een generiek SaaS-dashboard. De interface geeft eerst antwoord op een menselijke vraag en toont daarna pas detail.

## Ontwerpprincipes

1. **Eén verhaal per scherm.** Vandaag begint met besteedbare ruimte; rapporten beginnen met de ontwikkeling die ertoe doet.
2. **Content is de interface.** Minder losse kaarten, badges, schaduwen en decoratieve iconen; meer ritme, witruimte en typografische hiërarchie.
3. **Persoonlijk, niet speels.** Financiële uitleg gebruikt gewone Nederlandse taal en sluit aan op de gegevens van het huishouden, zonder geforceerde begroeting.
4. **Warm en rustig.** Een warm-neutrale canvasbasis, donkergroen voor vertrouwen en terracotta alleen voor gerichte nadruk.
5. **Data blijft navigeerbaar.** Tabellen gebruiken semantische HTML met TanStack Table als headless datalaag. Mobiel blijft een taakgerichte kaartweergave beschikbaar.
6. **Grafieken leggen uit.** ECharts gebruikt een beperkt kleurpalet, rustige rasters, directe tooltips, ARIA-beschrijvingen en patronen naast kleur.
7. **Toegankelijkheid is onderdeel van de stijl.** Minimaal 44px aanraakdoelen, zichtbare focus, minder beweging bij `prefers-reduced-motion`, tekstalternatieven en kleur-onafhankelijke signalen.

## Geldplanning op Vandaag

Een maandbudget is een bestedingsgrens en geen reeds vastgezette betaling. Daarom toont Vandaag **Verwachte uitgaven tot inkomen**: per variabel budget wordt het maandtempo vermenigvuldigd met het aantal dagen tot het volgende inkomen, begrensd door wat er nog in dat budget over is. Zo wordt aan het einde van de maand niet meer het volledige onbestede maandbudget van de beschikbare ruimte afgetrokken.

Terugkerende inkomsten worden per bron herkend. Salaris en ondernemingsinkomen blijven afzonderlijke bronnen; meerdere betalingen van dezelfde bron binnen één maand worden voor de schatting bij elkaar opgeteld.

## Rekeningdetail

Rekeningen staan rechtstreeks in de hoofdnavigatie en zijn vanaf de rekeningkaarten en de berekening op Vandaag te openen. De detailpagina combineert bankstand, actuele maandbeweging, saldocontrole, ECharts-trend en recente transacties in één responsieve werkruimte.

## Onderbouwing

- [NN/g over begrijpelijke dashboards](https://www.nngroup.com/articles/dashboards-preattentive/): dashboards moeten snel informatie overbrengen zonder onnodige cognitieve belasting.
- [NN/g over cognitieve belasting](https://www.nngroup.com/articles/minimize-cognitive-load/): visuele variatie moet betekenis dragen en geen extra denkwerk veroorzaken.
- [TanStack Table](https://tanstack.com/table/latest/docs/framework/react): een headless tabelmodel houdt semantiek en productvormgeving in eigen hand.
- [Apache ECharts accessibility](https://echarts.apache.org/handbook/en/best-practices/aria/): ARIA-beschrijvingen en patronen maken grafieken ook buiten kleur herkenbaar.

## Validatie

De UX wordt bewust in drie vaste profielen gecontroleerd:

1. **Mobiel eerst — 390 × 844.** Taakgerichte transactiekaarten, aanraakdoelen en geen horizontale overflow.
2. **MacBook — 1512 × 982.** De volledige transactietabel, inclusief tegenrekening en correctievelden, past zonder horizontaal scrollen.
3. **Groot extern scherm — 2048 × 1080.** Alle tabelkolommen en de volledige werkruimte blijven tegelijk zichtbaar; extra breedte wordt functioneel benut.

`npm run ux:smoke` logt in, controleert deze profielen, de toegankelijke grafieken en browserconsole, en maakt screenshots in `/tmp`.
