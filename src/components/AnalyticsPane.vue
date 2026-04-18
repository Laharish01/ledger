<!--
  AnalyticsPane — simplified analytics.

  Design approach (inspired by Copilot Money, Monarch, YNAB):
  - One filter panel controls ALL data on the page (period + category + source)
  - Every number shown is scoped to the exact same filtered dataset
  - Three sections: Overview → Breakdown → Transactions
  - No redundant charts — one clear cash flow chart, one category breakdown
-->
<template>
  <div class="analytics">

    <!-- Source detail takeover -->
    <SourceDetail
      v-if="selectedSource"
      :source="selectedSource"
      @back="selectedSource = null"
    />

    <template v-else>

      <div v-if="!allTx.length" class="state-empty">
        <div class="empty-icon"><SvgIcon :svg="iconChart" :size="36" /></div>
        <p>Add transactions to see analytics</p>
      </div>

      <template v-else>

        <!-- ══ FILTER BAR ══════════════════════════════════════════ -->
        <div class="filter-bar">
          <button class="filter-toggle" :class="{ active: filterOpen }" @click="filterOpen = !filterOpen">
            <SvgIcon :svg="iconFilter" :size="14" />
            Filters
            <span v-if="activeFilterCount" class="filter-badge">{{ activeFilterCount }}</span>
          </button>
          <div class="active-chips">
            <button v-if="filters.range !== '1M'" class="chip" @click="filters.range = '1M'">
              {{ RANGES.find(r => r.key === filters.range)?.label }}
              <SvgIcon :svg="iconClose" :size="9" />
            </button>
            <button v-for="cat in filters.categories" :key="cat" class="chip" @click="toggleCat(cat)">
              {{ cat }}<SvgIcon :svg="iconClose" :size="9" />
            </button>
            <button v-for="sid in filters.sources" :key="sid" class="chip" @click="toggleSrc(sid)">
              {{ sourcesStore.list.find(s => s.id === sid)?.name }}<SvgIcon :svg="iconClose" :size="9" />
            </button>
            <button v-if="activeFilterCount" class="chip chip-clear" @click="clearFilters">Clear</button>
          </div>
        </div>

        <!-- ══ FILTER PANEL ════════════════════════════════════════ -->
        <Transition name="panel">
          <div v-if="filterOpen" class="filter-panel">

            <div class="fp-section">
              <div class="fp-label">Period</div>
              <div class="fp-pills">
                <button
                  v-for="r in RANGES" :key="r.key"
                  class="fp-pill" :class="{ active: filters.range === r.key }"
                  @click="filters.range = r.key"
                >{{ r.label }}</button>
              </div>
            </div>

            <div class="fp-divider" />

            <div class="fp-section">
              <div class="fp-label">
                Category
                <span v-if="filters.categories.length" class="fp-sel">{{ filters.categories.length }} selected</span>
              </div>
              <div class="fp-search-row">
                <SvgIcon :svg="iconSearch" :size="12" class="fp-search-icon" />
                <input v-model="catQ" class="fp-search" placeholder="Search…" autocomplete="off">
              </div>
              <div class="fp-list">
                <button
                  v-for="c in visibleCats" :key="c.name"
                  class="fp-item" :class="{ active: filters.categories.includes(c.name) }"
                  @click="toggleCat(c.name)"
                >
                  <span class="fp-box"><SvgIcon v-if="filters.categories.includes(c.name)" :svg="iconCheck" :size="9" /></span>
                  <span class="fp-dot" :style="{ background: c.color }" />
                  <span class="fp-name">{{ c.name }}</span>
                  <span class="fp-val">{{ fmt(c.total) }}</span>
                </button>
                <p v-if="!visibleCats.length" class="fp-none">No categories</p>
              </div>
            </div>

            <div v-if="sourcesStore.list.length" class="fp-divider" />

            <div v-if="sourcesStore.list.length" class="fp-section">
              <div class="fp-label">
                Payment method
                <span v-if="filters.sources.length" class="fp-sel">{{ filters.sources.length }} selected</span>
              </div>
              <div class="fp-list">
                <button
                  v-for="s in sourcesStore.list" :key="s.id"
                  class="fp-item" :class="{ active: filters.sources.includes(s.id) }"
                  @click="toggleSrc(s.id)"
                >
                  <span class="fp-box"><SvgIcon v-if="filters.sources.includes(s.id)" :svg="iconCheck" :size="9" /></span>
                  <span class="fp-dot" :style="{ background: s.color }" />
                  <span class="fp-name">{{ s.name }}</span>
                  <span class="fp-val fp-sub">{{ s.type }}</span>
                </button>
              </div>
            </div>

            <button class="fp-apply" @click="filterOpen = false">
              Show {{ filteredTx.length }} transactions
            </button>
          </div>
        </Transition>

        <!-- ══ OVERVIEW ════════════════════════════════════════════ -->
        <div class="overview-grid">
          <div class="ov-card">
            <div class="ov-label">Income</div>
            <div class="ov-value green">{{ fmt(totalIncome) }}</div>
            <div class="ov-sub">{{ incomes.length }} transactions</div>
          </div>
          <div class="ov-card">
            <div class="ov-label">Expenses</div>
            <div class="ov-value red">{{ fmt(totalExpense) }}</div>
            <div class="ov-sub">{{ expenses.length }} transactions</div>
          </div>
          <div class="ov-card ov-net" :class="net >= 0 ? 'pos' : 'neg'">
            <div class="ov-label">Net</div>
            <div class="ov-value">{{ net >= 0 ? '+' : '−' }}{{ fmt(Math.abs(net)) }}</div>
            <div class="ratio-bar">
              <div class="ratio-fill" :style="{ width: Math.min(spendRatio, 100) + '%' }" :class="{ over: spendRatio > 100 }" />
            </div>
            <div class="ov-sub">{{ spendRatio.toFixed(0) }}% spent</div>
          </div>
        </div>

        <!-- ══ CASH FLOW CHART ════════════════════════════════════ -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Cash flow</span>
            <span class="card-sub">{{ rangeLabel }}</span>
          </div>
          <div class="chart-wrap"><canvas ref="lineCanvas" /></div>
        </div>

        <!-- ══ SPENDING BREAKDOWN ══════════════════════════════════ -->
        <div v-if="topCats.length" class="card">
          <div class="card-header">
            <span class="card-title">Spending by category</span>
            <span class="card-sub">{{ topCats.length }} categories · {{ fmt(totalExpense) }}</span>
          </div>
          <div class="cat-list">
            <div v-for="(c, i) in topCats" :key="c.category" class="cat-row">
              <div class="cat-dot" :style="{ background: COLORS[i % COLORS.length] }" />
              <span class="cat-name">{{ c.category }}</span>
              <div class="bar-wrap">
                <div class="bar-fill" :style="{ width: (c.total / topCats[0].total * 100) + '%', background: COLORS[i % COLORS.length] }" />
              </div>
              <span class="cat-pct">{{ (c.total / totalExpense * 100).toFixed(0) }}%</span>
              <span class="cat-amt">{{ fmt(c.total) }}</span>
            </div>
          </div>
        </div>

        <!-- ══ PAYMENT METHODS ════════════════════════════════════ -->
        <div v-if="sourcesStore.list.length && bySource.length" class="card">
          <div class="card-header">
            <span class="card-title">By payment method</span>
            <span class="card-sub">tap for detail</span>
          </div>
          <div class="source-list">
            <button
              v-for="row in bySource" :key="row.id"
              class="source-row"
              @click="selectedSource = sourcesStore.list.find(s => s.id === row.id)"
            >
              <span class="source-dot" :style="{ background: row.color }" />
              <span class="source-name">{{ row.name }}</span>
              <span class="source-counts">{{ row.txCount }} tx</span>
              <span class="source-out">−{{ fmt(row.out) }}</span>
              <span class="source-in">+{{ fmt(row.in) }}</span>
              <SvgIcon :svg="iconChevronRight" :size="12" class="source-chevron" />
            </button>
          </div>
        </div>

        <!-- ══ TRANSACTIONS ════════════════════════════════════════ -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Transactions</span>
            <span class="card-sub">{{ filteredTx.length }} total</span>
          </div>

          <!-- Group by month -->
          <div v-for="group in txGroups" :key="group.month" class="tx-group">
            <div class="tx-group-header">
              <span class="tx-month">{{ group.month }}</span>
              <span class="tx-month-net" :class="group.net >= 0 ? 'green' : 'red'">
                {{ group.net >= 0 ? '+' : '−' }}{{ fmt(Math.abs(group.net)) }}
              </span>
            </div>
            <div
              v-for="tx in group.items"
              :key="tx.id"
              class="tx-row"
            >
              <div class="tx-dot" :style="{ background: catColor(tx.category) }" />
              <div class="tx-info">
                <span class="tx-cat">{{ tx.category }}</span>
                <span class="tx-meta">
                  {{ tx.notes || '—' }}
                  <span v-if="sourceOf(tx)" class="tx-source" :style="{ color: sourceOf(tx).color }">
                    · {{ sourceOf(tx).name }}
                  </span>
                </span>
              </div>
              <div class="tx-right">
                <span class="tx-amount" :class="tx.type">
                  {{ tx.type === 'expense' ? '−' : '+' }}{{ fmt(tx.amount) }}
                </span>
                <span class="tx-date">{{ shortDate(tx.created_at) }}</span>
              </div>
            </div>
          </div>

          <div v-if="!filteredTx.length" class="empty-hint">
            No transactions match the current filters
          </div>
        </div>

      </template>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onUnmounted, nextTick, reactive } from 'vue'
