<template>
  <LogoutBar />

  <section class="page">
    <div class="card">
      <h2 class="mb-1">Admin Dashboard</h2>
      <p class="muted">
        This page is restricted to <b>admin</b> users only.
        Tables support <b>sorting</b>, <b>per-column search</b>, and <b>10 rows per page</b>.
      </p>

      <div class="divider"></div>
      <div class="section">
        <div class="section-head">
          <h4 class="mb-1">Send Email</h4>
          <router-link
            class="btn btn-primary btn-sm"
            :to="{ name: 'AdminEmail' }"
            aria-label="Open Email Sender"
          >
            ✉️ Open Email Sender
          </router-link>
        </div>
        <p class="muted">Open a dedicated page to send email (with optional attachment) via SendGrid.</p>
      </div>
      <div class="section">
        <div class="section-head">
          <h4 class="mb-1">Registered Users ({{ users.length }})</h4>
          <div class="btn-group">
            <button class="btn btn-outline-secondary btn-sm" @click="fetchUsers" :disabled="loadingUsers">
              {{ loadingUsers ? 'Refreshing…' : 'Refresh' }}
            </button>
            <button class="btn btn-outline-success btn-sm" @click="exportUsersCSV" :disabled="!users.length">⬇️ CSV</button>
            <button class="btn btn-outline-dark btn-sm" @click="exportUsersPDF" :disabled="!users.length">⬇️ PDF</button>
          </div>
        </div>

        <p v-if="loadingUsers" class="text-muted mt-2">Loading users…</p>
        <p v-else-if="errorUsers" class="text-danger mt-2">Failed to load users: {{ errorUsers }}</p>

        <div v-else class="grid" style="--cols: 4">
          <DataTable :columns="userCols" :rows="users" />
        </div>
      </div>

      <div class="divider"></div>

      <!-- Appointments -->
      <div class="section">
        <div class="section-head">
          <h4 class="mb-1">Appointments ({{ appts.length }})</h4>
          <div class="btn-group">
            <button class="btn btn-outline-secondary btn-sm" @click="loadAppts">Reload</button>
            <button class="btn btn-outline-success btn-sm" @click="exportApptsCSV" :disabled="!appts.length">⬇️ CSV</button>
            <button class="btn btn-outline-dark btn-sm" @click="exportApptsPDF" :disabled="!appts.length">⬇️ PDF</button>
          </div>
        </div>
        <div class="grid" style="--cols: 5">
          <DataTable :columns="apptCols" :rows="appts" />
        </div>
      </div>

      <div class="divider"></div>


    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import LogoutBar from '@/components/LogoutBar.vue'
import DataTable from '@/components/DataTable.vue'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

import { db } from '@/Firebase'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'

const userCols = [
  { key: 'displayName', label: 'Name' },
  { key: 'email',       label: 'Email' },
  { key: 'role',        label: 'Role' },
  { key: 'createdAt',   label: 'Created At' },
]
const apptCols = [
  { key: 'name',       label: 'Full Name' },
  { key: 'gender',     label: 'Gender' },
  { key: 'counsellor', label: 'Counsellor' },
  { key: 'date',       label: 'Date' },
  { key: 'notes',      label: 'Notes' },
]

const users = ref([])
const loadingUsers = ref(false)
const errorUsers = ref('')

async function fetchUsers() {
  loadingUsers.value = true
  errorUsers.value = ''
  try {
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

const LS_APPTS = 'appointments_v1'
const appts = ref([])

function loadAppts() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_APPTS)) ?? []
    appts.value = raw.map(a => ({
      name: a.name || a.fullName || '—',
      gender: a.gender || '—',
      counsellor: a.counsellor || a.consultant || '—',
      date: a.date || a.appointmentDate || '—',
      notes: a.notes || a.comment || '',
    }))
  } catch { appts.value = [] }

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

function exportCSV(rows, filename) {
  if (!rows?.length) return
  const headers = Object.keys(rows[0])
  const esc = (v) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))]
  const csv = '\uFEFF' + lines.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function exportTablePDF(title, columns, rows, filename) {
  if (!rows?.length) return
  const doc = new jsPDF()
  doc.setFontSize(14)
  doc.text(title, 14, 18)
  autoTable(doc, {
    head: [columns.map(c => c.label)],
    body: rows.map(r => columns.map(c => r[c.key] ?? '')),
    startY: 24,
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [52, 71, 235] }
  })
  doc.save(filename)
}

const exportUsersCSV  = () => exportCSV(users.value, 'users.csv')
const exportUsersPDF  = () => exportTablePDF('Users', userCols, users.value, 'users.pdf')
const exportApptsCSV  = () => exportCSV(appts.value, 'appointments.csv')
const exportApptsPDF  = () => exportTablePDF('Appointments', apptCols, appts.value, 'appointments.pdf')

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
.section-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.grid { --cols: 3; }
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 6px 10px; border-radius: 8px; cursor: pointer;
  border: 1px solid #d1d5db; background: #fff;
}
.btn:disabled { opacity: .6; cursor: not-allowed; }
.btn-sm { padding: 4px 8px; font-size: 12px; }
.btn-group > .btn + .btn { margin-left: 6px; }
.btn-outline-secondary { color: #374151; }
.btn-primary { background: #2563eb; color: #fff; border-color: #2563eb; }
.btn-primary:hover { background: #1d4ed8; border-color: #1d4ed8; }
</style>
