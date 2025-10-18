<template>
  <section class="container py-4">
    <router-link
      to="/appointment"
      class="btn btn-link p-0 mb-3"
      aria-label="Back to appointment"
    >
      ← Back to Appointment
    </router-link>

    <div class="card p-4">
      <h2 class="mb-3">Rate &amp; Review</h2>
      <Rating />
    </div>
  </section>
</template>

<script setup>
import Rating from '@/components/Rating.vue'
</script>

<style scoped>
.rate-page {
  min-height: calc(100vh - 64px);
  background: #f5f7fb;
  padding: 16px;
}

.wrap {
  max-width: 1100px; 
  margin: 0 auto;
}

.back-link {
  display: inline-block;
  margin-bottom: 12px;
  color: #2563eb;
  text-decoration: none;
}

.rating-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 8px 24px rgba(0,0,0,.06);
}

.mb-3 { margin-bottom: .75rem; }
</style>