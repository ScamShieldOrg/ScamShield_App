"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Article,
  ClockCounterClockwise,
  Flag,
  Gauge,
  Robot,
  SealCheck,
  SignOut,
  Tag,
  Users,
} from "@phosphor-icons/react"
import {
  ADMIN_NAV_ITEMS,
  getActiveAdminNavItem,
} from "@/config/navigation/admin-nav"
import { cn } from "@/lib/utils"
import { useLogout } from "@/hooks/use-logout"

const icons = {
  Users,
  Tag,
  SealCheck,
  Flag,
  Article,
  Robot,
  Gauge,
  ClockCounterClockwise,
}

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const active = getActiveAdminNavItem(usePathname())
  const logout = useLogout()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await logout()
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-card px-3 py-6 text-card-foreground">
      <Link
        href="/admin"
        onClick={onNavigate}
        className="mb-8 flex items-center gap-3 rounded-lg px-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
          <Users size={20} weight="fill" aria-hidden="true" />
        </span>
        <span>
          <span className="block font-heading text-sm font-bold">
            Quản trị viên
          </span>
          <span className="text-[11px] text-muted-foreground">
            ScamShield VN
          </span>
        </span>
      </Link>
      <nav aria-label="Điều hướng quản trị" className="space-y-1">
        {ADMIN_NAV_ITEMS.map((item) => {
          const Icon = icons[item.iconName]
          const selected = active?.href === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={selected ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                selected
                  ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              )}
            >
              <Icon
                size={17}
                weight={selected ? "fill" : "regular"}
                aria-hidden="true"
              />
              {item.title}
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto pt-8">
        <div className="border-t border-border pt-3">
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            aria-busy={isLoggingOut}
            className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold text-red-800 transition-colors hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-wait disabled:opacity-60 dark:text-red-300 dark:hover:bg-red-950/40"
          >
            <SignOut size={17} aria-hidden="true" />
            {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
          </button>
        </div>
        <p className="px-3 pt-3 font-heading text-[11px] text-muted-foreground">
          Cổng quản trị ScamShield
        </p>
      </div>
    </div>
  )
}
