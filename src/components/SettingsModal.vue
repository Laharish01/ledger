<!--
  SettingsModal — currency preference + data import/export.
  Slides up as a bottom sheet on mobile, centred dialog on desktop.
-->
<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="overlay"
        @click.self="$emit('update:modelValue', false)"
      >
        <div class="modal" role="dialog" aria-modal="true" aria-label="Settings">

          <!-- Header -->
          <div class="modal-header">
            <h2 class="modal-title">Settings</h2>
            <button class="close-btn" title="Close" @click="$emit('update:modelValue', false)">
              <SvgIcon :svg="iconClose" :size="14" />
            </button>
          </div>

          <!-- Currency -->
          <div class="field">
            <label for="currency-select">Currency</label>
            <select id="currency-select" v-model="selectedCurrency">
              <option v-for="c in CURRENCIES" :key="c.code" :value="c.code">
                {{ c.code }} — {{ c.name }}
              </option>
            </select>
          </div>

          <!-- Data section -->
          <div class="section-label">Data</div>
          <div class="data-btns">
            <!-- Hidden file picker -->
            <input
              ref="fileInput"
              type="file"
              accept=".xlsx,.xls,.csv"
              style="display:none"
              @change="handleImport"
            >

            <button class="data-btn" :disabled="importing" @click="fileInput.click()">
              <SvgIcon :svg="iconUpload" :size="15" />
              {{ importing ? importLabel : 'Import transactions' }}
            </button>

            <button class="data-btn" @click="handleExport">
              <SvgIcon :svg="iconDownload" :size="15" />
              Export transactions
            </button>
          </div>

          <div class="section-label">Accounts</div>
          <button class="data-btn" @click="$emit('open-accounts')">
            <SvgIcon :svg="iconCard" :size="15" />
            Manage payment sources
          </button>

          <!-- Import progress bar -->
          <div v-if="importing" class="progress-track">
            <div class="progress-fill" :style="{ width: importPct + '%' }" />
          </div>

          <!-- Actions -->
          <div class="modal-actions">
            <button class="btn-ghost" @click="$emit('update:modelValue', false)">Cancel</button>
            <button class="btn-primary" @click="save">Save</button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useSettingsStore }      from '../stores/settings'
import { transactions as txApi } from '../api'
import { iconClose, iconUpload, iconDownload, iconCard } from '../icons'
import SvgIcon from './SvgIcon.vue'

// ── Props / emits ────────────────────────────────────────────────────────────

const props = defineProps({ modelValue: Boolean })
const emit  = defineEmits(['update:modelValue', 'saved', 'toast', 'import-done', 'open-accounts'])

// ── Currency ─────────────────────────────────────────────────────────────────

const store            = useSettingsStore()
const selectedCurrency = ref(store.currency)

// Sync picker when modal opens
watch(() => props.modelValue, (open) => {
  if (open) selectedCurrency.value = store.currency
})

async function save() {
  await store.save(selectedCurrency.value)
  emit('update:modelValue', false)
  emit('saved')
}

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar ($)' },       { code: 'EUR', name: 'Euro (€)' },
  { code: 'GBP', name: 'British Pound (£)' },   { code: 'JPY', name: 'Japanese Yen (¥)' },
  { code: 'INR', name: 'Indian Rupee (₹)' },    { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },    { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', name: 'Chinese Yuan (¥)' },    { code: 'BRL', name: 'Brazilian Real' },
  { code: 'MXN', name: 'Mexican Peso' },         { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'AED', name: 'UAE Dirham' },           { code: 'KRW', name: 'Korean Won (₩)' },
  { code: 'SEK', name: 'Swedish Krona' },        { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'NZD', name: 'NZ Dollar' },            { code: 'ZAR', name: 'South African Rand' },
]

// ── Import ────────────────────────────────────────────────────────────────────

const fileInput   = ref(null)
const importing   = ref(false)
const importLabel = ref('Importing…')
const importPct   = ref(0)

