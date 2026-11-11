// Fills a separate demo database with a realistic, fictional household.
// Never touches the real database: it refuses unless the database name ends in "_demo".
//
//   npm run db:demo              -> create/migrate the demo database and (re)fill it
//   npm run db:demo -- --if-empty -> only fill when there are no accounts yet
import "./environment";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { Client, Pool } from "pg";
import { defaultCategories } from "../src/modules/finance/default-categories";
import { marketCategories } from "../src/modules/finance/market-mapping";

const DEMO_EMAIL = "demo@huishouden.test";
const DEMO_PASSWORD = "demo-huishouden";
const DEMO_NAME = "Demo Huishouden";

const databaseUrl = process.env.DEMO_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("Stel DEMO_DATABASE_URL of DATABASE_URL in.");
const parsedUrl = new URL(databaseUrl);
const databaseName = decodeURIComponent(parsedUrl.pathname.replace(/^\//, ""));
if (!/_demo$/.test(databaseName)) {
  throw new Error(`Geweigerd: database "${databaseName}" eindigt niet op "_demo". Demo-gegevens worden nooit in een echte database geschreven.`);
}
if (process.env.NODE_ENV === "production") throw new Error("Geweigerd: geen demo-gegevens met NODE_ENV=production.");
const onlyIfEmpty = process.argv.includes("--if-empty");

const categoryKind = new Map([...defaultCategories, ...marketCategories].map((category) => [category.id, category.kind]));

// ---------- deterministic randomness ----------
let seed = 20260101;
function random() {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (min: number, max: number) => Math.round((min + random() * (max - min)) * 100) / 100;
const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
const chance = (p: number) => random() < p;

// ---------- dates ----------
const today = new Date();
today.setUTCHours(0, 0, 0, 0);
const iso = (date: Date) => date.toISOString().slice(0, 10);
const monthKey = (date: Date) => iso(date).slice(0, 7);
const ymd = (year: number, month: number, day: number) => new Date(Date.UTC(year, month, Math.min(day, daysIn(year, month))));
function daysIn(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}
function workday(date: Date) {
  const result = new Date(date);
  while (result.getUTCDay() === 0 || result.getUTCDay() === 6) result.setUTCDate(result.getUTCDate() - 1);
  return result;
}
const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 14, 1));

// ---------- accounts ----------
const accounts = {
  betaal: { id: "acc_demo_betaal", name: "Gezamenlijke rekening", iban: "NL00RABO0312456781", bank: "Rabobank", type: "betaalrekening", opening: 1486.35 },
  spaar: { id: "acc_demo_spaar", name: "Spaarrekening", iban: "NL00RABO0312456782", bank: "Rabobank", type: "spaarrekening", opening: 7850.0 },
  beleggen: { id: "acc_demo_beleggen", name: "Beleggingsrekening", iban: "NL00DEGI0012345678", bank: "DEGIRO", type: "beleggingsrekening", opening: 11420.0 },
  studieschuld: { id: "acc_demo_duo", name: "Studieschuld DUO", iban: "NL00DUOO0000123456", bank: "DUO", type: "schuld", opening: -14280.0 },
} as const;
type AccountKey = keyof typeof accounts;

interface DemoTransaction {
  id: string;
  accountId: string;
  date: string;
  counterparty: string;
  counterAccount: string | null;
  description: string;
  amount: number;
  categoryId: string | null;
  kind: string;
  transferGroup: string | null;
  rule: string | null;
}
const transactions: DemoTransaction[] = [];

function add(date: Date, counterparty: string, description: string, amount: number, categoryId: string | null, options: { account?: AccountKey; counterAccount?: string | null } = {}) {
  if (date > today || date < start) return;
  transactions.push({
    id: `tx_demo_${String(transactions.length + 1).padStart(5, "0")}`,
    accountId: accounts[options.account ?? "betaal"].id,
    date: iso(date),
    counterparty,
    counterAccount: options.counterAccount ?? null,
    description,
    amount: Math.round(amount * 100) / 100,
    categoryId,
    kind: categoryId ? categoryKind.get(categoryId) ?? "variabele_uitgave" : "variabele_uitgave",
    transferGroup: null,
    rule: categoryId ? "Demo-gegevens" : null,
  });
}

function transfer(date: Date, from: AccountKey, to: AccountKey, amount: number, label: string) {
  if (date > today || date < start) return;
  const group = `int_demo_${createHash("md5").update(`${iso(date)}|${from}|${to}|${label}|${amount}`).digest("hex").slice(0, 20)}`;
  const toSavings = accounts[to].type === "spaarrekening";
  const fromSavings = accounts[from].type === "spaarrekening";
  const outgoingCategory = from === "betaal" && toSavings ? "sparen" : from === "betaal" && to === "beleggen" ? "beleggen" : "intern";
  const incomingCategory = to === "betaal" && fromSavings ? "potje-opname" : "intern";
  const outgoing = toSavings ? `Naar: ${label}` : label;
  const incoming = fromSavings ? `Van: ${label}` : label;
  add(date, accounts[to].name, outgoing, -amount, outgoingCategory, { account: from, counterAccount: accounts[to].iban });
  transactions.at(-1)!.transferGroup = group;
  transactions.at(-1)!.kind = outgoingCategory === "intern" ? "interne_overboeking" : categoryKind.get(outgoingCategory)!;
  add(date, accounts[from].name, incoming, amount, incomingCategory, { account: to, counterAccount: accounts[from].iban });
  transactions.at(-1)!.transferGroup = group;
  transactions.at(-1)!.kind = "interne_overboeking";
}

// ---------- the household ----------
const groceries = ["Albert Heijn", "Albert Heijn", "Jumbo", "Lidl", "Plus", "Aldi"];
const fuel = ["Shell", "Tango", "TinQ", "BP"];
const dining = ["Bakkerij Bart", "Happy Italy", "New York Pizza", "Thuisbezorgd.nl", "Starbucks", "Brasserie De Haven", "Eetcafe 't Pleintje"];
const webshops = ["bol.com", "Coolblue", "Zalando", "Amazon.nl"];
const clothing = ["Zeeman", "H&M", "Decathlon", "Wibra", "Intersport"];
const homeGarden = ["Gamma", "Praxis", "IKEA", "Action", "Intratuin", "Hema"];
const holidays = ["Booking.com", "Camping Le Lac", "Transavia", "Center Parcs"];

for (let cursor = new Date(start); cursor <= today; cursor.setUTCMonth(cursor.getUTCMonth() + 1)) {
  const year = cursor.getUTCFullYear();
  const month = cursor.getUTCMonth();
  const label = new Intl.DateTimeFormat("nl-NL", { month: "long", year: "numeric", timeZone: "UTC" }).format(cursor);

  // Income
  const salaryRaise = year >= 2026 ? 1.035 : 1;
  add(workday(ymd(year, month, 24)), "Bouwbedrijf Van Dijk B.V.", `Salaris ${label}`, Math.round(3185.4 * salaryRaise * 100) / 100, "salaris", { counterAccount: "NL00INGB0004455667" });
  add(workday(ymd(year, month, 25)), "Zorggroep Midden B.V.", `Salaris ${label}`, Math.round(1964.2 * salaryRaise * 100) / 100, "salaris", { counterAccount: "NL00ABNA0447788990" });
  if (month === 4) add(workday(ymd(year, month, 24)), "Bouwbedrijf Van Dijk B.V.", "Vakantiegeld", 2612.0, "salaris");
  if (month === 4) add(workday(ymd(year, month, 25)), "Zorggroep Midden B.V.", "Vakantiegeld", 1418.5, "salaris");
  if (month === 11) add(workday(ymd(year, month, 15)), "Zorggroep Midden B.V.", "Eindejaarsuitkering", 1702.3, "salaris");
  if ([0, 3, 6, 9].includes(month)) add(workday(ymd(year, month, 2)), "Sociale Verzekeringsbank", "Kinderbijslag 2 kinderen", 562.72, "uitkering-toeslagen");
  if (month === 6) add(ymd(year, month, 12), "Belastingdienst", "Teruggaaf inkomstenbelasting", 684.0, "belasting");

  // Fixed costs
  add(ymd(year, month, 1), "Rabobank Hypotheken", "Hypotheek termijn", -1186.42, "wonen");
  add(ymd(year, month, 3), "Vattenfall", "Termijnbedrag energie", year >= 2026 ? -172.0 : -189.0, "energie");
  add(ymd(year, month, 6), "Vitens", "Termijn drinkwater", -24.1, "water");
  add(ymd(year, month, 8), "Ziggo", "Internet + tv", -64.5, "internet-telefonie");
  add(ymd(year, month, 12), "Odido", "Mobiel 2 abonnementen", -41.0, "internet-telefonie");
  add(ymd(year, month, 1), "Zilveren Kruis", "Premie zorgverzekering 2 volwassenen", year >= 2026 ? -318.9 : -304.7, "zorgverzekering");
  add(ymd(year, month, 1), "Centraal Beheer", "Auto-, inboedel- en opstalverzekering", -96.35, "schadeverzekering");
  add(ymd(year, month, 27), "DELA", "Uitvaartverzekering gezin", -18.6, "uitvaartverzekering");
  if (month >= 1 && month <= 10) add(ymd(year, month, 28), "BghU", "OZB, afvalstoffen- en rioolheffing", -58.9, "gemeentelijke-lasten");
  if ([1, 4, 7, 10].includes(month)) add(ymd(year, month, 18), "Belastingdienst", "Motorrijtuigenbelasting", -112.0, "belasting");
  add(ymd(year, month, 14), "Netflix", "Netflix Standaard", -13.99, "abonnementen-media");
  add(ymd(year, month, 19), "Spotify", "Spotify Family", -17.99, "abonnementen-media");
  add(ymd(year, month, 2), "NRC", "Digitaal abonnement", -15.5, "abonnementen-media");
  add(ymd(year, month, 22), "KWF Kankerbestrijding", "Maandelijkse donatie", -10.0, "goede-doelen");
  add(ymd(year, month, 1), "Rabobank", "Kosten Basispakket", -4.6, "bankkosten");
  add(ymd(year, month, 26), "Basic-Fit", "Lidmaatschap 2 personen", -59.98, "kleding-sport");
  add(ymd(year, month, 5), "Voetbalvereniging SVO", "Contributie jeugd", -21.5, "kinderen-opleiding");
  add(ymd(year, month, 5), "Zwemschool De Spetter", "Zwemles", -48.0, "kinderen-opleiding");
  if (month !== 7) add(ymd(year, month, 4), "Kinderopvang De Vlinder", "BSO eigen bijdrage", -212.4, "kinderen-opleiding");
  add(ymd(year, month, 1), "Sem", "Zakgeld", -15.0, "zakgeld", { counterAccount: "NL00RABO0312456790" });
  add(ymd(year, month, 1), "Noor", "Zakgeld", -10.0, "zakgeld", { counterAccount: "NL00RABO0312456791" });

  // Saving and investing
  transfer(ymd(year, month, 25), "betaal", "spaar", 500, "Buffer");
  transfer(ymd(year, month, 25), "betaal", "spaar", 250, "Vakantie");
  transfer(ymd(year, month, 25), "betaal", "spaar", 100, "Auto");
  transfer(ymd(year, month, 26), "betaal", "beleggen", 150, "Maandelijkse inleg beleggen");
  if (month === 4) transfer(ymd(year, month, 27), "betaal", "spaar", 2000, "Buffer");
  if (month === 11) transfer(ymd(year, month, 27), "betaal", "spaar", 1000, "Buffer");
  transfer(ymd(year, month, 28), "betaal", "studieschuld", 128.4, "Aflossing studieschuld");
  if (month === 11) add(ymd(year, month, 31), "Rabobank", "Rente spaarrekening", between(95, 140), "overig-inkomen", { account: "spaar" });

  // Variable spending
  const days = daysIn(year, month);
  for (let day = 1; day <= days; day += 1) {
    const date = ymd(year, month, day);
    const weekday = date.getUTCDay();
    if (weekday === 6 || chance(0.36)) add(date, pick(groceries), "Betaalautomaat", -(weekday === 6 ? between(65, 145) : between(8, 48)), "boodschappen");
    if (chance(0.07)) add(date, pick(fuel), "Tankstation", -between(58, 89), "brandstof");
    if ((weekday === 5 || weekday === 6) && chance(0.35)) add(date, pick(dining), "Betaalautomaat", -between(9, 78), "horeca");
    if (chance(0.06)) add(date, pick(webshops), "iDEAL betaling", -between(14, 129), "webwinkels");
    if (chance(0.035)) add(date, pick(clothing), "Betaalautomaat", -between(18, 95), "kleding-sport");
    if (chance(0.04)) add(date, pick(homeGarden), "Betaalautomaat", -between(6, 74), "huis-tuin");
    if (chance(0.04)) add(date, "Q-Park", "Parkeren", -between(2.4, 11.5), "parkeren");
    if (chance(0.025)) add(date, "NS Groep", "OV-chipkaart opladen", -between(20, 40), "openbaar-vervoer");
    if (chance(0.015)) add(date, "Apotheek Centrum", "Medicijnen", -between(6, 38), "zorgkosten");
  }
  if (chance(0.5)) add(ymd(year, month, 9 + Math.floor(random() * 10)), "Tandartspraktijk Zuid", "Factuur behandeling", -between(45, 160), "zorgkosten");
  if (month === 3 || month === 9) add(ymd(year, month, 16), "Autobedrijf Jansen", month === 3 ? "APK en onderhoudsbeurt" : "Winterbanden en controle", -between(340, 620), "auto-onderhoud");
  if (month === 7) add(ymd(year, month, 30), "Bruna", "Schoolspullen", -between(60, 95), "kinderen-opleiding");
  if (month === 11) {
    add(ymd(year, month, 4), "Intertoys", "Sinterklaascadeaus", -between(110, 160), "gezin");
    add(ymd(year, month, 20), "Albert Heijn", "Kerstboodschappen", -between(150, 210), "boodschappen");
    add(ymd(year, month, 18), "bol.com", "Kerstcadeaus", -between(120, 180), "webwinkels");
  }
  // One unknown payment per month left for the category review queue
  if (monthKey(cursor) >= monthKey(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1)))) {
    add(ymd(year, month, 11), "Mollie *Stichting Kidsclub", "Betaling 4024 1188", -between(12, 35), null);
  }

  // Summer holiday paid from the holiday pot
  if (month === 6) {
    transfer(ymd(year, month, 5), "spaar", "betaal", 1700, "Vakantie");
    add(ymd(year, month, 6), pick(holidays), "Reservering zomervakantie", -1385.0, "vakantie");
    add(ymd(year, month, 20), "Total Energies Frankrijk", "Tanken onderweg", -94.2, "vakantie");
    add(ymd(year, month, 22), "Carrefour", "Boodschappen vakantie", -126.85, "vakantie");
    add(ymd(year, month, 24), "Restaurant Le Port", "Diner", -88.4, "vakantie");
  }
  if (month === 9) transfer(ymd(year, month, 17), "spaar", "betaal", 450, "Auto");
}

