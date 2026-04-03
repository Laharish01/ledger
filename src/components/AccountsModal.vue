<!--
  AccountsModal — manage payment sources (savings, credit, debit, cash, other).
  Each source is stored in D1 and syncs across devices.
-->
<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="overlay" @click.self="close">
        <div class="modal" role="dialog" aria-modal="true" aria-label="Payment sources">

          <div class="modal-header">
            <h2 class="modal-title">Payment sources</h2>
            <button class="close-btn" @click="close"><SvgIcon :svg="iconClose" :size="14" /></button>
          </div>

          <!-- Source list -->
          <div v-if="store.list.length" class="source-list">
            <div v-for="src in store.list" :key="src.id" class="source-row">
              <div class="source-dot" :style="{ background: src.color }" />
              <div class="source-info">
                <span class="source-name">{{ src.name }}</span>
                <span class="source-type">{{ labelOf(src.type) }}</span>
              </div>
              <button class="row-btn" @click="startEdit(src)"><SvgIcon :svg="iconEdit" :size="13" /></button>
              <button class="row-btn danger" @click="confirmRemove(src)"><SvgIcon :svg="iconTrash" :size="13" /></button>
            </div>
          </div>
          <p v-else class="empty-hint">No sources yet. Add one below.</p>

          <!-- Add / edit form -->
          <div class="form-section">
            <div class="form-label">{{ editing ? 'Edit source' : 'Add source' }}</div>
            <div class="form-row">
              <input
                v-model="form.name"
                class="form-input"
                type="text"
                placeholder="e.g. Chase Savings"
                maxlength="32"
              >
              <select v-model="form.type" class="form-select">
                <option v-for="t in SOURCE_TYPES" :key="t.value" :value="t.value">
                  {{ t.emoji }} {{ t.label }}
                </option>
              </select>
            </div>
            <!-- Color picker -->
            <div class="color-row">
              <button
                v-for="c in SOURCE_COLORS"
                :key="c"
                class="color-swatch"
                :class="{ active: form.color === c }"
                :style="{ background: c }"
                @click="form.color = c"
              />
            </div>
            <div class="form-actions">
              <button v-if="editing" class="btn-ghost" @click="cancelEdit">Cancel</button>
              <button class="btn-primary" :disabled="!form.name.trim()" @click="submit">
                {{ editing ? 'Save' : 'Add source' }}
              </button>
            </div>
          </div>

          <!-- Delete confirm -->
          <div v-if="removing" class="delete-confirm">
            <span>Delete <strong>{{ removing.name }}</strong>?</span>
            <div class="confirm-btns">
              <button class="btn-ghost sm" @click="removing = null">Cancel</button>
              <button class="btn-danger sm" @click="doRemove">Delete</button>
            </div>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useSourcesStore, SOURCE_TYPES, SOURCE_COLORS } from '../stores/sources'
import SvgIcon from './SvgIcon.vue'
import { iconClose, iconEdit, iconTrash } from '../icons'

defineProps({ modelValue: { type: Boolean, required: true } })
const emit = defineEmits(['update:modelValue'])

const store   = useSourcesStore()
const editing = ref(null)   // source id being edited, or null
const removing = ref(null)  // source being deleted

const form = reactive({ name: '', type: 'savings', color: SOURCE_COLORS[0] })

function labelOf(type) {
  return SOURCE_TYPES.find(t => t.value === type)?.label ?? type
}

function close() { emit('update:modelValue', false); cancelEdit() }

function startEdit(src) {
  editing.value = src.id
  form.name  = src.name
  form.type  = src.type
  form.color = src.color
}

function cancelEdit() {
  editing.value = null
  form.name  = ''
  form.type  = 'savings'
  form.color = SOURCE_COLORS[0]
}

async function submit() {
  if (!form.name.trim()) return
  const payload = { name: form.name.trim(), type: form.type, color: form.color }
  if (editing.value) {
    await store.update(editing.value, payload)
    cancelEdit()
  } else {
    await store.add(payload)
    form.name = ''
  }
}

function confirmRemove(src) { removing.value = src }

async function doRemove() {
  await store.remove(removing.value.id)
  removing.value = null
}
</script>

<style scoped>
.overlay {
  position: fixed; inset: 0; z-index: 500;
  display: flex; align-items: flex-end; justify-content: center;
  background: var(--overlay); backdrop-filter: blur(6px);
}
@media (min-width: 640px) { .overlay { align-items: center; padding: 20px; } }

