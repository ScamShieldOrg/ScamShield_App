"use client"

import { useState } from "react"
import Link from "next/link"
import {
  MagnifyingGlass,
  Funnel,
  Paperclip,
  CheckCircle,
  ArrowsClockwise,
  GitMerge,
  XCircle,
  Eye,
  Phone,
  Globe,
  Bank,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react"
import { RecentReportItem } from "@/features/report/types/report.types"

interface RecentReportsTableProps {
  items: RecentReportItem[]
  isLoading?: boolean
}

export function RecentReportsTable({
  items,
  isLoading = false,
}: RecentReportsTableProps) {
  const [search, setSearch] = useState("")

  const filteredItems = items.filter((item) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      item.targetValue.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    )
  })

  const renderStatus = (item: RecentReportItem) => {
    switch (item.status) {
      case "APPROVED_BLACKLIST":
        return (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-[#00875A] dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle size={14} weight="fill" />
            <span>Đã phê duyệt & Đưa vào Blacklist</span>
          </div>
        )
      case "PENDING":
        return (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-[#B45309] dark:bg-amber-950/40 dark:text-amber-300">
            <span>Đang chờ duyệt</span>
          </div>
        )
      case "MERGED_DUPLICATE":
        return (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
            <GitMerge size={14} weight="bold" />
            <span>Đã gộp trùng lặp ({item.duplicateRef || "BLK"})</span>
          </div>
        )
      case "REJECTED":
        return (
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#BA1A1A] dark:text-rose-400">
              <XCircle size={14} weight="fill" />
              <span>Từ chối duyệt</span>
            </div>
            {item.rejectionReason && (
              <p className="text-[10px] text-[#45464D] dark:text-muted-foreground">
                Lý do: {item.rejectionReason}
              </p>
            )}
          </div>
        )
      default:
        return (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <span>{item.status}</span>
          </div>
        )
    }
  }

  const renderTargetIcon = (type: RecentReportItem["targetType"]) => {
    switch (type) {
      case "PHONE":
        return (
          <Phone
            size={14}
            weight="bold"
            className="text-[#0B132B] dark:text-primary"
          />
        )
      case "WEBSITE":
        return (
          <Globe
            size={14}
            weight="bold"
            className="text-[#008CC7] dark:text-primary"
          />
        )
      case "BANK_ACCOUNT":
        return (
          <Bank
            size={14}
            weight="bold"
            className="text-[#00875A] dark:text-emerald-400"
          />
        )
      default:
        return <Phone size={14} weight="bold" />
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-[#C6C6CE]/40 bg-white p-6 shadow-xs dark:border-border dark:bg-card">
      {/* Table Header: Title & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#C6C6CE]/30 pb-4 dark:border-border">
        <div>
          <h2 className="font-heading text-sm font-bold text-[#131B2E] dark:text-foreground">
            Các Báo Cáo Gần Đây Của Bạn
          </h2>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <MagnifyingGlass
              size={14}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-[#45464D] dark:text-muted-foreground"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm đối tượng hoặc danh mục..."
              aria-label="Tìm báo cáo theo đối tượng hoặc danh mục"
              className="w-48 rounded-xl border border-[#C6C6CE]/50 bg-[#FAF8FF] py-1.5 pr-3 pl-8 text-xs text-[#131B2E] placeholder:text-[#45464D]/60 focus:ring-1 focus:ring-[#008CC7] focus:outline-hidden sm:w-56 dark:border-border dark:bg-muted/30 dark:text-foreground"
            />
          </div>

          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#C6C6CE]/50 bg-[#FAF8FF] px-3 py-1.5 text-xs font-semibold text-[#131B2E] shadow-2xs hover:bg-[#F2F3FF] dark:border-border dark:bg-card dark:text-foreground"
          >
            <Funnel size={14} />
            <span>Bộ lọc</span>
          </button>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#C6C6CE]/30 text-[11px] font-bold text-[#45464D] uppercase dark:border-border dark:text-muted-foreground">
              <th className="py-2.5 pr-3">Đối tượng bị báo cáo</th>
              <th className="px-3 py-2.5">Danh Mục</th>
              <th className="px-3 py-2.5">Ngày Gửi</th>
              <th className="px-3 py-2.5">Bằng Chứng</th>
              <th className="px-3 py-2.5">Trạng Thái Kiểm Duyệt</th>
              <th className="px-3 py-2.5">Điểm Thưởng</th>
              <th className="py-2.5 pl-3 text-center">Xem thêm</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#C6C6CE]/20 font-medium dark:divide-border/40">
            {isLoading ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-12 text-center text-xs text-[#45464D] dark:text-muted-foreground"
                >
                  <div className="flex items-center justify-center gap-2">
                    <ArrowsClockwise
                      size={16}
                      className="animate-spin text-[#008CC7]"
                    />
                    <span>Đang tải danh sách báo cáo...</span>
                  </div>
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-12 text-center text-xs text-[#45464D] dark:text-muted-foreground"
                >
                  {search.trim()
                    ? "Không tìm thấy báo cáo phù hợp với từ khóa."
                    : "Bạn chưa có báo cáo nào được ghi nhận trên hệ thống."}
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className="transition-colors hover:bg-[#FAF8FF]/80 dark:hover:bg-muted/20"
                >
                  {/* Target Value with Icon */}
                  <td className="py-3.5 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[#FAF8FF] dark:bg-muted/50">
                        {renderTargetIcon(item.targetType)}
                      </div>
                      <span className="font-semibold text-[#131B2E] dark:text-foreground">
                        {item.targetValue}
                      </span>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-3 py-3.5">
                    <span className="rounded-md border border-[#C6C6CE]/40 bg-[#FAF8FF] px-2 py-0.5 text-[11px] font-semibold text-[#45464D] dark:border-border dark:bg-muted/40 dark:text-muted-foreground">
                      {item.category}
                    </span>
                  </td>

                  {/* Submitted Date */}
                  <td className="px-3 py-3.5 text-[#45464D] dark:text-muted-foreground">
                    {item.submittedDate}
                  </td>

                  {/* Evidence Count */}
                  <td className="px-3 py-3.5">
                    <div className="inline-flex items-center gap-1.5 rounded-md bg-[#FAF8FF] px-2 py-0.5 text-[11px] font-semibold text-[#45464D] dark:bg-muted/40 dark:text-muted-foreground">
                      <Paperclip size={12} weight="bold" />
                      <span>{item.evidenceCount} tệp</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3.5">{renderStatus(item)}</td>

                  {/* Reward Points */}
                  <td className="px-3 py-3.5">
                    {item.status === "PENDING" ? (
                      <span
                        className="text-[11px] font-medium text-[#45464D] dark:text-muted-foreground"
                        aria-label="Chưa có điểm thưởng"
                      >
                        --
                      </span>
                    ) : item.rewardPoints > 0 ? (
                      <span className="font-bold text-[#00875A] dark:text-emerald-400">
                        +{item.rewardPoints} điểm
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-[#45464D] dark:text-muted-foreground">
                        0 điểm
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 pl-3 text-center">
                    <Link
                      href={`/user/reports/${item.id.replace("#", "")}`}
                      className="inline-flex size-7 items-center justify-center rounded-lg text-[#45464D] hover:bg-[#F2F3FF] hover:text-[#131B2E] dark:text-muted-foreground dark:hover:bg-muted"
                      title="Xem chi tiết"
                    >
                      <Eye size={16} weight="bold" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#C6C6CE]/30 pt-3 dark:border-border">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex size-7 cursor-pointer items-center justify-center rounded-lg border border-[#C6C6CE]/50 bg-white text-[#45464D] shadow-2xs hover:bg-[#FAF8FF] dark:border-border dark:bg-card dark:text-muted-foreground"
          >
            <CaretLeft size={12} weight="bold" />
          </button>
          <button
            type="button"
            className="flex size-7 cursor-pointer items-center justify-center rounded-lg bg-[#0B132B] text-xs font-bold text-white dark:bg-primary dark:text-primary-foreground"
          >
            1
          </button>
          <button
            type="button"
            className="flex size-7 cursor-pointer items-center justify-center rounded-lg border border-[#C6C6CE]/50 bg-white text-[#45464D] shadow-2xs hover:bg-[#FAF8FF] dark:border-border dark:bg-card dark:text-muted-foreground"
          >
            <CaretRight size={12} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  )
}
