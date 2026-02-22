<template>
  <div>
    <div class="grid-bg"></div>

    <NavBar :account-id="auth.accountId" @logout="logout" @open-settings="showSettings = true" />
    <SettingsModal v-model="showSettings" @toast="() => {}" />

    <main>
      <div class="page-title">Analytics</div>

      <div v-if="loading" class="empty-analytics"><p>Loading data...</p></div>

      <div v-else-if="!data.length" class="empty-analytics">
        <div class="big">📈</div>
        <p>No data yet. <RouterLink to="/app">Add some transactions</RouterLink> to see analytics.</p>
      </div>

      <template v-else>
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-label">Total Expenses</div>
            <div class="summary-value red">{{ fmt(totalExpense) }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total Income</div>
            <div class="summary-value green">{{ fmt(totalIncome) }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Net Balance</div>
            <div class="summary-value" :class="net >= 0 ? 'green' : 'red'">{{ fmt(net) }}</div>
          </div>
        </div>

        <div class="charts-grid">
          <div class="chart-card">
            <div class="chart-title">Spending by Category</div>
            <div class="chart-wrap"><canvas ref="pieCanvas"></canvas></div>
            <div class="legend">
              <div v-for="(c, i) in topCategories" :key="c.category" class="legend-item">
                <div class="legend-dot" :style="{ background: COLORS[i] }"></div>
                <div class="legend-name">{{ c.category }}</div>
                <div class="legend-amount">{{ fmt(c.total) }}</div>
                <div class="legend-pct">{{ ((c.total / totalExpense) * 100).toFixed(0) }}%</div>
              </div>
            </div>
          </div>

          <div class="chart-card">
            <div class="chart-title">Top Categories</div>
            <div class="chart-wrap"><canvas ref="barCanvas"></canvas></div>
          </div>

          <div class="chart-card full">
            <div class="chart-title">Monthly Trend (Last 6 Months)</div>
            <div class="chart-wrap tall"><canvas ref="lineCanvas"></canvas></div>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Chart } from 'chart.js/auto'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'
import { transactions as txApi } from '../api'
import NavBar from '../components/NavBar.vue'
import SettingsModal from '../components/SettingsModal.vue'
import { storeToRefs } from 'pinia'

const router   = useRouter()
const auth     = useAuthStore()
const settings = useSettingsStore()
const { fmt }  = storeToRefs(settings)

const loading     = ref(true)
const showSettings = ref(false)
const data     = ref([])

const COLORS = ['#c8f560','#7c6af7','#ff5f6d','#4ade80','#fb923c','#38bdf8','#e879f9','#fbbf24','#34d399','#f87171']

const pieCanvas  = ref(null)
const barCanvas  = ref(null)
const lineCanvas = ref(null)
let charts = []

const expenses      = computed(() => data.value.filter(t => t.type === 'expense'))
const incomes       = computed(() => data.value.filter(t => t.type === 'income'))
const totalExpense  = computed(() => expenses.value.reduce((s, t) => s + parseFloat(t.amount), 0))
const totalIncome   = computed(() => incomes.value.reduce((s, t) => s + parseFloat(t.amount), 0))
const net           = computed(() => totalIncome.value - totalExpense.value)

const byCategory = computed(() => {
  const m = {}
  expenses.value.forEach(t => { m[t.category] = (m[t.category] || 0) + parseFloat(t.amount) })
  return Object.entries(m).map(([c, t]) => ({ category: c, total: t })).sort((a, b) => b.total - a.total)
})
const topCategories = computed(() => byCategory.value.slice(0, 10))

const monthlyData = computed(() => {
  const monthMap = {}
  const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 5); cutoff.setDate(1)
  data.value.filter(t => new Date(t.created_at) >= cutoff).forEach(t => {
    const key = new Date(t.created_at).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
    if (!monthMap[key]) monthMap[key] = { expense: 0, income: 0 }
    monthMap[key][t.type] += parseFloat(t.amount)
  })
  return monthMap
})

function chartColors() {
  const light = document.documentElement.getAttribute('data-theme') === 'light'
  return {
    color:         light ? '#8a8a9a' : '#5a5a7a',
    gridColor:     light ? '#e8e8e0' : '#1e1e2e',
    tooltipBg:     light ? '#ffffff' : '#111118',
    tooltipBorder: light ? '#e0e0d8' : '#1e1e2e',
  }
}

function destroyCharts() { charts.forEach(c => c.destroy()); charts = [] }

