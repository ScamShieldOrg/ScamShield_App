"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { House, Bell, List, User } from "@phosphor-icons/react"
import { getActiveUserNavItem } from "@/config/navigation/user-nav"
import { useNotificationStore } from "@/features/notification/store/notification.store"
import { useAuthStore } from "@/store/auth.store"

const DEFAULT_PAGE_TITLE = "Giám Sát & Phòng Vệ Số"

interface UserHeaderProps {
  onToggleMobileMenu?: () => void
}

function getInitials(email?: string | null): string | null {
  const local = (email || "").split("@")[0]?.trim()
  if (!local) return null
  const parts = local.split(/[._\-\s]+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function UserHeader({ onToggleMobileMenu }: UserHeaderProps) {
  const pathname = usePathname()
  const pageTitle = getActiveUserNavItem(pathname)?.title ?? DEFAULT_PAGE_TITLE
  const unreadCount = useNotificationStore((state) => state.unreadCount)
  const user = useAuthStore((state) => state.user)
  const initials = getInitials(user?.email)

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between bg-card px-4 sm:px-6 dark:bg-sidebar">
      {/* Left side: Mobile Menu Toggle & Breadcrumbs & Connection Badge */}
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="inline-flex min-h-10 min-w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-black/10 bg-card text-foreground shadow-2xs transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:hidden dark:border-white/10"
          aria-label="Mở thanh điều hướng"
        >
          <List aria-hidden="true" size={20} weight="bold" />
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

      {/* Right side: Notification Bell & User Avatar */ }
  <div className="ml-2 flex shrink-0 items-center gap-3">
    {/* Notification Bell */}
    <Link
      href="/user/notifications"
      className="relative inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      aria-label={
        unreadCount > 0
          ? `Thông báo (${unreadCount} chưa đọc)`
          : "Thông báo"
      }
    >
      <Bell aria-hidden="true" size={18} weight="bold" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 inline-flex min-h-4.5 min-w-4.5 items-center justify-center rounded-full border border-rose-500/30 bg-rose-600 px-1 text-xs leading-none font-bold text-white tabular-nums">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>

    <Link
      href="/user/profile"
      className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-black/10 bg-primary font-heading text-xs font-bold text-primary-foreground shadow-2xs transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/12"
      aria-label="Hồ sơ người dùng"
      title={user?.email || "Hồ sơ người dùng"}
    >
      {initials ? (
        <span>{initials}</span>
      ) : (
        <User aria-hidden="true" size={17} weight="bold" />
      )}
    </Link>
  </div>
    </header >
  )
}
