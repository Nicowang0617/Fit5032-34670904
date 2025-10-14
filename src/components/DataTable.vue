<script setup>
import { computed, reactive, ref, watch } from 'vue'

const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, required: true },
  pageSize: { type: Number, default: 10 },
})

const sortKey = ref('')
const sortDir = ref(1) 
const page = ref(1)

const filters = reactive({})
props.columns.forEach(c => (filters[c.key] = ''))

watch(() => props.rows, () => (page.value = 1), { deep: true })

function setSort(key) {
  if (sortKey.value === key) {
    sortDir.value = -sortDir.value
  } else {
    sortKey.value = key
    sortDir.value = 1
  }
}

const filtered = computed(() => {
  const fkeys = Object.keys(filters)
  if (!fkeys.length) return props.rows
  const norm = (v) => String(v ?? '').toLowerCase()
  return props.rows.filter(row =>
    fkeys.every(k => {
      const q = norm(filters[k])
      if (!q) return true
      return norm(row[k]).includes(q)
    })
  )
})

const sorted = computed(() => {
  if (!sortKey.value) return filtered.value
  const key = sortKey.value
  const dir = sortDir.value
  return [...filtered.value].sort((a, b) => {
    const va = a[key]; const vb = b[key]
    const na = Number(va), nb = Number(vb)
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return (na - nb) * dir
    return String(va ?? '').localeCompare(String(vb ?? ''), undefined, { sensitivity: 'base' }) * dir
  })
})

const total = computed(() => sorted.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / props.pageSize)))
const view = computed(() => {
  const start = (page.value - 1) * props.pageSize
  return sorted.value.slice(start, start + props.pageSize)
})

function goto(p) {
  page.value = Math.min(Math.max(1, p), totalPages.value)
}

</script>

<template>
  <div class="dt-wrap">
    <div class="dt-row dt-filters">
      <div v-for="c in columns" :key="c.key" class="dt-cell">
        <input
          v-model="filters[c.key]"
          :placeholder="`Search ${c.label}`"
          class="dt-input"
          type="text"
        />
      </div>
    </div>

    <div class="dt-header dt-row">
      <div
        v-for="c in columns"
        :key="'h-'+c.key"
        class="dt-cell dt-th"
        role="button"
        @click="setSort(c.key)"
        :title="'Sort by ' + c.label"
      >
        {{ c.label }}
        <span v-if="sortKey === c.key" class="dt-sort">{{ sortDir === 1 ? '▲' : '▼' }}</span>
      </div>
    </div>

    <div class="dt-body">
      <div v-for="(r,i) in view" :key="i" class="dt-row">
        <div v-for="c in columns" :key="c.key" class="dt-cell">
          {{ r[c.key] }}
        </div>
      </div>
      <div v-if="!view.length" class="dt-empty">No data</div>
    </div>

    <div class="dt-footer">
      <div class="dt-info">
        Showing
        <b>{{ view.length }}</b> of <b>{{ total }}</b> items —
        Page <b>{{ page }}</b> / <b>{{ totalPages }}</b> (10 per page)
      </div>
      <div class="dt-pages">
        <button class="dt-btn" @click="goto(1)" :disabled="page<=1">« First</button>
        <button class="dt-btn" @click="goto(page-1)" :disabled="page<=1">‹ Prev</button>
        <button class="dt-btn" @click="goto(page+1)" :disabled="page>=totalPages">Next ›</button>
        <button class="dt-btn" @click="goto(totalPages)" :disabled="page>=totalPages">Last »</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dt-wrap { border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; background:#fff }
.dt-row { display:grid; grid-template-columns: repeat(var(--cols), 1fr); }
.dt-cell { padding:10px 12px; border-bottom:1px solid #f1f5f9; }
.dt-header .dt-cell { font-weight:600; background:#f8fafc; cursor:pointer; user-select:none; }
.dt-sort { margin-left:6px; font-size:12px; color:#64748b }
.dt-body .dt-row:last-child .dt-cell { border-bottom:none }
.dt-input { width:100%; padding:8px 10px; border:1px solid #e5e7eb; border-radius:8px }
.dt-filters .dt-cell { background:#fafafa; }
.dt-empty { text-align:center; color:#94a3b8; padding:18px }
.dt-footer{ display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:#fafafa; }
.dt-btn{ padding:6px 10px; margin-left:6px; border:1px solid #e5e7eb; background:#fff; border-radius:8px; cursor:pointer }
.dt-btn[disabled]{ opacity:.5; cursor:not-allowed }
.dt-info{ color:#475569 }
</style>

<script>

</script>