import { Chart } from 'chart.js/auto'
import { storeToRefs } from 'pinia'
import { useSettingsStore }    from '../stores/settings'
import { useTransactionStore, catColor } from '../stores/transactions'
import { useSourcesStore }     from '../stores/sources'
import SvgIcon      from './SvgIcon.vue'
import SourceDetail from './SourceDetail.vue'
import { iconChart, iconSearch, iconChevronRight, iconClose, iconCheck, iconFilter } from '../icons'

const props = defineProps({ currency: String })

const settings     = useSettingsStore()
const txStore      = useTransactionStore()
const sourcesStore = useSourcesStore()
const { fmt }      = storeToRefs(settings)
const { allTx }    = storeToRefs(txStore)

// ── Constants ─────────────────────────────────────────────────────────────────

const COLORS = ['#7c6af7','#b8f735','#f7525a','#3dd68c','#fb923c','#38bdf8','#e879f9','#fbbf24','#34d399','#f87171']

const RANGES = [
  { key: '1M', label: '1M' }, { key: '3M', label: '3M' },
  { key: '6M', label: '6M' }, { key: '1Y', label: '1Y' },
  { key: 'all', label: 'All' },
]

// ── Filter state ──────────────────────────────────────────────────────────────

const filterOpen     = ref(false)
const catQ           = ref('')
const selectedSource = ref(null)

