"use client"

import { reportStatusClasses } from "@/features/report/utils/report-status"
import { formatReportHotline } from "@/features/report/utils/report-phone"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { toast } from "react-toastify"
import {
  ArrowLeft,
  ArrowSquareOut,
  ArrowUUpLeft,
  ArrowsClockwise,
  Bank,
  CalendarBlank,
  Check,
  Clock,
  ClipboardText,
  FileText,
  Globe,
  MapPin,
  Paperclip,
  PencilSimple,
  Phone,
  ShieldCheck,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
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
import { useReportAttachments } from "@/features/report/hooks/use-report-attachments"
import { ReportFileUpload } from "./report-file-upload"

const statusNames: Record<string, string> = {
  PENDING: "Đang chờ duyệt",
  IN_REVIEW: "Đang kiểm duyệt",
  APPROVED: "Đã chấp nhận",
  REJECTED: "Bị từ chối",
  WITHDRAWN: "Đã thu hồi",
}
const buttonClass =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
const secondaryButton = cn(
  buttonClass,
  "border border-border bg-card text-foreground hover:border-primary/30 hover:bg-muted"
)
const primaryButton = cn(
  buttonClass,
  "bg-primary text-primary-foreground hover:bg-primary/90"
)
const dangerButton = cn(
  buttonClass,
  "border border-destructive/30 bg-destructive/5 text-destructive hover:border-destructive/60 hover:bg-destructive/10"
)
const cardClass =
  "min-w-0 rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-6"
const sectionHeadingClass =
  "flex items-center gap-2.5 font-heading text-lg leading-tight font-bold"
const sectionIconClass =
  "grid size-9 shrink-0 place-items-center rounded-lg bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200"
function displayTarget(value: string, type: string) {
  if (type !== "PHONE") return value
  const hotline = formatReportHotline(value)
  if (hotline !== value) return hotline
  const compact = value.replace(/[\s().-]/g, "")
  return /^0\d{9}$/.test(compact)
    ? `${compact.slice(0, 4)} ${compact.slice(4, 7)} ${compact.slice(7)}`
    : value
}
const fieldClass =
  "min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base text-foreground transition-colors hover:border-ring/50 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25 disabled:opacity-60 motion-reduce:transition-none dark:bg-muted/20 sm:text-sm"
function safeUrl(value: string | null) {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined
  } catch {
    return undefined
  }
}
function date(value: string) {
  return new Date(value).toLocaleString("vi-VN")
}

function EvidenceThumbnail({ item }: { item: OwnReportEvidence }) {
  const [failed, setFailed] = useState(false)
  const url = safeUrl(item.fileUrl)
  const isImage = ["JPG", "JPEG", "PNG", "IMAGE/JPEG", "IMAGE/PNG"].includes(
    item.evidenceType.toUpperCase()
  )
  return (
    <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-muted text-primary">
      {isImage && url && !failed ? (
        // Original evidence URLs may be signed; load directly without an optimization proxy.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          width={64}
          height={64}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="size-full object-contain transition-transform group-hover:scale-105 motion-reduce:transform-none"
        />
      ) : (
        <FileText size={25} aria-hidden="true" />
      )}
    </span>
  )
}

