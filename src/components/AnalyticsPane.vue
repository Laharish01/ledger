<!--
  AnalyticsPane — full analytics view.
  When a source is selected, renders SourceDetail in place of all content.

  Sections:
  1. Time range tabs
  2. Hero stat row — Income | Expenses | Net
  3. Insights strip
  4. Spending by category + search
  5. By source — all sources with in/out/net, tap to open SourceDetail
  6. Cash flow chart
-->
<template>
  <div class="analytics">

    <!-- Source detail view — replaces all content when a source is selected -->
    <SourceDetail
      v-if="selectedSource"
      :source="selectedSource"
      @back="selectedSource = null"
    />

    <template v-else>

    <!-- Empty state -->
    <div v-if="!allTx.length" class="state-empty">
      <div class="empty-icon"><SvgIcon :svg="iconChart" :size="36" /></div>
      <p>Add transactions to see analytics</p>
    </div>

    <template v-else>

      <!-- ── 1. Time range tabs ──────────────────────────────── -->
      <div class="range-tabs">
        <button
          v-for="r in RANGES"
          :key="r.key"
          class="range-tab"
          :class="{ active: range === r.key }"
          @click="range = r.key"
        >{{ r.label }}</button>
      </div>

      <!-- ── 2. Hero stats ──────────────────────────────────── -->
      <div class="hero-grid">
        <div class="hero-card income-card">
          <div class="hero-label">Income</div>
          <div class="hero-value">{{ fmt(totalIncome) }}</div>
        </div>
        <div class="hero-card expense-card">
          <div class="hero-label">Expenses</div>
          <div class="hero-value">{{ fmt(totalExpense) }}</div>
          <!-- spend ratio bar -->
          <div class="ratio-track" title="Expenses as % of income">
            <div
              class="ratio-fill"
              :style="{ width: Math.min(spendRatio, 100) + '%' }"
              :class="{ overspent: spendRatio > 100 }"
            />
          </div>
          <div class="ratio-label">{{ spendRatio.toFixed(0) }}% of income</div>
        </div>
        <div class="hero-card net-card" :class="net >= 0 ? 'positive' : 'negative'">
          <div class="hero-label">Net</div>
          <div class="hero-value">{{ fmt(Math.abs(net)) }}</div>
          <div class="net-dir">{{ net >= 0 ? '↑ surplus' : '↓ deficit' }}</div>
        </div>
      </div>

      <!-- ── 3. Insights strip ──────────────────────────────── -->
      <div v-if="insights.length" class="insights-strip">
        <div v-for="ins in insights" :key="ins.label" class="insight-chip">
          <span class="ins-label">{{ ins.label }}</span>
          <span class="ins-value">{{ ins.value }}</span>
        </div>
      </div>

      <!-- ── 4. Spending by category ────────────────────────── -->
      <div class="section-card">
        <div class="section-header">
          <span class="section-title">Spending by category</span>
          <div class="search-wrap">
            <SvgIcon :svg="iconSearch" :size="13" class="search-icon" />
            <input
              v-model="catSearch"
              class="cat-search"
              type="text"
              placeholder="Search…"
              autocomplete="off"
            >
          </div>
        </div>

        <div v-if="filteredCats.length" class="cat-list">
          <div
            v-for="(c, i) in filteredCats"
            :key="c.category"
            class="cat-row"
            :class="{ dimmed: catSearch && !c.category.toLowerCase().includes(catSearch.toLowerCase()) }"
          >
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
        <p v-else class="no-results">No categories match "{{ catSearch }}"</p>
      </div>

      <!-- ── 5. By source ─────────────────────────────────── -->
      <div v-if="sourcesStore.list.length" class="section-card">
        <div class="section-header">
          <span class="section-title">By source</span>
          <span class="section-sub">tap to view detail</span>
        </div>
        <div v-if="bySource.length" class="source-breakdown">
          <button
            v-for="row in bySource"
            :key="row.id"
            class="source-row clickable"
            @click="selectedSource = sourcesStore.list.find(s => s.id === row.id)"
          >
            <div class="source-dot" :style="{ background: row.color }" />
            <div class="source-info">
              <span class="source-name">{{ row.name }}</span>
              <span class="source-type-label">{{ row.txCount }} transactions</span>
            </div>
            <div class="source-stats">
              <span class="source-out">−{{ fmt(row.totalOut) }}</span>
              <span class="source-in">+{{ fmt(row.totalIn) }}</span>
            </div>
            <SvgIcon :svg="iconChevronRight" :size="13" class="source-chevron" />
          </button>
        </div>
        <p v-else class="no-source-hint">
          Tag transactions with a source to see breakdown here
        </p>
      </div>

      <!-- ── 6. Cash flow chart ─────────────────────────────── -->
      <div class="section-card">
        <div class="section-title" style="margin-bottom:16px">Cash flow</div>
        <div class="chart-wrap"><canvas ref="lineCanvas" /></div>
      </div>

    </template>
    </template><!-- end v-else -->
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Chart } from 'chart.js/auto'
import { storeToRefs } from 'pinia'
import { useSettingsStore }    from '../stores/settings'
import { useTransactionStore } from '../stores/transactions'
import { useSourcesStore }     from '../stores/sources'
import SvgIcon      from './SvgIcon.vue'
import SourceDetail from './SourceDetail.vue'
import { iconChart, iconSearch, iconChevronRight } from '../icons'

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
  { key: '1M',  label: '1M'   },
  { key: '3M',  label: '3M'   },
  { key: '6M',  label: '6M'   },
  { key: '1Y',  label: '1Y'   },
  { key: 'all', label: 'All'  },
]