const filters = reactive({ range: '1M', categories: [], sources: [] })

const activeFilterCount = computed(() =>
  (filters.range !== '1M' ? 1 : 0) + filters.categories.length + filters.sources.length
)
const rangeLabel = computed(() => RANGES.find(r => r.key === filters.range)?.label ?? '')

function toggleCat(c)  { const i = filters.categories.indexOf(c);  i === -1 ? filters.categories.push(c)  : filters.categories.splice(i,1) }
function toggleSrc(id) { const i = filters.sources.indexOf(id);    i === -1 ? filters.sources.push(id)    : filters.sources.splice(i,1) }
function clearFilters() { filters.range = '1M'; filters.categories = []; filters.sources = [] }

// ── Datasets ──────────────────────────────────────────────────────────────────

// Step 1 — time range only (used to build filter panel options)
const rangedTx = computed(() => {
  if (filters.range === 'all') return allTx.value
  const months = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 }[filters.range]
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - months)
  cutoff.setDate(1); cutoff.setHours(0, 0, 0, 0)
  return allTx.value.filter(t => new Date(t.created_at) >= cutoff)
})

// Step 2 — all filters applied
const filteredTx = computed(() => {
  let tx = rangedTx.value
  if (filters.categories.length) tx = tx.filter(t => filters.categories.includes(t.category))
  if (filters.sources.length)    tx = tx.filter(t => filters.sources.includes(t.source_id))
  return tx
})

// ── Derived ───────────────────────────────────────────────────────────────────

const expenses     = computed(() => filteredTx.value.filter(t => t.type === 'expense'))
const incomes      = computed(() => filteredTx.value.filter(t => t.type === 'income'))
const totalExpense = computed(() => expenses.value.reduce((s,t) => s + parseFloat(t.amount), 0))
const totalIncome  = computed(() => incomes.value.reduce((s,t)  => s + parseFloat(t.amount), 0))
const net          = computed(() => totalIncome.value - totalExpense.value)
const spendRatio   = computed(() => totalIncome.value > 0 ? (totalExpense.value / totalIncome.value) * 100 : 0)

