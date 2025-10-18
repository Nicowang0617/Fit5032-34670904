import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getFunctions, httpsCallable } from 'firebase/functions'

import LoginView from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'
import AppointmentForm from '@/components/AppointmentForm.vue'
import AdminView from '@/views/AdminView.vue'
import AdminEmailView from '@/views/AdminEmailView.vue' 

const GeoView = () => import('@/views/GeoView.vue')
const RatingView = () => import('@/views/RatingView.vue')

const routes = [
  { path: '/', redirect: '/login' },

  { path: '/login',    name: 'login',    component: LoginView,    meta: { guestOnly: true } },
  { path: '/register', name: 'register', component: RegisterView, meta: { guestOnly: true } },

  { path: '/appointment', name: 'appointment', component: AppointmentForm, meta: { requiresAuth: true } },

  { path: '/admin',        name: 'Admin',      component: AdminView,      meta: { requiresAuth: true, adminOnly: true } },
  { path: '/admin/email',  name: 'AdminEmail', component: AdminEmailView, meta: { requiresAuth: true, adminOnly: true } },

  { path: '/rating', name: 'rating', component: RatingView, meta: { requiresAuth: true } },
  { path: '/geo',    name: 'geo',    component: GeoView,   meta: { requiresAuth: true } },
  { path: '/map', redirect: { name: 'geo' } },

  // 兼容旧链接
  { path: '/email', redirect: '/admin' },

  // 兜底
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
    const t = setInterval(() => { if (auth.ready) { clearInterval(t); resolve() } }, 40)
  })
}

// 远端校验是否 admin（优先 isAdmin，兜底 checkUserRole）
async function ensureRemoteAdmin(auth) {
  if (auth.user && auth.user.role === 'admin') return true

  const functions = getFunctions(undefined, 'us-central1') // 指定 region
  const call = async (name) => {
    const fn = httpsCallable(functions, name)
    const res = await fn()
    return !!(res && res.data && (res.data.isAdmin === true || res.data.admin === true))
  }

  try {
    let ok = false
    try { ok = await call('isAdmin') } catch {}
    if (!ok) ok = await call('checkUserRole')

    if (ok) {
      auth.user = { ...(auth.user || {}), role: 'admin' }
      return true
    }
    return false
  } catch (e) {
    console.warn('admin check failed:', e)
    return false
  }
}

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await waitAuthReady(auth)

  // 可选：同步本地 admin 状态
  if (typeof auth.ensureAdmin === 'function') {
    try { await auth.ensureAdmin() } catch {}
  }

  // 已登录者禁止进入 login/register
  if (to.meta?.guestOnly && auth.isAuthenticated) {
    return { name: 'appointment' }
  }

  // 需要登录但当前未登录
  if (to.meta?.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  const needAdmin = to.meta?.adminOnly ||
    (Array.isArray(to.meta?.roles) && to.meta.roles.includes('admin'))

  if (needAdmin) {
    const ok = await ensureRemoteAdmin(auth)
    if (!ok) return { name: 'appointment' }
  }

  return true
})

export default router
