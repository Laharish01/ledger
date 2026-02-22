<template>
  <Teleport to="body">
    <div class="modal-overlay" :class="{ open: modelValue }" @click.self="$emit('update:modelValue', false)">
      <div class="modal">
        <div class="modal-title">Settings</div>

        <div class="field">
          <label>Currency</label>
          <select v-model="selected">
            <option v-for="c in currencies" :key="c.code" :value="c.code">
              {{ c.code }} — {{ c.name }}
            </option>
          </select>
        </div>

        <div class="field">
          <label>Data</label>
          <div class="data-btns">
            <input
              ref="fileInput"
              type="file"
              accept=".xlsx,.xls,.csv"
              style="display:none"
              @change="handleImport"
            >
            <button class="data-btn" :disabled="importing" @click="fileInput.click()">
              {{ importing ? importLabel : 'Import Transactions' }}
            </button>
            <button class="data-btn" @click="handleExport">Export Transactions</button>
          </div>
          <div v-if="importing" class="import-bar-track">
            <div class="import-bar-fill" :style="{ width: importPct + '%' }"></div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="modal-btn secondary" @click="$emit('update:modelValue', false)">Cancel</button>
          <button class="modal-btn primary" @click="save">Save</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { transactions as txApi } from '../api'

const props = defineProps({ modelValue: Boolean })
const emit  = defineEmits(['update:modelValue', 'saved', 'toast', 'import-done'])

const settingsStore = useSettingsStore()
const selected      = ref(settingsStore.currency)

watch(() => props.modelValue, (open) => {
  if (open) selected.value = settingsStore.currency
})

const currencies = [
  { code: 'USD', name: 'US Dollar ($)' },
  { code: 'EUR', name: 'Euro (€)' },
  { code: 'GBP', name: 'British Pound (£)' },
  { code: 'JPY', name: 'Japanese Yen (¥)' },
  { code: 'INR', name: 'Indian Rupee (₹)' },
  { code: 'CAD', name: 'Canadian Dollar (CA$)' },
  { code: 'AUD', name: 'Australian Dollar (A$)' },
  { code: 'CHF', name: 'Swiss Franc (CHF)' },
  { code: 'CNY', name: 'Chinese Yuan (¥)' },
  { code: 'BRL', name: 'Brazilian Real (R$)' },
  { code: 'MXN', name: 'Mexican Peso (MX$)' },
  { code: 'SGD', name: 'Singapore Dollar (S$)' },
  { code: 'AED', name: 'UAE Dirham (AED)' },
  { code: 'KRW', name: 'South Korean Won (₩)' },
  { code: 'SEK', name: 'Swedish Krona (kr)' },
  { code: 'NOK', name: 'Norwegian Krone (kr)' },
  { code: 'NZD', name: 'New Zealand Dollar (NZ$)' },
  { code: 'ZAR', name: 'South African Rand (R)' },
]

async function save() {
  await settingsStore.save(selected.value)
  emit('update:modelValue', false)
  emit('saved')
}

// ── Import ────────────────────────────────────────────────────
const fileInput   = ref(null)
const importing   = ref(false)
const importLabel = ref('Importing…')
const importPct   = ref(0)

async function handleImport(e) {
  const file = e.target.files[0]
  if (!file) return
  e.target.value = ''

  let XLSX
  try {
    // Use globally loaded SheetJS if available, otherwise import dynamically
    XLSX = window.XLSX || await import('xlsx')
  } catch {
    return emit('toast', { msg: 'XLSX library unavailable', type: 'error' })
  }

  const reader = new FileReader()
  reader.onload = async (ev) => {
    let rows
    try {
      const wb = XLSX.read(ev.target.result, { type: 'binary' })
      rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])
    } catch {
      return emit('toast', { msg: 'Could not read file', type: 'error' })
    }
    if (!rows.length) return emit('toast', { msg: 'File is empty', type: 'error' })

    const normalise = (row) => {
      const get = (...keys) => {
        for (const k of keys) {
          const match = Object.keys(row).find(r => r.toLowerCase().trim() === k)
          if (match !== undefined && row[match] !== undefined && row[match] !== '') return row[match]
        }
        return null
      }
      const rawAmount = parseFloat(get('amount', 'amt', 'sum', 'value'))
      if (isNaN(rawAmount)) return null
      const rawDate = get('date', 'created_at', 'datetime', 'timestamp', 'time')
      let created_at = new Date().toISOString()
      if (rawDate) {
        const parsed = typeof rawDate === 'number'
          ? new Date(Math.round((rawDate - 25569) * 86400 * 1000))
          : new Date(rawDate)
        if (!isNaN(parsed)) created_at = parsed.toISOString()
      }
      const rawType = (get('type', 'kind', 'transaction type') || '').toString().toLowerCase()
      return {
        amount:   Math.abs(rawAmount),
        type:     rawType.includes('inc') || rawAmount < 0 ? 'income' : 'expense',
        category: (get('category', 'cat', 'label', 'tag') || 'Other').toString(),
        notes:    (get('notes', 'note', 'description', 'desc', 'memo') || '').toString(),
        created_at,
      }
    }

    const records = rows.map(normalise).filter(Boolean)
    if (!records.length) return emit('toast', { msg: 'No valid rows found', type: 'error' })

    importing.value = true
    const BATCH = 50
    let done = 0
    for (let i = 0; i < records.length; i += BATCH) {
      const batch = records.slice(i, i + BATCH)
      try { for (const tx of batch) await txApi.create(tx) }
      catch { emit('toast', { msg: 'Import failed on batch', type: 'error' }); break }
      done += batch.length
      importPct.value   = Math.round((done / records.length) * 100)
      importLabel.value = `Importing… ${done} / ${records.length}`
    }

    importing.value   = false
    importPct.value   = 0
    importLabel.value = 'Importing…'
    emit('update:modelValue', false)
    emit('toast', { msg: `Imported ${done} transactions`, type: 'success' })
    emit('import-done')
  }
  reader.readAsBinaryString(file)
}

