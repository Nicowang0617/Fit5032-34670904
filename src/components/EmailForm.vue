<script setup>
import { ref } from 'vue'

const to = ref('')
const subject = ref('')
const body = ref('')
const file = ref(null)
const sending = ref(false)
const status = ref('')

const ENDPOINT =
  (import.meta.env.VITE_EMAIL_ENDPOINT || '').trim() ||
  'https://us-central1-fit5032-final-haoyang.cloudfunctions.net/email'  

function onPick(e) {
  file.value = e.target.files?.[0] ?? null
  status.value = ''
}

function fileToBase64(f) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      const b64 = result.includes(',') ? result.split(',')[1] : result
      resolve(b64)
    }
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'))
    reader.readAsDataURL(f)
  })
}

async function sendEmail() {
  status.value = ''
  if (!to.value || !subject.value) {
    status.value = '⚠️ Please enter receiver email and subject.'
    return
  }

  sending.value = true
  try {
    let attachment = undefined
    if (file.value) {
      const base64 = await fileToBase64(file.value)
      attachment = {
        content: base64,
        filename: file.value.name,
        type: file.value.type || 'application/octet-stream',
      }
    }

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: to.value,
        subject: subject.value,
        text: body.value,
        attachment,
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (res.ok && data?.ok) {
      status.value = '✅ Email sent successfully.'
      subject.value = ''
      body.value = ''
      file.value = null
      const input = document.getElementById('email-attachment')
      if (input) input.value = ''
    } else {
      status.value = '❌ Send failed: ' + (data?.error || res.statusText)
    }
  } catch (e) {
    status.value = '❌ Error: ' + (e?.message || String(e))
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="card p-3">
    <h5 class="mb-2">Send Email</h5>
    <p class="text-muted mb-3">Use the Cloud Function (SendGrid) to send an email. Attachments are optional.</p>

    <div class="mb-3">
      <label class="form-label">Receiver Email</label>
      <input type="email" class="form-control" v-model="to" placeholder="user@example.com" />
    </div>

    <div class="mb-3">
      <label class="form-label">Subject</label>
      <input class="form-control" v-model="subject" placeholder="Subject" />
    </div>

    <div class="mb-3">
      <label class="form-label">Message</label>
      <textarea class="form-control" rows="4" v-model="body" placeholder="Write your message..."></textarea>
    </div>

    <div class="mb-3">
      <label class="form-label">Attachment (optional)</label>
      <input id="email-attachment" type="file" class="form-control" @change="onPick" />
      <small v-if="file" class="text-muted">Selected: {{ file.name }}</small>
    </div>

    <button class="btn btn-primary" :disabled="sending" @click="sendEmail">
      {{ sending ? 'Sending…' : 'Send Email' }}
    </button>

    <p class="mt-3" :class="status.startsWith('✅') ? 'text-success' : 'text-danger'">{{ status }}</p>
  </div>
</template>

<style scoped>
.text-muted { color: #6b7280; }
.text-success { color: #16a34a; }
.text-danger { color: #dc2626; }
</style>
