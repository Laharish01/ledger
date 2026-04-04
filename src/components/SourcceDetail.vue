<!--
  SourceDetail — dedicated view for a single payment source.
  Shows monthly breakdown (income, expenses, net) + transaction list.
  Rendered inside AnalyticsPane replacing the main content.
  Emits: back()
-->
<template>
  <div class="source-detail">

    <!-- Header -->
    <div class="detail-header">
      <button class="back-btn" @click="$emit('back')">
        <SvgIcon :svg="iconArrowLeft" :size="16" />
        <span>Sources</span>
      </button>
      <div class="source-title">
        <div class="source-badge" :style="{ background: source.color }" />
        <div>
          <div class="source-name">{{ source.name }}</div>
          <div class="source-type">{{ typeLabel }}</div>
        </div>
      </div>
    </div>

    <!-- Hero stats for this source -->
    <div class="hero-grid">
      <div class="hero-card">
        <div class="hero-label">Total in</div>
        <div class="hero-value green">{{ fmt(totalIn) }}</div>
      </div>
      <div class="hero-card">
        <div class="hero-label">Total out</div>
        <div class="hero-value red">{{ fmt(totalOut) }}</div>
      </div>
      <div class="hero-card">
        <div class="hero-label">Net</div>
        <div class="hero-value" :class="net >= 0 ? 'green' : 'red'">{{ fmt(Math.abs(net)) }}</div>
        <div class="net-dir">{{ net >= 0 ? '↑' : '↓' }}</div>
      </div>
    </div>

    <!-- Monthly breakdown table -->
    <div class="section-card">
      <div class="section-title">Monthly breakdown</div>
      <div class="month-table">
        <div class="month-head">
          <span>Month</span>
          <span class="col-r">In</span>
          <span class="col-r">Out</span>
          <span class="col-r">Net</span>
        </div>
        <div
          v-for="m in months"
          :key="m.key"
          class="month-row"
          :class="{ current: m.isCurrent }"
        >
          <span class="month-label">{{ m.label }}</span>
          <span class="col-r income-val">{{ m.income ? fmt(m.income) : '—' }}</span>
          <span class="col-r expense-val">{{ m.expense ? fmt(m.expense) : '—' }}</span>
          <span class="col-r" :class="m.net >= 0 ? 'income-val' : 'expense-val'">
            {{ fmt(Math.abs(m.net)) }}
            <span class="net-arrow">{{ m.net >= 0 ? '↑' : '↓' }}</span>
          </span>
        </div>
        <div v-if="!months.length" class="empty-row">No transactions yet</div>
      </div>
    </div>

    <!-- Monthly expense bar chart -->
    <div class="section-card">
      <div class="section-title" style="margin-bottom:16px">Spending over time</div>
      <div class="chart-wrap"><canvas ref="barCanvas" /></div>
    </div>

    <!-- Transaction list -->
    <div class="section-card">
      <div class="section-header">
        <span class="section-title">Transactions</span>
        <span class="tx-count">{{ sourceTx.length }}</span>
      </div>
      <div class="tx-list">
        <div
          v-for="tx in sourceTx"
          :key="tx.id"
          class="tx-row"
        >
          <div class="tx-dot" :style="{ background: catColor(tx.category) }" />
          <div class="tx-info">
            <span class="tx-cat">{{ tx.category }}</span>
            <span class="tx-date">{{ dateStr(tx.created_at) }}</span>
          </div>
          <span class="tx-notes">{{ tx.notes }}</span>
          <span class="tx-amount" :class="tx.type">
            {{ tx.type === 'expense' ? '−' : '+' }}{{ fmt(tx.amount) }}
          </span>
        </div>
        <div v-if="!sourceTx.length" class="empty-row">No transactions for this source</div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Chart } from 'chart.js/auto'
import { storeToRefs }         from 'pinia'
import { useSettingsStore }    from '../stores/settings'
import { useTransactionStore } from '../stores/transactions'
import { useSourcesStore, SOURCE_TYPES } from '../stores/sources'
import { catColor }            from '../stores/transactions'
import SvgIcon                 from './SvgIcon.vue'
import { iconArrowLeft }       from '../icons'

const props = defineProps({
  source: { type: Object, required: true },
})
defineEmits(['back'])

const settings = useSettingsStore()
const txStore  = useTransactionStore()
const { fmt }  = storeToRefs(settings)
const { allTx } = storeToRefs(txStore)

// ── Helpers ───────────────────────────────────────────────────────────────────

const typeLabel = computed(() =>
  SOURCE_TYPES.find(t => t.value === props.source.type)?.label ?? props.source.type
)

function dateStr(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function getTheme() {
  const light = document.documentElement.getAttribute('data-theme') === 'light'
  return {
    muted:     light ? '#9898b0' : '#5a5a7a',
    grid:      light ? '#e0e0d8' : '#1c1c2a',
    tip:       light ? '#ffffff' : '#0f0f17',
    tipBorder: light ? '#e2e2da' : '#1c1c2a',
  }
}

// ── Transactions for this source ──────────────────────────────────────────────

const sourceTx = computed(() =>
  allTx.value
    .filter(t => t.source_id === props.source.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
)

// ── Hero stats ────────────────────────────────────────────────────────────────

const totalIn  = computed(() => sourceTx.value.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0))
const totalOut = computed(() => sourceTx.value.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0))
const net      = computed(() => totalIn.value - totalOut.value)

// ── Monthly breakdown ─────────────────────────────────────────────────────────

