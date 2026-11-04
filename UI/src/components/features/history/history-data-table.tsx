"use client"

import {
  PhoneCall,
  Link as LinkIcon,
  ShieldCheck,
  ChatDots,
  Bank,
  Car,
  CurrencyBtc,
  ArrowsClockwise,
  LockKey,
  XCircle,
  Warning,
  Question,
  Info,
  CircleNotch,
} from "@phosphor-icons/react"
import { HistoryItem } from "@/features/history/types/history.types"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface HistoryDataTableProps {
  items: HistoryItem[]
  selectedIds: string[]
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
  isLoading?: boolean
}

export function HistoryDataTable({
  items,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  isLoading = false,
}: HistoryDataTableProps) {
  const selectedOnThisPageCount = items.filter((item) =>
    selectedIds.includes(item.id)
  ).length
  const isAllSelected =
    items.length > 0 && selectedOnThisPageCount === items.length

  const renderTargetIcon = (item: HistoryItem) => {
    const iconProps = { size: 18, weight: "fill" as const }
    const type = item.targetType?.toUpperCase()

    switch (type) {
      case "PHONE":
        return (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#FFDAD6] text-[#BA1A1A] dark:bg-rose-950/60 dark:text-rose-300">
            <PhoneCall {...iconProps} />
          </div>
        )
      case "URL":
        return (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#FFDAD6] text-[#BA1A1A] dark:bg-rose-950/60 dark:text-rose-300">
            <LinkIcon {...iconProps} />
          </div>
        )
      case "SMS_BANK":
        return (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-[#00875A] dark:bg-emerald-950/60 dark:text-emerald-300">
            <ShieldCheck {...iconProps} />
          </div>
        )
      case "TELEGRAM":
        return (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-[#B45309] dark:bg-amber-950/60 dark:text-amber-300">
            <ChatDots {...iconProps} />
          </div>
        )
      case "BANK_ACCOUNT":
        return (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#334155] dark:bg-slate-800 dark:text-slate-300">
            <Bank {...iconProps} />
          </div>
        )
      case "TRAFFIC_FINE":
        return (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#FFDAD6] text-[#BA1A1A] dark:bg-rose-950/60 dark:text-rose-300">
            <Car {...iconProps} />
          </div>
        )
      case "CRYPTO":
        return (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#FFDAD6] text-[#BA1A1A] dark:bg-rose-950/60 dark:text-rose-300">
            <CurrencyBtc {...iconProps} />
          </div>
        )
      default:
        return (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#FFDAD6] text-[#BA1A1A] dark:bg-rose-950/60 dark:text-rose-300">
            <LinkIcon {...iconProps} />
          </div>
        )
    }
  }

  const renderVerdict = (item: HistoryItem) => {
    const scoreStr = item.riskScore != null ? item.riskScore.toString().padStart(2, "0") : null
    const status = item.verdictStatus?.toUpperCase()

    switch (status) {
      case "DANGEROUS":
        return (
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#BA1A1A] dark:text-rose-400">
              <XCircle size={14} weight="fill" />
              <span>{item.verdictLabel || "Lừa Đảo Nguy Cơ Cao"}</span>
            </div>
            <p className="font-mono text-[11px] font-semibold text-[#BA1A1A] dark:text-rose-400">
              {scoreStr != null && `Chỉ số rủi ro: ${scoreStr}/100`}
            </p>
          </div>
        )
      case "SAFE":
        return (
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00875A] dark:text-emerald-400">
              <ShieldCheck size={14} weight="fill" />
              <span>{item.verdictLabel || "An Toàn Chính Hãng"}</span>
            </div>
            <p className="font-mono text-[11px] font-semibold text-[#00875A] dark:text-emerald-400">
              {scoreStr != null && `Chỉ số rủi ro: ${scoreStr}/100`}
            </p>
          </div>
        )
      case "SUSPICIOUS":
        return (
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B45309] dark:text-amber-400">
              <Warning size={14} weight="fill" />
              <span>{item.verdictLabel || "Nghi Vấn Rủi Ro"}</span>
            </div>
            <p className="font-mono text-[11px] font-semibold text-[#B45309] dark:text-amber-400">
              {scoreStr != null && `Chỉ số rủi ro: ${scoreStr}/100`}
            </p>
          </div>
        )
      case "UNKNOWN":
      default:
        return (
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#475569] dark:text-slate-400">
              <Question size={14} weight="fill" />
              <span>{item.verdictLabel || "Chưa Đủ Dữ Liệu"}</span>
            </div>
            <p className="font-mono text-[11px] font-semibold text-[#475569] dark:text-slate-400">
              {scoreStr != null && `Chỉ số rủi ro: ${scoreStr}/100`}
            </p>
          </div>
        )
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#C6C6CE]/40 bg-white shadow-xs dark:border-border dark:bg-card">
      {/* Top Bar inside Table Card */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#C6C6CE]/30 bg-[#FAF8FF]/60 px-5 py-3 dark:border-border dark:bg-muted/20">
        <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#131B2E] dark:text-foreground">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={onToggleSelectAll}
            disabled={items.length === 0 || isLoading}
            className="size-4 rounded-md border-[#C6C6CE] text-[#0B132B] focus:ring-0 dark:border-border disabled:opacity-50"
          />
          <span>
            Chọn tất cả trang này ({selectedOnThisPageCount}/{items.length} dòng được
            chọn)
          </span>
        </label>

        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#00875A] dark:text-emerald-400">
          <span className="size-2 animate-pulse rounded-full bg-[#10B981]" />
          <LockKey size={13} weight="bold" />
          <span>Bộ giải mã TLS 1.3 đang hoạt động</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 dark:bg-card/60 backdrop-blur-xs flex items-center justify-center z-10">
            <CircleNotch size={28} className="animate-spin text-primary" />
          </div>
        )}

        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#C6C6CE]/30 bg-[#FAF8FF] text-[11px] font-bold tracking-wider text-[#45464D] uppercase dark:border-border dark:bg-muted/30 dark:text-muted-foreground">
              <th className="w-12 px-5 py-3.5 text-center">#</th>
              <th className="w-48 px-4 py-3.5">Thời gian truy vấn</th>
              <th className="px-4 py-3.5">Nội dung / Mục tiêu tra cứu</th>
              <th className="w-44 px-4 py-3.5">Phân loại thủ đoạn</th>
              <th className="w-56 px-5 py-3.5">Kết luận (Verdict)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#C6C6CE]/30 dark:divide-border">
            {items.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={5} className="py-12 px-6 text-center text-xs text-muted-foreground">
                  Không có lịch sử tra cứu nào phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const isSelected = selectedIds.includes(item.id)
                return (
                  <tr
                    key={item.id}
                    className={cn(
                      "transition-colors hover:bg-[#FAF8FF]/80 dark:hover:bg-muted/20",
                      isSelected && "bg-[#F2F3FF]/60 dark:bg-muted/30"
                    )}
                  >
                    {/* Checkbox */}
                    <td className="px-5 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(item.id)}
                        className="size-4 rounded-md border-[#C6C6CE] text-[#0B132B] focus:ring-0 dark:border-border cursor-pointer"
                      />
                    </td>

                    {/* Timestamp & IP */}
                    <td className="px-4 py-4 align-top">
                      <div className="space-y-1">
                        <p className="font-semibold text-[#131B2E] dark:text-foreground">
                          {item.timestamp}
                        </p>
                        <Link className="text-xs font-semibold text-primary underline-offset-2 hover:underline" href={`/user/history/${item.id}`}>
                          Xem kết quả
                        </Link>
                        <p className="text-[11px] text-[#45464D] dark:text-muted-foreground">
                          IP: {item.ip}
                        </p>
                        {item.isRetroactive && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-[#B45309] dark:bg-amber-950/40 dark:text-amber-300">
                            <ArrowsClockwise size={11} weight="bold" />
                            <span>Vừa hồi tố</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Target & Snippet */}
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-start gap-3">
                        {renderTargetIcon(item)}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-[#131B2E] dark:text-foreground">
                              {item.targetValue}
                            </span>
                            {item.targetType?.toUpperCase() === "PHONE" && (
                              <Info
                                size={13}
                                weight="bold"
                                className="text-[#45464D] dark:text-muted-foreground"
                              />
                            )}
                          </div>
                          <p className="max-w-xl text-[11px] leading-relaxed text-[#45464D] dark:text-muted-foreground">
                            {item.snippet}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-4 align-top">
                      <span className="inline-block rounded-lg bg-[#E2E7FF]/70 px-2.5 py-1 text-center text-[11px] font-bold text-[#131B2E] dark:bg-muted dark:text-foreground">
                        {item.category}
                      </span>
                    </td>

                    {/* Verdict */}
                    <td className="px-5 py-4 align-top">{renderVerdict(item)}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
