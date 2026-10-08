# Het huishoudboekje gebruiken

## Beginnen

Voeg je eigen rekeningen toe of laat ze herkennen bij de eerste bankimport. Kies per rekening het juiste type: betaalrekening, spaarrekening, belegging of schuld. Controleer de bankstand en de datum waarop die geldt.

Een bankbestand bevat vaak maar een deel van de historie. Een bekende bankstand vormt daarom een afzonderlijk anker voor het saldo. Het handmatig corrigeren van de bankstand maakt geen inkomsten- of uitgaventransactie aan.

## Bankbestanden importeren

1. Exporteer transacties bij je bank als CSV, CAMT.053 of MT940.
2. Open **Importeren** en kies één of meerdere bestanden.
3. Controleer de rekening en de aantallen in de preview. **Transacties** is het totaal; **Nieuw** is het nog toe te voegen deel en **Al bekend** het eerder ingelezen deel.
4. Koppel bij een afwijkend CSV-bestand de kolommen voor rekening, datum en bedrag. Een indeling kan worden bewaard voor een volgende upload.
5. Bevestig het opslaan en wacht op het resultaat. De server voorkomt gelijktijdige verwerking van bankimports.
6. Controleer daarna de categorieën en rekeningstanden.

Een bestand met alleen bekende transacties kan nul nieuwe transacties opleveren. Rekeningen die van import zijn uitgesloten worden afzonderlijk behandeld. Een foutieve import kan bij de laatste imports na bevestiging worden teruggedraaid.

Rekeningnotaties of aliases verbinden verschillende schrijfwijzen van dezelfde rekening. Dubbele rekeningen kunnen worden samengevoegd met behoud van hun transacties.

## Transacties en categorieën

Zoek en filter op onder meer datum, rekening, bedrag, omschrijving en categorie. Bekijk onbekende of algemeen ingedeelde transacties in de categoriecontrole. Je kunt vergelijkbare transacties per tegenpartij samen verwerken.

Wijzig een categorie handmatig en bewaar desgewenst een regel voor volgende betalingen. Regels kunnen zoeken in tegenpartij, omschrijving of beide. Inkomsten- en uitgavenregels houden rekening met het bedragteken. Onbekende transacties worden niet automatisch als Overig weggeschreven.

Interne overboekingen worden apart herkend. Overboeken naar sparen is geen consumptieve uitgave en verandert het totale vermogen niet. Bankkosten zijn wel echte kosten.

## Budgetten en vaste lasten

Maak zelf maandbudgetten voor de categorieën die je wilt plannen. Vergelijk het geplande bedrag met werkelijk besteed en resterend. Budgetten kunnen naar een andere maand worden gekopieerd; historische maanden blijven afzonderlijk bestaan. Historische voorstellen zijn hulp bij je keuze.

Controleer voorgestelde vaste lasten voordat je ze accepteert. Beheer bedrag, frequentie en categorie. Een betaling per vier weken kent dertien termijnen per jaar en is niet hetzelfde als een maandbetaling.

## Vandaag, Vooruit en scenario’s

**Vandaag** toont de berekende bestedingsruimte tot het volgende verwachte structurele inkomen. De uitleg toont welke betaalstanden, vaste lasten, budgetuitgaven en onzekerheidsbuffer zijn gebruikt. Zonder bekende inkomensdatum gebruikt de berekening de maandgrens en blijft onzekerheid zichtbaar.

**Vooruit** combineert geplande en geschatte gebeurtenissen in een tijdlijn. Controleer vooral zelf ingevulde datums en posten met beperkte zekerheid.

Een **scenario** vergelijkt het effect van een financiële keuze met de huidige planning. De vergelijking wijzigt geen transacties of rekeningstanden.

## Sparen, vermogen en rapportages

Sparen toont de bankstand en de bij- en afschrijvingen. Vermogen combineert betaalgeld, spaargeld, beleggingen en schulden, met peildata en kwaliteitskenmerken. Een schuld verlaagt het netto vermogen.

Rapportages vergelijken maanden, kwartalen en jaren en laten de onderliggende categorieën en transacties zien. Controlepunten kunnen een eigen status krijgen zonder de financiële bedragen te veranderen. Een maand kan na controle worden afgesloten met een notitie.

## Exporteren en bewaren

CSV is geschikt voor analyse; een JSON-back-up is bedoeld voor herstel. Een selectie-export bevat alle gevonden transacties, ook als die over meerdere schermpagina’s verdeeld zijn. Alleen de eigenaar kan na een geslaagde dry-run een back-up herstellen. Zie [back-up en herstel](back-up-en-herstel.md).