async function handleImport(e) {
  const file = e.target.files[0]
  if (!file) return
  e.target.value = '' // reset so same file can be re-selected

  const XLSX = window.XLSX
  if (!XLSX) return emit('toast', { msg: 'SheetJS not loaded', type: 'error' })

  const reader = new FileReader()
  reader.onload = async (ev) => {

    // Parse workbook
    let rows
    try {
      const wb = XLSX.read(ev.target.result, { type: 'binary' })
      rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])
    } catch {
      return emit('toast', { msg: 'Could not read file', type: 'error' })
    }
    if (!rows.length) return emit('toast', { msg: 'File is empty', type: 'error' })

    // Case-insensitive column getter
    const get = (row, ...keys) => {
      for (const k of keys) {
        const col = Object.keys(row).find(c => c.toLowerCase().trim() === k)
        if (col !== undefined && row[col] !== undefined && row[col] !== '') return row[col]
      }
      return null
    }

    // Normalise each row to our transaction shape
    const normalise = (row) => {
      const rawAmount = parseFloat(get(row, 'amount', 'amt', 'sum', 'value'))
      if (isNaN(rawAmount)) return null

      const rawDate = get(row, 'date', 'created_at', 'datetime', 'timestamp')
      let created_at = new Date().toISOString()
      if (rawDate) {
        // Excel stores dates as day-offsets from 1900-01-01
        const parsed = typeof rawDate === 'number'
          ? new Date(Math.round((rawDate - 25569) * 86400 * 1000))
          : new Date(rawDate)
        if (!isNaN(parsed)) created_at = parsed.toISOString()
      }

      const rawType = (get(row, 'type', 'kind') ?? '').toString().toLowerCase()
      return {
        amount:     Math.abs(rawAmount),
        type:       rawType.includes('inc') || rawAmount < 0 ? 'income' : 'expense',
        category:   (get(row, 'category', 'cat', 'label') ?? 'Other').toString(),
        notes:      (get(row, 'notes', 'note', 'description', 'memo') ?? '').toString(),
        created_at,
      }
    }

    const records = rows.map(normalise).filter(Boolean)
    if (!records.length) return emit('toast', { msg: 'No valid rows found', type: 'error' })

    // Upload in batches of 50
    importing.value = true
    let done = 0
    const BATCH = 50

    for (let i = 0; i < records.length; i += BATCH) {
      try {
        for (const tx of records.slice(i, i + BATCH)) await txApi.create(tx)
      } catch {
        emit('toast', { msg: 'Import error on batch', type: 'error' })
        break
      }
      done = Math.min(i + BATCH, records.length)
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

// ── Export ────────────────────────────────────────────────────────────────────

async function handleExport() {
  const XLSX = window.XLSX
  if (!XLSX) return emit('toast', { msg: 'SheetJS not loaded', type: 'error' })

  emit('toast', { msg: 'Preparing export…', type: 'success' })

  let data
  try { data = await txApi.list({ limit: 10000 }) }
  catch { return emit('toast', { msg: 'Export failed', type: 'error' }) }
  if (!data?.length) return emit('toast', { msg: 'No data to export', type: 'error' })

  // Build rows
  const rows = data.map(t => ({
    Date:     new Date(t.created_at).toLocaleDateString(),
    Type:     t.type,
    Category: t.category,
    Amount:   parseFloat(t.amount),
    Notes:    t.notes ?? '',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions')

  // Auto-fit column widths
  ws['!cols'] = Object.keys(rows[0]).map(k => ({
    wch: Math.max(k.length, ...rows.map(r => String(r[k]).length)),
  }))

  XLSX.writeFile(wb, `ledger-export-${new Date().toISOString().slice(0, 10)}.xlsx`)
  emit('toast', { msg: `Exported ${rows.length} transactions`, type: 'success' })
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay);
  z-index: 500;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  backdrop-filter: blur(6px);
}
@media (min-width: 640px) {
  .overlay { align-items: center; padding: 20px; }
}

.modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px 20px 0 0;
  padding: 24px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
@media (min-width: 640px) {
  .modal { border-radius: 18px; max-width: 400px; }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.modal-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1rem;
  font-weight: 600;
}
.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--surface2);
  border: none;
  color: var(--text2);
  cursor: pointer;
  transition: color var(--transition);
}
.close-btn:hover { color: var(--text); }

.field { display: flex; flex-direction: column; gap: 5px; }
label, .section-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text2);
}

select {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  color: var(--text);
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  outline: none;
  appearance: none;
  transition: border-color var(--transition);
}
select:focus { border-color: var(--accent); }

.data-btns { display: flex; flex-direction: column; gap: 6px; }
.data-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text2);
  font-family: 'Inter', sans-serif;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: border-color var(--transition), color var(--transition);
}
.data-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.data-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.progress-track {
  height: 3px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.2s;
}

.modal-actions { display: flex; gap: 8px; }
.btn-ghost {
  flex: 1;
  padding: 11px;
  background: var(--surface2);
  border: none;
  border-radius: var(--radius-sm);
  font-family: 'Inter', sans-serif;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--text2);
  cursor: pointer;
  transition: color var(--transition);
}
.btn-ghost:hover { color: var(--text); }
.btn-primary {
  flex: 2;
  padding: 11px;
  background: var(--accent);
  border: none;
  border-radius: var(--radius-sm);
  font-family: 'Inter', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--accent-text);
  cursor: pointer;
  transition: opacity var(--transition);
}
.btn-primary:hover { opacity: 0.88; }

.modal-enter-active, .modal-leave-active { transition: all 0.22s ease; }
.modal-enter-from .modal, .modal-leave-to .modal { transform: translateY(40px); opacity: 0; }
</style>
