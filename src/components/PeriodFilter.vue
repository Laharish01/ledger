<template>
  <div>
    <div class="list-header">
      <div class="section-title">Recent Transactions</div>
      <div class="period-tabs">
        <button
          v-for="p in periods"
          :key="p.value"
          class="period-tab"
          :class="{ active: activePeriod === p.value }"
          @click="select(p.value)"
        >{{ p.label }}</button>
      </div>
    </div>

    <div class="date-range" :class="{ show: activePeriod === 'custom' }">
      <input type="date" v-model="fromDate">
      <span class="sep">→</span>
      <input type="date" v-model="toDate">
      <button class="apply-btn" @click="applyCustom">Apply</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['change'])

const props = defineProps({ activePeriod: { type: String, default: 'recent' } })

const periods = [
  { value: 'recent', label: 'Recent' },
  { value: 'week',   label: 'This Week' },
  { value: 'month',  label: 'This Month' },
  { value: 'year',   label: 'This Year' },
  { value: 'custom', label: 'Custom' },
]

const fromDate = ref('')
const toDate   = ref('')

function select(period) {
  if (period !== 'custom') emit('change', { period })
  else emit('change', { period })   // show date pickers, wait for apply
}

function applyCustom() {
  if (!fromDate.value) return
  emit('change', { period: 'custom', from: fromDate.value, to: toDate.value || null })
}
</script>

<style scoped>
.list-header {
  display: flex; align-items: center;
  justify-content: space-between; margin-bottom: 16px; gap: 12px; flex-wrap: wrap;
}
.section-title { font-size: 0.7rem; letter-spacing: 0.15em; text-transform: uppercase; color: var(--muted); }

.period-tabs { display: flex; gap: 4px; flex-wrap: wrap; }
.period-tab {
  padding: 5px 10px; border-radius: 6px; border: 1px solid var(--border);
  background: none; font-family: 'Roboto', sans-serif; font-size: 0.7rem;
  letter-spacing: 0.04em; color: var(--muted); cursor: pointer;
  transition: all 0.15s; white-space: nowrap;
}
.period-tab:hover  { color: var(--text); border-color: var(--hover-border); }
.period-tab.active { background: var(--accent); color: var(--accent-text); border-color: var(--accent); }

.date-range {
  display: none; gap: 8px; align-items: center; margin-bottom: 16px; flex-wrap: wrap;
}
.date-range.show { display: flex; }
.date-range input[type="date"] {
  background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
  padding: 7px 10px; color: var(--text); font-family: 'Roboto', sans-serif;
  font-size: 14px; outline: none; transition: border-color 0.2s; color-scheme: dark;
}
[data-theme="light"] .date-range input[type="date"] { color-scheme: light; }
.date-range input:focus { border-color: var(--accent); }
.sep { color: var(--muted); font-size: 0.75rem; }
.apply-btn {
  padding: 7px 14px; background: var(--accent); color: var(--accent-text);
  border: none; border-radius: 8px; font-family: 'Roboto', sans-serif;
  font-size: 0.75rem; cursor: pointer; transition: opacity 0.2s;
}
.apply-btn:hover { opacity: 0.85; }
</style>
