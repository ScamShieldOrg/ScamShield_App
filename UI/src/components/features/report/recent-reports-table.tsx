"use client"

import {
  reportStatusClasses,
  reportStatusDotClasses,
  reportStatusLabels,
} from "@/features/report/utils/report-status"
import { formatReportHotline } from "@/features/report/utils/report-phone"
import {
  buildReportPageRange,
  extractReportNumericId,
  formatReportPhoneDisplay,
} from "./report-helpers"

import { useRef, useState } from "react"
import Link from "next/link"
import { Menu } from "@base-ui/react/menu"
import {
  MagnifyingGlass,
  Paperclip,
  CircleNotch,
  Eye,
  DotsThree,
  PencilSimple,
  ArrowUUpLeft,
  Phone,
  Globe,
  Bank,
  CaretLeft,
  CaretRight,
  X,
} from "@phosphor-icons/react"
import { RecentReportItem } from "@/features/report/types/report.types"
import { toast } from "react-toastify"
import { withdrawOwnReport } from "@/features/report/services/report.service"
import { cn } from "@/lib/utils"

interface RecentReportsTableProps {
  items: RecentReportItem[]
  isLoading?: boolean
  embedded?: boolean
  onRefresh?: () => void
}

const STANDALONE_PAGE_SIZE = 10

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
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  async function withdraw() {
    if (!selected || busy) return
    setBusy(true)
    try {
      await withdrawOwnReport(Number(extractReportNumericId(selected.id)))
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
        item.category.toLowerCase().includes(q) ||
        extractReportNumericId(item.id).includes(q)
      )
    })

  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / STANDALONE_PAGE_SIZE)
  )
  const safePage = Math.min(page, totalPages)
  const visibleItems = embedded
    ? filteredItems
    : filteredItems.slice(
        (safePage - 1) * STANDALONE_PAGE_SIZE,
        safePage * STANDALONE_PAGE_SIZE
      )

  const pageTokens = buildReportPageRange(safePage, totalPages)

  const renderStatus = (item: RecentReportItem) => {
    const label = reportStatusLabels[item.status] ?? item.status
    const badgeClass =
      reportStatusClasses[item.status] ??
      "border-border bg-muted text-muted-foreground"
    const dotClass =
      reportStatusDotClasses[item.status] ?? "bg-muted-foreground"

    return (
      <div className="space-y-1">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
            badgeClass
          )}
        >
          <span
            aria-hidden="true"
            className={cn("size-1.5 shrink-0 rounded-full", dotClass)}
          />
          <span>{label}</span>
        </span>
        {item.status === "REJECTED" && item.rejectionReason && (
          <p className="max-w-[28ch] text-xs leading-snug text-muted-foreground">
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
            aria-hidden="true"
            size={15}
            weight="bold"
            className="text-foreground"
          />
        )
      case "WEBSITE":
        return (
          <Globe
            aria-hidden="true"
            size={15}
            weight="bold"
            className="text-sky-700 dark:text-sky-300"
          />
        )
      case "BANK_ACCOUNT":
        return (
          <Bank
            aria-hidden="true"
            size={15}
            weight="bold"
            className="text-emerald-700 dark:text-emerald-300"
          />
        )
      default:
        return <Phone aria-hidden="true" size={15} weight="bold" />
    }
  }

  const renderRowMenu = (item: RecentReportItem) => {
    const numericId = extractReportNumericId(item.id)
    return (
      <Menu.Root>
        <Menu.Trigger
          aria-label={`Quản lý báo cáo ${item.targetValue}`}
          className="relative z-10 inline-flex size-10 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <DotsThree aria-hidden="true" size={20} weight="bold" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="end" sideOffset={6} className="z-50">
            <Menu.Popup className="min-w-44 rounded-xl border border-black/10 bg-popover p-1.5 text-sm text-popover-foreground shadow-[0_8px_30px_rgb(15,23,42,0.12),0_1px_2px_rgb(15,23,42,0.06)] outline-none dark:border-white/12 dark:shadow-[0_16px_44px_rgb(0,0,0,0.55),inset_0_1px_0_rgb(255,255,255,0.08)]">
              <Menu.Item
                render={<Link href={`/user/reports/${numericId}`} />}
                className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium outline-none data-[highlighted]:bg-muted"
              >
                <Eye aria-hidden="true" size={16} />
                <span>Xem chi tiết</span>
              </Menu.Item>
              {item.status === "PENDING" && (
                <>
                  <Menu.Item
                    render={
                      <Link href={`/user/reports/${numericId}?action=edit`} />
                    }
                    className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium outline-none data-[highlighted]:bg-muted"
                  >
                    <PencilSimple aria-hidden="true" size={16} />
                    <span>Chỉnh sửa</span>
                  </Menu.Item>
                  <Menu.Item
                    onClick={() => {
                      setSelected(item)
                      dialog.current?.showModal()
                    }}
                    className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-700 outline-none data-[highlighted]:bg-rose-500/10 dark:text-rose-300"
                  >
                    <ArrowUUpLeft aria-hidden="true" size={16} />
                    <span>Thu hồi báo cáo</span>
                  </Menu.Item>
                </>
              )}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    )
  }

  return (
    <div
      className={
        embedded
          ? "px-0"
          : "space-y-4 rounded-xl border border-black/10 bg-card p-5 shadow-[0_8px_30px_rgb(15,23,42,0.06),0_1px_2px_rgb(15,23,42,0.04)] sm:p-6 dark:border-white/10 dark:shadow-[0_16px_44px_rgb(0,0,0,0.45),inset_0_1px_0_rgb(255,255,255,0.08)]"
      }
    >
      {!embedded && (
        <div className="flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <h2 className="font-heading text-base font-bold tracking-[-0.02em] text-foreground">
              Các báo cáo gần đây của bạn
            </h2>
            <p className="text-xs text-muted-foreground tabular-nums">
              {filteredItems.length.toLocaleString("vi-VN")} báo cáo
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <MagnifyingGlass
              aria-hidden="true"
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape" && search) {
                  setSearch("")
                  setPage(1)
                }
              }}
              placeholder="Tìm đối tượng hoặc danh mục..."
              aria-label="Tìm báo cáo theo đối tượng hoặc danh mục"
              className="min-h-10 w-full rounded-lg border border-black/10 bg-background py-2 pr-9 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/10"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("")
                  setPage(1)
                }}
                aria-label="Xóa từ khóa tìm kiếm"
                className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X aria-hidden="true" size={14} weight="bold" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading / Empty State */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-2.5 py-12 text-sm text-muted-foreground">
          <div className="motion-safe:animate-spin">
            <CircleNotch
              aria-hidden="true"
              size={18}
              weight="bold"
              className="text-primary"
            />
          </div>
          <span>Đang tải danh sách báo cáo...</span>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {search.trim()
            ? "Không tìm thấy báo cáo phù hợp với từ khóa."
            : "Chưa có báo cáo nào phù hợp với bộ lọc hiện tại."}
        </div>
      ) : (
        <>
          {/* Mobile Card List (< md) */}
          <ul className="divide-y divide-border/70 md:hidden">
            {visibleItems.map((item) => {
              const numericId = extractReportNumericId(item.id)
              const formattedTarget =
                item.targetType === "PHONE"
                  ? formatReportPhoneDisplay(
                      item.targetValue,
                      formatReportHotline
                    )
                  : item.targetValue

              return (
                <li
                  key={item.id}
                  className={cn(
                    "space-y-3 py-4 transition-colors",
                    embedded ? "px-4 sm:px-5" : "px-1"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/user/reports/${numericId}`}
                          className="font-mono text-xs font-semibold text-muted-foreground tabular-nums hover:text-foreground hover:underline"
                        >
                          {numericId}
                        </Link>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {item.submittedDate}
                        </span>
                      </div>
                      <Link
                        href={`/user/reports/${numericId}`}
                        className="flex items-center gap-2 text-sm font-semibold text-foreground hover:underline"
                      >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/60">
                          {renderTargetIcon(item.targetType)}
                        </span>
                        <span className="min-w-0 font-mono break-all tabular-nums">
                          {formattedTarget}
                        </span>
                      </Link>
                    </div>
                    <div className="shrink-0">{renderRowMenu(item)}</div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {renderStatus(item)}
                    <span className="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground">
                      {item.category}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                      <Paperclip aria-hidden="true" size={12} weight="bold" />
                      {item.evidenceCount} tệp
                    </span>
                    {item.status !== "PENDING" &&
                      item.rewardPoints !== null &&
                      item.rewardPoints > 0 && (
                        <span className="text-xs font-semibold text-emerald-700 tabular-nums dark:text-emerald-400">
                          +{item.rewardPoints} điểm
                        </span>
                      )}
                  </div>
                </li>
              )
            })}
          </ul>

          {/* Desktop Table (>= md) */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-muted/30 text-xs font-semibold text-muted-foreground">
                  <th className={cn("py-3 pr-3", embedded ? "pl-5" : "pl-2")}>
                    Mã báo cáo
                  </th>
                  <th className="px-3 py-3">Đối tượng bị báo cáo</th>
                  <th className="px-3 py-3">Danh mục</th>
                  <th className="px-3 py-3">Ngày gửi</th>
                  <th className="px-3 py-3">Bằng chứng</th>
                  <th className="px-3 py-3">Trạng thái</th>
                  <th className="px-3 py-3">Điểm thưởng</th>
                  <th
                    className={cn(
                      "py-3 pl-3 text-center",
                      embedded ? "pr-5" : "pr-2"
                    )}
                  >
                    Quản lý
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {visibleItems.map((item) => {
                  const numericId = extractReportNumericId(item.id)
                  const formattedTarget =
                    item.targetType === "PHONE"
                      ? formatReportPhoneDisplay(
                          item.targetValue,
                          formatReportHotline
                        )
                      : item.targetValue

                  return (
                    <tr
                      key={item.id}
                      className="relative transition-colors hover:bg-muted/30 focus-within:bg-muted/30"
                    >
                      <td
                        className={cn(
                          "py-3.5 pr-3 font-mono text-xs font-semibold text-muted-foreground tabular-nums",
                          embedded ? "pl-5" : "pl-2"
                        )}
                      >
                        <Link
                          href={`/user/reports/${numericId}`}
                          aria-label={`Xem chi tiết báo cáo ${numericId}`}
                          className="after:absolute after:inset-0 after:cursor-pointer focus-visible:underline"
                        >
                          {numericId}
                        </Link>
                      </td>

                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/60">
                            {renderTargetIcon(item.targetType)}
                          </div>
                          <span className="max-w-[260px] truncate font-mono text-sm font-semibold text-foreground tabular-nums">
                            {formattedTarget}
                          </span>
                        </div>
                      </td>

                      <td className="px-3 py-3.5">
                        <span className="inline-block max-w-[200px] rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground">
                          {item.category}
                        </span>
                      </td>

                      <td className="px-3 py-3.5 text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                        {item.submittedDate}
                      </td>

                      <td className="px-3 py-3.5">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-muted-foreground tabular-nums">
                          <Paperclip
                            aria-hidden="true"
                            size={13}
                            weight="bold"
                          />
                          <span>{item.evidenceCount} tệp</span>
                        </span>
                      </td>

                      <td className="px-3 py-3.5">{renderStatus(item)}</td>

                      <td className="px-3 py-3.5 whitespace-nowrap tabular-nums">
                        {item.status === "PENDING" ||
                        item.rewardPoints === null ? (
                          <span
                            className="text-xs text-muted-foreground"
                            aria-label="Chưa có điểm thưởng"
                          >
                            --
                          </span>
                        ) : item.rewardPoints > 0 ? (
                          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            +{item.rewardPoints} điểm
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            0 điểm
                          </span>
                        )}
                      </td>

                      <td
                        className={cn(
                          "py-3.5 pl-3 text-center",
                          embedded ? "pr-5" : "pr-2"
                        )}
                      >
                        {renderRowMenu(item)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Real Client-Side Pagination for Standalone Mode */}
      {!embedded && totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
          <p className="text-xs text-muted-foreground tabular-nums">
            Trang {safePage} / {totalPages}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Trang trước"
              className="inline-flex size-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CaretLeft aria-hidden="true" size={14} weight="bold" />
            </button>
            {pageTokens.map((token) =>
              typeof token === "number" ? (
                <button
                  key={token}
                  type="button"
                  onClick={() => setPage(token)}
                  aria-current={safePage === token ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-lg px-2 text-xs font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    safePage === token
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-background text-foreground hover:bg-muted"
                  )}
                >
                  {token}
                </button>
              ) : (
                <span
                  key={token}
                  aria-hidden="true"
                  className="px-1.5 text-xs text-muted-foreground"
                >
                  …
                </span>
              )
            )}
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Trang sau"
              className="inline-flex size-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CaretRight aria-hidden="true" size={14} weight="bold" />
            </button>
          </div>
        </div>
      )}

      {/* Withdraw Confirmation Dialog */}
      <dialog
        ref={dialog}
        onCancel={(event) => {
          if (busy) event.preventDefault()
        }}
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-black/10 bg-card p-6 text-foreground shadow-[0_16px_44px_rgb(15,23,42,0.18)] backdrop:bg-black/45 dark:border-white/12 dark:shadow-[0_24px_64px_rgb(0,0,0,0.65),inset_0_1px_0_rgb(255,255,255,0.08)]"
        aria-labelledby="recent-withdraw-title"
      >
        <h2
          id="recent-withdraw-title"
          className="font-heading text-lg font-bold tracking-[-0.02em]"
        >
          Thu hồi báo cáo này?
        </h2>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
          Bạn muốn thu hồi báo cáo về{" "}
          <span className="font-mono font-semibold text-foreground">
            {selected?.targetValue}
          </span>
          ? Báo cáo sẽ dừng chờ kiểm duyệt và không thể khôi phục trạng thái
          chờ.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => dialog.current?.close()}
            className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full border border-border bg-background px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void withdraw()}
            className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full bg-rose-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 dark:bg-rose-600 dark:hover:bg-rose-500"
          >
            {busy ? "Đang thu hồi..." : "Xác nhận thu hồi"}
          </button>
        </div>
      </dialog>
    </div>
  )
}