async function renderCharts() {
  await nextTick()
  destroyCharts()
  const d   = chartColors()
  const tip = { backgroundColor: d.tooltipBg, borderColor: d.tooltipBorder, borderWidth: 1, titleColor: d.color, bodyColor: d.color, padding: 10 }

  Chart.defaults.color       = d.color
  Chart.defaults.font.family = "'Roboto', sans-serif"
  Chart.defaults.font.size   = 11

  // Pie
  const pieData = topCategories.value
  charts.push(new Chart(pieCanvas.value, {
    type: 'doughnut',
    data: {
      labels: pieData.map(c => c.category),
      datasets: [{ data: pieData.map(c => c.total), backgroundColor: COLORS.slice(0, pieData.length), borderWidth: 0, hoverOffset: 8 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: { ...tip, callbacks: { label: ctx => ` ${ctx.label}: ${fmt.value(ctx.raw)} (${((ctx.raw / totalExpense.value) * 100).toFixed(1)}%)` } }
      }
    }
  }))

  // Bar
  const top = byCategory.value.slice(0, 8)
  charts.push(new Chart(barCanvas.value, {
    type: 'bar',
    data: {
      labels: top.map(c => c.category),
      datasets: [{ data: top.map(c => c.total), backgroundColor: COLORS.slice(0, top.length).map(c => c + 'cc'), borderColor: COLORS.slice(0, top.length), borderWidth: 1, borderRadius: 6 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { ...tip, callbacks: { title: items => items[0].label, label: ctx => ` ${fmt.value(ctx.raw)}` } } },
      scales: {
        x: { grid: { color: d.gridColor }, ticks: { maxRotation: 35, color: d.color } },
        y: { grid: { color: d.gridColor }, ticks: { callback: v => fmt.value(v), color: d.color } }
      }
    }
  }))

  // Line
  const months = Object.keys(monthlyData.value)
  if (months.length) {
    charts.push(new Chart(lineCanvas.value, {
      type: 'line',
      data: {
        labels: months,
        datasets: [
          { label: 'Expenses', data: months.map(m => monthlyData.value[m]?.expense || 0), borderColor: '#ff5f6d', backgroundColor: 'rgba(255,95,109,0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#ff5f6d', pointRadius: 4 },
          { label: 'Income',   data: months.map(m => monthlyData.value[m]?.income  || 0), borderColor: '#4ade80', backgroundColor: 'rgba(74,222,128,0.1)',  fill: true, tension: 0.4, pointBackgroundColor: '#4ade80', pointRadius: 4 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: d.color, usePointStyle: true, pointStyleWidth: 8 } },
          tooltip: { ...tip, callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmt.value(ctx.raw)}` } }
        },
        scales: {
          x: { grid: { color: d.gridColor }, ticks: { color: d.color } },
          y: { grid: { color: d.gridColor }, ticks: { callback: v => fmt.value(v), color: d.color } }
        }
      }
    }))
  }
}

watch(data, (d) => { if (d.length) renderCharts() })

function logout() { auth.logout(); router.push('/login') }

onMounted(async () => {
  await settings.load()
  try { data.value = await txApi.list({ limit: 10000 }) } catch {}
  loading.value = false
})
</script>

<style scoped>
main { max-width: 900px; margin: 0 auto; padding: 40px 20px 100px; position: relative; z-index: 1; }

@media (max-width: 640px) {
  main { padding: 24px 14px 100px; }
  .summary-grid { grid-template-columns: 1fr 1fr; }
}
.page-title { font-family: 'Roboto Slab', serif; font-size: 2rem; margin-bottom: 32px; }

.summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 32px; }
.summary-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; transition: background 0.3s, border-color 0.3s; }
.summary-label { font-size: 0.65rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
.summary-value { font-family: 'Roboto Slab', serif; font-size: 1.8rem; }
.summary-value.red   { color: var(--danger); }
.summary-value.green { color: var(--success); }

.charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.chart-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 24px; transition: background 0.3s, border-color 0.3s; }
.chart-card.full { grid-column: 1 / -1; }
.chart-title { font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-bottom: 20px; }
.chart-wrap { position: relative; height: 260px; }
.chart-wrap.tall { height: 300px; }

.legend { margin-top: 20px; display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto; }
.legend-item { display: flex; align-items: center; gap: 10px; font-size: 0.75rem; }
.legend-dot  { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.legend-name { flex: 1; }
.legend-amount { color: var(--muted); }
.legend-pct { color: var(--accent); font-size: 0.65rem; background: rgba(200,245,96,0.1); padding: 2px 6px; border-radius: 4px; }
[data-theme="light"] .legend-pct { background: rgba(90,138,0,0.1); }

.empty-analytics { text-align: center; padding: 80px 20px; color: var(--muted); }
.empty-analytics .big { font-size: 3rem; margin-bottom: 12px; }
.empty-analytics a { color: var(--accent); text-decoration: none; }

@media (max-width: 600px) {
  .charts-grid { grid-template-columns: 1fr; }
  .chart-card.full { grid-column: 1; }
  .summary-grid { grid-template-columns: 1fr 1fr; }
  .summary-grid .summary-card:last-child { grid-column: 1 / -1; }
}
</style>
