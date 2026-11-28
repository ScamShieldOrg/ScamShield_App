"use client"

import { useEffect, useState } from "react"
import {
  ArrowLeft,
  Bank,
  ChatText,
  Check,
  Copy,
  Link as LinkIcon,
  Phone,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import type { CheckType } from "@/features/check/types/check.types"
import { CHECK_TAB_META } from "./scam-input-helpers"

interface ScamSubmittedBubbleProps {
  inputType: string
  content: string
  onBackToHome: () => void
  isLoading?: boolean
}

function normalizeCheckType(type: string): CheckType {
  const upper = (type || "").toUpperCase()
  if (upper === "URL" || upper === "DOMAIN") return "URL"
  if (upper === "PHONE") return "PHONE"
  if (upper === "BANK_ACCOUNT") return "BANK_ACCOUNT"
  return "TEXT"
}

const TYPE_ICONS: Record<CheckType, typeof ChatText> = {
  TEXT: ChatText,
  URL: LinkIcon,
  PHONE: Phone,
  BANK_ACCOUNT: Bank,
}

export function ScamSubmittedBubble({
  inputType,
  content,
  onBackToHome,
  isLoading = false,
}: ScamSubmittedBubbleProps) {
  const resolvedType = normalizeCheckType(inputType)
  const meta = CHECK_TAB_META[resolvedType]
  const Icon = TYPE_ICONS[resolvedType]
  const isMono = resolvedType !== "TEXT"
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  useEffect(() => {
    if (!copyError) return
    const timer = window.setTimeout(() => setCopyError(null), 3000)
    return () => window.clearTimeout(timer)
  }, [copyError])

  const trimmedContent = content.trim()

  const handleCopy = async () => {
    if (!trimmedContent) return
    try {
      await navigator.clipboard.writeText(trimmedContent)
      setCopyError(null)
      setCopied(true)
    } catch {
      setCopied(false)
      setCopyError("Không thể sao chép nội dung.")
    }
  }

  return (
    <div className="space-y-3">
      {/* Top Workspace Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBackToHome}
          disabled={isLoading}
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card/90 px-3.5 text-xs font-semibold text-foreground shadow-2xs transition-[background-color,border-color,color] duration-150 hover:border-foreground/20 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/12"
        >
          <ArrowLeft aria-hidden="true" size={14} weight="bold" />
          <span>Quay lại</span>
        </button>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground dark:border-white/10">
          <Icon
            aria-hidden="true"
            size={13}
            weight="fill"
            className="text-sky-600 dark:text-sky-400"
          />
          <span>{meta.label}</span>
        </span>
      </div>

      {/* User Submitted Content Card (Chat/Workspace Prompt Context) */}
      {trimmedContent.length > 0 && (
        <div className="rounded-xl border border-border/90 bg-card/85 px-4 py-3 text-sm text-foreground shadow-2xs backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              Nội dung bạn vừa kiểm tra
            </p>
            <button
              type="button"
              onClick={() => void handleCopy()}
              title={copied ? "Đã sao chép" : "Sao chép nội dung"}
              aria-label={copied ? "Đã sao chép nội dung" : "Sao chép nội dung"}
              className={cn(
                "inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                copied
                  ? "border-emerald-500/30 bg-emerald-500/12 text-emerald-700 dark:border-emerald-400/30 dark:text-emerald-300"
                  : "border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground dark:hover:border-white/12"
              )}
            >
              {copied ? (
                <Check aria-hidden="true" size={14} weight="bold" />
              ) : (
                <Copy aria-hidden="true" size={14} weight="bold" />
              )}
            </button>
          </div>
          <p
            className={cn(
              "line-clamp-3 break-words leading-relaxed text-foreground",
              isMono && "font-mono text-xs sm:text-sm"
            )}
          >
            {trimmedContent}
          </p>
          {copyError && (
            <p
              role="alert"
              className="mt-1.5 text-xs font-medium text-destructive"
            >
              {copyError}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
