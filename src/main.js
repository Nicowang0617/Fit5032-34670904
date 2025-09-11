import { createApp } from 'vue'
import App from './App.vue'
import './assets/main.css'
import './styles.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import router from './router'
import { createPinia } from 'pinia'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')