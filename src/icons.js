/**
 * icons.js — Inline SVG icon library
 *
 * Sources: Lucide (ISC licence), Heroicons (MIT), Tabler Icons (MIT)
 * Each icon is a raw SVG string; use via v-html on a sized wrapper.
 * Standard viewBox: "0 0 24 24", stroke-based unless noted.
 */

const ATTRS = `xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
  fill="none" stroke="currentColor" stroke-width="1.8"
  stroke-linecap="round" stroke-linejoin="round"`

// Lucide — pencil
export const iconEdit = `<svg ${ATTRS}>
  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
</svg>`

// Lucide — trash-2
export const iconTrash = `<svg ${ATTRS}>
  <polyline points="3 6 5 6 21 6"/>
  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
  <path d="M10 11v6M14 11v6"/>
  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
</svg>`

// Lucide — settings (gear)
export const iconSettings = `<svg ${ATTRS}>
  <circle cx="12" cy="12" r="3"/>
  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
</svg>`

// Lucide — sun
export const iconSun = `<svg ${ATTRS}>
  <circle cx="12" cy="12" r="5"/>
  <line x1="12" y1="1" x2="12" y2="3"/>
  <line x1="12" y1="21" x2="12" y2="23"/>
  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
  <line x1="1" y1="12" x2="3" y2="12"/>
  <line x1="21" y1="12" x2="23" y2="12"/>
  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
</svg>`

// Lucide — moon
export const iconMoon = `<svg ${ATTRS}>
  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
</svg>`

// Lucide — log-out
export const iconLogout = `<svg ${ATTRS}>
  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
  <polyline points="16 17 21 12 16 7"/>
  <line x1="21" y1="12" x2="9" y2="12"/>
</svg>`

// Lucide — copy
export const iconCopy = `<svg ${ATTRS}>
  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
</svg>`

// Lucide — check
export const iconCheck = `<svg ${ATTRS}>
  <polyline points="20 6 9 17 4 12"/>
</svg>`

// Lucide — corner-down-left (enter/submit)
export const iconEnter = `<svg ${ATTRS}>
  <polyline points="9 10 4 15 9 20"/>
  <path d="M20 4v7a4 4 0 0 1-4 4H4"/>
</svg>`

// Lucide — home
export const iconHome = `<svg ${ATTRS}>
  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
  <polyline points="9 22 9 12 15 12 15 22"/>
</svg>`

// Lucide — bar-chart-2
export const iconChart = `<svg ${ATTRS}>
  <line x1="18" y1="20" x2="18" y2="10"/>
  <line x1="12" y1="20" x2="12" y2="4"/>
  <line x1="6"  y1="20" x2="6"  y2="14"/>
</svg>`

// Lucide — trending-up (income)
export const iconIncome = `<svg ${ATTRS}>
  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
  <polyline points="17 6 23 6 23 12"/>
</svg>`

// Lucide — trending-down (expense)
export const iconExpense = `<svg ${ATTRS}>
  <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
  <polyline points="17 18 23 18 23 12"/>
</svg>`

// Lucide — upload (import)
export const iconUpload = `<svg ${ATTRS}>
  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
  <polyline points="17 8 12 3 7 8"/>
  <line x1="12" y1="3" x2="12" y2="15"/>
</svg>`

// Lucide — download (export)
export const iconDownload = `<svg ${ATTRS}>
  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
  <polyline points="7 10 12 15 17 10"/>
  <line x1="12" y1="15" x2="12" y2="3"/>
</svg>`

// Lucide — x (close)
export const iconClose = `<svg ${ATTRS}>
  <line x1="18" y1="6" x2="6" y2="18"/>
  <line x1="6" y1="6" x2="18" y2="18"/>
</svg>`

// Lucide — alert-triangle (warning)
export const iconWarn = `<svg ${ATTRS}>
  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
  <line x1="12" y1="9" x2="12" y2="13"/>
  <line x1="12" y1="17" x2="12.01" y2="17"/>
</svg>`

// Lucide — search
export const iconSearch = `<svg ${ATTRS}>
  <circle cx="11" cy="11" r="8"/>
  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
</svg>`

// Lucide — credit-card (for sources)
export const iconCard = `<svg ${ATTRS}>
  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
  <line x1="1" y1="10" x2="23" y2="10"/>
</svg>`

// Lucide — arrow-left
export const iconArrowLeft = `<svg ${ATTRS}>
  <line x1="19" y1="12" x2="5" y2="12"/>
  <polyline points="12 19 5 12 12 5"/>
</svg>`

// Lucide — calendar
export const iconCalendar = `<svg ${ATTRS}>
  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
  <line x1="16" y1="2" x2="16" y2="6"/>
  <line x1="8" y1="2" x2="8" y2="6"/>
  <line x1="3" y1="10" x2="21" y2="10"/>
</svg>`

// Lucide — chevron-right
export const iconChevronRight = `<svg ${ATTRS}>
  <polyline points="9 18 15 12 9 6"/>
</svg>`
