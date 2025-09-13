<template>
  <section class="page">
    <div class="card">
      <h3>Login</h3>

      <p v-if="showRegisteredMsg" class="success">Account created. Please login.</p>

      <label class="label">Email</label>
      <input
        class="input"
        v-model.trim="email"
        placeholder="you@example.com"
        @keydown.enter.prevent="onLogin"
      />
      <div v-if="emailTouched && !emailRe.test(email)" class="error small">Invalid email format</div>

      <label class="label">Password</label>
      <input
        class="input"
        type="password"
        v-model="password"
        placeholder="Your password"
        @keydown.enter.prevent="onLogin"
      />

      <div class="actions">
        <button class="btn" @click="onLogin" :disabled="pending">Login</button>
        <router-link to="/register" class="btn ghost">Create account</router-link>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const email = ref('')
const password = ref('')
const error = ref('')
const pending = ref(false)
const emailTouched = ref(false)
const showRegisteredMsg = ref(false)
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

onMounted(async () => {
  if (typeof auth.ensureAdmin === 'function') {
    try { await auth.ensureAdmin() } catch {}
  }
  if (route.query.registered === '1') showRegisteredMsg.value = true
  if (route.query.email) email.value = String(route.query.email)
})

async function onLogin() {
  error.value = ''
  emailTouched.value = true
  if (!emailRe.test(email.value)) {
    error.value = 'Please enter a valid email'
    return
  }
  if (!password.value) {
    error.value = 'Please enter password'
    return
  }

  pending.value = true
  try {
    await auth.login({ email: email.value, password: password.value })
    if (auth.user?.role === 'admin') {
      router.push('/admin')
    } else {
      const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/appointment'
      router.push(redirect)
    }
  } catch (e) {
    error.value = e?.message || 'Login failed'
  } finally {
    pending.value = false
  }
}
</script>

<style scoped>
.page { min-height: calc(100vh - 56px); display:flex; align-items:center; justify-content:center; background:#f5f7fb; padding:24px; }
.card { width:100%; max-width:420px; background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:18px; box-shadow:0 10px 30px rgba(0,0,0,.06); }
.label { display:block; margin:10px 0 6px; font-weight:600; }
.input { width:100%; padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; }
.actions { display:flex; gap:10px; margin-top:14px; }
.btn { padding:10px 14px; border-radius:8px; border:1px solid #cbd5e1; background:#2563eb; color:#fff; cursor:pointer; text-decoration:none; }
.btn.ghost { background:#fff; color:#111827; }
.error { color:#dc2626; margin-top:10px; }
.small { font-size: 12px; margin-top: 6px; }
.success { color:#16a34a; margin:7px 0; }
</style>
