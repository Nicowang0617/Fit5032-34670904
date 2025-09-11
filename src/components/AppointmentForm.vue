<template>
  <LogoutBar />

  <div class="d-flex justify-content-center align-items-start mt-5">
    <div style="width: 100%; max-width: 1000px;">
      <form class="appointment-form card p-4" @submit.prevent="submitForm" novalidate>
        <h1 class="text-center mb-4">Make an Appointment with Certified Counsellors</h1>

        <div class="row g-3 mb-3">
          <div class="col-md-6">
            <label for="fullName" class="form-label">Full Name</label>
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
            <label for="ageGroup" class="form-label">Age Group</label>
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
            <label for="gender" class="form-label">Gender</label>
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
            <label for="counsellor" class="form-label">Counsellor</label>
            <select
              id="counsellor"
              class="form-select"
              v-model.number="form.counsellorId"
              @change="clearError('counsellor')"
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

        <div class="mb-3">
          <label for="assessment" class="form-label">Self Assessment (mental &amp; physical)</label>
          <textarea
            id="assessment"
            class="form-control"
            rows="4"
            v-model.trim="form.assessment"
            placeholder="Briefly describe how you are feeling and what you need help with..."
          ></textarea>
        </div>

        <div class="mb-4">
          <label class="form-label d-block">Appointment Date</label>
          <div class="row g-3">
            <div class="col-4">
              <select class="form-select" id="year" v-model.number="form.year" @change="clearError('year')" required>
                <option disabled :value="null">Year</option>
                <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
              </select>
              <div v-if="errors.year" class="text-danger">{{ errors.year }}</div>
            </div>
            <div class="col-4">
              <select class="form-select" id="month" v-model.number="form.month" @change="clearError('month')" required>
                <option disabled :value="null">Month</option>
                <option v-for="m in 12" :key="m" :value="m">{{ m }}</option>
              </select>
              <div v-if="errors.month" class="text-danger">{{ errors.month }}</div>
            </div>
            <div class="col-4">
              <select class="form-select" id="day" v-model.number="form.day" @change="clearError('day')" required>
                <option disabled :value="null">Day</option>
                <option v-for="d in daysInSelectedMonth" :key="d" :value="d">{{ d }}</option>
              </select>
              <div v-if="errors.day" class="text-danger">{{ errors.day }}</div>
            </div>
          </div>
        </div>

        <div class="text-center">
          <button class="btn btn-primary px-4" type="submit" :disabled="submitting || loading">
            <span v-if="submitting">Booking...</span>
            <span v-else>Make Appointment</span>
          </button>
          <button type="button" class="btn btn-outline-secondary ms-2 px-4" @click="resetForm" :disabled="submitting">
            Reset
          </button>
        </div>

        <div class="text-center mt-3">
          <small v-if="loading" class="text-muted">Loading reference data...</small>
          <small v-if="loadError" class="text-danger">Failed to load some data. Using fallback.</small>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import LogoutBar from './LogoutBar.vue'

export default {
  name: 'AppointmentForm',
  components: { LogoutBar },

  data() {
    const thisYear = new Date().getFullYear()
    return {
      loading: false,
      loadError: false,
      submitting: false,
      form: {
        fullName: '',
        ageGroup: '',
        gender: '',
        counsellorId: null,
        assessment: '',
        year: null, month: null, day: null,
      },
      errors: {},
      ageGroups: [],
      counsellors: [],
      years: [thisYear, thisYear + 1],
    }
  },

  computed: {
    daysInSelectedMonth() {
      const { year, month } = this.form
      if (!year || !month) return []
      const days = new Date(year, month, 0).getDate()
      return Array.from({ length: days }, (_, i) => i + 1)
    }
  },

  async created() {
    this.loading = true
    this.loadError = false
    try {
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
  },

  methods: {
    clearError(key) {
      if (this.errors[key]) this.$set(this.errors, key, null)
    },

    validate() {
      const errs = {}

      const name = (this.form.fullName || '').trim()
      if (!name) {
        errs.fullName = 'Full name is required'
      } else if (name.length < 2) {
        errs.fullName = 'Full name must be at least 2 characters'
      } else if (!/^[A-Za-z\s]+$/.test(name)) {
        errs.fullName = 'Full name can only contain letters and spaces'
      }

      if (!this.form.ageGroup)     errs.ageGroup   = 'Please select an age group'
      if (!this.form.gender)       errs.gender     = 'Please select a gender'
      if (!this.form.counsellorId) errs.counsellor = 'Please choose a counsellor'
      if (!this.form.year)         errs.year       = 'Please choose a year'
      if (!this.form.month)        errs.month      = 'Please choose a month'
      if (!this.form.day)          errs.day        = 'Please choose a day'

      if (!errs.year && !errs.month && !errs.day) {
        const { year, month, day } = this.form
        const appt = new Date(year, month - 1, day)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (appt < today) {
          errs.day = 'Selected date cannot be earlier than today'
        }
      }

      this.errors = errs
      return Object.keys(errs).length === 0
    },

    resetForm() {
      this.form = {
        fullName: '',
        ageGroup: '',
        gender: '',
        counsellorId: null,
        assessment: '',
        year: null, month: null, day: null,
      }
      this.errors = {}
    },

    async submitForm() {
      if (!this.validate()) return
      this.submitting = true
      try {
        const { fullName, counsellorId, year, month, day } = this.form
        const apptDate = new Date(year, month - 1, day).toISOString().slice(0, 10)
        alert(`Appointment booked successfully!\nName: ${fullName}\nCounsellor #${counsellorId}\nDate: ${apptDate}`)
        this.resetForm()
      } finally {
        this.submitting = false
      }
    },
  },
}
</script>

<style scoped>
.card { box-shadow: 0 8px 24px rgba(0,0,0,.06); }
h1 { font-size: 1.6rem; }
</style>
