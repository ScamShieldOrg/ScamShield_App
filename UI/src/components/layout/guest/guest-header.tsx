"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { AnimatePresence, MotionConfig, motion } from "motion/react"
import {
  ArrowUpRight,
  List,
  Moon,
  ShieldCheck,
  Sun,
  User as UserIcon,
  X,
} from "@phosphor-icons/react"
import { GUEST_NAV_ITEMS } from "@/config/navigation/guest-nav"
import { useAuthStore } from "@/store/auth.store"
import { decodeJwt } from "@/lib/utils/jwtUtil"
import type { UserRole } from "@/types/user"
import { cn } from "@/lib/utils"

function getDashboardHref(
  role: UserRole | string | null | undefined
): string {
  switch (role) {
    case "ADMINISTRATOR":
      return "/admin"
    case "REGISTERED_USER":
      return "/user"
    case "MODERATOR":
      return "/moderator"
    case "GUEST":
      return "/guest"
    case "BUSINESS_PARTNER":
      return "/business-partner"
    default:
      return "/user"
  }
}

export function GuestHeader() {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true))
    return () => window.cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [mobileMenuOpen])

  let currentRole: UserRole | string | null = user?.role || null
  if (!currentRole && token) {
    const decoded = decodeJwt(token)
    currentRole = (decoded?.role as UserRole) || null
  }

  const isLoggedIn = mounted && Boolean(token || user)
  const isDark = mounted && resolvedTheme === "dark"
  const dashboardHref = getDashboardHref(currentRole)

  const isNavItemActive = (href: string) =>
    href === "/guest"
      ? pathname === "/" ||
        pathname === "/guest" ||
        pathname.startsWith("/guest/check")
      : pathname.startsWith(href)

  return (
    <MotionConfig reducedMotion="user">
      <header className="sticky top-0 z-40 w-full border-b border-black/10 bg-background/90 font-sans antialiased backdrop-blur-md dark:border-white/10">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          {/* Left: Brand & Desktop Navigation */}
          <div className="flex min-w-0 items-center gap-5">
            <Link
              href="/guest"
              className="group inline-flex min-h-10 shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs transition-transform duration-120 group-hover:scale-[1.03]">
                <ShieldCheck aria-hidden="true" size={20} weight="fill" />
              </div>
              <span className="font-heading text-base font-bold tracking-[-0.02em] text-foreground sm:text-lg">
                ScamShield VN
              </span>
            </Link>

            <div
              aria-hidden="true"
              className="hidden h-5 w-px bg-border md:block"
            />

            <nav
              aria-label="Điều hướng chính"
              className="hidden items-center gap-1 md:flex"
            >
              {GUEST_NAV_ITEMS.map((item) => {
                const isActive = isNavItemActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-10 items-center rounded-lg px-3.5 text-sm font-semibold transition-colors duration-120 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {item.title}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Right: Auth Actions, Theme Toggle & Mobile Drawer Trigger */}
          <div className="flex shrink-0 items-center gap-2">
            {isLoggedIn ? (
              <Link
                href={dashboardHref}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-xs transition-[opacity,transform] duration-120 hover:opacity-90 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                aria-label="Đi đến bảng điều khiển cá nhân"
              >
                <UserIcon aria-hidden="true" size={16} weight="bold" />
                <span className="hidden sm:inline">Bảng điều khiển</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden min-h-10 items-center rounded-lg px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:inline-flex"
                >
                  Đăng nhập
                </Link>

                <Link
                  href="/register"
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-xs transition-[opacity,transform] duration-120 hover:opacity-90 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:px-4 sm:text-sm"
                >
                  <span>Tạo tài khoản</span>
                  <ArrowUpRight aria-hidden="true" size={14} weight="bold" />
                </Link>
              </>
            )}

            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-lg border border-black/10 bg-card text-foreground shadow-2xs transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/10"
              aria-label={
                isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"
              }
            >
              {mounted ? (
                isDark ? (
                  <Sun aria-hidden="true" size={17} weight="bold" />
                ) : (
                  <Moon aria-hidden="true" size={17} weight="bold" />
                )
              ) : (
                <Moon aria-hidden="true" size={17} weight="bold" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label={
                mobileMenuOpen ? "Đóng menu điều hướng" : "Mở menu điều hướng"
              }
              className="inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-lg border border-black/10 bg-card text-foreground shadow-2xs transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:hidden dark:border-white/10"
            >
              {mobileMenuOpen ? (
                <X aria-hidden="true" size={18} weight="bold" />
              ) : (
                <List aria-hidden="true" size={18} weight="bold" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        <AnimatePresence initial={false}>
          {mobileMenuOpen && (
            <motion.nav
              aria-label="Điều hướng di động"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="border-t border-black/10 bg-card px-4 py-3 shadow-md md:hidden dark:border-white/10"
            >
              <div className="flex flex-col gap-1">
                {GUEST_NAV_ITEMS.map((item) => {
                  const isActive = isNavItemActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "inline-flex min-h-10 items-center rounded-lg px-3.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground/85 hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {item.title}
                    </Link>
                  )
                })}
                {!isLoggedIn && (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="mt-1 inline-flex min-h-10 items-center rounded-lg border border-black/10 bg-background px-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted dark:border-white/10"
                  >
                    Đăng nhập
                  </Link>
                )}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>
    </MotionConfig>
  )
}
