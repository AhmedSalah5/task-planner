const SETTINGS_KEY = "planner:settings";
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

function loadSettings() {
  try {
    return { theme: "system", ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) };
  } catch (e) {
    return { theme: "system" };
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function applyTheme(theme) {
  const dark = theme === "dark" || (theme === "system" && darkQuery.matches);
  document.documentElement.classList.toggle("dark", dark);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? "#0f172a" : "#4f46e5";
}

applyTheme(loadSettings().theme);
darkQuery.addEventListener("change", () => applyTheme(loadSettings().theme));