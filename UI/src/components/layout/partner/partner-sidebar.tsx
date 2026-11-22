"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  SquaresFour,
  ShieldCheck,
  Megaphone,
  FileText,
  WarningOctagon,
  Gear,
  SignOut,
  ShieldWarning,
} from "@phosphor-icons/react"
import {
  PARTNER_NAV_ITEMS,
  getActivePartnerNavItem,
} from "@/config/navigation/partner-nav"
import { cn } from "@/lib/utils"
import { useLogout } from "@/hooks/use-logout"

const icons = {
  Gauge: SquaresFour,
  ShieldCheck,
  Megaphone,
  FileText,
  WarningOctagon,
  Gear,
}

export function PartnerSidebar({
  onNavigate,
  closeButton,
}: {
  onNavigate?: () => void
  closeButton?: ReactNode
}) {
  const pathname = usePathname()
  const active = getActivePartnerNavItem(pathname)
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
    <div className="flex h-full flex-col bg-[#f2f3ff] text-[#131b2e] dark:bg-slate-900 dark:text-slate-100">
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <ShieldWarning size={17} weight="fill" />
          </div>
          <div className="leading-tight">
            <div className="text-lg font-bold tracking-tight">ScamShield</div>
            <div className="text-[10px] font-bold tracking-wide text-[#545d7c] dark:text-slate-400">
              PORTAL B2B
            </div>
          </div>
        </div>

        {/* Verified Org Unit */}
        <div className="mt-4 rounded-lg bg-[#e9edff] p-2 dark:bg-slate-800">
          <div className="text-[10px] font-bold tracking-wider text-[#45464d] uppercase dark:text-slate-400">
            Đơn vị xác thực
          </div>
          <div className="mt-0.5 truncate text-sm font-semibold">
            VCB Security Sentinel
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav
        aria-label="Điều hướng Đối tác B2B"
        className="mt-4 flex-1 space-y-1 overflow-y-auto px-2"
      >
        {PARTNER_NAV_ITEMS.map((item) => {
          const Icon = icons[item.iconName]
          const isSelected = active?.href === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={isSelected ? "page" : undefined}
              className={cn(
                "flex min-h-[34px] items-center justify-between gap-2 rounded-lg px-4 py-2 text-sm leading-tight font-medium transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "text-[#45464d] hover:bg-[#e9edff] hover:text-[#131b2e] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              )}
            >
              <div className="flex items-center gap-2">
                <Icon
                  size={16}
                  className={cn(
                    "shrink-0",
                    !isSelected &&
                      item.badgeVariant === "urgent" &&
                      "text-[#ba1a1a] dark:text-red-400"
                  )}
                />
                <span>{item.title}</span>
              </div>

              {item.badge && (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tracking-wide",
                    item.badgeVariant === "urgent"
                      ? "bg-[#ffdad6] text-[#93000a] dark:bg-red-950 dark:text-red-300"
                      : "bg-[#d0d9fd] text-[#414b6c] dark:bg-slate-700 dark:text-slate-200"
                  )}
                >
                  {item.badge}
                </span>
              )}
              {isSelected && !item.badge && (
                <span
                  aria-hidden="true"
                  className="size-1.5 shrink-0 rounded-full bg-current"
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Logout Footer */}
      <div className="border-t border-slate-200/80 p-2 dark:border-slate-800">
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-[#45464d] transition-colors hover:bg-[#e9edff] dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <SignOut size={18} className="shrink-0" />
          <span>{isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</span>
        </button>
      </div>
    </div>
  )
}