// Category options in filter panel (from ranged, pre-category-filter so all options always show)
const allCatOptions = computed(() => {
  const map = {}
  rangedTx.value.filter(t => t.type === 'expense').forEach((t, _, arr) => {
    if (!map[t.category]) map[t.category] = { name: t.category, total: 0, color: COLORS[Object.keys(map).length % COLORS.length] }
    map[t.category].total += parseFloat(t.amount)
  })
  return Object.values(map).sort((a, b) => b.total - a.total)
})

const visibleCats = computed(() => {
  if (!catQ.value) return allCatOptions.value
  const q = catQ.value.toLowerCase()
  return allCatOptions.value.filter(c => c.name.toLowerCase().includes(q))
})

// Spending breakdown (from filteredTx)
const topCats = computed(() => {
  const map = {}
  expenses.value.forEach(t => { map[t.category] = (map[t.category] ?? 0) + parseFloat(t.amount) })
  return Object.entries(map).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total)
})

// By source (from filteredTx)
const bySource = computed(() => {
  const map = {}
  filteredTx.value.forEach(t => {
    if (!t.source_id) return
    const src = sourcesStore.list.find(s => s.id === t.source_id)
    if (!src) return
    if (!map[src.id]) map[src.id] = { id: src.id, name: src.name, color: src.color, type: src.type, in: 0, out: 0, txCount: 0 }
    if (t.type === 'income')  map[src.id].in  += parseFloat(t.amount)
    if (t.type === 'expense') map[src.id].out += parseFloat(t.amount)
    map[src.id].txCount++
  })
  return Object.values(map).sort((a, b) => (b.in + b.out) - (a.in + a.out))
})

