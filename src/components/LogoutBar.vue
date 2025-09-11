<template>
  <div class="logout-bar">
    <span v-if="auth.user">
      Logged in: <b>{{ auth.user.name }}</b> ({{ auth.user.role }})
    </span>
    <button @click="handleLogout" class="btn">Logout</button>
  </div>
</template>

<script setup>
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.logout-bar {
  position: fixed;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 10px;
  align-items: center;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 6px 12px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.08);
  font-size: 14px;
}
.btn {
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #2563eb;
  color: #fff;
  cursor: pointer;
}
.btn:hover {
  background: #1d4ed8;
}
</style>
