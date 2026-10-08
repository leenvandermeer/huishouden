# Business requirements

Huishouden is een persoonlijk huishoudboekje voor overzicht, controle en planning van de financiën van één huishouden. Dit document bundelt de functionele requirements en businessregels. De BR-nummers zijn stabiel; een requirementnummer beschrijft een productafspraak en is op zichzelf geen claim dat iedere uitbreiding al beschikbaar is.

## Productgrens

De huidige toepassing ondersteunt bankbestandsimport, categorisering, rekeningen, budgetten, vaste lasten, planning, scenario’s, vermogen, rapportages en export/herstel. De financiële administratie wordt centraal opgeslagen. De webapp ondersteunt computer, tablet en telefoon.

Rechtstreekse bankkoppelingen, automatische aankoop-terugbetalingskoppeling, uitgebreid spaardoelbeheer, passkeys en uitgebreider apparaatbeheer zijn uitbreidingswensen. Bestaande virtuele spaarpotgegevens blijven compatibel, maar sturen de primaire financiële cijfers niet.

## Rekeningen en vermogen

| ID | Requirement |
| --- | --- |
| BR01 | Het huishoudboekje moet meerdere betaal- en spaarrekeningen bankagnostisch kunnen beheren. |
| BR02 | De gebruiker moet per rekening en over alle rekeningen gezamenlijk inzicht hebben in saldo, inkomsten en uitgaven. |
| BR05 | Beheerde eigen rekeningen ondersteunen betaalgeld, sparen, beleggingen en schulden. |
| BR54 | Het systeem moet saldoverloop per rekening kunnen tonen op basis van importstanden en handmatige peildata. |
| BR69 | De gebruiker moet rekeningen vooraf handmatig kunnen toevoegen zodat latere imports transacties aan de juiste rekening koppelen. |
| BR70 | De gebruiker moet aliases voor rekeningnummers of IBANs kunnen beheren en dubbele rekeningen kunnen samenvoegen zonder transacties te verliezen. |
| BR78 | Een rekeningdetail toont saldoverloop, transacties, rekeningnotaties en een saldocontrole. |
| BR84 | Rekeningdetailpagina's moeten bankstand en berekend transactiesaldo naast elkaar tonen, inclusief verschil. |
| BR88 | Vermogen toont betaalgeld, sparen, beleggingen en schulden met peildatum en datakwaliteit; schulden verlagen het netto vermogen. |
| BR89 | Ontbrekende of onvolledige rekeninghistorie wordt zichtbaar gemaakt; een handmatige bankstand mag geen fictieve transactie creëren. |

## Bankimport

| ID | Requirement |
| --- | --- |
| BR03 | Het systeem moet transacties uit bankbestanden via de UX kunnen importeren en dubbele imports voorkomen. |
| BR58 | Het systeem moet Rabobank CSV, generieke CSV, CAMT.053 en MT940 via dezelfde gecontroleerde importflow ondersteunen. |
| BR67 | De gebruiker moet voor een bankbestand eerst een preview kunnen zien met aantallen, bestaande transacties en verwachte nieuwe transacties voordat de import wordt bevestigd. |
| BR68 | De gebruiker moet bij generieke CSV-bestanden kolommen kunnen mappen wanneer rekening, datum of bedrag niet automatisch wordt herkend. |
| BR73 | Standaardcategorieen en uitgebreide herkenningsregels moeten bij inrichting beschikbaar zijn zonder gevaarlijke herstelknop in de UX. |
| BR76 | De import toont bestanden, rekeningen, transacties, duplicaten, uitgesloten posten en controlepunten. |
| BR79 | Kolommapping voor generieke CSV-bestanden moet als herbruikbare preset beschikbaar zijn. |
| BR91 | Gelijktijdige bankimports worden aan de serverkant geblokkeerd; zonder nieuwe transacties wordt onnodige herverwerking vermeden. |
| BR92 | De gebruiker kan een bankimport terugdraaien na expliciete bevestiging; de resterende gegevens blijven controleerbaar. |

## Transacties en categorisering