// Transactions grouped by month (from filteredTx, newest first)
const txGroups = computed(() => {
  const groups = {}
  ;[...filteredTx.value]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .forEach(t => {
      const key = new Date(t.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      if (!groups[key]) groups[key] = { month: key, items: [], net: 0 }
      groups[key].items.push(t)
      groups[key].net += t.type === 'income' ? parseFloat(t.amount) : -parseFloat(t.amount)
    })
  return Object.values(groups)
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function sourceOf(tx) {
  return tx.source_id ? sourcesStore.list.find(s => s.id === tx.source_id) ?? null : null
}

function shortDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ── Chart ─────────────────────────────────────────────────────────────────────

const lineCanvas = ref(null)
let lineChart    = null

function theme() {
  const l = document.documentElement.getAttribute('data-theme') === 'light'
  return { muted: l?'#9898b0':'#5a5a7a', grid: l?'#e0e0d8':'#1c1c2a', tip: l?'#fff':'#0f0f17', tipBorder: l?'#e2e2da':'#1c1c2a' }
}

async function renderChart() {
  await nextTick()
  if (!lineCanvas.value) return
  if (lineChart) { lineChart.destroy(); lineChart = null }

  const buckets = {}
  filteredTx.value.forEach(t => {
    const key = new Date(t.created_at).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
    if (!buckets[key]) buckets[key] = { expense: 0, income: 0 }
    buckets[key][t.type] += parseFloat(t.amount)
  })

  const months = Object.keys(buckets)
  if (!months.length) return

  const tc = theme()
  const tipCfg = { backgroundColor: tc.tip, borderColor: tc.tipBorder, borderWidth: 1, titleColor: tc.muted, bodyColor: tc.muted, padding: 10, cornerRadius: 8 }

  Chart.defaults.color = tc.muted
  Chart.defaults.font.family = "'Inter', sans-serif"
  Chart.defaults.font.size   = 11

  lineChart = new Chart(lineCanvas.value, {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        { label: 'Expenses', data: months.map(m => buckets[m]?.expense ?? 0), borderColor: '#f7525a', backgroundColor: 'rgba(247,82,90,0.08)', fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#f7525a' },
        { label: 'Income',   data: months.map(m => buckets[m]?.income  ?? 0), borderColor: '#3dd68c', backgroundColor: 'rgba(61,214,140,0.08)',  fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#3dd68c' },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: tc.muted, usePointStyle: true, pointStyleWidth: 7, boxHeight: 7 } },
        tooltip: { ...tipCfg, callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmt.value(ctx.raw)}` } },
      },
      scales: {
        x: { grid: { color: tc.grid }, ticks: { color: tc.muted } },
        y: { grid: { color: tc.grid }, ticks: { color: tc.muted, callback: v => fmt.value(v) } },
      },
    },
  })
}

onMounted(() => { if (allTx.value.length) renderChart() })
watch([filteredTx, () => props.currency], () => { if (allTx.value.length) renderChart() })
onUnmounted(() => { if (lineChart) lineChart.destroy() })
</script>

<style scoped>
.analytics { display: flex; flex-direction: column; gap: 14px; }
.state-empty { padding: 60px 0; text-align: center; color: var(--text2); font-size: 0.85rem; }
.empty-icon  { margin-bottom: 10px; color: var(--text2); }

/* ── Filter bar ──────────────────────────────────────────────── */
.filter-bar   { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.filter-toggle {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: var(--radius-sm);
  border: 1px solid var(--border); background: var(--surface);
  font-family: 'Inter', sans-serif; font-size: 0.75rem; font-weight: 500;
  color: var(--text2); cursor: pointer; transition: all var(--transition);
}
.filter-toggle:hover, .filter-toggle.active { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }
.filter-badge { background: var(--accent); color: var(--accent-text); font-size: 0.6rem; font-weight: 700; border-radius: 10px; padding: 1px 6px; }
.active-chips { display: flex; gap: 5px; flex-wrap: wrap; }
.chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 8px; border-radius: 20px; border: 1px solid var(--accent);
  background: var(--accent-dim); color: var(--accent);
  font-family: 'Inter', sans-serif; font-size: 0.68rem; font-weight: 500;
  cursor: pointer; transition: opacity var(--transition);
}
.chip:hover { opacity: 0.75; }
.chip-clear { border-color: var(--border); background: none; color: var(--text2); }
.chip-clear:hover { color: var(--danger); border-color: var(--danger); }

/* ── Filter panel ────────────────────────────────────────────── */
.filter-panel {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); overflow: hidden;
  display: flex; flex-direction: column;
}
.fp-section { padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
.fp-label {
  font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text2);
  display: flex; align-items: center; justify-content: space-between;
}
.fp-sel    { color: var(--accent); font-weight: 600; }
.fp-divider { height: 1px; background: var(--border); }
.fp-pills  { display: flex; gap: 4px; }
.fp-pill {
  flex: 1; padding: 6px 0; border-radius: 7px; border: 1px solid var(--border);
  background: none; font-family: 'Inter', sans-serif; font-size: 0.75rem;
  font-weight: 500; color: var(--text2); cursor: pointer; transition: all var(--transition);
}
.fp-pill.active { background: var(--accent); border-color: var(--accent); color: var(--accent-text); }
.fp-pill:not(.active):hover { border-color: var(--border2); color: var(--text); }
.fp-search-row {
  display: flex; align-items: center; gap: 6px;
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: var(--radius-sm); padding: 6px 10px;
}
.fp-search-row:focus-within { border-color: var(--accent); }
.fp-search-icon { color: var(--text2); flex-shrink: 0; }
.fp-search { flex: 1; background: none; border: none; outline: none; font-family: 'Inter', sans-serif; font-size: 0.78rem; color: var(--text); }
.fp-search::placeholder { color: var(--text2); }
.fp-list { display: flex; flex-direction: column; gap: 1px; max-height: 170px; overflow-y: auto; }
.fp-item {
  display: flex; align-items: center; gap: 8px; padding: 7px 8px;
  border-radius: var(--radius-sm); border: none; background: none;
  cursor: pointer; text-align: left; width: 100%; transition: background var(--transition);
}
.fp-item:hover  { background: var(--surface2); }
.fp-item.active { background: var(--accent-dim); }
.fp-box {
  width: 15px; height: 15px; border-radius: 4px; border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--accent);
}
.fp-item.active .fp-box { background: var(--accent-dim); border-color: var(--accent); }
.fp-dot  { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.fp-name { flex: 1; font-size: 0.78rem; color: var(--text); font-family: 'Inter', sans-serif; }
.fp-val  { font-size: 0.7rem; color: var(--text2); font-family: 'Space Grotesk', sans-serif; }
.fp-sub  { text-transform: capitalize; }
.fp-none { font-size: 0.75rem; color: var(--text2); padding: 8px; text-align: center; }
.fp-apply {
  padding: 12px; background: var(--accent); border: none; border-top: 1px solid var(--border);
  color: var(--accent-text); font-family: 'Inter', sans-serif; font-size: 0.82rem; font-weight: 600;
  cursor: pointer; transition: opacity var(--transition);
}
.fp-apply:hover { opacity: 0.88; }

/* ── Overview ────────────────────────────────────────────────── */
.overview-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.ov-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 14px 12px;
}
.ov-label { font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text2); margin-bottom: 4px; }
.ov-value { font-family: 'Space Grotesk', sans-serif; font-size: 1rem; font-weight: 600; letter-spacing: -0.02em; }
.ov-sub   { font-size: 0.58rem; color: var(--text2); margin-top: 4px; }
.ov-value.green { color: var(--success); }
.ov-value.red   { color: var(--danger); }
.ov-net.pos .ov-value { color: var(--success); }
.ov-net.neg .ov-value { color: var(--danger); }
.ratio-bar  { height: 3px; background: var(--border); border-radius: 2px; margin-top: 8px; overflow: hidden; }
.ratio-fill { height: 100%; background: var(--danger); border-radius: 2px; transition: width 0.4s ease; }
.ratio-fill.over { background: var(--danger); }

/* ── Cards ───────────────────────────────────────────────────── */
.card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 16px;
}
.card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.card-title  { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text2); }
.card-sub    { font-size: 0.62rem; color: var(--text2); }

/* ── Chart ───────────────────────────────────────────────────── */
.chart-wrap { position: relative; height: 200px; }

/* ── Category bars ───────────────────────────────────────────── */
.cat-list { display: flex; flex-direction: column; gap: 8px; }
.cat-row  { display: flex; align-items: center; gap: 8px; }
.cat-dot  { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.cat-name { font-size: 0.75rem; color: var(--text); width: 75px; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bar-wrap { flex: 1; height: 5px; background: var(--border); border-radius: 3px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 3px; transition: width 0.4s; }
.cat-pct  { font-size: 0.63rem; color: var(--text2); width: 26px; text-align: right; flex-shrink: 0; }
.cat-amt  { font-size: 0.7rem; font-weight: 500; color: var(--text); width: 58px; text-align: right; flex-shrink: 0; font-family: 'Space Grotesk', sans-serif; }

/* ── Source rows ─────────────────────────────────────────────── */
.source-list { display: flex; flex-direction: column; gap: 2px; }
.source-row {
  display: flex; align-items: center; gap: 8px; padding: 8px 6px;
  border-radius: var(--radius-sm); border: none; background: none;
  cursor: pointer; width: 100%; text-align: left; transition: background var(--transition);
}
.source-row:hover { background: var(--surface2); }
.source-dot    { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.source-name   { flex: 1; font-size: 0.78rem; font-weight: 500; color: var(--text); text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.source-counts { font-size: 0.62rem; color: var(--text2); flex-shrink: 0; }
.source-out    { font-size: 0.7rem; font-weight: 500; color: var(--danger);  font-family: 'Space Grotesk', sans-serif; flex-shrink: 0; }
.source-in     { font-size: 0.7rem; font-weight: 500; color: var(--success); font-family: 'Space Grotesk', sans-serif; flex-shrink: 0; }
.source-chevron { color: var(--text2); flex-shrink: 0; }

/* ── Transaction groups ──────────────────────────────────────── */
.tx-group { display: flex; flex-direction: column; }
.tx-group + .tx-group { margin-top: 8px; }

.tx-group-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 0 8px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 2px;
}
.tx-month     { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text2); font-weight: 500; }
.tx-month-net { font-size: 0.7rem; font-weight: 600; font-family: 'Space Grotesk', sans-serif; }
.tx-month-net.green { color: var(--success); }
.tx-month-net.red   { color: var(--danger); }

.tx-row {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 4px;
  border-bottom: 1px solid var(--border);
}
.tx-row:last-child { border-bottom: none; }
.tx-dot  { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.tx-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.tx-cat  { font-size: 0.78rem; font-weight: 500; color: var(--text); }
.tx-meta { font-size: 0.62rem; color: var(--text2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tx-source { font-weight: 500; }
.tx-right  { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
.tx-amount { font-family: 'Space Grotesk', sans-serif; font-size: 0.82rem; font-weight: 600; }
.tx-amount.expense { color: var(--danger); }
.tx-amount.income  { color: var(--success); }
.tx-date   { font-size: 0.6rem; color: var(--text2); }

.empty-hint { font-size: 0.78rem; color: var(--text2); text-align: center; padding: 16px 0; }

/* ── Transitions ─────────────────────────────────────────────── */
.panel-enter-active, .panel-leave-active { transition: all 0.2s ease; }
.panel-enter-from, .panel-leave-to { opacity: 0; transform: translateY(-6px); }

/* ── Mobile ──────────────────────────────────────────────────── */
@media (max-width: 400px) {
  .ov-value { font-size: 0.82rem; }
  .cat-name { width: 55px; }
  .cat-amt  { width: 46px; font-size: 0.65rem; }
}
</style>
