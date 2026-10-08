# Business requirements huishoudboekje

Status: actuele requirementsbasis voor de productieversie. De afgeronde v2-oplevering staat in [../docs/release-v2-2026-09-23.md](../docs/release-v2-2026-09-23.md).

## Release-afbakening

- `v1`: productie-live webapp op PostgreSQL met login, rollen, bankbestand-importwizard, echte transactiedata, categoriebeheer, mappingregels, kruisposten, rapportages, budgetten, sparen als spaarrekening, vaste lasten, export/back-up, owner-restore en audit.
- `v2`: productie-live verdieping voor dagelijks sturen met CAMT/MT940, selectieve restore, bewaarde filters, categoriesuggesties, jaarbudgetten en uitgebreidere conflictpreview.
- `volgende`: verdere beveiliging via uitgebreider sessiebeheer en 2FA/passkeys.

Let op: oudere requirements over virtuele potjes zijn in v1 bewust herijkt. De primaire releasekeuze is dat sparen via spaarrekeningstand en feitelijke transacties in/uit loopt; virtuele potjes bepalen geen saldi of rapportagetotalen.

| ID | Business requirement |
| --- | --- |
| BR01 | Het huishoudboekje moet meerdere betaal- en spaarrekeningen bankagnostisch kunnen beheren. |
| BR02 | De gebruiker moet per rekening en over alle rekeningen gezamenlijk inzicht hebben in saldo, inkomsten en uitgaven. |
| BR03 | Het systeem moet transacties uit bankbestanden via de UX kunnen importeren en dubbele imports voorkomen. |
| BR04 | Overboekingen tussen eigen rekeningen moeten automatisch als interne overboeking worden herkend en niet als inkomsten of uitgaven worden meegeteld. |
| BR05 | Alle beheerde rekeningen zijn eigen rekeningen; de gebruiker moet per rekening het type betaalrekening of spaarrekening kunnen kiezen. |
| BR06 | Iedere transactie moet aan een categorie kunnen worden gekoppeld, zoals boodschappen, wonen, vervoer, verzekeringen, vakantie of inkomen. |
| BR07 | Het systeem moet transacties automatisch kunnen categoriseren op basis van herkenbare kenmerken uit eerdere transacties en ingestelde regels. |
| BR08 | De gebruiker moet een automatisch toegekende categorie altijd handmatig kunnen wijzigen. |
| BR09 | Een correctie moet optioneel gebruikt kunnen worden om toekomstige vergelijkbare transacties automatisch op dezelfde manier te categoriseren. |
| BR10 | De gebruiker moet eigen categorieen en subcategorieen kunnen toevoegen en beheren. |
| BR11 | Het systeem moet onderscheid maken tussen inkomsten, vaste lasten, variabele uitgaven, sparen/reserveren en interne overboekingen. |
| BR12 | Terugbetalingen en correctieboekingen moeten gekoppeld of verwerkt kunnen worden zodat uitgaven niet onterecht te hoog worden weergegeven. |
| BR13 | Het systeem moet periodiek terugkerende betalingen kunnen herkennen en als mogelijke vaste last kunnen voorstellen. |
| BR14 | De gebruiker moet vaste lasten kunnen beheren, inclusief bedrag, frequentie, categorie en eventueel leverancier. |
| BR15 | Vaste lasten moeten zowel maandelijks als op jaarbasis inzichtelijk zijn. |
| BR16 | Jaarlijkse, kwartaal- en andere periodieke lasten moeten naar een gemiddeld maandbedrag kunnen worden omgerekend. |
| BR17 | Het systeem moet veranderingen in vaste lasten zichtbaar maken, bijvoorbeeld wanneer een verzekering of energiecontract duurder wordt. |
| BR18 | De gebruiker moet maandelijkse budgetten kunnen instellen voor categorieen, bijvoorbeeld EUR 700 voor boodschappen. |
| BR19 | Per budget moet zichtbaar zijn: budget, daadwerkelijk besteed, resterend en percentage verbruikt. |
| BR20 | Budgetten moeten per maand aangepast kunnen worden zonder historische budgetten te veranderen. |
| BR21 | Niet-gebruikt budget moet naar keuze kunnen vervallen of meegenomen worden naar een volgende periode. |
| BR22 | De gebruiker moet reserveringspotjes kunnen aanmaken voor toekomstige uitgaven, bijvoorbeeld vakantie, onderhoud woning, auto of belastingen. |
| BR23 | Een reserveringspotje moet een doelbedrag, huidig gereserveerd bedrag en eventueel een streefdatum kunnen bevatten. |
| BR24 | Het systeem moet kunnen berekenen welk bedrag periodiek gereserveerd moet worden om een doelbedrag op tijd te bereiken. |
| BR25 | Een reservering moet administratief onderscheiden worden van een consumptieve uitgave. Geld apart zetten telt in inkomsten-versus-uitgaven wel als uitgaand geld, maar blijft herkenbaar als potjes/bufferinleg. |
| BR26 | De gebruiker moet inkomsten kunnen categoriseren, bijvoorbeeld salaris, onderneming, toeslagen, teruggaven en overige inkomsten. |
| BR27 | Het systeem moet per maand inzicht geven in totale inkomsten versus totale uitgaven. |
| BR28 | Het systeem moet berekenen hoeveel geld na vaste lasten, variabele uitgaven en reserveringen beschikbaar blijft. |
| BR29 | De gebruiker moet een maandbudget kunnen plannen op basis van verwachte inkomsten, vaste lasten, budgetten en reserveringen. |
| BR30 | Werkelijke resultaten moeten met het geplande maandbudget kunnen worden vergeleken. |
| BR31 | Het dashboard moet minimaal inzicht geven in saldo, inkomsten, uitgaven, vaste lasten, budgetgebruik, reserveringen en vrij beschikbaar bedrag. |
| BR32 | De gebruiker moet kunnen doorklikken van totalen naar onderliggende categorieen en transacties. |
| BR33 | Ontwikkeling van inkomsten en uitgaven moet over meerdere maanden en jaren zichtbaar zijn. |
| BR34 | De gebruiker moet perioden kunnen vergelijken, bijvoorbeeld deze maand met vorige maand of dit jaar met vorig jaar. |
| BR35 | Het systeem moet inzicht geven in de grootste uitgavencategorieen en veranderingen daarin. |
| BR36 | De gebruiker moet transacties kunnen zoeken en filteren op onder andere periode, rekening, categorie, bedrag en omschrijving. |
| BR37 | Slimme assistentie mag worden gebruikt om nog niet herkende transacties een categorie voor te stellen; dit mag ook volledig deterministisch zonder externe AI-koppeling. |
| BR38 | Een assistentievoorstel moet door de gebruiker gecorrigeerd of overschreven kunnen worden. |
| BR39 | Het systeem moet verklarende analyses in gewone taal kunnen tonen, bijvoorbeeld waarom uitgaven in een maand hoger waren dan in een andere maand; dit mag template- en regelgebaseerd zonder externe AI-provider. |
| BR40 | Financiele totalen, saldi en budgetberekeningen moeten altijd gebaseerd zijn op de opgeslagen financiele gegevens en niet door AI of slimme assistentie worden berekend of verzonnen. |
| BR41 | Het systeem moet later uitgebreid kunnen worden met een rechtstreekse koppeling met banken zonder het bankagnostische functionele model fundamenteel te wijzigen. |
| BR42 | Het huishoudboekje moet als prive webapplicatie gebruikt kunnen worden vanaf computer, tablet en telefoon. |
| BR43 | Alleen geautoriseerde gebruikers mogen toegang hebben tot de financiele gegevens. |
| BR44 | De gebruiker moet zijn gegevens kunnen exporteren zodat hij niet afhankelijk wordt van de applicatie. |
| BR45 | Historische transacties en categoriseringen moeten behouden blijven wanneer categorieen, budgetten of instellingen later worden gewijzigd. |
| BR46 | Runtime-schermen mogen niet terugvallen op CSV-bestanden of verzonnen financiele data; alle totalen moeten uit PostgreSQL en aangeleverde, geimporteerde transacties komen. |
| BR47 | Basisconfiguratie zoals standaardcategorieen en mappingregels mag worden geseed, maar budgetten, potjes, vaste lasten, rekeningen en transacties niet. |
| BR48 | Budgetten moeten ook categorieen tonen waarvoor wel werkelijke uitgaven bestaan maar nog geen budgetplan is ingesteld. |
| BR49 | De gebruiker moet een budgetplan van een vorige maand kunnen kopieren naar een nieuwe maand. |
| BR50 | Het systeem moet budgetvoorstellen kunnen doen op basis van historische transacties, bijvoorbeeld gemiddelde van de laatste 3 of 6 maanden. |
| BR51 | Het dashboard moet een periodekiezer bevatten voor maand, kwartaal en jaar. |
| BR52 | Het dashboard moet de gekozen periode kunnen vergelijken met een vorige periode en met een historisch gemiddelde. |
| BR53 | Het systeem moet aandachtspunten kunnen bepalen, zoals ongeplande categorieen, overschreden budgetten, nieuwe tegenpartijen, vaste-lastwijzigingen en nog te categoriseren transacties, maar rapportages tonen geen aparte actiesignalenblok. |
| BR54 | Het systeem moet saldoverloop per rekening kunnen tonen op basis van importstanden en handmatige peildata. |
| BR55 | Export moet minimaal CSV en JSON ondersteunen, inclusief manifest met exportdatum, periode, aantallen en schema-informatie. |
| BR56 | De gebruiker moet een back-up kunnen maken en herstellen zonder data handmatig in de database te hoeven wijzigen. |
| BR57 | Wijzigingen aan categorieen, regels, budgetten, rekeningen, transacties, gebruikers en instellingen moeten in een auditlog worden vastgelegd. |
| BR58 | Het systeem moet Rabobank CSV, generieke CSV, CAMT.053 en MT940 via dezelfde gecontroleerde importflow ondersteunen. |
| BR59 | Zoeken, filteren en paginering moeten server-side kunnen werken voor grotere datasets. |
| BR60 | De toegang moet verder kunnen worden versterkt met rollen per actie, sessiebeheer en 2FA of passkeys. |
| BR61 | Vaste-lastenherkenning moet kandidaten tonen op basis van terugkerende transacties, maar mag ze pas als vaste last boeken na expliciete acceptatie door de gebruiker. |
| BR62 | Bij acceptatie van een vaste-lasten-kandidaat moeten bestaande transacties van dezelfde leverancier aan de gekozen categorie kunnen worden gekoppeld en moet een herkenningsregel worden vastgelegd. |
| BR63 | Rapportages moeten per maand een totaaloverzicht tonen van geld dat binnenkomt, geld dat uitgaat en het netto tekort of overschot. |
| BR64 | Rapportages moeten een referentie en forecast tonen op basis van historische maanden, zonder niet-deterministische totalen te verzinnen. |
| BR65 | Rapportages moeten stijgingen in leveranciers, categorieen of vaste lasten kunnen signaleren op basis van transacties. |
| BR66 | Lange rapportsecties mogen kleine posten samenvatten, maar moeten het aantal samengevoegde posten, het maandbedrag, de referentie en het verschil als aparte controleerbare regel tonen. |
| BR67 | De gebruiker moet voor een bankbestand eerst een preview kunnen zien met aantallen, bestaande transacties en verwachte nieuwe transacties voordat de import wordt bevestigd. |
| BR68 | De gebruiker moet bij generieke CSV-bestanden kolommen kunnen mappen wanneer rekening, datum of bedrag niet automatisch wordt herkend. |
| BR69 | De gebruiker moet rekeningen vooraf handmatig kunnen toevoegen zodat latere imports transacties aan de juiste rekening koppelen. |
| BR70 | De gebruiker moet aliases voor rekeningnummers of IBANs kunnen beheren en dubbele rekeningen kunnen samenvoegen zonder transacties te verliezen. |
| BR71 | De gebruiker moet na import nieuwe of algemeen gecategoriseerde transacties in een review-inbox kunnen verwerken. |
| BR72 | Reserveringspotjes moeten als virtuele verdeling onder de spaarrekening worden gepresenteerd. |
| BR73 | Standaardcategorieen en uitgebreide herkenningsregels moeten bij inrichting beschikbaar zijn zonder gevaarlijke herstelknop in de UX. |
| BR74 | Een beheerder moet in Beheer het eigen wachtwoord kunnen wijzigen en gebruikers kunnen toevoegen of uitschakelen. |
| BR75 | Virtuele spaarpotten moeten bij bankimport automatisch uit potjesomschrijvingen zoals `naar:` en `van:` worden herkend en aan de spaarrekening van de gekoppelde interne tegenboeking worden gekoppeld. |
| BR76 | Na import moet een controlescherm tonen welke rekeningen, potjes, transacties, duplicaten en reviewpunten zijn gevonden. |
| BR77 | Per potje moeten de onderliggende inleg- en opnamemutaties zichtbaar zijn. |
| BR78 | Per rekening moet een detailpagina bestaan met saldoverloop, transacties, aliases en gekoppelde potjes. |
| BR79 | Kolommapping voor generieke CSV-bestanden moet als herbruikbare preset beschikbaar zijn. |
| BR80 | De categorie-review moet batches per tegenpartij tonen zodat meerdere vergelijkbare posten sneller weggewerkt kunnen worden. |
| BR81 | Beheer moet in businessblokken zijn gegroepeerd en technische labels vermijden. |
| BR82 | Rapportages moeten focussen op financiele analyse; losse actiesignalen horen niet bovenaan de rapportagepagina. |
| BR83 | Maanden moeten gecontroleerd en afgesloten kunnen worden met notitie, zodat import, categorisering, budget en rekeningstanden bewust worden goedgekeurd. |
| BR84 | Rekeningdetailpagina's moeten bankstand en berekend transactiesaldo naast elkaar tonen, inclusief verschil. |

