"use client"

import {
  reportStatusClasses,
  reportStatusDotClasses,
  reportStatusLabels,
} from "@/features/report/utils/report-status"
import { formatReportHotline } from "@/features/report/utils/report-phone"
import { formatReportPhoneDisplay } from "./report-helpers"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { MotionConfig } from "motion/react"
import { toast } from "react-toastify"
import {
  ArrowLeft,
  ArrowSquareOut,
  ArrowUUpLeft,
  ArrowsClockwise,
  Bank,
  CalendarBlank,
  Check,
  CircleNotch,
  Clock,
  Copy,
  FileText,
  Globe,
  Info,
  MapPin,
  Paperclip,
  PencilSimple,
  Phone,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { ScamErrorCallout } from "@/components/features/check/scam-error-callout"
import { ExpandableIconButton } from "@/components/shared/expandable-icon-action"
import {
  getOwnReport,
  getReportCategories,
  updateOwnReport,
  withdrawOwnReport,
  uploadOwnReportEvidence,
  ReportActionError,
} from "@/features/report/services/report.service"
import type {
  OwnReportDetail,
  OwnReportEvidence,
  ScamCategoryItem,
} from "@/features/report/types/report.types"
import { dashboardService } from "@/features/dashboard/services/dashboard.service"
import type { DashboardRegionOption } from "@/features/dashboard/types/dashboard.types"
import {
  REPORT_FILE_ACCEPT,
  validateReportFiles,
} from "@/features/report/utils/report-upload"

const buttonBase =
  "inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-[background-color,border-color,opacity,transform] duration-120 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"

const secondaryButton = cn(
  buttonBase,
  "border border-black/10 bg-card text-foreground hover:bg-muted dark:border-white/10"
)
const primaryButton = cn(
  buttonBase,
  "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
)
const cardSurface =
  "rounded-xl border border-black/10 bg-card p-5 shadow-[0_8px_30px_rgb(15,23,42,0.06),0_1px_2px_rgb(15,23,42,0.04)] sm:p-6 dark:border-white/10 dark:shadow-[0_16px_44px_rgb(0,0,0,0.45),inset_0_1px_0_rgb(255,255,255,0.08)]"

const fieldClass =
  "min-h-10 w-full scroll-mt-24 rounded-lg border border-black/10 bg-background px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60 dark:border-white/10"

function displayTarget(value: string, type: string) {
  if (type !== "PHONE") return value
  return formatReportPhoneDisplay(value, formatReportHotline)
}

function safeUrl(value: string | null) {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined
  } catch {
    return undefined
  }
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("vi-VN")
}

function EvidenceThumbnail({ item }: { item: OwnReportEvidence }) {
  const [failed, setFailed] = useState(false)
  const url = safeUrl(item.fileUrl)
  const isImage = ["JPG", "JPEG", "PNG", "IMAGE/JPEG", "IMAGE/PNG"].includes(
    item.evidenceType.toUpperCase()
  )
  return (
    <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted text-muted-foreground">
      {isImage && url && !failed ? (
        // Original evidence URLs may be signed; load directly without an optimization proxy.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="Ảnh minh chứng thu nhỏ"
          width={56}
          height={56}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="size-full object-contain transition-transform group-hover:scale-105 motion-reduce:transform-none"
        />
      ) : (
        <FileText aria-hidden="true" size={22} />
      )}
    </span>
  )
}

const MODERATION_ACTION_META: Record<string, { label: string; dot: string }> = {
  APPROVE: {
    label: "Đã chấp nhận",
    dot: "bg-emerald-500 dark:bg-emerald-400",
  },
  REJECT: {
    label: "Từ chối",
    dot: "bg-rose-500 dark:bg-rose-400",
  },
  IN_REVIEW: {
    label: "Bắt đầu kiểm duyệt",
    dot: "bg-sky-500 dark:bg-sky-400",
  },
}

