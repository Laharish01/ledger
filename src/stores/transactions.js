/**
 * transactions store
 *
 * Design goals:
 * - One "all transactions" fetch on login for stats (allTx).
 * - Separate paginated fetch for the visible list (txList).
 * - Monthly stats computed from allTx — zero extra API calls.
 * - All id comparisons use String() to avoid type coercion bugs.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { transactions as txApi } from '../api'

// ── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

const PALETTE = [
  '#b8f735', '#7c6af7', '#f7525a', '#3dd68c', '#fb923c',
  '#38bdf8', '#e879f9', '#fbbf24', '#34d399', '#f87171',
]

// ── Helpers (exported for use in templates) ──────────────────────────────────

/** Stable per-category colour derived from a shared palette. */
const categoryColorMap = {}
let colorCursor = 0

export function catColor(category) {
  if (!categoryColorMap[category]) {
    categoryColorMap[category] = PALETTE[colorCursor++ % PALETTE.length]
  }
  return categoryColorMap[category]
}

/**
 * Parse a freeform transaction string into a structured object.
 * Format: "<amount> <category> [notes…]"
 * A negative amount marks income; positive marks expense.
 */
export function parseInput(raw) {
  const match = raw.trim().match(/^(-?\d+(?:\.\d+)?)\s+(\S+)\s*(.*)?$/)
  if (!match) throw new Error('Format: <Amount> <Category> [Notes]')

  const amount = parseFloat(match[1])
  return {
    amount:   Math.abs(amount),
    type:     amount < 0 ? 'income' : 'expense',
    category: match[2],
    notes:    match[3]?.trim() ?? '',
  }
}

