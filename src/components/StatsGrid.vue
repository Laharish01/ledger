<template>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Total Spent</div>
      <div class="stat-value expense">{{ fmt(stats.expenses) }}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Income</div>
      <div class="stat-value income">{{ fmt(stats.income) }}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Transactions</div>
      <div class="stat-value">{{ stats.count }}</div>
    </div>
  </div>
</template>

<script setup>
import { useSettingsStore } from '../stores/settings'
import { storeToRefs } from 'pinia'

defineProps({ stats: { type: Object, required: true } })

const settingsStore = useSettingsStore()
const { fmt } = storeToRefs(settingsStore)
</script>

<style scoped>
.stats-grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 12px; margin-bottom: 32px;
}
.stat-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 12px; padding: 16px;
  transition: background 0.3s, border-color 0.3s;
}
.stat-label { font-size: 0.65rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; }
.stat-value { font-family: 'Roboto Slab', serif; font-size: 1.5rem; }
.stat-value.expense { color: var(--danger); }
.stat-value.income  { color: var(--success); }

@media (max-width: 600px) {
  .stats-grid { gap: 8px; }
  .stat-value { font-size: 1.2rem; }
  .stat-card  { padding: 12px; }
}
@media (max-width: 400px) { .stats-grid { grid-template-columns: 1fr; } }
</style>
