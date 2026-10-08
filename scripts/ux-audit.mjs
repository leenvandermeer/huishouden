import { chromium } from "playwright-core";

const baseUrl = process.env.UX_TEST_URL ?? "http://localhost:3000";
const executablePath = process.env.CHROME_BIN ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const email = process.env.UX_TEST_EMAIL;
const password = process.env.UX_TEST_PASSWORD;
if (!email || !password) throw new Error("Stel UX_TEST_EMAIL en UX_TEST_PASSWORD in via de omgeving.");
const accountId = process.env.UX_TEST_ACCOUNT_ID;
if (!accountId) throw new Error("Stel UX_TEST_ACCOUNT_ID in voor je eigen testrekening.");
const routes = [
  "/dashboard",
  "/vermogen",
  "/rekeningen",
  `/rekeningen/${accountId}`,
  "/planning?days=30",
  "/scenario",
  "/budgetten",
  "/budgetten?view=instellingen",
  "/budgetten?view=jaar&year=2026",
  "/vaste-lasten",
  "/sparen",
  "/inzicht?rapport=overzicht",
  "/inzicht?rapport=trends",
  "/inzicht?rapport=jaar",
  "/inzicht?rapport=verwachting",
  "/inzicht?rapport=maandrapport",
  "/rapportages",
  "/transacties",
  "/importeren",
  "/beheer",
  "/categorieen",
  "/mappingregels",
  "/exporteren",
  "/audit",
  "/beheer/productstatus",
  "/instellingen",
];

const browser = await chromium.launch({ executablePath, headless: true });
const findings = [];

async function auditViewport(label, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const login = await context.request.post(`${baseUrl}/api/auth/login`, { form: { email, password } });
  if (![200, 303].includes(login.status())) throw new Error(`${label}: login mislukt met HTTP ${login.status()}`);
  const page = await context.newPage();

  for (const route of routes) {
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
    if (!response?.ok()) findings.push({ label, route, issue: `HTTP ${response?.status() ?? "onbekend"}` });
    await page.locator("#hoofdinhoud").waitFor();
    await page.waitForLoadState("load");
    await page.locator("main h1").waitFor({ state: "attached", timeout: 10_000 });
    const result = await page.evaluate(() => {
      const visible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      };
      const unnamedControls = Array.from(document.querySelectorAll("button, input:not([type=hidden]), select, textarea"))
        .filter(visible)
        .filter((element) => {
          const id = element.getAttribute("id");
          const labelled = id && document.querySelector(`label[for="${CSS.escape(id)}"]`);
          return !labelled && !element.closest("label") && !element.getAttribute("aria-label") && !element.getAttribute("aria-labelledby") && !element.getAttribute("title") && !element.textContent?.trim();
        })
        .slice(0, 5)
        .map((element) => element.outerHTML.slice(0, 160));
      return {
        h1: document.querySelectorAll("main h1").length,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        unnamedControls,
        main: document.querySelectorAll("main").length,
      };
    });
    if (result.h1 !== 1) findings.push({ label, route, issue: `${result.h1} zichtbare h1-koppen` });
    if (result.overflow) findings.push({ label, route, issue: "horizontale pagina-overflow" });
    if (result.main !== 1) findings.push({ label, route, issue: `${result.main} main-landmarks` });
    if (result.unnamedControls.length) findings.push({ label, route, issue: "naamloze bediening", details: result.unnamedControls });
  }
  await context.close();
}

try {
  await auditViewport("desktop", { width: 1512, height: 982 });
  await auditViewport("mobiel", { width: 390, height: 844 });
  if (findings.length) {
    console.error(JSON.stringify(findings, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`Volledige UX-audit geslaagd: ${routes.length} routes op desktop en mobiel.`);
  }
} finally {
  await browser.close();
}
