// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

import LoginView from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'
import AppointmentForm from '@/components/AppointmentForm.vue'
import AdminView from '@/views/AdminView.vue'

const routes = [
  // default → login
  { path: '/', redirect: '/login' },

  // public (guest only)
  { path: '/login', name: 'login', component: LoginView, meta: { guestOnly: true } },
  { path: '/register', name: 'register', component: RegisterView, meta: { guestOnly: true } },

  // authed pages
  { path: '/appointment', name: 'appointment', component: AppointmentForm, meta: { requiresAuth: true } },
  { path: '/admin', name: 'admin', component: AdminView, meta: { requiresAuth: true, roles: ['admin'] } },

  // legacy deep links: /email now lives inside Admin
  { path: '/email', redirect: '/admin' },

  // 404 → login
  { path: '/:pathMatch(.*)*', redirect: '/login' },

  { path: '/geo', name: 'geo', component: () => import('@/views/GeoView.vue') }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // Ensure the auth store is initialized before checking state
  try {
    auth.init?.()
  } catch {/* no-op */}
  if (!auth.ready) {
    await new Promise((resolve) => {
      const t = setInterval(() => {
        if (auth.ready) { clearInterval(t); resolve() }
      }, 40)
    })
  }

  // Seed an admin account on first run (your store provides this)
  if (typeof auth.ensureAdmin === 'function') {
    try { await auth.ensureAdmin() } catch {/* no-op */}
  }

  // Route guards
  if (to.meta?.requiresAuth && !auth.isAuthenticated) {
    // preserve intended target
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta?.roles && !to.meta.roles.includes(auth.user?.role)) {
    // lacks required role → send to a safe authed page
    return { name: 'appointment' }
  }

  if (to.meta?.guestOnly && auth.isAuthenticated) {
    // already logged in → send to a meaningful page
    return { name: 'appointment' }
  }

  return true
})

export default router
