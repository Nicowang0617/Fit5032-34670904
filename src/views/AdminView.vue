<template>
  <LogoutBar />

  <section class="page">
    <div class="card">
      <h2 class="mb-1">Admin Dashboard</h2>
      <p class="muted">This page is restricted to <b>admin</b> users only.</p>

      <div class="divider"></div>

      <div class="stat">
        <h4 class="mb-1">Registered Users ({{ users.length }})</h4>
        <ul class="list">
          <li v-for="u in users" :key="u.id" class="list-item">
            <span class="name">{{ u.name }}</span>
            <span class="sep">—</span>
            <span class="email">{{ u.email }}</span>
            <span class="sep">—</span>
            <i class="role">{{ u.role }}</i>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores/auth'
import LogoutBar from '../components/LogoutBar.vue'

const auth = useAuthStore()
const { users } = storeToRefs(auth)
</script>

<style scoped>
.page {
  min-height: calc(100vh - 56px);
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f5f7fb;
  padding: 24px;
}

.card {
  width: 100%;
  max-width: 760px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,.06);
}

.mb-1 { margin-bottom: 8px; }
.muted { color: #6b7280; }

.divider {
  height: 1px;
  background: #e5e7eb;
  margin: 14px 0;
}

.stat { margin-top: 8px; }
.list { margin: 8px 0 0; padding-left: 18px; }
.list-item { margin: 6px 0; }
.name { font-weight: 600; }
.email { color: #374151; }
.role { color: #2563eb; font-style: normal; }
.sep { margin: 0 6px; color: #9ca3af; }
</style>