<template>
  <LogoutBar />

  <section class="page">
    <div class="card">
      <div class="header">
        <h2 class="mb-1">Send Email</h2>
        <div class="actions">
          <router-link class="btn btn-outline-secondary btn-sm" :to="{ name: 'Admin' }">
            ← Back to Admin
          </router-link>
        </div>
      </div>

      <p class="muted">
        Use the Cloud Function (SendGrid) to send an email. Attachments are optional.
      </p>

      <div class="divider"></div>

      <EmailForm />
    </div>
  </section>
</template>

<script setup>
import LogoutBar from '@/components/LogoutBar.vue'
import EmailForm from '@/components/EmailForm.vue'
</script>

<style scoped>
.page {
  min-height: calc(100vh - 56px);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: #f5f7fb;
  padding: 24px;
}
.card {
  width: 100%;
  max-width: 900px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,.06);
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.muted { color: #6b7280; }
.divider { height: 1px; background: #e5e7eb; margin: 16px 0; }
.btn { display: inline-flex; align-items: center; gap: 6px; }
.btn-sm { padding: 4px 8px; font-size: 12px; }
</style>
