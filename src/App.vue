<template>

  <LogoutBar />

  <main id="main" tabindex="-1" ref="main">
    <router-view />
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import LogoutBar from '@/components/LogoutBar.vue'

const main = ref(null)
const router = useRouter()

onMounted(() => {
  router.afterEach(() => {
    requestAnimationFrame(() => main.value?.focus())
  })
})
</script>