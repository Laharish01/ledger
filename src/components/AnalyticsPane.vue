<!--
  AnalyticsPane — revamped analytics with filter panel.

  Layout:
  ┌─ Filter bar (filter icon + active filter chips) ─────────────────┐
  │  Filter panel (slides down): Period · Category · Payment method  │
  ├─ Hero row: Income | Expenses | Net ───────────────────────────────┤
  ├─ Insights strip ──────────────────────────────────────────────────┤
  ├─ Spending by category (horizontal bars) ──────────────────────────┤
  ├─ By source (tap → SourceDetail) ─────────────────────────────────┤
  └─ Cash flow line chart ────────────────────────────────────────────┘

  When a source is selected the entire pane is replaced by SourceDetail.
-->
<template>
  <div class="analytics">

    <!-- ── Source detail (full-pane takeover) ──────────────── -->
    <SourceDetail
      v-if="selectedSource"
      :source="selectedSource"
      @back="selectedSource = null"
    />

    <template v-else>

      <!-- ── Empty state ─────────────────────────────────────── -->
      <div v-if="!allTx.length" class="state-empty">
        <div class="empty-icon"><SvgIcon :svg="iconChart" :size="36" /></div>
        <p>Add transactions to see analytics</p>
      </div>

      <template v-else>

        <!-- ══ FILTER BAR ════════════════════════════════════════ -->
        <div class="filter-bar">
          <button
            class="filter-toggle"
            :class="{ active: filterOpen }"
            @click="filterOpen = !filterOpen"
          >
            <SvgIcon :svg="iconFilter" :size="14" />
            <span>Filters</span>
            <span v-if="activeFilterCount" class="filter-badge">{{ activeFilterCount }}</span>
          </button>

          <!-- Active filter chips (quick-remove) -->
          <div class="active-chips">
            <button v-if="filters.range !== 'all'" class="chip active-chip" @click="filters.range = 'all'">
              {{ RANGES.find(r => r.key === filters.range)?.label }}
              <SvgIcon :svg="iconClose" :size="10" />
            </button>
            <button
              v-for="cat in filters.categories"
              :key="cat"
              class="chip active-chip"
              @click="toggleCategory(cat)"
            >
              {{ cat }}<SvgIcon :svg="iconClose" :size="10" />
            </button>
            <button
              v-for="sid in filters.sources"
              :key="sid"
              class="chip active-chip"
              @click="toggleSource(sid)"
            >
              {{ sourcesStore.list.find(s => s.id === sid)?.name }}
              <SvgIcon :svg="iconClose" :size="10" />
            </button>
            <button v-if="activeFilterCount" class="chip clear-chip" @click="clearFilters">
              Clear all
            </button>
          </div>
        </div>

        <!-- ══ FILTER PANEL ══════════════════════════════════════ -->
        <Transition name="panel">
          <div v-if="filterOpen" class="filter-panel">

            <!-- Period -->
            <div class="fp-section">
              <div class="fp-label">Time period</div>
              <div class="fp-pills">
                <button
                  v-for="r in RANGES"
                  :key="r.key"
                  class="fp-pill"
                  :class="{ active: filters.range === r.key }"
                  @click="filters.range = r.key"
                >{{ r.label }}</button>
              </div>
            </div>

            <div class="fp-divider" />

            <!-- Category -->
            <div class="fp-section">
              <div class="fp-label">
                Category
                <span v-if="filters.categories.length" class="fp-count">{{ filters.categories.length }} selected</span>
              </div>
              <div class="fp-search-wrap">
                <SvgIcon :svg="iconSearch" :size="12" class="fp-search-icon" />
                <input
                  v-model="catSearchFilter"
                  class="fp-search"
                  type="text"
                  placeholder="Search categories…"
                  autocomplete="off"
                >
              </div>
              <div class="fp-scroll">
                <button
                  v-for="cat in filteredCatOptions"
                  :key="cat.name"
                  class="fp-check"
                  :class="{ active: filters.categories.includes(cat.name) }"
                  @click="toggleCategory(cat.name)"
                >
                  <span class="fp-check-box">
                    <SvgIcon v-if="filters.categories.includes(cat.name)" :svg="iconCheck" :size="10" />
                  </span>
                  <span class="fp-check-dot" :style="{ background: cat.color }" />
                  <span class="fp-check-label">{{ cat.name }}</span>
                  <span class="fp-check-amt">{{ fmt(cat.total) }}</span>
                </button>
                <p v-if="!filteredCatOptions.length" class="fp-empty">No categories</p>
              </div>
            </div>

            <div class="fp-divider" />

            <!-- Payment method -->
            <div class="fp-section">
              <div class="fp-label">
                Payment method
                <span v-if="filters.sources.length" class="fp-count">{{ filters.sources.length }} selected</span>
              </div>
              <div v-if="sourcesStore.list.length" class="fp-scroll">
                <button
                  v-for="src in sourcesStore.list"
                  :key="src.id"
                  class="fp-check"
                  :class="{ active: filters.sources.includes(src.id) }"
                  @click="toggleSource(src.id)"
                >
                  <span class="fp-check-box">
                    <SvgIcon v-if="filters.sources.includes(src.id)" :svg="iconCheck" :size="10" />
                  </span>
                  <span class="fp-check-dot" :style="{ background: src.color }" />
                  <span class="fp-check-label">{{ src.name }}</span>
                  <span class="fp-check-sub">{{ src.type }}</span>
                </button>
              </div>
              <p v-else class="fp-empty">No payment sources set up yet</p>
            </div>

            <button class="fp-apply" @click="filterOpen = false">
              Apply · {{ filteredTx.length }} transactions
            </button>

          </div>
        </Transition>

        <!-- ══ HERO STATS ════════════════════════════════════════ -->
        <div class="hero-grid">
          <div class="hero-card income-card">
            <div class="hero-label">Income</div>
            <div class="hero-value">{{ fmt(totalIncome) }}</div>
            <div class="hero-sub">{{ incomes.length }} tx</div>
          </div>
          <div class="hero-card expense-card">
            <div class="hero-label">Expenses</div>
            <div class="hero-value">{{ fmt(totalExpense) }}</div>
            <div class="ratio-track">
              <div
                class="ratio-fill"
                :style="{ width: Math.min(spendRatio, 100) + '%' }"
                :class="{ overspent: spendRatio > 100 }"
              />
            </div>
            <div class="hero-sub">{{ spendRatio.toFixed(0) }}% of income</div>
          </div>
          <div class="hero-card net-card" :class="net >= 0 ? 'positive' : 'negative'">
            <div class="hero-label">Net</div>
            <div class="hero-value">{{ fmt(Math.abs(net)) }}</div>
            <div class="hero-sub">{{ net >= 0 ? '↑ surplus' : '↓ deficit' }}</div>
          </div>
        </div>

        <!-- ══ INSIGHTS ══════════════════════════════════════════ -->
        <div v-if="insights.length" class="insights-strip">
          <div v-for="ins in insights" :key="ins.label" class="insight-chip">
            <span class="ins-label">{{ ins.label }}</span>
            <span class="ins-value">{{ ins.value }}</span>
          </div>
        </div>

        <!-- ══ SPENDING BY CATEGORY ══════════════════════════════ -->
        <div v-if="topCats.length" class="section-card">
          <div class="section-header">
            <span class="section-title">Spending by category</span>
            <span class="section-sub">{{ topCats.length }} categories</span>
          </div>
          <div class="cat-list">
            <div v-for="(c, i) in topCats" :key="c.category" class="cat-row">
              <div class="cat-dot" :style="{ background: COLORS[i % COLORS.length] }" />
              <span class="cat-name">{{ c.category }}</span>
              <div class="bar-track">
                <div
                  class="bar-fill"
                  :style="{ width: ((c.total / topCats[0].total) * 100) + '%', background: COLORS[i % COLORS.length] }"
                />
              </div>
              <span class="cat-pct">{{ ((c.total / totalExpense) * 100).toFixed(0) }}%</span>
              <span class="cat-amt">{{ fmt(c.total) }}</span>
            </div>
          </div>
        </div>

        <!-- ══ BY SOURCE ═════════════════════════════════════════ -->
        <div v-if="sourcesStore.list.length" class="section-card">
          <div class="section-header">
            <span class="section-title">By payment method</span>
            <span class="section-sub">tap for detail</span>
          </div>
          <div v-if="bySource.length" class="source-breakdown">
            <button
              v-for="row in bySource"
              :key="row.id"
              class="source-row"
              @click="selectedSource = sourcesStore.list.find(s => s.id === row.id)"
            >
              <div class="source-dot" :style="{ background: row.color }" />
              <div class="source-info">
                <span class="source-name">{{ row.name }}</span>
                <span class="source-meta">{{ row.txCount }} tx · {{ row.type }}</span>
              </div>
              <div class="source-stats">
                <span class="source-out">−{{ fmt(row.totalOut) }}</span>
                <span class="source-in">+{{ fmt(row.totalIn) }}</span>
              </div>
              <SvgIcon :svg="iconChevronRight" :size="13" class="source-chevron" />
            </button>
          </div>
          <p v-else class="hint">Tag transactions with a payment method to see breakdown</p>
        </div>

        <!-- ══ CASH FLOW ══════════════════════════════════════════ -->
        <div class="section-card">
          <div class="section-header">
            <span class="section-title">Cash flow</span>
            <span class="section-sub">{{ RANGES.find(r => r.key === filters.range)?.label }}</span>
          </div>
          <div class="chart-wrap"><canvas ref="lineCanvas" /></div>
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
import { useTransactionStore } from '../stores/transactions'
import { useSourcesStore }     from '../stores/sources'
import { catColor }            from '../stores/transactions'
import SvgIcon      from './SvgIcon.vue'
import SourceDetail from './SourceDetail.vue'
import {
  iconChart, iconSearch, iconChevronRight,
  iconClose, iconCheck, iconFilter,
} from '../icons'

