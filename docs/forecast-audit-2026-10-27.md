# Controle formules en forecasting — 27 oktober 2026

## Reikwijdte

Broncode, rekencontract, bestaande regressietests en de lokale Docker/PostgreSQL-database zijn gecontroleerd. De databasecontrole is alleen-lezen uitgevoerd en rapporteert geen persoonsgegevens of bedragen. Productie is niet gewijzigd.

## Herstelde fouten

- Herhaalde maand-, kwartaal- en jaarbetalingen verloren hun oorspronkelijke dag na een korte maand. Bijvoorbeeld 31 januari → 28 februari → 28 maart. Alle volgende momenten worden nu vanaf de oorspronkelijke brondatum berekend: 31 januari → 28 februari → 31 maart. Dit geldt ook wanneer een oude bron meerdere perioden moet worden doorgeschoven. Vierwekelijkse betalingen blijven exact 28 dagen uit elkaar liggen.
- De historische saldoraming nam een gedeeltelijke huidige maand mee in het gemiddelde en de volatiliteit. De training gebruikt nu uitsluitend afgeronde maanden.
- Maanden zonder transacties werden overgeslagen. Binnen de waargenomen kalenderperiode tellen deze nu als nul mee. Dat veronderstelt wel dat de import volledig is; ontbrekende importdata zijn hiermee niet automatisch vastgesteld.
- De saldoraming gebruikte transacties van gearchiveerde rekeningen tegenover saldi van actieve rekeningen. Beide kanten gebruiken nu dezelfde actieve rekeningen. Toekomstige transactiedatums zijn uitgesloten.
- De maandgrens werd in UTC bepaald. De saldoraming gebruikt nu de Amsterdamse maand.
- Zonder voldoende historie werden toch zes voorspellingen gemaakt. Daarvoor zijn nu minimaal drie afgeronde kalendermaanden nodig, met een zichtbare melding wanneer historie ontbreekt.
- De term betrouwbaarheidsband suggereerde een gekalibreerde statistische zekerheid. Het model toont nu indicatieve spreiding: historische steekproefstandaardafwijking × √horizon. Hieraan is geen dekkingspercentage gekoppeld.

De hoofdformule voor veilig te besteden en de versie van het rekencontract blijven gelijk. Dit zijn correcties van kalenderverwerking en het afzonderlijke historische saldomodel.

## Controle en bewijs

Regressietests dekken maandgrenzen, doorschuiven van oude bronnen, onvolledige maanden, ontbrekende kalendermaanden, onvoldoende historie en aansluiting van historische saldi. De bestaande tests voor veilig te besteden, budgetprognose, inkomen en vierwekelijkse patronen blijven van toepassing.

De lokale database leverde twaalf trainingsmaanden, dertien historische punten inclusief de huidige stand en zes prognosepunten op. Alle uitkomsten waren eindig, de huidige stand sloot exact aan, de training bevatte alleen voltooide maanden en alle onder-/bovengrenzen omvatten de middenraming.

## Bevindingen na de eerste controle

