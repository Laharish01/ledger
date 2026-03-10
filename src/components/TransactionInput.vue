<!--
  TransactionInput — freeform entry bar at the bottom of the Home tab.
  Format: "<amount> <category> [notes…]"
  Negative amount = income.
  Emits: submit(rawString)
-->
<template>
  <div class="input-wrap" :class="{ focused }">
    <input
      ref="inputEl"
      v-model="value"
      class="tx-input"
      type="text"
      placeholder="50 Food Lunch at the café…"
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
    <span class="dim">Notes (optional)</span>
    &nbsp;·&nbsp;use&nbsp;<span class="hl">-50</span>&nbsp;for income
  </p>
</template>

<script setup>
import { ref } from 'vue'
import SvgIcon from './SvgIcon.vue'
import { iconEnter } from '../icons'

const emit    = defineEmits(['submit'])
const value   = ref('')
const inputEl = ref(null)
const focused = ref(false)

function submit() {
  const trimmed = value.value.trim()
  if (!trimmed) return
  emit('submit', trimmed)
  value.value = ''
  inputEl.value?.focus()
}
</script>

<style scoped>
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
  margin-top: 5px;
}
.input-hint .hl  { color: var(--accent); }
.input-hint .dim { color: var(--text2); opacity: 0.7; }
</style>
