import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // 引入路由配置
import pinia from './stores'

import './style.css'
import './tailwindcss.css'
import './demos/ipc'
// If you want use Node.js, the`nodeIntegration` needs to be enabled in the Main process.
// import './demos/node'

createApp(App)
  .use(pinia)
  .use(router) // 使用路由配置
  .mount('#app')
  .$nextTick(() => {
    postMessage({ payload: 'removeLoading' }, '*')
  })