// Market movement on the investment account
for (let cursor = new Date(start); cursor <= today; cursor.setUTCMonth(cursor.getUTCMonth() + 1)) {
  const date = ymd(cursor.getUTCFullYear(), cursor.getUTCMonth(), daysIn(cursor.getUTCFullYear(), cursor.getUTCMonth()));
  add(date, "DEGIRO", "Koersresultaat", between(-260, 420), "intern", { account: "beleggen" });
  transactions.at(-1)!.kind = "interne_overboeking";
}

transactions.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

// ---------- database work ----------
function run(script: string, extraEnv: Record<string, string> = {}) {
  const result = spawnSync("npx", ["tsx", script], { stdio: "inherit", env: { ...process.env, DATABASE_URL: databaseUrl!, ...extraEnv } });
  if (result.status !== 0) throw new Error(`${script} is mislukt.`);
}

async function ensureDatabase() {
  const adminUrl = new URL(databaseUrl!);
  adminUrl.pathname = "/postgres";
  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    const exists = await admin.query("select 1 from pg_database where datname = $1", [databaseName]);
    if (!exists.rowCount) {
      await admin.query(`create database "${databaseName.replace(/"/g, "")}"`);
      console.log(`Database ${databaseName} aangemaakt.`);
    }
  } finally {
    await admin.end();
  }
}

