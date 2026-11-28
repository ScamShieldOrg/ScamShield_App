"use client"

import { Cpu, Database } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import {
  SCAM_CHECK_THEMES,
  type ScamCheckThemeConfig,
} from "./scam-check-theme"

interface ScamTwoTierBarProps {
  theme?: ScamCheckThemeConfig
  className?: string
}

export function ScamTwoTierBar({
  theme = SCAM_CHECK_THEMES["shield-emerald"],
  className,
}: ScamTwoTierBarProps) {
  return (
    <div
      aria-label="Quy trình bảo vệ 2 tầng"
      className={cn(
        "mx-auto flex w-full max-w-4xl flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-black/8 pt-3.5 text-xs text-muted-foreground dark:border-white/10",
        className
      )}
    >
      <span className="inline-flex items-center gap-2">
        <span
          className={cn(
            "inline-flex size-6 items-center justify-center rounded-md border",
            theme.tier1Icon
          )}
        >
          <Database aria-hidden="true" size={13} weight="fill" />
        </span>
        <span>
          <strong className="font-semibold text-foreground">Tầng 1:</strong> Đối
          chiếu Blacklist &amp; danh bạ tức thì
        </span>
      </span>

      <span className="inline-flex items-center gap-2">
        <span
          className={cn(
            "inline-flex size-6 items-center justify-center rounded-md border",
            theme.tier2Icon
          )}
        >
          <Cpu aria-hidden="true" size={13} weight="fill" />
        </span>
        <span>
          <strong className="font-semibold text-foreground">Tầng 2:</strong> Hội
          đồng chuyên gia AI phân tích dấu hiệu
        </span>
      </span>
    </div>
  )
}
