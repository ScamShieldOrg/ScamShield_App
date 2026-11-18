"use client"
import { useState, useRef } from "react"
import Link from "next/link"
import { ClipboardText, Gavel, ShieldWarning } from "@phosphor-icons/react"
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
        <section
          key={title}
          className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5"
        >
          <p className="text-xs font-semibold tracking-wide text-muted-foreground">
            {title}
          </p>
          {index === 0 ? (
            <h1 className="mt-2 text-2xl font-bold break-words tracking-tight text-foreground sm:text-3xl">
              {name}
            </h1>
          ) : (
            <h2 className="mt-1 text-lg font-bold break-words">{name}</h2>
          )}
          {index === 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">
                {reportTargetTypeLabel(item.targetType)}
              </span>
              {indicator && (
                <span
                  className={`rounded-full border px-2.5 py-1 font-semibold ${indicator.blacklistStatus === "ACTIVE" ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200" : "border-border bg-card text-muted-foreground"}`}
                >
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
            <dl className="mt-5 grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-muted/35">
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
                  color: "text-destructive",
                },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="min-w-0 p-2.5 sm:p-3"
                >
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
            <dl className="mt-4 grid gap-x-4 gap-y-3 border-t border-border pt-4 sm:grid-cols-2">
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
            <div className="mt-4 border-t border-border pt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">Phát hiện dấu hiệu lạm dụng?</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenEscalate}
                  className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
                >
                  Gắn cờ & chuyển Admin
                </button>
                <Link
                  href="/moderator/flagged-accounts"
                  className="text-xs font-semibold text-muted-foreground hover:underline"
                >
                  Xử lý lạm dụng &rarr;
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
  if (!item)
    return (
      <div className="mx-auto mt-10 flex max-w-sm flex-col items-center gap-3 p-6 text-center text-sm text-muted-foreground">
        <ClipboardText size={28} aria-hidden="true" />
        <p>Chọn một báo cáo để xem chi tiết.</p>
      </div>
    )
  const pending = item.status === "Pending" || item.status === "In Review"
  const canReview = ownsReportReview(item)
  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 pb-6 sm:px-6">
      <header className="z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 lg:sticky lg:top-0">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200">
              <ClipboardText size={18} aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs leading-none text-muted-foreground">
                Mã báo cáo
              </p>
              <p className="mt-1 text-base leading-none font-semibold tabular-nums">
                {item.rawId ?? Number(item.id.split("-").at(-1))}
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${reportStatusClass[item.status]}`}
          >
            {reportStatusLabel[item.status] ?? item.status}
          </span>
        </div>
        {item.status === "Pending" && item.canReview === true && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onStartReview()}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
          >
            <Gavel size={16} aria-hidden="true" />
            {busy ? "Đang mở phiên duyệt..." : "Kiểm duyệt báo cáo"}
          </button>
        )}
        {canReview && (
          <button
            type="button"
            onClick={() => {
              decisionRef.current?.scrollIntoView({ block: "start" })
              decisionRef.current?.focus({ preventScroll: true })
            }}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Gavel size={16} aria-hidden="true" />
            Đến phần quyết định
          </button>
        )}
      </header>
      <ReviewContext item={item} onOpenEscalate={() => setIsEscalateOpen(true)} />
      <section className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <dl className="grid gap-3 border-b border-border pb-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Danh mục</dt>
            <dd className="mt-1 font-medium text-foreground">
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
          <h2 className="text-base font-semibold">Mô tả hành vi</h2>
          <p
            className={`mt-2 max-w-prose text-sm leading-relaxed break-words whitespace-pre-wrap ${item.description?.trim() ? "text-foreground" : "text-muted-foreground italic"}`}
          >
            {item.description?.trim() || "Chưa có mô tả."}
          </p>
        </div>
      </section>
      {pending &&
        !canReview &&
        !(item.status === "Pending" && item.canReview === true) && (
          <p className="text-sm text-muted-foreground">
            {item.status === "In Review"
              ? "Báo cáo này đang được xử lý bởi kiểm duyệt viên khác (chế độ chỉ xem)."
              : "Báo cáo này chỉ được xem. Bạn chưa có phiên duyệt hoặc không có quyền duyệt."}
          </p>
        )}
      {item.whitelisted && (
        <section
          role="status"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
        >
          <h2 className="flex items-center gap-2 font-semibold">
            <ShieldWarning size={18} className="shrink-0" aria-hidden="true" />
            Đối tượng đang thuộc danh sách tin cậy
          </h2>
          {pending && <p className="mt-1">Báo cáo này không thể được phê duyệt.</p>}

          <ul className="mt-2 space-y-1">
            {item.whitelistMatches?.map((match) => (
              <li key={match.whitelistEntryId}>
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
        <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200 flex items-start gap-3">
          <ShieldWarning size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" weight="fill" />
          <div className="space-y-1">
            <p className="font-bold text-slate-900 dark:text-white">
              Cảnh báo chỉ số nhạy cảm: Đối tượng này đã từng được gỡ khỏi Blacklist qua quy trình khiếu nại (Dispute)
            </p>
            <p className="text-[11px] leading-relaxed">
              Để phòng ngừa rủi ro &quot;bão báo cáo&quot; (spam/phá hoại có chủ đích), hệ thống yêu cầu thẩm định kỹ các tài liệu vi phạm. Quyết định phê duyệt kích hoạt lại Blacklist yêu cầu tài khoản Quản trị viên (ADMIN) kèm căn cứ vi phạm mới.
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
