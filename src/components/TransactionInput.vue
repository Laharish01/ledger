<!--
  TransactionInput — freeform entry bar.
  Format: "<amount> <category> [notes…]"  Negative = income.
  When the typed amount is negative, a source picker appears above the bar.
  Emits: submit({ raw, sourceId })
-->
<template>
  <div class="tx-input-root">

    <!-- Source picker — only shown when amount looks like income -->
    <Transition name="slide-down">
      <div v-if="isIncome && sources.list.length" class="source-picker">
        <span class="source-label">Source</span>
        <div class="source-chips">
          <button
            v-for="src in sources.list"
            :key="src.id"
            class="source-chip"
            :class="{ active: selectedSourceId === src.id }"
            :style="selectedSourceId === src.id ? { borderColor: src.color, color: src.color } : {}"
            @click="selectedSourceId = selectedSourceId === src.id ? null : src.id"
          >
            <span class="chip-dot" :style="{ background: src.color }" />
            {{ src.name }}
          </button>
        </div>
      </div>
    </Transition>

    <!-- Input row -->
    <div class="input-wrap" :class="{ focused }">
      <input
        ref="inputEl"
        v-model="value"
        class="tx-input"
        type="text"
        placeholder="50 Food Lunch…  or  -200 Salary"
        autocomplete="off"
        @keydown.enter="submit"
        @focus="focused = true"
        @blur="focused = false"
      >
      <button class="submit-btn" title="Add transaction" @click="submit">
        <SvgIcon :svg="iconEnter" :size="16" />
      </button>
    </div>

    <p class="input-hint">
      <span class="hl">Amount</span>&nbsp;Category&nbsp;
      <span class="dim">Notes</span>&nbsp;·&nbsp;use&nbsp;<span class="hl">-50</span>&nbsp;for income
    </p>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import SvgIcon           from './SvgIcon.vue'
import { iconEnter }     from '../icons'
import { useSourcesStore } from '../stores/sources'

const emit    = defineEmits(['submit'])
const sources = useSourcesStore()

const value            = ref('')
const inputEl          = ref(null)
const focused          = ref(false)
const selectedSourceId = ref(null)

/** True when the first token in the input is a negative number. */
const isIncome = computed(() => {
  const first = value.value.trim().split(/\s+/)[0]
  return first.startsWith('-') && !isNaN(parseFloat(first))
})

function submit() {
  const trimmed = value.value.trim()
  if (!trimmed) return
  emit('submit', { raw: trimmed, sourceId: isIncome.value ? selectedSourceId.value : null })
  value.value            = ''
  selectedSourceId.value = null
  inputEl.value?.focus()
}
</script>

<style scoped>
.tx-input-root { display: flex; flex-direction: column; gap: 5px; }

/* Source picker */
.source-picker {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 4px 2px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.source-label {
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text2);
  flex-shrink: 0;
}
.source-chips { display: flex; gap: 6px; }
.source-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-family: 'Inter', sans-serif;
  font-size: 0.72rem;
  color: var(--text2);
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.15s, color 0.15s;
  flex-shrink: 0;
}
.source-chip:hover { border-color: var(--border2); color: var(--text); }
.chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Input wrap */
.input-wrap {
  display: flex;
  align-items: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  transition: border-color var(--transition);
}
.input-wrap.focused { border-color: var(--accent); }

.tx-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  padding: 13px 16px;
  color: var(--text);
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
  caret-color: var(--accent);
}
.tx-input::placeholder { color: var(--text2); }

.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  min-height: 48px;
  background: var(--accent);
  border: none;
  color: var(--accent-text);
  cursor: pointer;
  transition: opacity var(--transition);
  flex-shrink: 0;
}
.submit-btn:hover { opacity: 0.85; }

.input-hint {
  font-size: 0.67rem;
  color: var(--text2);
  padding: 0 2px;
}
.input-hint .hl  { color: var(--accent); }
.input-hint .dim { color: var(--text2); opacity: 0.7; }

/* Transition */
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.18s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
