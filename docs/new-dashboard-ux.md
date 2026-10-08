# Nieuw Dashboard: Financieel Inzicht Cockpit

Status: UX-ontwerp, in afwachting van implementatie.

## Doel

Een state-of-the-art persoonlijk financieel dashboard dat:
- **Predictief** is: voorspelt toekomstig saldo en waarschuwt voor tekorten
- **Verhalend** is: niet alleen cijfers, maar verklaringen waarom iets gebeurt
- **Persoonlijk** is: past zich aan aan het gedrag van de gebruiker
- **Vertrouwenwekkend** is: heldere presentatie zonder onzekerheid

## UX-principes (gebaseerd op 2026 fintech trends)

1. **Data storytelling**: Elk cijfer heeft een verhaal
2. **Predictieve personalisatie**: Het dashboard leert van je gedrag
3. **Verborgen veiligheid**: 2FA is aanwezig maar niet storend
4. **Minimalistische datavisualisatie**: Minder is meer, maar wanneer nodig rijk
5. **Vertrouwen door duidelijkheid**: Elke aanbeveling is in één zin uit te leggen

## Schermindeling

### Bovenste balk: Financial Health Score
```
┌─────────────────────────────────────────────────────────┐
│  FINANCIEEL WELZIJN                    [92/100] ↑ +3    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Je financiele situatie is uitstekend. Je spaarquote    │
│  ligt boven het gemiddelde en je vaste lasten zijn      │
│  gedekt. De komende maand verwachten we een positief    │
│  saldo van €1.245.                                      │
└─────────────────────────────────────────────────────────┘
```

**Component: FinancialHealthScore**
- Score 0-100 met kleurcodering (groen/geel/oranje/rood)
- Trend-indicaties (pijltje omhoog/omlaag + verschil)
- Automatische toelichting in één zin
- Berekening gebaseerd op: spaarquote, buffer, vaste lasten ratio, schuldgraad

### Sectie 1: Cashflow Voorspelling (30 breed)
```
┌──────────────────────────────┐  ┌──────────────────────────────┐
│  CASHFLOW VOORSPELLING       │  │  SNEL OVERZICHT              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━   │  │  ━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                              │  │                              │
│  [Lijngrafiek: 6 maanden]   │  │  Huidig saldo     €12.450   │
│  ── Actueel ── Voorspelling │  │  morgen           €12.380 ↓ │
│                              │  │  overmorgen       €12.310 ↓ │
│  Voorspelling:               │  │  Volgende week    €11.890 ↓ │
│  • Morgen: €12.380           │  │  Volgende maand   €13.695 ↑ │
│  • Overmorgen: €12.310       │  │                              │
│  • Volgende week: €11.890    │  │  Buffer: 2.1 maanden         │
│  • Eind maand: €13.695       │  │  Status: ✓ Gezond            │
│                              │  │                              │
│  [Bekijk details →]          │  │  [Bekijk rapportage →]       │
└──────────────────────────────┘  └──────────────────────────────┘
```

**Component: CashflowForecastChart**
- Interactieve lijngrafiek (6 maanden)
- Actuele lijn (doorgetrokken) + voorspellingslijn (gestreept)
- Onzekerheidsinterval (lichte band)
- Klik op een punt voor details
- Data: gericht op basis van historische transacties + vaste lasten

**Component: QuickOverview**
- Huidig saldo per rekening
- Dagelijkse voorspelling (meerjarig gemiddelde)
- Buffer in maanden (hoeveel maanden kun je doorkomen zonder inkomen)
- Status indicator (gezond/waarschuwing/kritiek)

### Sectie 2: Uitgavenpatroon (50 breed)
```
┌──────────────────────────────────────────────────────────┐
│  UITGAVENPATROON                         [aug 2026]      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│  │ €4.626      │ │ €1.947      │ │ €1.547      │        │
│  │ Hypotheek   │ │ Beleggen    │ │ Boodschappen│        │
│  │ ━━━━━━━━━━━ │ │ ━━━━━━━━━━━ │ │ ━━━━━━━━━━━ │        │
│  │ +2% t.o.v.  │ │ +15% t.o.v. │ │ -8% t.o.v.  │        │
│  │ vorige      │ │ vorige      │ │ vorige      │        │
│  └─────────────┘ └─────────────┘ └─────────────┘        │
│                                                          │
│  Trends:                                                 │
│  • Boodschappen dalen: €127/mnd minder dan gemiddeld    │
│  • Beleggen stijgt: je belegt nu 12% van je inkomen     │
│  • Hypotheek stabiel: geen wijzigingen                   │
│                                                          │
│  [Alle categorieen →]                                    │
└──────────────────────────────────────────────────────────┘
```