const props = defineProps({ currency: String })

const settings     = useSettingsStore()
const txStore      = useTransactionStore()
const sourcesStore = useSourcesStore()
const { fmt }      = storeToRefs(settings)
const { allTx }    = storeToRefs(txStore)

// ── Constants ────────────────────────────────────────────────────────────────

const COLORS = [
  '#7c6af7', '#b8f735', '#f7525a', '#3dd68c', '#fb923c',
  '#38bdf8', '#e879f9', '#fbbf24', '#34d399', '#f87171',
]

const RANGES = [
  { key: '1M',  label: '1M'  },
  { key: '3M',  label: '3M'  },
  { key: '6M',  label: '6M'  },
  { key: '1Y',  label: '1Y'  },
  { key: 'all', label: 'All' },
]

// ── Filter state ──────────────────────────────────────────────────────────────

const filterOpen     = ref(false)
const catSearchFilter = ref('')
const selectedSource = ref(null)

const filters = reactive({
  range:      '1M',   // time period key
  categories: [],     // string[] of selected category names (empty = all)
  sources:    [],     // string[] of selected source IDs (empty = all)
})

const activeFilterCount = computed(() =>
  (filters.range !== 'all' ? 1 : 0) +
  filters.categories.length +
  filters.sources.length
)

function toggleCategory(cat) {
  const idx = filters.categories.indexOf(cat)
  idx === -1 ? filters.categories.push(cat) : filters.categories.splice(idx, 1)
}