1. **Inkomensbedragen per betalingsperiode.** De inkomensherkenning telt bedragen per kalendermaand op, ook wanneer het herkende ritme vierwekelijks is. Een maand met twee betalingen kan de bedragsschatting vertekenen. Per frequentie aggregeren vereist een expliciete wijziging van het rekencontract en gerichte reconciliatie.
2. **Afwijking is geen zekerheid.** De inkomensschatting kan tegelijk de status afwijking en hoge historische zekerheid hebben. De onzekerheidsbuffer volgt momenteel alleen die zekerheid. Onderzoek een aparte behandeling van bedragsspreiding en afwijkingen voordat de bufferformule wordt aangepast.
3. **Budgetplafond versus werkelijk gedrag.** De variabele uitgaven volgen het geplande budget en stoppen bij het resterende budget. Na overschrijding kan de verwachte extra uitgave dus nul worden. Dit voldoet aan het huidige contract, maar kan uitgaven onderschatten. Een gedragsschatting op basis van recente uitgaven moet afzonderlijk herkenbaar worden gemaakt en achteraf worden getoetst.
4. **Saldoraming is een historische basislijn.** Geen seizoensmodel, geen correctie voor incidentele grote kasstromen, en geen expliciete raming van het restant van de huidige maand. De punten vertegenwoordigen maandstappen vanaf de actuele stand, geen gereconcilieerde toekomstige maandafsluitingen. Gebruik de gebeurtenisgestuurde Vooruit-planning voor concrete betaalmomenten.
5. **Schatting vaste betaaldatum.** Historische datums worden afzonderlijk vooruitgeschoven en gemiddeld. Rond een peildatum midden in het betaalvenster kunnen die projecties in verschillende maanden vallen. Ook bewijst de eerste-werkdagregel alleen weekendcorrectie, geen feestdagenkalender.
6. **Datakwaliteit.** Saldi met verschillende peildatums en onvolledige transactie-imports beperken de bruikbaarheid van historische reconstructie. Nulmaanden zijn geen bewijs dat er werkelijk geen kasstromen waren.

Een volgende modelversie moet historische peildatums naspelen met uitsluitend de toen beschikbare gegevens. Vergelijk met een eenvoudige historische basislijn, meet absolute bedragfouten en datumfouten apart, en toets hoe vaak een getoond bereik de werkelijke uitkomst omvat. Pas daarna kunnen een nauwkeuriger model en een kanspercentage verantwoord worden gekozen.


## Vervolg uitgevoerd: rekencontract 1.1.0

Onderstaande wijzigingen vervangen de openstaande onderdelen van de eerste controle. De eerdere beschrijving blijft staan als vastlegging van het gevonden gedrag.

| Bevinding | Uitgevoerd |
| --- | --- |
| Vierwekelijks inkomen | Schatting per betaaldag, inclusief optellen van deelbetalingen op die dag; geen samenvoeging van twee termijnen in één maand. |
| Afwijkend en wisselend inkomen | Lage zekerheid bij grote bedragsspreiding of recente afwijking; een afwijking krijgt ook bij doorgegeven hoge zekerheid twee extra dagen uitgavenbuffer. |
| Uitgaven na budgetoverschrijding | Raming blijft uitgaan van budgettempo. Vanaf drie bruikbare historische maanden kan de mediaan van het historische dagtempo de verwachting verhogen; scherm en CSV tonen dezelfde berekening. |
| Historische saldoraming | Vergelijking van gemiddelde en mediaan met historische maandstappen; keuze voor mediaan alleen bij minstens zes toetsstappen en minstens 10% lagere absolute fout. Ramingen houden nu rekening met het restant van de huidige maand en zijn bedoeld als einde-maandpunten. |
| Gemengde betaaldatumprojecties | Historische dagen worden eerst naar één gezamenlijke kalendercyclus geprojecteerd. Vierwekelijkse datums blijven exact 28 dagen volgen, ook in een weekend. Ongeldige en toekomstige waarnemingen worden uitgesloten. |
| Datakwaliteit | Mogelijk onvolledige startmaanden uitgesloten. Zichtbare meldingen bij ontbrekende historie, nulmaanden en ontbrekende, verschillende, toekomstige of oude saldodatums. |

### Verificatie van het vervolg

- `npm run check`: lint, typecontrole, 109 tests en productiebuild geslaagd.
- `npm run forecast:audit`: lokale PostgreSQL-database gecontroleerd met databaseverbindingen die alleen-lezen afdwingen. Schermmodel, hoofdformule en CSV sluiten exact aan onder versie 1.1.0.
- Lokale uitkomst: twaalf trainingsmaanden, zes prognosepunten en negen historische toetsstappen. Het gemiddelde blijft op deze dataset de gekozen methode.
- De lokale controle meldt één datakwaliteitspunt. Er zijn geen automatisch geschatte inkomensbronnen actief in deze controle; de wijzigingen daarvoor zijn met gerichte regressietests geverifieerd. De historische budgetverhoging is op deze dataset niet toegepast en is eveneens met regressietests gecontroleerd.
- Er is geen productie-uitrol uitgevoerd en er zijn geen financiële gegevens gewijzigd.

