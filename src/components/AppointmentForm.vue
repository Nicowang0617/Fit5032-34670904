<template>
  <section class="d-flex justify-content-center align-items-start mt-5">
    <div style="width: 100%; max-width: 1000px;">
      <form class="appointment-form card p-4" @submit.prevent="submitForm" novalidate>
        <!-- Header + Voice toggle -->
        <div class="mb-3 d-flex justify-content-between align-items-center">
          <h1 class="m-0">Make an Appointment with Certified Counsellors</h1>

          <div class="form-check form-switch ms-3">
            <input class="form-check-input" type="checkbox" id="voiceSwitch" v-model="voiceOn">
            <label class="form-check-label" for="voiceSwitch">🔈 Enable voice hints</label>
          </div>
        </div>

        <!-- Basic info -->
        <div class="row g-3 mb-3">
          <div class="col-md-6">
            <label for="fullName" class="form-label">
              Full Name
              <button
                type="button"
                class="speak-btn"
                title="Read this"
                :aria-label="'Speak: Full Name'"
                @click="say('Full Name. Please enter your full name.')"
              >🔊</button>
            </label>
            <input
              id="fullName"
              type="text"
              class="form-control"
              v-model.trim="form.fullName"
              @input="clearError('fullName')"
              placeholder="Enter your full name"
              autocomplete="name"
              required
            />
            <div v-if="errors.fullName" class="text-danger">{{ errors.fullName }}</div>
          </div>

          <div class="col-md-6">
            <label for="ageGroup" class="form-label">
              Age Group
              <button
                type="button"
                class="speak-btn"
                title="Read this"
                :aria-label="'Speak: Age Group'"
                @click="say('Age group. Please choose your age range.')"
              >🔊</button>
            </label>
            <select
              id="ageGroup"
              class="form-select"
              v-model="form.ageGroup"
              @change="clearError('ageGroup')"
              required
            >
              <option disabled value="">Select</option>
              <option v-for="opt in ageGroups" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <div v-if="errors.ageGroup" class="text-danger">{{ errors.ageGroup }}</div>
          </div>
        </div>

        <div class="row g-3 mb-3">
          <div class="col-md-6">
            <label for="gender" class="form-label">
              Gender
              <button
                type="button"
                class="speak-btn"
                title="Read this"
                :aria-label="'Speak: Gender'"
                @click="say('Gender. Please select an option.')"
              >🔊</button>
            </label>
            <select
              id="gender"
              class="form-select"
              v-model="form.gender"
              @change="clearError('gender')"
              required
            >
              <option disabled value="">Select</option>
              <option>Male</option>
              <option>Female</option>
              <option>Prefer not to say</option>
            </select>
            <div v-if="errors.gender" class="text-danger">{{ errors.gender }}</div>
          </div>

          <div class="col-md-6">
            <label for="counsellor" class="form-label">
              Counsellor
              <button
                type="button"
                class="speak-btn"
                title="Read this"
                :aria-label="'Speak: Counsellor'"
                @click="say('Counsellor. Please choose a counsellor.')"
              >🔊</button>
            </label>
            <select
              id="counsellor"
              class="form-select"
              v-model.number="form.counsellorId"
              @change="onCounsellorChange"
              required
            >
              <option disabled :value="null">Select</option>
              <option v-for="c in counsellors" :key="c.id" :value="c.id">
                {{ c.name }}
              </option>
            </select>
            <div v-if="errors.counsellor" class="text-danger">{{ errors.counsellor }}</div>
          </div>
        </div>

        <!-- Self assessment -->
        <div class="mb-3">
          <label for="assessment" class="form-label">
            Self Assessment (mental &amp; physical)
            <button
              type="button"
              class="speak-btn"
              title="Read this"
              :aria-label="'Speak: Assessment'"
              @click="say('Self assessment. Briefly describe how you are feeling and what you need help with.')"
            >🔊</button>
          </label>
          <textarea
            id="assessment"
            class="form-control"
            rows="4"
            v-model.trim="form.assessment"
            placeholder="Briefly describe how you are feeling and what you need help with..."
          ></textarea>
        </div>

        <!-- Appointment date (你的日历保持不变) -->
        <div class="mb-4">
          <label for="apptDate" class="form-label d-block">
            Appointment Date
            <button
              type="button"
              class="speak-btn"
              title="Read this"
              :aria-label="'Speak: Appointment Date'"
              @click="say('Appointment date. Please pick a valid date. Past days and unavailable days are disabled.')"
            >🔊</button>
          </label>

          <input
            id="apptDate"
            type="date"
            class="form-control"
            v-model="form.date"
            :min="minDate"
            :max="maxDate"
            :disabled="loading"
            @change="onDateChange"
            aria-describedby="dateHelp"
            required
          />

          <small id="dateHelp" class="text-muted">
            Only business days and counsellor's working days are allowed. Holidays/blocked dates are disabled.
          </small>

          <div v-if="errors.date" class="text-danger mt-1">{{ errors.date }}</div>
        </div>

        <!-- NEW: Booking Time + 冲突提示 -->
        <div class="mb-4">
          <label class="form-label d-block">
            Booking Time (1 hour)
            <button
              type="button"
              class="speak-btn"
              title="Read this"
              :aria-label="'Speak: Booking Time'"
              @click="say('Booking time. One-hour slots between 9 a m and 5 p m. Weekends disabled.')"
            >🔊</button>
          </label>

          <select
            class="form-select"
            v-model.number="form.hour"
            :disabled="!form.date || !form.counsellorId || isWeekend"
            @change="checkConflict" 
            required
          >
            <option disabled :value="null">Select a time</option>
            <option v-for="h in timeSlots" :key="h" :value="h">
              {{ labelHour(h) }}
            </option>
          </select>
          <div v-if="errors.hour" class="text-danger mt-1">{{ errors.hour }}</div>

          <p v-if="conflictMsg" :class="conflictOk ? 'text-success' : 'text-danger'" class="mb-0 mt-2">
            {{ conflictMsg }}
          </p>
        </div>

        <!-- Submit / Reset -->
        <div class="text-center mt-3">
          <button class="btn btn-primary me-2" type="submit" :disabled="submitting || loading">
            <span v-if="submitting">Booking...</span>
            <span v-else>✅Make Appointment</span>
          </button>
          <button type="button" class="btn btn-outline-secondary" @click="resetForm" :disabled="submitting">
            🔄Reset
          </button>
        </div>

        <!-- Links -->
        <div class="text-center mt-3">
          <router-link to="/geo" class="btn btn-outline-primary" aria-label="Open map">
            Open Map🗺️
          </router-link>
        </div>
        <p class="text-muted text-center mt-2 mb-0">
          You can use the map to find nearby mental-health clinics and get directions.
        </p>

        <div class="text-center mt-4">
          <router-link to="/rating" class="btn btn-outline-secondary" aria-label="Rate and review">
            ⭐Rate &amp; 📝Review
          </router-link>
          <p class="text-muted small mt-2 mb-0">
            You can leave your rating and feedback here.
          </p>
        </div>
      </form>
    </div>
  </section>
