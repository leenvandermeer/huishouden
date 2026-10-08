# CSV-productcontract 1.0

Status: normatief voor resultaat- en selectie-exports. Het JSON-back-upformaat heeft een eigen schemaversie en valt niet onder dit kolomcontract.

## Algemene regels

- Codering: UTF-8 met BOM en `sep=;` voor Nederlandse Excel.
- Datums: `YYYY-MM-DD`; exporttijd: ISO 8601.
- Bedragen zijn onopgemaakte numerieke waarden met een decimale komma in het CSV-bestand.
- Tekst die Excel als formule kan uitvoeren krijgt veilig een apostrofvoorvoegsel.
- Iedere nieuwe CSV bevat `csv_product_version`, `calculation_contract`, `report_type`, `exported_at`, `as_of` en de gebruikte filters of horizon.
- `estimated`, `confidence` en `source` onderscheiden feiten, berekeningen en schattingen.
- Nieuwe optionele kolommen mogen achteraan worden toegevoegd binnen versie 1.x. Een verwijdering, naamswijziging of betekeniswijziging vereist een nieuwe hoofdversie.

## Exporttypen

| Rapporttype | Route | Betekenis |
| --- | --- | --- |
| `filtered_transactions` | `/api/export/transactions` | Alle transacties die voldoen aan de actieve filters, in exact de actieve serversortering. |
| `today_calculation` | `/api/export/today` | De volledige reconciliatie van bankstand naar Veilig te besteden. |
| `forward_schedule` | `/api/export/forward` | Beheerde en geschatte inkomsten en vaste lasten met datum, frequentie en zekerheid. |
| `wealth_overview` | `/api/export/wealth` | Netto vermogen en alle onderliggende rekeningstanden, typen, peildata en kwaliteitskenmerken. |
| maand/kwartaal/jaar | `/api/export/report` | Bestaande historische rapportexport, nu eveneens voorzien van CSV-productversie. |

De bestaande volledige transactie-CSV via `/api/export?format=csv` blijft beschikbaar. Die export is een volledige databronexport; de gefilterde export hoort bij de transactiewerkruimte.

## Gefilterde transacties

Filters omvatten zoektekst, periode, rekening, tegenrekening, categorie, soort, bedraggrenzen, reviewstand, patroon, zekerheid en sortering. Paginanummer en paginagrootte tellen niet mee: de CSV bevat de volledige selectie.

Kolommen: `date`, `account`, `account_iban`, `counterparty`, `counter_account`, `description`, `amount`, `category`, `kind`, `pattern`, `confidence`, `evidence_periods`, `estimated`, `source_file`, `source`.

## Reconciliatie Vandaag

De som is exact:

```text
Op betaalrekeningen
− Vaste lasten vóór inkomen
− Verwachte uitgaven vóór inkomen
− Bewuste reserveringen
− Onzekerheidsbuffer
= Veilig te besteden
```

Een verschil groter dan €0,01 tussen scherm en CSV blokkeert een release.

## Vermogen

De export bevat dezelfde samenvatting als het scherm: direct beschikbaar, gereserveerd, lange termijn, schulden en netto vermogen. Iedere rekeningregel vermeldt type, groep, saldo, peildatum, saldobron, kwaliteitsstatus, saldoverschil, laatste import en laatste transactie. Schulden worden als negatieve rekeningstand opgenomen; interne overboekingen veranderen het netto totaal niet.
