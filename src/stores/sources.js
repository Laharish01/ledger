/**
 * sources store — payment sources (savings, credit, debit, cash, other).
 * Persisted in D1 via /api/sources — syncs across all devices.
 */
import { defineStore } from 'pinia'
import { ref }         from 'vue'
import { sources as sourcesApi } from '../api'

export const SOURCE_TYPES = [
  { value: 'savings', label: 'Savings',     emoji: '🏦' },
  { value: 'credit',  label: 'Credit card', emoji: '💳' },
  { value: 'debit',   label: 'Debit card',  emoji: '💳' },
  { value: 'cash',    label: 'Cash',        emoji: '💵' },
  { value: 'other',   label: 'Other',       emoji: '🪙'  },
]

export const SOURCE_COLORS = [
  '#7c6af7', '#b8f735', '#f7525a', '#3dd68c',
  '#fb923c', '#38bdf8', '#e879f9', '#fbbf24',
]

export const useSourcesStore = defineStore('sources', () => {
  const list    = ref([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    try { list.value = await sourcesApi.list() } catch { list.value = [] }
    loading.value = false
  }

  async function add(payload) {
    const saved = await sourcesApi.create(payload)
    list.value.push(saved)
    return saved
  }

  async function update(id, payload) {
    await sourcesApi.update(id, payload)
    const idx = list.value.findIndex(s => s.id === id)
    if (idx !== -1) list.value[idx] = { ...list.value[idx], ...payload }
  }

  async function remove(id) {
    await sourcesApi.remove(id)
    list.value = list.value.filter(s => s.id !== id)
  }

  /** Find a source by the tag embedded in a transaction's notes field. */
  function fromNotes(notes) {
    const m = (notes ?? '').match(/\[([^\]]+)\]/)
    return m ? list.value.find(s => s.name === m[1]) ?? null : null
  }

  return { list, loading, load, add, update, remove, fromNotes }
})
