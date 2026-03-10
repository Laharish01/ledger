<template>
  <div class="period-wrap">
    <div class="period-tabs">
      <button
        v-for="p in periods" :key="p.value"
        class="ptab" :class="{ active: activePeriod === p.value }"
        @click="select(p.value)"
      >{{ p.label }}</button>
    </div>
    <div v-if="activePeriod === 'custom'" class="date-row">
      <input type="date" v-model="fromDate">
      <span class="sep">→</span>
      <input type="date" v-model="toDate">
      <button class="apply-btn" @click="apply">Apply</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const emit  = defineEmits(['change'])
defineProps({ activePeriod: { type: String, default: 'recent' } })

const periods  = [
  { value: 'recent', label: 'Recent' },
  { value: 'week',   label: 'Week' },
  { value: 'month',  label: 'Month' },
  { value: 'year',   label: 'Year' },
  { value: 'custom', label: 'Custom' },
]
const fromDate = ref('')
const toDate   = ref('')

function select(period) { emit('change', { period }) }
function apply()        { if (fromDate.value) emit('change', { period: 'custom', from: fromDate.value, to: toDate.value || null }) }
</script>

<style scoped>
.period-wrap { display: flex; flex-direction: column; gap: 8px; }
.period-tabs { display: flex; gap: 4px; flex-wrap: wrap; }

.ptab {
  padding: 5px 11px; border-radius: 6px; border: 1px solid var(--border);
  background: none; font-family: 'Inter', sans-serif; font-size: 0.72rem;
  font-weight: 500; color: var(--text2); cursor: pointer;
  transition: all var(--transition); white-space: nowrap;
}
.ptab:hover  { color: var(--text); border-color: var(--border2); }
.ptab.active { background: var(--accent); color: var(--accent-text); border-color: var(--accent); }

.date-row {
  display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
}
.date-row input[type="date"] {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-sm); padding: 6px 10px; color: var(--text);
  font-family: 'Inter', sans-serif; font-size: 13px; outline: none;
  transition: border-color var(--transition); color-scheme: dark;
}
[data-theme="light"] .date-row input { color-scheme: light; }
.date-row input:focus { border-color: var(--accent); }
.sep { color: var(--text2); font-size: 0.75rem; }
.apply-btn {
  padding: 6px 14px; background: var(--accent); color: var(--accent-text);
  border: none; border-radius: var(--radius-sm); font-family: 'Inter', sans-serif;
  font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: opacity var(--transition);
}
.apply-btn:hover { opacity: 0.85; }
</style>
