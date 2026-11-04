"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import { usePathname } from "next/navigation"
import { restoreAuthSession, useAuthStore } from "@/store/auth.store"
import { decodeJwt } from "@/lib/utils/jwtUtil"
import { UserRole } from "@/types/user"
import {
  authServices,
  RefreshTokenResult,
} from "@/features/auth/services/auth-services"

export type { RefreshTokenResult }

export function useRefreshToken() {
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)
  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const [isLoading, setIsLoading] = useState<boolean>(!token)
  const [isInitialized, setIsInitialized] = useState<boolean>(Boolean(token))
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (): Promise<RefreshTokenResult | null> => {
    setIsLoading(true)
    setError(null)

    try {
      return await authServices.refreshToken()
    } catch (err: unknown) {
      logout()
      let errMsg = "Failed to refresh token"
      let isCookieMissing = false

      if (axios.isAxiosError(err)) {
        errMsg = err.response?.data?.message || errMsg
        if (errMsg.toLowerCase().includes("cookie is missing")) {
          isCookieMissing = true
        }
      } else if (err instanceof Error) {
        errMsg = err.message
      }

      setError(errMsg)

      // Only show session expired toast if the session actually expired,
      // and avoid showing it on auth pages (login/register) or when no cookie was ever present.
      const isAuthPage =
        pathnameRef.current?.startsWith("/login") ||
        pathnameRef.current?.startsWith("/register")
      if (!isCookieMissing && !isAuthPage) {
        toast.error("Phiên đã kết thúc, vui lòng đăng nhập lại", {
          toastId: "session-expired",
          position: "top-right",
        })
      }

      return null
    } finally {
      setIsLoading(false)
      setIsInitialized(true)
    }
  }, [logout])

  useEffect(() => {
    // Only attempt initial refresh once per page lifecycle

    let isMounted = true
    async function initialize() {
      await restoreAuthSession()
      if (useAuthStore.getState().token) {
        if (isMounted) {
          setIsLoading(false)
          setIsInitialized(true)
        }
        return
      }
      await refresh()
    }
    void initialize()

    return () => {
      isMounted = false
    }
  }, [refresh])

  // Resolve role from user object or decoded token
  let role: UserRole | null = (user?.role as UserRole) || null
  if (!role && token) {
    const decoded = decodeJwt(token)
    role = (decoded?.role as UserRole) || null
  }

  return {
    token,
    user,
    role,
    isLoading,
    isInitialized,
    error,
    refresh,
  }
}
