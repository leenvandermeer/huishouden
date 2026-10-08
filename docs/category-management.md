# Categoriebeheer en mappingregels

Bijgewerkt: 19 augustus 2026.

## Ontwerpkeuzes

- Categorieen zijn een historische dimensie. Als een categorie al gebruikt is, wordt verwijderen een archivering met `valid_to` in plaats van een harde delete.
- Hoofdcategorieen en subcategorieen blijven eenvoudig: een categorie kan onder een hoofdgroep worden geplaatst en later worden verplaatst.
- Het transactietype staat los van de naam: inkomen, vaste last, variabele uitgave, reservering of interne overboeking.
- Systeemcategorieen voor interne overboekingen, ontsparen en overige posten worden beschermd tegen verwijderen.
- Mappingregels zijn deterministisch. Herkenning zoekt met deeltekst in tegenpartij, omschrijving/detailomschrijving of beide en past de gekoppelde categorie toe.
- Voor eigen rekeningen of personen is een combinatieregel veiliger: gebruik `Alles` met tegenpartij plus omschrijvingsdeel, bijvoorbeeld `L.M. VAN DER MEER Inleg Rabo DoelSparen`.
- Mappingregels zijn richtinggevoelig: inkomstenregels raken alleen positieve bedragen en uitgavenregels alleen negatieve bedragen.
- Automatische import gebruikt geen `Overig` als fallback. Onbekende posten blijven zonder categorie en komen in review; `Overig` is alleen een bewuste handmatige keuze.
- Bulk doorvoeren is expliciet. De gebruiker kiest zelf wanneer bestaande transacties opnieuw worden gemapt.
- Kruisposten zijn alleen tweezijdige overboekingen tussen eigen betaalrekeningen met dezelfde datum en tegengesteld bedrag.
- Overboekingen naar de spaarrekening krijgen op de betaalrekeningzijde `Naar spaarrekening`. Terugboekingen uit de spaarrekening krijgen `Uit spaarrekening`; ze tellen als beschikbaar geld voor de maand, maar niet als structureel inkomen.
- Rabobank-kosten, pakketkosten en betaalpaskosten zijn echte kosten en worden als `Bankkosten` geboekt.

## Scherm

Categoriebeheer en mappingregels zijn bewust gesplitst:

- `/categorieen`: categorie aanmaken, naam wijzigen, type wijzigen, verplaatsen onder een hoofdgroep en verwijderen/archiveren.
- `/mappingregels`: herkenningstekst koppelen aan categorie, regels wijzigen of verwijderen en bestaande transacties bewust opnieuw indelen.

De marktconforme basis staat standaard in de inrichting via de seed. Het scherm heeft geen herstelknop die bestaande regels stilletjes vervangt; bestaande transacties opnieuw indelen blijft een expliciete beheeractie.

Voorbeelden van standaardregels:

- Albert Heijn -> Boodschappen
- Jumbo -> Boodschappen
- Eneco -> Energie
- Shell -> Brandstof
- Kosten Rabo -> Bankkosten
- Interpolis Zorgverzekeringen -> Zorgverzekering
- KPN -> Internet en telefonie

## Vervolg

- Optionele preview toevoegen voordat bulkregels worden doorgevoerd.
- Conflictafhandeling tonen wanneer meerdere regels dezelfde transactie raken.
