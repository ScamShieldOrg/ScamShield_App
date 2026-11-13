"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  ShieldCheck,
  ClockCounterClockwise,
  FilePlus,
  FolderSimple,
  Scales,
  Bell,
  Trophy,
  CaretRight,
  SignOut,
  Sun,
  Moon,
} from "@phosphor-icons/react"
import {
  USER_NAV_ITEMS,
  UserNavItem,
  getActiveUserNavItem,
} from "@/config/navigation/user-nav"
import { useLogout } from "@/hooks/use-logout"
import { useNotificationStore } from "@/features/notification/store/notification.store"
import { cn } from "@/lib/utils"
import { UserQuotaCard } from "./user-quota-card"

interface UserSidebarProps {
  className?: string
  onCloseMobile?: () => void
}

export function UserSidebar({ className, onCloseMobile }: UserSidebarProps) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const handleLogout = useLogout()
  const { unreadCount, fetchUnreadCount } = useNotificationStore()

  useEffect(() => {
    fetchUnreadCount()
  }, [fetchUnreadCount])

  // Only the most specific matching nav item is highlighted
  const activeHref = getActiveUserNavItem(pathname)?.href

  const renderIcon = (iconName: UserNavItem["iconName"], isActive: boolean) => {
    const props = {
      size: 18,
      weight: (isActive ? "fill" : "regular") as "fill" | "regular",
      className: isActive
        ? "text-white dark:text-primary-foreground"
        : "text-[#45464D] dark:text-muted-foreground",
    }

    switch (iconName) {
      case "ShieldCheck":
        return <ShieldCheck {...props} />
      case "ClockCounterClockwise":
        return <ClockCounterClockwise {...props} />
      case "FilePlus":
        return <FilePlus {...props} />
      case "FolderSimple":
        return <FolderSimple {...props} />
      case "Scales":
        return <Scales {...props} />
      case "Bell":
        return <Bell {...props} />
      case "Trophy":
        return <Trophy {...props} />
      default:
        return <ShieldCheck {...props} />
    }
  }

  return (
    <aside
      className={cn(
        "flex h-screen w-72 shrink-0 flex-col justify-between border-r border-[#C6C6CE]/40 bg-white select-none dark:border-border dark:bg-card",
        className
      )}
    >
      {/* Top Section: Brand & Profile & Nav */}
      <div className="flex flex-col gap-4 overflow-y-auto p-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5 px-2 pt-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-[#0B132B] text-[#89CEFF] shadow-xs dark:bg-primary dark:text-primary-foreground">
            <ShieldCheck size={22} weight="fill" />
          </div>
          <span className="font-heading text-lg font-bold tracking-tight text-[#131B2E] dark:text-foreground">
            ScamShield VN
          </span>
        </div>

        <UserQuotaCard />

        {/* Navigation Menu */}
        <nav className="flex flex-col gap-1 pt-1">
          {USER_NAV_ITEMS.map((item) => {
            const isActive = item.href === activeHref

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold transition-all",
                  isActive
                    ? "bg-[#0B132B] text-white shadow-xs dark:bg-primary dark:text-primary-foreground"
                    : "text-[#45464D] hover:bg-[#F2F3FF] hover:text-[#131B2E] dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2.5">
                  {renderIcon(item.iconName, isActive)}
                  <span>{item.title}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {(() => {
                    const badge =
                      item.href === "/user/notifications"
                        ? unreadCount
                        : item.badge
                    if (!badge) return null
                    if (typeof badge === "number" && badge <= 0) return null
                    const displayBadge =
                      typeof badge === "number" && badge > 99 ? "99+" : badge
                    return (
                      <span
                        className={cn(
                          "py-0.2 rounded-full px-1.5 text-[10px] font-bold text-white",
                          item.badgeVariant === "danger"
                            ? "bg-[#BA1A1A]"
                            : "bg-primary"
                        )}
                      >
                        {displayBadge}
                      </span>
                    )
                  })()}
                  {isActive && (
                    <CaretRight
                      size={12}
                      weight="bold"
                      className="text-white/80 dark:text-primary-foreground/80"
                    />
                  )}
                </div>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Bottom Section: Theme Switch & Logout */}
      <div className="space-y-2 border-t border-[#C6C6CE]/30 p-4 dark:border-border">
        {/* Dark/Light toggle switch */}
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-[#45464D] transition-colors hover:bg-[#F2F3FF] hover:text-[#131B2E] dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground"
        >
          <div className="flex items-center gap-2">
            <Sun size={16} weight="bold" className="hidden dark:block" />
            <Moon size={16} weight="bold" className="block dark:hidden" />
            <span>{theme === "dark" ? "Giao diện tối" : "Giao diện sáng"}</span>
          </div>
          <div className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-[#D1DE36]/30 transition-colors duration-200 ease-in-out dark:bg-muted">
            <span
              className={cn(
                "pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                theme === "dark" ? "translate-x-4 bg-primary" : "translate-x-0"
              )}
            />
          </div>
        </button>

        {/* Secure Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-[#BA1A1A] transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
        >
          <SignOut size={16} weight="bold" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  )
}
