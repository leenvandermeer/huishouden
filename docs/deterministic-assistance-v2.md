# Deterministische slimme assistentie v2

Bijgewerkt: 19 augustus 2026.

## Doel

De app krijgt slimme hulp zonder externe AI-koppeling. Alle voorstellen komen uit PostgreSQL-data, regels, historie en scores. De gebruiker ziet altijd waarom iets wordt voorgesteld en moet mutaties expliciet bevestigen.

## Principes

- Geen externe AI/API nodig voor v2.
- Geen verzonnen totalen, saldi of budgetten.
- Elk voorstel bevat een reden, score en onderliggende transacties.
- Voorstellen wijzigen niets automatisch; de gebruiker kiest `Accepteren`, `Aanpassen` of `Negeren`.
- Geaccepteerde voorstellen worden gewone categorieen, mappingregels, budgetten of vaste lasten.

## 1. Categoriesuggesties

Voor onbekende of `Overig`-transacties maakt de app categorievoorstellen op basis van:

- exacte tegenpartij-match met bestaande regels;
- tekstmatch op tegenpartij en omschrijving;
- eerdere handmatige keuzes voor dezelfde tegenpartij;
- categorie van vergelijkbare leveranciers;
- bedragteken: positieve bedragen alleen naar inkomsten/correcties, negatieve bedragen naar uitgaven/reserveringen;
- lijst met marktconforme patronen, zoals supermarkt, telecom, verzekeraar, energie en belasting.

Scorevoorbeeld:

- 95: exacte bestaande regel;
- 85: zelfde tegenpartij eerder handmatig gecorrigeerd;
- 70: sterke tekstmatch met bekende marktregel;
- 50: categorie lijkt logisch, maar gebruiker moet controleren.

## 2. Vaste lasten herkennen

Kandidaten worden gevonden uit terugkerende negatieve transacties:

- dezelfde tegenpartij in minimaal 3 maanden;
- bedrag stabiel of herkenbare abonnements-/incasso-omschrijving;
- categorie is vaste last of patroon lijkt vaste last;
- vierwekelijkse, jaarlijkse en kwartaalposten worden naar maandbasis omgerekend (vierwekelijks = 13 betalingen per jaar).

Signalen:

- nieuwe vaste-lastkandidaat;
- bedrag stijgt ten opzichte van vorige betaling;
- leverancier verdwijnt of verandert naam;
- dubbele vaste-lastkandidaten door vergelijkbare omschrijvingen.

## 3. Uitleg in gewone taal

Status: gestart.

De app kan verklarende tekst genereren met templates, niet met AI. Voorbeeld:

`Juli was duurder omdat Overig +EUR 27.656 hoger was dan de referentie, vooral door L.M. van der Meer en grote overboekingen. Vaste kosten waren +EUR 432 hoger door Interpolis en GBLT.`

Input voor de uitleg:

- top 5 categorieverschillen;
- top 5 leverancierverschillen;
- nieuwe tegenpartijen;
- grote incidentele transacties;
- budgetoverschrijdingen.

Aanwezig:

- rapportages tonen per periode een gewone samenvattingzin;
- top-afwijkingen worden als verklaringkaart getoond;
- budgetoverschrijdingen kunnen dezelfde verklaring voeden;
- de tekst komt volledig uit transacties, budgetten en vaste templates.

## 4. Budgetvoorstellen

Status: gestart.

Budgetvoorstellen blijven deterministisch:

- gemiddelde laatste 3 maanden;
- optioneel gemiddelde laatste 6 maanden;
- mediaan om uitschieters te dempen;
- seizoenscorrectie voor kwartaal/jaarposten;
- afronden naar praktische bedragen, bijvoorbeeld EUR 5 of EUR 10.

Voorstel bevat:

- categorie;
- voorgesteld bedrag;
- gekozen methode;
- gebruikte referentiemaanden;
- grootste transacties die het voorstel verklaren.

Aanwezig:

- zesmaandsvoorstellen per categorie;
- mediaan, gemiddelde, bandbreedte en vertrouwen per voorstel;
- uitschieterdemper voor grillige categorieen;
- verklarende leveranciers/transactiegroepen bij het voorstel;
- praktisch afronden naar bruikbare budgetbedragen.

## 5. Waarschuwingen en reviewpunten

Reviewpunten horen in een aparte review- of beheerstroom:

- nieuwe tegenpartij;
- onbekende categorie of `Overig` boven drempel;
- budget overschreden;
- vaste last duurder geworden;
- inkomsten missen ten opzichte van referentie;
- grote bijschrijving/correctie die geen structureel inkomen is;
- interne overboeking die niet sluit op tegentransactie.

## Benodigde technische onderdelen

- `suggestions`-query's in `src/modules/finance`.
- Scoringfuncties zonder externe afhankelijkheid.
- UI voor voorstellen met `Accepteren`, `Aanpassen`, `Negeren`.
- Auditlog bij accepteren/negeren.
- `ignored_suggestions` bewaart geweigerde voorstellen, zodat terugkerende ruis niet opnieuw in de kandidaatlijst verschijnt.
- Vaste-lastenvoorstellen tonen een attentie wanneer genormaliseerde leveranciersnamen binnen dezelfde categorie op elkaar lijken, bijvoorbeeld betaalprovider-varianten van dezelfde organisatie.

## Acceptatiecriteria

- Voorstellen zijn reproduceerbaar op dezelfde dataset.
- Geen voorstel verandert transacties zonder expliciete gebruikersactie.
- Elk voorstel toont reden en score.
- Saldi, totalen en rapportcijfers blijven exact gelijk aan PostgreSQL-transacties.
- De app werkt volledig offline/lokaal zonder AI-provider.