// ── Export ────────────────────────────────────────────────────
async function handleExport() {
  const XLSX = window.XLSX
  if (!XLSX) return emit('toast', { msg: 'XLSX library not loaded', type: 'error' })
  emit('toast', { msg: 'Preparing export…', type: 'success' })

  let data
  try { data = await txApi.list({ limit: 10000 }) }
  catch { return emit('toast', { msg: 'Export failed', type: 'error' }) }
  if (!data?.length) return emit('toast', { msg: 'No data to export', type: 'error' })

  const rows = data.map(t => ({
    Date: new Date(t.created_at).toLocaleDateString(),
    Type: t.type, Category: t.category,
    Amount: parseFloat(t.amount), Notes: t.notes || '',
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions')
  ws['!cols'] = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length, ...rows.map(r => String(r[k]).length)) }))
  XLSX.writeFile(wb, `ledger-export-${new Date().toISOString().slice(0,10)}.xlsx`)
  emit('toast', { msg: `Exported ${rows.length} transactions`, type: 'success' })
}
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; background: var(--overlay);
  z-index: 500; display: flex; align-items: center; justify-content: center;
  padding: 20px; opacity: 0; pointer-events: none;
  transition: opacity 0.2s; backdrop-filter: blur(4px);
}
.modal-overlay.open { opacity: 1; pointer-events: all; }

.modal {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 16px; padding: 28px; width: 100%; max-width: 420px;
  transform: translateY(16px);
  transition: transform 0.25s cubic-bezier(0.34,1.4,0.64,1);
}
.modal-overlay.open .modal { transform: translateY(0); }

.modal-title { font-family: 'Roboto Slab', serif; font-size: 1.3rem; margin-bottom: 20px; }

.field { margin-bottom: 16px; }
.field label {
  display: block; font-size: 0.68rem; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--muted); margin-bottom: 6px;
}
.field select {
  width: 100%; background: var(--bg); border: 1px solid var(--border);
  border-radius: 8px; padding: 10px 12px; color: var(--text);
  font-family: 'Roboto', sans-serif; font-size: 16px;
  outline: none; transition: border-color 0.2s; appearance: none;
}
.field select:focus { border-color: var(--accent); }

.data-btns { display: flex; flex-direction: column; gap: 8px; }
.data-btn {
  width: 100%; padding: 10px 14px; background: var(--bg);
  border: 1px solid var(--border); border-radius: 8px;
  color: var(--text); font-family: 'Roboto', sans-serif;
  font-size: 0.82rem; letter-spacing: 0.03em; cursor: pointer;
  transition: all 0.2s; text-align: left;
}
.data-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.data-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.import-bar-track {
  height: 3px; background: var(--border); border-radius: 2px;
  overflow: hidden; margin-top: 8px;
}
.import-bar-fill {
  height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.2s;
}

.modal-actions { display: flex; gap: 10px; margin-top: 20px; }
.modal-btn {
  flex: 1; padding: 11px; border-radius: 8px; border: none;
  font-family: 'Roboto', sans-serif; font-size: 0.8rem;
  letter-spacing: 0.05em; text-transform: uppercase; cursor: pointer;
  transition: all 0.2s; font-weight: 500;
}
.modal-btn.primary         { background: var(--accent); color: var(--accent-text); }
.modal-btn.primary:hover   { opacity: 0.9; }
.modal-btn.secondary       { background: var(--border); color: var(--muted); }
.modal-btn.secondary:hover { color: var(--text); }

@media (max-width: 640px) {
  .modal { margin: 0 8px; }
  .modal-actions { flex-direction: column; }
}
</style>
