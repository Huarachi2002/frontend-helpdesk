import { create } from 'zustand'
import {
  getNotifications,
  getUnreadCount,
  markAsRead as apiMarkAsRead,
  markAllAsRead as apiMarkAllAsRead,
  deleteNotification as apiDeleteNotification
} from '../api/notifications.js'

let pollingInterval = null

export const useNotificationsStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,

  fetchUnreadCount: async () => {
    try {
      const count = await getUnreadCount()
      set({ unreadCount: count })
      return count
    } catch (err) {
      console.error('Error al obtener conteo de notificaciones:', err)
      return get().unreadCount
    }
  },

  fetchNotifications: async (params = { limit: 15 }) => {
    set({ loading: true, error: null })
    try {
      const res = await getNotifications(params)
      set({
        notifications: res.data || [],
        unreadCount: res.unread_count ?? 0,
        loading: false
      })
    } catch (err) {
      console.error('Error al cargar notificaciones:', err)
      set({ error: err.message, loading: false })
    }
  },

  markAsRead: async (id) => {
    // Actualización optimista
    const current = get().notifications
    const target = current.find((n) => n.id === id)
    const wasUnread = target && !target.leida

    set({
      notifications: current.map((n) =>
        n.id === id ? { ...n, leida: true, fecha_leida: new Date().toISOString() } : n
      ),
      unreadCount: wasUnread ? Math.max(0, get().unreadCount - 1) : get().unreadCount,
    })

    try {
      const res = await apiMarkAsRead(id)
      if (res.unread_count !== undefined) {
        set({ unreadCount: res.unread_count })
      }
    } catch (err) {
      console.error('Error al marcar notificación como leída:', err)
    }
  },

  markAllAsRead: async () => {
    set({
      notifications: get().notifications.map((n) => ({
        ...n,
        leida: true,
        fecha_leida: new Date().toISOString(),
      })),
      unreadCount: 0,
    })

    try {
      await apiMarkAllAsRead()
    } catch (err) {
      console.error('Error al marcar todas como leídas:', err)
    }
  },

  deleteNotification: async (id) => {
    const current = get().notifications
    const target = current.find((n) => n.id === id)
    const wasUnread = target && !target.leida

    set({
      notifications: current.filter((n) => n.id !== id),
      unreadCount: wasUnread ? Math.max(0, get().unreadCount - 1) : get().unreadCount,
    })

    try {
      const res = await apiDeleteNotification(id)
      if (res.unread_count !== undefined) {
        set({ unreadCount: res.unread_count })
      }
    } catch (err) {
      console.error('Error al eliminar notificación:', err)
    }
  },

  startPolling: (intervalMs = 30000) => {
    if (pollingInterval) return
    get().fetchUnreadCount()
    pollingInterval = setInterval(() => {
      get().fetchUnreadCount()
    }, intervalMs)
  },

  stopPolling: () => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      pollingInterval = null
    }
  },
}))
