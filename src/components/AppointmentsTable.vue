<script setup>
import { computed, ref, onMounted } from 'vue'
import DataTable from './DataTable.vue'

const LS_APPTS = 'appointments_v1' 

const cols = [
  { key: 'name',   label: 'Full Name' },
  { key: 'gender', label: 'Gender' },
  { key: 'counsellor', label: 'Counsellor' },
  { key: 'date',   label: 'Date' },
]

const rows = ref([])

function load() {
  try {
    rows.value = JSON.parse(localStorage.getItem(LS_APPTS)) ?? []
  } catch {
    rows.value = []
  }
  if (!rows.value.length) {
    const names = ['Alice','Bob','Chris','Dylan','Eva','Frank','Grace','Hank','Ivy','Jack','Ken','Lily','Mia','Nina','Owen','Paul','Queen','Ray']
    rows.value = names.map((n,i)=>({
      name: n,
      gender: i%2 ? 'Female' : 'Male',
      counsellor: ['Dr. Smith','Dr. Brown','Dr. Lee'][i%3],
      date: `2025-10-${String((i%28)+1).padStart(2,'0')}`,
    }))
  }
}
onMounted(load)

const data = computed(()=> rows.value)
</script>

<template>
  <section>
    <h3 class="mb">Appointments</h3>
    <div class="grid" style="--cols: 4">
      <DataTable :columns="cols" :rows="data" />
    </div>
  </section>
</template>

<style scoped>
.mb{ margin-bottom:10px; }
.grid{ --cols: 4; }
</style>