"use client"
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

function contextDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("vi-VN") : "Chưa có dữ liệu"
}

function approvalRate(approved: number, decided: number) {
  return decided
    ? `${Math.round((approved / decided) * 100)}%`
    : "Chưa có quyết định"
}

function ReviewContext({ item }: { item: ModeratorReportItem }) {
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
    ["Số điện thoại", reporter.phoneNumber || "Chưa cung cấp"],
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
    <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {[
        {
          title: "Đối tượng bị báo cáo",
          name: item.targetIdentifier,
          fields: indicatorFields,
        },
        { title: "Người gửi", name: item.reportedBy, fields: reporterFields },
      ].map(({ title, name, fields }, index) => (
        <section
          key={title}
          className={`min-w-0 rounded-2xl border p-4 sm:p-5 ${index === 0 ? "border-primary/25 bg-primary/5 ring-1 ring-primary/10" : "border-border bg-muted/30"}`}
        >
          <p className="text-xs font-semibold tracking-wide text-muted-foreground">
            {title}
          </p>
          {index === 0 ? (
            <h1 className="mt-2 font-heading text-2xl font-bold break-words text-primary sm:text-3xl">
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
                  className={`rounded-full border px-2.5 py-1 font-semibold ${indicator.blacklistStatus === "ACTIVE" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-border bg-card text-muted-foreground"}`}
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
            <dl className="mt-4 grid grid-cols-3 gap-2">
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
                  className="rounded-xl border border-border bg-card p-2.5"
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
        </section>
      ))}
    </div>
  )
}

export function ReportQueueDetailView({
  item,
  onDecisionSubmitted,
  onStartReview,
  reviewActive = false,
  onDirtyChange,
  busy = false,
}: {
  item: ModeratorReportItem | null
  onDecisionSubmitted: (payload: ModerationDecisionPayload) => Promise<void>
  onStartReview: () => Promise<void>
  reviewActive?: boolean
  onDirtyChange?: (dirty: boolean) => void
  busy?: boolean
}) {
  if (!item)
    return (
      <p className="p-8 text-sm text-muted-foreground">
        Chọn một báo cáo để xem chi tiết.
      </p>
    )
  const pending = item.status === "Pending" || item.status === "In Review"
  const canReview = ownsReportReview(item)
  return (
    <div className="space-y-5 p-5">
      <header className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5">
            Mã báo cáo
            <span className="font-semibold text-foreground tabular-nums">
              {item.rawId ?? Number(item.id.split("-").at(-1))}
            </span>
          </span>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${reportStatusClass[item.status]}`}
          >
            {reportStatusLabel[item.status] ?? item.status}
          </span>
        </div>
        <ReviewContext item={item} />
        <dl className="mt-4 grid gap-4 border-t border-border pt-4 text-sm sm:grid-cols-3">
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
      </header>
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="text-sm font-bold">Mô tả hành vi</h2>
          <p
            className={`mt-2 text-sm break-words whitespace-pre-wrap ${item.description?.trim() ? "text-foreground" : "text-muted-foreground italic"}`}
          >
            {item.description?.trim() || "Chưa có mô tả."}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-bold">Nội dung tin nhắn bị báo cáo</h2>
          <p
            className={`mt-2 text-sm break-words whitespace-pre-wrap ${item.reportedMessage?.trim() ? "text-foreground" : "text-muted-foreground italic"}`}
          >
            {item.reportedMessage?.trim() ||
              "Người gửi không cung cấp nội dung tin nhắn."}
          </p>
        </div>
      </section>
      {pending && item.canReview === true && !reviewActive && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void onStartReview()}
          className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
        >
          {busy ? "Đang bắt đầu duyệt..." : "Bắt đầu duyệt"}
        </button>
      )}
      {pending &&
        !canReview &&
        !(item.status === "Pending" && item.canReview === true) && (
          <p className="text-sm text-muted-foreground">
            Báo cáo này chỉ được xem. Bạn chưa có phiên duyệt hoặc không có
            quyền duyệt.
          </p>
        )}
      {item.whitelisted && (
        <section
          role="status"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
        >
          <h2 className="font-bold">Đối tượng đang thuộc danh sách tin cậy</h2>

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
      {pending && canReview && reviewActive && (
        <>
          <ReportDecisionForm
            key={item.id}
            reportId={item.id}
            currentCategoryId={item.categoryId}
            currentCategoryName={item.category}
            selectedTaxonomies={item.taxonomies ?? []}
            onSubmit={onDecisionSubmitted}
            onDirtyChange={onDirtyChange}
            isSubmitting={busy}
          />
        </>
      )}
    </div>
  )
}
