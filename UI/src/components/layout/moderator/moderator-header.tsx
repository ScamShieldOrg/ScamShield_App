"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShieldCheck, Bell, SignOut } from "@phosphor-icons/react"
import { useLogout } from "@/hooks/use-logout"
import { authServices } from "@/features/auth/services/auth-services"
import { useAuthStore } from "@/store/auth.store"

interface ModeratorHeaderProps {
  className?: string
}

export function ModeratorHeader({ className = "" }: ModeratorHeaderProps) {
  const pathname = usePathname()
  const handleLogout = useLogout()
  const user = useAuthStore(state => state.user)
  const token = useAuthStore(state => state.token)
  const [profile, setProfile] = useState<{ token: string; data: Awaited<ReturnType<typeof authServices.getCurrentProfile>> } | null>(null)

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    void authServices.getCurrentProfile(controller.signal).then(result => {
      if (!controller.signal.aborted) setProfile({ token, data: result })
    }).catch(() => {
      if (!controller.signal.aborted) setProfile(null)
    })
    return () => controller.abort()
  }, [token])

  const currentProfile = profile?.token === token ? profile?.data : null
  const accountName = currentProfile?.fullName?.trim() || currentProfile?.username || currentProfile?.email || user?.email || "Chưa tải được tài khoản"
  const role = currentProfile?.role ?? user?.role
  const roleLabel = role === "ADMINISTRATOR" ? "Quản trị viên" : "Kiểm duyệt viên"
  const initials = Array.from((currentProfile?.fullName?.trim() || currentProfile?.username || currentProfile?.email || user?.email || "").trim()).slice(0, 2).join("").toLocaleUpperCase("vi-VN")

  const isReportsActive =
    pathname?.includes("/moderator/reports")
  const isDisputesActive = pathname?.includes("/moderator/disputes")
  const isPartnersActive = pathname?.includes("/moderator/indicators")

  return (
    <header
      className={`w-full border-b border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      <div className="mx-auto flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand + Navigation Tabs */}
        <div className="flex items-center gap-8">
          {/* Brand Logo */}
          <Link href="/moderator" className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-slate-950 text-emerald-400 shadow-sm dark:bg-emerald-500 dark:text-slate-950">
              <ShieldCheck size={22} weight="fill" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  ScamShield
                </span>
                <span className="rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300">
                  PORTAL B2B
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                GovTech & A05 Secured
              </p>
            </div>
          </Link>

          {/* Navigation Tabs */}
          <nav className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 p-1 md:flex dark:border-slate-800 dark:bg-slate-800/80">
            <Link href="/moderator" aria-current={pathname === "/moderator" ? "page" : undefined}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold ${pathname === "/moderator" ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-slate-600 dark:text-slate-300"}`}>
              Tổng quan
            </Link>
            <Link
              href="/moderator/reports"
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                isReportsActive
                  ? "bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Xử lý báo cáo
            </Link>
            <Link
              href="/moderator/disputes"
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                isDisputesActive
                  ? "bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Hàng chờ khiếu nại
            </Link>
            <Link
              href="/moderator/indicators"
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                isPartnersActive
                  ? "bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Thẩm định đối tác
            </Link>
          </nav>
        </div>

        {/* Right: Sync Status & Officer Profile */}
        <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <button
            type="button"
            className="relative flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            title="Thông báo kiểm duyệt"
          >
            <Bell size={18} weight="bold" />
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-2.5 pl-1">
            <div className="flex size-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white ring-2 ring-slate-200 dark:bg-slate-700 dark:ring-slate-800">
              {initials || "—"}
            </div>
            <div className="hidden text-left lg:block">
              <div className="max-w-56 truncate text-xs font-bold text-slate-900 dark:text-white" title={accountName}>
                {accountName}
              </div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {roleLabel}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Bạn có muốn đăng xuất?")) {
                  void handleLogout()
                }
              }}
              className="ml-1 inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label="Đăng xuất khỏi tài khoản kiểm duyệt"
            >
              <SignOut size={15} weight="bold" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