async function main() {
  await ensureDatabase();
  run("scripts/migrate.ts");

  const pool = new Pool({ connectionString: databaseUrl });
  if (onlyIfEmpty) {
    const existing = await pool.query("select count(*)::int as count from accounts");
    if (existing.rows[0].count > 0) {
      console.log("Demo-database bevat al gegevens; niets gewijzigd.");
      await pool.end();
      return;
    }
  }

  // Cascade also empties tables that reference transactions (such as rules), so the regular seed runs afterwards.
  await pool.query(`truncate table
    transactions, imports, pending_imports, account_aliases, account_balance_observations, pots, budgets, annual_budgets,
    fixed_expenses, recurring_incomes, planned_cash_events, forecast_event_skips, month_closures, hidden_budget_items,
    ignored_suggestions, report_signal_statuses, product_events, audit_log, accounts cascade`);
  run("scripts/seed.ts", { SEED_ADMIN_EMAIL: DEMO_EMAIL, SEED_ADMIN_PASSWORD: DEMO_PASSWORD, SEED_ADMIN_NAME: DEMO_NAME, SEED_ADMIN_PASSWORD_FORCE: "true" });

  const client = await pool.connect();
  try {
    await client.query("begin");

    const importId = "imp_demo";
    await client.query(
      "insert into imports (id, source_bank, filename, file_hash, transaction_count, account_count, imported_at) values ($1, 'Rabobank', 'demo-transacties.csv', $2, $3, 4, now())",
      [importId, createHash("sha256").update(`demo|${iso(today)}`).digest("hex"), transactions.length],
    );

    for (const account of Object.values(accounts)) {
      const own = transactions.filter((transaction) => transaction.accountId === account.id);
      const balance = Math.round((account.opening + own.reduce((sum, transaction) => sum + transaction.amount, 0)) * 100) / 100;
      await client.query(
        `insert into accounts (id, name, iban, bank, type, balance, own_account, last_import_at, opening_balance, opening_balance_date, balance_date, balance_source, balance_checked_at)
         values ($1, $2, $3, $4, $5, $6, true, now(), $7, $8, $9, 'import', now())`,
        [account.id, account.name, account.iban, account.bank, account.type, balance, account.opening, iso(start), iso(today)],
      );

      // Month-end balance observations, so the balance history looks like real imports.
      let running = account.opening;
      let current = monthKey(start);
      for (const transaction of [...own, null]) {
        const txMonth = transaction?.date.slice(0, 7);
        if (transaction === null || txMonth !== current) {
          const [y, m] = current.split("-").map(Number);
          const observed = current === monthKey(today) ? iso(today) : iso(ymd(y, m - 1, 31));
          await client.query(
            "insert into account_balance_observations (id, account_id, observed_on, balance, source, import_id) values ($1, $2, $3, $4, 'import', $5)",
            [`bal_demo_${account.id}_${current}`, account.id, observed, Math.round(running * 100) / 100, importId],
          );
          if (transaction === null) break;
          current = txMonth!;
        }
        running += transaction.amount;
      }
    }

    for (const transaction of transactions) {
      await client.query(
        `insert into transactions (id, account_id, import_id, booked_at, counterparty, counter_account, description, amount, category_id, kind, transaction_hash, internal_transfer_group, rule_applied)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          transaction.id, transaction.accountId, importId, transaction.date, transaction.counterparty, transaction.counterAccount,
          transaction.description, transaction.amount, transaction.categoryId, transaction.kind,
          createHash("sha256").update(transaction.id).digest("hex"), transaction.transferGroup, transaction.rule,
        ],
      );
    }

    // Savings pots on the savings account
    const pots = [
      { name: "Buffer", target: 15000, date: null, monthly: 500 },
      { name: "Vakantie", target: 3000, date: `${today.getUTCFullYear() + 1}-06-30`, monthly: 250 },
      { name: "Auto", target: 6000, date: null, monthly: 100 },
    ];
    for (const pot of pots) {
      await client.query(
        "insert into pots (id, account_id, name, target_amount, current_amount, target_date, monthly_reservation) values ($1, $2, $3, $4, null, $5, $6)",
        [`pot_demo_${pot.name.toLowerCase()}`, accounts.spaar.id, pot.name, pot.target, pot.date, pot.monthly],
      );
    }

    // Monthly budgets: history plus the next month
    const budgetPlan: Record<string, number> = {
      boodschappen: 900, horeca: 150, brandstof: 180, webwinkels: 120, "kleding-sport": 160, "huis-tuin": 100,
      zakgeld: 25, "kinderen-opleiding": 290, parkeren: 20, "openbaar-vervoer": 30, zorgkosten: 60, vakantie: 0,
    };
    for (let cursor = new Date(start); cursor <= new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1)); cursor.setUTCMonth(cursor.getUTCMonth() + 1)) {
      const month = monthKey(cursor);
      for (const [categoryId, planned] of Object.entries(budgetPlan)) {
        const amount = categoryId === "vakantie" ? (cursor.getUTCMonth() === 6 ? 1800 : 0) : planned;
        if (!amount) continue;
        const actual = -transactions.filter((t) => t.categoryId === categoryId && t.date.startsWith(month)).reduce((sum, t) => sum + t.amount, 0);
        await client.query(
          "insert into budgets (id, month, category_id, planned_amount, actual_amount, rollover) values ($1, $2, $3, $4, $5, false)",
          [`bud_demo_${month}_${categoryId}`, month, categoryId, amount, Math.max(0, Math.round(actual * 100) / 100)],
        );
      }
    }
    await client.query(
      "insert into annual_budgets (id, year, category_id, planned_amount) values ('abud_demo_vakantie', $1, 'vakantie', 2200), ('abud_demo_auto', $1, 'auto-onderhoud', 1100)",
      [today.getUTCFullYear()],
    );

    // Fixed expenses and recurring income for forecasting
    const nextDay = (day: number) => {
      const candidate = ymd(today.getUTCFullYear(), today.getUTCMonth(), day);
      return iso(candidate > today ? candidate : ymd(today.getUTCFullYear(), today.getUTCMonth() + 1, day));
    };
    const fixed: Array<[string, string, number, string, number]> = [
      ["Rabobank Hypotheken", "wonen", 1186.42, "maandelijks", 1],
      ["Vattenfall", "energie", 172.0, "maandelijks", 3],
      ["Vitens", "water", 24.1, "maandelijks", 6],
      ["Ziggo", "internet-telefonie", 64.5, "maandelijks", 8],
      ["Odido", "internet-telefonie", 41.0, "maandelijks", 12],
      ["Zilveren Kruis", "zorgverzekering", 318.9, "maandelijks", 1],
      ["Centraal Beheer", "schadeverzekering", 96.35, "maandelijks", 1],
      ["DELA", "uitvaartverzekering", 18.6, "maandelijks", 27],
      ["BghU", "gemeentelijke-lasten", 58.9, "maandelijks", 28],
      ["Belastingdienst motorrijtuigenbelasting", "belasting", 112.0, "kwartaal", 18],
      ["Netflix", "abonnementen-media", 13.99, "maandelijks", 14],
      ["Spotify", "abonnementen-media", 17.99, "maandelijks", 19],
      ["NRC", "abonnementen-media", 15.5, "maandelijks", 2],
      ["Basic-Fit", "kleding-sport", 59.98, "maandelijks", 26],
      ["Kinderopvang De Vlinder", "kinderen-opleiding", 212.4, "maandelijks", 4],
      ["Rabobank Basispakket", "bankkosten", 4.6, "maandelijks", 1],
    ];
    for (const [supplier, categoryId, amount, frequency, day] of fixed) {
      await client.query(
        "insert into fixed_expenses (id, supplier, category_id, amount, frequency, valid_from, next_due_on) values ($1, $2, $3, $4, $5, $6, $7)",
        [`fix_demo_${supplier.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`, supplier, categoryId, amount, frequency, iso(start), nextDay(day)],
      );
    }
    await client.query(
      `insert into recurring_incomes (id, label, amount, frequency, next_expected_on, valid_from) values
       ('inc_demo_salaris_1', 'Salaris Bouwbedrijf Van Dijk', $1, 'maandelijks', $3, $5),
       ('inc_demo_salaris_2', 'Salaris Zorggroep Midden', $2, 'maandelijks', $4, $5)`,
      [3296.89, 2032.95, nextDay(24), nextDay(25), iso(start)],
    );
    const inMonths = (months: number, day: number) => iso(ymd(today.getUTCFullYear(), today.getUTCMonth() + months, day));
    await client.query(
      `insert into planned_cash_events (id, label, amount, direction, due_on, account_id) values
       ('evt_demo_wasmachine', 'Nieuwe wasmachine', 649, 'expense', $1, $3),
       ('evt_demo_belasting', 'Voorlopige aanslag teruggaaf', 412, 'income', $2, $3)`,
      [inMonths(1, 15), inMonths(2, 1), accounts.betaal.id],
    );

    await client.query("commit");
    console.log(`Demo-gegevens geladen in ${databaseName}: ${transactions.length} transacties sinds ${iso(start)}.`);
    console.log(`Inloggen: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