// ── State ────────────────────────────────────────────────────────────────────

const range          = ref('1M')
const catSearch      = ref('')
const selectedSource = ref(null)

// ── Filtered dataset for selected range ──────────────────────────────────────

const rangedTx = computed(() => {
  if (range.value === 'all') return allTx.value
  const months = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 }[range.value]
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - months)
  cutoff.setDate(1)
  cutoff.setHours(0, 0, 0, 0)
  return allTx.value.filter(t => new Date(t.created_at) >= cutoff)
})

const expenses = computed(() => rangedTx.value.filter(t => t.type === 'expense'))
const incomes  = computed(() => rangedTx.value.filter(t => t.type === 'income'))

const totalExpense = computed(() => expenses.value.reduce((s, t) => s + parseFloat(t.amount), 0))
const totalIncome  = computed(() => incomes.value.reduce((s, t) => s + parseFloat(t.amount), 0))
const net          = computed(() => totalIncome.value - totalExpense.value)
const spendRatio   = computed(() => totalIncome.value > 0 ? (totalExpense.value / totalIncome.value) * 100 : 0)

// ── Category breakdown ────────────────────────────────────────────────────────

const topCats = computed(() => {
  const map = {}
  expenses.value.forEach(t => { map[t.category] = (map[t.category] ?? 0) + parseFloat(t.amount) })
  return Object.entries(map)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
})

const filteredCats = computed(() => {
  if (!catSearch.value) return topCats.value
  const q = catSearch.value.toLowerCase()
  return topCats.value.filter(c => c.category.toLowerCase().includes(q))
})

// ── By source (all transaction types) ────────────────────────────────────────

