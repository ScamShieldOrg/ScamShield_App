"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowSquareOut, FileText } from "@phosphor-icons/react"
import type { QueueEvidence } from "@/features/moderator/types/moderator.types"
import { reportStatusClasses } from "@/features/report/utils/report-status"
import { safeEvidenceUrl } from "@/features/moderator/report-review"
import {
  analysisStatusLabels,
  similarityPercentage,
} from "@/features/moderator/evidence-analysis"
import { getModeratorReportById } from "@/features/moderator/services/moderator-report.service"

function RelatedReportStatus({ status }: { status: string }) {
  const labels: Record<string, string> = {
    PENDING: "Chờ duyệt",
    IN_REVIEW: "Đang duyệt",
    APPROVED: "Đã phê duyệt",
    REJECTED: "Đã từ chối",
    WITHDRAWN: "Đã thu hồi",
  }
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 font-semibold ${reportStatusClasses[status] ?? "border-border text-muted-foreground"}`}
    >
      {labels[status] ?? "Chưa có thông tin"}
    </span>
  )
}
function EvidenceSimilarity({ evidence }: { evidence: QueueEvidence }) {
  const status = evidence.analysisStatus ?? "NOT_ANALYZED"
  const matches = evidence.similarEvidences ?? []
  return (
    <section
      className="overflow-hidden rounded-xl border border-border text-xs"
      aria-label={`Phân tích tương đồng ${evidence.name}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/40 px-3 py-2">
        <h3 className="font-semibold">
          Gần giống{" "}
          <span className="ml-1 text-muted-foreground">
            ({evidence.similarEvidenceCount ?? 0})
          </span>
        </h3>
      </div>
      {matches.length > 0 && (
        <ul className="divide-y divide-border">
          {matches.map((match) => (
            <li key={match.evidenceId} className="space-y-3 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold">
                    Báo cáo {match.reportId}{" "}
                    <span className="font-normal text-muted-foreground">
                      / Minh chứng {match.evidenceId}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    {match.sameReporter
                      ? "Cùng người gửi"
                      : "Khác hoặc chưa xác định người gửi"}
                  </p>
                  <p className="text-muted-foreground">
                    Cập nhật lần cuối:{" "}
                    <time className="tabular-nums">
                      {formatEvidenceDate(match.reportUpdatedAt ?? null)}
                    </time>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <RelatedReportStatus status={match.reportStatus} />
                  <Link
                    href={`/moderator/reports/${match.reportId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={comparisonLinkClass}
                  >
                    Xem báo cáo <ArrowSquareOut size={14} />
                  </Link>
                </div>
              </div>
              {(match.matchTypes.includes("PHASH") ||
                match.matchTypes.includes("OCR_TEXT")) && (
                <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-2.5">
                  {match.matchTypes.includes("PHASH") && (
                    <span className="inline-flex min-h-7 items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 font-semibold">
                      Độ tương đồng hình ảnh:{" "}
                      <strong className="tabular-nums">
                        {similarityPercentage(match.imageSimilarity)}
                      </strong>
                    </span>
                  )}
                  {match.matchTypes.includes("OCR_TEXT") && (
                    <span className="inline-flex min-h-7 items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 font-semibold">
                      Độ tương đồng văn bản (OCR):{" "}
                      <strong className="tabular-nums">
                        {similarityPercentage(match.textSimilarity)}
                      </strong>
                    </span>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {matches.some((match) => match.matchTypes.includes("OCR_TEXT")) && (
        <p className="border-t border-border px-3 py-2 text-muted-foreground">
          OCR đối chiếu phần chữ trích xuất từ hai minh chứng; tỷ lệ cho biết
          mức tương đồng của văn bản.
        </p>
      )}
      {status !== "COMPLETED" && (
        <p className="px-3 py-2 text-muted-foreground">
          {analysisStatusLabels[status] ?? "Chưa phân tích"}
        </p>
      )}
      {status === "PARTIAL" && (
        <p className="px-3 py-2 text-muted-foreground">Chưa kiểm tra đầy đủ.</p>
      )}
      {status === "FAILED" && (
        <p className="px-3 py-2 text-muted-foreground">
          Không thể phân tích tệp. Vui lòng thử lại sau.
        </p>
      )}
      {(evidence.similarEvidenceCount ?? 0) > matches.length && (
        <p className="px-3 py-2 text-muted-foreground">
          Hiển thị {matches.length}/{evidence.similarEvidenceCount} kết quả.
        </p>
      )}
    </section>
  )
}
const comparisonLinkClass =
  "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 font-semibold transition-colors hover:border-primary/30 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
function EvidenceThumbnail({ evidence }: { evidence: QueueEvidence }) {
  const [failed, setFailed] = useState(false)
  const url = safeEvidenceUrl(evidence.url)
  const image = [
    "image",
    "jpg",
    "jpeg",
    "png",
    "image/jpeg",
    "image/png",
  ].includes(evidence.type.toLowerCase())
  return (
    <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-current/15 bg-white/90 text-primary">
      {image && url && !failed ? (
        // Preserve original evidence URLs, including signed storage URLs.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={`Ảnh thu nhỏ: ${evidence.name}`}
          width={80}
          height={80}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="size-full object-contain"
        />
      ) : (
        <FileText size={28} />
      )}
    </span>
  )
}

function formatEvidenceDate(value: string | null): string {
  if (!value) return "Chưa có thông tin"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? "Chưa có thông tin"
    : `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

function EvidenceComparison({ active }: { active: QueueEvidence }) {
  if (!active.duplicateCheckAvailable || (active.duplicateCount ?? 0) <= 0)
    return null
  return (
    <section
      aria-label={`Kết quả đối chiếu ${active.name}`}
      className="overflow-hidden rounded-xl border border-border text-xs"
    >
      <div className="flex flex-wrap items-center gap-2 bg-muted/40 px-3 py-2">
        <h3 className="font-semibold">Trùng tệp</h3>
        <span className="text-muted-foreground">({active.duplicateCount})</span>
      </div>
      <ul className="divide-y divide-border">
        {active.duplicates?.map((duplicate) => (
          <li
            key={duplicate.evidenceId}
            className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5"
          >
            <div className="min-w-0 space-y-1">
              <p className="font-semibold">
                Báo cáo {duplicate.reportId}{" "}
                <span className="font-normal text-muted-foreground">
                  / Minh chứng {duplicate.evidenceId}
                </span>
              </p>
              <p className="text-muted-foreground">
                {duplicate.sameReporter
                  ? "Cùng người gửi"
                  : "Khác hoặc chưa xác định người gửi"}
              </p>
              <p className="text-muted-foreground">
                Cập nhật lần cuối:{" "}
                <time className="tabular-nums">
                  {formatEvidenceDate(duplicate.reportUpdatedAt ?? null)}
                </time>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <RelatedReportStatus status={duplicate.reportStatus} />
              <Link
                href={`/moderator/reports/${duplicate.reportId}`}
                target="_blank"
                rel="noopener noreferrer"
                className={comparisonLinkClass}
              >
                Xem báo cáo <ArrowSquareOut size={14} />
              </Link>
            </div>
          </li>
        ))}
      </ul>
      {(active.duplicateCount ?? 0) > (active.duplicates?.length ?? 0) && (
        <p className="px-3 py-2 text-muted-foreground">
          Hiển thị {active.duplicates?.length ?? 0}/{active.duplicateCount} kết
          quả.
        </p>
      )}
    </section>
  )
}

export function ReportEvidencePreview({
  evidences,
  reportId,
}: {
  evidences: QueueEvidence[]
  reportId?: string | number
  completeness?: number
}) {
  const [updated, setUpdated] = useState<QueueEvidence[] | null>(null)
  const displayed = updated ?? evidences
  const awaitingAnalysis = displayed.some(
    (evidence) => evidence.analysisStatus === "PENDING"
  )
  useEffect(() => {
    if (!reportId || !awaitingAnalysis) return
    let active = true
    let timer: ReturnType<typeof setTimeout>
    let attempts = 0
    const poll = async () => {
      try {
        const report = await getModeratorReportById(reportId)
        if (!active) return
        setUpdated(report.evidences ?? [])
        if (
          !report.evidences?.some(
            (evidence) => evidence.analysisStatus === "PENDING"
          )
        )
          return
      } catch {
        if (!active) return
      }
      if (active && ++attempts < 60) timer = setTimeout(poll, 3000)
    }
    timer = setTimeout(poll, 3000)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [reportId, awaitingAnalysis])
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-bold">
        Bằng chứng đính kèm ({displayed.length})
      </h2>
      {awaitingAnalysis && (
        <p role="status" className="text-xs text-muted-foreground">
          Đang phân tích minh chứng. Kết quả sẽ tự cập nhật khi hoàn tất.
        </p>
      )}
      {displayed.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Không có bằng chứng đính kèm.
        </p>
      ) : (
        <div className="space-y-4">
          {displayed.map((evidence) => {
            const url = safeEvidenceUrl(evidence.url)
            const content = (
              <>
                <EvidenceThumbnail key={evidence.url} evidence={evidence} />
                <span className="min-w-0 space-y-2">
                  <span className="inline-flex rounded-md border border-border bg-muted/40 px-2 py-1 font-semibold text-foreground tabular-nums">
                    Minh chứng {evidence.rawId ?? evidence.id}
                  </span>
                  <span className="block font-semibold">{evidence.name}</span>
                </span>
              </>
            )
            const cardClass =
              "flex max-w-full items-center gap-3 rounded-xl border border-border bg-white p-3 text-left text-xs break-all text-foreground dark:bg-card"
            return (
              <div
                key={evidence.id}
                className="min-w-0 space-y-3 rounded-xl border border-border/70 p-3"
              >
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Mở tệp gốc: ${evidence.name}`}
                    className={`${cardClass} cursor-pointer transition-all hover:border-primary/40 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`}
                  >
                    {content}
                  </a>
                ) : (
                  <div className={cardClass}>
                    {content}
                    <span className="text-muted-foreground">
                      Tệp không khả dụng
                    </span>
                  </div>
                )}
                <div className="grid items-start gap-3 xl:grid-cols-2">
                  <EvidenceComparison active={evidence} />
                  <EvidenceSimilarity evidence={evidence} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
