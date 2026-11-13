"use client"

import { reportStatusClasses } from "@/features/report/utils/report-status"
import { formatReportHotline } from "@/features/report/utils/report-phone"

import { useRef, useState } from "react"
import Link from "next/link"
import { Menu } from "@base-ui/react/menu"
import {
  MagnifyingGlass,
  Funnel,
  Paperclip,
  ArrowsClockwise,
  Eye,
  DotsThree,
  PencilSimple,
  ArrowUUpLeft,
  Phone,
  Globe,
  Bank,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react"
import { RecentReportItem } from "@/features/report/types/report.types"

import { toast } from "react-toastify"
import { withdrawOwnReport } from "@/features/report/services/report.service"

function formatReportPhone(value: string): string {
  const hotline = formatReportHotline(value)
  if (hotline !== value) return hotline
  const compact = value.replace(/[\s().-]/g, "")
  if (/^0\d{9}$/.test(compact)) {
    return `${compact.slice(0, 4)} ${compact.slice(4, 7)} ${compact.slice(7)}`
  }
  if (/^\+84\d{9}$/.test(compact)) {
    return `+84 ${compact.slice(3, 6)} ${compact.slice(6, 9)} ${compact.slice(9)}`
  }
  return value
}

interface RecentReportsTableProps {
  items: RecentReportItem[]
  isLoading?: boolean
  embedded?: boolean
  onRefresh?: () => void
}

export function RecentReportsTable({
  items,
  isLoading = false,
  embedded = false,
  onRefresh,
}: RecentReportsTableProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [selected, setSelected] = useState<RecentReportItem | null>(null)
  const [busy, setBusy] = useState(false)
  const [withdrawn, setWithdrawn] = useState<string[]>([])
  async function withdraw() {
    if (!selected || busy) return
    setBusy(true)
    try {
      await withdrawOwnReport(Number(selected.id.replace(/\D/g, "")))
      setWithdrawn((ids) => [...ids, selected.id])
      dialog.current?.close()
      toast.success("Đã thu hồi báo cáo.")
      onRefresh?.()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể thu hồi báo cáo."
      )
    } finally {
      setBusy(false)
    }
  }
  const [search, setSearch] = useState("")

  const filteredItems = items
    .map((item) =>
      withdrawn.includes(item.id)
        ? { ...item, status: "WITHDRAWN" as const }
        : item
    )
    .filter((item) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        item.targetValue.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      )
    })

  const renderStatus = (item: RecentReportItem) => {
    const labels: Record<string, string> = {
      PENDING: "Đang chờ duyệt",
      IN_REVIEW: "Đang kiểm duyệt",
      APPROVED: "Đã duyệt",
      REJECTED: "Từ chối duyệt",
      WITHDRAWN: "Đã thu hồi",
    }
    return (
      <div className="space-y-1">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${reportStatusClasses[item.status] ?? "border-border bg-muted text-muted-foreground"}`}
        >
          {labels[item.status] ?? item.status}
        </span>
        {item.status === "REJECTED" && item.rejectionReason && (
          <p className="text-[10px] text-muted-foreground">
            Lý do: {item.rejectionReason}
          </p>
        )}
      </div>
    )
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
    <div
      className={
        embedded
          ? "px-5"
          : "space-y-4 rounded-2xl border border-[#C6C6CE]/40 bg-white p-6 shadow-xs dark:border-border dark:bg-card"
      }
    >
      {!embedded && (
        <>
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
        </>
      )}
      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#C6C6CE]/30 text-[11px] font-bold text-[#45464D] uppercase dark:border-border dark:text-muted-foreground">
              <th className="py-2.5 pr-3">Mã báo cáo</th>
              <th className="py-2.5 pr-3">Đối tượng bị báo cáo</th>
              <th className="px-3 py-2.5">Danh Mục</th>
              <th className="px-3 py-2.5">Ngày Gửi</th>
              <th className="px-3 py-2.5">Bằng Chứng</th>
              <th className="px-3 py-2.5">Trạng Thái Kiểm Duyệt</th>
              <th className="px-3 py-2.5">Điểm Thưởng</th>
              <th className="py-2.5 pl-3 text-center">Quản lý</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#C6C6CE]/20 font-medium dark:divide-border/40">
            {isLoading ? (
              <tr>
                <td
                  colSpan={8}
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
                  colSpan={8}
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
                  <td className="py-3.5 pr-3 font-medium tabular-nums">
                    {Number(item.id.split("-").at(-1))}
                  </td>
                  {/* Target Value with Icon */}
                  <td className="py-3.5 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[#FAF8FF] dark:bg-muted/50">
                        {renderTargetIcon(item.targetType)}
                      </div>
                      <span className="font-semibold whitespace-nowrap text-[#131B2E] tabular-nums dark:text-foreground">
                        {item.targetType === "PHONE"
                          ? formatReportPhone(item.targetValue)
                          : item.targetValue}
                      </span>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-3 py-3.5">
                    <span className="inline-block max-w-full rounded-md border border-[#C6C6CE]/40 bg-[#FAF8FF] px-2 py-0.5 text-[11px] leading-4 font-semibold wrap-break-word text-[#45464D] dark:border-border dark:bg-muted/40 dark:text-muted-foreground">
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
                    {item.status === "PENDING" || item.rewardPoints === null ? (
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
                  <td className="py-3.5 pl-3">
                    <Menu.Root>
                      <Menu.Trigger
                        aria-label={`Quản lý báo cáo ${item.targetValue}`}
                        className="mx-auto flex size-9 cursor-pointer items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <DotsThree size={22} weight="bold" />
                      </Menu.Trigger>
                      <Menu.Portal>
                        <Menu.Positioner
                          align="end"
                          sideOffset={6}
                          className="z-50"
                        >
                          <Menu.Popup className="min-w-40 rounded-xl border border-border bg-popover p-1 text-sm text-popover-foreground shadow-lg outline-none">
                            <Menu.Item
                              render={
                                <Link
                                  href={`/user/reports/${item.id.replace(/\D/g, "")}`}
                                />
                              }
                              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 outline-none data-[highlighted]:bg-muted"
                            >
                              <Eye size={16} />
                              <span>Chi tiết</span>
                            </Menu.Item>
                            {item.status === "PENDING" && (
                              <>
                                <Menu.Item
                                  render={
                                    <Link
                                      href={`/user/reports/${item.id.replace(/\D/g, "")}?action=edit`}
                                    />
                                  }
                                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 outline-none data-[highlighted]:bg-muted"
                                >
                                  <PencilSimple size={16} />
                                  <span>Chỉnh sửa</span>
                                </Menu.Item>
                                <Menu.Item
                                  onClick={() => {
                                    setSelected(item)
                                    dialog.current?.showModal()
                                  }}
                                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-destructive outline-none data-[highlighted]:bg-destructive/10"
                                >
                                  <ArrowUUpLeft size={16} />
                                  <span>Thu hồi</span>
                                </Menu.Item>
                              </>
                            )}
                          </Menu.Popup>
                        </Menu.Positioner>
                      </Menu.Portal>
                    </Menu.Root>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!embedded && (
        <>
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
        </>
      )}
      <dialog
        ref={dialog}
        onCancel={(event) => {
          if (busy) event.preventDefault()
        }}
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border bg-card p-6 text-foreground shadow-xl backdrop:bg-black/40"
        aria-labelledby="recent-withdraw-title"
      >
        <h2 id="recent-withdraw-title" className="text-lg font-bold">
          Thu hồi báo cáo?
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Bạn muốn thu hồi báo cáo về {selected?.targetValue}? Báo cáo sẽ dừng
          chờ kiểm duyệt.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => dialog.current?.close()}
            className="rounded-lg border border-border px-4 py-2 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void withdraw()}
            className="rounded-lg bg-destructive px-4 py-2 text-white disabled:opacity-50"
          >
            {busy ? "Đang thu hồi…" : "Thu hồi"}
          </button>
        </div>
      </dialog>
    </div>
  )
}
