"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { House, Bell, List } from "@phosphor-icons/react"
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
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
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
        <nav aria-label="Đường dẫn trang" className="flex min-w-0 items-center gap-2 text-xs font-semibold">
          <Link
            href="/"
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <House size={16} weight="bold" aria-hidden="true" />
            Trang chủ
          </Link>
          <span aria-hidden="true" className="text-muted-foreground">/</span>
          <span aria-current="page" className="truncate font-bold text-foreground">
            {pageTitle}
          </span>
        </nav>
      </div>

      {/* Right side: Notification Bell & User Avatar */}
      <div className="ml-2 flex shrink-0 items-center gap-3">
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
