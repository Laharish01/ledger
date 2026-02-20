import { createRouter, createWebHistory } from 'vue-router'
import { isLoggedIn } from '../api'

const routes = [
  {
    path: '/',
    redirect: () => isLoggedIn() ? '/app' : '/login',
  },
  {
    path: '/login',
    component: () => import('../views/LoginView.vue'),
    meta: { guest: true },
  },
  {
    path: '/app',
    component: () => import('../views/AppView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/analytics',
    component: () => import('../views/AnalyticsView.vue'),
    meta: { requiresAuth: true },
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory('/ledger/'),
  routes,
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !isLoggedIn()) return '/login'
  if (to.meta.guest && isLoggedIn())         return '/app'
})

export default router