function toggleSource(id) {
  const idx = filters.sources.indexOf(id)
  idx === -1 ? filters.sources.push(id) : filters.sources.splice(idx, 1)
}

function clearFilters() {
  filters.range      = 'all'
  filters.categories = []
  filters.sources    = []
}

// ── Base dataset — time range applied first ───────────────────────────────────

const rangedTx = computed(() => {
  if (filters.range === 'all') return allTx.value
  const months = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 }[filters.range]
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - months)
  cutoff.setDate(1)
  cutoff.setHours(0, 0, 0, 0)
  return allTx.value.filter(t => new Date(t.created_at) >= cutoff)
})

// ── Fully filtered dataset — category + source filters applied ────────────────

const filteredTx = computed(() => {
  let tx = rangedTx.value

  if (filters.categories.length) {
    tx = tx.filter(t => filters.categories.includes(t.category))
  }

  if (filters.sources.length) {
    tx = tx.filter(t => filters.sources.includes(t.source_id))
  }

  return tx
})

// ── Derived data from filteredTx ──────────────────────────────────────────────

const expenses = computed(() => filteredTx.value.filter(t => t.type === 'expense'))
const incomes  = computed(() => filteredTx.value.filter(t => t.type === 'income'))

const totalExpense = computed(() => expenses.value.reduce((s, t) => s + parseFloat(t.amount), 0))
const totalIncome  = computed(() => incomes.value.reduce((s, t) => s + parseFloat(t.amount), 0))
const net          = computed(() => totalIncome.value - totalExpense.value)
const spendRatio   = computed(() =>
  totalIncome.value > 0 ? (totalExpense.value / totalIncome.value) * 100 : 0
)

