import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/project'
  },
  {
    path: '/project',
    name: 'Project',
    component: () => import('../pages/project/index.vue')
  },
  // 可以在这里添加更多的路由
]

const router = createRouter({
  history: createWebHashHistory(), // electron 必须使用 hash 模式
  routes
})

export default router 