| ID | Requirement |
| --- | --- |
| BR04 | Overboekingen tussen eigen rekeningen moeten automatisch als interne overboeking worden herkend en niet als inkomsten of uitgaven worden meegeteld. |
| BR06 | Iedere transactie moet aan een categorie kunnen worden gekoppeld, zoals boodschappen, wonen, vervoer, verzekeringen, vakantie of inkomen. |
| BR07 | Het systeem moet transacties automatisch kunnen categoriseren op basis van herkenbare kenmerken uit eerdere transacties en ingestelde regels. |
| BR08 | De gebruiker moet een automatisch toegekende categorie altijd handmatig kunnen wijzigen. |
| BR09 | Een correctie moet optioneel gebruikt kunnen worden om toekomstige vergelijkbare transacties automatisch op dezelfde manier te categoriseren. |
| BR10 | De gebruiker moet eigen categorieen en subcategorieen kunnen toevoegen en beheren. |
| BR11 | Het systeem moet onderscheid maken tussen inkomsten, vaste lasten, variabele uitgaven, sparen/reserveren en interne overboekingen. |
| BR12 | Terugbetalingen en correcties worden herkenbaar verwerkt; automatische koppeling aan de oorspronkelijke aankoop is een uitbreidingswens. |
| BR26 | De gebruiker moet inkomsten kunnen categoriseren, bijvoorbeeld salaris, onderneming, toeslagen, teruggaven en overige inkomsten. |
| BR36 | De gebruiker moet transacties kunnen zoeken en filteren op onder andere periode, rekening, categorie, bedrag en omschrijving. |
| BR59 | Zoeken, filteren en paginering moeten server-side kunnen werken voor grotere datasets. |
| BR71 | De gebruiker moet na import nieuwe of algemeen gecategoriseerde transacties in een review-inbox kunnen verwerken. |
| BR80 | De categorie-review moet batches per tegenpartij tonen zodat meerdere vergelijkbare posten sneller weggewerkt kunnen worden. |

## Vaste lasten en inkomsten

| ID | Requirement |
| --- | --- |
| BR13 | Het systeem moet periodiek terugkerende betalingen kunnen herkennen en als mogelijke vaste last kunnen voorstellen. |
| BR14 | De gebruiker moet vaste lasten kunnen beheren, inclusief bedrag, frequentie, categorie en eventueel leverancier. |
| BR15 | Vaste lasten moeten zowel maandelijks als op jaarbasis inzichtelijk zijn. |
| BR16 | Jaarlijkse, kwartaal- en andere periodieke lasten moeten naar een gemiddeld maandbedrag kunnen worden omgerekend. |
| BR17 | Het systeem moet veranderingen in vaste lasten zichtbaar maken, bijvoorbeeld wanneer een verzekering of energiecontract duurder wordt. |
| BR61 | Vaste-lastenherkenning moet kandidaten tonen op basis van terugkerende transacties, maar mag ze pas als vaste last boeken na expliciete acceptatie door de gebruiker. |
| BR62 | Bij acceptatie van een vaste-lasten-kandidaat moeten bestaande transacties van dezelfde leverancier aan de gekozen categorie kunnen worden gekoppeld en moet een herkenningsregel worden vastgelegd. |

## Budgetten en sparen

| ID | Requirement |
| --- | --- |
| BR18 | De gebruiker moet maandelijkse budgetten kunnen instellen voor categorieen, bijvoorbeeld EUR 700 voor boodschappen. |
| BR19 | Per budget moet zichtbaar zijn: budget, daadwerkelijk besteed, resterend en percentage verbruikt. |
| BR20 | Budgetten moeten per maand aangepast kunnen worden zonder historische budgetten te veranderen. |
| BR21 | Niet-gebruikt budget moet naar keuze kunnen vervallen of meegenomen worden naar een volgende periode. |
| BR22 | Een toekomstige uitbreiding kan spaardoelen als virtuele verdeling binnen een spaarrekening ondersteunen. |
| BR23 | Een toekomstig spaardoel kan een zelfgekozen doelbedrag en streefdatum bevatten; ontbrekende waarden worden niet verzonnen. |
| BR24 | Een toekomstige spaardoelplanning kan de benodigde periodieke inleg berekenen op basis van expliciete invoer. |
| BR25 | Sparen wordt apart van consumptieve uitgaven getoond. Een interne verplaatsing van geld verandert het totale vermogen niet. |
| BR29 | De gebruiker kan een maandplan maken op basis van verwachte inkomsten, vaste lasten en zelfgekozen budgetten. |
| BR30 | Werkelijke resultaten moeten met het geplande maandbudget kunnen worden vergeleken. |
| BR48 | Budgetten moeten ook categorieen tonen waarvoor wel werkelijke uitgaven bestaan maar nog geen budgetplan is ingesteld. |
| BR49 | De gebruiker moet een budgetplan van een vorige maand kunnen kopieren naar een nieuwe maand. |
| BR50 | Het systeem moet budgetvoorstellen kunnen doen op basis van historische transacties, bijvoorbeeld gemiddelde van de laatste 3 of 6 maanden. |
| BR72 | Bestaande virtuele spaarpotgegevens blijven gekoppeld aan een spaarrekening; ze bepalen geen primaire saldi of rapportagetotalen. |
| BR75 | Voor compatibiliteit kunnen bestaande potjesomschrijvingen aan een spaarrekening worden gekoppeld; de toepassing bevat geen persoonlijke standaardpotjes. |
| BR77 | Bestaande potjesmutaties blijven beschikbaar voor compatibiliteit; de primaire spaarweergave toont de bankstand en bij- en afschrijvingen. |

