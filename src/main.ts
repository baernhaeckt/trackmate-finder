// Import our custom CSS
import './scss/styles.scss'

import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import router from './router'


// Import all of Bootstrap's JS
import 'bootstrap/dist/js/bootstrap.bundle.min'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
