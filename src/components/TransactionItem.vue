<!--
  TransactionItem — one row in the transaction list.
  - Click edit/delete buttons to act.
  - Long-press (500ms) anywhere on the row to open edit.
  Emits: edit(id), delete(id)
-->
<template>
  <div
    class="tx-item"
    :class="{ pending: tx._pending, pressing }"
    @mousedown="startPress"
    @touchstart.passive="startPress"
    @mouseup="cancelPress"
    @mouseleave="cancelPress"
    @touchend="cancelPress"
    @touchcancel="cancelPress"
    @contextmenu.prevent="onLongPress"
  >
    <!-- Category colour dot -->
    <div class="tx-dot" :style="{ background: catColor(tx.category) }" />

    <!-- Info -->
    <div class="tx-info">
      <div class="tx-row">
        <span class="tx-cat">{{ tx.category }}</span>
        <span v-if="tx.notes" class="tx-notes">{{ tx.notes }}</span>
      </div>
      <time class="tx-date" :datetime="tx.created_at">{{ timeAgo(tx.created_at) }}</time>
    </div>

    <!-- Amount -->
    <div class="tx-amount" :class="tx.type">
      {{ tx.type === 'expense' ? '−' : '+' }}{{ fmt(tx.amount) }}
    </div>

    <!-- Action buttons (hover on desktop, always on mobile) -->
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
import { ref }                         from 'vue'
import { storeToRefs }                 from 'pinia'
import { useSettingsStore }            from '../stores/settings'
import { catColor, timeAgo }           from '../stores/transactions'
import { iconEdit, iconTrash }         from '../icons'
import SvgIcon                         from './SvgIcon.vue'

// ── Props / emits ────────────────────────────────────────────────────────────

const props = defineProps({ tx: { type: Object, required: true } })
const emit  = defineEmits(['edit', 'delete'])

const { fmt } = storeToRefs(useSettingsStore())

// ── Long-press ───────────────────────────────────────────────────────────────

const LONG_PRESS_MS = 500
const pressing = ref(false)
let pressTimer  = null

function startPress() {
  pressing.value = true
  pressTimer = setTimeout(onLongPress, LONG_PRESS_MS)
}

function cancelPress() {
  pressing.value = false
  clearTimeout(pressTimer)
}

function onLongPress() {
  pressing.value = false
  emit('edit', props.tx.id)
}
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
  transition: border-color var(--transition), background var(--transition), transform 0.1s;
  animation: slide-in 0.18s ease;
}

.tx-item:hover   { border-color: var(--border2); }
.tx-item.pressing { transform: scale(0.985); background: var(--surface2); }
.tx-item.pending  { opacity: 0.5; }
.tx-item.pending .tx-dot { animation: pulse 1s infinite; }

@keyframes slide-in {
  from { opacity: 0; transform: translateY(-5px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.2; }
}

.tx-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

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
.tx-date {
  display: block;
  font-size: 0.65rem;
  color: var(--text2);
  margin-top: 2px;
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

/* Action buttons */
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

/* Always show action buttons on touch devices */
@media (max-width: 640px) {
  .tx-actions { opacity: 1; }
}
</style>
