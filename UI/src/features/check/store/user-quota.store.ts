import { create } from "zustand"
import { useAuthStore } from "@/store/auth.store"
import {
  getUserScamCheckQuota,
  type UserScamCheckQuota,
} from "../services/user-quota.service"

interface UserQuotaState {
  quota: UserScamCheckQuota | null
  sourceToken: string | null
  isLoading: boolean
  error: string | null
  fetchQuota: () => Promise<void>
}

let requestId = 0

export const useUserQuotaStore = create<UserQuotaState>((set, get) => ({
  quota: null,
  sourceToken: null,
  isLoading: false,
  error: null,
  fetchQuota: async () => {
    const currentRequest = ++requestId
    const token = useAuthStore.getState().token
    if (!token) {
      set({ quota: null, sourceToken: null, isLoading: false, error: null })
      return
    }
    set({
      isLoading: true,
      error: null,
      sourceToken: token,
      quota: get().sourceToken === token ? get().quota : null,
    })
    try {
      const quota = await getUserScamCheckQuota()
      if (
        currentRequest === requestId &&
        useAuthStore.getState().token === token
      ) {
        set({ quota, isLoading: false })
      }
    } catch {
      if (
        currentRequest === requestId &&
        useAuthStore.getState().token === token
      ) {
        set({ isLoading: false, error: "Chưa cập nhật được hạn mức." })
      }
    }
  },
}))
