import { User } from "@/types/user"
import { create } from "zustand"
import { decodeJwt } from "@/lib/utils/jwtUtil"

type AuthState = {
  token: string | null
  user: User | null
  setToken: (token: string | null) => void
  setUser: (user: User | null) => void
  clearUser: () => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  token: null,
  user: null,
  setToken: (token) => set({ token }),
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null, token: null }),
  logout: () => set({ user: null, token: null }),
}))

export async function restoreAuthSession(): Promise<void> {
  // Remove sensitive state persisted by earlier versions; reload uses the HttpOnly cookie.
  try {
    if (typeof sessionStorage !== "undefined")
      sessionStorage.removeItem("scamshield-auth-session")
  } catch {
    // Browser storage can be disabled; authentication does not depend on it.
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
