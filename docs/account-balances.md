# Rekeningstanden en onvolledige historie

Status: geimplementeerd.

## Probleem

Een bankbestand bevat niet altijd volledige historie. Daardoor kan de applicatie het actuele saldo niet betrouwbaar afleiden door alle transacties op te tellen wanneer eerdere jaren ontbreken.

## Keuze

Een rekening heeft daarom een expliciete bankstand met peildatum:

- `balance`: actuele bekende bankstand;
- `balance_date`: datum waarop deze bankstand geldt;
- `balance_checked_at`: exact moment waarop de bankstand is vastgelegd;
- `balance_source`: `import` of `manual`;
- `opening_balance`: administratieve correctiewaarde voor het ontbreken van historie;
- `opening_balance_date`: peildatum waarop die correctie is bepaald.

Een handmatig gezette bankstand maakt geen transactie aan. Dat is bewust: anders zouden uitgaven, inkomsten of categorieen worden vervuild.

Bij een handmatige herijking is de datum zichtbaar in de UX, maar intern wordt ook het exacte opslagmoment vastgelegd. Transacties met een latere boekdatum tellen daarna mee in het doorlopende saldo. Als er op dezelfde kalenderdag later nog transacties worden geimporteerd, gebruikt de app de importtijd als tie-breaker: transacties die al bekend waren tijdens de herijking zitten in de bankstand, nieuwe transacties daarna bewegen het saldo verder.

Rekeningnaam en rekeningtype zijn beheerinstellingen in de app. Alle beheerde rekeningen zijn eigen rekeningen. Een nieuwe bankimport maakt ontbrekende rekeningen aan en werkt het rekeningtype bij op basis van de importherkenning.

## Gebruik

Ga naar `Rekeningen` en vul per rekening de actuele bankstand in met peildatum. De rapportages en het rekeningenscherm gebruiken daarna deze bankstanden voor saldi.

Nieuwe imports overschrijven een handmatig gezet saldo niet automatisch.

Na import toont `/importeren` een afsluitchecklist met rekeningen, saldi, categorie-review en spaarrekeningcontrole. Hetzelfde scherm toont per rekening de bankstand, het berekende saldo uit transacties en het verschil. Een verschil van minimaal 1 cent blijft zichtbaar als aandachtspunt totdat de rekeningstand of import klopt.

Een foutieve import kan vanuit `Laatste imports` worden teruggedraaid na expliciete checkboxbevestiging. De app verwijdert dan de transacties van die import, ruimt de importregistratie op en bouwt saldi, `last_import_at` en virtuele potjes opnieuw op uit de resterende transacties.

Rekeningen tonen betaal- en spaarsaldo apart. Sparen wordt primair als een spaarrekening gecontroleerd: de actuele bankstand is leidend en de bij- en afschrijvingen verklaren de beweging. Overboekingen naar sparen blijven apart zichtbaar in rapportages; virtuele reserveringsverdelingen bepalen de saldocijfers niet meer in de primaire UX.

De bekende spaarrekening NL93 RABO 1012 7315 37 krijgt standaard de displaynaam `Rabo DoelSparen`, zodat transacties niet terugvallen op een technische importnaam zoals `Rabobank 1537`.

Aliases op `Rekeningen` koppelen meerdere rekeningnotaties aan dezelfde rekening. Gebruik dit wanneer een bankbestand een IBAN, BBAN of rekeningnummer anders schrijft dan de bestaande rekening.
