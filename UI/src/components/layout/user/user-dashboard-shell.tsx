"use client"

import { useEffect, useState } from "react"
import { UserSidebar } from "./user-sidebar"
import { UserHeader } from "./user-header"
import { NotificationRealtime } from "@/components/features/notification-realtime"
import { cn } from "@/lib/utils"

const SIDEBAR_STORAGE_KEY = "scamshield.user-sidebar-collapsed"

interface UserDashboardShellProps {
  children: React.ReactNode
}

export function UserDashboardShell({ children }: UserDashboardShellProps) {
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
    <div className="flex h-screen overflow-hidden bg-[#FAF8FF] text-foreground dark:bg-background">
      <NotificationRealtime />
      {/* Desktop Sticky Foldable Sidebar */}
      <UserSidebar
        className="hidden md:flex"
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

      {/* Main Scrollable Dashboard Content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <UserHeader
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
        <main
          className={cn(
            "mx-auto w-full flex-1 p-4 transition-[max-width] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] sm:p-6 lg:p-8 motion-reduce:transition-none",
            sidebarCollapsed ? "max-w-5xl" : "max-w-7xl"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
