"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { isThemePreference, resolveTheme, THEME_STORAGE_KEY, type ThemePreference } from "@/lib/theme";

const options = [
  { value: "light", label: "Licht", shortLabel: "Licht", icon: Sun },
  { value: "system", label: "Automatisch", shortLabel: "Auto", icon: Monitor },
  { value: "dark", label: "Donker", shortLabel: "Donker", icon: Moon },
] as const;

export function ThemeSelector({ compact = false }: { compact?: boolean }) {
  const preference = useSyncExternalStore(subscribe, getSnapshot, () => "system" as ThemePreference);

  function selectTheme(next: ThemePreference) {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    applyTheme(next);
    window.dispatchEvent(new Event("huishouden-theme"));
  }

  return (
    <fieldset className={compact ? "theme-selector theme-selector--compact" : "theme-selector"}>
      <legend className={compact ? "sr-only" : undefined}>Weergave</legend>
      <div role="radiogroup" aria-label="Kleurweergave">
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <button key={option.value} type="button" role="radio" aria-checked={preference === option.value} onClick={() => selectTheme(option.value)} title={option.label}>
              <Icon aria-hidden="true" size={15} />
              <span>{compact ? option.shortLabel : option.label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function subscribe(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    applyTheme(getSnapshot());
    callback();
  };
  window.addEventListener("storage", onChange);
  window.addEventListener("huishouden-theme", onChange);
  media.addEventListener("change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("huishouden-theme", onChange);
    media.removeEventListener("change", onChange);
  };
}

function getSnapshot(): ThemePreference {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemePreference(stored) ? stored : "system";
}

function applyTheme(preference: ThemePreference) {
  const theme = resolveTheme(preference, window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.style.colorScheme = theme;
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#10131a" : "#f5f7fc");
}
