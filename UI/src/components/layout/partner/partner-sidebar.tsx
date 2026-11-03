"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Gauge,
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
  Gauge,
  ShieldCheck,
  Megaphone,
  FileText,
  WarningOctagon,
  Gear,
}

export function PartnerSidebar({ onNavigate }: { onNavigate?: () => void }) {
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
    <div className="flex h-full flex-col bg-slate-900 text-slate-100 border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500 text-slate-950 font-black shadow-md">
            <ShieldWarning size={22} weight="fill" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-heading text-sm font-bold tracking-tight text-white">
                ScamShield
              </span>
              <span className="rounded bg-slate-800 border border-slate-700 px-1 py-0.5 text-[9px] font-bold tracking-wider text-emerald-400">
                PORTAL B2B
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <span className="inline-block size-1.5 rounded-full bg-emerald-400" />
              <span>ĐỐI TÁC C1</span>
            </div>
          </div>
        </div>

        {/* Verified Org Unit */}
        <div className="mt-3.5 rounded-lg bg-slate-800/80 border border-slate-700/60 p-2.5">
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Đơn vị xác thực
          </div>
          <div className="mt-0.5 text-xs font-semibold text-slate-100 truncate">
            VCB Security Sentinel
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav aria-label="Điều hướng Đối tác B2B" className="flex-1 space-y-1 p-3 overflow-y-auto">
        {PARTNER_NAV_ITEMS.map((item) => {
          const Icon = icons[item.iconName]
          const isSelected = active?.href === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                isSelected
                  ? "bg-slate-800 text-white font-semibold shadow-xs"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  size={18}
                  weight={isSelected ? "fill" : "regular"}
                  className={cn(
                    "shrink-0 transition-colors",
                    isSelected ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"
                  )}
                />
                <span>{item.title}</span>
              </div>

              {item.badge && (
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide",
                    item.badgeVariant === "urgent"
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "bg-slate-800 text-slate-300 border border-slate-700"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Logout Footer */}
      <div className="p-3 border-t border-slate-800">
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
        >
          <SignOut size={18} className="shrink-0" />
          <span>{isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</span>
        </button>
      </div>
    </div>
  )
}
