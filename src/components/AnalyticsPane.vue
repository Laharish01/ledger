<template>
  <div class="analytics">
    <div v-if="loading" class="state-empty">
      <div class="spinner"></div>
    </div>
    <div v-else-if="!data.length" class="state-empty">
      <div class="empty-icon"><SvgIcon :svg="iconChart" :size="36" /></div>
      <p>Add transactions to see analytics</p>
    </div>
    <template v-else>
      <div class="summary-grid">
        <div class="sum-card">
          <div class="sum-label">Total expenses</div>
          <div class="sum-value red">{{ fmt(totalExpense) }}</div>
        </div>
        <div class="sum-card">
          <div class="sum-label">Total income</div>
          <div class="sum-value green">{{ fmt(totalIncome) }}</div>
        </div>
        <div class="sum-card span2">
          <div class="sum-label">Net balance</div>
          <div class="sum-value" :class="net >= 0 ? 'green' : 'red'">{{ fmt(net) }}</div>
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-label">Spending by category</div>
        <div class="chart-wrap"><canvas ref="pieCanvas"></canvas></div>
        <div class="legend">
          <div v-for="(c, i) in topCats" :key="c.category" class="leg-item">
            <div class="leg-dot" :style="{ background: COLORS[i] }"></div>
            <span class="leg-name">{{ c.category }}</span>
            <span class="leg-amt">{{ fmt(c.total) }}</span>
            <span class="leg-pct">{{ ((c.total / totalExpense) * 100).toFixed(0) }}%</span>
          </div>
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-label">Monthly trend</div>
        <div class="chart-wrap tall"><canvas ref="lineCanvas"></canvas></div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { Chart } from 'chart.js/auto'
import { useSettingsStore } from '../stores/settings'
import { transactions as txApi } from '../api'
import SvgIcon from './SvgIcon.vue'
import { iconChart } from '../icons'
import { storeToRefs } from 'pinia'

const props = defineProps({ currency: String })

const settings = useSettingsStore()
const { fmt }  = storeToRefs(settings)

const loading = ref(true)
const data    = ref([])

const COLORS = ['#b8f735','#7c6af7','#f7525a','#3dd68c','#fb923c','#38bdf8','#e879f9','#fbbf24','#34d399','#f87171']

const pieCanvas  = ref(null)
const lineCanvas = ref(null)
let charts = []

const expenses     = computed(() => data.value.filter(t => t.type === 'expense'))
const incomes      = computed(() => data.value.filter(t => t.type === 'income'))
const totalExpense = computed(() => expenses.value.reduce((s, t) => s + parseFloat(t.amount), 0))
const totalIncome  = computed(() => incomes.value.reduce((s, t) => s + parseFloat(t.amount), 0))
const net          = computed(() => totalIncome.value - totalExpense.value)

const catMap = computed(() => {
  const m = {}
  expenses.value.forEach(t => { m[t.category] = (m[t.category] || 0) + parseFloat(t.amount) })
  return Object.entries(m).map(([c, t]) => ({ category: c, total: t })).sort((a, b) => b.total - a.total)
})
const topCats = computed(() => catMap.value.slice(0, 10))

const monthMap = computed(() => {
  const m = {}
  const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 5); cutoff.setDate(1)
  data.value.filter(t => new Date(t.created_at) >= cutoff).forEach(t => {
    const k = new Date(t.created_at).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
    if (!m[k]) m[k] = { expense: 0, income: 0 }
    m[k][t.type] += parseFloat(t.amount)
  })
  return m
})

function cd() {
  const light = document.documentElement.getAttribute('data-theme') === 'light'
  return { muted: light ? '#9898b0' : '#5a5a7a', grid: light ? '#e0e0d8' : '#1c1c2a', tip: light ? '#ffffff' : '#0f0f17', tipBorder: light ? '#e2e2da' : '#1c1c2a' }
}

