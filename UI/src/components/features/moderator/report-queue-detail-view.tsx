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
        <p className="mt-4 text-xs text-muted-foreground">
          Đối tượng bị báo cáo
        </p>
        <h1 className="mt-1 text-xl font-bold break-all">
          {item.targetIdentifier}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {reportTargetTypeLabel(item.targetType)}
        </p>
        <dl className="mt-4 grid gap-4 border-t border-border pt-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Danh mục</dt>
            <dd className="mt-1 font-medium text-foreground">
              {item.category}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Người gửi</dt>
            <dd className="mt-1 font-medium text-foreground">
              {item.reportedBy}
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
