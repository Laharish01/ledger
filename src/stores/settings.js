import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { settings as settingsApi } from '../api'

export const useSettingsStore = defineStore('settings', () => {
  const currency = ref('INR')

  const fmt = computed(() => (n) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.value,
      maximumFractionDigits: ['JPY', 'KRW'].includes(currency.value) ? 0 : 2,
    }).format(n || 0)
  )

  async function load() {
    try {
      const data = await settingsApi.get()
      if (data?.currency) currency.value = data.currency
    } catch {}
  }

  async function save(newCurrency) {
    const prev = currency.value
    currency.value = newCurrency              // optimistic
    try {
      await settingsApi.update({ currency: newCurrency })
    } catch {
      currency.value = prev                   // rollback
      throw new Error('Failed to save settings')
    }
  }

  return { currency, fmt, load, save }
})
