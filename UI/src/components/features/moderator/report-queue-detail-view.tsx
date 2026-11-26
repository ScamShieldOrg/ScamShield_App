"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import {
  ArrowRight,
  ClipboardText,
  Flag,
  Gavel,
  ShieldWarning,
} from "@phosphor-icons/react"
import { ExpandableIconButton } from "@/components/shared/expandable-icon-action"
import type {
  ModeratorReportItem,
  ModerationDecisionPayload,
} from "@/features/moderator/types/moderator.types"
import {
  reportStatusLabel,
  reportStatusClass,
  reportTargetTypeLabel,
  ownsReportReview,
} from "@/features/moderator/report-review"
import { ReportEvidencePreview } from "./report-evidence-preview"
import { ReportDecisionForm } from "./report-decision-form"
import { ModeratorEscalateModal } from "./abuse-escalation/moderator-escalate-modal"
import { formatReportPhoneInput } from "@/features/report/utils/report-phone"
import { cn } from "@/lib/utils"

const panelSurface =
  "rounded-xl border border-black/10 bg-card p-5 shadow-[0_8px_30px_rgb(15,23,42,0.06),0_1px_2px_rgb(15,23,42,0.04)] sm:p-6 dark:border-white/10 dark:shadow-[0_16px_44px_rgb(0,0,0,0.45),inset_0_1px_0_rgb(255,255,255,0.08)]"

function contextDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("vi-VN") : "Chưa có dữ liệu"
}

function approvalRate(approved: number, decided: number) {
  return decided
    ? `${Math.round((approved / decided) * 100)}%`
    : "Chưa có quyết định"
}

