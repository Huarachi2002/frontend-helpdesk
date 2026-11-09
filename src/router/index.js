import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

// Lazy-load de vistas
const LoginView       = () => import('../views/auth/LoginView.vue')
const AppLayout       = () => import('../layouts/AppLayout.vue')
const DashboardView   = () => import('../views/helpdesk/DashboardView.vue')
const TicketListView  = () => import('../views/helpdesk/TicketListView.vue')
const TicketDetailView = () => import('../views/helpdesk/TicketDetailView.vue')
const BotHistoryView  = () => import('../views/admin/BotHistoryView.vue')
const ReportView      = () => import('../views/reports/ReportView.vue')

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { guest: true },
  },
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '',        redirect: '/dashboard' },
      { path: 'dashboard',    name: 'dashboard',     component: DashboardView },
      { path: 'tickets',      name: 'tickets',       component: TicketListView },
      { path: 'tickets/:id',  name: 'ticket-detail', component: TicketDetailView, props: true },
      { path: 'bot-history',  name: 'bot-history',   component: BotHistoryView },
      { path: 'reports',      name: 'reports',       component: ReportView },
    ],
  },
  // Captura de rutas desconocidas
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Guard de navegación global
router.beforeEach(async (to, _from, next) => {
  const auth = useAuthStore()

  // Si hay token pero no hay usuario cargado, intenta cargarlo
  if (auth.token && !auth.user) {
    try {
      await auth.fetchUser()
    } catch (_) {
      auth.logoutUser()
      return next({ name: 'login' })
    }
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return next({ name: 'login' })
  }

  if (to.meta.guest && auth.isAuthenticated) {
    return next({ name: 'dashboard' })
  }

  next()
})

export default router
