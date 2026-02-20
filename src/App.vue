<template>
  <div :data-theme="theme">
    <RouterView />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { RouterView } from 'vue-router'

const theme = ref('dark')

function applyTheme(t) {
  theme.value = t
  document.documentElement.setAttribute('data-theme', t)
  localStorage.setItem('theme', t)
}

onMounted(() => {
  const saved = localStorage.getItem('theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  applyTheme(saved || (prefersDark ? 'dark' : 'light'))
})

// Expose globally for NavBar toggle
window.__ledgerTheme = { get: () => theme.value, set: applyTheme }
</script>