function destroyCharts() { charts.forEach(c => c.destroy()); charts = [] }

async function renderCharts() {
  await nextTick()
  destroyCharts()
  const d = cd()
  const tip = { backgroundColor: d.tip, borderColor: d.tipBorder, borderWidth: 1, titleColor: d.muted, bodyColor: d.muted, padding: 10, cornerRadius: 8 }

  Chart.defaults.color       = d.muted
  Chart.defaults.font.family = "'Inter', sans-serif"
  Chart.defaults.font.size   = 11

  const pieData = topCats.value
  if (pieCanvas.value && pieData.length) {
    charts.push(new Chart(pieCanvas.value, {
      type: 'doughnut',
      data: { labels: pieData.map(c => c.category), datasets: [{ data: pieData.map(c => c.total), backgroundColor: COLORS.slice(0, pieData.length), borderWidth: 0, hoverOffset: 6 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '70%',
        plugins: { legend: { display: false }, tooltip: { ...tip, callbacks: { label: ctx => ` ${ctx.label}: ${fmt.value(ctx.raw)}` } } }
      }
    }))
  }

  const months = Object.keys(monthMap.value)
  if (lineCanvas.value && months.length) {
    charts.push(new Chart(lineCanvas.value, {
      type: 'line',
      data: {
        labels: months,
        datasets: [
          { label: 'Expenses', data: months.map(m => monthMap.value[m]?.expense || 0), borderColor: '#f7525a', backgroundColor: 'rgba(247,82,90,0.08)', fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#f7525a' },
          { label: 'Income',   data: months.map(m => monthMap.value[m]?.income  || 0), borderColor: '#3dd68c', backgroundColor: 'rgba(61,214,140,0.08)',  fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#3dd68c' },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: d.muted, usePointStyle: true, pointStyleWidth: 7, boxHeight: 7 } },
          tooltip: { ...tip, callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmt.value(ctx.raw)}` } }
        },
        scales: {
          x: { grid: { color: d.grid }, ticks: { color: d.muted } },
          y: { grid: { color: d.grid }, ticks: { color: d.muted, callback: v => fmt.value(v) } }
        }
      }
    }))
  }
}

watch(data, d => { if (d.length) renderCharts() })
watch(() => props.currency, () => { if (data.value.length) renderCharts() })

onMounted(async () => {
  try { data.value = await txApi.list({ limit: 10000 }) } catch {}
  loading.value = false
})
</script>

<style scoped>
.analytics { display: flex; flex-direction: column; gap: 14px; }

.state-empty { padding: 60px 0; text-align: center; color: var(--text2); font-size: 0.85rem; }
.empty-icon  { font-size: 2.2rem; margin-bottom: 10px; }
.spinner     { width: 26px; height: 26px; margin: 0 auto; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.summary-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
}
.sum-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 16px;
}
.sum-card.span2 { grid-column: 1 / -1; }
.sum-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text2); margin-bottom: 5px; }
.sum-value { font-family: 'Space Grotesk', sans-serif; font-size: 1.5rem; font-weight: 600; letter-spacing: -0.02em; }
.sum-value.red   { color: var(--danger); }
.sum-value.green { color: var(--success); }

.chart-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 20px;
}
.chart-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text2); margin-bottom: 16px; }
.chart-wrap      { position: relative; height: 220px; }
.chart-wrap.tall { height: 240px; }

.legend { margin-top: 16px; display: flex; flex-direction: column; gap: 7px; max-height: 180px; overflow-y: auto; }
.leg-item { display: flex; align-items: center; gap: 8px; font-size: 0.75rem; }
.leg-dot  { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.leg-name { flex: 1; color: var(--text2); }
.leg-amt  { color: var(--text); font-weight: 500; }
.leg-pct  { font-size: 0.65rem; color: var(--accent); background: var(--accent-dim); padding: 2px 6px; border-radius: 4px; }
</style>