export function OwnReportDetailView({
  reportId,
  initialEdit = false,
}: {
  reportId: string
  initialEdit?: boolean
}) {
  const id = Number(reportId.replace(/^#?RPT-/i, ""))
  const validId = Number.isSafeInteger(id) && id > 0

  const [report, setReport] = useState<OwnReportDetail | null>(null)
  const [categories, setCategories] = useState<ScamCategoryItem[]>([])
  const [regions, setRegions] = useState<DashboardRegionOption[]>([])
  const [loading, setLoading] = useState(validId)
  const [error, setError] = useState(validId ? "" : "Mã báo cáo không hợp lệ.")
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [description, setDescription] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [region, setRegion] = useState("")
  const [evidence, setEvidence] = useState<OwnReportEvidence[]>([])
  const [evidenceChanged, setEvidenceChanged] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const confirmDialog = useRef<HTMLDialogElement>(null)

  const load = useCallback(async () => {
    if (!Number.isSafeInteger(id) || id <= 0) {
      setError("Mã báo cáo không hợp lệ.")
      setLoading(false)
      return
    }
    setLoading(true)
    setError("")
    try {
      setReport(await getOwnReport(id))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải báo cáo.")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (!validId) return
    let active = true
    void getOwnReport(id)
      .then((data) => {
        if (active) {
          setReport(data)
          if (initialEdit && data.status === "PENDING") {
            setDescription(data.description ?? "")
            setCategoryId(data.categoryId?.toString() ?? "")
            setRegion(data.regionCode ?? "")
            setEvidence(data.evidences)
            setEditing(true)
          }
        }
      })
      .catch((e) => {
        if (active) {
          setError(e instanceof Error ? e.message : "Không thể tải báo cáo.")
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    void getReportCategories().then((data) => {
      if (active) setCategories(data)
    })
    void dashboardService
      .getFilters()
      .then((data) => {
        if (active) setRegions(data.regions)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [id, validId, initialEdit])

  const editable = report?.status === "PENDING"

  function startEdit() {
    if (!report) return
    setDescription(report.description ?? "")
    setCategoryId(report.categoryId?.toString() ?? "")
    setRegion(report.regionCode ?? "")
    setEvidence(report.evidences)
    setEvidenceChanged(false)
    setFiles([])
    setEditing(true)
  }

  async function handleCopyTarget() {
    if (!report) return
    try {
      await navigator.clipboard.writeText(report.targetValue)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Không thể sao chép nội dung.")
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!description.trim()) {
      toast.error("Vui lòng nhập mô tả.")
      return
    }
    if (files.length) {
      const validation = validateReportFiles(files)
      if (validation) {
        toast.error(validation)
        return
      }
    }
    if (evidence.length + files.length > 20) {
      toast.error("Tối đa 20 bằng chứng.")
      return
    }
    if (
      (evidenceChanged || files.length > 0) &&
      evidence.some(
        (item) =>
          !safeUrl(item.fileUrl) ||
          !["JPG", "PNG", "PDF"].includes(item.evidenceType)
      )
    ) {
      toast.error(
        "Có minh chứng không hợp lệ. Vui lòng bỏ tệp đó và tải lại ảnh JPG, PNG hoặc PDF trước khi lưu."
      )
      return
    }
    setBusy(true)
    try {
      const uploaded = files.length ? await uploadOwnReportEvidence(files) : []
      if (uploaded.length) {
        setEvidence([...evidence, ...uploaded])
        setFiles([])
        setEvidenceChanged(true)
      }
      const replacement =
        evidenceChanged || files.length > 0
          ? [
              ...evidence.map((item) => ({
                fileUrl: item.fileUrl ?? "",
                fileName: item.fileName,
                fileHash: item.fileHash,
                evidenceType: item.evidenceType,
              })),
              ...uploaded,
            ]
          : undefined
      if (replacement?.some((item) => !safeUrl(item.fileUrl))) {
        throw new Error(
          "Có bằng chứng không có đường dẫn hợp lệ. Hãy bỏ bằng chứng đó hoặc hủy chỉnh sửa."
        )
      }
      const updated = await updateOwnReport(id, {
        description: description.trim(),
        categoryId: categoryId ? Number(categoryId) : null,
        regionCode: region || null,
        evidences: replacement,
      })
      setReport(updated)
      setEditing(false)
      toast.success("Đã cập nhật báo cáo.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thể cập nhật.")
      if (e instanceof ReportActionError && e.status === 409) {
        setEditing(false)
        await load()
      }
    } finally {
      setBusy(false)
    }
  }

  async function withdraw() {
    setBusy(true)
    try {
      await withdrawOwnReport(id)
      confirmDialog.current?.close()
      setEditing(false)
      toast.success("Đã thu hồi báo cáo.")
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thể thu hồi.")
      if (e instanceof ReportActionError && e.status === 409) {
        confirmDialog.current?.close()
        await load()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto max-w-5xl space-y-6 font-sans antialiased">
        <Link
          href="/user/reports"
          className="group inline-flex min-h-9 items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowLeft
            aria-hidden="true"
            size={16}
            className="transition-transform group-hover:-translate-x-0.5 motion-reduce:transform-none"
          />
          <span>Danh sách báo cáo</span>
        </Link>

        {loading ? (
          <div
            role="status"
            className="flex items-center justify-center gap-2.5 py-16 text-sm text-muted-foreground"
          >
            <div className="motion-safe:animate-spin">
              <CircleNotch
                aria-hidden="true"
                size={18}
                weight="bold"
                className="text-primary"
              />
            </div>
            <span>Đang tải chi tiết báo cáo...</span>
          </div>
        ) : error ? (
          <ScamErrorCallout
            title="Không thể tải chi tiết báo cáo"
            message={error}
            preserveDraftHint={false}
            isBusy={loading}
            onRetry={validId ? () => void load() : undefined}
          />
        ) : (
          report && (
            <>
              {/* Header */}
              <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1.5">
                  <h1 className="font-heading text-2xl font-bold tracking-[-0.025em] text-foreground sm:text-3xl">
                    Chi tiết báo cáo
                  </h1>
                  <p className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
                    <span>Mã báo cáo</span>
                    <span className="font-mono font-semibold text-foreground tabular-nums">
                      #{report.rawId}
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <ExpandableIconButton
                    disabled={busy}
                    onClick={() => {
                      setEditing(false)
                      void load()
                    }}
                    icon={<ArrowsClockwise aria-hidden="true" size={16} weight="bold" />}
                    label="Làm mới"
                    variant="outline"
                  />
                  {editable && !editing && (
                    <>
                      <ExpandableIconButton
                        disabled={busy}
                        onClick={startEdit}
                        icon={<PencilSimple aria-hidden="true" size={16} weight="bold" />}
                        label="Chỉnh sửa"
                        variant="primary"
                      />
                      <ExpandableIconButton
                        disabled={busy}
                        onClick={() => confirmDialog.current?.showModal()}
                        icon={<ArrowUUpLeft aria-hidden="true" size={16} weight="bold" />}
                        label="Thu hồi"
                        variant="danger"
                      />
                    </>
                  )}
                </div>
              </header>

              {/* Tier 1: Summary & Status */}
              <section
                className={cardSurface}
                aria-labelledby="report-target-title"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/50 text-foreground">
                      {report.targetType === "PHONE" ? (
                        <Phone aria-hidden="true" size={22} weight="bold" />
                      ) : report.targetType === "BANK_ACCOUNT" ||
                        report.targetType === "BANK" ? (
                        <Bank aria-hidden="true" size={22} weight="bold" />
                      ) : (
                        <Globe aria-hidden="true" size={22} weight="bold" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <h2
                        id="report-target-title"
                        className="text-xs font-semibold text-muted-foreground"
                      >
                        Đối tượng bị báo cáo
                      </h2>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className="font-mono text-xl font-bold break-all text-foreground tabular-nums sm:text-2xl">
                          {displayTarget(report.targetValue, report.targetType)}
                        </p>
                        <ExpandableIconButton
                          onClick={() => void handleCopyTarget()}
                          expanded={copied}
                          variant="outline"
                          className="min-h-8 min-w-8 px-2"
                          icon={
                            copied ? (
                              <Check
                                aria-hidden="true"
                                size={14}
                                weight="bold"
                                className="text-emerald-600 dark:text-emerald-400"
                              />
                            ) : (
                              <Copy aria-hidden="true" size={14} weight="bold" />
                            )
                          }
                          label={copied ? "Đã chép" : "Sao chép"}
                        />
                      </div>
                    </div>
                  </div>

                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold whitespace-nowrap",
                      reportStatusClasses[report.status] ??
                        "border-border bg-muted text-muted-foreground"
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        reportStatusDotClasses[report.status] ??
                          "bg-muted-foreground"
                      )}
                    />
                    <span>
                      {reportStatusLabels[report.status] ?? report.status}
                    </span>
                  </span>
                </div>

                <dl className="mt-5 grid gap-4 border-t border-border/70 pt-5 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Danh mục thủ đoạn
                    </dt>
                    <dd className="mt-1 font-semibold text-foreground">
                      {report.category}
                    </dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarBlank aria-hidden="true" size={14} />
                      <span>Ngày gửi</span>
                    </dt>
                    <dd className="mt-1 font-medium text-foreground tabular-nums">
                      {formatDateTime(report.createdAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin aria-hidden="true" size={14} />
                      <span>Khu vực</span>
                    </dt>
                    <dd className="mt-1 font-medium text-foreground">
                      {regions.find((r) => r.code === report.regionCode)
                        ?.name ||
                        report.regionCode ||
                        "Chưa cung cấp"}
                    </dd>
                  </div>
                </dl>
              </section>

              {(report.status === "IN_REVIEW" ||
                report.status === "WITHDRAWN") && (
                <div className="flex items-start gap-2.5 rounded-lg border border-sky-500/20 bg-sky-500/10 p-4 text-sm text-sky-900 dark:border-sky-400/20 dark:bg-sky-500/15 dark:text-sky-200">
                  <Info
                    aria-hidden="true"
                    size={18}
                    weight="fill"
                    className="mt-0.5 shrink-0"
                  />
                  <p>
                    {report.status === "WITHDRAWN"
                      ? "Bạn đã thu hồi báo cáo này. Dữ liệu vẫn được lưu để tra cứu lịch sử."
                      : "Báo cáo đang được kiểm duyệt viên xử lý nên tạm thời không thể chỉnh sửa hoặc thu hồi."}
                  </p>
                </div>
              )}

              {/* Tier 2 & 3: Description / Edit Form + Evidence & History */}
              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
                {editing ? (
                  <form
                    onSubmit={save}
                    className={cn(cardSurface, "space-y-5")}
                  >
                    <div className="space-y-1">
                      <h2 className="font-heading text-lg font-bold tracking-[-0.02em]">
                        Chỉnh sửa báo cáo
                      </h2>
                      <p className="max-w-[60ch] text-sm text-muted-foreground">
                        Bạn có thể cập nhật mô tả và minh chứng trước khi kiểm
                        duyệt viên tiếp nhận. Đối tượng bị báo cáo được giữ
                        nguyên.
                      </p>
                    </div>
                    <fieldset disabled={busy} className="space-y-4">
                      <label className="block space-y-1.5">
                        <span className="flex items-center justify-between gap-3 text-xs font-semibold text-foreground">
                          <span>
                            Mô tả hành vi{" "}
                            <span className="text-rose-600 dark:text-rose-400">
                              *
                            </span>
                          </span>
                          <span className="font-medium text-muted-foreground tabular-nums">
                            {description.length.toLocaleString("vi-VN")}/2.000
                            ký tự
                          </span>
                        </span>
                        <textarea
                          required
                          maxLength={2000}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className={cn(fieldClass, "leading-relaxed")}
                          rows={5}
                        />
                      </label>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block space-y-1.5">
                          <span className="block text-xs font-semibold text-foreground">
                            Danh mục
                          </span>
                          <select
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            className={fieldClass}
                          >
                            <option value="">
                              {report.categoryId
                                ? "Giữ danh mục hiện tại"
                                : "Chưa phân loại"}
                            </option>
                            {report.categoryId &&
                              !categories.some(
                                (c) => c.id === report.categoryId
                              ) && (
                                <option value={report.categoryId}>
                                  {report.category}
                                </option>
                              )}
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block space-y-1.5">
                          <span className="block text-xs font-semibold text-foreground">
                            Tỉnh/thành xảy ra sự việc
                          </span>
                          <select
                            value={region}
                            onChange={(e) => setRegion(e.target.value)}
                            className={fieldClass}
                          >
                            <option value="">
                              {report.regionCode
                                ? "Giữ tỉnh/thành hiện tại"
                                : "Chưa cung cấp"}
                            </option>
                            {region &&
                              !regions.some((r) => r.code === region) && (
                                <option value={region}>
                                  Khu vực hiện tại ({region})
                                </option>
                              )}
                            {regions.map((r) => (
                              <option key={r.code} value={r.code}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="space-y-3 border-t border-border/70 pt-4">
                        <h3 className="text-xs font-semibold text-foreground">
                          Bằng chứng hiện có ({evidence.length})
                        </h3>
                        {evidence.length > 0 && (
                          <ul className="divide-y divide-border/70 rounded-lg border border-border/70 bg-muted/20">
                            {evidence.map((item, index) => (
                              <li
                                key={item.id ?? index}
                                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-foreground">
                                    {item.fileName || `Bằng chứng ${index + 1}`}
                                  </span>
                                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                                    {item.evidenceType}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEvidence(
                                      evidence.filter((_, i) => i !== index)
                                    )
                                    setEvidenceChanged(true)
                                  }}
                                  className="inline-flex min-h-8 cursor-pointer items-center rounded-md border border-rose-500/25 bg-rose-500/10 px-2.5 text-xs font-semibold text-rose-800 hover:bg-rose-500/15 dark:text-rose-200"
                                >
                                  Bỏ tệp
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <label className="block space-y-1.5">
                          <span className="block text-xs font-semibold text-foreground">
                            Thêm ảnh hoặc PDF (tối đa 5 tệp/lần, 5 MB/tệp)
                          </span>
                          <input
                            type="file"
                            multiple
                            accept={REPORT_FILE_ACCEPT}
                            onChange={(e) =>
                              setFiles(Array.from(e.target.files ?? []))
                            }
                            className={fieldClass}
                          />
                        </label>
                        {files.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Đã chọn: {files.map((f) => f.name).join(", ")}
                          </p>
                        )}
                      </div>
                    </fieldset>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={busy}
                        className={primaryButton}
                      >
                        <Check aria-hidden="true" size={16} weight="bold" />
                        <span>{busy ? "Đang lưu..." : "Lưu thay đổi"}</span>
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setEditing(false)}
                        className={secondaryButton}
                      >
                        Hủy chỉnh sửa
                      </button>
                    </div>
                  </form>
                ) : (
                  <section className={cn(cardSurface, "space-y-4")}>
                    <h2 className="flex items-center gap-2 font-heading text-base font-bold tracking-[-0.02em]">
                      <FileText
                        aria-hidden="true"
                        size={18}
                        className="text-primary"
                      />
                      <span>Nội dung báo cáo</span>
                    </h2>
                    <p className="max-w-[65ch] text-sm leading-relaxed break-words whitespace-pre-wrap text-foreground">
                      {report.description || "Chưa có mô tả."}
                    </p>
                    <p className="flex items-center gap-1.5 border-t border-border/70 pt-4 text-xs text-muted-foreground tabular-nums">
                      <Clock aria-hidden="true" size={14} />
                      <span>
                        Cập nhật lần cuối: {formatDateTime(report.updatedAt)}
                      </span>
                    </p>
                  </section>
                )}

                <aside className="space-y-6">
                  {/* Evidence List (no card-inside-card) */}
                  <section className={cn(cardSurface, "space-y-4")}>
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="flex items-center gap-2 font-heading text-base font-bold tracking-[-0.02em]">
                        <Paperclip
                          aria-hidden="true"
                          size={18}
                          className="text-primary"
                        />
                        <span>Tệp minh chứng</span>
                      </h2>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
                        {report.evidences.length}
                      </span>
                    </div>

                    {report.evidences.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Chưa có bằng chứng đính kèm.
                      </p>
                    ) : (
                      <ul className="divide-y divide-border/70">
                        {report.evidences.map((item, i) => {
                          const url = safeUrl(item.fileUrl)
                          return (
                            <li key={item.id ?? i} className="py-3 first:pt-0 last:pb-0">
                              {url ? (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="group flex items-center gap-3 rounded-lg p-1 -m-1 text-sm font-medium text-foreground transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                >
                                  <EvidenceThumbnail
                                    key={item.fileUrl}
                                    item={item}
                                  />
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate font-semibold">
                                      {item.fileName || `Minh chứng ${i + 1}`}
                                    </span>
                                    <span className="mt-0.5 block text-xs text-muted-foreground">
                                      {item.evidenceType} · Mở tệp
                                    </span>
                                  </span>
                                  <ArrowSquareOut
                                    aria-hidden="true"
                                    size={16}
                                    className="shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 motion-reduce:transform-none"
                                  />
                                </a>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  Bằng chứng {i + 1}: không có tệp để mở
                                </p>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </section>

                  {/* Moderation History (dot + divide-y, no border-l-2) */}
                  <section className={cn(cardSurface, "space-y-4")}>
                    <h2 className="flex items-center gap-2 font-heading text-base font-bold tracking-[-0.02em]">
                      <Clock
                        aria-hidden="true"
                        size={18}
                        className="text-primary"
                      />
                      <span>Lịch sử kiểm duyệt</span>
                    </h2>
                    {report.moderationHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Báo cáo chưa có hoạt động kiểm duyệt. Các cập nhật sẽ
                        hiển thị tại đây.
                      </p>
                    ) : (
                      <ol className="divide-y divide-border/70">
                        {report.moderationHistory.map((step) => {
                          const meta = MODERATION_ACTION_META[step.action] ?? {
                            label: "Cập nhật kiểm duyệt",
                            dot: "bg-muted-foreground",
                          }
                          return (
                            <li
                              key={step.id}
                              className="space-y-1.5 py-3 first:pt-0 last:pb-0"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  aria-hidden="true"
                                  className={cn(
                                    "size-2 shrink-0 rounded-full",
                                    meta.dot
                                  )}
                                />
                                <p className="text-sm font-semibold text-foreground">
                                  {meta.label}
                                </p>
                              </div>
                              {step.reason && (
                                <p className="pl-4 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                                  {step.reason}
                                </p>
                              )}
                              <p className="pl-4 text-xs text-muted-foreground tabular-nums">
                                {formatDateTime(step.createdAt)}
                              </p>
                            </li>
                          )
                        })}
                      </ol>
                    )}
                  </section>
                </aside>
              </div>
            </>
          )
        )}

        {/* Withdraw Confirmation Dialog */}
        <dialog
          ref={confirmDialog}
          aria-labelledby="withdraw-title"
          onCancel={(event) => {
            if (busy) event.preventDefault()
          }}
          className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-black/10 bg-card p-6 text-foreground shadow-[0_16px_44px_rgb(15,23,42,0.18)] backdrop:bg-black/45 dark:border-white/12 dark:shadow-[0_24px_64px_rgb(0,0,0,0.65),inset_0_1px_0_rgb(255,255,255,0.08)]"
        >
          <h2
            id="withdraw-title"
            className="font-heading text-lg font-bold tracking-[-0.02em]"
          >
            Thu hồi báo cáo này?
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
            Báo cáo sẽ ngừng chờ kiểm duyệt. Bạn vẫn có thể xem lại lịch sử,
            nhưng không thể chỉnh sửa hoặc khôi phục báo cáo đã thu hồi.
          </p>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => confirmDialog.current?.close()}
              className={secondaryButton}
            >
              Giữ báo cáo
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void withdraw()}
              className={cn(
                buttonBase,
                "bg-rose-700 text-white hover:bg-rose-800 dark:bg-rose-600 dark:hover:bg-rose-500"
              )}
            >
              {busy ? "Đang thu hồi..." : "Xác nhận thu hồi"}
            </button>
          </div>
        </dialog>
      </div>
    </MotionConfig>
  )
}
