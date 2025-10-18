import { createApp } from 'vue'
import App from './App.vue'
import './assets/main.css'
import './styles.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import router from './router'
import { createPinia } from 'pinia'
import XssDirective from './directives/XSS.js'
import './Firebase' 
import '@/assets/a11y.css'
import { setupCalendar, DatePicker } from 'v-calendar'
import 'v-calendar/style.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.directive('safe-html', XssDirective) 
app.mount('#app')
app.use(setupCalendar, {})
app.component('VDatePicker', DatePicker)