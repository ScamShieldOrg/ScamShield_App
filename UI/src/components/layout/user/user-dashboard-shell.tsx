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
    <div className="flex min-h-dvh bg-[#FAF8FF] text-foreground dark:bg-background">
      <NotificationRealtime />
      {/* Desktop Sticky Foldable Sidebar */}
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

      <div className="flex min-w-0 flex-1 flex-col bg-card dark:bg-sidebar">
        <UserHeader
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
        <div className="flex min-w-0 flex-1 flex-col rounded-t-3xl bg-[#FAF8FF] md:rounded-tl-[2rem] md:rounded-tr-none dark:bg-background">
          <main
            className={cn(
              "mx-auto w-full flex-1 p-4 transition-[max-width] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none sm:p-6 lg:p-8",
              sidebarCollapsed ? "max-w-5xl" : "max-w-7xl"
            )}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
