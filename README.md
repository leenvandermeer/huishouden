# Huishouden

Huishouden is een persoonlijk huishoudboekje dat overzicht geeft over je inkomsten, uitgaven, rekeningen en spaargeld. Je importeert banktransacties, verdeelt uitgaven over categorieën en ziet wat er deze maand overblijft.

## Wat kun je ermee?

- **Dagelijks overzicht:** bekijk je saldi, beschikbare ruimte en posten die aandacht vragen.
- **Banktransacties:** importeer CSV, CAMT.053 of MT940, controleer de preview en voeg nieuwe transacties toe. Bestaande transacties worden herkend.
- **Inkomsten en uitgaven:** categoriseer betalingen en bewaar regels voor terugkerende tegenpartijen.
- **Budgetten:** plan per maand hoeveel je wilt besteden en vergelijk dat met je werkelijke uitgaven.
- **Vaste lasten:** houd terugkerende betalingen en inkomsten bij.
- **Sparen en vermogen:** volg betaalrekeningen, spaargeld, beleggingen en schulden.
- **Vooruitkijken:** bekijk verwachte inkomsten en uitgaven en onderzoek het effect van een financiële keuze.
- **Rapportages:** vergelijk maanden, kwartalen en jaren en ontdek waar je geld naartoe gaat.
- **Back-up en export:** download je gegevens en herstel een back-up na controle.

Overboekingen tussen eigen rekeningen worden apart herkend, zodat inkomsten en uitgaven niet dubbel meetellen. Bedragen in overzichten en exports zijn herleidbaar naar de opgeslagen transacties.

## Een bankbestand toevoegen

Exporteer transacties bij je bank en kies het bestand onder **Importeren**. Controleer de rekening, het aantal transacties en welke betalingen al bekend zijn. Pas na bevestiging worden nieuwe transacties opgeslagen. Daarna kun je categorieën en rekeningstanden controleren.

## Zelf installeren

De applicatie gebruikt Next.js, TypeScript en PostgreSQL. Voor een lokale installatie heb je Node.js 22.12+, npm en Docker nodig. Stel je eigen configuratie in via een lokaal omgevingsbestand; persoonlijke gegevens en geheimen horen buiten Git.

Zie de [installatie- en beheerhandleiding](docs/installatie-en-beheer.md) voor de inrichting en het starten van de applicatie.

## Ontwikkelen en deployen

Voer vóór iedere release `npm run release:check` uit. Commit de wijzigingen, push ze naar `origin/main` en deploy met `bash scripts/deploy-remote.sh --confirm-production`. De server haalt de gecontroleerde Git-commit op. Controleer daarna de live applicatie met `bash scripts/validate-production.sh` op de server.

Meer informatie staat in de [business requirements](docs/business-requirements.md), de [handleiding voor back-up en herstel](docs/back-up-en-herstel.md) en het [financiële rekencontract](docs/financieel-rekencontract-v1.md).

De [documentatie-index](docs/README.md) verwijst naar de gebruikershandleiding, architectuur, veiligheid en alle productafspraken.