export function OwnReportDetailView({
  reportId,
  initialEdit = false,
}: {
  reportId: string
  initialEdit?: boolean
}) {
  const id = Number(reportId.replace(/^#?RPT-/i, ""))
  const [report, setReport] = useState<OwnReportDetail | null>(null)
  const [categories, setCategories] = useState<ScamCategoryItem[]>([])
  const [regions, setRegions] = useState<DashboardRegionOption[]>([])
  const validId = Number.isSafeInteger(id) && id > 0
  const [loading, setLoading] = useState(validId)
  const [error, setError] = useState(validId ? "" : "Mã báo cáo không hợp lệ.")
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [description, setDescription] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [region, setRegion] = useState("")
  const [evidence, setEvidence] = useState<OwnReportEvidence[]>([])
  const [evidenceChanged, setEvidenceChanged] = useState(false)
  const attachmentUpload = useReportAttachments()
  const files = attachmentUpload.attachments.map(item => item.file)
  const confirmDialog = useRef<HTMLDialogElement>(null)
  const discardEditDialog = useRef<HTMLDialogElement>(null)
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
        if (active)
          setError(e instanceof Error ? e.message : "Không thể tải báo cáo.")
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
    attachmentUpload.clear()
    setEditing(true)
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!description.trim()) {
      toast.error("Vui lòng nhập mô tả.")
      return
    }
    if (attachmentUpload.editingId) {
      toast.info("Hãy xác nhận hoặc hủy phần chỉnh sửa ảnh đang mở.", { toastId: "report-evidence-editor-open" })
      return
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
        attachmentUpload.clear()
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
      if (replacement?.some((item) => !safeUrl(item.fileUrl)))
        throw new Error(
          "Có bằng chứng không có đường dẫn hợp lệ. Hãy bỏ bằng chứng đó hoặc hủy chỉnh sửa."
        )
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
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-4 sm:space-y-5">
      <Link
        href="/user/reports"
        className="group inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
      >
        <ArrowLeft
          size={16}
          aria-hidden="true"
          className="transition-transform group-hover:-translate-x-0.5 motion-reduce:transform-none"
        />
        Danh sách báo cáo
      </Link>
      {loading ? (
        <p role="status" className="py-12 text-center text-muted-foreground">
          Đang tải báo cáo…
        </p>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-destructive p-5">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className={cn(secondaryButton, "mt-4")}
          >
            Thử lại
          </button>
        </div>
      ) : (
        report && (
          <>
            <header className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
              <div className="bg-slate-950 bg-[radial-gradient(ellipse_at_top_right,_#164e63_0%,_transparent_65%)] px-4 py-5 text-white sm:px-6 sm:py-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h1 className="flex items-center gap-2 font-heading text-xl font-bold tracking-tight sm:text-2xl">
                    <ClipboardText size={22} className="shrink-0 text-sky-200" aria-hidden="true" />
                    Báo cáo <span className="tabular-nums">{report.rawId}</span>
                  </h1>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold",
                      reportStatusClasses[report.status] ?? "border-slate-200 bg-slate-100 text-slate-800"
                    )}
                  >
                    <ShieldCheck size={15} aria-hidden="true" />
                    {statusNames[report.status] ?? report.status}
                  </span>
                </div>
                <div className="mt-4 flex min-w-0 items-center gap-3 border-t border-white/15 pt-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-sky-200/25 bg-sky-300/10 text-sky-200" aria-hidden="true">
                    {report.targetType === "PHONE" ? (
                      <Phone size={22} />
                    ) : report.targetType === "BANK_ACCOUNT" || report.targetType === "BANK" ? (
                      <Bank size={22} />
                    ) : (
                      <Globe size={22} />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-300">Đối tượng bị báo cáo</p>
                    <p className="font-sans text-lg font-semibold tabular-nums [overflow-wrap:anywhere] sm:text-2xl">
                      {displayTarget(report.targetValue, report.targetType)}
                    </p>
                  </div>
                </div>
                {(report.status === "IN_REVIEW" || report.status === "WITHDRAWN") && (
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">
                    {report.status === "WITHDRAWN"
                      ? "Bạn đã thu hồi báo cáo. Dữ liệu được giữ để tra cứu lịch sử."
                      : "Báo cáo đã bắt đầu được xử lý nên không thể chỉnh sửa hoặc thu hồi."}
                  </p>
                )}
              </div>
              <dl className="grid gap-x-5 gap-y-3 px-4 py-4 text-sm sm:grid-cols-3 sm:px-6">
                <div className="min-w-0">
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FileText size={15} aria-hidden="true" /> Danh mục thủ đoạn
                  </dt>
                  <dd className="mt-1 font-semibold [overflow-wrap:anywhere]">{report.category}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarBlank size={15} aria-hidden="true" /> Ngày gửi
                  </dt>
                  <dd className="mt-1 font-semibold tabular-nums">
                    <time dateTime={report.createdAt}>{date(report.createdAt)}</time>
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin size={15} aria-hidden="true" /> Khu vực
                  </dt>
                  <dd className="mt-1 font-semibold">
                    {regions.find((r) => r.code === report.regionCode)?.name ||
                      report.regionCode ||
                      "Chưa cung cấp"}
                  </dd>
                </div>
              </dl>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/25 px-4 py-3 sm:px-6">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setEditing(false)
                    void load()
                  }}
                  className={secondaryButton}
                >
                  <ArrowsClockwise size={17} aria-hidden="true" /> Làm mới
                </button>
                {editable && !editing && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => confirmDialog.current?.showModal()}
                      className={dangerButton}
                    >
                      <ArrowUUpLeft size={17} aria-hidden="true" /> Thu hồi
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={startEdit}
                      className={primaryButton}
                    >
                      <PencilSimple size={17} aria-hidden="true" /> Chỉnh sửa
                    </button>
                  </div>
                )}
              </div>
            </header>
            <div className="grid min-w-0 items-start gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(17rem,0.48fr)]">
              <div className="@container min-w-0 space-y-4 sm:space-y-5">
                {editing ? (
                  <form onSubmit={save} className={cn(cardClass, "space-y-5")}>
                    <h2 className={sectionHeadingClass}>
                      <span className={sectionIconClass}><PencilSimple size={19} aria-hidden="true" /></span>
                      Chỉnh sửa báo cáo
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Bạn có thể sửa thông tin trước khi kiểm duyệt viên bắt đầu
                      xử lý. Đối tượng bị báo cáo được giữ nguyên.
                    </p>
                    <fieldset disabled={busy} className="min-w-0 space-y-4">
                      <label className="block space-y-2">
                        <span className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold">Mô tả <span className="text-destructive">*</span></span>
                          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                            {description.length}/2000 ký tự
                          </span>
                        </span>
                        <textarea
                          required
                          maxLength={2000}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className={fieldClass}
                          rows={4}
                        />
                      </label>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block space-y-2">
                          <span>Danh mục</span>
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
                        <label className="block space-y-2">
                          <span>Tỉnh/thành xảy ra sự việc</span>
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
                      <div className="space-y-3">
                        <h3 className="font-semibold">Bằng chứng hiện có</h3>
                        {evidence.map((item, index) => (
                          <div
                            key={item.id ?? index}
                            className="relative flex flex-wrap items-center gap-3 rounded-lg border border-border p-3 transition-colors has-[a:hover]:border-primary/40 has-[a:hover]:bg-muted/50"
                          >
                            {safeUrl(item.fileUrl) ? (
                              <a
                                href={safeUrl(item.fileUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="min-w-0 flex-[1_1_8rem] text-sm font-semibold break-all hover:underline after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
                              >
                                {item.fileName || `Bằng chứng ${index + 1}`}
                                <span className="sr-only"> (mở trong thẻ mới)</span>
                              </a>
                            ) : (
                              <span className="min-w-0 flex-[1_1_8rem] text-sm font-semibold break-all">
                                {item.fileName || `Bằng chứng ${index + 1}`}
                              </span>
                            )}
                            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                              {safeUrl(item.fileUrl) && (
                                <ArrowSquareOut
                                  size={14}
                                  className="pointer-events-none shrink-0 text-muted-foreground"
                                  aria-hidden="true"
                                />
                              )}
                              <span
                                className="rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"
                                aria-label={`Định dạng tệp: ${item.evidenceType}`}
                              >
                                {item.evidenceType}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEvidence(
                                    evidence.filter((_, i) => i !== index)
                                  )
                                  setEvidenceChanged(true)
                                }}
                                className={cn(
                                  dangerButton,
                                  "relative z-10 min-h-8 px-3 py-1 text-xs"
                                )}
                              >
                                Bỏ bằng chứng
                              </button>
                            </div>
                          </div>
                        ))}
                        <ReportFileUpload
                          optional
                          attachments={attachmentUpload.attachments}
                          error={attachmentUpload.error}
                          disabled={busy}
                          onAdd={attachmentUpload.add}
                          onRemove={attachmentUpload.remove}
                          onReview={attachmentUpload.markReviewed}
                          editingId={attachmentUpload.editingId}
                          onEdit={attachmentUpload.setEditingId}
                        />
                      </div>
                    </fieldset>
                    <div className="flex flex-wrap gap-2 border-t border-border pt-4 sm:justify-end">
                      <button disabled={busy} className={primaryButton}>
                        <Check size={17} />
                        {busy ? "Đang lưu…" : "Lưu thay đổi"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => discardEditDialog.current?.showModal()}
                        className={secondaryButton}
                      >
                        Hủy
                      </button>
                    </div>
                  </form>
                ) : (
                  <section className={cn(cardClass, "space-y-4")} aria-labelledby="report-content-title">
                    <h2 id="report-content-title" className={sectionHeadingClass}>
                      <span className={sectionIconClass}><FileText size={19} aria-hidden="true" /></span>
                      Mô tả ngắn gọn hành vi
                    </h2>
                    <p className="max-w-prose text-sm leading-7 whitespace-pre-wrap [overflow-wrap:anywhere]">
                      {report.description || "Chưa có mô tả."}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                      <Clock size={15} aria-hidden="true" />
                      Cập nhật lần cuối
                      <time dateTime={report.updatedAt} className="tabular-nums">{date(report.updatedAt)}</time>
                    </p>
                  </section>
                )}
                <section className={cn(cardClass, "space-y-4")} aria-labelledby="report-attachments-title">
                  <h2 id="report-attachments-title" className={sectionHeadingClass}>
                    <span className={sectionIconClass}><Paperclip size={19} aria-hidden="true" /></span>
                    Tệp minh chứng
                    <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground tabular-nums">
                      {report.evidences.length}<span className="sr-only"> tệp</span>
                    </span>
                  </h2>
                  {report.evidences.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                      Chưa có bằng chứng đính kèm.
                    </p>
                  ) : (
                    <ul className="grid gap-2.5 @min-[590px]:grid-cols-2">
                      {report.evidences.map((item, index) => {
                        const url = safeUrl(item.fileUrl)
                        const name = item.fileName || `Minh chứng ${index + 1}`
                        return (
                          <li key={item.id ?? index} className="min-w-0">
                            {url ? (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Mở tệp ${name} trong thẻ mới`}
                                className="group flex min-h-full items-center gap-3 rounded-xl border border-border bg-muted/20 p-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-muted/55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
                              >
                                <EvidenceThumbnail key={url} item={item} />
                                <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                                  {name}
                                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                                    {item.evidenceType} · Mở tệp
                                  </span>
                                </span>
                                <ArrowSquareOut size={16} className="shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden="true" />
                              </a>
                            ) : (
                              <div className="rounded-xl border border-border bg-muted/20 p-3 text-sm">
                                <p className="font-semibold [overflow-wrap:anywhere]">{name}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">Tệp không khả dụng</p>
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </section>
              </div>
              <section className={cn(cardClass, "space-y-4")} aria-labelledby="report-history-title">
                <h2 id="report-history-title" className={sectionHeadingClass}>
                  <span className={sectionIconClass}><Clock size={19} aria-hidden="true" /></span>
                  Lịch sử kiểm duyệt
                </h2>
                {report.moderationHistory.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm leading-relaxed text-muted-foreground">
                    Chưa có hoạt động kiểm duyệt.
                  </p>
                ) : (
                  <ol>
                    {report.moderationHistory.map((step) => (
                      <li key={step.id} className="relative ml-2 border-l border-border pb-5 pl-5 last:border-transparent last:pb-0">
                        <span className="absolute top-1.5 -left-1 size-2 rounded-full bg-sky-600 ring-4 ring-card dark:bg-sky-300" aria-hidden="true" />
                        <p className="text-sm font-semibold">
                          {(
                            {
                              APPROVE: "Đã chấp nhận",
                              REJECT: "Từ chối",
                              IN_REVIEW: "Bắt đầu kiểm duyệt",
                            } as Record<string, string>
                          )[step.action] ?? "Cập nhật kiểm duyệt"}
                        </p>
                        <time dateTime={step.createdAt} className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
                          {date(step.createdAt)}
                        </time>
                        {step.reason && (
                          <p className="mt-2 rounded-lg bg-muted/40 px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
                            {step.reason}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          </>
        )
      )}
      <dialog
        ref={discardEditDialog}
        role="alertdialog"
        aria-labelledby="discard-report-edit-title"
        aria-describedby="discard-report-edit-description"
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border bg-card p-6 text-foreground shadow-xl backdrop:bg-black/50"
      >
        <h2 id="discard-report-edit-title" className="text-lg font-bold">
          Hủy chỉnh sửa báo cáo?
        </h2>
        <p id="discard-report-edit-description" className="my-4 text-sm text-muted-foreground">
          Toàn bộ thay đổi chưa lưu của báo cáo này sẽ mất nếu bạn hủy chỉnh sửa.
        </p>
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" onClick={() => discardEditDialog.current?.close()} className={secondaryButton}>
            Tiếp tục chỉnh sửa
          </button>
          <button
            type="button"
            onClick={() => {
              discardEditDialog.current?.close()
              attachmentUpload.clear()
              setEditing(false)
            }}
            className={cn(buttonClass, "bg-destructive text-white hover:bg-destructive/90")}
          >
            Hủy chỉnh sửa
          </button>
        </div>
      </dialog>
      <dialog
        ref={confirmDialog}
        aria-labelledby="withdraw-title"
        onCancel={(event) => {
          if (busy) event.preventDefault()
        }}
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border bg-card p-6 text-foreground shadow-xl backdrop:bg-black/50"
      >
        <h2 id="withdraw-title" className="text-lg font-bold">
          Thu hồi báo cáo?
        </h2>
        <p className="my-4 text-sm text-muted-foreground">
          Báo cáo sẽ ngừng chờ kiểm duyệt. Bạn vẫn có thể xem lại lịch sử, nhưng
          không thể chỉnh sửa hoặc khôi phục báo cáo đã thu hồi.
        </p>
        <div className="flex flex-wrap justify-end gap-3">
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
              buttonClass,
              "bg-destructive text-white hover:bg-destructive/90"
            )}
          >
            {busy ? "Đang thu hồi…" : "Xác nhận thu hồi"}
          </button>
        </div>
      </dialog>
    </div>
  )
}
