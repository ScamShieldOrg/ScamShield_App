import { User } from "@/types/user"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { decodeJwt } from "@/lib/utils/jwtUtil"

type AuthState = {
  token: string | null
  user: User | null
  setToken: (token: string | null) => void
  setUser: (user: User | null) => void
  clearUser: () => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null, token: null }),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: "scamshield-auth-session",
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
)

export async function restoreAuthSession(): Promise<void> {
  if (!useAuthStore.persist.hasHydrated()) {
    try {
      await useAuthStore.persist.rehydrate()
    } catch {
      // Storage may be unavailable; the caller can still restore via the refresh cookie.
    }
  }
  const { token, clearUser } = useAuthStore.getState()
  if (token) {
    const payload = decodeJwt(token)
    if (
      !payload ||
      typeof payload.exp !== "number" ||
      payload.exp <= Date.now() / 1000
    ) {
      clearUser()
    }
  }
}
