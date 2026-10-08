# Installatie- en beheerhandleiding

Deze handleiding beschrijft de eerste lokale installatie, dagelijks ontwikkelen, testen, back-up en restore, en deployen naar productie.

## Welke opdracht heb ik nodig?

| Doel | Opdracht |
| --- | --- |
| Eerste lokale installatie | `npm ci`, daarna `docker compose --env-file .env.local up -d postgres` en `npm run db:setup` |
| Dagelijks lokaal starten | `bash scripts/dev.sh` |
| Alleen database starten | `docker compose --env-file .env.local up -d postgres` |
| Nieuwe migraties uitvoeren | `npm run db:migrate` |
| Alle controles voor een release | `npm run release:check` |
| Naar productie deployen | `bash scripts/deploy-remote.sh --confirm-production` |
| Productie na deploy controleren | `npm run prod:validate` |
| Beschikbare rollbackpunten bekijken | `bash scripts/rollback-remote.sh --list` |
| Docker- en appstatus bekijken | `docker compose --env-file .env.local ps` |

## Vereisten

- Node.js 22.12 of nieuwer.
- npm, meegeleverd met Node.js.
- Docker Desktop op macOS/Windows of Docker Engine met Compose op Linux.
- Voor productie-deploys: `ssh` en `rsync` op de ontwikkelmachine.
- Toegang tot de productieserver voor deploys.

Controleer de installatie:

```bash
node --version
npm --version
docker --version
docker compose --env-file .env.local version
docker info
```

Als `docker info` meldt dat de daemon niet bereikbaar is, start dan eerst Docker Desktop en probeer het opnieuw.

Stel `USER_PASSWORD` voor gebruikersbeheer privé in via de omgeving. `user:create` accepteert e-mail, naam en optioneel de rol; wachtwoorden worden niet als opdrachtargument meegegeven.

## Eerste lokale installatie

Voer deze opdrachten uit vanuit de hoofdmap van het project:

```bash
npm ci
cp .env.example .env.local
# Vul je eigen database- en accountconfiguratie in .env.local in.
docker compose --env-file .env.local up -d postgres
npm run db:setup
bash scripts/dev.sh
```

