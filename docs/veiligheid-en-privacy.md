# Veiligheid en privacy

Een openbare broncoderepository maakt de financiële gegevens van een installatie niet openbaar. De beheerder is verantwoordelijk voor een eigen beveiligde installatie, geheimen en back-ups. Huishouden biedt één huishoudadministratie; rollen scheiden bevoegdheden en zijn geen scheiding tussen verschillende huishoudens.

## Toegang

- De eigenaar beheert de administratie, gebruikers en back-upherstel.
- Een beheerder mag financiële gegevens beheren, importeren en exporteren.
- Een alleen-lezen gebruiker mag kijken en de eigen beveiligingsinstellingen beheren.
- Wachtwoorden worden als Argon2-hash opgeslagen. Sessies worden server-side gecontroleerd en hebben een maximale duur van één uur.
- TOTP-tweefactorauthenticatie en herstelcodes zijn beschikbaar. Passkeys en een uitgebreid overzicht van aangemelde apparaten zijn geen gedocumenteerde productfunctie.
- Login en herstelroutes hebben begrenzingen op herhaalde verzoeken. Gevoelige pagina’s en exports mogen niet door gedeelde caches worden bewaard.

## Configuratie en sleutelbeheer

Er zijn geen ingebouwde accountgegevens of databasewachtwoorden. Stel deze privé in via omgevingsvariabelen. CLI-beheerscripts lezen lokaal `.env.local`; productie gebruikt `infra/.env.prod`. Beide blijven buiten Git.

`TOTP_ENCRYPTION_KEY` bestaat uit 64 willekeurige hex-tekens en versleutelt tweefactorgeheimen. Een signing secret voor tijdelijke tweefactortokens moet minimaal 32 tekens bevatten. Behoud sleutels bij herstart en herstel. Het wijzigen van een encryptiesleutel vereist een migratieplan voor bestaande gegevens.

Wachtwoorden voor gebruikersbeheer worden via `USER_PASSWORD` aangeleverd en niet als opdrachtargument. Deel geen echte waarden via documentatie, screenshots, issues of buildlogs.

## Openbare publicatie

- Gebruik fictieve namen, afgeronde voorbeeldbedragen en gereserveerde voorbeelddomeinen.
- Neem geen echte IBANs, klantnamen, inkomensdetails, serveradressen, geheime sleutels of back-ups op.
- Voorbeeldconfiguraties bevatten lege velden voor installatiegebonden gegevens.
- Controleer zowel de actuele bestanden als de Git-historie. Het verwijderen van een waarde in een nieuwe commit verwijdert die niet uit eerdere commits.
- Is een geheim gepubliceerd, vervang het op de betrokken installatie. Een herschreven Git-historie maakt eerder gekopieerde gegevens niet ongedaan.

## Back-ups en metingen

JSON-back-ups bevatten financiële persoonsgegevens en moeten privé worden bewaard. Ze vervangen geen veilige bewaring van accounts en encryptiesleutels. Zie [back-up en herstel](back-up-en-herstel.md).

Productmetingen bevatten signaalsoort, opgeschoond paginapad en release. Saldi, transactieomschrijvingen en vrije tekst worden niet als productsignaal opgeslagen. Het auditlog bevat beheergebeurtenissen en blijft onderdeel van de private administratie.
