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

const props = defineProps({ modelValue: Boolean })
const emit  = defineEmits(['update:modelValue', 'saved'])

const settingsStore = useSettingsStore()
const selected = ref(settingsStore.currency)

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

.field { margin-bottom: 14px; }
.field label { display: block; font-size: 0.68rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin-bottom: 5px; }
.field select {
  width: 100%; background: var(--bg); border: 1px solid var(--border);
  border-radius: 8px; padding: 10px 12px; color: var(--text);
  font-family: 'Roboto', sans-serif; font-size: 16px;
  outline: none; transition: border-color 0.2s; appearance: none;
}
.field select:focus { border-color: var(--accent); }

.modal-actions { display: flex; gap: 10px; margin-top: 20px; }
.modal-btn {
  flex: 1; padding: 11px; border-radius: 8px; border: none;
  font-family: 'Roboto', sans-serif; font-size: 0.8rem;
  letter-spacing: 0.05em; text-transform: uppercase; cursor: pointer;
  transition: all 0.2s; font-weight: 500;
}
.modal-btn.primary   { background: var(--accent); color: var(--accent-text); }
.modal-btn.primary:hover { opacity: 0.9; }
.modal-btn.secondary { background: var(--border); color: var(--muted); }
.modal-btn.secondary:hover { color: var(--text); }
</style>
