"use client"

import Link from "next/link"
import {
  Asterisk,
  Bell,
  List,
  MagnifyingGlass,
  User,
} from "@phosphor-icons/react"
import { useAuthStore } from "@/store/auth.store"

export function PartnerHeader({
  onOpenMobileMenu,
}: {
  onOpenMobileMenu: () => void
}) {
  const user = useAuthStore((state) => state.user)
  const account = user?.email || "Đối tác doanh nghiệp"

  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-2 border-b border-slate-200/60 bg-[#faf8ff] px-4 sm:gap-4 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex min-w-0 items-center gap-2 xl:gap-4">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Mở menu"
          aria-haspopup="dialog"
          className="grid size-9 shrink-0 place-items-center rounded-lg hover:bg-[#e9edff] lg:hidden dark:hover:bg-slate-800"
        >
          <List size={20} />
        </button>
        <div className="flex min-w-0 items-center gap-1 text-xs font-semibold">
          <span className="shrink-0 text-slate-600 dark:text-slate-300">
            B2B Portal
          </span>
          <span aria-hidden="true" className="hidden sm:inline">
            &rsaquo;
          </span>
          <span className="hidden min-w-0 truncate sm:inline" title={account}>
            {account}
          </span>
        </div>
      </div>

      <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-4">
        <div className="relative hidden w-52 lg:block xl:w-64">
          <MagnifyingGlass
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-500"
          />
          <input
            type="search"
            aria-label="Tra cứu IOC, số tài khoản, URL nghi vấn"
            placeholder="Tra cứu IOC, Số TK, URL nghi vấn..."
            className="h-10 w-full rounded-lg bg-[#f2f3ff] pr-3 pl-9 text-sm placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-ring dark:bg-slate-800 dark:placeholder:text-slate-400"
          />
        </div>
        <Link
          href="/business-partner/alerts"
          className="inline-flex h-10 shrink-0 items-center gap-1 rounded-lg bg-[#ba1a1a] px-2 text-xs font-semibold whitespace-nowrap text-white hover:bg-[#93000a] sm:px-4 sm:text-sm"
        >
          <Asterisk size={15} weight="bold" className="hidden sm:block" />
          Khẩn cấp IOC
        </Link>
        <button
          type="button"
          aria-label="Thông báo"
          className="relative grid size-8 shrink-0 place-items-center rounded-lg bg-[#e9edff] hover:bg-[#d0d9fd] sm:size-10 dark:bg-slate-800 dark:hover:bg-slate-700"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[#ba1a1a]" />
        </button>
        <div
          className="grid size-8 shrink-0 place-items-center rounded-full bg-black text-white dark:bg-slate-700"
          title={account}
        >
          <User size={15} aria-label={account} />
        </div>
      </div>
    </header>
  )
}