### Grenzen die blijven gelden

Historische maandtoetsen reconstrueren perioden uit de huidige transactiehistorie. Zij gebruiken geen latere boekingsmaanden als training, maar kunnen latere imports of categorisatiecorrecties van oude transacties niet ongedaan maken. Het is dus geen volledige reconstructie van alles wat de toepassing destijds wist. De getoonde foutmaat is een toets van één maandstap en geen onafhankelijke validatie van modelselectie of zesmaandsnauwkeurigheid.

De mediaan kan een incidentele grote kasstroom minder bepalend maken, maar een structurele verandering of seizoenspatroon wordt nog niet expliciet gemodelleerd. Onvolledige imports zijn zonder bankdekking niet sluitend vast te stellen. Er wordt geen kanspercentage aan de indicatieve spreiding gekoppeld. De bankregel voor de eerste werkdag behandelt alleen weekenden; feestdagen zijn geen gegarandeerde verschuiving. Budgetcategorieën zonder maandplan vallen nog buiten de uitgavenraming.

De concrete definities, rekenvoorbeelden en verschillen met 1.0.0 staan in het [rekencontract 1.1.0](financieel-rekencontract-v1.md).

## Tweede vervolg: rekencontract 1.2.0

Bij een nieuwe controle van Vandaag bleek de grens “Budgetcategorieën zonder maandplan vallen nog buiten de uitgavenraming” in de praktijk zwaar te wegen. Samen met de stop op de maandgrens kon veilig te besteden daardoor fors te hoog uitvallen.

| Bevinding | Uitgevoerd |
| --- | --- |
| Geen maandbudget voor de huidige maand | Alle actieve categorieën van type `variabele_uitgave` en `reservering` doen mee. Zonder budget telt het historische mediaantempo; een ontbrekend maandplan geeft dus geen verwachting van nul meer. |
| Horizon na de maandgrens | De raming stopt niet meer op de eerste dag van de volgende maand. Elke kalendermaand tot de horizon gebruikt haar eigen budget, met het historische tempo als ondergrens. Een budget van deze maand wordt niet doorgetrokken naar de volgende maand. |
| Betaaldag | Een handmatig gepland inkomen op de peildatum is niet meer de horizon zodra er die dag al structureel inkomen is geboekt. Dat inkomen zit dan al in de bankstand. |
| Efficiëntie | De historische uitgavenquery leest alleen de laatste zes maanden. Expressie-indexen (migratie 046) versnellen het zoeken van eerdere betalingen per tegenpartij voor vaste lasten en categoriesuggesties. |

### Verificatie

- `npm run check`: lint, typecontrole, 111 tests en productiebuild geslaagd. Regressietests dekken budget per maand over de maandgrens, ontbrekend budget met en zonder voldoende historie, en het niet doortrekken van het budget van deze maand.
- `npm run forecast:audit` op de lokale database: scherm, hoofdformule en CSV sluiten exact aan onder versie 1.2.0. De historische budgetverhoging wordt nu toegepast.
- Lokale uitkomst op peildatum 27 oktober met horizon 15 november: de verwachte variabele uitgaven gaan van € 0 (geen budget voor oktober, stop op 1 november) naar € 2.412. Vaste lasten tot de horizon sluiten aan op de Vooruit-planning.
- Uitgerold naar productie als commit `75a5a43`; de healthchecks zijn geslaagd. De reconciliatie op productiedata (wijzigingsregel 4 van het rekencontract) is nog niet uitgevoerd.

### Open punten

- Een vaste last die vóór de horizon twee keer valt (bijvoorbeeld vierwekelijks), telt in Vandaag één keer; de Vooruit-planning telt beide termijnen. Op de lokale dataset komt dit nu niet voor.
- Uitgaven zonder categorie tellen niet mee in het historische tempo.
- De betaaldagregel heeft nog geen eigen regressietest, omdat de logica in de databasefunctie zit.
