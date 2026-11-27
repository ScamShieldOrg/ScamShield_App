"use client"

import type { ReactNode } from "react"
import { GuestHeader } from "./guest-header"
import { GuestFooter } from "./guest-footer"
import { useScamCheckTheme } from "@/components/features/check/scam-check-theme"
import { ScamAmbientBackdrop } from "@/components/features/check/scam-ambient-backdrop"
import { cn } from "@/lib/utils"

interface GuestShellProps {
  children: ReactNode
}

export function GuestShell({ children }: GuestShellProps) {
  const { theme } = useScamCheckTheme()

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col text-foreground transition-colors duration-200",
        theme.shellBg
      )}
    >
      <GuestHeader />
      <ScamAmbientBackdrop
        theme={theme}
        className="flex flex-1 flex-col overflow-x-clip"
      >
        <main className="relative z-10 flex flex-1 flex-col">{children}</main>
      </ScamAmbientBackdrop>
      <GuestFooter />
    </div>
  )
}
