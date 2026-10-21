// 83s1c fork-owned: shared chrome for the quick-read views (switcher, theme, attribution).
import { forkAttributionLinksHtml } from '@/config/fork/footer';
import { safeStorageGet, safeStorageSet } from '@/utils/safe-storage';

export const VIEWS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/brief', label: 'Brief' },
  { href: '/terminal', label: 'Terminal' },
] as const;

// Same key the dashboard uses, so a theme choice carries across views.
const THEME_KEY = 'worldmonitor-theme';

export function viewSwitcherHtml(current: string): string {
  const links = VIEWS.map(
    (v) => `<a href="${v.href}"${v.href === current ? ' aria-current="page"' : ''}>${v.label}</a>`,
  ).join('');
  return `<nav class="v83-switcher" aria-label="Views">${links}</nav>`;
}

/** AGPL Appropriate Legal Notices on every quick-read view. */
export function viewFooterHtml(): string {
  return `<footer class="v83-footer"><nav class="v83-legal" aria-label="Copyright and license">${forkAttributionLinksHtml()}</nav></footer>`;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function timeLabel(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '';
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function initTheme(button: HTMLElement): void {
  const root = document.documentElement;
  const apply = (t: string) => {
    root.dataset.theme = t;
    button.textContent = t === 'light' ? 'Dark' : 'Light';
  };
  const stored = safeStorageGet(THEME_KEY);
  apply(stored === 'light' || stored === 'dark' ? stored : matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  button.addEventListener('click', () => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    apply(next);
    safeStorageSet(THEME_KEY, next);
  });
}