**Component: SpendingPatternCard**
- Top 3 uitgaven categorieën met bedrag en trend
- Visuele balkjes per categorie
- Automatische trend-analyse (stijgt/daalt/stabiel)
- Vergelijking met vorige periode
- Klik op categorie voor details

**Component: TrendInsights**
- Automatisch gegenereerde inzichten
- "Je boodschappen dalen: €127/mnd minder dan gemiddeld"
- "Je belegt nu 12% van je inkomen"
- Geen AI-koppeling nodig, deterministisch

### Sectie 3: anomalieën & Acties (20 breed)
```
┌──────────────────────────────┐
│  ONVERWACHT                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━   │
│                              │
│  ⚠ Grote transactie          │
│  Albert Heijn: €89,45        │
│  Normaal: €45-65             │
│  [Bekijk →]                  │
│                              │
│  ⚠ Nieuwe tegenpartij        │
│  "Webshop XYZ"               │
│  €234,00                     │
│  [Categoriseer →]            │
│                              │
│  ℹ Herinnering               │
│  Zorgverzekering over 3 dgn  │
│  €782,13                     │
│  [Bekijk →]                  │
│                              │
│  ✓ Alles OK                  │
│  Geen onverwachte posten     │
│                              │
└──────────────────────────────┘
```

**Component: AnomalyDetector**
- Grote transacties (>2x gemiddelde)
- Nieuwe tegenpartijen
- Ongebruikelijke categorieën
- Waarschuwingen voor komende betalingen
- Visuele indicators (oranje/rood/groen)

### Sectie 4: Doelen & Voortgang (50 breed)
```
┌──────────────────────────────────────────────────────────┐
│  DOELEN                                    [Bewerken]    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Noodfonds                           €8.500/€15.000│  │
│  │ ████████████████████░░░░░░░░░░░░░░░░░ 57%         │  │
│  │ Geschat: 8 maanden                  Status: On track│  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Vakantie Frankrijk                  €2.100/€4.000 │  │
│  │ ████████████░░░░░░░░░░░░░░░░░░░░░░░░ 53%         │  │
│  │ Geschat: 4 maanden                  Status: On track│  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Nieuwe auto                         €0/€25.000    │  │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0%          │  │
│  │ Geschat: 24 maanden                 Status: Gestart│  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  [Nieuw doel toevoegen →]                                │
└──────────────────────────────────────────────────────────┘
```

**Component: GoalProgressCard**
- Visuele voortgangsbalk per doel
- Actueel bedrag / doelbedrag
- Geschatte tijd om doel te bereiken
- Status indicator (on track / waarschuwing / achterstand)
- Mogelijkheid om doelen toe te voegen/bewerken