// ── Category options for filter panel (from ranged, unfiltered by category) ───

const allCatsInRange = computed(() => {
  const map = {}
  rangedTx.value
    .filter(t => t.type === 'expense')
    .forEach((t, i) => {
      if (!map[t.category]) map[t.category] = { name: t.category, total: 0, color: COLORS[Object.keys(map).length % COLORS.length] }
      map[t.category].total += parseFloat(t.amount)
    })
  return Object.values(map).sort((a, b) => b.total - a.total)
})

const filteredCatOptions = computed(() => {
  if (!catSearchFilter.value) return allCatsInRange.value
  const q = catSearchFilter.value.toLowerCase()
  return allCatsInRange.value.filter(c => c.name.toLowerCase().includes(q))
})

// ── Spending by category (from filteredTx) ────────────────────────────────────

const topCats = computed(() => {
  const map = {}
  expenses.value.forEach(t => {
    map[t.category] = (map[t.category] ?? 0) + parseFloat(t.amount)
  })
  return Object.entries(map)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
})

// ── By source ─────────────────────────────────────────────────────────────────

const bySource = computed(() => {
  const map = {}
  filteredTx.value.forEach(t => {
    if (!t.source_id) return
    const src = sourcesStore.list.find(s => s.id === t.source_id)
    if (!src) return
    if (!map[src.id]) map[src.id] = {
      id: src.id, name: src.name, color: src.color, type: src.type,
      totalIn: 0, totalOut: 0, txCount: 0,
    }
    if (t.type === 'income')  map[src.id].totalIn  += parseFloat(t.amount)
    if (t.type === 'expense') map[src.id].totalOut += parseFloat(t.amount)
    map[src.id].txCount++
  })
  return Object.values(map).sort((a, b) => (b.totalIn + b.totalOut) - (a.totalIn + a.totalOut))
})

// ── Insights ──────────────────────────────────────────────────────────────────

const insights = computed(() => {
  const out = []

  if (topCats.value.length) {
    out.push({ label: 'Top category', value: `${topCats.value[0].category} · ${fmt.value(topCats.value[0].total)}` })
  }

  if (expenses.value.length) {
    const biggest = expenses.value.reduce((a, b) => parseFloat(a.amount) > parseFloat(b.amount) ? a : b)
    out.push({ label: 'Biggest expense', value: `${biggest.category} · ${fmt.value(biggest.amount)}` })
  }

  if (filters.range !== '1M') {
    const now    = new Date()
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const pStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thisM  = allTx.value.filter(t => t.type === 'expense' && new Date(t.created_at) >= mStart)
    const prevM  = allTx.value.filter(t => t.type === 'expense' && new Date(t.created_at) >= pStart && new Date(t.created_at) < mStart)
    const tTotal = thisM.reduce((s, t) => s + parseFloat(t.amount), 0)
    const pTotal = prevM.reduce((s, t) => s + parseFloat(t.amount), 0)
    if (pTotal > 0) {
      const pct = Math.abs(((tTotal - pTotal) / pTotal) * 100).toFixed(0)
      out.push({ label: 'vs last month', value: `${tTotal >= pTotal ? '↑' : '↓'} ${pct}%` })
    }
  }

  return out
})

// ── Cash flow chart ───────────────────────────────────────────────────────────

const lineCanvas = ref(null)
let lineChart    = null

