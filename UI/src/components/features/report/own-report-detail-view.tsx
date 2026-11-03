"use client"

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
import {
  REPORT_FILE_ACCEPT,
  validateReportFiles,
} from "@/features/report/utils/report-upload"

const statusNames: Record<string, string> = {
  PENDING: "Đang chờ duyệt",
  IN_REVIEW: "Đang kiểm duyệt",
  APPROVED: "Đã duyệt",
  APPROVED_BLACKLIST: "Đã vào danh sách cảnh báo",
  REJECTED: "Bị từ chối",
  WITHDRAWN: "Đã thu hồi",
  MERGED_DUPLICATE: "Đã gộp trùng lặp",
}
const buttonClass =
  "inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-150 hover:shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
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
  "rounded-2xl border border-border/70 bg-card p-5 shadow-xs sm:p-6"
const statusClasses: Record<string, string> = {
  PENDING:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  IN_REVIEW:
    "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
  APPROVED:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  APPROVED_BLACKLIST:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  REJECTED: "border-destructive/20 bg-destructive/5 text-destructive",
}
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
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm transition-colors hover:border-primary/30 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:opacity-60"
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
          alt="Ảnh minh chứng thu nhỏ"
          width={64}
          height={64}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="size-full object-contain transition-transform group-hover:scale-105 motion-reduce:transform-none"
        />
      ) : (
        <FileText size={25} />
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
  const [message, setMessage] = useState("")
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
          if (
            initialEdit &&
            data.status === "PENDING" &&
            data.moderationHistory.length === 0
          ) {
            setDescription(data.description ?? "")
            setMessage(data.reportedMessage ?? "")
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
  const editable =
    report?.status === "PENDING" && report.moderationHistory.length === 0
  function startEdit() {
    if (!report) return
    setDescription(report.description ?? "")
    setMessage(report.reportedMessage ?? "")
    setCategoryId(report.categoryId?.toString() ?? "")
    setRegion(report.regionCode ?? "")
    setEvidence(report.evidences)
    setEvidenceChanged(false)
    setFiles([])
    setEditing(true)
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
      if (replacement?.some((item) => !safeUrl(item.fileUrl)))
        throw new Error(
          "Có bằng chứng không có đường dẫn hợp lệ. Hãy bỏ bằng chứng đó hoặc hủy chỉnh sửa."
        )
      const updated = await updateOwnReport(id, {
        description: description.trim(),
        reportedMessage: message || null,
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
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/user/reports"
        className="group inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <ArrowLeft
          size={16}
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
            <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
                  Chi tiết báo cáo
                </h1>
                <p className="text-sm text-muted-foreground">
                  Xem thông tin đã gửi và theo dõi kết quả kiểm duyệt.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setEditing(false)
                    void load()
                  }}
                  className={secondaryButton}
                >
                  <ArrowsClockwise size={17} /> Làm mới
                </button>
                {editable && !editing && (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={startEdit}
                      className={primaryButton}
                    >
                      <PencilSimple size={17} /> Chỉnh sửa
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => confirmDialog.current?.showModal()}
                      className={dangerButton}
                    >
                      <ArrowUUpLeft size={17} /> Thu hồi
                    </button>
                  </>
                )}
              </div>
            </header>
            <section
              className={cardClass}
              aria-labelledby="report-target-title"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/5 text-primary dark:bg-primary/10">
                    {report.targetType === "PHONE" ? (
                      <Phone size={24} />
                    ) : report.targetType === "BANK_ACCOUNT" ||
                      report.targetType === "BANK" ? (
                      <Bank size={24} />
                    ) : (
                      <Globe size={24} />
                    )}
                  </span>
                  <div className="min-w-0">
                    <h2
                      id="report-target-title"
                      className="text-xs font-semibold text-muted-foreground"
                    >
                      Đối tượng bị báo cáo
                    </h2>
                    <p className="mt-1 text-xl font-bold break-all tabular-nums sm:text-2xl">
                      {displayTarget(report.targetValue, report.targetType)}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold",
                    statusClasses[report.status] ??
                      "border-border bg-muted text-muted-foreground"
                  )}
                >
                  <ShieldCheck size={15} />
                  {statusNames[report.status] ?? report.status}
                </span>
              </div>
              <dl className="mt-6 grid gap-5 border-t border-border/70 pt-5 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Danh mục thủ đoạn
                  </dt>
                  <dd className="mt-1.5 font-semibold">{report.category}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarBlank size={14} /> Ngày gửi
                  </dt>
                  <dd className="mt-1.5 font-medium tabular-nums">
                    {date(report.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin size={14} /> Khu vực
                  </dt>
                  <dd className="mt-1.5 font-medium">
                    {regions.find((r) => r.code === report.regionCode)?.name ||
                      report.regionCode ||
                      "Chưa cung cấp"}
                  </dd>
                </div>
              </dl>
            </section>
            {!editable && (
              <p className="rounded-lg bg-muted p-4 text-sm">
                {report.status === "WITHDRAWN"
                  ? "Bạn đã thu hồi báo cáo. Dữ liệu được giữ để tra cứu lịch sử."
                  : "Báo cáo đã bắt đầu được xử lý nên không thể chỉnh sửa hoặc thu hồi."}
              </p>
            )}
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              {editing ? (
                <form onSubmit={save} className={cn(cardClass, "space-y-5")}>
                  <h2 className="text-lg font-bold">Chỉnh sửa báo cáo</h2>
                  <p className="text-sm text-muted-foreground">
                    Bạn có thể sửa thông tin trước khi kiểm duyệt viên bắt đầu
                    xử lý. Đối tượng bị báo cáo được giữ nguyên.
                  </p>
                  <fieldset disabled={busy} className="space-y-4">
                    <label className="block space-y-2">
                      <span>Mô tả *</span>
                      <textarea
                        required
                        maxLength={255}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className={fieldClass}
                        rows={4}
                      />
                    </label>
                    <label className="block space-y-2">
                      <span>Tin nhắn nghi lừa đảo</span>
                      <textarea
                        maxLength={10000}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
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
                          className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
                        >
                          <span>Bằng chứng {index + 1}</span>
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
                              "min-h-8 px-3 py-1 text-xs"
                            )}
                          >
                            Bỏ bằng chứng
                          </button>
                        </div>
                      ))}
                      <label className="block space-y-2">
                        <span>
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
                        <p className="text-sm">
                          Đã chọn: {files.map((f) => f.name).join(", ")}
                        </p>
                      )}
                    </div>
                  </fieldset>
                  <div className="flex flex-wrap gap-3">
                    <button disabled={busy} className={primaryButton}>
                      <Check size={17} />
                      {busy ? "Đang lưu…" : "Lưu thay đổi"}
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
                <section className={cn(cardClass, "space-y-5")}>
                  <h2 className="flex items-center gap-2 font-heading text-lg font-bold">
                    <FileText size={20} className="text-primary" /> Nội dung báo
                    cáo
                  </h2>
                  <p className="text-sm leading-7 break-words whitespace-pre-wrap">
                    {report.description || "Chưa có mô tả."}
                  </p>
                  {report.reportedMessage && (
                    <blockquote className="border-l-4 border-primary pl-4 break-words whitespace-pre-wrap text-muted-foreground">
                      {report.reportedMessage}
                    </blockquote>
                  )}
                  <p className="flex items-center gap-1.5 border-t border-border/70 pt-4 text-xs text-muted-foreground">
                    <Clock size={14} /> Cập nhật lần cuối:{" "}
                    {date(report.updatedAt)}
                  </p>
                </section>
              )}
              <aside className="space-y-6">
                <section className={cn(cardClass, "space-y-4")}>
                  <h2 className="text-lg font-bold">
                    <span className="flex items-center gap-2">
                      <Paperclip size={20} className="text-primary" /> Tệp minh
                      chứng{" "}
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {report.evidences.length}
                      </span>
                    </span>
                  </h2>
                  {report.evidences.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Chưa có bằng chứng đính kèm.
                    </p>
                  )}
                  {report.evidences.map((item, i) => (
                    <div
                      key={item.id ?? i}
                      className="rounded-xl border border-border/70 bg-muted/15 p-4"
                    >
                      {safeUrl(item.fileUrl) ? (
                        <a
                          href={safeUrl(item.fileUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-3 rounded-lg text-sm font-semibold text-foreground transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          <EvidenceThumbnail key={item.fileUrl} item={item} />
                          <span className="min-w-0 flex-1 break-all">
                            {item.fileName || `Minh chứng ${i + 1}`}
                            <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                              {item.evidenceType} · Mở tệp
                            </span>
                          </span>
                          <ArrowSquareOut
                            size={17}
                            className="shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 motion-reduce:transform-none"
                          />
                        </a>
                      ) : (
                        <p>Bằng chứng {i + 1}: không có tệp để mở</p>
                      )}
                      <p className="mt-1 text-sm text-muted-foreground">
                        {(
                          {
                            PENDING: "Chưa xác minh",
                            VERIFIED: "Đã xác minh",
                            REJECTED: "Không được chấp nhận",
                          } as Record<string, string>
                        )[item.verificationStatus ?? ""] ??
                          "Chưa có kết quả xác minh"}
                      </p>
                      {item.ocrText && (
                        <p className="mt-2 text-sm break-words whitespace-pre-wrap">
                          {item.ocrText}
                        </p>
                      )}
                    </div>
                  ))}
                </section>
                <section className={cn(cardClass, "space-y-4")}>
                  <h2 className="flex items-center gap-2 font-heading text-lg font-bold">
                    <Clock size={20} className="text-primary" /> Lịch sử kiểm
                    duyệt
                  </h2>
                  {report.moderationHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Báo cáo chưa có hoạt động kiểm duyệt. Các cập nhật sẽ hiển
                      thị tại đây.
                    </p>
                  ) : (
                    report.moderationHistory.map((step) => (
                      <div
                        key={step.id}
                        className="border-l-2 border-border pl-4"
                      >
                        <p className="font-semibold">
                          {(
                            {
                              APPROVE: "Đã duyệt",
                              REJECT: "Từ chối",
                              IN_REVIEW: "Bắt đầu kiểm duyệt",
                            } as Record<string, string>
                          )[step.action] ?? "Cập nhật kiểm duyệt"}
                        </p>
                        <p className="text-sm whitespace-pre-wrap">
                          {step.reason}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {step.moderatorName || "Hệ thống"} ·{" "}
                          {date(step.createdAt)}
                        </p>
                      </div>
                    ))
                  )}
                </section>
              </aside>
            </div>
          </>
        )
      )}
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
