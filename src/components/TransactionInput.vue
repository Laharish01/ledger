<template>
  <div class="input-section">
    <div class="input-label">New Transaction</div>
    <div class="input-wrapper">
      <input
        ref="inputEl"
        class="main-input"
        v-model="value"
        type="text"
        placeholder="50 Food Lunch at the cafe..."
        autocomplete="off"
        @keydown.enter="submit"
      >
      <button class="submit-btn" @click="submit" title="Add (Enter)">↵</button>
    </div>
    <div class="input-hint">
      Format: <span>&lt;Amount&gt; &lt;Category&gt; &lt;Notes&gt;</span> —
      Use <span>-50</span> for income · Press <span>Enter</span> to save
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit  = defineEmits(['submit'])
const value = ref('')
const inputEl = ref(null)

function submit() {
  const v = value.value.trim()
  if (!v) return
  emit('submit', v)
  value.value = ''
  inputEl.value?.focus()
}
</script>

<style scoped>
.input-section { margin-bottom: 40px; }
.input-label   { font-size: 0.7rem; letter-spacing: 0.15em; text-transform: uppercase; color: var(--muted); margin-bottom: 12px; }
.input-wrapper { position: relative; }

.main-input {
  width: 100%; background: var(--surface); border: 1px solid var(--border);
  border-radius: 12px; padding: 20px 60px 20px 20px; color: var(--text);
  font-family: 'Roboto', sans-serif; font-size: 1.1rem;
  outline: none; transition: all 0.3s; caret-color: var(--accent);
}
.main-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(200,245,96,0.08); }
.main-input::placeholder { color: var(--muted); font-size: 0.9rem; }

.submit-btn {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  width: 36px; height: 36px; background: var(--accent); border: none;
  border-radius: 8px; cursor: pointer; display: flex; align-items: center;
  justify-content: center; transition: all 0.2s; color: var(--accent-text); font-size: 1rem;
}
.submit-btn:hover { transform: translateY(-50%) scale(1.05); }

.input-hint { font-size: 0.7rem; color: var(--muted); margin-top: 8px; }
.input-hint span { color: var(--accent); }

@media (max-width: 600px) { .main-input { font-size: 16px; } }
</style>
