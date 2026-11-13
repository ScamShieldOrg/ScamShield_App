"use client"
import { useEffect } from "react"
import { useAuthStore } from "@/store/auth.store"
import { useNotificationStore } from "@/features/notification/store/notification.store"
import {
  getUnreadNotificationCount,
  listenForNotificationChanges,
} from "@/features/notification/services/notification.service"

export function NotificationRealtime() {
  const userId = useAuthStore((state) => state.user?.userId)
  const token = useAuthStore((state) => state.token)
  useEffect(() => {
    return () => useNotificationStore.getState().setUnreadCount(0)
  }, [userId])
  useEffect(() => {
    if (!userId || !token) return
    const controller = new AbortController()
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    let retryDelay = 1000
    let refreshing = false
    let changedAgain = false
    const refresh = async () => {
      if (refreshing) {
        changedAgain = true
        return
      }
      refreshing = true
      do {
        changedAgain = false
        useNotificationStore.getState().invalidate()
        try {
          const count = await getUnreadNotificationCount()
          if (active) useNotificationStore.getState().setUnreadCount(count)
        } catch {
          /* Retain the current badge on a temporary error. */
        }
      } while (active && changedAgain)
      refreshing = false
    }
    const connect = async () => {
      void refresh()
      try {
        await listenForNotificationChanges(controller.signal, () => {
          if (active) {
            retryDelay = 1000
            void refresh()
          }
        })
      } catch {
        /* Authentication is handled by the central API interceptor. */
      }
      if (active) {
        timer = setTimeout(() => void connect(), retryDelay)
        retryDelay = Math.min(retryDelay * 2, 15000)
      }
    }
    void connect()
    return () => {
      active = false
      controller.abort()
      clearTimeout(timer)
    }
  }, [userId, token])
  return null
}
