import assert from "node:assert/strict";
import test from "node:test";
import { LEGACY_ROUTE_REDIRECTS, PRODUCT_EXPERIENCE, PRODUCT_NAME, PRODUCT_RELEASE } from "../src/lib/product";
import { isProductEventType, normalizeProductPath } from "../src/modules/finance/product-health";

test("productidentiteit beschrijft het huishoudboekje", () => {
  assert.equal(PRODUCT_NAME, "Huishouden");
  assert.equal(PRODUCT_EXPERIENCE, "Huishoudboekje");
  assert.match(PRODUCT_RELEASE, /^huishouden-\d{4}\.\d{2}$/);
});

test("oude hoofdroutes houden een tijdelijke, niet-destructieve bestemming", () => {
  assert.deepEqual(LEGACY_ROUTE_REDIRECTS.find((item) => item.source === "/analyse")?.destination, "/inzicht?rapport=trends");
  assert.deepEqual(LEGACY_ROUTE_REDIRECTS.find((item) => item.source === "/geldplanning")?.destination, "/planning");
  assert.equal(new Set(LEGACY_ROUTE_REDIRECTS.map((item) => item.source)).size, LEGACY_ROUTE_REDIRECTS.length);
});

test("productmetingen accepteren alleen bekende signalen en schonen paden op", () => {
  assert.equal(isProductEventType("client.error"), true);
  assert.equal(isProductEventType("transaction.amount"), false);
  assert.equal(normalizeProductPath("/inzicht?rekening=privé#jaar"), "/inzicht");
  assert.equal(normalizeProductPath("https://voorbeeld.nl"), "/onbekend");
  assert.equal(normalizeProductPath(`/dashboard/${"x".repeat(200)}`).length, 120);
});