## Overzicht, rapportages en planning

| ID | Requirement |
| --- | --- |
| BR27 | Het systeem moet per maand inzicht geven in totale inkomsten versus totale uitgaven. |
| BR28 | Het systeem berekent beschikbare bestedingsruimte uit betaalstanden, verwachte inkomsten, vaste lasten en relevante budgetuitgaven. |
| BR31 | Vandaag toont een compacte status van beschikbare bestedingsruimte, betaalstanden en aandachtspunten; verdiepende analyse staat in de rapportages. |
| BR32 | De gebruiker moet kunnen doorklikken van totalen naar onderliggende categorieen en transacties. |
| BR33 | Ontwikkeling van inkomsten en uitgaven moet over meerdere maanden en jaren zichtbaar zijn. |
| BR34 | De gebruiker moet perioden kunnen vergelijken, bijvoorbeeld deze maand met vorige maand of dit jaar met vorig jaar. |
| BR35 | Het systeem moet inzicht geven in de grootste uitgavencategorieen en veranderingen daarin. |
| BR51 | Rapportages bieden een periodekeuze voor maand, kwartaal en jaar. |
| BR52 | Het dashboard moet de gekozen periode kunnen vergelijken met een vorige periode en met een historisch gemiddelde. |
| BR53 | Het systeem toont controlepunten voor ongeplande uitgaven, budgetoverschrijdingen, onbekende transacties en wijzigingen in vaste lasten, met doorklik naar de bron. |
| BR63 | Rapportages moeten per maand een totaaloverzicht tonen van geld dat binnenkomt, geld dat uitgaat en het netto tekort of overschot. |
| BR64 | Rapportages moeten een referentie en forecast tonen op basis van historische maanden, zonder niet-deterministische totalen te verzinnen. |
| BR65 | Rapportages moeten stijgingen in leveranciers, categorieen of vaste lasten kunnen signaleren op basis van transacties. |
| BR66 | Samengevoegde rapportregels tonen aantallen en controleerbare bedragen; de totaalsom blijft gelijk aan de onderliggende transacties. |
| BR81 | Beheer moet in businessblokken zijn gegroepeerd en technische labels vermijden. |
| BR82 | Rapportages geven financiële analyse prioriteit; controlepunten staan in een herkenbare aparte weergave. |
| BR83 | Maanden moeten gecontroleerd en afgesloten kunnen worden met notitie, zodat import, categorisering, budget en rekeningstanden bewust worden goedgekeurd. |
| BR85 | Veilig te besteden gebruikt één versievaste formule met een inkomenshorizon, tijdsevenredige budgetuitgaven en een zichtbare onzekerheidsbuffer. |
| BR86 | Vooruit combineert beheerde en geschatte inkomsten, vaste lasten en eenmalige gebeurtenissen in een tijdlijn met zichtbare zekerheid. |
| BR87 | Een scenarioberekening toont het effect van een financiële keuze zonder opgeslagen transacties of rekeningstanden te wijzigen. |

## Uitlegbare assistentie

| ID | Requirement |
| --- | --- |
| BR37 | Slimme assistentie mag worden gebruikt om nog niet herkende transacties een categorie voor te stellen; dit mag ook volledig deterministisch zonder externe AI-koppeling. |
| BR38 | Een assistentievoorstel moet door de gebruiker gecorrigeerd of overschreven kunnen worden. |
| BR39 | Het systeem moet verklarende analyses in gewone taal kunnen tonen, bijvoorbeeld waarom uitgaven in een maand hoger waren dan in een andere maand; dit mag template- en regelgebaseerd zonder externe AI-provider. |
| BR40 | Financiele totalen, saldi en budgetberekeningen moeten altijd gebaseerd zijn op de opgeslagen financiele gegevens en niet door AI of slimme assistentie worden berekend of verzonnen. |

## Gegevens, toegang en beheer

