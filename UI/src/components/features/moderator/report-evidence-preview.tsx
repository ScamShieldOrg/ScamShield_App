"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowSquareOut, Copy, FileText } from "@phosphor-icons/react"
import type { QueueEvidence } from "@/features/moderator/types/moderator.types"
import { safeEvidenceUrl } from "@/features/moderator/report-review"
import {
  analysisStatusLabels,
  similarityPercentage,
} from "@/features/moderator/evidence-analysis"
import { getModeratorReportById } from "@/features/moderator/services/moderator-report.service"

function EvidenceSimilarity({ evidence }: { evidence: QueueEvidence }) {
  const status = evidence.analysisStatus ?? "NOT_ANALYZED"
  return (
    <section
      className="space-y-3 rounded-xl border border-border bg-muted/30 p-4 text-xs"
      aria-label={`Phân tích tương đồng ${evidence.name}`}
    >
      <h3 className="font-semibold">Kiểm tra tương đồng</h3>
      <p role="status">{analysisStatusLabels[status] ?? "Chưa phân tích"}</p>
      {evidence.analyzedAt && (
        <p className="text-muted-foreground">
          Cập nhật: {formatEvidenceDate(evidence.analyzedAt)}
        </p>
      )}
      {(status === "COMPLETED" || status === "PARTIAL") && (
        <p className="text-muted-foreground">
          Hình ảnh:{" "}
          {evidence.imageFingerprintAvailable
            ? "Đã đối chiếu"
            : "Chưa có dữ liệu"}{" "}
          · Nội dung chữ:{" "}
          {evidence.ocrTextAvailable ? "Đã đối chiếu" : "Chưa có dữ liệu"}
        </p>
      )}
      {status === "PARTIAL" && (
        <p>Chưa kiểm tra đầy đủ; kết quả hiện có cần được xem xét thêm.</p>
      )}
      {status === "FAILED" && (
        <p>Không thể phân tích tệp. Vui lòng thử lại sau.</p>
      )}
      {status === "COMPLETED" && !(evidence.similarEvidenceCount ?? 0) && (
        <p>Chưa tìm thấy minh chứng gần giống trong dữ liệu đã đối chiếu.</p>
      )}
      {(evidence.similarEvidenceCount ?? 0) > 0 && (
        <p className="font-semibold">
          {evidence.similarEvidenceCount} minh chứng gần giống
        </p>
      )}
      <ul className="space-y-3">
        {evidence.similarEvidences?.map((match) => (
          <li
            key={match.evidenceId}
            className="space-y-2 border-t border-border pt-3"
          >
            <Link
              href={`/moderator/reports/${match.reportId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold underline"
            >
              Báo cáo #{match.reportId} <ArrowSquareOut size={14} />
            </Link>
            {match.matchTypes.includes("PHASH") && (
              <p>
                Hình ảnh tương tự:{" "}
                <strong className="tabular-nums">
                  {similarityPercentage(match.imageSimilarity)}
                </strong>
              </p>
            )}
            {match.matchTypes.includes("OCR_TEXT") && (
              <p>
                Nội dung chữ tương tự:{" "}
                <strong className="tabular-nums">
                  {similarityPercentage(match.textSimilarity)}
                </strong>
              </p>
            )}
            <p className="text-muted-foreground">
              {match.sameReporter
                ? "Cùng người gửi"
                : "Khác hoặc chưa xác định người gửi"}
            </p>
          </li>
        ))}
      </ul>
      {(evidence.similarEvidenceCount ?? 0) >
        (evidence.similarEvidences?.length ?? 0) && (
        <p>
          Hiển thị {evidence.similarEvidences?.length ?? 0}/
          {evidence.similarEvidenceCount} kết quả.
        </p>
      )}
    </section>
  )
}
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
    : date.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
}

function EvidenceComparison({ active }: { active: QueueEvidence }) {
  if (!active.duplicateCheckAvailable || (active.duplicateCount ?? 0) <= 0)
    return null
  return (
    <section
      aria-label={`Kết quả đối chiếu ${active.name}`}
      className="overflow-hidden rounded-xl border border-primary/15 bg-primary/[0.03] text-foreground"
    >
      <div className="flex items-center gap-2 border-b border-primary/10 px-4 py-3">
        <Copy size={18} className="shrink-0 text-primary" />
        <h3 className="flex-1 text-sm font-semibold">
          Minh chứng trùng nội dung
        </h3>
        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold tabular-nums">
          {active.duplicateCount} tệp
        </span>
      </div>
      <ul className="divide-y divide-border/70">
        {active.duplicates?.map((duplicate, index) => (
          <li key={duplicate.evidenceId} className="space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-muted-foreground">
                Kết quả {index + 1}
              </p>
              <Link
                href={`/moderator/reports/${duplicate.reportId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold transition-colors hover:border-primary/30 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                Xem báo cáo <ArrowSquareOut size={14} />
              </Link>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
              <div>
                <dt className="text-muted-foreground">Người gửi</dt>
                <dd className="mt-1 font-medium">
                  {duplicate.sameReporter
                    ? "Cùng người gửi"
                    : "Khác hoặc chưa xác định"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Trạng thái báo cáo</dt>
                <dd className="mt-1 font-medium">
                  {{
                    PENDING: "Chờ duyệt",
                    IN_REVIEW: "Đang duyệt",
                    APPROVED: "Đã phê duyệt",
                    REJECTED: "Đã từ chối",
                    WITHDRAWN: "Đã thu hồi",
                  }[duplicate.reportStatus] ?? "Chưa có thông tin"}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">
                  Thời gian tải minh chứng
                </dt>
                <dd className="mt-1 font-medium tabular-nums">
                  {formatEvidenceDate(duplicate.createdAt)}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      {(active.duplicateCount ?? 0) > (active.duplicates?.length ?? 0) && (
        <p className="border-t border-border/70 px-4 py-3 text-xs text-muted-foreground">
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
        <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {displayed.map((evidence) => {
            const url = safeEvidenceUrl(evidence.url)
            const content = (
              <>
                <EvidenceThumbnail key={evidence.url} evidence={evidence} />
                <span className="min-w-0 font-semibold">{evidence.name}</span>
              </>
            )
            const cardClass =
              "flex max-w-full items-center gap-3 rounded-xl border border-border bg-white p-3 text-left text-xs break-all text-foreground dark:bg-card"
            return (
              <div key={evidence.id} className="min-w-0 space-y-3">
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
                <EvidenceComparison active={evidence} />
                <EvidenceSimilarity evidence={evidence} />
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