### Sectie 5: Inkomsten vs Uitgaven (50 breed)
```
┌──────────────────────────────────────────────────────────┐
│  INKOMENST vs UITGAVEN              [aug 2026]           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ €16.380  INKOMEN                    ▲ +5%          │  │
│  │ ████████████████████████████████████              │  │
│  │                                                    │  │
│  │ €12.770  UITGAVEN                   ▲ +3%          │  │
│  │ ██████████████████████████                        │  │
│  │                                                    │  │
│  │ €3.610   OVER                        ▲ +12%        │  │
│  │ ████████████                                      │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Trend: Je spaarquote is gestegen van 18% naar 22%       │
│  Dit komt door lagere boodschappenkosten.                │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Component: IncomeVsExpensesBar**
- Horizontale balkvergelijking
- Inkomsten vs Uitgaven vs Over
- Trend-indicaties per item
- Automatische toelichting op wijzigingen

## Technische implementatie

### Nieuwe bestanden
- `src/app/(app)/inzicht/page.tsx` - Hoofdpagina van het dashboard
- `src/components/finance/financial-health-score.tsx` - Score component
- `src/components/finance/cashflow-forecast-chart.tsx` - Voorspellingsgrafiek
- `src/components/finance/quick-overview.tsx` - Snel overzicht
- `src/components/finance/spending-pattern-card.tsx` - Uitgavenpatroon
- `src/components/finance/trend-insights.tsx` - Automatische inzichten
- `src/components/finance/anomaly-detector.tsx` - Anomalie-detectie
- `src/components/finance/goal-progress-card.tsx` - Doel-voortgang
- `src/components/finance/income-vs-expenses-bar.tsx` - Inkomsten vs uitgaven

### Database queries
- `getFinancialHealthScore(userId)` - Bereken health score
- `getCashflowForecast(userId, months)` - Haal voorspellingsdata op
- `getSpendingTrends(userId, period)` - Uitgavenpatronen
- `getAnomalies(userId, period)` - Onverwachte transacties
- `getGoals(userId)` - Spaardoelen

### Styling
- Nieuwe CSS-klassen in `globals.css`
- Gebruik bestaande design tokens
- Consistente visuele taal met huidig dashboard
- Donker-vriendelijke kleuren (future-proof)

## Validatie

### Marktonderzoek
- **Copilot Money**: Soortgelijke voorspellingsgrafieken
- **YNAB**: Doel-gerichte voortgangsbalken
- **Revolut**: Anomalie-detectie en waarschuwingen
- **ING Money Dashboard**: Gezondheidsscore

### Benchmark
- Financial Health Score wordt veel gebruikt (Marcus, Chime, Current)
- Cashflow forecasting is trending in B2C fintech (2026)
- Goal tracking is standaard in persoonlijke financiele apps
- Anomalie-detectie is een differentiator

## Fase-indeling

### Fase 1 (nu)
- Financial Health Score
- Quick Overview (saldo, buffer)
- Income vs Expenses vergelijking

### Fase 2
- Cashflow voorspellingsgrafiek
- Uitgavenpatroon met trends

### Fase 3
- Anomalie-detectie
- Doelen & voortgang
- Automatische inzichten

---

# Nieuw Beheer-scherm: Beheer Cockpit

Status: UX-ontwerp, in afwachting van implementatie.

## Doel

Een modern, overzichtelijk beheer-scherm dat:
- **Modulair** is: elke sectie is een onafhankelijk blok
- **Contextueel** is: toont alleen wat relevant is voor de gebruikersrol
- **Actiegericht** is: elke sectie heeft een duidelijke call-to-action
- **Compact** is: geen overbodige informatie, wel direct toegankelijk

## Huidige problemen

1. Te veel informatie op één scherm
2. Gebruikersbeheer en wachtwoord wijzigen door elkaar
3. Geen visuele hiërarchie tussen systeemstatus en acties
4. 2FA-sectie is pas net toegevoegd en voelt niet geintegreerd

## Nieuwe schermindeling

### Bovenste balk: Status Dashboard
```
┌─────────────────────────────────────────────────────────────────────┐
│  BEHEER COCKPIT                                     [Leen vd Meer] │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ 24       │ │ 156      │ │ 892      │ │ 12       │ │ ✓        │  │
│  │ Reken.   │ │ Categ.   │ │ Trans.   │ │ Regels   │ │ 2FA      │  │
│  │ ● Actief │ │ ● Open   │ │ ● Import │ │ ● Actief │ │ ● Actief │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                                     │
│  Laatste import: 2 sep 2026 · 1.247 transacties · Geen issues      │
└─────────────────────────────────────────────────────────────────────┘
```

**Component: StatusDashboard**
- 5 compacte status-kaarten in een rij
- Elke kaart toont: aantal, label, status indicator
- Onderregel: laatste import-info en eventuele issues
- Klik op een kaart gaat naar de bijbehorende sectie

### Sectie 1: Snelle Acties (100% breed)
```
┌─────────────────────────────────────────────────────────────────────┐
│  SNELLE ACTIES                                                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                     │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │
│  │ 📥 Importeren    │ │ 📋 Categoriseren│ │ 📊 Rapportage   │       │
│  │ Bankbestanden   │ │ Review inbox    │ │ Maandanalyse    │       │
│  │ uploaden        │ │ 12 posten       │ │ Bekijken        │       │
│  │                 │ │                 │ │                 │       │
│  │ [Start import]  │ │ [Open inbox]    │ │ [Bekijk]        │       │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘       │
│                                                                     │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │
│  │ 💾 Backup       │ │ 👥 Gebruikers   │ │ 🔐 Beveiliging  │       │
│  │ JSON export     │ │ 2 actief        │ │ 2FA + wachtwoord│       │
│  │ downloaden      │ │ 0 uitgeschakeld │ │ Beheren         │       │
│  │                 │ │                 │ │                 │       │
│  │ [Download]      │ │ [Beheer]        │ │ [Instellen]     │       │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Component: QuickActionsGrid**
- 6 actie-kaarten in een 3x2 raster
- Elke kaart: icoon, titel, korte beschrijving, teller/status, actieknop
- Visuele scheiding tussen primaire en secundaire acties
- Responsive: 3 kolommen op desktop, 2 op tablet, 1 op mobiel

