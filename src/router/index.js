import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import AppointmentForm from '../components/AppointmentForm.vue'
import AdminView from '../views/AdminView.vue' 

const routes = [
  { path: '/', redirect: '/login' },

  { path: '/login', name: 'Login', component: LoginView, meta: { guestOnly: true } },
  { path: '/register', name: 'Register', component: RegisterView, meta: { guestOnly: true } },

  { path: '/appointment', name: 'Appointment', component: AppointmentForm, meta: { requiresAuth: true } },

  { path: '/admin', name: 'Admin', component: AdminView, meta: { requiresAuth: true, roles: ['admin'] } },

  { path: '/:pathMatch(.*)*', redirect: '/login' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() { return { top: 0 } },
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (typeof auth.ensureAdmin === 'function') {
    try { await auth.ensureAdmin() } catch { /* no-op */ }
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  if (to.meta.roles && !to.meta.roles.includes(auth.user?.role)) {
    return { name: 'Appointment' }
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'Appointment' }
  }

})

export default router
