<template>
  <nav>
    <RouterLink class="nav-brand" to="/app">Ledger</RouterLink>
    <div class="nav-right">
      <span
        v-if="accountId"
        class="nav-user"
        :title="copied ? '' : 'Click to copy Account ID'"
        @click="copyId"
      >{{ copied ? 'Copied!' : accountId }}</span>
      <div class="nav-links">
        <RouterLink to="/app"       class="nav-link" active-class="active">Home</RouterLink>
        <RouterLink to="/analytics" class="nav-link" active-class="active">Analytics</RouterLink>
        <slot name="actions" />
        <button class="icon-btn theme-btn" @click="toggleTheme" title="Toggle theme">
          {{ isDark ? '☀' : '☾' }}
        </button>
        <button class="nav-link logout" @click="$emit('logout')">Logout</button>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'

defineProps({ accountId: String })
defineEmits(['logout'])

const copied  = ref(false)
const isDark  = ref(document.documentElement.getAttribute('data-theme') !== 'light')

function copyId() {
  const id = document.querySelector('.nav-user')?.title ? '' : ''
  const accountId = document.querySelector('.nav-user')?.textContent
  navigator.clipboard.writeText(accountId).then(() => {
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
nav {
  position: sticky; top: 0; z-index: 100;
  background: rgba(10,10,15,0.9); backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border); padding: 0 24px; height: 60px;
  display: flex; align-items: center; justify-content: space-between;
  transition: background 0.3s, border-color 0.3s;
}
[data-theme="light"] nav { background: rgba(245,245,240,0.92); }

.nav-brand {
  font-family: 'Roboto Slab', serif; font-size: 1.4rem;
  color: var(--accent); text-decoration: none;
}
.nav-right  { display: flex; align-items: center; gap: 8px; }
.nav-user   { font-size: 0.72rem; color: var(--muted); cursor: pointer; transition: color 0.2s; }
.nav-user:hover { color: var(--accent); }
.nav-links  { display: flex; gap: 4px; align-items: center; }

.nav-link {
  padding: 7px 14px; border-radius: 6px; font-family: 'Roboto', sans-serif;
  font-size: 0.75rem; letter-spacing: 0.05em; text-transform: uppercase;
  cursor: pointer; border: none; background: none; color: var(--muted);
  transition: all 0.2s; text-decoration: none; display: inline-block;
}
.nav-link:hover, .nav-link.active { color: var(--text); background: var(--border); }
.nav-link.logout { color: var(--danger); }
.nav-link.logout:hover { background: rgba(217,48,37,0.1); }

.icon-btn {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 8px; width: 34px; height: 34px; font-size: 0.95rem;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; color: var(--text); flex-shrink: 0;
}
.icon-btn:hover { border-color: var(--accent); }

@media (max-width: 600px) {
  nav { padding: 0 16px; }
  .nav-user { display: none; }
}
</style>
