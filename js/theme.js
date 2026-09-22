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
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0f172a' : '#f6f7fb');
}

function updateThemeButton(theme) {
  const button = document.getElementById('themeToggleBtn');
  if (!button) return;
  const next = theme === 'dark' ? 'light' : 'dark';
  button.setAttribute('aria-label', `Switch to ${next} theme`);
  button.setAttribute('aria-pressed', String(theme === 'light'));
  button.title = `Switch to ${next} theme`;
}

export function applyTheme(theme, persist = false) {
  const normalized = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = normalized;
  document.documentElement.style.colorScheme = normalized;
  updateThemeMeta(normalized);
  updateThemeButton(normalized);
  if (persist) {
    try { localStorage.setItem(THEME_KEY, normalized); } catch (_) {}
  }
  return normalized;
}

export function initTheme() {
  return applyTheme(storedTheme() || 'dark');
}

export function bindThemeToggle() {
  const button = document.getElementById('themeToggleBtn');
  if (!button) return;
  updateThemeButton(document.documentElement.dataset.theme || 'dark');
  button.onclick = () => {
    const current = document.documentElement.dataset.theme || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark', true);
  };
}
