"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ShareNetwork,
  Megaphone,
  Scales,
  FilePdf,
  Check,
} from "@phosphor-icons/react"

interface ScamActionBarProps {
  scanId: string
}

export function ScamActionBar({ scanId }: ScamActionBarProps) {
  const [copied, setCopied] = useState(false)

  const handleShare = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExportPdf = () => {
    window.print()
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <div className="flex flex-wrap items-center gap-3">
        {/* Share Button (Green Primary) */}
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#006644] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#004d33] active:scale-95 dark:bg-emerald-700 dark:hover:bg-emerald-800"
        >
          {copied ? (
            <Check size={16} weight="bold" />
          ) : (
            <ShareNetwork size={16} weight="bold" />
          )}
          <span>
            {copied
              ? "Đã sao chép link thẻ cảnh báo!"
              : "Tạo ảnh thẻ cảnh báo nhanh để chia sẻ (Zalo / Facebook)"}
          </span>
        </button>

        {/* Push to report */}
        <Link
          href={`/user/reports/new?scanId=${scanId}`}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#C6C6CE]/60 bg-white px-4 py-2.5 text-xs font-semibold text-[#131B2E] shadow-2xs hover:bg-[#F2F3FF] dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-muted"
        >
          <Megaphone size={16} weight="bold" />
          <span>Đẩy chỉ số vào Báo cáo của tôi</span>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Dispute */}
        <Link
          href={`/user/disputes?scanId=${scanId}`}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#C6C6CE]/60 bg-white px-4 py-2.5 text-xs font-semibold text-[#131B2E] shadow-2xs hover:bg-[#F2F3FF] dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-muted"
        >
          <Scales size={16} weight="bold" />
          <span>Khiếu nại kết quả phân tích</span>
        </Link>

        {/* Export PDF */}
        <button
          type="button"
          onClick={handleExportPdf}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#0B132B] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#131B2E] active:scale-95 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
        >
          <FilePdf size={16} weight="bold" />
          <span>Xuất biên bản thẩm định PDF</span>
        </button>
      </div>
    </div>
  )
}