### Sectie 2: Beheer Secties (50% / 50%)
```
┌──────────────────────────────────────┐ ┌──────────────────────────────────────┐
│  GELDSTRUCTUUR                       │ │ GEBRUIKERS & BEVEILIGING             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                      │ │                                      │
│  ┌────────────────────────────────┐  │ │  ┌────────────────────────────────┐  │
│  │ 🏦 Rekeningen                  │  │ │  │ 🔐 Wachtwoord wijzigen         │  │
│  │ 24 rekeningen, 3 spaarreken.  │  │ │  │ Huidig wachtwoord + nieuw     │  │
│  │ [Beheren →]                    │  │ │  │ [Wijzigen]                     │  │
│  └────────────────────────────────┘  │ │  └────────────────────────────────┘  │
│                                      │ │                                      │
│  ┌────────────────────────────────┐  │ │  ┌────────────────────────────────┐  │
│  │ 📁 Categorieen                 │  │ │  │ 🛡️ Authenticator (2FA)         │  │
│  │ 89 actief, 12 inactief        │  │ │  │ Actief sinds 2 sep 2026       │  │
│  │ [Beheren →]                    │  │ │  │ [Beheren →]                    │  │
│  └────────────────────────────────┘  │ │  └────────────────────────────────┘  │
│                                      │ │                                      │
│  ┌────────────────────────────────┐  │ │  ┌────────────────────────────────┐  │
│  │ 💰 Vaste Lasten                │  │ │  │ 👥 Gebruikers                  │  │
│  │ 12 actief, 3 kandidaten       │  │ │  │ 2 actief, 0 uitgeschakeld     │  │
│  │ [Beheren →]                    │  │ │  │ [Beheren →]                    │  │
│  └────────────────────────────────┘  │ │  └────────────────────────────────┘  │
│                                      │ │                                      │
└──────────────────────────────────────┘ └──────────────────────────────────────┘
```

**Component: ManagementSection**
- Twee kolommen naast elkaar op desktop
- Elke sectie: titel + 3 compacte kaarten
- Elke kaart: icoon, titel, korte beschrijving, link naar detail
- Op mobiel: onder elkaar

### Sectie 3: Data & Controle (100% breed)
```
┌─────────────────────────────────────────────────────────────────────┐
│  DATA & CONTROLE                                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                     │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │
│  │ 📥 Importeren    │ │ 📤 Exporteren   │ │ 📋 Auditlog     │       │
│  │ CSV, CAMT, MT940│ │ JSON + CSV      │ │ Laatste 50      │       │
│  │ Multi-file      │ │ Volledig back-up│ │ mutaties        │       │
│  │                 │ │                 │ │                 │       │
│  │ [Uploaden]      │ │ [Downloaden]    │ │ [Bekijken]      │       │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Component: DataControlSection**
- Drie kaarten naast elkaar op desktop
- Op mobiel: onder elkaar
- Elke kaart: icoon, titel, beschrijving, status, actieknop

### Sectie 4: Systeem Informatie (100% breed)
```
┌─────────────────────────────────────────────────────────────────────┐
│  SYSTEEM                                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Versie: 1.0.0 · Laatste update: 4 sep 2026                    │ │
│  │ Database: PostgreSQL 16 · Sessieduur: 1 uur                   │ │
│  │ 2FA: Actief · Rollen: Owner, Admin, Alleen-lezen              │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Component: SystemInfoFooter**
- Compacte footer met systeeminformatie
- Versie, datum, database-status
- Rol- en beveiligingsinformatie

## Visueel ontwerp principes

### Kleurgebruik
- **Groen**: Actief, goed, succes
- **Oranje**: Waarschuwing, aandacht nodig
- **Rood**: Kritiek, fout, uitgeschakeld
- **Blauw**: Informatie, neutraal
- **Grijs**: Inactief, secundair

### Typografie
- **H1**: Paginatitel (24px, bold)
- **H2**: Sectietitels (16px, semibold)
- **H3**: Kaarttitels (14px, medium)
- **Body**: Beschrijvingen (13px, regular)
- **Caption**: Status, metadata (11px, medium)

### Spacing
- Secties: 24px uit elkaar
- Kaarten: 12px uit elkaar
- Binnenin kaarten: 12px padding
- Tussen elementen: 8px

### Responsive gedrag
- **Desktop (>1280px)**: Volledige layout met zijbalk
- **Tablet (768-1280px)**: Twee kolommen, compactere kaarten
- **Mobiel (<768px)**: Eén kolom, volledige breedte

## Nieuwe bestanden

- `src/app/(app)/beheer/page.tsx` - Hoofdpagina (herschreven)
- `src/components/admin/status-dashboard.tsx` - Status balk
- `src/components/admin/quick-actions-grid.tsx` - Snelle acties
- `src/components/admin/management-section.tsx` - Beheer secties
- `src/components/admin/data-control-section.tsx` - Data & controle
- `src/components/admin/system-info-footer.tsx` - Systeem info

## Implementatie volgorde

### Fase 1
- Status Dashboard (bovenste balk)
- Quick Actions Grid
- Systeem Info Footer

### Fase 2
- Management Secties (geldstructuur + gebruikers)
- Data & Control Sectie

### Fase 3
- Responsive optimalisatie
- Animaties en transitions
- Dark mode support
