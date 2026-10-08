# v2-roadmap

Bijgewerkt: 23 september 2026.

Status: afgerond en productie-live. Releasevalidatie: 79 tests, lint, typecheck, productiebuild, lokale UX-smoke en live route-/beveiligingscontrole geslaagd. Zie [release-v2-2026-09-23.md](release-v2-2026-09-23.md).

## Rapportages

- BR51: afgerond op 23 september 2026. De rapportagekiezer ondersteunt maand, kwartaal en jaar met typevaste URL-state, navigatie, aggregatie, vergelijkingen en CSV-export. Koppen, toelichtingen en tabellen volgen overal de gekozen periode; ook zonder transacties wordt een geldige actuele periode gebruikt.
- BR52: vergelijking uitbreiden naar vorige periode en instelbaar historisch gemiddelde. Afgerond op 23 september 2026: rapportages en de bijbehorende CSV-export gebruiken naar keuze de vorige 3, 6 of 12 beschikbare periodes; de keuze blijft behouden tijdens navigeren.
- BR27-BR28: afgerond op 23 september 2026. Budgetten en Vooruit delen nu één deterministisch kasstroomadvies dat de werkelijke maandkasstroom, geplande 30-dagenkasstroom en resterende variabele budgetten combineert. Het toont expliciet het laagste verwachte saldo na budgetten en maakt een tekort direct handelbaar.
- BR53: afgerond op 23 september 2026. Deterministische signalen voor nieuwe tegenpartijen, algemene categorieën, ontbrekende en overschreden budgetten, grote bijschrijvingen en vaste-laststijgingen staan in een aparte Acties-weergave. Ieder signaal is direct navolgbaar en kan auditbaar als open, afgehandeld of genegeerd worden gemarkeerd; statussen zitten ook in back-up en herstel.
- BR54: afgerond op 23 september 2026. Iedere geïmporteerde of handmatig vastgelegde rekeningstand wordt met bron en peildatum als saldo-observatie bewaard. Het rekeningverloop rekent tussen die controlepunten met de werkelijke transacties, markeert de ankers in de grafiek en neemt de historie mee in back-up en herstel.
- BR39: afgerond op 23 september 2026. Rapportages tonen een uitleg in gewone taal die volledig reproduceerbaar uit templates, transacties, budgetten en de grootste periode-afwijkingen wordt opgebouwd. De tekst volgt maand, kwartaal of jaar en dezelfde gekozen 3/6/12-periodevergelijking als de onderliggende cijfers, zonder externe AI-provider.

## Budgetten

- BR50: afgerond op 23 september 2026. Budgetvoorstellen hebben een vrije 3/6-maandskeuze die zowel de voorvertoning als bulktoepassing stuurt en bij navigatie behouden blijft. Mediaan/gemiddelde, bandbreedte, vertrouwen, uitschieterdemper en verklarende leveranciers blijven per voorstel zichtbaar.
- BR49: afgerond op 23 september 2026. Een budgetplan wordt pas na een tweestapsvoorvertoning gekopieerd. De bulkcontrole onderscheidt nieuwe, ongewijzigde, conflicterende en ongeldige regels, toont per conflict het huidige en bronbedrag en vereist expliciete bevestiging; niet-actieve categorieën worden overgeslagen.
- BR18-BR21: afgerond op 23 september 2026. Maandbudgetten blijven historisch onafhankelijk en tonen budget, werkelijk besteed, resterend en verbruikspercentage. Niet-gebruikt budget wordt bij de keuze `Meenemen` aantoonbaar aan de volgende maand toegevoegd. Daarnaast hebben jaarbudgetten een eigen jaargebonden model en scherm met jaarverbruik; reserveringscategorieën blijven daarin expliciet herkenbaar. Jaarbudgetten en saldo-observaties worden meegenomen in back-up en herstel.
- BR53: afgerond op 23 september 2026. Ieder maandbudget kan een notitie en een expliciete bewuste uitzondering bevatten. De uitzondering blijft zichtbaar en auditbaar, maar onderdrukt alleen het overschrijdingssignaal en de bijbehorende verklaringskaart; bedragen en werkelijk verbruik blijven ongewijzigd zichtbaar. Notities en uitzonderingen zitten in back-up en herstel.
- BR10, BR35: afgerond op 23 september 2026. Budgetten worden deterministisch gegroepeerd op de beheerbare hoofdgroep van iedere categorie. Iedere groep toont gepland, besteed en resterend; een toegankelijke drill-down toont de onderliggende subcategorieën met hun eigen voortgang, voorstellen, notities en uitzonderingen.

## Data en beheer

- BR56: afgerond op 23 september 2026. Restore ondersteunt een volledige back-up of een selectieve gegevensgroep. De verplichte dry-run is gebonden aan bestand én selectie en rapporteert nieuwe, te overschrijven en te verwijderen rijen per tabel; restore blijft transactioneel en auditbaar.
- BR58: afgerond op 23 september 2026. De bankimport herkent Rabobank/generieke CSV, CAMT.053 XML en MT940 op inhoud. CAMT werkt server-side en MT940 verwerkt ook `:62F:`/`:62M:`-eindsaldi; de importpagina accepteert alle bijbehorende bestandstypen.
- BR59: afgerond op 23 september 2026. PostgreSQL-filters, URL-paginering, totalen en debounce zijn aangevuld met benoembare, gebruikersgebonden bewaarde filters die opnieuw toepasbaar en verwijderbaar zijn.
- BR37-BR38: afgerond op 23 september 2026. Niet of algemeen gecategoriseerde transacties krijgen een deterministisch voorstel uit eerdere transacties met dezelfde tegenrekening of tegenpartij, inclusief score en reden. Het voorstel wordt pas toegepast als de gebruiker het formulier expliciet opslaat en kan vooraf worden overschreven.
- BR61-BR62: afgerond op 23 september 2026. Voorstellen tonen score, reden, stabiel of gewijzigd bedrag, frequentie en mogelijke dubbelen; accepteren koppelt bestaande transacties en bewaart herkenning, weigeren blijft auditbaar. Actieve vaste lasten signaleren daarnaast gemiste, afwijkende en dubbel beheerde leveranciers.

## Veiligheid

- BR60: rollen per actie zijn v1 aangescherpt: readonly kijkt, admin beheert financiele data/export, owner beheert gebruikers en restore. Verdere audit- en sessieverfijning staat open.
- BR60: 2FA of passkey-login.
- BR60: sessiebeheer in instellingen.

Dit zijn afzonderlijke beveiligingsvervolgen en blokkeren de afgeronde functionele v2-werkpakketten niet.

## Slimme assistentie zonder AI-provider

Zie [deterministic-assistance-v2.md](deterministic-assistance-v2.md). V2 gebruikt regels, scores en historie in plaats van een externe AI-koppeling. Slimme functies blijven reproduceerbaar en controleerbaar.
