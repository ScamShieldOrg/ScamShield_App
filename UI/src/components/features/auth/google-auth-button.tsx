"use client"

import { useEffect, useEffectEvent, useRef, useState } from "react"
import { toast } from "react-toastify"
import { loadGoogleIdentityScript, getGoogleClientId } from "@/lib/google/google-auth"
import { cn } from "@/lib/utils"

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M18.171 8.368h-.67V8.333H10v3.334h4.709A5.002 5.002 0 0 1 5 10a5 5 0 0 1 5-5c1.275 0 2.434.48 3.317 1.266l2.357-2.357A8.295 8.295 0 0 0 10 1.667a8.333 8.333 0 1 0 8.171 6.7Z"
        fill="#FFC107"
      />
      <path
        d="M2.628 6.121 5.366 8.13A5.002 5.002 0 0 1 10 5c1.275 0 2.434.48 3.317 1.266l2.357-2.357A8.295 8.295 0 0 0 10 1.667a8.329 8.329 0 0 0-7.372 4.454Z"
        fill="#FF3D00"
      />
      <path
        d="M10 18.333a8.294 8.294 0 0 0 5.587-2.163l-2.579-2.183A4.963 4.963 0 0 1 10 15a5.001 5.001 0 0 1-4.701-3.306l-2.72 2.095A8.327 8.327 0 0 0 10 18.333Z"
        fill="#4CAF50"
      />
      <path
        d="M18.171 8.368H17.5V8.333H10v3.334h4.71a5.018 5.018 0 0 1-1.703 2.32l.001-.001 2.58 2.183C15.404 16.336 18.333 14.167 18.333 10c0-.567-.056-1.12-.162-1.632Z"
        fill="#1976D2"
      />
    </svg>
  )
}

interface GoogleAuthButtonProps {
  onSuccess: (credential: string) => void
  onError?: (error?: string) => void
  text?: "signin_with" | "signup_with" | "continue_with" | "signin"
  label?: string
  isLoading?: boolean
  disabled?: boolean
  className?: string
}

export function GoogleAuthButton({
  onSuccess,
  onError,
  text = "signin_with",
  label,
  isLoading = false,
  disabled = false,
  className,
}: GoogleAuthButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isGisReady, setIsGisReady] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const clientId = getGoogleClientId()
  const handleCredential = useEffectEvent((response: { credential: string }) => {
    if (disabled || isLoading) return
    if (response.credential) onSuccess(response.credential)
    else onError?.("Không nhận được chứng thực từ Google.")
  })
  const handleInitError = useEffectEvent(() => {
    onError?.("Không thể kết nối Google. Vui lòng tải lại trang.")
  })

  useEffect(() => {
    let mounted = true

    async function initGis() {
      if (!clientId) {
        return
      }

      try {
        await loadGoogleIdentityScript()
        if (!mounted || !window.google?.accounts?.id || !containerRef.current) return

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: { credential: string }) => {
            if (mounted) handleCredential(response)
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        })

        // Render Google GIS button into our container
        if (containerRef.current) {
          containerRef.current.innerHTML = ""
          window.google.accounts.id.renderButton(containerRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            text,
            shape: "rectangular",
            logo_alignment: "left",
            width: 400,
            locale: "vi",
          })
          setIsGisReady(true)
        }
      } catch {
        if (mounted) handleInitError()
      }
    }

    initGis()

    return () => {
      mounted = false
      window.google?.accounts.id.cancel()
    }
  }, [clientId, text])

  function handleFallbackClick() {
    if (!clientId) {
      toast.error(
        "Chưa cấu hình NEXT_PUBLIC_GOOGLE_CLIENT_ID trong biến môi trường. Vui lòng cấu hình Google OAuth 2.0 Client ID để sử dụng."
      )
      return
    }

    if (!isGisReady) toast.info("Đang tải đăng nhập Google. Vui lòng thử lại.")
  }

  const defaultLabel = text === "signup_with" ? "Đăng ký bằng Google" : "Đăng nhập với Google"

  return (
    <div
      className={cn("relative w-full cursor-pointer select-none", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ cursor: "pointer" }}
    >
      {/* 1. Custom Button matching the exact Google Outline Pill Style in user's image */}
      <div
        className={cn(
          "flex h-12 w-full items-center justify-center gap-3 rounded-xl border",
          "border-[#747775] bg-white text-[#1f1f1f] shadow-sm",
          "transition-all duration-200 cursor-pointer select-none",
          isHovered
            ? "bg-[#F8FAFD] border-[#1f1f1f] shadow-md"
            : "bg-white border-[#747775]",
          "active:scale-[0.99]",
          (disabled || isLoading) && "pointer-events-none opacity-70",
          "dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-muted/80"
        )}
        style={{ cursor: "pointer" }}
      >
        {isLoading ? (
          <span className="size-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700 dark:border-slate-600 dark:border-t-white" />
        ) : (
          <GoogleIcon className="size-5 shrink-0" />
        )}
        <span
          className="text-[15px] font-semibold tracking-normal text-[#1f1f1f] dark:text-foreground cursor-pointer select-none"
          style={{ cursor: "pointer" }}
        >
          {isLoading ? "Đang kết nối..." : (label || defaultLabel)}
        </span>
      </div>

      {/* 2. Invisible Google GIS Container overlaying on top to reliably capture clicks */}
      <div
        ref={containerRef}
        onClick={handleFallbackClick}
        className={cn(
          "absolute inset-0 z-20 h-full w-full cursor-pointer overflow-hidden",
          "opacity-0 hover:opacity-[0.0001]",
          "[&>div]:!h-full [&>div]:!w-full [&>div]:!cursor-pointer",
          "[&>div>iframe]:!h-full [&>div>iframe]:!w-full [&>div>iframe]:!cursor-pointer",
          (disabled || isLoading) && "pointer-events-none"
        )}
        style={{ cursor: "pointer" }}
      />
    </div>
  )
}
