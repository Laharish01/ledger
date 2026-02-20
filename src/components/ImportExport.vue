<template>
  <div class="import-export">
    <input
      ref="fileInput"
      type="file"
      accept=".xlsx,.xls,.csv"
      style="display:none"
      @change="handleImport"
    >
    <button class="icon-btn" @click="fileInput.click()" title="Import XLSX">⇪</button>
    <button class="icon-btn" @click="handleExport" title="Export XLSX">⇩</button>

    <!-- Import progress bar -->
    <Teleport to="body">
      <div class="import-bar" :class="{ show: importing }">
        <div class="import-bar-label">{{ importLabel }}</div>
        <div class="import-bar-track">
          <div class="import-bar-fill" :style="{ width: importPct + '%' }"></div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { transactions as txApi } from '../api'

const emit = defineEmits(['toast', 'done'])

const fileInput  = ref(null)
const importing  = ref(false)
const importLabel = ref('Importing...')
const importPct  = ref(0)

async function handleImport(e) {
  const file = e.target.files[0]
  if (!file) return
  e.target.value = ''

  // Dynamically load SheetJS
  const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js').catch(() => window.XLSX)

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

    importing.value = false
    importPct.value = 0
    emit('toast', { msg: `Imported ${done} transactions`, type: 'success' })
    emit('done')
  }
  reader.readAsBinaryString(file)
}

async function handleExport() {
  emit('toast', { msg: 'Preparing export…', type: 'success' })
  const XLSX = window.XLSX
  if (!XLSX) return emit('toast', { msg: 'XLSX library not loaded', type: 'error' })

  let data
  try { data = await txApi.list({ limit: 10000 }) }
  catch { return emit('toast', { msg: 'No data to export', type: 'error' }) }
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
.import-export { display: contents; }
.icon-btn {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 8px; width: 34px; height: 34px; font-size: 0.95rem;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; color: var(--text);
}
.icon-btn:hover { border-color: var(--accent); }

.import-bar {
  position: fixed; bottom: 80px; right: 24px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 10px; padding: 12px 16px; font-size: 0.75rem;
  z-index: 1000; min-width: 200px; display: none;
}
.import-bar.show { display: block; }
.import-bar-label { color: var(--muted); margin-bottom: 6px; }
.import-bar-track { height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
.import-bar-fill  { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.2s; }
</style>
