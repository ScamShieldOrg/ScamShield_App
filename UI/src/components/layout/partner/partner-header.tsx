"use client"

import Link from "next/link"
import { Bell, MagnifyingGlass, Plus, ShieldCheck, User } from "@phosphor-icons/react"
import { useAuthStore } from "@/store/auth.store"

interface PartnerHeaderProps {
  onOpenMobileMenu?: () => void
}

export function PartnerHeader({ onOpenMobileMenu }: PartnerHeaderProps) {
  const user = useAuthStore((state) => state.user)

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
      {/* Left: Breadcrumbs + Sync status */}
      <div className="flex items-center gap-3 sm:gap-4">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="md:hidden rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Mở menu"
          >
            <span className="sr-only">Menu</span>
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="hover:text-slate-900 dark:hover:text-white">B2B Portal</span>
          <span>&gt;</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {user?.email || "Đối Tác Doanh Nghiệp"}
          </span>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Đồng bộ A05 & NCSC 24/7</span>
        </div>
      </div>

      {/* Center: Search input */}
      <div className="hidden md:flex flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tra cứu IOC, Số TK, URL, nghi vấn..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
          />
        </div>
      </div>

      {/* Right: + Khẩn cấp IOC button + Notification + Profile */}
      <div className="flex items-center gap-3">
        <Link
          href="/business-partner/alerts"
          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-red-700 active:bg-red-800 transition-colors"
        >
          <Plus size={14} weight="bold" />
          <span>Khẩn cấp IOC</span>
        </Link>

        {/* Bell */}
        <button
          type="button"
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          aria-label="Thông báo"
        >
          <Bell size={18} weight="bold" />
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
        </button>

        {/* User profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="flex size-8 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-xs dark:bg-slate-700">
            {user?.email ? user.email.slice(0, 2).toUpperCase() : "VC"}
          </div>
          <div className="hidden sm:block text-left text-xs">
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {user?.email || "VCB Security Sentinel"}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <ShieldCheck size={12} weight="fill" className="text-emerald-500" />
              <span>Đối tác C1</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

