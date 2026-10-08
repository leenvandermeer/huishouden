# Back-up, integriteit en herstel

De volledige JSON-back-up is bedoeld voor herstel. CSV-bestanden zijn bedoeld voor analyse en zijn geen restoreformaat.

## Integriteitscontrole

Nieuwe JSON-back-ups bevatten SHA-256-checksums voor iedere tabel en voor de volledige dataset. Een dry-run controleert toepassing, schemaversie, rijenaantallen en checksums. Oudere schema-v1-back-ups zonder checksum blijven leesbaar, maar worden als `legacy` gemarkeerd.

Een restore kan alleen plaatsvinden nadat dezelfde eigenaar in de voorafgaande 30 minuten een geslaagde dry-run met exact hetzelfde bestand én dezelfde gegevensselectie heeft uitgevoerd. De goedkeuring is eenmalig en wordt na gebruik ongeldig. De dry-run rapporteert per tabel hoeveel rijen nieuw zijn, worden overschreven of verdwijnen. De eigenaar kan de volledige back-up of alleen budgetten, planning/vaste lasten, categorisatieregels, rapportstatussen of auditlog herstellen. Alleen de gekozen tabellen worden vervolgens binnen één database-transactie vervangen; gebruikers en actieve sessies blijven buiten de restore. Schema-v1-back-ups van vóór nieuwere tabellen blijven compatibel en krijgen voor ontbrekende optionele verzamelingen veilige standaardwaarden.

## Sleutelbeheer

- `TOTP_ENCRYPTION_KEY` versleutelt 2FA-geheimen en moet 64 willekeurige hex-tekens bevatten.
- Bewaar productiegeheimen uitsluitend in `infra/.env.prod` op de server; dit bestand wordt niet gesynchroniseerd of opgenomen in een back-up.
- Roteer de sleutel alleen met een vooraf getest migratieplan voor bestaande 2FA-geheimen.
- Deel JSON-back-ups niet via onbeveiligde e-mail: ze bevatten financiële persoonsgegevens.

## Controlefrequentie

- Maak minimaal wekelijks een volledige JSON-back-up.
- Voer minimaal ieder kwartaal een dry-run uit.
- Test periodiek een echte restore in een geïsoleerde Docker-database, nooit rechtstreeks als repetitie op productie.

Gebruik voor een geïsoleerde database `BACKUP_FILE=/pad/back-up.json DATABASE_URL=postgresql://.../huishouden_rehearsal npm run backup:rehearse`. Het script weigert databases waarvan de URL niet herkenbaar `rehearsal` of `test` bevat.

De pagina `Exporteren` toont wanneer de laatste back-up, dry-run en echte restore zijn geregistreerd. Het auditlog beschrijft deze gebeurtenissen in gewone taal.

## Offline cache

Een offline, alleen-lezen cache is onderzocht maar nog niet geactiveerd. Zonder versleutelde opslag en een betrouwbare wisstrategie zou een service-worker financiële bedragen op gedeelde apparaten kunnen achterlaten. De huidige veilige keuze is daarom `Cache-Control: no-store` voor financiële routes.