function getTheme() {
  const light = document.documentElement.getAttribute('data-theme') === 'light'
  return {
    muted:     light ? '#9898b0' : '#5a5a7a',
    grid:      light ? '#e0e0d8' : '#1c1c2a',
    tip:       light ? '#ffffff' : '#0f0f17',
    tipBorder: light ? '#e2e2da' : '#1c1c2a',
  }
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

  const tc  = getTheme()
  const tip = {
    backgroundColor: tc.tip, borderColor: tc.tipBorder, borderWidth: 1,
    titleColor: tc.muted, bodyColor: tc.muted, padding: 10, cornerRadius: 8,
  }

  Chart.defaults.color       = tc.muted
  Chart.defaults.font.family = "'Inter', sans-serif"
  Chart.defaults.font.size   = 11

  lineChart = new Chart(lineCanvas.value, {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Expenses', data: months.map(m => buckets[m]?.expense ?? 0),
          borderColor: '#f7525a', backgroundColor: 'rgba(247,82,90,0.08)',
          fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#f7525a',
        },
        {
          label: 'Income', data: months.map(m => buckets[m]?.income ?? 0),
          borderColor: '#3dd68c', backgroundColor: 'rgba(61,214,140,0.08)',
          fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#3dd68c',
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
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

onMounted(() => { if (allTx.value.length) renderChart() })
watch([filteredTx, () => props.currency], () => { if (allTx.value.length) renderChart() })
onUnmounted(() => { if (lineChart) lineChart.destroy() })
</script>

<style scoped>
.analytics { display: flex; flex-direction: column; gap: 14px; }

.state-empty { padding: 60px 0; text-align: center; color: var(--text2); font-size: 0.85rem; }
.empty-icon  { margin-bottom: 10px; color: var(--text2); }

/* ══ Filter bar ══════════════════════════════════════════════ */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface);
  font-family: 'Inter', sans-serif;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text2);
  cursor: pointer;
  transition: all var(--transition);
  flex-shrink: 0;
}
.filter-toggle:hover { border-color: var(--border2); color: var(--text); }
.filter-toggle.active { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }

.filter-badge {
  background: var(--accent);
  color: var(--accent-text);
  font-size: 0.6rem;
  font-weight: 700;
  border-radius: 10px;
  padding: 1px 6px;
  line-height: 1.4;
}

.active-chips { display: flex; gap: 5px; flex-wrap: wrap; align-items: center; }

.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 20px;
  font-family: 'Inter', sans-serif;
  font-size: 0.68rem;
  font-weight: 500;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all var(--transition);
}
.active-chip {
  background: var(--accent-dim);
  border-color: var(--accent);
  color: var(--accent);
}
.active-chip:hover { opacity: 0.8; }
.clear-chip {
  background: none;
  border-color: var(--border);
  color: var(--text2);
}
.clear-chip:hover { color: var(--danger); border-color: var(--danger); }

/* ══ Filter panel ════════════════════════════════════════════ */
.filter-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.fp-section { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }

.fp-label {
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text2);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.fp-count { color: var(--accent); font-weight: 600; }

.fp-divider { height: 1px; background: var(--border); margin: 0; }

/* Period pills */
.fp-pills { display: flex; gap: 4px; }
.fp-pill {
  flex: 1;
  padding: 6px 0;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: none;
  font-family: 'Inter', sans-serif;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text2);
  cursor: pointer;
  transition: all var(--transition);
}
.fp-pill.active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-text);
}
.fp-pill:not(.active):hover { border-color: var(--border2); color: var(--text); }

/* Category search */
.fp-search-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 6px 10px;
  transition: border-color var(--transition);
}
.fp-search-wrap:focus-within { border-color: var(--accent); }
.fp-search-icon { color: var(--text2); flex-shrink: 0; }
.fp-search {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-family: 'Inter', sans-serif;
  font-size: 0.78rem;
  color: var(--text);
}
.fp-search::placeholder { color: var(--text2); }

/* Scrollable check list */
.fp-scroll {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 180px;
  overflow-y: auto;
}

.fp-check {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: var(--radius-sm);
  border: none;
  background: none;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  text-align: left;
  width: 100%;
  transition: background var(--transition);
}
.fp-check:hover { background: var(--surface2); }
.fp-check.active { background: var(--accent-dim); }

.fp-check-box {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--accent);
  transition: border-color var(--transition), background var(--transition);
}
.fp-check.active .fp-check-box { background: var(--accent-dim); border-color: var(--accent); }