function ReviewContext({
  item,
  onOpenEscalate,
}: {
  item: ModeratorReportItem
  onOpenEscalate?: () => void
}) {
  const { indicatorContext: indicator, reporterContext: reporter } = item

  const indicatorFields = indicator && [
    ["Khiếu nại về đối tượng", indicator.disputes],
    ["Ghi nhận lần đầu", contextDate(indicator.firstSeenAt)],
    ["Ghi nhận gần nhất", contextDate(indicator.lastSeenAt)],
  ]
  const reporterFields = reporter && [
    ["Điểm uy tín", reporter.reputationPoints ?? "Chưa có dữ liệu"],
    ["Tham gia từ", contextDate(reporter.joinedAt)],
    ["Email", reporter.email || "Chưa cung cấp"],
    [
      "Số điện thoại",
      reporter.phoneNumber
        ? formatReportPhoneInput(reporter.phoneNumber)
        : "Chưa cung cấp",
    ],
    ["Báo cáo đã gửi", reporter.reports],
    [
      "Tỷ lệ báo cáo được duyệt",
      approvalRate(reporter.approvedReports, reporter.decidedReports),
    ],
    ["Khiếu nại đã gửi", reporter.disputes],
    [
      "Tỷ lệ khiếu nại được duyệt",
      approvalRate(reporter.approvedDisputes, reporter.decidedDisputes),
    ],
    [
      "Dấu hiệu cần xem xét",
      reporter.abuseFlags === 0
        ? "Chưa ghi nhận"
        : `${reporter.abuseFlags} lượt ghi nhận · ${reporter.openFlags} đang mở`,
    ],
  ]

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {[
        {
          title: "Đối tượng bị báo cáo",
          name:
            item.targetType === "PHONE"
              ? formatReportPhoneInput(item.targetIdentifier)
              : item.targetIdentifier,
          fields: indicatorFields,
        },
        { title: "Người gửi", name: item.reportedBy, fields: reporterFields },
      ].map(({ title, name, fields }, index) => (
        <section key={title} className={cn("min-w-0", panelSurface)}>
          <p className="text-xs font-semibold text-muted-foreground">{title}</p>
          {index === 0 ? (
            <h1 className="mt-2 font-mono text-2xl font-bold break-words tracking-tight text-foreground sm:text-3xl">
              {name}
            </h1>
          ) : (
            <h2 className="mt-1.5 font-heading text-lg font-bold break-words tracking-[-0.02em] text-foreground">
              {name}
            </h2>
          )}

          {index === 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">
                {reportTargetTypeLabel(item.targetType)}
              </span>
              {indicator && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 font-semibold",
                    indicator.blacklistStatus === "ACTIVE"
                      ? "border-rose-500/25 bg-rose-500/10 text-rose-800 dark:border-rose-400/25 dark:bg-rose-500/15 dark:text-rose-200"
                      : "border-border bg-muted/50 text-muted-foreground"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-1.5 rounded-full",
                      indicator.blacklistStatus === "ACTIVE"
                        ? "bg-rose-500 dark:bg-rose-400"
                        : "bg-muted-foreground/70"
                    )}
                  />
                  {indicator.blacklistStatus === "ACTIVE"
                    ? "Đang trong blacklist"
                    : indicator.blacklistStatus === "RETRACTED"
                      ? "Đã gỡ khỏi blacklist"
                      : "Chưa vào blacklist"}
                </span>
              )}
            </div>
          )}

          {index === 0 && indicator && (
            <dl className="mt-5 grid grid-cols-3 divide-x divide-border/70 rounded-lg bg-muted/35">
              {[
                {
                  label: "Tổng báo cáo",
                  value: indicator.reports,
                  color: "text-foreground",
                },
                {
                  label: "Đã duyệt",
                  value: indicator.approvedReports,
                  color: "text-emerald-700 dark:text-emerald-300",
                },
                {
                  label: "Bị từ chối",
                  value: indicator.rejectedReports,
                  color: "text-rose-700 dark:text-rose-300",
                },
              ].map(({ label, value, color }) => (
                <div key={label} className="min-w-0 p-3">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd
                    className={`mt-1 text-lg font-bold tabular-nums ${color}`}
                  >
                    {value ?? "—"}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {fields && (
            <dl className="mt-4 grid gap-x-4 gap-y-3 border-t border-border/70 pt-4 sm:grid-cols-2">
              {fields.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-sm font-semibold break-words tabular-nums">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {index === 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3.5">
              <span className="text-xs text-muted-foreground">
                Phát hiện dấu hiệu lạm dụng?
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <ExpandableIconButton
                  onClick={onOpenEscalate}
                  icon={<Flag aria-hidden="true" size={15} weight="bold" />}
                  label="Gắn cờ & chuyển Admin"
                  variant="warning"
                />
                <Link
                  href="/moderator/flagged-accounts"
                  className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span>Xử lý lạm dụng</span>
                  <ArrowRight aria-hidden="true" size={14} weight="bold" />
                </Link>
              </div>
            </div>
          )}
        </section>
      ))}
    </div>
  )
}

export function ReportQueueDetailView({
  item,
  onDecisionSubmitted,
  onStartReview,
  onDirtyChange,
  busy = false,
}: {
  item: ModeratorReportItem | null
  onDecisionSubmitted: (payload: ModerationDecisionPayload) => Promise<void>
  onStartReview: () => Promise<void>
  onDirtyChange?: (dirty: boolean) => void
  busy?: boolean
}) {
  const [isEscalateOpen, setIsEscalateOpen] = useState(false)
  const decisionRef = useRef<HTMLDivElement>(null)

  if (!item) {
    return (
      <div className="mx-auto mt-10 flex max-w-sm flex-col items-center gap-3 p-6 text-center text-sm text-muted-foreground">
        <ClipboardText size={28} aria-hidden="true" />
        <p>Chọn một báo cáo để xem chi tiết.</p>
      </div>
    )
  }

  const pending = item.status === "Pending" || item.status === "In Review"
  const canReview = ownsReportReview(item)
  const numericId = item.rawId ?? Number(item.id.split("-").at(-1))

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 pb-6 sm:px-6">
      <header className="z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/10 bg-card px-4 py-3 shadow-xs lg:sticky lg:top-0 dark:border-white/10">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-700 dark:border-sky-400/20 dark:bg-sky-500/15 dark:text-sky-300">
              <ClipboardText size={18} aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs leading-none text-muted-foreground">
                Mã báo cáo
              </p>
              <p className="mt-1 font-mono text-base leading-none font-bold text-foreground tabular-nums">
                #{numericId}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
              reportStatusClass[item.status]
            )}
          >
            {reportStatusLabel[item.status] ?? item.status}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {item.status === "Pending" && item.canReview === true && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onStartReview()}
              className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-xs transition-[opacity,transform] duration-120 hover:bg-primary/90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
            >
              <Gavel size={16} aria-hidden="true" />
              <span>
                {busy ? "Đang mở phiên duyệt..." : "Kiểm duyệt báo cáo"}
              </span>
            </button>
          )}
          {canReview && (
            <ExpandableIconButton
              onClick={() => {
                decisionRef.current?.scrollIntoView({ block: "start" })
                decisionRef.current?.focus({ preventScroll: true })
              }}
              icon={<Gavel size={16} weight="bold" aria-hidden="true" />}
              label="Đến phần quyết định"
              variant="outline"
            />
          )}
        </div>
      </header>

      <ReviewContext
        item={item}
        onOpenEscalate={() => setIsEscalateOpen(true)}
      />

      <section className={cn("space-y-4", panelSurface)}>
        <dl className="grid gap-3 border-b border-border/70 pb-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Danh mục</dt>
            <dd className="mt-1 font-semibold text-foreground">
              {item.category}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Ngày gửi</dt>
            <dd className="mt-1 font-medium text-foreground tabular-nums">
              {item.reportedAt}
            </dd>
          </div>
          {item.processedAt && (
            <div>
              <dt className="text-xs text-muted-foreground">
                Thời gian đã xử lý
              </dt>
              <dd className="mt-1 font-medium text-foreground tabular-nums">
                {item.processedAt}
              </dd>
            </div>
          )}
        </dl>
        <div>
          <h2 className="font-heading text-base font-bold tracking-[-0.02em] text-foreground">
            Mô tả hành vi
          </h2>
          <p
            className={cn(
              "mt-2 max-w-[65ch] text-sm leading-relaxed break-words whitespace-pre-wrap",
              item.description?.trim()
                ? "text-foreground"
                : "text-muted-foreground italic"
            )}
          >
            {item.description?.trim() || "Chưa có mô tả."}
          </p>
        </div>
      </section>

      {pending &&
        !canReview &&
        !(item.status === "Pending" && item.canReview === true) && (
          <p className="rounded-lg border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-900 dark:border-sky-400/20 dark:bg-sky-500/15 dark:text-sky-200">
            {item.status === "In Review"
              ? "Báo cáo này đang được xử lý bởi kiểm duyệt viên khác (chế độ chỉ xem)."
              : "Báo cáo này chỉ được xem. Bạn chưa có phiên duyệt hoặc không có quyền duyệt."}
          </p>
        )}

      {item.whitelisted && (
        <section
          role="status"
          className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-950 dark:border-amber-400/25 dark:bg-amber-500/15 dark:text-amber-100"
        >
          <h2 className="flex items-center gap-2 font-semibold">
            <ShieldWarning
              size={18}
              weight="fill"
              className="shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
            <span>Đối tượng đang thuộc danh sách tin cậy</span>
          </h2>
          {pending && (
            <p className="mt-1 text-sm">
              Báo cáo này không thể được phê duyệt.
            </p>
          )}
          <ul className="mt-2 space-y-1 text-xs">
            {item.whitelistMatches?.map((match) => (
              <li key={match.whitelistEntryId} className="tabular-nums">
                {match.legalName}
                {match.verifiedAt
                  ? ` · Xác minh: ${new Date(match.verifiedAt).toLocaleString("vi-VN")}`
                  : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      <ReportEvidencePreview
        key={item.id}
        reportId={item.rawId ?? item.id}
        evidences={item.evidences ?? []}
        completeness={item.evidenceCompleteness}
      />

      {canReview && item.indicatorContext?.blacklistStatus === "RETRACTED" && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-xs text-amber-950 dark:border-amber-400/25 dark:bg-amber-500/15 dark:text-amber-100">
          <ShieldWarning
            aria-hidden="true"
            size={20}
            className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
            weight="fill"
          />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Cảnh báo chỉ số nhạy cảm: Đối tượng đã từng được gỡ khỏi Blacklist
              qua quy trình khiếu nại (Dispute)
            </p>
            <p className="max-w-[65ch] text-xs leading-relaxed text-amber-900/90 dark:text-amber-200/90">
              Để phòng ngừa rủi ro &quot;bão báo cáo&quot; (spam/phá hoại có chủ
              đích), hệ thống yêu cầu thẩm định kỹ các tài liệu vi phạm. Quyết
              định phê duyệt kích hoạt lại Blacklist yêu cầu tài khoản Quản trị
              viên (ADMIN) kèm căn cứ vi phạm mới.
            </p>
          </div>
        </div>
      )}

      {canReview && (
        <div ref={decisionRef} tabIndex={-1} className="scroll-mt-24">
          <ReportDecisionForm
            key={item.id}
            reportId={item.id}
            currentCategoryId={item.categoryId}
            currentCategoryName={item.category}
            selectedTaxonomies={item.taxonomies ?? []}
            onSubmit={onDecisionSubmitted}
            onDirtyChange={onDirtyChange}
            isSubmitting={busy}
            approvalBlocked={item.whitelisted}
          />
        </div>
      )}

      <ModeratorEscalateModal
        isOpen={isEscalateOpen}
        onClose={() => setIsEscalateOpen(false)}
        report={item}
      />
    </div>
  )
}
