"use client"

import { useState } from "react"
import { UserSidebar } from "./user-sidebar"
import { UserHeader } from "./user-header"
import { NotificationRealtime } from "@/components/features/notification-realtime"

interface UserDashboardShellProps {
  children: React.ReactNode
}

export function UserDashboardShell({ children }: UserDashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAF8FF] text-foreground dark:bg-background">
      <NotificationRealtime />
      {/* Desktop Sticky Sidebar */}
      <UserSidebar className="hidden md:flex" />

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-50 flex w-72 flex-col shadow-2xl">
            <UserSidebar onCloseMobile={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Scrollable Dashboard Content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <UserHeader
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
