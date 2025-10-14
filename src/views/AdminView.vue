<template>
  <LogoutBar />

  <section class="page">
    <div class="card">
      <h2 class="mb-1">Admin Dashboard</h2>
      <p class="muted">This page is restricted to <b>admin</b> users only.  
        Tables support <b>sorting</b>, <b>per-column search</b>, and <b>10 rows per page</b>.
      </p>

      <div class="divider"></div>

      <!-- Users table -->
      <div class="section">
        <div class="section-head">
          <h4 class="mb-1">Registered Users ({{ users.length }})</h4>
          <button class="btn btn-outline-secondary btn-sm" @click="fetchUsers" :disabled="loadingUsers">
            {{ loadingUsers ? 'Refreshing…' : 'Refresh' }}
          </button>
        </div>

        <p v-if="loadingUsers" class="text-muted mt-2">Loading users…</p>
        <p v-else-if="errorUsers" class="text-danger mt-2">Failed to load users: {{ errorUsers }}</p>

        <div v-else class="grid" style="--cols: 4">
          <DataTable :columns="userCols" :rows="users" />
        </div>
      </div>

      <div class="divider"></div>

      <!-- Appointments table -->
      <div class="section">
        <div class="section-head">
          <h4 class="mb-1">Appointments ({{ appts.length }})</h4>
          <button class="btn btn-outline-secondary btn-sm" @click="loadAppts">Reload</button>
        </div>
        <div class="grid" style="--cols: 5">
          <DataTable :columns="apptCols" :rows="appts" />
        </div>
      </div>

      <div class="divider"></div>

      <!-- Send Email -->
      <div class="section">
        <h4 class="mb-1">Send Email</h4>
        <p class="muted">Send an email (with optional attachment) via SendGrid.</p>
        <EmailForm />
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import LogoutBar from '@/components/LogoutBar.vue'
import EmailForm from '@/components/EmailForm.vue'
import DataTable from '@/components/DataTable.vue'

/* ---------------- Users (Firestore) ---------------- */
import { db } from '@/Firebase'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'

const userCols = [
  { key: 'displayName', label: 'Name' },
  { key: 'email',       label: 'Email' },
  { key: 'role',        label: 'Role' },
  { key: 'createdAt',   label: 'Created At' },
]

const users = ref([])
const loadingUsers = ref(false)
const errorUsers = ref('')

async function fetchUsers() {
  loadingUsers.value = true
  errorUsers.value = ''
  try {
    // If createdAt is a timestamp, convert to readable string here
    const q = query(collection(db, 'profiles'), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    users.value = snap.docs.map(d => {
      const data = d.data() || {}
      const createdAt = data.createdAt?.seconds
        ? new Date(data.createdAt.seconds * 1000).toISOString().slice(0, 19).replace('T', ' ')
        : (data.createdAt || '')
      return {
        id: d.id,
        displayName: data.displayName || data.name || (data.email?.split('@')[0]) || '—',
        email: data.email || '—',
        role: data.role || 'user',
        createdAt,
      }
    })
  } catch (e) {
    errorUsers.value = e?.message || String(e)
  } finally {
    loadingUsers.value = false
  }
}

/* ---------------- Appointments (localStorage) ---------------- */
const LS_APPTS = 'appointments_v1' // change to your real key if different

const apptCols = [
  { key: 'name',       label: 'Full Name' },
  { key: 'gender',     label: 'Gender' },
  { key: 'counsellor', label: 'Counsellor' },
  { key: 'date',       label: 'Date' },
  { key: 'notes',      label: 'Notes' },
]

const appts = ref([])

function loadAppts() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_APPTS)) ?? []
    // Normalize keys for the table
    appts.value = raw.map(a => ({
      name: a.name || a.fullName || '—',
      gender: a.gender || '—',
      counsellor: a.counsellor || a.consultant || '—',
      date: a.date || a.appointmentDate || '—',
      notes: a.notes || a.comment || '',
    }))
  } catch {
    appts.value = []
  }
  // Provide sample data if none exists (useful for demo)
  if (!appts.value.length) {
    const sample = Array.from({ length: 18 }, (_, i) => ({
      name: ['Alice','Bob','Chris','Dylan','Eva','Frank','Grace','Hank','Ivy','Jack','Ken','Lily','Mia','Nina','Owen','Paul','Queen','Ray'][i],
      gender: i % 2 ? 'Female' : 'Male',
      counsellor: ['Dr. Smith','Dr. Brown','Dr. Lee'][i % 3],
      date: `2025-10-${String((i % 28) + 1).padStart(2,'0')}`,
      notes: i % 3 ? '' : '—',
    }))
    appts.value = sample
  }
}

onMounted(() => {
  fetchUsers()
  loadAppts()
})
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
  max-width: 1100px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,.06);
}

.mb-1 { margin-bottom: 8px; }
.muted { color: #6b7280; }
.text-danger { color: #dc2626; }
.text-muted { color: #6b7280; }
.mt-2 { margin-top: .5rem; }

.divider { height: 1px; background: #e5e7eb; margin: 16px 0; }

.section { margin-top: 8px; }
.section-head { display: flex; justify-content: space-between; align-items: center; }

.grid { /* used by DataTable to size columns */
  --cols: 3; /* overridden inline per table */
}

.btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 6px 10px; border-radius: 8px; cursor: pointer;
  border: 1px solid #d1d5db; background: #fff;
}
.btn:disabled { opacity: .6; cursor: not-allowed; }
.btn-sm { padding: 4px 8px; font-size: 12px; }
.btn-outline-secondary { color: #374151; }
</style>