<script setup>
import { ref } from 'vue'

const to = ref('')
const subject = ref('')
const text = ref('')
const file = ref(null)
const sending = ref(false)
const msg = ref('')

const endpoint = location.hostname === 'localhost'
  ? 'http://127.0.0.1:8788/email'
  : '/email';

function onPick(e) {
  file.value = e.target.files?.[0] ?? null
}

function fileToBase64(f) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(f)
  })
}

async function onSend() {
  if (!to.value || !subject.value) {
    msg.value = '⚠️ Please fill in receiver email and subject.'
    return
  }
  // Optional: simple size guard for attachment (< 5MB for demo)
  if (file.value && file.value.size > 5 * 1024 * 1024) {
    msg.value = '⚠️ Attachment is too large. Please select a file < 5MB.'
    return
  }

  sending.value = true
  msg.value = ''
  console.log('POSTing to:', endpoint)

  try {
    let attachment = null
    if (file.value) {
      const base64 = await fileToBase64(file.value)
      attachment = {
        content: base64,
        filename: file.value.name,
        type: file.value.type || 'application/octet-stream',
      }
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: to.value, subject: subject.value, text: text.value, attachment }),
    })

    // Better error reporting:
    let bodyText = ''
    try { bodyText = await res.text() } catch {}
    let data = {}
    try { data = bodyText ? JSON.parse(bodyText) : {} } catch { /* keep raw text */ }

    if (!res.ok) {
      msg.value = `❌ Failed to send email [${res.status}]: ${data.error || bodyText || res.statusText}`
      return
    }
    msg.value = '✅ Email sent successfully! Please check your inbox.'
  } catch (err) {
    msg.value = '❌ Error: ' + (err.message || String(err))
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="mt-2">
    <div class="mb-3">
      <label class="form-label">Receiver Email</label>
      <input type="email" class="form-control" v-model="to" placeholder="example@domain.com" />
    </div>

    <div class="mb-3">
      <label class="form-label">Subject</label>
      <input class="form-control" v-model="subject" placeholder="Email Subject" />
    </div>

    <div class="mb-3">
      <label class="form-label">Message</label>
      <textarea class="form-control" v-model="text" rows="4" placeholder="Write your message here..." />
    </div>

    <div class="mb-3">
      <label class="form-label">Attachment (optional)</label>
      <input type="file" class="form-control" @change="onPick" />
      <small v-if="file" class="text-muted">Selected: {{ file.name }}</small>
    </div>

    <button class="btn btn-primary" :disabled="sending" @click="onSend">
      {{ sending ? 'Sending…' : 'Send Email' }}
    </button>

    <p class="mt-3">{{ msg }}</p>
  </div>
</template>

<style scoped>
.mt-2 { margin-top: 0.5rem; }
.text-muted { color: #6b7280; }
</style>
