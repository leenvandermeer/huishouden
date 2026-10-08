# Development workflow

Voor de volledige eerste installatie, alle scripts, back-up/restore en productie-inrichting: [installatie-en-beheer.md](installatie-en-beheer.md).

Werk standaard lokaal in development. Productie wordt pas bijgewerkt wanneer wijzigingen zijn getest en bewust als bundel worden gedeployed.

## Lokaal ontwikkelen

```bash
docker compose up -d postgres
npm run db:migrate
bash scripts/dev.sh
```

Gebruik `http://localhost:3001` voor UX-controle, importtests en functionele checks.

## Controleren voor deploy

```bash
npm run release:check
```

De releasecheck draait lint, typecheck, tests, build, migraties en controleert dat een productie-deploy zonder expliciete bevestiging wordt geblokkeerd.

## Productie deployen

Productie-deploys zijn expliciet geblokkeerd zonder bevestiging. Deploy alleen wanneer de wijzigingen samen naar productie mogen:

```bash
npm run release:check
bash scripts/deploy-remote.sh --confirm-production
npm run prod:validate
```

De remote deploy accepteert alleen calls met `CONFIRM_PRODUCTION_DEPLOY=ja`. Zo blijft de normale werkwijze: lokaal bouwen, lokaal testen, daarna in een keer naar productie.

## Productiewachtwoord herstellen

Gebruik het beheerscript wanneer een resetlink wel succesvol lijkt maar login daarna niet lukt:

```bash
USER_PASSWORD='<nieuw wachtwoord>' npm run user:set-password -- leen@vdmeer.eu
```

Het script schrijft een nieuwe Argon2-hash, trekt bestaande sessies in en verifieert direct dat het opgegeven wachtwoord tegen de opgeslagen hash klopt.

## Huishoudboekje controleflow

- Budgetten gebruiken dezelfde gelddefinitie als dashboard en rapportages: inkomsten minus gewone uitgaven, sparen en beleggen als aparte geldstromen.
- Sparen wordt primair gecontroleerd via de spaarrekening: actuele bankstand plus feitelijke bij- en afschrijvingen.
- Historische transacties zonder categorie mogen eenmalig naar `Overig` of `Overig inkomen`, zodat oude importdata niet in de actuele reviewflow blijft hangen.
- Sluit een maand in `/rapportages` pas af wanneer de import compleet is, transacties zijn gecategoriseerd, budgetten kloppen en rekeningstanden zijn gecontroleerd.
- Rekeningdetailpagina's tonen een saldocontrole: actuele bankstand, berekend saldo uit transacties en verschil.
- Rekeningstanden tonen naast de peildatum ook het exacte herijkmoment; transacties na dat moment tellen door.
- `/importeren` heeft een afsluitchecklist na upload: rekeningen ingelezen, saldi gecontroleerd, categorie-review klaar en spaarrekening aanwezig.
- Een foutieve import mag via `/importeren` worden teruggedraaid met expliciete bevestiging; valideer daarna dat saldi, potjes en importmetadata opnieuw kloppen.
- Draai na een productie-uitrol `npm run prod:validate` om health, login, resetpagina en kernroutes te controleren.
- Maak voor een risicovolle wijziging een JSON-back-up via `/exporteren` en controleer die met de dry-runfunctie.

## Rollen

- `owner`: volledige toegang, inclusief gebruikersbeheer en restore vanuit JSON back-up.
- `admin`: mag financiele data beheren, importeren, exporteren en corrigeren, maar geen gebruikers beheren of restore uitvoeren.
- `readonly`: mag data bekijken en eigen wachtwoord wijzigen, maar geen financiele data wijzigen, importeren, exporteren of herstellen.

## Git en productie

Repository: https://github.com/leenvandermeer/huishouden. De hoofdbranch is `main`.

1. Voer `npm run release:check` uit.
2. Commit de wijzigingen en push naar `origin/main`.
3. Voer `bash scripts/deploy-remote.sh --confirm-production` uit.
4. Draai op de server `bash scripts/validate-production.sh`.

De deploy stopt bij lokale wijzigingen, een niet-gepushte commit of gewijzigde productiebroncode. De server haalt de gecontroleerde commit via GitHub op. De productieconfiguratie en back-ups blijven buiten Git. Een snapshot met een `.commit`-bestand kan met de bestaande rollbackopdracht naar die Git-versie worden teruggezet, zonder automatisch opnieuw de nieuwste versie op te halen. Snapshots van vóór de Git-overgang blijven als archief beschikbaar, maar zijn niet geschikt voor de Git-rollbackopdracht.
