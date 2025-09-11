<template>
  <section class="page">
    <div class="card">
      <h3>Create Account</h3>

      <label class="label">Name</label>
      <input class="input" v-model.trim="name" placeholder="Your name" />

      <label class="label">Email</label>
      <input class="input" v-model.trim="email" placeholder="you@example.com" />

      <label class="label">Password</label>
      <input class="input" type="password" v-model="password" placeholder="≥8 letters & digits" />

      <label class="label">Confirm</label>
      <input class="input" type="password" v-model="confirm" placeholder="Repeat password" />

      <div class="actions">
        <button class="btn" @click="onRegister" :disabled="pending">Register</button>
        <router-link to="/login" class="btn ghost">Back to login</router-link>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const name = ref('')
const email = ref('')
const password = ref('')
const confirm = ref('')
const error = ref('')
const pending = ref(false)
const auth = useAuthStore()
const router = useRouter()

async function onRegister(){
  error.value = ''
  if (password.value !== confirm.value) {
    error.value = 'Passwords do not match'
    return
  }
  pending.value = true
  try {
    await auth.register({ name: name.value, email: email.value, password: password.value })
    router.push({ name: 'Login', query: { registered: '1', email: email.value } })
  } catch (e) {
    error.value = e.message || 'Registration failed'
  } finally {
    pending.value = false
  }
}
</script>

<style scoped>
.page { min-height: calc(100vh - 56px); display:flex; align-items:center; justify-content:center; background:#f5f7fb; padding:24px; }
.card { width:100%; max-width:520px; background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:18px; box-shadow:0 10px 30px rgba(0,0,0,.06); }
.label { display:block; margin:10px 0 6px; font-weight:600; }
.input { width:100%; padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; }
.actions { display:flex; gap:10px; margin-top:14px; }
.btn { padding:10px 14px; border-radius:8px; border:1px solid #cbd5e1; background:#2563eb; color:#fff; cursor:pointer; text-decoration:none; }
.btn.ghost { background:#fff; color:#111827; }
.error { color:#dc2626; margin-top:10px; }
</style>