| ID | Requirement |
| --- | --- |
| BR41 | Een rechtstreekse bankkoppeling is een uitbreidingswens; het rekening- en transactiemodel blijft bankonafhankelijk. |
| BR42 | Het huishoudboekje moet als prive webapplicatie gebruikt kunnen worden vanaf computer, tablet en telefoon. |
| BR43 | Alleen geautoriseerde gebruikers mogen toegang hebben tot de financiele gegevens. |
| BR44 | De gebruiker moet zijn gegevens kunnen exporteren zodat hij niet afhankelijk wordt van de applicatie. |
| BR45 | Historische transacties en categoriseringen moeten behouden blijven wanneer categorieen, budgetten of instellingen later worden gewijzigd. |
| BR46 | Runtime-schermen mogen niet terugvallen op CSV-bestanden of verzonnen financiele data; alle totalen moeten uit PostgreSQL en aangeleverde, geimporteerde transacties komen. |
| BR47 | Inrichting mag standaardcategorieën, herkenningsregels en een expliciet geconfigureerd eigenaarsaccount aanmaken, maar geen persoonlijke financiële voorbeeldgegevens. |
| BR55 | Export moet minimaal CSV en JSON ondersteunen, inclusief manifest met exportdatum, periode, aantallen en schema-informatie. |
| BR56 | De gebruiker moet een back-up kunnen maken en herstellen zonder data handmatig in de database te hoeven wijzigen. |
| BR57 | Wijzigingen aan categorieen, regels, budgetten, rekeningen, transacties, gebruikers en instellingen moeten in een auditlog worden vastgelegd. |
| BR60 | Toegang wordt beschermd met rollen, servergecontroleerde sessies en optionele TOTP-tweefactorauthenticatie. Passkeys en uitgebreider apparaatbeheer zijn uitbreidingswensen. |
| BR74 | Iedere gebruiker kan het eigen wachtwoord wijzigen; uitsluitend de eigenaar mag gebruikers toevoegen of uitschakelen. |
| BR90 | Scherm en selectie-export gebruiken dezelfde filters, sortering en berekeningen; CSV-tekst wordt beschermd tegen formule-injectie. |
| BR93 | Gebruikersgegevens, rekeningnummers, wachtwoorden en sleutels worden niet als persoonlijke standaardwaarden in broncode, documentatie of voorbeelden opgenomen. |
| BR94 | Een release is getest en naar Git gepusht voordat productie exact die commit ophaalt; terugzetten van applicatiecode blijft mogelijk. |

## Businessregels

- PostgreSQL en aangeleverde transacties vormen de financiële bron. Ontbrekende gegevens worden niet vervangen door verzonnen bedragen.
- Een bankbestand wordt eerst gecontroleerd en pas na bevestiging verwerkt. Een herhaalde import maakt geen dubbele transacties.
- Interne overboekingen veranderen het netto huishoudvermogen niet. Sparen en beleggen blijven aparte geldstromen in analyses.
- Budgetten zijn maandgebonden keuzes; import maakt geen bestedingsplannen aan. Historische budgetten worden niet stilzwijgend aangepast.
- Een handmatig vastgelegde bankstand heeft een peildatum en wordt niet automatisch door een import overschreven.
- Onbekende transacties blijven zonder categorie totdat een regel of bewuste gebruikerskeuze een categorie bepaalt.
- Voorstellen zijn uitlegbaar en corrigeerbaar. Financiële totalen volgen de opgeslagen gegevens en het rekencontract.
- Gebruikersbeheer en herstel zijn voorbehouden aan de eigenaar. Een beheerder mag financiële gegevens beheren; een alleen-lezen gebruiker mag die uitsluitend bekijken en de eigen beveiligingsinstellingen beheren.
- Back-upherstel vereist een geslaagde controle van hetzelfde bestand en dezelfde selectie, gevolgd door expliciete bevestiging.
- Publiceer uitsluitend fictieve voorbeelden. Omgevingsconfiguratie, back-ups en persoonlijke financiële gegevens blijven buiten Git.

## Verificatie en technische uitwerking

| Onderwerp | Uitwerking | Controle |
| --- | --- | --- |
| Import en duplicaten | `src/modules/finance/bank-import.ts`, `bank-import-camt.ts`, `repository.ts` | Importparser- en vergrendelingstests in `tests` |
| Saldi en vermogen | Rekeningobservaties en vermogensmodel | Saldoverloop- en vermogenstests |
| Budgetten en planning | Maandbudgetten, inkomstenpatronen en kasstroomadvies | Budget-, frequentie-, planning- en scenariotests |
| Financiële uitkomsten | [Financieel rekencontract](financieel-rekencontract-v1.md) | Contract- en prognosetests |
| Export en herstel | [CSV-contract](csv-productcontract-v1.md), [back-up en herstel](back-up-en-herstel.md) | CSV- en integriteitstests |
| Toegang en configuratie | [Veiligheid en privacy](veiligheid-en-privacy.md) | Configuratietests en productievalidatie |
| Release | [Installatie en beheer](installatie-en-beheer.md) | `npm run release:check` en live validatie |

Een geslaagde geautomatiseerde controle bewijst uitsluitend het gedrag dat die controle afdekt. Ervaringen in de interface en herstelprocedures moeten ook in een eigen testomgeving worden beoordeeld.
