<template>
  <div>
    <div class="grid-bg"></div>

    <NavBar
      :account-id="auth.accountId"
      @logout="logout"
      @open-settings="showSettings = true"
    />

    <main>
      <TransactionInput @submit="handleAdd" />

      <StatsGrid :stats="txStore.dbStats" />

      <PeriodFilter :active-period="txStore.activePeriod" @change="handlePeriodChange" />

      <TransactionList
        :tx-list="txStore.txList"
        :has-more="txStore.hasMore"
        @edit="openEdit"
        @delete="openDelete"
        @load-more="txStore.loadMore()"
      />
    </main>

    <EditModal
      v-model="showEdit"
      :transaction="editingTx"
      @save="handleEditSave"
    />

    <SettingsModal
      v-model="showSettings"
      @saved="showToast({ msg: 'Settings saved', type: 'success' })"
      @toast="showToast"
      @import-done="onImportDone"
    />
    <DeleteModal v-model="showDelete" :transaction="deleteId"></DeleteModal>

    <Toast ref="toast" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'
import { useTransactionStore, parseInput } from '../stores/transactions'

import NavBar           from '../components/NavBar.vue'
import TransactionInput from '../components/TransactionInput.vue'
import StatsGrid        from '../components/StatsGrid.vue'
import PeriodFilter     from '../components/PeriodFilter.vue'
import TransactionList  from '../components/TransactionList.vue'
import EditModal        from '../components/EditModal.vue'
import SettingsModal    from '../components/SettingsModal.vue'
import Toast            from '../components/Toast.vue'

const router   = useRouter()
const auth     = useAuthStore()
const settings = useSettingsStore()
const txStore  = useTransactionStore()

const toast        = ref(null)
const showEdit     = ref(false)
const showSettings = ref(false)
const editingId   = ref(null)
const deleteId = ref(null)
const showDelete = ref(false)

const editingTx = computed(() => txStore.txList.find(t => t.id == editingId.value) || null)

function showToast({ msg, type }) { toast.value?.show(msg, type) }

function logout() {
  auth.logout()
  router.push('/login')
}

async function handleAdd(raw) {
  let parsed
  try { parsed = parseInput(raw) }
  catch (e) { return showToast({ msg: e.message, type: 'error' }) }
  try {
    const data = await txStore.add(parsed)
    showToast({ msg: `Added: ${data.category} ${settings.fmt(data.amount)}`, type: 'success' })
    txStore.loadStats()
  } catch {
    showToast({ msg: 'Failed to save — rolled back', type: 'error' })
  }
}

function openEdit(id) {
  editingId.value = id
  showEdit.value  = true
}

function openDelete(id) {
  showDelete.value = true;
  deleteId.value = id;
}

async function handleEditSave(updates) {
  try {
    await txStore.update(editingId.value, updates)
    showToast({ msg: 'Transaction updated', type: 'success' })
  } catch {
    showToast({ msg: 'Update failed — rolled back', type: 'error' })
  }
}

async function handleDelete(id) {
  try {
    await txStore.remove(id)
    showToast({ msg: 'Deleted', type: 'success' })
    txStore.loadStats()
  } catch {
    showToast({ msg: 'Delete failed — rolled back', type: 'error' })
  }
}

function handlePeriodChange({ period, from, to }) {
  txStore.setPeriod(period, from, to)
}

function onImportDone() {
  txStore.load(true)
  txStore.loadStats()
}

onMounted(async () => {
  await settings.load()
  await Promise.all([txStore.load(true), txStore.loadStats()])
})
</script>

<style scoped>
main {
  max-width: 760px; margin: 0 auto;
  padding: 40px 20px 100px; /* extra bottom padding for mobile tab bar */
  position: relative; z-index: 1;
}

@media (max-width: 640px) {
  main { padding: 24px 14px 100px; }
}
</style>
