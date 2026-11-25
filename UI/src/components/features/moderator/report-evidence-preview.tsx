"use client"
import { useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { ArrowCounterClockwise, ArrowSquareOut, CaretDown, CaretUp, Eye, FileText, PencilSimple } from "@phosphor-icons/react"
import type { ModerationDecisionPayload, QueueEvidence } from "@/features/moderator/types/moderator.types"
import { reportStatusClasses } from "@/features/report/utils/report-status"
import { safeEvidenceUrl } from "@/features/moderator/report-review"
import {
  analysisStatusLabels,
  similarityPercentage,
} from "@/features/moderator/evidence-analysis"
import { getEvidenceImageSource, getModeratorReportById } from "@/features/moderator/services/moderator-report.service"

import { EvidenceImageEditor } from "@/components/features/report/evidence-image-editor"
import { ReportPrivacyNotice } from "@/components/features/report/report-privacy-notice"

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
const INITIAL_MATCH_COUNT = 3

function EvidenceComparison({ evidence }: { evidence: QueueEvidence }) {
  const [expanded, setExpanded] = useState(false)
  const listId = useId()
  const status = evidence.analysisStatus ?? "NOT_ANALYZED"
  const duplicates = evidence.duplicateCheckAvailable
    ? (evidence.duplicates ?? [])
    : []
  const similar = evidence.similarEvidences ?? []
  const matches = [
    ...duplicates.map((match) => ({ ...match, similarity: null })),
    ...similar.map((match) => ({ ...match, similarity: match })),
  ]
  const duplicateCount = evidence.duplicateCheckAvailable
    ? (evidence.duplicateCount ?? duplicates.length)
    : null
  const similarCount = evidence.similarEvidenceCount ?? similar.length
  const total = (duplicateCount ?? 0) + similarCount
  const visibleMatches = expanded ? matches : matches.slice(0, INITIAL_MATCH_COUNT)
  const remaining = matches.length - INITIAL_MATCH_COUNT
  if (total === 0 && matches.length === 0 && status === "COMPLETED") return null
  return (
    <section
      className="overflow-hidden rounded-xl border border-border text-xs"
      aria-label={`Phân tích tương đồng ${evidence.name}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2.5">
        <h3 className="font-semibold">
          Phát hiện minh chứng gần giống
        </h3>
        <div className="flex flex-wrap gap-2 tabular-nums">
          <span className="rounded-full border border-border bg-card px-2 py-1">
            Trùng tệp <strong>{duplicateCount ?? "—"}</strong>
          </span>
          <span className="rounded-full border border-border bg-card px-2 py-1">
            Gần giống <strong>{similarCount}</strong>
          </span>
        </div>
      </div>
      {matches.length > 0 && (
        <ul id={listId} className="divide-y divide-border">
          {visibleMatches.map(({ similarity, ...match }) => (
            <li key={match.evidenceId} className="space-y-2 px-3 py-2.5">
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
                  <span className="inline-flex min-h-7 items-center rounded-full border border-border bg-muted/40 px-2.5 py-1 font-semibold">
                    {similarity ? "Gần giống" : "Trùng tệp"}
                  </span>
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
              {similarity && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
                  {similarity.matchTypes.includes("PHASH") && (
                    <span>
                      Độ tương đồng hình ảnh:{" "}
                      <strong className="tabular-nums">
                        {similarityPercentage(similarity.imageSimilarity)}
                      </strong>
                    </span>
                  )}
                  {similarity.matchTypes.includes("OCR_TEXT") && (
                    <span>
                      Độ tương đồng văn bản:{" "}
                      <strong className="tabular-nums">
                        {similarityPercentage(similarity.textSimilarity)}
                      </strong>
                    </span>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {remaining > 0 && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((value) => !value)}
          className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 border-t border-border bg-muted/30 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          {expanded ? "Thu gọn" : `Xem thêm (${remaining})`}
          {expanded ? (
            <CaretUp size={16} aria-hidden="true" />
          ) : (
            <CaretDown size={16} aria-hidden="true" />
          )}
        </button>
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
      {total > matches.length && (
        <p className="px-3 py-2 text-muted-foreground">
          Có {matches.length}/{total} kết quả để xem.
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

export function ReportEvidencePreview({
  evidences,
  reportId,
  onPublicationDraftChange,
  busy = false,
}: {
  evidences: QueueEvidence[]
  reportId?: string | number
  completeness?: number
  onPublicationDraftChange?: (active: boolean, images?: ModerationDecisionPayload["publicImages"]) => void
  busy?: boolean
}) {
  const [evidenceId, setEvidenceId] = useState<number>()
  const [preview, setPreview] = useState<{ evidenceId: number; source: string }>()
  const [imageError, setImageError] = useState<{ evidenceId: number; message: string }>()
  const [confirmedImages, setConfirmedImages] = useState<Record<number, { file: File; url: string }>>({})
  const [visibleImageId, setVisibleImageId] = useState<number>()
  const confirmedUrls = useRef(new Map<number, string>())

  useEffect(() => {
    const urls = confirmedUrls.current
    return () => {
      for (const url of urls.values()) URL.revokeObjectURL(url)
      urls.clear()
    }
  }, [])

  useEffect(() => {
    if (!evidenceId || reportId == null || !onPublicationDraftChange) return
    const controller = new AbortController()
    void getEvidenceImageSource(reportId, evidenceId, controller.signal)
      .then(source => {
        if (!controller.signal.aborted) setPreview({ evidenceId, source })
      })
      .catch(error => {
        if (!controller.signal.aborted) setImageError({ evidenceId, message: error.message })
      })
    return () => controller.abort()
  }, [evidenceId, reportId, onPublicationDraftChange])


  function chooseImage(id?: number) {
    const images = Object.entries(confirmedImages).map(([id, { file }]) => ({
      evidenceId: Number(id),
      file,
    }))
    onPublicationDraftChange?.(id != null || images.length > 0, id == null ? images : undefined)
    setEvidenceId(id)
    setPreview(undefined)
    setImageError(undefined)
  }

  function confirmImage(id: number, file: File) {
    const previousUrl = confirmedUrls.current.get(id)
    const url = URL.createObjectURL(file)
    confirmedUrls.current.set(id, url)
    if (previousUrl) URL.revokeObjectURL(previousUrl)
    const nextImages = { ...confirmedImages, [id]: { file, url } }
    setConfirmedImages(nextImages)
    setVisibleImageId(undefined)
    setEvidenceId(undefined)
    setPreview(undefined)
    onPublicationDraftChange?.(true, Object.entries(nextImages).map(([id, { file }]) => ({
      evidenceId: Number(id),
      file,
    })))
  }

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
    <section className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <FileText size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />
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
              "flex min-w-0 flex-1 items-center gap-3 rounded-lg p-2 text-left text-xs break-all text-foreground"
            const canCheckImage = onPublicationDraftChange && evidence.type === "image" && evidence.rawId != null
            const confirmedImage = evidence.rawId == null ? undefined : confirmedImages[evidence.rawId]
            const showConfirmedImage = visibleImageId === evidence.rawId
            return (
              <div
                key={evidence.id}
                className="min-w-0 space-y-3 rounded-xl border border-border/70 p-3"
              >
                <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-2">
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
                  {canCheckImage && evidenceId !== evidence.rawId && !confirmedImage && (
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={`Kiểm tra minh chứng ${evidence.rawId}`}
                      className="flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-900 transition-colors hover:bg-blue-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-700 dark:bg-blue-900/45 dark:text-blue-200 dark:hover:bg-blue-900/65"
                      onClick={() => chooseImage(evidence.rawId)}
                    >
                      <PencilSimple size={18} aria-hidden="true" />
                      Kiểm tra minh chứng
                    </button>
                  )}
                </div>
                {canCheckImage && evidenceId === evidence.rawId && (
                  <fieldset disabled={busy} className="min-w-0 space-y-3">
                    {evidenceId && imageError?.evidenceId === evidenceId && <p role="alert" className="text-xs text-destructive">{imageError.message}</p>}
                    {evidenceId && preview?.evidenceId !== evidenceId && imageError?.evidenceId !== evidenceId &&
                      <p role="status" className="text-xs text-muted-foreground">Đang mở ảnh minh chứng…</p>}
                    {preview?.evidenceId !== evidenceId && (
                      <button type="button" className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted" onClick={() => chooseImage()}>
                        Hủy
                      </button>
                    )}
                    {evidenceId && preview?.evidenceId === evidenceId && (
                      <EvidenceImageEditor
                        key={evidenceId}
                        source={preview.source}
                        fileName={evidence.name}
                        saveLabel="Xác nhận"
                        onSave={file => confirmImage(evidenceId, file)}
                        onCancel={() => chooseImage()}
                      />
                    )}
                  </fieldset>
                )}
                {canCheckImage && evidence.rawId != null && evidenceId !== evidence.rawId && confirmedImage && (
                  <fieldset disabled={busy || evidenceId != null}>
                      <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p role="status" className="font-semibold">
                            Đã xác nhận bản chỉnh
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              aria-expanded={showConfirmedImage}
                              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                              onClick={() => setVisibleImageId(showConfirmedImage ? undefined : evidence.rawId)}
                            >
                              <Eye size={16} aria-hidden="true" />
                              {showConfirmedImage ? "Ẩn bản đã chỉnh" : "Xem bản đã chỉnh"}
                            </button>
                            <button
                              type="button"
                              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 font-semibold text-primary hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-ring"
                              onClick={() => chooseImage(evidence.rawId)}
                            >
                              <ArrowCounterClockwise size={16} aria-hidden="true" />
                              Rà soát lại từ đầu
                            </button>
                          </div>
                        </div>
                        {showConfirmedImage && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={confirmedImage.url} alt="Minh chứng đã chỉnh" className="mx-auto max-h-96 max-w-full rounded-lg object-contain" />
                        )}
                      </div>
                  </fieldset>
                )}
                <EvidenceComparison evidence={evidence} />
              </div>
            )
          })}
        </div>
      )}
      {onPublicationDraftChange && displayed.some(evidence => evidence.type === "image" && evidence.rawId != null) && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800/60 dark:bg-amber-950/30">
          <p className="font-semibold text-amber-950 dark:text-amber-100">
            Che thông tin nhạy cảm trước khi công khai.
          </p>
          <ReportPrivacyNotice forPublication />
        </div>
      )}
    </section>
  )
}