</template>

<script>
import { db } from '@/Firebase'                // NEW
import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore' // NEW
import Rating from './Rating.vue'

export default {
  name: 'AppointmentForm',
  components: { Rating },

  data() {
    // Build ISO strings for min/max (today .. +1 year)
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const minISO = `${yyyy}-${mm}-${dd}`
    const maxISO = `${yyyy + 1}-${mm}-${dd}`

    return {
      loading: false,
      loadError: false,
      submitting: false,

      // Voice hints (Web Speech)
      voiceOn: true,
      voiceLang: 'en-AU',
      ttsReady: false,
      _voices: [],

      // Form model
      form: {
        fullName: '',
        ageGroup: '',
        gender: '',
        counsellorId: null,
        assessment: '',
        date: '',   // yyyy-mm-dd
        hour: null, // NEW: 9..16 (表示 09:00–10:00 ... 16:00–17:00)
      },

      errors: {},
      ageGroups: [],
      counsellors: [],

      // Calendar constraints（保持你现有的文案和限制思路）
      businessDays: [1, 2, 3, 4, 5],
      blackoutDates: [],
      counsellorWorkingDays: {
        1: [1, 3, 5],
        2: [2, 4],
        3: [1, 2, 3, 4, 5],
      },

      minDate: minISO,
      maxDate: maxISO,

      // NEW: 冲突检测提示
      conflictMsg: '',
      conflictOk: true,
    }
  },

  computed: {
    // NEW: 是否周末，用来禁用时间段选择
    isWeekend() {
      if (!this.form.date) return false
      const d = new Date(this.form.date + 'T00:00:00')
      const dow = d.getDay() // 0..6
      return dow === 0 || dow === 6
    },
    // NEW: 9..16，共 8 段
    timeSlots() {
      return this.isWeekend ? [] : Array.from({ length: 8 }, (_, i) => 9 + i)
    },
  },

  async created() {
    // Load dropdowns with fallback data.
    this.loading = true
    this.loadError = false
    try {
      // Age groups
      try {
        const r = await fetch('/age-groups.json')
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const data = await r.json()
        this.ageGroups = Array.isArray(data) ? data : (data.ageGroups || [])
      } catch (e) {
        this.loadError = true
        this.ageGroups = [
          { value: 'under18', label: 'Under 18' },
          { value: '18to30', label: '18–30' },
          { value: '31to50', label: '31–50' },
          { value: '51plus', label: '51+' },
        ]
      }

      // Counsellors
      try {
        const r = await fetch('/counsellors.json')
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const data = await r.json()
        this.counsellors = Array.isArray(data) ? data : (data.counsellors || [])
      } catch (e) {
        this.loadError = true
        this.counsellors = [
          { id: 1, name: 'Bill Johnson' },
          { id: 2, name: 'Sam Lee' },
          { id: 3, name: 'Julia Smith' },
        ]
      }
    } finally {
      this.loading = false
    }

    // Prepare speech synthesis voices
    this.initVoices()
  },

  methods: {
    /* ---------- Web Speech helpers ---------- */
    initVoices() {
      if (!('speechSynthesis' in window)) return
      const load = () => {
        this._voices = window.speechSynthesis.getVoices() || []
        this.ttsReady = this._voices.length > 0
      }
      load()
      window.speechSynthesis.onvoiceschanged = load
    },
    pickVoice(langPref) {
      if (!this._voices || this._voices.length === 0) return null
      return (
        this._voices.find(v => v.lang && v.lang.startsWith(langPref)) ||
        this._voices.find(v => v.lang && v.lang.startsWith(langPref.split('-')[0])) ||
        this._voices.find(v => v.lang && v.lang.startsWith('en')) ||
        this._voices[0]
      )
    },
    say(text) {
      if (!this.voiceOn) return
      if (!('speechSynthesis' in window)) return
      const u = new SpeechSynthesisUtterance(text)
      const v = this.pickVoice(this.voiceLang)
      if (v) u.voice = v
      u.rate = 1
      u.pitch = 1
      u.volume = 1
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(u)
    },

    /* ---------- Form helpers ---------- */
    clearError(key) {
      if (key in this.errors) this.errors[key] = null
    },

    onCounsellorChange() {
      if (this.form.date) this.onDateChange()
      this.clearError('counsellor')
      this.checkConflict() // NEW: counsellor 变更也触发检测
    },

    onDateChange() {
      if (this.errors.date) this.errors.date = null
      if (this.form.date && !this.validateDateAllowed(this.form.date)) {
        this.form.date = ''
      }
      // 变更日期后也重新做时段冲突检查
      this.checkConflict() // NEW
    },

    validateDateAllowed(iso) {
      if (!iso) return false
      const picked = new Date(iso + 'T00:00:00')
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (picked < today) {
        this.errors.date = 'Selected date cannot be earlier than today'
        return false
      }

      if (this.blackoutDates.includes(iso)) {
        this.errors.date = 'This date is not available (holiday/blocked).'
        return false
      }

      const dow = picked.getDay()
      const weekday = dow === 0 ? 7 : dow
      if (!this.businessDays.includes(weekday)) {
        this.errors.date = 'Please pick a business day (Mon–Fri).'
        return false
      }

      const cid = this.form.counsellorId
      if (cid && this.counsellorWorkingDays[cid]) {
        const okDays = this.counsellorWorkingDays[cid]
        if (!okDays.includes(weekday)) {
          this.errors.date = 'Selected counsellor is not available on this day.'
          return false
        }
      }
      return true
    },

    /* ---------- NEW: 冲突检测（读 Firestore 单文档） ---------- */
    async checkConflict() {
      this.conflictMsg = ''
      this.conflictOk = true
      const { counsellorId, date, hour } = this.form
      if (!counsellorId || !date || (hour === null || hour === undefined)) return
      try {
        const id = `${counsellorId}_${date}_${hour}`
        const ref = doc(db, 'appointments', id)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          this.conflictOk = false
          this.conflictMsg = `Time conflict: ${this.labelHour(hour)} is already booked for this counsellor.`
        } else {
          this.conflictOk = true
          this.conflictMsg = 'This time is available.'
        }
      } catch (e) {
        // 读失败不阻断预约，只是不显示状态
        this.conflictOk = true
        this.conflictMsg = ''
        console.warn('checkConflict failed:', e)
      }
    },

    /* ---------- Validation / submit ---------- */
    labelHour(h) {
      const pad = n => String(n).padStart(2, '0')
      return `${pad(h)}:00–${pad(h + 1)}:00`
    },

    validate() {
      const errs = {}

      const name = (this.form.fullName || '').trim()
      if (!name)       errs.fullName = 'Full name is required'
      else if (name.length < 2) errs.fullName = 'Full name must be at least 2 characters'
      else if (!/^[A-Za-z\s]+$/.test(name)) errs.fullName = 'Full name can only contain letters and spaces'

      if (!this.form.ageGroup)     errs.ageGroup   = 'Please select an age group'
      if (!this.form.gender)       errs.gender     = 'Please select a gender'
      if (!this.form.counsellorId) errs.counsellor = 'Please choose a counsellor'

      if (!this.form.date) {
        errs.date = 'Please choose a date'
      } else if (!this.validateDateAllowed(this.form.date)) {
        errs.date = this.errors.date || 'Selected date is not allowed'
      }

      if (this.form.hour === null || this.form.hour === undefined) {
        errs.hour = 'Please select a booking time'
      } else if (this.isWeekend) {
        errs.hour = 'Weekends are not available'
      }

      this.errors = errs
      return Object.keys(errs).length === 0
    },

    async submitForm() {
      if (!this.validate()) return
      if (!this.conflictOk) { alert(this.conflictMsg || 'Time conflict'); return }

      this.submitting = true
      try {
        const { fullName, counsellorId, date, hour, ageGroup, gender, assessment } = this.form
        const id = `${counsellorId}_${date}_${hour}`  // 固定主键保证唯一

        // 事务：再次读取，若已存在则抛错，避免并发
        const ref = doc(db, 'appointments', id)
        await runTransaction(db, async (tx) => {
          const snap = await tx.get(ref)
          if (snap.exists()) throw new Error('This time has just been booked by someone else.')
          tx.set(ref, {
            fullName, counsellorId, date, hour,
            ageGroup, gender, assessment,
            status: 'confirmed',
            createdAt: serverTimestamp()
          })
        })

        alert(`Appointment booked successfully!\nCounsellor #${counsellorId}\nDate: ${date}\nTime: ${this.labelHour(hour)}`)
        this.resetForm()
      } catch (e) {
        alert(`Booking failed: ${e?.message || e}`)
        await this.checkConflict()
      } finally {
        this.submitting = false
      }
    },

    resetForm() {
      this.form = {
        fullName: '',
        ageGroup: '',
        gender: '',
        counsellorId: null,
        assessment: '',
        date: '',
        hour: null,
      }
      this.errors = {}
      this.conflictMsg = ''
      this.conflictOk = true
    },
  },
}
</script>

<style scoped>
.card { box-shadow: 0 8px 24px rgba(0,0,0,.06); }
h1 { font-size: 1.6rem; }

.speak-btn {
  border: none;
  background: transparent;
  padding: 0 .25rem;
  cursor: pointer;
  line-height: 1;
  vertical-align: baseline;
  font-size: 1rem;
}
.speak-btn:focus { outline: 2px solid #86b7fe; border-radius: .25rem; }

.text-danger { color: #dc2626; }
.text-success { color: #16a34a; }
</style>
