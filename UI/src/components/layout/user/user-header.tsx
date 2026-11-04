"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { House, Warning, Bell, List } from "@phosphor-icons/react"
import { getActiveUserNavItem } from "@/config/navigation/user-nav"
import { useNotificationStore } from "@/features/notification/store/notification.store"

const DEFAULT_PAGE_TITLE = "Giám Sát & Phòng Vệ Số"

interface UserHeaderProps {
  onToggleMobileMenu?: () => void
}

export function UserHeader({ onToggleMobileMenu }: UserHeaderProps) {
  const pathname = usePathname()
  const pageTitle = getActiveUserNavItem(pathname)?.title ?? DEFAULT_PAGE_TITLE
  const unreadCount = useNotificationStore((state) => state.unreadCount)

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#C6C6CE]/40 bg-[#FAF8FF]/90 px-4 backdrop-blur-md sm:px-6 dark:border-border dark:bg-background/90">
      {/* Left side: Mobile Menu Toggle & Breadcrumbs & Connection Badge */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="flex size-9 items-center justify-center rounded-lg border border-[#C6C6CE]/60 text-[#45464D] hover:bg-[#F2F3FF] md:hidden dark:border-border dark:text-muted-foreground dark:hover:bg-muted"
          aria-label="Mở thanh điều hướng"
        >
          <List size={20} weight="bold" />
        </button>

        {/* Breadcrumb path */}
        <div className="flex items-center gap-2 text-xs font-semibold p-10">
          <Link
            href="/user"
            className="flex items-center gap-1.5 text-[#45464D] hover:text-[#131B2E] dark:text-muted-foreground dark:hover:text-foreground"
          >
            <House size={15} weight="bold" />
            <span className="hidden sm:inline">Cổng Người Dùng</span>
          </Link>
          <span className="text-[#C6C6CE]">/</span>
          <span className="max-w-[140px] truncate font-bold text-[#131B2E] sm:max-w-none dark:text-foreground">
            {pageTitle}
          </span>
        </div>
      </div>

      {/* Right side: Quick Action Button & Notification Bell & User Avatar */}
      <div className="flex items-center gap-3">
        {/* Quick Alert CTA */}
        <Link
          href="/user/reports/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFDAD6] px-3 py-1.5 text-xs font-bold text-[#93000A] shadow-xs transition-all hover:bg-[#FFDAD6]/80 active:scale-95 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-950/80"
        >
          <Warning size={15} weight="fill" />
          <span className="xs:inline hidden">Tạo Cảnh Báo Nhanh</span>
        </Link>

        {/* Notification Bell */}
        <Link
          href="/user/notifications"
          className="relative flex size-9 items-center justify-center rounded-lg text-[#45464D] hover:bg-[#F2F3FF] hover:text-[#131B2E] dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground"
          aria-label="Thông báo"
        >
          <Bell size={18} weight="bold" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[#BA1A1A] ring-2 ring-[#FAF8FF] dark:ring-background" />
          )}
        </Link>

        {/* User Avatar Circle */}
        <Link
          href="/user/profile"
          className="flex size-9 items-center justify-center rounded-full bg-[#131A33] font-heading text-xs font-bold text-white shadow-xs ring-2 ring-white/80 hover:opacity-90 dark:ring-border"
          aria-label="Hồ sơ người dùng"
        >
          HV
        </Link>
      </div>
    </header>
  )
}
