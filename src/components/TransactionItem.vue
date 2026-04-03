<!--
  TransactionItem — one row in the transaction list.
  Double-click / double-tap anywhere on the row to edit.
  Single-click the action buttons to edit or delete.
  Emits: edit(id), delete(id)
-->
<template>
  <div
    class="tx-item"
    :class="{ pending: tx._pending }"
    @dblclick="$emit('edit', tx.id)"
  >
    <div class="tx-dot" :style="{ background: catColor(tx.category) }" />

    <div class="tx-info">
      <div class="tx-row">
        <span class="tx-cat">{{ tx.category }}</span>
        <span v-if="tx.notes" class="tx-notes">{{ tx.notes }}</span>
      </div>
      <div class="tx-meta">
        <time class="tx-date" :datetime="tx.created_at">{{ timeAgo(tx.created_at) }}</time>
        <span v-if="txSource" class="tx-source" :style="{ color: txSource.color }">
          {{ txSource.name }}
        </span>
      </div>
    </div>

    <div class="tx-amount" :class="tx.type">
      {{ tx.type === 'expense' ? '−' : '+' }}{{ fmt(tx.amount) }}
    </div>

    <div class="tx-actions">
      <button class="action-btn" title="Edit" @click.stop="$emit('edit', tx.id)">
        <SvgIcon :svg="iconEdit" :size="14" />
      </button>
      <button class="action-btn danger" title="Delete" @click.stop="$emit('delete', tx.id)">
        <SvgIcon :svg="iconTrash" :size="14" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed }              from 'vue'
import { storeToRefs }           from 'pinia'
import { useSettingsStore }      from '../stores/settings'
import { useSourcesStore }       from '../stores/sources'
import { catColor, timeAgo }     from '../stores/transactions'
import { iconEdit, iconTrash }   from '../icons'
import SvgIcon                   from './SvgIcon.vue'

const props = defineProps({ tx: { type: Object, required: true } })
defineEmits(['edit', 'delete'])

const { fmt } = storeToRefs(useSettingsStore())

const sourcesStore = useSourcesStore()
const txSource = computed(() =>
  props.tx.source_id
    ? sourcesStore.list.find(s => s.id === props.tx.source_id) ?? null
    : null
)
</script>

<style scoped>
.tx-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 14px;
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
  transition: border-color var(--transition);
  animation: slide-in 0.18s ease;
}
.tx-item:hover        { border-color: var(--border2); }
.tx-item.pending      { opacity: 0.5; }
.tx-item.pending .tx-dot { animation: pulse 1s infinite; }

@keyframes slide-in {
  from { opacity: 0; transform: translateY(-5px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.2; }
}

.tx-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

.tx-info  { flex: 1; min-width: 0; }
.tx-row   { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.tx-cat   { font-size: 0.82rem; font-weight: 500; color: var(--text); }
.tx-notes {
  font-size: 0.72rem;
  color: var(--text2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}
.tx-meta { display: flex; align-items: center; gap: 6px; margin-top: 2px; }
.tx-date { font-size: 0.65rem; color: var(--text2); }
.tx-source {
  font-size: 0.62rem;
  font-weight: 500;
  opacity: 0.85;
}

.tx-amount {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.93rem;
  font-weight: 600;
  flex-shrink: 0;
  letter-spacing: -0.01em;
}
.tx-amount.expense { color: var(--danger); }
.tx-amount.income  { color: var(--success); }

.tx-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;
}
.tx-item:hover .tx-actions { opacity: 1; }

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text2);
  transition: background var(--transition), color var(--transition);
}
.action-btn:hover        { background: var(--surface2); color: var(--text); }
.action-btn.danger:hover { color: var(--danger); background: var(--danger-dim); }

@media (max-width: 640px) {
  .tx-actions { opacity: 1; }
}
</style>
