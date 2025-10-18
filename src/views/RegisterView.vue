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
        <button class="btn" @click="onRegister" :disabled="pending"> 
          {{ pending ? 'Creating…' : 'Register' }}
        </button>
        <router-link to="/login" class="btn ghost">Back to login</router-link>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="pending" class="muted">Creating your account…</p>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getAuth, createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth'
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore'

const name = ref('')
const email = ref('')
const password = ref('')
const confirm = ref('')
const error = ref('')
const pending = ref(false)
const router = useRouter()
const db = getFirestore()

const nameOk  = (v) => /^[A-Za-z\s.'-]+$/.test(v) && !/\d/.test(v)
const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
const pwdOk   = (v) => v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v)

async function onRegister () {
  if (pending.value) return
  error.value = ''

  if (!nameOk(name.value))        return (error.value = 'Please enter a valid name (no digits).')
  if (!emailOk(email.value))      return (error.value = 'Please enter a valid email address.')
  if (!pwdOk(password.value))     return (error.value = 'Password must be ≥8 characters and include letters & digits.')
  if (password.value !== confirm.value) return (error.value = 'Passwords do not match.')

  pending.value = true
  try {
    const auth = getAuth()
    const em = email.value.trim().toLowerCase()

    const cred = await createUserWithEmailAndPassword(auth, em, password.value)

    try { await updateProfile(cred.user, { displayName: name.value.trim() }) } catch {}

    await setDoc(doc(db, 'profiles', cred.user.uid), {
      uid: cred.user.uid,
      name: name.value.trim(),
      email: em,
      role: 'user',
      createdAt: serverTimestamp(),
    })

    await signOut(auth)

    router.push({ name: 'login', query: { registered: '1', email: em } })
  } catch (e) {
    error.value = e?.message || 'Registration failed.'
  } finally {
    pending.value = false
  }
}
</script>

<style scoped>
.page { min-height: calc(100vh - 56px); display:flex; align-items:center; justify-content:center; background:#f5f7fb; padding:24px; }
.card { width:100%; max-width:520px; background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:18px; box-shadow:0 10px 30px rgba(0,0,0,.06); }
.label { display:block; margin:10px 0 6px; font-weight:600; }
.input { width:100%; padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; outline:none; }
.input:focus { border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.15); }
.actions { display:flex; gap:10px; margin-top:14px; }
.btn { padding:10px 14px; border-radius:8px; border:1px solid #cbd5e1; background:#2563eb; color:#fff; cursor:pointer; text-decoration:none; }
.btn[disabled] { opacity:.7; cursor:not-allowed; }
.btn.ghost { background:#fff; color:#111827; }
.error { color:#dc2626; margin-top:10px; }
.muted { color:#6b7280; margin-top:8px; font-size:.9rem; }
</style>
