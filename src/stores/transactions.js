import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { transactions as txApi } from '../api'

const LIMIT = 20

const COLORS = [
  '#c8f560','#7c6af7','#ff5f6d','#4ade80','#fb923c',
  '#38bdf8','#e879f9','#fbbf24','#34d399','#f87171',
]
const colorMap = {}
let colorIdx   = 0
export function catColor(cat) {
  if (!colorMap[cat]) colorMap[cat] = COLORS[colorIdx++ % COLORS.length]
  return colorMap[cat]
}

export function parseInput(raw) {
  const m = raw.trim().match(/^(-?\d+(?:\.\d+)?)\s+(\S+)\s*(.*)?$/)
  if (!m) throw new Error('Format: <Amount> <Category> <Notes>')
  const amount = parseFloat(m[1])
  return {
    amount: Math.abs(amount),
    type: amount < 0 ? 'income' : 'expense',
    category: m[2],
    notes: m[3]?.trim() || '',
  }
}

export function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export const useTransactionStore = defineStore('transactions', () => {
  const txList       = ref([])
  const offset       = ref(0)
  const activePeriod = ref('recent')
  const customFrom   = ref(null)
  const customTo     = ref(null)
  const hasMore      = ref(false)

  // Derived stats from local list (instant, no network)
  const localStats = computed(() => {
    const expenses = txList.value.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0)
    const income   = txList.value.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0)
    return { expenses, income, count: txList.value.length }
  })

  // Full stats from DB
  const dbStats = ref({ expenses: 0, income: 0, count: 0 })

  function getPeriodRange() {
    const now = new Date()
    if (activePeriod.value === 'week') {
      const from = new Date(now); from.setDate(now.getDate() - 7); from.setHours(0,0,0,0)
      return { from: from.toISOString(), to: null }
    }
    if (activePeriod.value === 'month') {
      return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), to: null }
    }
    if (activePeriod.value === 'year') {
      return { from: new Date(now.getFullYear(), 0, 1).toISOString(), to: null }
    }
    if (activePeriod.value === 'custom' && customFrom.value) {
      const to = customTo.value ? new Date(customTo.value) : null
      if (to) to.setHours(23,59,59,999)
      return { from: new Date(customFrom.value).toISOString(), to: to?.toISOString() || null }
    }
    return { from: null, to: null }
  }

  async function load(reset = false) {
    if (reset) { offset.value = 0; txList.value = [] }
    const limit = activePeriod.value === 'recent' ? 5 : LIMIT
    const { from, to } = getPeriodRange()
    const data = await txApi.list({
      limit,
      offset: activePeriod.value !== 'recent' ? offset.value : undefined,
      from: from || undefined,
      to: to || undefined,
    })
    txList.value = reset ? data : [...txList.value, ...data]
    if (activePeriod.value !== 'recent') offset.value += data.length
    hasMore.value = activePeriod.value !== 'recent' && data.length === limit
    return data
  }

  async function loadStats() {
    try {
      const rows = await txApi.stats()
      let expenses = 0, income = 0, count = 0
      rows.forEach(r => {
        if (r.type === 'expense') { expenses = r.total; count += r.count }
        if (r.type === 'income')  { income   = r.total; count += r.count }
      })
      dbStats.value = { expenses, income, count }
    } catch {}
  }

  async function add(parsed) {
    const tempId    = 'temp-' + Date.now()
    const optimistic = { id: tempId, created_at: new Date().toISOString(), ...parsed, _pending: true }
    txList.value.unshift(optimistic)
    if (txList.value.length > LIMIT) txList.value.pop()

    try {
      const data = await txApi.create(parsed)
      const idx  = txList.value.findIndex(t => t.id === tempId)
      if (idx !== -1) txList.value[idx] = data
      return data
    } catch {
      txList.value = txList.value.filter(t => t.id !== tempId)
      throw new Error('Failed to save')
    }
  }

  async function update(id, updates) {
    const idx      = txList.value.findIndex(t => t.id == id)
    const original = idx !== -1 ? { ...txList.value[idx] } : null
    if (idx !== -1) txList.value[idx] = { ...txList.value[idx], ...updates }

    try {
      await txApi.update(id, updates)
    } catch {
      if (idx !== -1 && original) txList.value[idx] = original
      throw new Error('Update failed')
    }
  }

  async function remove(id) {
    const snapshot = [...txList.value]
    txList.value   = txList.value.filter(t => t.id != id)

    try {
      await txApi.remove(id)
    } catch {
      txList.value = snapshot
      throw new Error('Delete failed')
    }
  }

  function setPeriod(period, from = null, to = null) {
    activePeriod.value = period
    if (period === 'custom') {
      customFrom.value = from
      customTo.value   = to
    }
    if (period !== 'custom') load(true)
  }

  function loadMore() { return load(false) }

  return {
    txList, offset, activePeriod, customFrom, customTo,
    hasMore, localStats, dbStats,
    load, loadStats, add, update, remove, setPeriod, loadMore,
  }
})