/** Human-readable relative date. */
export function timeAgo(dateStr) {
  const diffSec = (Date.now() - new Date(dateStr)) / 1000
  if (diffSec < 60)    return 'just now'
  if (diffSec < 3600)  return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

/** ISO start-of-month string for "now". */
function currentMonthStart() {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), 1).toISOString()
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useTransactionStore = defineStore('transactions', () => {

  // --- State ------------------------------------------------------------------

  /** Paginated list shown in the Home tab. */
  const txList = ref([])

  /** Full dataset used only for stat calculations. Loaded once on login. */
  const allTx = ref([])

  /** Pagination cursor for txList. */
  const offset = ref(0)

  const activePeriod = ref('recent')
  const customFrom   = ref(null)
  const customTo     = ref(null)
  const hasMore      = ref(false)

  // --- Computed stats (derived from allTx — no API calls) ---------------------

  const monthStart = currentMonthStart()

  /** Transactions that fall within the current calendar month. */
  const thisMonthTx = computed(() =>
    allTx.value.filter(t => t.created_at >= monthStart),
  )

  /**
   * Stats shown in the Home tab stat cards.
   * Recalculates reactively whenever allTx changes (e.g. after add/delete).
   */
  const stats = computed(() => {
    const monthExpenses = thisMonthTx.value
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0)

    const monthIncome = thisMonthTx.value
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0)

    return { monthExpenses, monthIncome }
  })

  // --- Period helpers ----------------------------------------------------------

  function getPeriodRange() {
    const now = new Date()

    if (activePeriod.value === 'week') {
      const from = new Date(now)
      from.setDate(now.getDate() - 7)
      from.setHours(0, 0, 0, 0)
      return { from: from.toISOString(), to: null }
    }

    if (activePeriod.value === 'month') {
      return { from: currentMonthStart(), to: null }
    }

    if (activePeriod.value === 'year') {
      return { from: new Date(now.getFullYear(), 0, 1).toISOString(), to: null }
    }

    if (activePeriod.value === 'custom' && customFrom.value) {
      const to = customTo.value ? new Date(customTo.value) : null
      if (to) to.setHours(23, 59, 59, 999)
      return {
        from: new Date(customFrom.value).toISOString(),
        to:   to?.toISOString() ?? null,
      }
    }

    return { from: null, to: null }
  }

  // --- API actions ------------------------------------------------------------

  /**
   * Load the paginated visible list.
   * @param {boolean} reset - Start from page 1.
   */
  async function load(reset = false) {
    if (reset) { offset.value = 0; txList.value = [] }
    const limit = activePeriod.value === 'recent' ? 5 : PAGE_SIZE

    const { from, to } = getPeriodRange()

    const data = await txApi.list({
      limit:  limit,
      offset: reset ? 0 : offset.value,
      from:   from  ?? undefined,
      to:     to    ?? undefined,
    })

    txList.value = reset ? data : [...txList.value, ...data]
    offset.value += data.length
    hasMore.value = data.length === PAGE_SIZE
    return data
  }

  /**
   * Load all transactions for stat computation.
   * Should be called once after login. Does NOT affect txList.
   */
  async function loadAll() {
    try {
      allTx.value = await txApi.list({ limit: 10000 })
    } catch {
      allTx.value = []
    }
  }

  /** Optimistic add — inserts a temporary record, replaces with server response. */
  async function add(parsed) {
    const tempId    = `temp-${Date.now()}`
    const optimistic = {
      id:         tempId,
      created_at: new Date().toISOString(),
      _pending:   true,
      ...parsed,
    }

    txList.value.unshift(optimistic)
    allTx.value.unshift(optimistic) // keep stats in sync

    try {
      const saved = await txApi.create(parsed)

      // Replace optimistic record in both lists
      const listIdx = txList.value.findIndex(t => t.id === tempId)
      if (listIdx !== -1) txList.value[listIdx] = saved

      const allIdx = allTx.value.findIndex(t => t.id === tempId)
      if (allIdx !== -1) allTx.value[allIdx] = saved

      return saved
    } catch {
      // Rollback on failure
      txList.value = txList.value.filter(t => t.id !== tempId)
      allTx.value  = allTx.value.filter(t => t.id !== tempId)
      throw new Error('Failed to save')
    }
  }

  /** Optimistic update — patches locally, rolls back on error. */
  async function update(id, updates) {
    const patch = (list) => {
      const idx = list.findIndex(t => String(t.id) === String(id))
      if (idx === -1) return null
      const original = { ...list[idx] }
      list[idx] = { ...list[idx], ...updates }
      return original
    }

    const originalInList = patch(txList.value)
    const originalInAll  = patch(allTx.value)

    try {
      await txApi.update(id, updates)
    } catch {
      // Rollback
      if (originalInList) {
        const idx = txList.value.findIndex(t => String(t.id) === String(id))
        if (idx !== -1) txList.value[idx] = originalInList
      }
      if (originalInAll) {
        const idx = allTx.value.findIndex(t => String(t.id) === String(id))
        if (idx !== -1) allTx.value[idx] = originalInAll
      }
      throw new Error('Update failed')
    }
  }

  /** Optimistic remove — deletes locally, restores on error. */
  async function remove(id) {
    const strId       = String(id)
    const listSnapshot = [...txList.value]
    const allSnapshot  = [...allTx.value]

    txList.value = txList.value.filter(t => String(t.id) !== strId)
    allTx.value  = allTx.value.filter(t => String(t.id) !== strId)

    try {
      await txApi.remove(id)
    } catch {
      txList.value = listSnapshot
      allTx.value  = allSnapshot
      throw new Error('Delete failed')
    }
  }

  function setPeriod(period, from = null, to = null) {
    activePeriod.value = period
    if (period === 'custom') {
      customFrom.value = from
      customTo.value   = to
    }
    load(true)
  }

  function loadMore() {
    return load(false)
  }

  // --- Public API -------------------------------------------------------------

  return {
    // State
    txList, allTx, activePeriod, customFrom, customTo, hasMore,
    // Computed
    stats,
    // Actions
    load, loadAll, add, update, remove, setPeriod, loadMore,
  }
})
