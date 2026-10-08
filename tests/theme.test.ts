import assert from "node:assert/strict";
import test from "node:test";
import { isThemePreference, resolveTheme } from "../src/lib/theme";

test("vaste lichte en donkere keuzes blijven staan", () => {
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
});

test("automatisch volgt het kleurenschema van het apparaat", () => {
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
});

test("alleen bekende weergavevoorkeuren worden geaccepteerd", () => {
  assert.equal(isThemePreference("light"), true);
  assert.equal(isThemePreference("dark"), true);
  assert.equal(isThemePreference("system"), true);
  assert.equal(isThemePreference("sepia"), false);
});
