"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { MotionConfig, motion } from "motion/react"
import {
  Bell,
  ClockCounterClockwise,
  FilePlus,
  FolderSimple,
  Moon,
  Scales,
  ShieldCheck,
  SignOut,
  Sun,
  Trophy,
  X,
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

interface NavGroup {
  label: string
  hrefs: readonly string[]
}

const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: "Kiểm tra",
    hrefs: ["/user/check", "/user/history"],
  },
  {
    label: "Đóng góp & Xử lý",
    hrefs: ["/user/reports/new", "/user/reports", "/user/disputes"],
  },
  {
    label: "Cá nhân",
    hrefs: ["/user/notifications", "/user/reputation"],
  },
]

export function UserSidebar({ className, onCloseMobile }: UserSidebarProps) {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const handleLogout = useLogout()
  const { unreadCount, fetchUnreadCount } = useNotificationStore()

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true))
    return () => window.cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    fetchUnreadCount()
  }, [fetchUnreadCount])

  const activeHref = getActiveUserNavItem(pathname)?.href
  const isDark = mounted && resolvedTheme === "dark"

  const renderIcon = (iconName: UserNavItem["iconName"], isActive: boolean) => {
    const props = {
      "aria-hidden": true as const,
      size: 18,
      weight: (isActive ? "fill" : "regular") as "fill" | "regular",
      className: cn(
        "shrink-0 transition-colors duration-120",
        isActive
          ? "text-primary"
          : "text-muted-foreground group-hover:text-foreground"
      ),
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

  // Group items cleanly while preserving any future items added to USER_NAV_ITEMS
  const groupedHrefs = new Set(NAV_GROUPS.flatMap((g) => g.hrefs))
  const ungroupedItems = USER_NAV_ITEMS.filter(
    (item) => !groupedHrefs.has(item.href)
  )

  const sections = [
    ...NAV_GROUPS.map((group) => ({
      label: group.label,
      items: group.hrefs
        .map((href) => USER_NAV_ITEMS.find((item) => item.href === href))
        .filter((item): item is UserNavItem => Boolean(item)),
    })).filter((section) => section.items.length > 0),
    ...(ungroupedItems.length > 0
      ? [{ label: "Khác", items: ungroupedItems }]
      : []),
  ]

  return (
    <MotionConfig reducedMotion="user">
      <aside
        aria-label="Điều hướng cổng người dùng"
        className={cn(
          "flex h-screen w-72 shrink-0 flex-col justify-between border-r border-border/80 bg-card font-sans text-card-foreground antialiased select-none dark:border-white/10 dark:bg-sidebar",
          className
        )}
      >
        {/* Top Section: Brand + Profile/Quota + Grouped Nav */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          {/* Brand Row */}
          <div className="flex items-center justify-between gap-2 px-1 pt-1">
            <Link
              href="/user/check"
              onClick={onCloseMobile}
              className="group flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <div className="flex size-9 items-center justify-center rounded-lg border border-black/10 bg-[#0B132B] text-[#89CEFF] shadow-2xs transition-transform duration-120 group-hover:scale-[1.03] dark:border-white/15 dark:bg-primary/15 dark:text-primary">
                <ShieldCheck aria-hidden="true" size={20} weight="fill" />
              </div>
              <span className="font-heading text-base font-bold tracking-[-0.02em] text-foreground">
                ScamShield VN
              </span>
            </Link>

            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Đóng thanh điều hướng"
                className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-120 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:hidden"
              >
                <X aria-hidden="true" size={18} weight="bold" />
              </button>
            )}
          </div>

          <UserQuotaCard onNavigate={onCloseMobile} />

          {/* Grouped Tactile Navigation */}
          <nav aria-label="Menu chính" className="flex flex-col gap-4 pt-1">
            {sections.map((section) => (
              <div key={section.label} className="space-y-1">
                <p className="px-3 pb-1 text-xs font-medium text-muted-foreground/80">
                  {section.label}
                </p>

                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = item.href === activeHref
                    const rawBadge =
                      item.href === "/user/notifications"
                        ? unreadCount
                        : item.badge
                    const hasBadge =
                      Boolean(rawBadge) &&
                      !(typeof rawBadge === "number" && rawBadge <= 0)
                    const displayBadge =
                      typeof rawBadge === "number" && rawBadge > 99
                        ? "99+"
                        : rawBadge

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onCloseMobile}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "group relative flex min-h-10 items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-120 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                            isActive
                              ? "font-semibold text-foreground"
                              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:hover:bg-white/[0.05]"
                          )}
                        >
                          {isActive && (
                            <motion.span
                              layoutId="user-sidebar-active-pill"
                              transition={{
                                type: "spring",
                                stiffness: 420,
                                damping: 32,
                              }}
                              className="absolute inset-0 rounded-lg bg-muted/90 shadow-2xs ring-1 ring-border dark:bg-white/[0.08] dark:shadow-[inset_0_1px_0_rgb(255,255,255,0.08)] dark:ring-white/12"
                            />
                          )}

                          <span className="relative z-10 flex min-w-0 items-center gap-3">
                            {renderIcon(item.iconName, isActive)}
                            <span className="truncate">{item.title}</span>
                          </span>

                          {hasBadge && (
                            <span
                              className={cn(
                                "relative z-10 inline-flex min-w-5 items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                                item.badgeVariant === "danger"
                                  ? "border border-rose-500/25 bg-rose-500/12 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
                                  : "bg-primary/12 text-primary"
                              )}
                            >
                              {displayBadge}
                            </span>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom Utility Footer: Segmented Theme Switch + Logout */}
        <div className="space-y-2 border-t border-border/80 p-4 dark:border-white/10">
          {/* 2-Segment Light / Dark Switch (Claude / Railway Feel) */}
          <div
            role="group"
            aria-label="Chọn giao diện sáng hoặc tối"
            className="grid grid-cols-2 gap-1 rounded-lg border border-border/80 bg-muted/40 p-1 dark:border-white/10 dark:bg-white/[0.03]"
          >
            <button
              type="button"
              aria-pressed={mounted ? !isDark : undefined}
              onClick={() => setTheme("light")}
              className={cn(
                "relative inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors duration-120 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                mounted && !isDark
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {mounted && !isDark && (
                <motion.span
                  layoutId="user-sidebar-theme-pill"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  className="absolute inset-0 rounded-md bg-background shadow-2xs ring-1 ring-border"
                />
              )}
              <Sun
                aria-hidden="true"
                size={14}
                weight={mounted && !isDark ? "fill" : "regular"}
                className="relative z-10"
              />
              <span className="relative z-10">Sáng</span>
            </button>

            <button
              type="button"
              aria-pressed={mounted ? isDark : undefined}
              onClick={() => setTheme("dark")}
              className={cn(
                "relative inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors duration-120 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                isDark
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isDark && (
                <motion.span
                  layoutId="user-sidebar-theme-pill"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  className="absolute inset-0 rounded-md bg-card shadow-2xs ring-1 ring-white/12"
                />
              )}
              <Moon
                aria-hidden="true"
                size={14}
                weight={isDark ? "fill" : "regular"}
                className="relative z-10"
              />
              <span className="relative z-10">Tối</span>
            </button>
          </div>

          {/* Logout Action */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-rose-700 transition-colors duration-120 hover:bg-rose-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-rose-400 dark:hover:bg-rose-500/15"
          >
            <SignOut aria-hidden="true" size={17} weight="bold" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
    </MotionConfig>
  )
}
