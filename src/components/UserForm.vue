<template>
  <div class="container mt-5">
    <div class="form-wrapper">
      <h1 class="text-center">User Information Form</h1>

      <form class="form" @submit.prevent="submitForm">
        <div class="row mb-3">
          <div class="col-md-6">
            <label for="username" class="form-label">Username</label>
            <input
              id="username"
              type="text"
              class="form-control"
              :class="{ 'is-invalid': errors.username }"
              v-model="formData.username"
              @blur="() => validateName(true)"
              @input="() => validateName(false)"
              :aria-invalid="!!errors.username"
            />
            <div v-if="errors.username" class="text-danger">{{ errors.username }}</div>
          </div>

          <div class="col-md-6">
            <label for="password" class="form-label">Password</label>
            <input
              id="password"
              type="password"
              class="form-control"
              :class="{ 'is-invalid': errors.password }"
              v-model="formData.password"
              @blur="() => validatePassword(true)"
              @input="() => validatePassword(false)"
              :aria-invalid="!!errors.password"
            />
            <div v-if="errors.password" class="text-danger">{{ errors.password }}</div>
          </div>
        </div>

        <div class="row mb-3">
          <div class="col-md-6">
            <label for="ageGroup" class="form-label">Age Group</label>
            <select
              id="ageGroup"
              class="form-select"
              :class="{ 'is-invalid': errors.ageGroup }"
              v-model="formData.ageGroup"
              :aria-invalid="!!errors.ageGroup"
            >
              <option disabled value="">Select age group</option>
              <option v-for="opt in ageGroups" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <div v-if="errors.ageGroup" class="text-danger">{{ errors.ageGroup }}</div>
            <small v-if="loadingAges" class="text-muted d-block mt-1">Loading age groups…</small>
            <small v-if="ageLoadError" class="text-danger d-block mt-1">{{ ageLoadError }}</small>
          </div>

          <div class="col-md-6">
            <label for="gender" class="form-label">Gender</label>
            <select
              id="gender"
              class="form-select"
              :class="{ 'is-invalid': errors.gender }"
              v-model="formData.gender"
              :aria-invalid="!!errors.gender"
            >
              <option disabled value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            <div v-if="errors.gender" class="text-danger">{{ errors.gender }}</div>
          </div>
        </div>

        <div class="mb-3">
          <label for="reason" class="form-label">Reason for joining</label>
          <textarea
            id="reason"
            rows="3"
            class="form-control"
            v-model="formData.reason"
          ></textarea>
        </div>

        <div class="text-center">
          <button type="submit" class="btn btn-primary me-2">Submit</button>
          <button type="button" class="btn btn-secondary" @click="clearForm">Clear</button>
        </div>
      </form>
    </div>
  </div>

  <div class="row mt-5" v-if="submittedCards.length">
    <div class="d-flex flex-wrap justify-content-start">
      <div
        v-for="(card, index) in submittedCards"
        :key="index"
        class="card m-2"
        style="width: 18rem;"
      >
        <div class="card-header">User Information</div>
        <ul class="list-group list-group-flush">
          <li class="list-group-item">Username: {{ card.username }}</li>
          <li class="list-group-item">Password: {{ card.password }}</li>
          <li class="list-group-item">Age Group: {{ card.ageGroup || '-' }}</li>
          <li class="list-group-item">Gender: {{ card.gender }}</li>
          <li class="list-group-item">Reason: {{ card.reason }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const formData = ref({
  username: '',
  password: '',
  ageGroup: '',
  gender: '',
  reason: ''
})

const submittedCards = ref([])

const ageGroups = ref([])
const loadingAges = ref(false)
const ageLoadError = ref('')

onMounted(async () => {
  loadingAges.value = true
  ageLoadError.value = ''
  try {
    const res = await fetch('/ages-groups.json')
    if (!res.ok) throw new Error('Failed to load age groups.')
    ageGroups.value = await res.json()
  } catch (err) {
    ageLoadError.value = 'Could not load age groups.'

    ageGroups.value = [
      { value: '0-4', label: '0–4' },
      { value: '5-9', label: '5–9' },
      { value: '10-14', label: '10–14' },
      { value: '15-19', label: '15–19' },
      { value: '20-24', label: '20–24' },
      { value: '25-29', label: '25–29' },
      { value: '30-34', label: '30–34' },
      { value: '35-39', label: '35–39' },
      { value: '40-44', label: '40–44' },
      { value: '45-49', label: '45–49' }
    ]
    console.error(err)
  } finally {
    loadingAges.value = false
  }
})

const errors = ref({
  username: null,
  password: null,
  ageGroup: null,
  gender: null,
  reason: null
})

const validateName = (blur) => {
  if (formData.value.username.trim().length < 3) {
    if (blur) errors.value.username = 'Name must be at least 3 characters'
  } else {
    errors.value.username = null
  }
}

const validatePassword = (blur) => {
  const password = formData.value.password
  const minLength = 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSpecialChar = /[!@#$^&*(),.?":{}|<>]/.test(password)

  if (password.length < minLength) {
    if (blur) errors.value.password = `Password must be at least ${minLength} characters long.`
  } else if (!hasUppercase) {
    if (blur) errors.value.password = 'Password must contain at least one uppercase letter.'
  } else if (!hasLowercase) {
    if (blur) errors.value.password = 'Password must contain at least one lowercase letter.'
  } else if (!hasNumber) {
    if (blur) errors.value.password = 'Password must contain at least one number.'
  } else if (!hasSpecialChar) {
    if (blur) errors.value.password = 'Password must contain at least one special character.'
  } else {
    errors.value.password = null
  }
}

const validateRequired = () => {
  errors.value.ageGroup = formData.value.ageGroup ? null : 'Please select age group.'
  errors.value.gender = formData.value.gender ? null : 'Please select gender.'
}

const submitForm = () => {
  validateName(true)
  validatePassword(true)
  validateRequired()
  if (!errors.value.username && !errors.value.password && !errors.value.ageGroup && !errors.value.gender) {
    submittedCards.value.push({ ...formData.value })
    clearForm()
  }
}

const clearForm = () => {
  formData.value = {
    username: '',
    password: '',
    ageGroup: '',
    gender: '',
    reason: ''
  }
  errors.value = {
    username: null,
    password: null,
    ageGroup: null,
    gender: null,
    reason: null
  }
}
</script>
