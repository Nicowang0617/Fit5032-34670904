<template>
  <div class="container d-flex justify-content-center mt-5">
    <div class="w-100" style="max-width: 1000px;">
      <AppointmentForm />
    </div>
  </div>
</template>

<script>
import AppointmentForm from "./components/AppointmentForm.vue";

export default {
  name: "App",
  components: {
    AppointmentForm
  }
};
</script>

<style>
body {
  background: #f8fafc;
}
</style>