.fp-check-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.fp-check-label { flex: 1; font-size: 0.78rem; color: var(--text); }
.fp-check-amt   { font-size: 0.68rem; color: var(--text2); font-family: 'Space Grotesk', sans-serif; }
.fp-check-sub   { font-size: 0.65rem; color: var(--text2); text-transform: capitalize; }
.fp-empty       { font-size: 0.75rem; color: var(--text2); padding: 8px; text-align: center; }

/* Apply button */
.fp-apply {
  margin: 0;
  padding: 12px;
  background: var(--accent);
  border: none;
  border-top: 1px solid var(--border);
  color: var(--accent-text);
  font-family: 'Inter', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity var(--transition);
}
.fp-apply:hover { opacity: 0.88; }

/* ══ Hero stats ══════════════════════════════════════════════ */
.hero-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.hero-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 12px;
}
.hero-label { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text2); margin-bottom: 4px; }
.hero-value { font-family: 'Space Grotesk', sans-serif; font-size: 1rem; font-weight: 600; letter-spacing: -0.02em; }
.hero-sub   { font-size: 0.6rem; color: var(--text2); margin-top: 4px; }
.income-card  .hero-value { color: var(--success); }
.expense-card .hero-value { color: var(--danger); }
.net-card.positive .hero-value { color: var(--success); }
.net-card.negative .hero-value { color: var(--danger); }

.ratio-track { height: 3px; background: var(--border); border-radius: 2px; margin-top: 8px; overflow: hidden; }
.ratio-fill  { height: 100%; background: var(--danger); border-radius: 2px; transition: width 0.4s ease; }
.ratio-fill.overspent { background: #f7525a; }

/* ══ Insights ════════════════════════════════════════════════ */
.insights-strip { display: flex; flex-direction: column; gap: 6px; }
.insight-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.ins-label { font-size: 0.7rem; color: var(--text2); }
.ins-value { font-size: 0.75rem; font-weight: 500; color: var(--text); text-align: right; }

/* ══ Section cards ═══════════════════════════════════════════ */
.section-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
}
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.section-title  { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text2); }
.section-sub    { font-size: 0.62rem; color: var(--text2); }

/* ══ Category bars ═══════════════════════════════════════════ */
.cat-list { display: flex; flex-direction: column; gap: 9px; }
.cat-row  { display: flex; align-items: center; gap: 8px; }
.cat-dot  { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.cat-name { font-size: 0.75rem; color: var(--text); width: 80px; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bar-track { flex: 1; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
.bar-fill  { height: 100%; border-radius: 3px; transition: width 0.4s ease; }
.cat-pct  { font-size: 0.65rem; color: var(--text2); width: 28px; text-align: right; flex-shrink: 0; }
.cat-amt  { font-size: 0.72rem; font-weight: 500; color: var(--text); width: 60px; text-align: right; flex-shrink: 0; font-family: 'Space Grotesk', sans-serif; }

/* ══ Source rows ═════════════════════════════════════════════ */
.source-breakdown { display: flex; flex-direction: column; gap: 4px; }
.source-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 6px;
  border-radius: var(--radius-sm);
  border: none;
  background: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: background var(--transition);
}
.source-row:hover { background: var(--surface2); }
.source-dot  { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.source-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.source-name { font-size: 0.78rem; font-weight: 500; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.source-meta { font-size: 0.6rem; color: var(--text2); text-transform: capitalize; }
.source-stats { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
.source-out  { font-size: 0.7rem; font-weight: 500; color: var(--danger); font-family: 'Space Grotesk', sans-serif; }
.source-in   { font-size: 0.7rem; font-weight: 500; color: var(--success); font-family: 'Space Grotesk', sans-serif; }
.source-chevron { color: var(--text2); flex-shrink: 0; }

/* ══ Chart ═══════════════════════════════════════════════════ */
.chart-wrap { position: relative; height: 220px; }

.hint { font-size: 0.72rem; color: var(--text2); text-align: center; padding: 12px 0; }

/* ══ Transitions ═════════════════════════════════════════════ */
.panel-enter-active, .panel-leave-active { transition: all 0.22s ease; }
.panel-enter-from, .panel-leave-to { opacity: 0; transform: translateY(-8px); }

/* ══ Mobile ══════════════════════════════════════════════════ */
@media (max-width: 400px) {
  .hero-value { font-size: 0.82rem; }
  .cat-name   { width: 60px; }
  .cat-amt    { width: 50px; }
}
</style>
