// ── theme.js — shared across all pages ──────────────────────
// Reads/writes 'theme' in localStorage ('dark' | 'light').
// Apply BEFORE page renders to avoid flash — include in <head>.

(function () {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
})();

function getTheme() {
  return document.documentElement.getAttribute('data-theme') || 'dark';
}

function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('theme', t);
  // Update all toggle buttons on the page
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.textContent = t === 'dark' ? '☀' : '☾';
    btn.title = t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  });
}

function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

// Once DOM is ready, sync button icons
document.addEventListener('DOMContentLoaded', () => {
  setTheme(getTheme());
});
