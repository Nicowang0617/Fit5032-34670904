import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getFunctions, httpsCallable } from 'firebase/functions'

import LoginView from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'
import AppointmentForm from '@/components/AppointmentForm.vue'
import AdminView from '@/views/AdminView.vue'
import AdminEmailView from '@/views/AdminEmailView.vue'

const GeoView = () => import('@/views/GeoView.vue')

const routes = [
  { path: '/', redirect: '/login' },

  { path: '/login', name: 'login', component: LoginView, meta: { guestOnly: true } },
  { path: '/register', name: 'register', component: RegisterView, meta: { guestOnly: true } },
 { path: '/admin', name: 'Admin', component: AdminView, meta: { requiresAuth: true, adminOnly: true } },
  { path: '/admin/email', name: 'AdminEmail', component: AdminEmailView, meta: { requiresAuth: true, adminOnly: true } },
  { path: '/appointment', name: 'appointment', component: AppointmentForm, meta: { requiresAuth: true } },

  {
  path: '/rating',
  name: 'rating',
  component: () => import('@/views/RatingView.vue'),
  meta: { requiresAuth: true }, 
},

  { path: '/admin', name: 'admin', component: AdminView, meta: { requiresAuth: true, roles: ['admin'] } },

  { path: '/email', redirect: '/admin' },

  { path: '/geo', name: 'geo', component: GeoView, meta: { requiresAuth: true } },

  { path: '/:pathMatch(.*)*', redirect: '/login' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

async function waitAuthReady(auth) {
  try { auth.init && auth.init() } catch {}
  if (auth.ready) return
  await new Promise((resolve) => {
    const t = setInterval(() => {
      if (auth.ready) { clearInterval(t); resolve() }
    }, 40)
  })
}

async function ensureRemoteAdmin(auth) {
  if (auth.user && auth.user.role === 'admin') return true

  try {
    const fn = httpsCallable(getFunctions(), 'checkUserRole')
    const res = await fn()
    const isAdmin = !!(res && res.data && res.data.isAdmin)
    if (isAdmin) {
      const user = auth.user || {}
      auth.user = { ...user, role: 'admin' } 
    }
    return isAdmin
  } catch (e) {
    console.warn('checkUserRole failed:', e)
    return false
  }
}

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  await waitAuthReady(auth)

  if (typeof auth.ensureAdmin === 'function') {
    try { await auth.ensureAdmin() } catch {}
  }

  if (to.meta && to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'appointment' }
  }

  if (to.meta && to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta && Array.isArray(to.meta.roles) && to.meta.roles.includes('admin')) {

    const ok = await ensureRemoteAdmin(auth)
    if (!ok) return { name: 'appointment' }
  }

  return true
})

export default router