const months = computed(() => {
  const map = {}
  const now = new Date()

  sourceTx.value.forEach(t => {
    const d   = new Date(t.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!map[key]) map[key] = { key, label: d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }), income: 0, expense: 0 }
    map[key][t.type] += parseFloat(t.amount)
  })

  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  return Object.values(map)
    .sort((a, b) => b.key.localeCompare(a.key))
    .map(m => ({ ...m, net: m.income - m.expense, isCurrent: m.key === currentKey }))
})

// ── Bar chart ─────────────────────────────────────────────────────────────────

const barCanvas = ref(null)
let barChart    = null

async function renderChart() {
  await nextTick()
  if (!barCanvas.value || !months.value.length) return
  if (barChart) { barChart.destroy(); barChart = null }

  const tc      = getTheme()
  const ordered = [...months.value].reverse()  // chronological for chart
  const tip     = {
    backgroundColor: tc.tip, borderColor: tc.tipBorder, borderWidth: 1,
    titleColor: tc.muted, bodyColor: tc.muted, padding: 10, cornerRadius: 8,
  }

  Chart.defaults.color       = tc.muted
  Chart.defaults.font.family = "'Inter', sans-serif"
  Chart.defaults.font.size   = 11

  barChart = new Chart(barCanvas.value, {
    type: 'bar',
    data: {
      labels: ordered.map(m => m.label),
      datasets: [
        {
          label:           'Expenses',
          data:            ordered.map(m => m.expense),
          backgroundColor: 'rgba(247,82,90,0.75)',
          borderRadius:    4,
          borderSkipped:   false,
        },
        {
          label:           'Income',
          data:            ordered.map(m => m.income),
          backgroundColor: props.source.color + 'cc',
          borderRadius:    4,
          borderSkipped:   false,
        },
      ],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      interaction:         { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: tc.muted, usePointStyle: true, pointStyleWidth: 7, boxHeight: 7 } },
        tooltip: { ...tip, callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmt.value(ctx.raw)}` } },
      },
      scales: {
        x: { grid: { color: tc.grid }, ticks: { color: tc.muted } },
        y: { grid: { color: tc.grid }, ticks: { color: tc.muted, callback: v => fmt.value(v) } },
      },
    },
  })
}

onMounted(renderChart)
watch([sourceTx], renderChart)
onUnmounted(() => { if (barChart) barChart.destroy() })
</script>

<style scoped>
.source-detail { display: flex; flex-direction: column; gap: 14px; }

/* Header */
.detail-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--text2);
  font-family: 'Inter', sans-serif;
  font-size: 0.78rem;
  cursor: pointer;
  padding: 0;
  transition: color var(--transition);
  align-self: flex-start;
}
.back-btn:hover { color: var(--accent); }

.source-title {
  display: flex;
  align-items: center;
  gap: 12px;
}
.source-badge {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  flex-shrink: 0;
}
.source-name {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.1rem;
  font-weight: 600;
}
.source-type {
  font-size: 0.68rem;
  color: var(--text2);
  text-transform: capitalize;
  margin-top: 2px;
}

/* Hero */
.hero-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.hero-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 12px;
}
.hero-label { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text2); margin-bottom: 4px; }
.hero-value { font-family: 'Space Grotesk', sans-serif; font-size: 1rem; font-weight: 600; letter-spacing: -0.02em; }
.hero-value.green { color: var(--success); }
.hero-value.red   { color: var(--danger); }
.net-dir { font-size: 0.65rem; color: var(--text2); margin-top: 3px; }

/* Section */
.section-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
}
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.section-title  { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text2); }
.tx-count {
  font-size: 0.65rem;
  color: var(--text2);
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 2px 8px;
}

/* Monthly table */
.month-table { display: flex; flex-direction: column; gap: 0; margin-top: 10px; }
.month-head {
  display: grid;
  grid-template-columns: 1fr repeat(3, 72px);
  padding: 4px 0 8px;
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text2);
  border-bottom: 1px solid var(--border);
  margin-bottom: 4px;
}
.month-row {
  display: grid;
  grid-template-columns: 1fr repeat(3, 72px);
  padding: 9px 0;
  font-size: 0.78rem;
  border-bottom: 1px solid var(--border);
  transition: background var(--transition);
}
.month-row:last-child { border-bottom: none; }
.month-row.current { background: var(--surface2); border-radius: var(--radius-sm); padding: 9px 8px; }
.month-label { color: var(--text); font-weight: 500; }
.col-r       { text-align: right; font-family: 'Space Grotesk', sans-serif; font-size: 0.75rem; }
.income-val  { color: var(--success); }
.expense-val { color: var(--danger); }
.net-arrow   { font-size: 0.6rem; margin-left: 2px; }
.empty-row   { padding: 16px 0; text-align: center; color: var(--text2); font-size: 0.78rem; }

/* Chart */
.chart-wrap { position: relative; height: 200px; }

/* Transaction list */
.tx-list { display: flex; flex-direction: column; gap: 1px; margin-top: 4px; }
.tx-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 4px;
  border-bottom: 1px solid var(--border);
}
.tx-row:last-child { border-bottom: none; }
.tx-dot   { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.tx-info  { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.tx-cat   { font-size: 0.78rem; font-weight: 500; color: var(--text); }
.tx-date  { font-size: 0.62rem; color: var(--text2); }
.tx-notes { font-size: 0.68rem; color: var(--text2); max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 0; }
.tx-amount { font-family: 'Space Grotesk', sans-serif; font-size: 0.82rem; font-weight: 600; flex-shrink: 0; }
.tx-amount.expense { color: var(--danger); }
.tx-amount.income  { color: var(--success); }
</style>
