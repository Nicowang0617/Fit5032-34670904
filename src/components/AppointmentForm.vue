<template>
  <div class="d-flex justify-content-center align-items-start mt-5">
    <div style="width: 100%; max-width: 1000px;">
      <form class="appointment-form card p-4" @submit.prevent="submitForm">
        <h1 class="text-center mb-4">Make an Appointment with Certified Counsellors</h1>

        <div class="row g-3 mb-3">
          <div class="col-md-6">
            <label for="fullName" class="form-label">Full Name</label>
            <input
              id="fullName"
              type="text"
              class="form-control"
              v-model.trim="form.fullName"
              placeholder="Enter your full name"
            />
            <div v-if="errors.fullName" class="text-danger">{{ errors.fullName }}</div>
          </div>

          <div class="col-md-6">
            <label for="ageGroup" class="form-label">Age Group</label>
            <select
              id="ageGroup"
              class="form-select"
              v-model="form.ageGroup"
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
            <select id="gender" class="form-select" v-model="form.gender">
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
              v-model="form.counsellorId"
            >
              <option disabled value="">Select</option>
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
              <select class="form-select" id="year" v-model.number="form.year">
                <option disabled :value="null">Year</option>
                <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
              </select>
              <div v-if="errors.year" class="text-danger">{{ errors.year }}</div>
            </div>
            <div class="col-4">
              <select class="form-select" id="month" v-model.number="form.month">
                <option disabled :value="null">Month</option>
                <option v-for="m in 12" :key="m" :value="m">{{ m }}</option>
              </select>
              <div v-if="errors.month" class="text-danger">{{ errors.month }}</div>
            </div>
            <div class="col-4">
              <select class="form-select" id="day" v-model.number="form.day">
                <option disabled :value="null">Day</option>
                <option v-for="d in daysInSelectedMonth" :key="d" :value="d">{{ d }}</option>
              </select>
              <div v-if="errors.day" class="text-danger">{{ errors.day }}</div>
            </div>
          </div>
        </div>

        <div class="text-center">
          <button class="btn btn-primary px-4" type="submit">Make Appointment</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
export default {
  name: "AppointmentForm",
  data() {
    const thisYear = new Date().getFullYear();
    return {
      form: {
        fullName: "",
        ageGroup: "",     
        gender: "",
        counsellorId: "",
        assessment: "",
        year: null, month: null, day: null
      },
      errors: {},
      ageGroups: [],       
      counsellors: [],    
      years: [thisYear, thisYear + 1]
    };
  },
  computed: {
    daysInSelectedMonth() {
      const { year, month } = this.form;
      if (!year || !month) return [];
      const days = new Date(year, month, 0).getDate();
      return Array.from({ length: days }, (_, i) => i + 1);
    }
  },
  async created() {

    try {
      const res = await fetch("/age-groups.json");   
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
 
      this.ageGroups = Array.isArray(data) ? data : (data.ageGroups || []);
      console.log("Loaded ageGroups:", this.ageGroups);
    } catch (e) {
      console.warn("Failed to load /age-groups.json, using fallback.", e);

      const res = await fetch("/age-groups.json");
      this.ageGroups = await res.json();
    }

    try {
      const c = await fetch("/counsellors.json").then(r => r.json());
      this.counsellors = Array.isArray(c) ? c : (c.counsellors || []);
    } catch {
      this.counsellors = [
        { id: 1, name: "Bill Johnson" },
        { id: 2, name: "Sam Lee" },
        { id: 3, name: "Julia Smith" }
      ];
    }
  },
  methods: {
    validate() {
      this.errors = {};
      if (!this.form.fullName) {
        this.errors.fullName = "Full name is required";}       
          else if (/\d/.test(this.form.fullName)) {
            this.errors.fullName = "Full name cannot contain numbers";}
          else if (!/^[A-Za-z\s]+$/.test(this.form.fullName)) {
            this.errors.fullName = "Full name can only contain letters and spaces";}
      if (!this.form.ageGroup)       this.errors.ageGroup   = "Please select an age group";
      if (!this.form.gender)         this.errors.gender     = "Please select a gender";
      if (!this.form.counsellorId)   this.errors.counsellor = "Please choose a counsellor";
      if (!this.form.year)           this.errors.year       = "Please choose a year";
      if (!this.form.month)          this.errors.month      = "Please choose a month";
      if (!this.form.day)            this.errors.day        = "Please choose a day";
      return Object.keys(this.errors).length === 0;
    },
    submitForm() {
  if (!this.validate()) return;

  const { year, month, day } = this.form;
  const appointmentDate = new Date(year, month - 1, day); 
  const today = new Date();
  today.setHours(0, 0, 0, 0); 

  if (appointmentDate < today) {
    alert("Appointment failed: the selected date is earlier than today.");
    return;
  }

  alert("Appointment booked successfully!");}
}
}
</script>