import { chromium } from "playwright-core";

const baseUrl = process.env.UX_TEST_URL ?? "http://localhost:3001";
const executablePath = process.env.CHROME_BIN ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const email = process.env.UX_TEST_EMAIL ?? "leen@vdmeer.local";
const password = process.env.UX_TEST_PASSWORD ?? "huishoudboekje-dev";
const outputDir = process.env.UX_TEST_OUTPUT_DIR ?? "/tmp";
const preferredAccountId = process.env.UX_TEST_ACCOUNT_ID ?? "acct_b100b8541221bcb3a9ef2dfa";
const browser = await chromium.launch({ executablePath, headless: true });
const errors = [];

function relativeLuminance(rgb) {
  const channels = rgb.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [];
  if (channels.length !== 3) throw new Error(`Ongeldige RGB-kleur: ${rgb}`);
  const linear = channels.map((value) => {
    const normalized = value / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground, background) {
  const light = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const dark = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (light + 0.05) / (dark + 0.05);
}

async function assertBrandHeroContrast(page, label) {
  const colors = await page.locator(".brand-summary-hero").evaluate((element) => ({
    text: Array.from(element.querySelectorAll("span, p, strong")).map((item) => {
      let backgroundElement = item.parentElement;
      let background = getComputedStyle(element).backgroundColor;
      while (backgroundElement && element.contains(backgroundElement)) {
        const candidate = getComputedStyle(backgroundElement).backgroundColor;
        if (candidate !== "rgba(0, 0, 0, 0)" && candidate !== "transparent") {
          background = candidate;
          break;
        }
        backgroundElement = backgroundElement.parentElement;
      }
      return { text: item.textContent?.trim().slice(0, 80), color: getComputedStyle(item).color, background };
    }),
  }));
  for (const item of colors.text.filter((item) => item.text)) {
    const ratio = contrastRatio(item.color, item.background);
    if (ratio < 4.5) throw new Error(`${label} heeft onvoldoende contrast voor "${item.text}": ${ratio.toFixed(2)}:1`);
  }
}

async function authenticatedPage(viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const response = await context.request.post(`${baseUrl}/api/auth/login`, { form: { email, password } });
  if (![200, 303].includes(response.status())) throw new Error(`Login mislukt met HTTP ${response.status()}`);
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return { context, page };
}

try {
  const macbook = await authenticatedPage({ width: 1512, height: 982 });
  await macbook.page.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
  await macbook.page.getByRole("heading", { level: 1, name: "Vandaag" }).waitFor();
  const primaryAnswer = await macbook.page.locator(".runway-kicker").innerText();
  if (!primaryAnswer.includes(" op ")) throw new Error("Vandaag noemt niet zowel inkomstenbron als datum in het hoofdantwoord");
  await macbook.page.getByText("Verwachte uitgaven tot inkomen", { exact: true }).waitFor();
  const calculationDetails = macbook.page.locator("details.runway-breakdown");
  await calculationDetails.locator("summary").click();
  await calculationDetails.getByText("rekencontract 1.0.0", { exact: false }).waitFor();
  await macbook.page.screenshot({ path: `${outputDir}/huishouden-ux-macbook.png`, fullPage: true, caret: "initial" });

  await macbook.page.goto(`${baseUrl}/transacties`, { waitUntil: "domcontentloaded" });
  await macbook.page.locator("table.data-table-modern").waitFor();
  await macbook.page.getByText("Kolommen", { exact: true }).waitFor();
  if (await macbook.page.locator("table.data-table-modern tbody tr").count() === 0) throw new Error("Transactietabel heeft geen rijen op MacBook");
  const macbookHorizontalSize = await macbook.page.locator(".transaction-table-scroll").evaluate((element) => ({ client: element.clientWidth, scroll: element.scrollWidth }));
  if (macbookHorizontalSize.scroll > macbookHorizontalSize.client + 1) throw new Error(`Transactietabel past niet op MacBook (${macbookHorizontalSize.scroll}px in ${macbookHorizontalSize.client}px)`);
  await macbook.page.getByText("Patroon", { exact: true }).waitFor();
  await macbook.page.getByText("Zekerheid", { exact: true }).waitFor();
  const filteredExport = await macbook.context.request.get(`${baseUrl}/api/export/transactions?categoryId=geen&sortBy=amount&sortDirection=asc`);
  if (filteredExport.status() !== 200 || !(await filteredExport.text()).includes('"# csv_product_version";"1.0"')) throw new Error("Gefilterde transactie-CSV voldoet niet aan productcontract 1.0");
  const todayExport = await macbook.context.request.get(`${baseUrl}/api/export/today`);
  if (todayExport.status() !== 200 || !(await todayExport.text()).includes('"Veilig te besteden"')) throw new Error("Vandaag-CSV ontbreekt of reconcileert niet zichtbaar");
  const forwardExport = await macbook.context.request.get(`${baseUrl}/api/export/forward`);
  if (forwardExport.status() !== 200 || !(await forwardExport.text()).includes('"frequency"')) throw new Error("Vooruit-CSV ontbreekt of mist frequentie");
  await macbook.page.goto(`${baseUrl}/vermogen`, { waitUntil: "domcontentloaded" });
  await macbook.page.getByRole("heading", { level: 1, name: "Je financiële geheel" }).waitFor();
  await macbook.page.getByTestId("wealth-history-chart").waitFor();
  if (!(await macbook.page.getByTestId("wealth-history-chart").getAttribute("aria-label"))) throw new Error("Vermogensgrafiek mist een toegankelijke beschrijving");
  const wealthExport = await macbook.context.request.get(`${baseUrl}/api/export/wealth`);
  if (wealthExport.status() !== 200 || !(await wealthExport.text()).includes('"# report_type";"wealth_overview"')) throw new Error("Vermogen-CSV ontbreekt of voldoet niet aan productcontract 1.0");
  const wealthOverflow = await macbook.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (wealthOverflow) throw new Error("Vermogen heeft horizontale overflow op MacBook");
  await assertBrandHeroContrast(macbook.page, "Vermogenssamenvatting in licht thema");
  await macbook.page.screenshot({ path: `${outputDir}/huishouden-ux-macbook-vermogen.png`, fullPage: true, caret: "initial" });
  await macbook.page.getByRole("radio", { name: "Donker", exact: true }).click();
  await macbook.page.locator('html[data-theme="dark"]').waitFor();
  await assertBrandHeroContrast(macbook.page, "Vermogenssamenvatting in donker thema");
  await macbook.page.screenshot({ path: `${outputDir}/huishouden-ux-macbook-vermogen-donker.png`, fullPage: true, caret: "initial" });
  await macbook.page.getByRole("radio", { name: "Licht", exact: true }).click();
  await macbook.page.locator('html[data-theme="light"]').waitFor();
  await macbook.page.goto(`${baseUrl}/categoriseren`, { waitUntil: "domcontentloaded" });
  await macbook.page.waitForURL("**/transacties?mode=review");
  if (!macbook.page.url().includes("/transacties?mode=review")) throw new Error("Review-inbox is niet verenigd met de transactiewerkruimte");
  await macbook.page.getByRole("heading", { level: 1, name: "Te controleren" }).waitFor();
  await macbook.page.screenshot({ path: `${outputDir}/huishouden-ux-macbook-transacties.png`, fullPage: true, caret: "initial" });

  await macbook.page.goto(`${baseUrl}/planning?days=30`, { waitUntil: "domcontentloaded" });
  await macbook.page.getByRole("heading", { level: 1, name: "De komende 30 dagen" }).waitFor();
  await macbook.page.getByText("Kasstroom en budget", { exact: true }).waitFor();
  await macbook.page.getByText("Laagste saldo na budgetten", { exact: true }).waitFor();
  for (const label of ["30 dagen", "60 dagen", "90 dagen"]) await macbook.page.getByRole("link", { name: label, exact: true }).waitFor();
  await macbook.page.getByText("Laagste verwachte ruimte", { exact: true }).waitFor();
  await macbook.page.getByRole("heading", { level: 2, name: "Van week tot week" }).waitFor();
  if (await macbook.page.getByText("Je planning beheren", { exact: true }).count()) throw new Error("Oud beheerblok staat nog onderaan Planning");
  const ninetyDayExport = await macbook.context.request.get(`${baseUrl}/api/export/forward?days=90`);
  if (ninetyDayExport.status() !== 200 || !(await ninetyDayExport.text()).includes('"# report_type";"forward_schedule"')) throw new Error("90-dagenplanning is niet exporteerbaar volgens het CSV-contract");
  await macbook.page.screenshot({ path: `${outputDir}/huishouden-ux-macbook-vooruit.png`, fullPage: true, caret: "initial" });
  await macbook.page.goto(`${baseUrl}/budgetten`, { waitUntil: "domcontentloaded" });
  await macbook.page.getByRole("heading", { level: 1, name: "Budgetten" }).waitFor();
  await macbook.page.getByText("Kasstroom en budget", { exact: true }).waitFor();
  const suggestionWindow = macbook.page.getByLabel("Voorstellen op", { exact: true });
  if (await suggestionWindow.inputValue() !== "6") throw new Error("Budgetvoorstellen starten niet met zes maanden historie");
  await suggestionWindow.selectOption("3");
  await macbook.page.getByRole("button", { name: "Bereken", exact: true }).click();
  await macbook.page.waitForURL("**suggestionMonths=3**");
  if (await macbook.page.getByLabel("Voorstellen op", { exact: true }).inputValue() !== "3") throw new Error("Budgetvoorstellen bewaren de gekozen drie maanden niet");
  await macbook.page.screenshot({ path: `${outputDir}/huishouden-ux-macbook-budgetten.png`, fullPage: true, caret: "initial" });
  await macbook.page.goto(`${baseUrl}/budgetten?view=instellingen&suggestionMonths=3`, { waitUntil: "domcontentloaded" });
  const copySourceSelect = macbook.page.getByLabel("Budgetplan kopiëren van", { exact: true });
  const copySourceOptions = copySourceSelect.locator("option");
  const copySourceCount = await copySourceOptions.count();
  if (copySourceCount > 0) {
    const copySource = await copySourceOptions.nth(0).getAttribute("value");
    if (copySource) {
      await macbook.page.goto(`${baseUrl}/budgetten?view=instellingen&suggestionMonths=3&copySource=${encodeURIComponent(copySource)}`, { waitUntil: "domcontentloaded" });
      await macbook.page.getByRole("heading", { level: 3, name: "Controle vóór kopiëren" }).waitFor();
      await macbook.page.screenshot({ path: `${outputDir}/huishouden-ux-macbook-budgetkopie.png`, fullPage: true, caret: "initial" });
    }
  }
  await macbook.page.goto(`${baseUrl}/budgetten?view=jaar&year=2026`, { waitUntil: "domcontentloaded" });
  await macbook.page.getByRole("heading", { level: 1, name: "Jaarbudgetten" }).waitFor();
  await macbook.page.getByLabel("Budgetjaar", { exact: true }).waitFor();
  await macbook.page.getByRole("heading", { level: 2, name: "Jaarbudgetten 2026" }).waitFor();
  await macbook.page.getByRole("button", { name: "Jaarbudget toevoegen", exact: true }).waitFor();
  const annualBudgetOverflow = await macbook.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (annualBudgetOverflow) throw new Error("Jaarbudgetten heeft horizontale overflow op MacBook");
  await macbook.page.screenshot({ path: `${outputDir}/huishouden-ux-macbook-jaarbudgetten.png`, fullPage: true, caret: "initial" });

  await macbook.page.goto(`${baseUrl}/scenario`, { waitUntil: "domcontentloaded" });
  await macbook.page.getByRole("heading", { level: 1, name: "Wat als?" }).waitFor();
  await macbook.page.getByRole("heading", { level: 2, name: "Hoe verandert je verwachte saldo?" }).waitFor();
  const scenarioExport = await macbook.context.request.get(`${baseUrl}/api/export/scenario?type=one_off_expense&amount=250&date=2026-09-24&label=Controle`);
  if (scenarioExport.status() !== 200 || !(await scenarioExport.text()).includes('"# report_type";"scenario_comparison"')) throw new Error("Scenario-CSV ontbreekt of voldoet niet aan productcontract 1.0");
  const scenarioOverflow = await macbook.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (scenarioOverflow) throw new Error("Scenario heeft horizontale overflow op MacBook");
  await macbook.page.screenshot({ path: `${outputDir}/huishouden-ux-macbook-scenario.png`, fullPage: true, caret: "initial" });

  await macbook.page.goto(`${baseUrl}/importeren`, { waitUntil: "domcontentloaded" });
  await macbook.page.getByRole("heading", { level: 1, name: "Importeer van iedere bank" }).waitFor();
  for (const format of ["CSV", "CAMT.053", "MT940"]) await macbook.page.getByText(format, { exact: true }).waitFor();
  if (await macbook.page.getByLabel("Banknaam", { exact: true }).isVisible()) throw new Error("Optionele CSV-velden staan onnodig open op de importpagina");
  await macbook.page.getByRole("link", { name: "Budgetten", exact: true }).waitFor();
  const importOverflow = await macbook.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (importOverflow) throw new Error("Importeren heeft horizontale overflow op MacBook");
  await macbook.page.screenshot({ path: `${outputDir}/huishouden-ux-macbook-importeren.png`, fullPage: true, caret: "initial" });

  await macbook.page.goto(`${baseUrl}/beheer`, { waitUntil: "domcontentloaded" });
  await macbook.page.getByRole("heading", { level: 1, name: "Instellingen" }).waitFor();
  const managementOverflow = await macbook.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (managementOverflow) throw new Error("Instellingen heeft horizontale overflow op MacBook");
  await macbook.page.screenshot({ path: `${outputDir}/huishouden-ux-macbook-instellingen.png`, fullPage: true, caret: "initial" });

  await macbook.page.goto(`${baseUrl}/beheer/productstatus`, { waitUntil: "domcontentloaded" });
  await macbook.page.getByRole("heading", { level: 1, name: "Productstatus" }).waitFor();
  const productStatusOverflow = await macbook.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (productStatusOverflow) throw new Error("Productstatus heeft horizontale overflow op MacBook");
  await macbook.page.screenshot({ path: `${outputDir}/huishouden-ux-macbook-productstatus.png`, fullPage: true, caret: "initial" });

  await macbook.page.goto(`${baseUrl}/rekeningen/${preferredAccountId}`, { waitUntil: "domcontentloaded" });
  await macbook.page.getByTestId("account-history-chart").waitFor();
  if (!(await macbook.page.getByTestId("account-history-chart").getAttribute("aria-label"))) throw new Error("Rekeninggrafiek mist een toegankelijke beschrijving");
  const accountOverflow = await macbook.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (accountOverflow) throw new Error("Rekeningdetail heeft horizontale overflow op MacBook");
  await assertBrandHeroContrast(macbook.page, "Rekeningsamenvatting in licht thema");
  await macbook.page.screenshot({ path: `${outputDir}/huishouden-ux-macbook-rekening.png`, fullPage: true, caret: "initial" });
  await macbook.page.getByRole("radio", { name: "Donker", exact: true }).click();
  await macbook.page.locator('html[data-theme="dark"]').waitFor();
  await assertBrandHeroContrast(macbook.page, "Rekeningsamenvatting in donker thema");
  await macbook.page.screenshot({ path: `${outputDir}/huishouden-ux-macbook-rekening-donker.png`, fullPage: true, caret: "initial" });
  await macbook.page.getByRole("radio", { name: "Licht", exact: true }).click();
  await macbook.page.locator('html[data-theme="light"]').waitFor();

  await macbook.page.setViewportSize({ width: 2048, height: 1080 });
  await macbook.page.goto(`${baseUrl}/transacties`, { waitUntil: "domcontentloaded" });
  await macbook.page.locator("table.data-table-modern").waitFor();
  for (const heading of ["Datum", "Rekening", "Omschrijving", "Tegenrekening", "Bedrag", "Status", "Correctie"]) {
    if (!(await macbook.page.getByRole("columnheader", { name: heading, exact: true }).isVisible())) throw new Error(`Tabelkolom ${heading} is niet zichtbaar op groot scherm`);
  }
  const horizontalSize = await macbook.page.locator(".transaction-table-scroll").evaluate((element) => ({ client: element.clientWidth, scroll: element.scrollWidth }));
  if (horizontalSize.scroll > horizontalSize.client + 1) throw new Error(`Transactietabel past niet volledig op een groot scherm (${horizontalSize.scroll}px in ${horizontalSize.client}px)`);
  const transactionLayout = await macbook.page.evaluate(() => ({
    height: document.documentElement.scrollHeight,
    outliers: Array.from(document.querySelectorAll("body *"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { tag: element.tagName, className: String(element.className).slice(0, 120), top: Math.round(rect.top), bottom: Math.round(rect.bottom), height: Math.round(rect.height), position: getComputedStyle(element).position };
      })
      .filter((item) => item.bottom > 1800 || item.height > 1800)
      .slice(0, 12),
  }));
  if (transactionLayout.height > 1800) throw new Error(`Transactiepagina is onnodig hoog (${transactionLayout.height}px): ${JSON.stringify(transactionLayout.outliers)}`);
  await macbook.page.screenshot({ path: `${outputDir}/huishouden-ux-groot-scherm-transacties.png`, fullPage: true, caret: "initial" });
  await macbook.page.goto(`${baseUrl}/vermogen`, { waitUntil: "domcontentloaded" });
  await macbook.page.getByTestId("wealth-history-chart").waitFor();
  const wealthLargeOverflow = await macbook.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (wealthLargeOverflow) throw new Error("Vermogen heeft horizontale overflow op groot scherm");
  await macbook.page.screenshot({ path: `${outputDir}/huishouden-ux-groot-scherm-vermogen.png`, fullPage: true, caret: "initial" });

  await macbook.page.setViewportSize({ width: 1512, height: 982 });
  await macbook.page.goto(`${baseUrl}/inzicht?rapport=trends`, { waitUntil: "domcontentloaded" });
  const charts = macbook.page.getByTestId("financial-chart");
  await charts.first().waitFor();
  await macbook.page.getByRole("heading", { level: 2, name: "Vier antwoorden die ertoe doen" }).waitFor();
  if (await charts.count() === 0) throw new Error("Rapport bevat geen interactieve grafieken");
  if (!(await charts.first().getAttribute("aria-label"))) throw new Error("Grafieken missen een toegankelijke beschrijving");
  await macbook.page.screenshot({ path: `${outputDir}/huishouden-ux-macbook-rapporten.png`, fullPage: true, caret: "initial" });

  await macbook.page.goto(`${baseUrl}/rapportages?periodType=month&view=begroting&referencePeriods=6`, { waitUntil: "domcontentloaded" });
  const referenceSelect = macbook.page.getByLabel("Vergelijk met", { exact: true });
  if (await referenceSelect.inputValue() !== "6") throw new Error("Rapportage bewaart de gekozen zes referentieperiodes niet");
  await macbook.page.getByText(/Gem\. [1-6] periodes/).first().waitFor();
  await macbook.page.getByRole("heading", { level: 2, name: "Uitleg in gewone taal" }).waitFor();
  await macbook.page.getByText("Regelgebaseerde uitleg", { exact: true }).waitFor();
  const reportExport = await macbook.context.request.get(`${baseUrl}/api/export/report?periodType=month&referencePeriods=6`);
  const reportCsv = await reportExport.text();
  if (reportExport.status() !== 200 || !reportCsv.includes('"Referentieperiodes"') || !reportCsv.includes('"Gemiddelde vorige 6 periodes"')) throw new Error("Rapport-CSV gebruikt de gekozen referentieperiode niet");
  const reportOverflow = await macbook.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (reportOverflow) throw new Error("Rapportages heeft horizontale overflow op MacBook");
  await macbook.page.screenshot({ path: `${outputDir}/huishouden-ux-macbook-rapportages.png`, fullPage: true, caret: "initial" });

  await macbook.page.goto(`${baseUrl}/rapportages?periodType=quarter&view=maanden&referencePeriods=3`, { waitUntil: "domcontentloaded" });
  if (await macbook.page.getByLabel("Periode", { exact: true }).inputValue() !== "quarter") throw new Error("Kwartaalrapport bewaart het gekozen periodetype niet");
  const quarterHeading = await macbook.page.locator("h1").innerText();
  if (!quarterHeading.startsWith("Kwartaaloverzicht 20")) throw new Error(`Kwartaalrapport heeft een onjuiste kop: ${quarterHeading}`);
  await macbook.page.getByText("Vergelijk kwartalen", { exact: true }).waitFor();
  if (await macbook.page.getByRole("columnheader", { name: "Kwartaal", exact: true }).count() === 0) throw new Error("Kwartaalrapport gebruikt nog geen kwartaal als tabelperiode");
  const quarterExport = await macbook.context.request.get(`${baseUrl}/api/export/report?periodType=quarter&referencePeriods=3`);
  if (quarterExport.status() !== 200 || !(await quarterExport.text()).includes('"Huishouden kwartaalrapport"')) throw new Error("Kwartaalrapport is niet exporteerbaar");
  const quarterOverflow = await macbook.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (quarterOverflow) throw new Error("Kwartaalrapport heeft horizontale overflow op MacBook");
  await macbook.page.screenshot({ path: `${outputDir}/huishouden-ux-macbook-rapportages-kwartaal.png`, fullPage: true, caret: "initial" });

  await macbook.page.goto(`${baseUrl}/rapportages?periodType=year&view=maanden&referencePeriods=3`, { waitUntil: "domcontentloaded" });
  if (await macbook.page.getByLabel("Periode", { exact: true }).inputValue() !== "year") throw new Error("Jaarrapport bewaart het gekozen periodetype niet");
  const yearHeading = await macbook.page.locator("h1").innerText();
  if (!yearHeading.startsWith("Jaaroverzicht 20")) throw new Error(`Jaarrapport heeft een onjuiste kop: ${yearHeading}`);
  await macbook.page.getByText("Vergelijk jaren", { exact: true }).waitFor();
  if (await macbook.page.getByRole("columnheader", { name: "Jaar", exact: true }).count() === 0) throw new Error("Jaarrapport gebruikt nog geen jaar als tabelperiode");
  const yearExport = await macbook.context.request.get(`${baseUrl}/api/export/report?periodType=year&referencePeriods=3`);
  if (yearExport.status() !== 200 || !(await yearExport.text()).includes('"Huishouden jaarrapport"')) throw new Error("Jaarrapport is niet exporteerbaar");
  const yearOverflow = await macbook.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (yearOverflow) throw new Error("Jaarrapport heeft horizontale overflow op MacBook");
  await macbook.page.screenshot({ path: `${outputDir}/huishouden-ux-macbook-rapportages-jaar.png`, fullPage: true, caret: "initial" });

  await macbook.page.goto(`${baseUrl}/rapportages?periodType=month&view=acties&referencePeriods=6`, { waitUntil: "domcontentloaded" });
  await macbook.page.getByRole("heading", { level: 2, name: "Wat verdient aandacht?" }).waitFor();
  await macbook.page.getByText("Deterministische controle", { exact: true }).waitFor();
  const reportActionsOverflow = await macbook.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (reportActionsOverflow) throw new Error("Rapportageacties heeft horizontale overflow op MacBook");
  await macbook.page.screenshot({ path: `${outputDir}/huishouden-ux-macbook-rapportageacties.png`, fullPage: true, caret: "initial" });
  await macbook.context.close();

  const mobile = await authenticatedPage({ width: 390, height: 844 });
  await mobile.page.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
  await mobile.page.getByRole("heading", { level: 1, name: "Vandaag" }).waitFor();
  const overflows = await mobile.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (overflows) throw new Error("Dashboard heeft horizontale overflow op mobiel");
  const mobileCalculation = mobile.page.locator("details.runway-breakdown");
  await mobileCalculation.locator("summary").click();
  if ((await mobileCalculation.evaluate((element) => getComputedStyle(element).position)) !== "fixed") throw new Error("Uitleg over veilig te besteden opent niet als mobiele sheet");
  await mobileCalculation.getByText("Gebruikte bronnen", { exact: true }).waitFor();
  await mobile.page.screenshot({ path: `${outputDir}/huishouden-ux-mobile.png`, fullPage: true, caret: "initial" });
  await mobile.page.keyboard.press("Escape");
  await mobile.page.goto(`${baseUrl}/vaste-lasten`, { waitUntil: "domcontentloaded" });
  await mobile.page.getByRole("heading", { level: 2, name: "Van vandaag naar het volgende inkomen" }).waitFor();
  await mobile.page.getByRole("heading", { level: 2, name: "Verwachte inkomsten" }).waitFor();
  await mobile.page.screenshot({ path: `${outputDir}/huishouden-ux-mobile-vooruit.png`, fullPage: true, caret: "initial" });
  await mobile.page.goto(`${baseUrl}/planning?days=30`, { waitUntil: "domcontentloaded" });
  await mobile.page.getByRole("heading", { level: 1, name: "De komende 30 dagen" }).waitFor();
  await mobile.page.getByText("Kasstroom en budget", { exact: true }).waitFor();
  if (await mobile.page.getByText("Je planning beheren", { exact: true }).count()) throw new Error("Oud beheerblok staat mobiel nog onderaan Planning");
  const planningOverflow = await mobile.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (planningOverflow) throw new Error("Vooruit heeft horizontale overflow op mobiel");
  await mobile.page.screenshot({ path: `${outputDir}/huishouden-ux-mobile-planning.png`, fullPage: true, caret: "initial" });
  await mobile.page.goto(`${baseUrl}/budgetten`, { waitUntil: "domcontentloaded" });
  await mobile.page.getByText("Kasstroom en budget", { exact: true }).waitFor();
  await mobile.page.goto(`${baseUrl}/budgetten?view=jaar&year=2026`, { waitUntil: "domcontentloaded" });
  await mobile.page.getByRole("heading", { level: 1, name: "Jaarbudgetten" }).waitFor();
  const annualBudgetMobileOverflow = await mobile.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (annualBudgetMobileOverflow) throw new Error("Jaarbudgetten heeft horizontale overflow op mobiel");
  await mobile.page.screenshot({ path: `${outputDir}/huishouden-ux-mobile-jaarbudgetten.png`, fullPage: true, caret: "initial" });
  await mobile.page.goto(`${baseUrl}/scenario`, { waitUntil: "domcontentloaded" });
  await mobile.page.getByRole("heading", { level: 1, name: "Wat als?" }).waitFor();
  const scenarioMobileOverflow = await mobile.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (scenarioMobileOverflow) throw new Error("Scenario heeft horizontale overflow op mobiel");
  await mobile.page.screenshot({ path: `${outputDir}/huishouden-ux-mobile-scenario.png`, fullPage: true, caret: "initial" });
  await mobile.page.goto(`${baseUrl}/importeren`, { waitUntil: "domcontentloaded" });
  await mobile.page.getByRole("heading", { level: 1, name: "Importeer van iedere bank" }).waitFor();
  await mobile.page.getByText("CAMT.053", { exact: true }).first().waitFor();
  const importMobileOverflow = await mobile.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (importMobileOverflow) throw new Error("Importeren heeft horizontale overflow op mobiel");
  await mobile.page.screenshot({ path: `${outputDir}/huishouden-ux-mobile-importeren.png`, fullPage: true, caret: "initial" });
  await mobile.page.goto(`${baseUrl}/beheer`, { waitUntil: "domcontentloaded" });
  await mobile.page.getByRole("heading", { level: 1, name: "Instellingen" }).waitFor();
  const settingsMobileOverflow = await mobile.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (settingsMobileOverflow) throw new Error("Instellingen heeft horizontale overflow op mobiel");
  await mobile.page.screenshot({ path: `${outputDir}/huishouden-ux-mobile-instellingen.png`, fullPage: true, caret: "initial" });
  await mobile.page.goto(`${baseUrl}/beheer/productstatus`, { waitUntil: "domcontentloaded" });
  await mobile.page.getByRole("heading", { level: 1, name: "Productstatus" }).waitFor();
  const productStatusMobileOverflow = await mobile.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (productStatusMobileOverflow) throw new Error("Productstatus heeft horizontale overflow op mobiel");
  await mobile.page.screenshot({ path: `${outputDir}/huishouden-ux-mobile-productstatus.png`, fullPage: true, caret: "initial" });
  await mobile.page.goto(`${baseUrl}/vermogen`, { waitUntil: "domcontentloaded" });
  await mobile.page.getByRole("heading", { level: 1, name: "Je financiële geheel" }).waitFor();
  const wealthMobileOverflow = await mobile.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (wealthMobileOverflow) throw new Error("Vermogen heeft horizontale overflow op mobiel");
  await assertBrandHeroContrast(mobile.page, "Mobiele vermogenssamenvatting in licht thema");
  await mobile.page.screenshot({ path: `${outputDir}/huishouden-ux-mobile-vermogen.png`, fullPage: true, caret: "initial" });
  await mobile.page.evaluate(() => {
    localStorage.setItem("huishouden-theme", "dark");
    document.documentElement.dataset.theme = "dark";
    document.documentElement.dataset.themePreference = "dark";
    document.documentElement.style.colorScheme = "dark";
  });
  await mobile.page.locator('html[data-theme="dark"]').waitFor();
  await assertBrandHeroContrast(mobile.page, "Mobiele vermogenssamenvatting in donker thema");
  await mobile.page.screenshot({ path: `${outputDir}/huishouden-ux-mobile-vermogen-donker.png`, fullPage: true, caret: "initial" });
  await mobile.page.evaluate(() => {
    localStorage.setItem("huishouden-theme", "light");
    document.documentElement.dataset.theme = "light";
    document.documentElement.dataset.themePreference = "light";
    document.documentElement.style.colorScheme = "light";
  });
  await mobile.page.locator('html[data-theme="light"]').waitFor();
  await mobile.page.goto(`${baseUrl}/rapportages?periodType=month&view=begroting&referencePeriods=6`, { waitUntil: "domcontentloaded" });
  if (await mobile.page.getByLabel("Vergelijk met", { exact: true }).inputValue() !== "6") throw new Error("Mobiele rapportage bewaart de referentieperiode niet");
  const reportMobileOverflow = await mobile.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (reportMobileOverflow) throw new Error("Rapportages heeft horizontale overflow op mobiel");
  await mobile.page.screenshot({ path: `${outputDir}/huishouden-ux-mobile-rapportages.png`, fullPage: true, caret: "initial" });
  await mobile.page.goto(`${baseUrl}/rapportages?periodType=quarter&view=maanden&referencePeriods=3`, { waitUntil: "domcontentloaded" });
  await mobile.page.getByText("Vergelijk kwartalen", { exact: true }).waitFor();
  const quarterMobileOverflow = await mobile.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (quarterMobileOverflow) throw new Error("Kwartaalrapport heeft horizontale overflow op mobiel");
  await mobile.page.screenshot({ path: `${outputDir}/huishouden-ux-mobile-rapportages-kwartaal.png`, fullPage: true, caret: "initial" });
  await mobile.page.goto(`${baseUrl}/rapportages?periodType=month&view=acties&referencePeriods=6`, { waitUntil: "domcontentloaded" });
  await mobile.page.getByRole("heading", { level: 2, name: "Wat verdient aandacht?" }).waitFor();
  const reportActionsMobileOverflow = await mobile.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (reportActionsMobileOverflow) throw new Error("Rapportageacties heeft horizontale overflow op mobiel");
  await mobile.page.screenshot({ path: `${outputDir}/huishouden-ux-mobile-rapportageacties.png`, fullPage: true, caret: "initial" });
  await mobile.page.goto(`${baseUrl}/transacties`, { waitUntil: "domcontentloaded" });
  await mobile.page.locator("article").first().waitFor();
  if (await mobile.page.locator("table.data-table-modern").isVisible()) throw new Error("Desktoptabel is zichtbaar op mobiel");
  if (await mobile.page.locator("article").count() === 0) throw new Error("Mobiele transactielijst ontbreekt");
  const mobileFilterToggle = mobile.page.getByRole("button", { name: "Filters", exact: true });
  if (await mobileFilterToggle.count() !== 1) throw new Error("Mobiele filterknop ontbreekt");
  await mobileFilterToggle.click();
  if (!(await mobile.page.getByLabel("Patroon", { exact: true }).isVisible())) throw new Error("Patroonfilter is niet bereikbaar in de mobiele filterlaag");
  const transactionOverflows = await mobile.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (transactionOverflows) throw new Error("Transactiepagina heeft horizontale overflow op mobiel");
  await mobile.page.screenshot({ path: `${outputDir}/huishouden-ux-mobile-transacties.png`, fullPage: false, caret: "initial" });
  await mobile.page.goto(`${baseUrl}/rekeningen/${preferredAccountId}`, { waitUntil: "domcontentloaded" });
  await mobile.page.getByTestId("account-history-chart").waitFor();
  const accountMobileOverflow = await mobile.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (accountMobileOverflow) throw new Error("Rekeningdetail heeft horizontale overflow op mobiel");
  await mobile.page.screenshot({ path: `${outputDir}/huishouden-ux-mobile-rekening.png`, fullPage: true, caret: "initial" });
  await mobile.context.close();

  if (errors.length) throw new Error(`Browserconsole bevat fouten:\n${errors.join("\n")}`);
  console.log(`UX-smoketest geslaagd. Screenshots staan in ${outputDir}/huishouden-ux-*.png`);
} finally {
  await browser.close();
}
