const THEME_KEY = 'certiforge-theme';

function storedTheme() {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch (_) {
    return null;
  }
}

function updateThemeMeta(theme) {
  if (typeof document === 'undefined' || !document.querySelector) return;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0f172a' : '#f6f7fb');
}

function updateThemeButton(theme) {
  if (typeof document === 'undefined' || !document.getElementById) return;
  const button = document.getElementById('themeToggleBtn');
  if (!button) return;
  // Toggle-button semantics: constant accessible name, aria-pressed reflects
  // the active state (dark = pressed).
  button.setAttribute('aria-label', 'Toggle dark theme');
  button.setAttribute('aria-pressed', String(theme === 'dark'));
  button.title = 'Toggle dark theme';
}

export function applyTheme(theme, persist = false) {
  const normalized = theme === 'light' ? 'light' : 'dark';
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.dataset.theme = normalized;
    if (document.documentElement.style) document.documentElement.style.colorScheme = normalized;
  }
  updateThemeMeta(normalized);
  updateThemeButton(normalized);
  if (persist) {
    try { localStorage.setItem(THEME_KEY, normalized); } catch (_) {}
  }
  return normalized;
}

export function initTheme() {
  return applyTheme(storedTheme() || 'light');
}

export function bindThemeToggle() {
  const button = document.getElementById('themeToggleBtn');
  if (!button) return;
  const current = (typeof document !== 'undefined' && document.documentElement?.dataset?.theme) || 'dark';
  updateThemeButton(current);
  button.onclick = () => {
    const current = document.documentElement?.dataset?.theme || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark', true);
  };
}