## Functionele kern

Het functionele model voor v1 is:

`Rekening -> Transactie -> Categorie -> Budget -> Potje -> Vaste last`

Budgetten zijn bestedingslimieten. Potjes/buffers zijn tijdelijke reserveringen op een spaarrekening. Inleg in potjes/buffer is uitgaand geld in de maandcashflow, maar blijft onderscheiden van consumptieve uitgaven. Opnames uit potjes/buffer zijn interne mutaties en geen inkomen.

## v1 businessregels

- Overboekingen tussen eigen betaalrekeningen zijn kruisposten en tellen netto niet mee als inkomen of uitgave.
- Overboekingen naar een pot/buffer worden aan de betaalrekeningzijde als reservering getoond. Terugboekingen uit een pot/buffer blijven interne potjesopnames en mogen niet als inkomen, overig inkomen of consumptieve uitgave meetellen.
- Bankkosten zijn echte kosten en vallen onder `Bankkosten`.
- Budgetten tonen werkelijke uitgaven uit transacties, ook wanneer er nog geen budgetplan bestaat.
- Budgetten en cashflow gebruiken dezelfde hoofddefinitie: totale inkomsten minus totale uitgaven, inclusief potjes/bufferinleg.
- Rapportregels blijven volledig zichtbaar; totalen veranderen niet en blijven herleidbaar naar de onderliggende transacties.
- Vaste lasten worden herkend uit terugkerende transacties, maar definitief gekoppeld via een vaste-lastcategorie.
- Potjes horen altijd bij een spaarrekening. De potjespagina groepeert ze onder de rekeningnaam en IBAN, zodat duidelijk blijft dat het virtuele reserveringen binnen die spaarrekening zijn. Bekende naamvarianten zoals `Bezine` worden gecorrigeerd naar `Benzine`.
- Geimporteerde bankdata mag potnamen en potmutaties herkennen, maar mag geen doelbedragen, huidige reserveringen, maandbedragen of voortgang verzinnen. Als deze waarden niet expliciet door de gebruiker zijn ingevuld, blijven ze leeg.
- Bij een handmatige categoriecorrectie moet de gebruiker een herkenningsregel kunnen bewaren op basis van tegenpartij, omschrijving/detailomschrijving of beide. De herkenning gebruikt deeltekst, zodat varianten zoals verschillende winkelnummers onder dezelfde regel kunnen vallen.
- Herkenningsregels moeten ook combinaties kunnen onderscheiden, bijvoorbeeld dezelfde tegenpartij met `Inleg Rabo DoelSparen` versus dezelfde tegenpartij met alleen `Sparen`.
- Het dashboard moet saldoverloop, betaalstand, spaarstand, maandcashflow en grootste uitgaven grafisch tonen als eerste cockpit van het huishoudboekje. De gebruiker moet vorige/volgende maanden kunnen openen en de grafiek moet de gekozen maand duidelijk markeren.
- Onbekende transacties mogen niet automatisch op `Overig` worden gezet. Ze blijven zonder categorie totdat de gebruiker bewust een categorie kiest; `Overig` blijft beschikbaar als expliciete keuze.
- Rapportage toont maandelijkse cashflow, referentie en forecast uit transacties.
- Rapportage biedt maandafsluiting met notitie nadat import, categorieen, budgetten en rekeningstanden gecontroleerd zijn.
- Rekeningdetailpagina's tonen saldocontrole tussen actuele bankstand en saldoverloop uit transacties.
- Een gepland budget is een maandgebonden afspraak en mag historische maanden niet overschrijven.
- Categorieen met historie worden gearchiveerd in plaats van hard verwijderd.
- Slimme assistentie mag helpen bij voorstellen en analyse, maar mag nooit financiele totalen bepalen. V2 kan dit zonder externe AI-koppeling uitvoeren met regels, scores en historie.
