"use client"
import { useCallback, useEffect, useState, useRef } from "react"
import Link from "next/link"
import { ExpandableIconButton } from "@/components/shared/expandable-icon-action"
import { ArrowRight, ClipboardText, Flag, Gavel, ShieldWarning, UserCircle } from "@phosphor-icons/react"
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
  ]

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {[
        {
          title: "Đối tượng bị báo cáo",
          name:
            item.targetType === "PHONE"
              ? formatReportPhoneInput(item.targetIdentifier)
              : item.targetIdentifier,
          groups: indicatorFields
            ? [{ heading: "Lịch sử ghi nhận", fields: indicatorFields }]
            : [],
        },
        {
          title: "Người gửi",
          name: item.reportedBy,
          groups: reporterFields
            ? [
              { heading: "Hồ sơ và liên hệ", fields: reporterFields.slice(0, 4) },
              { heading: "Hoạt động gửi báo cáo và khiếu nại", fields: reporterFields.slice(4) },
            ]
            : [],
        },
      ].map(({ title, name, groups }, index) => (
        <section
          key={title}
          className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5"
        >
          <div className={`rounded-xl border px-3 py-3 sm:px-4 ${index === 0 ? "border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/45" : "border-border bg-muted/50"}`}>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              {index === 0 ? (
                <ClipboardText size={18} className="shrink-0 text-sky-800 dark:text-sky-200" aria-hidden="true" />
              ) : (
                <UserCircle size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
              {title}
            </h2>
            <p className={`mt-1 font-bold wrap-anywhere tracking-tight ${index === 0 ? "text-2xl sm:text-3xl" : "text-xl"}`}>
              {name}
            </p>
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
          </div>
          {index === 0 && indicator && (
            <dl className="mt-3 grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-muted/25">
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
          {groups.map(({ heading, fields }) => (
            <div key={heading} className="mt-4 border-t border-border pt-3">
              <h3 className="text-sm font-semibold">{heading}</h3>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2.5">
                {fields.map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="mt-1 text-sm font-semibold wrap-anywhere tabular-nums">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
          {index === 0 && (
            <div className="mt-4 space-y-3 rounded-xl border border-border bg-muted/25 p-3 sm:p-4">
              <h3 className="text-sm font-semibold">Nội dung báo cáo</h3>
              <dl className="flex flex-wrap gap-x-6 gap-y-2">
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">Loại lừa đảo</dt>
                  <dd className="text-sm font-semibold wrap-anywhere">
                    {item.category}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Ngày gửi</dt>
                  <dd className="text-sm font-medium tabular-nums">
                    {item.reportedAt}
                  </dd>
                </div>
                {item.processedAt && (
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Thời gian đã xử lý
                    </dt>
                    <dd className="text-sm font-medium tabular-nums">
                      {item.processedAt}
                    </dd>
                  </div>
                )}
              </dl>
              <div className="border-t border-border pt-3">
                <h4 className="text-sm font-semibold">Mô tả hành vi</h4>
                <p
                  className={`mt-2 text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap ${item.description?.trim() ? "text-foreground" : "text-muted-foreground italic"}`}
                >
                  {item.description?.trim() || "Chưa có mô tả."}
                </p>
              </div>
            </div>
          )}

          {index === 1 && (
            <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 dark:border-amber-900/60 dark:bg-amber-950/20">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
                <ShieldWarning size={17} className="shrink-0" aria-hidden="true" />
                Dấu hiệu lạm dụng
              </h3>
              {reporter && (
                <p className="mt-1 text-xs font-medium text-amber-950 dark:text-amber-100">
                  {reporter.abuseFlags === 0
                    ? "Chưa ghi nhận"
                    : `${reporter.abuseFlags} lượt ghi nhận · ${reporter.openFlags} đang mở`}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <button
                  type="button"
                  onClick={onOpenEscalate}
                  className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-100 px-2.5 text-xs font-semibold text-amber-950 transition-colors hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-amber-800 dark:bg-amber-900/50 dark:text-amber-100 dark:hover:bg-amber-900/80"
                >
                  <Flag size={15} className="shrink-0" aria-hidden="true" />
                  Gắn cờ và chuyển Admin
                </button>
                <Link
                  href="/moderator/flagged-accounts"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-1 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Xử lý lạm dụng
                  <ArrowRight size={14} className="shrink-0" aria-hidden="true" />
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
  const [formDirty, setFormDirty] = useState(false)
  const [imageDraftActive, setImageDraftActive] = useState(false)
  const [publicImages, setPublicImages] = useState<ModerationDecisionPayload["publicImages"]>()
  const updatePublicationDraft = useCallback(
    (active: boolean, images?: ModerationDecisionPayload["publicImages"]) => {
      setImageDraftActive(active)
      setPublicImages(images)
    },
    []
  )
  useEffect(() => {
    onDirtyChange?.(formDirty || imageDraftActive)
  }, [formDirty, imageDraftActive, onDirtyChange])
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
                {numericId}
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
      <ReviewContext item={item} onOpenEscalate={() => setIsEscalateOpen(true)} />
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
        busy={busy}
        onPublicationDraftChange={canReview && !item.whitelisted ? updatePublicationDraft : undefined}
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
            reportId={item.rawId ?? item.id}
            imageDraftActive={imageDraftActive}
            publicImages={publicImages}
            currentCategoryId={item.categoryId}
            currentCategoryName={item.category}
            selectedTaxonomies={item.taxonomies ?? []}
            onSubmit={onDecisionSubmitted}
            onDirtyChange={setFormDirty}
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
