<template>
  <div>
    <div class="tx-list">
      <div v-if="!txList.length" class="empty-state">
        <div class="big">💸</div>
        <p>No transactions yet. Add one above!</p>
      </div>

      <div
        v-for="tx in txList"
        :key="tx.id"
        class="tx-item"
        :class="{ pending: tx._pending }"
      >
        <div class="tx-dot" :style="{ background: catColor(tx.category) }"></div>
        <div class="tx-info">
          <div class="tx-top">
            <span class="tx-category">{{ tx.category }}</span>
            <span v-if="tx.notes" class="tx-notes">{{ tx.notes }}</span>
          </div>
          <div class="tx-date">{{ timeAgo(tx.created_at) }}</div>
        </div>
        <div class="tx-amount" :class="tx.type">
          {{ tx.type === 'expense' ? '-' : '+' }}{{ fmt(tx.amount) }}
        </div>
        <div class="tx-actions">
          <button class="tx-btn edit" @click="$emit('edit', tx.id)" title="Edit">✎</button>
          <button class="tx-btn del"  @click="$emit('delete', tx.id)" title="Delete">✕</button>
        </div>
      </div>
    </div>

    <button v-if="hasMore" class="load-more" @click="$emit('load-more')">Load more</button>
  </div>
</template>

<script setup>
import { useSettingsStore } from '../stores/settings'
import { catColor, timeAgo } from '../stores/transactions'
import { storeToRefs } from 'pinia'

defineProps({
  txList:  { type: Array,   required: true },
  hasMore: { type: Boolean, default: false },
})
defineEmits(['edit', 'delete', 'load-more'])

const { fmt } = storeToRefs(useSettingsStore())
</script>

<style scoped>
.tx-list { display: flex; flex-direction: column; gap: 8px; }

.tx-item {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 10px; padding: 14px 16px;
  display: flex; align-items: center; gap: 14px;
  animation: slideIn 0.3s ease forwards;
  transition: border-color 0.2s, background 0.3s;
}
.tx-item:hover { border-color: var(--hover-border); }
.tx-item.pending { opacity: 0.55; }
.tx-item.pending .tx-dot { animation: pulse 1s infinite; }

@keyframes slideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pulse   { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }

.tx-dot    { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.tx-info   { flex: 1; min-width: 0; }
.tx-top    { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.tx-category { font-size: 0.8rem; font-weight: 500; }
.tx-notes  { font-size: 0.75rem; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
.tx-date   { font-size: 0.65rem; color: var(--muted); margin-top: 2px; }

.tx-amount { font-family: 'Roboto Slab', serif; font-size: 1.1rem; flex-shrink: 0; }
.tx-amount.expense { color: var(--danger); }
.tx-amount.income  { color: var(--success); }

.tx-actions { display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s; flex-shrink: 0; }
.tx-item:hover .tx-actions { opacity: 1; }
.tx-btn {
  background: none; border: none; cursor: pointer;
  font-size: 0.75rem; padding: 5px 7px; border-radius: 5px;
  color: var(--muted); transition: all 0.15s;
}
.tx-btn:hover       { background: var(--border); }
.tx-btn.del:hover   { color: var(--danger); }
.tx-btn.edit:hover  { color: var(--accent); }

.empty-state { text-align: center; padding: 60px 20px; color: var(--muted); }
.empty-state .big { font-size: 3rem; margin-bottom: 12px; }
.empty-state p    { font-size: 0.8rem; }

.load-more {
  display: block; width: 100%; margin-top: 12px; padding: 10px;
  background: none; border: 1px dashed var(--border); border-radius: 8px;
  color: var(--muted); font-family: 'Roboto', sans-serif;
  font-size: 0.75rem; cursor: pointer; transition: all 0.2s;
}
.load-more:hover { border-color: var(--accent); color: var(--accent); }

@media (max-width: 600px) { .tx-actions { opacity: 1; } }
</style>
