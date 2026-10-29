# Ontwerp en huisstijl

Huishouden gebruikt dezelfde huisstijl als Oceanco Fleet Insight en Oceanco Fleet Data Management. Die stijl is bijna-zwart en wit, met veel witruimte. Titels staan in dunne hoofdletters met brede spatiëring, en toelichtende regels in een serif. Dit document beschrijft de bouwstenen en regels. Gebruik ze voor iedere nieuwe of gewijzigde pagina.

## Bouwstenen

| Onderdeel | Waar | Gebruik |
| --- | --- | --- |
| Kleurtokens | `src/app/globals.css` (`:root` en `html[data-theme="dark"]`) | Alle kleuren, licht en donker. Gebruik `var(--color-…)`, `text-brand`, `bg-brand` en `border-border`. |
| Typografie, schil en patronen | `src/app/house-style.css` | Bovenbalk, titelband, cijferstrook, sectiekoppen, tabellen en inlogscherm. |
| Paginakop | `PageHeader` in `src/components/ui/page-header.tsx` | Iedere pagina begint hiermee. Toont eyebrow, titel, toelichting, acties en optioneel kerncijfers. |
| Kerncijfers | `StatsStrip` in `src/components/ui/stats-strip.tsx` | Drie tot vijf cijfers in de titelband. Eén cijfer mag `lead` zijn. `tone: "risk"` markeert een tekort. |
| Grafiekthema | `readChartTheme` in `src/lib/chart-theme.ts` | ECharts-kleuren uit de tokens, met een slate-reeks en een rasterkleur. |
| Lettertypen | Montserrat via `@fontsource/montserrat`; Libre Baskerville in `public/fonts` | Lokaal meegeleverd, omdat de CSP alleen eigen lettertypen toestaat. |
| Inlogbeeld | `public/img/auth-horizon.svg` | Eigen illustratie van een nachtelijke zee. Gebruikt op de inlog- en wachtwoordschermen. |

## Opbouw van een pagina

1. **Bovenbalk.** Vast, met het woordmerk, de hoofdnavigatie in hoofdletters, de themakeuze, Importeren en Uitloggen. Op mobiel blijft alleen het woordmerk staan; de navigatie zit dan in de balk onderaan.
2. **Titelband.** Over de volle breedte: mistgrijs in het lichte thema, night in het donkere. Bevat een eyebrow, een dunne titel in hoofdletters, een toelichting in Libre Baskerville en rechts de acties.
3. **Cijferstrook.** De kerncijfers van de pagina staan in de band, met grote dunne cijfers en een label in kleine hoofdletters. Herhaal die cijfers niet in losse kaarten eronder.
4. **Secties.** Gebruik `<div className="section-head"><h2>…</h2><p>…</p></div>` voor een sectiekop. De titel staat links in dunne hoofdletters, de serif-toelichting rechts. Kaarten zijn vierkant, met een dunne rand en ruime binnenmarge. Houd veel ruimte tussen secties.
5. **Voettekst.** Op desktop, onder de inhoud.

## Regels

- **Kleur.** Gebruik uitsluitend de tokens. Gebruik geen Tailwind-paletkleuren zoals `emerald-…` of `amber-…`, geen hex-waarden, geen verlopen en geen getinte achtergronden.
- **Status.** Succes, waarschuwing en fout zijn alleen voor een toestand, bijvoorbeeld een tekort of "op koers". Toon die met een `StatusBadge`, een gekleurd cijfer of een dunne gekleurde rand, nooit met een gekleurd vlak.
- **Typografie.** Kleine labels zijn hoofdletters met brede spatiëring, niet vet. Grote bedragen zijn licht of extra licht. Koppen zijn normaal of medium, niet vet.
- **Grafieken.** Gebruik één slate-reeks voor gewone reeksen (`theme.series`). Statuskleuren zijn alleen voor betekenis. Assen en rasterlijnen wijken terug, er komt geen gekleurd vlak achter de grafiek, lijnen zijn dun en de grafiek is plat 2D. Perspectief of 3D vervormt bedragen en wordt daarom niet gebruikt voor cijfers.
- **Thema's.** Iedere pagina moet in licht en donker leesbaar zijn. Controleer ook de mobiele weergave op 390 pixels breed.

## Controleren tijdens ontwikkeling

De ontwikkelomgeving in Docker laadt wijzigingen direct. Zie [installatie en beheer](installatie-en-beheer.md#ontwikkelen-in-docker). Elke bewerking moet een bestand achterlaten dat compileert: een bestand dat niet compileert, maakt de hele lokale app onbereikbaar.
