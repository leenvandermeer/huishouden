# Installatie en beheer

## Vereisten

Gebruik Node.js 22.12 of nieuwer, npm, Git en Docker met Compose. Voor remote deploys zijn SSH-toegang en Docker op de server nodig. Richt TLS en een reverse proxy afzonderlijk in voor een publieke installatie.

## Lokale installatie

```bash
npm ci
cp .env.example .env.local
```

Vul vóór het starten je eigen waarden in `.env.local` in:

| Variabele | Betekenis |
| --- | --- |
| `POSTGRES_USER` | Zelfgekozen databasegebruiker |
| `POSTGRES_PASSWORD` | Zelfgekozen databasewachtwoord |
| `DATABASE_URL` | Verbindings-URL met dezelfde gegevens, host en database |
| `SEED_ADMIN_NAME` | Weergavenaam voor het eerste account |
| `SEED_ADMIN_EMAIL` | E-mailadres voor het eerste account |
| `SEED_ADMIN_PASSWORD` | Eigen wachtwoord van minimaal twaalf tekens |
| `TOTP_ENCRYPTION_KEY` | 64 willekeurige hex-tekens voor tweefactorversleuteling |
| `TOTP_PENDING_SECRET` | Optionele aparte signing secret van minimaal 32 tekens |

Lokaal verwijst de database-URL naar `localhost`, poort `5434` en database `huishouden`. Binnen Docker verwijst de URL naar de service `postgres`, poort `5432`. Er zijn geen ingebouwde inloggegevens. Bewaar het ingevulde bestand buiten Git.

```bash
docker compose --env-file .env.local up -d postgres
npm run db:setup
bash scripts/dev.sh
```

De webapp is lokaal beschikbaar op `http://localhost:3001`. De CLI-scripts lezen `.env.local`. `db:setup` voert migraties uit en maakt standaardcategorieën, regels en het geconfigureerde eigenaarsaccount aan. Het vult geen voorbeeldtransacties of budgetten in.

Voor dagelijks gebruik volstaat `bash scripts/dev.sh`. Een andere ontwikkelpoort kan met `bash scripts/dev.sh 3005` worden gekozen. Dit script stopt processen op de gekozen poort en een eventueel draaiende lokale appcontainer.

## Optionele instellingen

`RABOBANK_SAVINGS_IBANS` kan privé een met dubbele punten gescheiden lijst spaarrekeningen bevatten voor importherkenning. Het lege voorbeeld bevat geen echte rekeningnummers. Controleer rekeningtypen ook in de importpreview.

`COUNTER_ACCOUNT_KEY_SECRET` kan een stabiele aparte sleutel voor gehashte tegenrekeningfilters leveren. Zonder deze instelling gebruikt de toepassing de private databaseconfiguratie. Een gewijzigde sleutel kan bestaande filterlinks ongeldig maken.

## Gebruikers beheren

De eigenaar kan gebruikers beheren via de app. Voor CLI-beheer stel je `USER_PASSWORD` privé in via de omgeving of `.env.local`. Geef het wachtwoord niet mee als opdrachtargument.

```bash
npm run user:create -- gebruiker@example.nl "Naam gebruiker" admin
npm run user:set-password -- gebruiker@example.nl
```

`SEED_ADMIN_PASSWORD_FORCE=true` is uitsluitend bedoeld voor een bewuste reset via de seedprocedure. Een gewone seed bewaart het wachtwoord en de weergavenaam van een bestaand account.

## Controleren

| Opdracht | Controle |
| --- | --- |
| `npm run lint` | Broncodecontrole |
| `npm run typecheck` | TypeScript |
| `npm test` | Geautomatiseerde tests |
| `npm run build` | Productiebuild |
| `npm run release:check` | Alle bovenstaande controles, migraties en deploy-/rollbackguards |

UX-controles gebruiken zelf ingestelde `UX_TEST_EMAIL`, `UX_TEST_PASSWORD` en `UX_TEST_ACCOUNT_ID`; er is geen vast testaccount. Voer tests die gegevens wijzigen uit in een eigen testomgeving.

## Productieconfiguratie

Kopieer `infra/.env.prod.example` naar de private `infra/.env.prod` op de server. Vul databasegegevens, applicatie-URL, poorten, accountconfiguratie en sleutels in. De database-URL gebruikt in deze Docker-opstelling de service `postgres`.

Stel lokaal `DEPLOY_HOST` en `DEPLOY_DIR` in `infra/.env.deploy` in. De server moet de Git-repository kunnen ophalen. Een eigen fork vereist ook het aanpassen van `DEPLOY_REPOSITORY` in `scripts/deploy-remote.sh` naar de eigen repository.

Productieconfiguratie, back-ups, lokale dependencies en buildoutput horen buiten Git. De voorbeeldbestanden zijn geen werkende productieconfiguratie.

## Git-deploy

```bash
npm run release:check
git add .
git commit -m "Beschrijf de wijziging"
git push origin main
bash scripts/deploy-remote.sh --confirm-production
```

De deploy vereist een schone lokale checkout waarvan de commit gelijk is aan `main` op de repository. De server maakt een broncodesnapshot, haalt de gecontroleerde commit op en stopt bij gewijzigde tracked productiecode. Vervolgens worden migraties uitgevoerd en wordt de app gebouwd en herstart. Het script toont de commit en het rollbackpunt.

De lokale, vooraf gekozen commit blijft bepalend: `deploy.sh` voert geen ongecontroleerde `git pull` uit. Een andere branch of niet-gepushte wijziging wordt niet stilzwijgend gedeployed.

## Live controleren

Voer op de server vanuit de projectmap uit:

```bash
bash scripts/validate-production.sh
```

De controle gebruikt de private configuratie voor health, headers, aanmelden, kernroutes, redirects en exportrechten. Je kunt een apart `VALIDATION_EMAIL` en `VALIDATION_PASSWORD` instellen. `VALIDATION_CAN_EXPORT` geeft aan of dat account exportrechten hoort te hebben.

## Rollback

```bash
bash scripts/rollback-remote.sh --list
bash scripts/rollback-remote.sh --confirm-production <release-id>
```

Een Git-snapshot bevat naast het broncodearchief een `.commit`-bestand met de vorige commit. De rollback checkt die commit uit en bouwt opnieuw, zonder de nieuwste branch op te halen. Een historische snapshot van vóór Git zonder `.commit` wordt door deze opdracht geweigerd.

Rollback herstelt applicatiecode en wijzigt geen financiële gegevens. Databasewijzigingen blijven bestaan; migraties moeten daarmee rekening houden. Valideer de applicatie opnieuw na herstel. Een back-up van financiële gegevens heeft een aparte [herstelprocedure](back-up-en-herstel.md).

## Migraties

De migratierunner registreert uitgevoerde bestandsnamen en voert alleen nieuwe migraties uit. Bestaande installaties behouden al uitgevoerde gegevensbewerkingen. Historische migratiestappen die uitsluitend persoonlijke installatiecorrecties bevatten, zijn in de publieke bron geneutraliseerd; de bestandsnamen blijven behouden voor migratiecompatibiliteit.
