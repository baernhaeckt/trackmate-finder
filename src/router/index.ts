import { createRouter, createWebHistory } from 'vue-router'
import PathFinder from '../views/PathFinder.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'pathfinder',
      component: PathFinder
    },
    {
      path: '/observer',
      name: 'observer',
      component: () => import('../views/Observer.vue')
    }
  ]
})

export default router
