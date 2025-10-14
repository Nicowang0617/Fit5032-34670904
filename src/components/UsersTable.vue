<script setup>
import { storeToRefs } from 'pinia'
import { onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import DataTable from './DataTable.vue'

const cols = [
  { key: 'name',  label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role',  label: 'Role' },
]

const auth = useAuthStore()
const { users } = storeToRefs(auth)

onMounted(() => {
  auth.ensureAdmin?.()
})

const data = computed(() => users.value ?? [])
</script>

<template>
  <section>
    <h3 class="mb">Registered Users</h3>
    <div class="grid" style="--cols: 3">
      <DataTable :columns="cols" :rows="data" />
    </div>
  </section>
</template>

<style scoped>
.mb{ margin-bottom:10px; }
.grid{ --cols: 3; }
</style>