const bySource = computed(() => {
  const map = {}
  rangedTx.value.forEach(t => {
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

  // Biggest spending category
  if (topCats.value.length) {
    const top = topCats.value[0]
    out.push({ label: 'Top category', value: `${top.category} · ${fmt.value(top.total)}` })
  }

  // Single largest expense
  if (expenses.value.length) {
    const biggest = expenses.value.reduce((a, b) => parseFloat(a.amount) > parseFloat(b.amount) ? a : b)
    out.push({ label: 'Biggest expense', value: `${biggest.category} · ${fmt.value(biggest.amount)}` })
  }

  // Month-on-month expense change (only meaningful for ranges ≥ 2 months)
  if (range.value !== '1M') {
    const now   = new Date()
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const pStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thisM  = allTx.value.filter(t => t.type === 'expense' && new Date(t.created_at) >= mStart)
    const prevM  = allTx.value.filter(t => t.type === 'expense' && new Date(t.created_at) >= pStart && new Date(t.created_at) < mStart)
    const tTotal = thisM.reduce((s, t) => s + parseFloat(t.amount), 0)
    const pTotal = prevM.reduce((s, t) => s + parseFloat(t.amount), 0)
    if (pTotal > 0) {
      const pct = ((tTotal - pTotal) / pTotal * 100).toFixed(0)
      const dir = tTotal >= pTotal ? '↑' : '↓'
      out.push({ label: 'vs last month', value: `${dir} ${Math.abs(pct)}%` })
    }
  }

  return out
})

// ── Chart ─────────────────────────────────────────────────────────────────────

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

  // Build month buckets for the selected range
  const buckets = {}
  rangedTx.value.forEach(t => {
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
watch([rangedTx, () => props.currency], () => { if (allTx.value.length) renderChart() })
onUnmounted(() => { if (lineChart) lineChart.destroy() })
</script>

<style scoped>
.analytics { display: flex; flex-direction: column; gap: 14px; }

.state-empty { padding: 60px 0; text-align: center; color: var(--text2); font-size: 0.85rem; }
.empty-icon  { margin-bottom: 10px; color: var(--text2); }

/* ── Range tabs ──────────────────────────────────────────────── */
.range-tabs {
  display: flex; gap: 4px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 4px;
}
.range-tab {
  flex: 1; padding: 6px 0; border: none; border-radius: 7px;
  background: none; font-family: 'Inter', sans-serif;
  font-size: 0.75rem; font-weight: 500; color: var(--text2);
  cursor: pointer; transition: background var(--transition), color var(--transition);
}
.range-tab.active { background: var(--surface2); color: var(--text); }

/* ── Hero stats ──────────────────────────────────────────────── */
.hero-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.hero-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 14px 12px;
}
.hero-label { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text2); margin-bottom: 4px; }
.hero-value { font-family: 'Space Grotesk', sans-serif; font-size: 1rem; font-weight: 600; letter-spacing: -0.02em; }
.income-card  .hero-value { color: var(--success); }
.expense-card .hero-value { color: var(--danger); }
.net-card.positive .hero-value { color: var(--success); }
.net-card.negative .hero-value { color: var(--danger); }

.ratio-track { height: 3px; background: var(--border); border-radius: 2px; margin-top: 8px; overflow: hidden; }
.ratio-fill  { height: 100%; background: var(--danger); border-radius: 2px; transition: width 0.4s ease; }
.ratio-fill.overspent { background: #f7525a; }
.ratio-label { font-size: 0.6rem; color: var(--text2); margin-top: 4px; }
.net-dir     { font-size: 0.62rem; color: var(--text2); margin-top: 4px; }

/* ── Insights ────────────────────────────────────────────────── */
.insights-strip { display: flex; flex-direction: column; gap: 6px; }
.insight-chip {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 12px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.ins-label { font-size: 0.7rem; color: var(--text2); }
.ins-value { font-size: 0.75rem; font-weight: 500; color: var(--text); text-align: right; }

/* ── Section cards ───────────────────────────────────────────── */
.section-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 16px;
}
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; gap: 10px; }
.section-title  { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text2); }

/* Category search */
.search-wrap {
  display: flex; align-items: center; gap: 6px;
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: 6px; padding: 4px 8px;
  transition: border-color var(--transition);
}
.search-wrap:focus-within { border-color: var(--accent); }
.search-icon { color: var(--text2); flex-shrink: 0; }
.cat-search {
  background: none; border: none; outline: none;
  font-family: 'Inter', sans-serif; font-size: 0.78rem;
  color: var(--text); width: 90px;
}
.cat-search::placeholder { color: var(--text2); }

/* Category rows — horizontal bar */
.cat-list { display: flex; flex-direction: column; gap: 9px; }
.cat-row  { display: flex; align-items: center; gap: 8px; }
.cat-row.dimmed { opacity: 0.35; }
.cat-dot  { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.cat-name { font-size: 0.75rem; color: var(--text); width: 80px; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bar-track { flex: 1; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
.bar-fill  { height: 100%; border-radius: 3px; transition: width 0.4s ease; }
.cat-pct  { font-size: 0.65rem; color: var(--text2); width: 28px; text-align: right; flex-shrink: 0; }
.cat-amt  { font-size: 0.72rem; font-weight: 500; color: var(--text); width: 60px; text-align: right; flex-shrink: 0; font-family: 'Space Grotesk', sans-serif; }

.no-results { font-size: 0.78rem; color: var(--text2); padding: 12px 0; text-align: center; }

/* Income by source */
.source-breakdown { display: flex; flex-direction: column; gap: 9px; }
.source-row  { display: flex; align-items: center; gap: 8px; }
.source-dot  { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.source-info { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.source-name { font-size: 0.78rem; font-weight: 500; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.source-type-label { font-size: 0.6rem; color: var(--text2); margin-top: 1px; }
.source-stats { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
.source-out  { font-size: 0.7rem; font-weight: 500; color: var(--danger); font-family: 'Space Grotesk', sans-serif; }
.source-in   { font-size: 0.7rem; font-weight: 500; color: var(--success); font-family: 'Space Grotesk', sans-serif; }
.source-chevron { color: var(--text2); flex-shrink: 0; }
.section-sub { font-size: 0.62rem; color: var(--text2); }
.no-source-hint { font-size: 0.72rem; color: var(--text2); text-align: center; padding: 12px 0; }

/* Clickable source row */
.source-row.clickable {
  width: 100%;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  text-align: left;
  transition: background var(--transition);
  padding: 6px 4px;
}
.source-row.clickable:hover { background: var(--surface2); }

/* Cash flow chart */
.chart-wrap { position: relative; height: 220px; }

/* Mobile — shrink hero text */
@media (max-width: 400px) {
  .hero-grid { grid-template-columns: 1fr 1fr 1fr; }
  .hero-value { font-size: 0.82rem; }
  .cat-name, .source-name { width: 60px; }
  .cat-amt,  .source-amt  { width: 50px; }
}
</style>
