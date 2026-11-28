"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { UserSidebar } from "./user-sidebar"
import { UserHeader } from "./user-header"
import { NotificationRealtime } from "@/components/features/notification-realtime"
import { useScamCheckTheme } from "@/components/features/check/scam-check-theme"
import { ScamAmbientBackdrop } from "@/components/features/check/scam-ambient-backdrop"
import {
  ChromeAmbientOverlay,
  useChromePointerGlow,
} from "@/components/shared/chrome-ambient-surface"
import { cn } from "@/lib/utils"

const SIDEBAR_STORAGE_KEY = "scamshield.user-sidebar-collapsed"

interface UserDashboardShellProps {
  children: React.ReactNode
}

export function UserDashboardShell({ children }: UserDashboardShellProps) {
  const pathname = usePathname()
  const isFullBleedCheck = pathname === "/user" || pathname === "/user/check"
  const { theme: antiScamTheme } = useScamCheckTheme()
  const { glowLayerRef, handlePointerMove, handlePointerLeave } =
    useChromePointerGlow()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      try {
        if (window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true") {
          setSidebarCollapsed(true)
        }
      } catch {
        // Ignore storage errors in restricted browsing contexts.
      }
    })
    return () => window.cancelAnimationFrame(id)
  }, [])

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next))
      } catch {
        // Ignore storage errors.
      }
      return next
    })
  }

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn(
        "relative flex h-screen overflow-hidden text-foreground transition-colors duration-200",
        antiScamTheme.chromeFrameBg
      )}
    >
      {/* Single Seamless Ambient Chrome Layer shared by Left Sidebar, Header & Right Sidebar */}
      <ChromeAmbientOverlay
        glowLayerRef={glowLayerRef}
        theme={antiScamTheme}
        edge="none"
      />

      <NotificationRealtime />

      {/* Desktop Unified L-Frame Left Sidebar (seamless with Header) */}
      <UserSidebar
        className="sticky top-0 hidden self-start md:flex"
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-50 flex w-64 flex-col shadow-2xl">
            <UserSidebar onCloseMobile={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Right Column: Seamless Header + Railway-Style Inset Rounded Canvas */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <UserHeader
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        <div className="flex min-h-0 flex-1 overflow-hidden md:pr-2.5 md:pb-2.5">
          {isFullBleedCheck ? (
            <main className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
              {children}
            </main>
          ) : (
            <div
              className={cn(
                "relative flex min-w-0 flex-1 flex-col overflow-y-auto border-t transition-colors duration-200 md:rounded-2xl md:border",
                antiScamTheme.shellBg,
                antiScamTheme.canvasFrameBorder
              )}
            >
              <ScamAmbientBackdrop
                theme={antiScamTheme}
                className="flex flex-1 flex-col"
              >
                <main
                  className={cn(
                    "relative z-10 mx-auto w-full flex-1 p-4 transition-[max-width] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] sm:p-6 lg:p-8 motion-reduce:transition-none",
                    sidebarCollapsed ? "max-w-5xl" : "max-w-7xl"
                  )}
                >
                  {children}
                </main>
              </ScamAmbientBackdrop>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
