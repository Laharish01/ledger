import { defineStore } from 'pinia'
import { ref } from 'vue'
import { auth as authApi, getAccountId, isLoggedIn, clearSession } from '../api'

export const useAuthStore = defineStore('auth', () => {
  const accountId  = ref(getAccountId())
  const loggedIn   = ref(isLoggedIn())

  async function create(id) {
    const data = await authApi.create(id)
    accountId.value = data.accountId
    loggedIn.value  = true
    return data
  }

  async function login(id) {
    const data = await authApi.login(id)
    accountId.value = data.accountId
    loggedIn.value  = true
    return data
  }

  function logout() {
    clearSession()
    accountId.value = null
    loggedIn.value  = false
  }

  return { accountId, loggedIn, create, login, logout }
})