Open daarna [http://localhost:3001](http://localhost:3001).

Configureer je eigen account via `SEED_ADMIN_EMAIL` en `SEED_ADMIN_PASSWORD` in het lokale omgevingsbestand. Er zijn geen standaard inloggegevens.

`npm run db:setup` voert eerst alle migraties uit en seedt daarna de lokale categorieën, regels en ontwikkelgebruiker. Gebruik dit bij de eerste installatie. Bij een bestaande database is normaal alleen `npm run db:migrate` nodig.

## Dagelijks lokaal werken

De gemakkelijkste startopdracht is:

```bash
bash scripts/dev.sh
```

Dit script:

1. maakt de gekozen ontwikkelpoort vrij;
2. stopt een eventueel draaiende Docker-appcontainer;
3. start de PostgreSQL-container;
4. start Next.js op poort 3001.

Gebruik desgewenst een andere poort:

```bash
bash scripts/dev.sh 3005
```

Voer na het ophalen van nieuwe code ook de migraties uit:

```bash
npm run db:migrate
```

Handmatig starten kan eveneens:

```bash
docker compose --env-file .env.local up -d postgres
npm run dev -- --port 3001
```

Stop de ontwikkelserver met `Ctrl+C`. Stop alleen de lokale database met:

```bash
docker compose --env-file .env.local stop postgres
```

## Beschikbare npm-scripts

| Script | Functie |
| --- | --- |
| `npm run dev -- --port 3001` | Start Next.js in ontwikkelmodus. |
| `npm run build` | Maakt een productie-build. |
| `npm run start` | Start een eerder gemaakte productie-build. |
| `npm run lint` | Controleert de code met ESLint. |
| `npm run typecheck` | Controleert TypeScript zonder bestanden te schrijven. |
| `npm test` | Draait de geautomatiseerde tests. |
| `npm run check` | Draait lint, typecheck, tests en build. |
| `npm run release:check` | Draait lint, typecheck, tests, build, migraties en de productie-deployguard. |
| `npm run db:migrate` | Voert alleen nog niet uitgevoerde SQL-migraties uit. |
| `npm run db:seed` | Seedt standaardcategorieën, regels en de ingestelde eigenaar. |
| `npm run db:setup` | Draait `db:migrate` en daarna `db:seed`. |
| `npm run prod:validate` | Controleert de live healthcheck, login, beveiligingsheaders, kernroutes en rapportexport. |
| `npm run ux:smoke` | Test de belangrijkste UX-routes in lokaal Chrome en maakt desktop- en mobiele screenshots in `/tmp`. |

## Controleren voor een deploy

Zorg dat de lokale PostgreSQL-container draait en voer daarna uit:

```bash
docker compose --env-file .env.local up -d postgres
npm run release:check
```

Een geslaagde releasecheck deployt nog niets. Zonder expliciete productiebevestiging moet de deployguard de deploy juist blokkeren.

## Back-up maken en herstellen

Back-up en restore lopen via de applicatie; hiervoor is geen apart shellscript nodig.

### Back-up maken

1. Log in als eigenaar of beheerder.
2. Open `/exporteren`.
3. Kies **JSON back-up**.
4. Controleer dat het gedownloade bestand groter is dan 0 bytes.
5. Bewaar het bestand op een tweede locatie.

Een JSON-back-up bevat een manifest met schema-versie, exportdatum en aantallen per tabel.

### Back-up controleren zonder wijzigingen

1. Log in als eigenaar.
2. Open `/exporteren`.
3. Selecteer het JSON-bestand bij **Restore vanuit JSON back-up**.
4. Kies eerst **Dry-run controleren**.
5. Ga alleen verder als **Dry-run akkoord** wordt getoond en het rijenaantal klopt.

### Restore uitvoeren

1. Maak eerst een nieuwe back-up van de huidige situatie.
2. Selecteer daarna de te herstellen back-up.
3. Voer opnieuw de dry-run uit.
4. Kies **Restore uitvoeren**.
5. Controleer daarna dashboard, rekeningen, transacties, vaste lasten en rapportages.

De restore vervangt de financiële tabellen binnen één databasetransactie. Gebruikers en actieve sessies blijven bestaan. Alleen een gebruiker met de rol `owner` kan herstellen.

## Eerste productie-inrichting

De productie-deploy gebruikt twee bestanden die niet in Git staan:

- `infra/.env.deploy` op de ontwikkelmachine: SSH-doel en remote map.
- `infra/.env.prod` op de productieserver: database-, applicatie- en validatieconfiguratie.

Maak lokaal de deployconfiguratie:

```bash
cp infra/.env.deploy.example infra/.env.deploy
```

Vul minimaal `DEPLOY_HOST` en `DEPLOY_DIR` in. Maak daarnaast een productieconfiguratie op basis van:

```bash
cp infra/.env.prod.example infra/.env.prod
```

Vervang alle voorbeeldwaarden en gebruik sterke, unieke wachtwoorden. Plaats `infra/.env.prod` vervolgens in dezelfde projectmap op de productieserver. Het deployscript synchroniseert dit bestand bewust niet en overschrijft het dus niet.

De server heeft Docker Engine met Compose nodig. DNS, TLS en de reverse proxy vallen buiten het deployscript en moeten afzonderlijk naar `APP_HOST_PORT` verwijzen.

## Productie deployen

Voer vanaf de ontwikkelmachine uit:

```bash
npm run release:check
bash scripts/deploy-remote.sh --confirm-production
npm run prod:validate
```

Het deployscript:

1. bewaart de huidige broncode als rollbackpunt en synchroniseert daarna via `rsync`;
2. start PostgreSQL;
3. bouwt de operations-container;
4. voert migraties uit;
5. bouwt en herstart de app-container;
6. controleert de lokale en publieke healthcheck.

Migratie `038_wealth_account_types.sql` voegt `beleggingsrekening` en `schuld` toe naast betaal- en spaarrekeningen. Voer een schuld als negatieve bankstand in; zo trekt die automatisch van het netto vermogen af.

De optie `--confirm-production` is verplicht. Zonder deze optie wordt niets gedeployed.

De vijf nieuwste broncode-snapshots blijven op de server bewaard. Zie [Gecontroleerde uitrol](gecontroleerde-uitrol.md) voor de naamkeuze, privacyarme productstatus, compatibele routes en de exacte rollbackprocedure.

## Productie controleren en problemen onderzoeken

Publieke healthcheck:

```bash
curl -fsS https://huishouden.latero.nl/api/health
```

Volledige productiecontrole:

```bash
npm run prod:validate
```

Status op de productieserver:

```bash
cd /opt/huishouden
docker compose --env-file .env.local --env-file infra/.env.prod ps
docker compose --env-file .env.local --env-file infra/.env.prod logs --tail=200 app
docker compose --env-file .env.local --env-file infra/.env.prod logs --tail=200 postgres
```

Bij een mislukte deploy: wijzig geen productiegegevens handmatig. Lees eerst de containerlogs. Herstel zo nodig een bekende snapshot met `bash scripts/rollback-remote.sh --confirm-production <release-id>` en voer daarna `npm run prod:validate` uit.

## Gebruikersbeheer

Beheer gebruikers normaal via `/beheer` als eigenaar.

Lokale gebruiker aanmaken:

```bash
npm run user:create -- gebruiker@example.nl "Naam gebruiker" admin
```

Mogelijke rollen zijn `owner`, `admin` en `readonly`.

Lokaal wachtwoord herstellen:

```bash
npm run user:set-password -- gebruiker@example.nl
```

Het wachtwoordscript trekt bestaande sessies van die gebruiker in en verifieert de nieuwe hash direct.

## Veelvoorkomende problemen

### Docker daemon is niet bereikbaar

Start Docker Desktop en controleer daarna:

```bash
docker info
docker compose --env-file .env.local up -d postgres
```

### Poort 3001 is al bezet

Gebruik `bash scripts/dev.sh`; dit script maakt de poort vrij. Of kies bewust een andere poort:

```bash
npm run dev -- --port 3005
```

### Databaseverbinding mislukt

Controleer eerst:

```bash
docker compose --env-file .env.local ps
docker compose --env-file .env.local logs --tail=100 postgres
```

De lokale standaarddatabase luistert op `localhost:5434`.

### Nieuwe databasekolom ontbreekt

Voer de migraties uit en herstart de ontwikkelserver:

```bash
npm run db:migrate
bash scripts/dev.sh
```

## Omgevingsconfiguratie

Vul vóór het starten `POSTGRES_USER`, `POSTGRES_PASSWORD` en `DATABASE_URL` in het private omgevingsbestand in. `DATABASE_URL` verwijst lokaal naar de gepubliceerde databasepoort; in Docker verwijst die naar de service `postgres`. Gebruik voor het eerste account zelfgekozen waarden voor `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME` en `SEED_ADMIN_PASSWORD` (minimaal twaalf tekens). Er zijn geen ingebouwde accountgegevens of databasewachtwoorden.

CLI-beheerscripts lezen lokaal `.env.local`. Geef Docker Compose hetzelfde bestand via `--env-file .env.local`. Op productie wordt uitsluitend de private `infra/.env.prod` gebruikt. Commit deze bestanden nooit.
