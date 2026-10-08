(function () {
  try {
    var stored = window.localStorage.getItem("huishouden-theme");
    var preference = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    var dark = preference === "dark" || (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    var theme = dark ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.style.colorScheme = theme;
  } catch (_) {
    document.documentElement.dataset.theme = "light";
  }
})();
