"use client"

import { ShieldCheck } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import {
  SCAM_CHECK_THEMES,
  type ScamCheckThemeConfig,
} from "./scam-check-theme"

interface ScamHeroHeaderProps {
  theme?: ScamCheckThemeConfig
  className?: string
}

export function ScamHeroHeader({
  theme = SCAM_CHECK_THEMES["shield-emerald"],
  className,
}: ScamHeroHeaderProps) {
  return (
    <header className={cn("mb-6 space-y-3 text-center sm:mb-7", className)}>
      {/* Live Status Pill */}
      <div className="flex justify-center">
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-medium shadow-2xs backdrop-blur-sm transition-colors duration-200",
            theme.heroPill
          )}
        >
          <span className="relative flex size-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <ShieldCheck
            aria-hidden="true"
            size={14}
            weight="fill"
            className={theme.heroPillIcon}
          />
          <span>Hệ thống AI 2 tầng · Blacklist &amp; Hội đồng phân tích</span>
        </span>
      </div>

      {/* Focused Heading with theme-synced solid accent */}
      <h1 className="font-heading text-3xl leading-tight font-bold tracking-[-0.03em] text-balance text-foreground sm:text-4xl">
        Kiểm tra{" "}
        <span className={cn("transition-colors duration-200", theme.heroAccent)}>
          trước khi tin tưởng
        </span>
      </h1>

      <p className="mx-auto max-w-[54ch] text-sm leading-relaxed text-muted-foreground sm:text-base">
        Dán tin nhắn, liên kết lạ, số điện thoại hoặc số tài khoản để đối chiếu
        cảnh báo và phân tích dấu hiệu lừa đảo tức thì.
      </p>
    </header>
  )
}