.modal {
  box-sizing: border-box;
  width: min(100svw, 100%); max-width: 100svw;
  max-height: 92svh; overflow-y: auto;
  display: flex; flex-direction: column; gap: 16px;
  padding: 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 20px 20px 0 0;
}
@media (min-width: 640px) {
  .modal { width: min(460px, 100svw); max-height: 90svh; padding: 24px; border-radius: 18px; }
}

.modal-header { display: flex; align-items: center; justify-content: space-between; }
.modal-title { font-family: 'Space Grotesk', sans-serif; font-size: 1rem; font-weight: 600; }
.close-btn {
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--surface2); border: none; color: var(--text2); cursor: pointer;
}
.close-btn:hover { color: var(--text); }

/* Source list */
.source-list { display: flex; flex-direction: column; gap: 6px; }
.source-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px;
  background: var(--surface2); border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}
.source-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.source-info { flex: 1; min-width: 0; }
.source-name { font-size: 0.82rem; font-weight: 500; color: var(--text); display: block; }
.source-type { font-size: 0.65rem; color: var(--text2); text-transform: uppercase; letter-spacing: 0.06em; }
.row-btn {
  display: flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 6px;
  background: none; border: none; cursor: pointer; color: var(--text2);
  transition: color var(--transition), background var(--transition);
}
.row-btn:hover { background: var(--surface); color: var(--text); }
.row-btn.danger:hover { color: var(--danger); }

.empty-hint { font-size: 0.78rem; color: var(--text2); text-align: center; padding: 8px 0; }

/* Form */
.form-section { display: flex; flex-direction: column; gap: 10px; }
.form-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text2); }
.form-row { display: flex; gap: 8px; }
.form-input {
  flex: 1; min-width: 0; box-sizing: border-box;
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: var(--radius-sm); padding: 9px 12px;
  color: var(--text); font-family: 'Inter', sans-serif; font-size: 16px; outline: none;
  transition: border-color var(--transition);
}
.form-input:focus { border-color: var(--accent); }
.form-select {
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: var(--radius-sm); padding: 9px 10px;
  color: var(--text); font-family: 'Inter', sans-serif; font-size: 16px;
  outline: none; appearance: none; -webkit-appearance: none; cursor: pointer;
  transition: border-color var(--transition);
}
.form-select:focus { border-color: var(--accent); }

.color-row { display: flex; gap: 8px; flex-wrap: wrap; }
.color-swatch {
  width: 22px; height: 22px; border-radius: 50%; border: 2px solid transparent;
  cursor: pointer; transition: transform 0.15s, border-color 0.15s;
}
.color-swatch:hover  { transform: scale(1.15); }
.color-swatch.active { border-color: var(--text); transform: scale(1.15); }

.form-actions { display: flex; gap: 8px; }
.btn-ghost {
  flex: 1; padding: 10px; background: var(--surface2); border: none;
  border-radius: var(--radius-sm); font-family: 'Inter', sans-serif;
  font-size: 0.82rem; color: var(--text2); cursor: pointer; transition: color var(--transition);
}
.btn-ghost:hover { color: var(--text); }
.btn-primary {
  flex: 2; padding: 10px; background: var(--accent); border: none;
  border-radius: var(--radius-sm); font-family: 'Inter', sans-serif;
  font-size: 0.82rem; font-weight: 600; color: var(--accent-text);
  cursor: pointer; transition: opacity var(--transition);
}
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-primary:hover:not(:disabled) { opacity: 0.88; }

/* Delete confirm */
.delete-confirm {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 14px; background: var(--danger-dim);
  border: 1px solid var(--danger); border-radius: var(--radius-sm);
  font-size: 0.8rem; color: var(--text);
}
.confirm-btns { display: flex; gap: 6px; flex-shrink: 0; }
.btn-danger {
  padding: 6px 12px; background: var(--danger); border: none;
  border-radius: 6px; color: #fff; font-size: 0.75rem;
  font-weight: 600; cursor: pointer;
}
.sm { padding: 6px 12px; font-size: 0.75rem; }

.modal-enter-active, .modal-leave-active { transition: all 0.22s ease; }
.modal-enter-from .modal, .modal-leave-to .modal { transform: translateY(40px); opacity: 0; }
</style>
