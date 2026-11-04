import { create } from "zustand"
import { getUnreadNotificationCount } from "../services/notification.service"

interface NotificationState {
  unreadCount: number
  isLoading: boolean
  setUnreadCount: (count: number) => void
  decrementUnreadCount: () => void
  fetchUnreadCount: () => Promise<void>
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  isLoading: false,
  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),
  decrementUnreadCount: () =>
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
  fetchUnreadCount: async () => {
    set({ isLoading: true })
    try {
      const count = await getUnreadNotificationCount()
      set({ unreadCount: Math.max(0, count), isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },
}))
