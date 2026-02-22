<template>
  <!-- Top nav -->
  <nav class="top-nav">
    <RouterLink class="nav-brand" to="/app">Ledger</RouterLink>
    <div class="nav-right">
      <span
        v-if="accountId"
        class="nav-user"
        title="Click to copy Account ID"
        @click="copyId"
      >{{ copied ? 'Copied!' : accountId }}</span>
      <div class="nav-actions">
        <RouterLink to="/app"       class="nav-link desktop-only" active-class="active">Home</RouterLink>
        <RouterLink to="/analytics" class="nav-link desktop-only" active-class="active">Analytics</RouterLink>
        <button class="icon-btn" @click="$emit('open-settings')" title="Settings">⚙</button>
        <button class="icon-btn theme-btn" @click="toggleTheme" title="Toggle theme">
          {{ isDark ? '☀' : '☾' }}
        </button>
        <button class="nav-link logout desktop-only" @click="$emit('logout')">Logout</button>
      </div>
    </div>
  </nav>

  <!-- Mobile bottom tab bar -->
  <nav class="bottom-nav">
    <RouterLink to="/app"       class="tab-item" active-class="active">
      <span class="tab-icon">🏠</span>
      <span class="tab-label">Home</span>
    </RouterLink>
    <RouterLink to="/analytics" class="tab-item" active-class="active">
      <span class="tab-icon">📈</span>
      <span class="tab-label">Analytics</span>
    </RouterLink>
    <button class="tab-item" @click="$emit('open-settings')">
      <span class="tab-icon">⚙</span>
      <span class="tab-label">Settings</span>
    </button>
    <button class="tab-item logout-tab" @click="$emit('logout')">
      <span class="tab-icon">↩</span>
      <span class="tab-label">Logout</span>
    </button>
  </nav>
</template>

<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

defineProps({ accountId: String })
defineEmits(['logout', 'open-settings'])

const copied = ref(false)
const isDark = ref(document.documentElement.getAttribute('data-theme') !== 'light')

function copyId(e) {
  const text = e.currentTarget.textContent.trim()
  if (text === 'Copied!') return
  navigator.clipboard.writeText(text).then(() => {
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
  })
}

function toggleTheme() {
  const next = isDark.value ? 'light' : 'dark'
  isDark.value = !isDark.value
  window.__ledgerTheme?.set(next)
}
</script>

<style scoped>
.top-nav {
  position: sticky; top: 0; z-index: 100;
  background: rgba(10,10,15,0.9); backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border); padding: 0 24px; height: 60px;
  display: flex; align-items: center; justify-content: space-between;
  transition: background 0.3s, border-color 0.3s;
}
[data-theme="light"] .top-nav { background: rgba(245,245,240,0.92); }

.nav-brand {
  font-family: 'Roboto Slab', serif; font-size: 1.4rem;
  color: var(--accent); text-decoration: none; flex-shrink: 0;
}

.nav-right   { display: flex; align-items: center; gap: 8px; min-width: 0; }
.nav-user    {
  font-size: 0.72rem; color: var(--muted); cursor: pointer;
  transition: color 0.2s; white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis; max-width: 160px;
}
.nav-user:hover { color: var(--accent); }
.nav-actions { display: flex; gap: 4px; align-items: center; }

.nav-link {
  padding: 7px 14px; border-radius: 6px; font-family: 'Roboto', sans-serif;
  font-size: 0.75rem; letter-spacing: 0.05em; text-transform: uppercase;
  cursor: pointer; border: none; background: none; color: var(--muted);
  transition: all 0.2s; text-decoration: none; display: inline-block; white-space: nowrap;
}
.nav-link:hover, .nav-link.active { color: var(--text); background: var(--border); }
.nav-link.logout       { color: var(--danger); }
.nav-link.logout:hover { background: rgba(217,48,37,0.1); }

.icon-btn {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 8px; width: 34px; height: 34px; font-size: 0.95rem;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; color: var(--text); flex-shrink: 0;
}
.icon-btn:hover { border-color: var(--accent); }

/* ── Bottom tab bar ──────────────────────────────────────── */
.bottom-nav {
  display: none;
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 200;
  background: rgba(10,10,15,0.97); backdrop-filter: blur(20px);
  border-top: 1px solid var(--border);
  padding-bottom: env(safe-area-inset-bottom);
}
[data-theme="light"] .bottom-nav { background: rgba(245,245,240,0.97); }

.tab-item {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 3px; padding: 10px 4px;
  background: none; border: none; cursor: pointer;
  color: var(--muted); text-decoration: none; transition: color 0.2s;
  font-family: 'Roboto', sans-serif;
}
.tab-item.active, .tab-item:hover { color: var(--accent); }
.tab-item.logout-tab:hover         { color: var(--danger); }

.tab-icon  { font-size: 1.15rem; line-height: 1; }
.tab-label { font-size: 0.58rem; letter-spacing: 0.04em; text-transform: uppercase; }

@media (max-width: 640px) {
  .top-nav      { padding: 0 14px; height: 52px; }
  .desktop-only { display: none !important; }
  .nav-user     { max-width: 120px; font-size: 0.65rem; }
  .bottom-nav   { display: flex; }
}
</style>
