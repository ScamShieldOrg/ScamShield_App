"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  FileText,
  ShieldCheck,
  WarningCircle,
  UploadSimple,
  Trash,
  Clock,
  Sparkle,
  ArrowRight,
  Database,
  CheckCircle,
  Hourglass,
  Tag,
  Paperclip,
  ShareNetwork,
} from "@phosphor-icons/react"
import { toast } from "react-toastify"
import {
  submitPartnerAlertOrIntel,
  getMySubmissions,
} from "@/features/partner/services/partner-submission.service"
import { PartnerSubmissionItem } from "@/features/partner/types/partner-submission.types"
import { cn } from "@/lib/utils"

interface EvidenceItem {
  id: string
  name: string
  sizeText: string
  uploadedAt: string
  file?: File
}

export function ThreatIntelForm() {
  // Title / Scenario Name
  const [intelTitle, setIntelTitle] = useState<string>("")

  // Taxonomy tags
  const [selectedTaxonomies, setSelectedTaxonomies] = useState<string[]>([])

  // Confidence
  const [confidence, setConfidence] = useState<string>(
    "Rất cao - Nội bộ SOC & KH có chứng từ"
  )

  // MITRE ATT&CK Stages
  const [stage1, setStage1] = useState<string>("")
  const [stage2, setStage2] = useState<string>("")
  const [stage3, setStage3] = useState<string>("")

  // Data source
  const [dataSource, setDataSource] = useState<string>("Hotline CSKH")
  const [firstObservedDate, setFirstObservedDate] = useState<string>("")

  // Evidences - clean empty initial state
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([])
  const [realUploadedFile, setRealUploadedFile] = useState<File | null>(null)

  // Zero PII agreement
  const [zeroPiiChecked, setZeroPiiChecked] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Right column tab & items
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "VERIFIED">("ALL")
  const [currentPage, setCurrentPage] = useState<number>(0)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [historyItems, setHistoryItems] = useState<PartnerSubmissionItem[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false)
  const [counts, setCounts] = useState({ total: 0, pending: 0, verified: 0 })

  // Taxonomy options
  const taxonomyOptions = [
    "Tuyển dụng / CTV online",
    "Mạo danh cơ quan công quyền",
    "Chiếm quyền Accessibility",
    "Đầu tư tài chính / Sàn ảo",
    "Deepfake AI mạo danh",
    "Gian lận TMĐT / Voucher",
  ]

  // Server-side totals across all statuses
  const loadCounts = useCallback(async () => {
    try {
      const [allRes, pendingRes, verifiedRes] = await Promise.all([
        getMySubmissions("ALL", 0, 1),
        getMySubmissions("PENDING", 0, 1),
        getMySubmissions("VERIFIED", 0, 1),
      ])
      setCounts({
        total: allRes?.totalItems ?? 0,
        pending: pendingRes?.totalItems ?? 0,
        verified: verifiedRes?.totalItems ?? 0,
      })
    } catch (e) {
      console.warn("Could not load submission counts", e)
    }
  }, [])

  // Status-filtered and paginated history from server
  const loadHistory = useCallback(async (tab: "ALL" | "PENDING" | "VERIFIED", page: number) => {
    setIsLoadingHistory(true)
    try {
      const res = await getMySubmissions(tab, page, 10)
      if (res) {
        setHistoryItems(res.data ?? [])
        setTotalPages(res.totalPages ?? 1)
        setCurrentPage(res.currentPage ?? page)
      }
    } catch (e) {
      console.warn("Could not load backend submissions", e)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [])

  // Initial load of server totals
  useEffect(() => {
    loadCounts()
  }, [loadCounts])

  // Fetch status-filtered paginated submissions whenever tab or page changes
  useEffect(() => {
    loadHistory(activeTab, currentPage)
  }, [activeTab, currentPage, loadHistory])

  function toggleTaxonomy(tag: string) {
    setSelectedTaxonomies((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setRealUploadedFile(file)
    const newItem: EvidenceItem = {
      id: String(Date.now()),
      name: file.name,
      sizeText: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      uploadedAt: new Date().toLocaleDateString("vi-VN"),
      file,
    }
    setEvidenceList((prev) => [newItem, ...prev])
    toast.info(`Đã đính kèm tệp: ${file.name}`)
  }

  function handleRemoveEvidence(id: string) {
    setEvidenceList((prev) => prev.filter((ev) => ev.id !== id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!zeroPiiChecked) {
      toast.warning("Vui lòng tích cam kết bảo vệ dữ liệu cá nhân (Zero PII).")
      return
    }

    if (!intelTitle.trim()) {
      toast.error("Vui lòng nhập tên mẫu kịch bản hoặc tóm tắt nguy cơ.")
      return
    }

    const fullDescription = `[ATT&CK] 1: ${stage1.trim()} | 2: ${stage2.trim()} | 3: ${stage3.trim()} | Nguồn: ${dataSource.trim()} | ${firstObservedDate}`

    if (fullDescription.length > 240) {
      toast.error(`Tổng độ dài mô tả tình báo (${fullDescription.length}/240 ký tự) vượt quá giới hạn 240 ký tự. Vui lòng rút gọn nội dung các giai đoạn hoặc nguồn dữ liệu.`)
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        submissionType: "THREAT_INTEL" as const,
        title: intelTitle.trim().slice(0, 250),
        description: fullDescription,
        categoryCode: selectedTaxonomies[0] || "THREAT_CLUSTER",
      }

      const created = await submitPartnerAlertOrIntel(payload, realUploadedFile)

      toast.success("Đã nộp hồ sơ đóng góp tình báo thành công! Mã hồ sơ đang chờ chuyên viên NCSC/A05 thẩm định.")

      // Refresh server-side counts and reload current list
      loadCounts()
      if (currentPage === 0) {
        loadHistory(activeTab, 0)
      } else {
        setCurrentPage(0)
      }

      // Reset form
      setIntelTitle("")
      setStage1("")
      setStage2("")
      setStage3("")
      setFirstObservedDate("")
      setEvidenceList([])
      setRealUploadedFile(null)
      setSelectedTaxonomies([])
      setZeroPiiChecked(false)
    } catch (err: any) {
      console.error("Submit error", err)
      toast.error(err?.response?.data?.message || "Không thể nộp hồ sơ tình báo, vui lòng thử lại sau.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const fullDescPreview = `[ATT&CK] 1: ${stage1.trim()} | 2: ${stage2.trim()} | 3: ${stage3.trim()} | Nguồn: ${dataSource.trim()} | ${firstObservedDate}`
  const isDescOverLimit = fullDescPreview.length > 240

  return (
    <div className="space-y-6">
      {/* Top Banner: Distinguish intel vs takedown */}
      <div className="rounded-xl border border-indigo-200/80 bg-linear-to-r from-indigo-50/90 via-slate-50 to-white p-4 sm:p-5 shadow-xs dark:border-indigo-900/60 dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <ShareNetwork size={22} weight="bold" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Phân Biệt Nghiệp Vụ Tình Báo & Lệnh Cảnh Báo Khẩn
              </h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
                Được sử dụng để chuẩn hóa các cụm chỉ số đe dọa (IOC), luồng kịch bản lừa đảo đa bước, tài khoản trung gian (mule bank) và kịch bản thao túng tâm lý phục vụ kho dữ liệu quốc gia (NCSC/A05). Nếu phát hiện tên miền mạo danh trực diện thương hiệu đang hoạt động, vui lòng chuyển sang kênh xử lý khẩn cấp.
              </p>
            </div>
          </div>

          <Link
            href="/business-partner/alerts"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-red-500 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-600 shadow-2xs hover:bg-red-100 dark:bg-red-950/40 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/60 transition-colors"
          >
            <WarningCircle size={16} weight="bold" />
            <span>Phát Lệnh Khẩn (Takedown)</span>
          </Link>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Đã đóng góp
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{counts.total}</span>
            <span className="text-[11px] text-slate-400">Hồ sơ STIX</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Tích hợp Blacklist
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{counts.verified}</span>
            <span className="text-[11px] text-slate-400">Mẫu chuẩn hóa</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Đang thẩm định
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{counts.pending}</span>
            <span className="text-[11px] text-slate-400">Mẫu NCSC/A05</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Điểm uy tín tình báo
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">98.4%</span>
            <span className="rounded bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 text-[9px] font-bold text-indigo-700 dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-300">
              Tier-1
            </span>
          </div>
        </div>
      </div>

      {/* Main Form & History List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Form: 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              {/* Form Title */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    Mẫu Báo Cáo Phân Tích & Phân Loại
                  </div>
                  <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                    Đóng Góp Tình Báo
                  </h1>
                </div>
                <span className="self-start sm:self-auto rounded-md bg-slate-100 px-2.5 py-1 text-xs font-mono font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Mã Hồ Sơ Dự Kiến: INTEL-2026-049
                </span>
              </div>

              {/* 1. Taxonomy & Scenario Name */}
              <div className="mt-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                    1
                  </span>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Phân Loại Mẫu Kịch Bản & Danh Mục Scam
                  </h2>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tên Mẫu Kịch Bản / Tóm Tắt Nguy Cơ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={intelTitle}
                    onChange={(e) => setIntelTitle(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {/* Taxonomy tags */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Danh Mục Kịch Bản Lừa Đảo (Taxonomy Group)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {taxonomyOptions.map((tag) => {
                      const isSelected = selectedTaxonomies.includes(tag)
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTaxonomy(tag)}
                          className={cn(
                            "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                            isSelected
                              ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                          )}
                        >
                          {tag}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Confidence */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Độ Chuẩn Xác / Tin Cậy (Confidence)
                  </label>
                  <input
                    type="text"
                    value={confidence}
                    onChange={(e) => setConfidence(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* 2. MITRE ATT&CK Stages */}
              <div className="mt-8 space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                    2
                  </span>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Phân Tích Hành Vi & Luồng Kịch Bản (TTPs / MITRE ATT&CK)
                  </h2>
                </div>

                {/* Stage 1 */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                    Giai Đoạn 1: Tiếp Cận Ban Đầu (Initial Access)
                  </div>
                  <textarea
                    rows={2}
                    value={stage1}
                    onChange={(e) => setStage1(e.target.value)}
                    className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                {/* Stage 2 */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                    Giai Đoạn 2: Thao Túng Tâm Lý & Thử Thách Nhỏ (Execution / Credential Access)
                  </div>
                  <textarea
                    rows={2}
                    value={stage2}
                    onChange={(e) => setStage2(e.target.value)}
                    className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                {/* Stage 3 */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                    Giai Đoạn 3: Đóng Băng & Chiếm Đoạt Tiền (Impact & Exfiltration)
                  </div>
                  <textarea
                    rows={2}
                    value={stage3}
                    onChange={(e) => setStage3(e.target.value)}
                    className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Description limit indicator */}
              <div
                className={`mt-3 flex items-center justify-between rounded-lg border p-2.5 text-xs ${
                  isDescOverLimit
                    ? "border-red-500 bg-red-50/70 text-red-600 dark:border-red-500 dark:bg-red-950/40 dark:text-red-400"
                    : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400"
                }`}
              >
                <span>
                  {isDescOverLimit
                    ? "Mô tả chuỗi tấn công vượt quá giới hạn 240 ký tự"
                    : "Tổng độ dài chuỗi tấn công (Giới hạn tối đa 240 ký tự)"}
                </span>
                <span
                  className={
                    isDescOverLimit
                      ? "font-bold text-red-600 dark:text-red-400"
                      : "font-medium text-slate-600 dark:text-slate-300"
                  }
                >
                  {fullDescPreview.length}/240
                </span>
              </div>

              {/* 3. Data Source & Evidence */}
              <div className="mt-8 space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                    3
                  </span>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Nguồn Dữ Liệu & Bằng Chứng Xác Thực
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nguồn Thu Thập Tình Báo
                    </label>
                    <input
                      type="text"
                      value={dataSource}
                      onChange={(e) => setDataSource(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Thời Điểm Phát Hiện Đợt Sóng Đầu Tiên
                    </label>
                    <input
                      type="date"
                      value={firstObservedDate}
                      onChange={(e) => setFirstObservedDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                {/* Upload documents */}
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tài Liệu Minh Chứng (Screenshots, Log files, Bằng chứng giao dịch)
                  </label>
                  <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-5 text-center hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40 cursor-pointer transition-colors">
                    <UploadSimple size={24} className="text-slate-400" />
                    <span className="mt-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Kéo và thả tài liệu chứng thực tại đây
                    </span>
                    <span className="mt-0.5 text-[11px] text-slate-500">
                      Hỗ trợ các định dạng .PDF, .PNG, .JPG, .JSON logs (Tối đa 25MB mỗi tệp)
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>

                {/* Evidence item list */}
                {evidenceList.length > 0 && (
                  <div className="space-y-2">
                    {evidenceList.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800/60"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Paperclip size={16} className="text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                            {ev.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            • {ev.sizeText} • {ev.uploadedAt}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveEvidence(ev.id)}
                          className="rounded p-1 text-slate-400 hover:text-red-500"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Zero PII Checkbox */}
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5 dark:bg-slate-800/50 dark:border-slate-700">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={zeroPiiChecked}
                      onChange={(e) => setZeroPiiChecked(e.target.checked)}
                      className="mt-0.5 rounded border-slate-400 text-slate-900 focus:ring-slate-900"
                    />
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      <strong>Cam kết bảo vệ dữ liệu cá nhân (Zero PII - Nghị định 13/2023/NĐ-CP):</strong> Toàn bộ thông tin định danh cá nhân của khách hàng họ tên đầy đủ của nạn nhân, số CCCD, số dư thực trong chứng từ đính kèm đã được che mờ / ẩn danh trước khi chuyển tải lên hệ thống tình báo A05 & NCSC.
                    </span>
                  </label>
                </div>
              </div>

              {/* Form buttons */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => toast.info("Đã lưu bản nháp tình báo.")}
                  className="w-full sm:w-auto rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Lưu Bản Nháp Tình Báo
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-slate-900 active:bg-black dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 transition-all disabled:opacity-50"
                >
                  <ArrowRight size={16} weight="bold" />
                  <span>
                    {isSubmitting ? "Đang gửi hồ sơ..." : "Gửi Thẩm Định (Submit Intel)"}
                  </span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Lịch Sử Đóng Góp */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Lịch Sử Đóng Góp
            </h3>

            {/* Filter Tabs */}
            <div className="mt-3 flex items-center gap-1.5 border-b border-slate-100 pb-2 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("ALL")
                  setCurrentPage(0)
                }}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  activeTab === "ALL"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                )}
              >
                Tất cả ({counts.total})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("PENDING")
                  setCurrentPage(0)
                }}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  activeTab === "PENDING"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                )}
              >
                Chờ duyệt ({counts.pending})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("VERIFIED")
                  setCurrentPage(0)
                }}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  activeTab === "VERIFIED"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                )}
              >
                Đã tích hợp ({counts.verified})
              </button>
            </div>

            {/* List items */}
            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {isLoadingHistory ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Đang tải danh sách hồ sơ...
                </div>
              ) : historyItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Chưa có hồ sơ đóng góp nào
                </div>
              ) : (
                historyItems.map((item) => (
                  <div key={item.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-slate-900 dark:text-white">
                        {item.submissionCode || `PAL-${item.id}`}
                      </span>
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.2 text-[9px] font-bold",
                          item.status === "VERIFIED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : item.status === "REJECTED"
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                        )}
                      >
                        {item.status === "VERIFIED"
                          ? "ĐÃ DUYỆT"
                          : item.status === "REJECTED"
                            ? "TỪ CHỐI"
                            : "CHỜ THẨM ĐỊNH"}
                      </span>
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                      {item.title}
                    </div>
                    <div className="mt-1 text-[10px] text-slate-400">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString("vi-VN") : "Vừa xong"} • {item.indicatorType || "IOC"}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                <button
                  type="button"
                  disabled={currentPage <= 0 || isLoadingHistory}
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  className="rounded px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Trang trước
                </button>
                <span className="text-[11px] text-slate-500">
                  Trang {currentPage + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages - 1 || isLoadingHistory}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="rounded px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Trang sau
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

