# Security audit - 30 augustus 2026

Status: lokale audit uitgevoerd, checks groen. Security finding van 1 september 2026 is verwerkt.

## Gecontroleerd

- Rollen en server actions: financiele mutaties gebruiken `requireMutableUser`; gebruikersbeheer en restore zijn owner-only.
- API-routes: import, export, restore, login, logout en wachtwoord-reset.
- Sessies: HTTP-only cookie, `sameSite=lax`, secure in productie, server-side sessiecontrole en vaste maximale sessieduur.
- Wachtwoorden: Argon2-hash, reset-tokenhash en rate limiting op login/reset.
- Headers: CSP, framebescherming, nosniff, robots-blokkade, permissions policy en HSTS in productie.
- Auditlog: mutaties, imports, exports, restore en gebruikersbeheer worden vastgelegd.
- Dependencies: `npm audit --omit=dev` geeft 0 kwetsbaarheden.

## Aangescherpt

- Gevoelige download- en mutatieroutes geven `Cache-Control: no-store`.
- JSON back-up en CSV-export worden expliciet no-store teruggegeven.
- Import en restore hebben bestandslimieten.
- Import-preview redirects zijn no-store, omdat previews bankbestanden tijdelijk in PostgreSQL bewaren.
- Security bug opgelost op 1 september 2026: sessies stonden op 14 dagen met sliding renewal. Sessies verlopen nu hard na 1 uur, worden niet meer verlengd bij actief gebruik en bestaande sessies ouder dan 1 uur worden server-side geweigerd en opgeruimd.
- Auditpagina is niet meer beschikbaar voor `readonly`.
- Auditdetails schermen gevoelige velden zoals `iban`, `email`, `password`, `token`, `hash` en bestandsnamen af in de tabelweergave.
- Productieheaders bevatten `Strict-Transport-Security` en `Cross-Origin-Opener-Policy`.
- PostgreSQL wordt op de host uitsluitend aan `127.0.0.1` gekoppeld; app- en operations-containers gebruiken het afgeschermde Docker-netwerk.

## Open voor v2

- Passkeys of 2FA.
- Sessiebeheerpagina met actieve sessies en handmatig intrekken.
- Expliciete CSRF-tokenlaag bovenop `sameSite=lax` voor extra defense-in-depth.
- Fijnere auditfilters en export van auditregels voor owner.
- Automatische cleanup van oude pending imports met retentiebeleid.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
npm audit --omit=dev
```
