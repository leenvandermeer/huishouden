# Zoek-UX plan

Status: v2 gereed en productie-live. Server-side filters, URL-paginering, gefilterde totalen, rustige debounce en gebruikersgebonden bewaarde filters zijn aanwezig.

## Doel

Zoekschermen moeten bij grotere datasets schaalbaar blijven. Voor transacties betekent dit dat filters, tellingen en totalen uit PostgreSQL komen en dat de URL de actuele filterstand bewaart.

## Ontwerpregels

- Server haalt alleen de gevraagde transactieregels op uit PostgreSQL.
- De browser bewaart filters in URL-parameters en toont serverresultaten.
- Filters resetten de pagina naar pagina 1.
- De tabel toont vaste kolommen en verspringt niet tijdens zoeken.
- Samenvattingscijfers boven de tabel komen uit dezelfde server-side filterquery.
- Correcties blijven direct in dezelfde rij beschikbaar.

## Eerste scope

Het transactiescherm ondersteunt server-side filters op:

- vrije zoektekst;
- maand;
- rekening;
- categorie;
- transactietype;
- minimaal en maximaal absoluut bedrag.

De tabel toont 50 transacties per pagina. Dit houdt de UI rustig en voorkomt dat alle transacties naar de browser worden geladen.

De zoektekst wordt pas na een rustige debounce toegepast, zodat iemand een woord kan aftypen zonder dat de pagina bij elke letter opnieuw zoekt. Periode-, rekening-, categorie- en typefilters worden direct op de URL toegepast en resetten de pagina naar pagina 1. Bedragfilters blijven bewust op de zoekknop zitten, zodat half ingevoerde bedragen niet tussentijds naar de server gaan.

## Bewaarde filters

Een gebruiker kan de actuele filterset benoemen, later opnieuw toepassen en verwijderen. De opgeslagen selectie blijft gebruikersgebonden; de daadwerkelijke zoekopdracht en totalen blijven server-side uit PostgreSQL komen.
