"use client"

import { useState, useEffect } from "react"
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
  const [intelTitle, setIntelTitle] = useState<string>(
    "Chiêu trò tuyển mẫu nhí Tết 2025 kết hợp mở thẻ tín dụng ảo & thao túng tâm lý"
  )

  // Taxonomy tags
  const [selectedTaxonomies, setSelectedTaxonomies] = useState<string[]>([
    "Tuyển dụng / CTV online",
  ])

  // Confidence
  const [confidence, setConfidence] = useState<string>(
    "Rất cao - Nội bộ SOC & KH có chứng từ"
  )

  // MITRE ATT&CK Stages
  const [stage1, setStage1] = useState<string>(
    "Kẻ gian chạy quảng cáo Facebook/Tiktok về chương trình tuyển mẫu nhí Tết 2025 cho nhãn hàng thời trang. Khi phụ huynh quan tâm, đối tượng hướng dẫn vào nhóm Telegram có phụ huynh giả (CLONE)."
  )
  const [stage2, setStage2] = useState<string>(
    "Yêu cầu hoàn thành nhiệm vụ duyệt hợp đồng ảo bằng cách nạp tiền cọc 300.000 VNĐ - 1.000.000 VNĐ. Sau 5 phút, nạn nhân nhận lại tiền gốc cộng hoa hồng 10% để củng cố niềm tin tuyệt đối."
  )
  const [stage3, setStage3] = useState<string>(
    "Đưa vào nhóm VIP với nhiệm vụ nạp 50.000.000 VNĐ. Hệ thống báo lỗi \"sai cú pháp chuyển khoản\", yêu cầu nạp thêm 100.000.000 VNĐ để mở khóa tài khoản, sau đó xóa nhóm và cắt liên lạc."
  )

  // Data source
  const [dataSource, setDataSource] = useState<string>(
    "Hotline CSKH & Khiếu Nại Gian Lận"
  )
  const [firstObservedDate, setFirstObservedDate] = useState<string>("2025-12-01")

  // Evidences
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([
    {
      id: "ev1",
      name: "screenshot_zalo_chat_tax.png",
      sizeText: "1.4 MB",
      uploadedAt: "14/01/2025 08:12",
    },
    {
      id: "ev2",
      name: "sao_ke_dong_tien_mule_account.pdf",
      sizeText: "3.8 MB",
      uploadedAt: "14/01/2025 10:45",
    },
  ])
  const [realUploadedFile, setRealUploadedFile] = useState<File | null>(null)

  // Zero PII agreement
  const [zeroPiiChecked, setZeroPiiChecked] = useState<boolean>(true)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Right column tab & items
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "VERIFIED">("ALL")
  const [historyItems, setHistoryItems] = useState<PartnerSubmissionItem[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false)

  // Taxonomy options
  const taxonomyOptions = [
    "Tuyển dụng / CTV online",
    "Mạo danh cơ quan công quyền",
    "Chiếm quyền Accessibility",
    "Đầu tư tài chính / Sàn ảo",
    "Deepfake AI mạo danh",
    "Gian lận TMĐT / Voucher",
  ]

  // Fetch real submissions on mount
  useEffect(() => {
    async function loadHistory() {
      setIsLoadingHistory(true)
      try {
        const res = await getMySubmissions("ALL", 0, 10)
        if (res?.data && res.data.length > 0) {
          setHistoryItems(res.data)
        }
      } catch (e) {
        console.warn("Could not load backend submissions, using fallback", e)
      } finally {
        setIsLoadingHistory(false)
      }
    }
    loadHistory()
  }, [])

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

    setIsSubmitting(true)

    try {
      const fullDescription = `[HÀNH VI & KỊCH BẢN (MITRE ATT&CK)]\n- Giai đoạn 1 (Initial Access): ${stage1}\n- Giai đoạn 2 (Execution): ${stage2}\n- Giai đoạn 3 (Impact): ${stage3}\n\n[NGUỒN & ĐẶC TÍNH]\n- Nguồn: ${dataSource}\n- Thời điểm: ${firstObservedDate}\n- Danh mục: ${selectedTaxonomies.join(", ")}\n- Độ tin cậy: ${confidence}`

      const payload = {
        submissionType: "THREAT_INTEL" as const,
        title: intelTitle,
        description: fullDescription,
        indicatorType: "URL",
        indicatorValue: "intel-ioc-cluster-" + Date.now(),
        categoryCode: selectedTaxonomies[0] || "THREAT_CLUSTER",
      }

      const created = await submitPartnerAlertOrIntel(payload, realUploadedFile)

      toast.success("Đã nộp hồ sơ đóng góp tình báo thành công! Mã hồ sơ đang chờ chuyên viên NCSC/A05 thẩm định.")
      if (created) {
        setHistoryItems((prev) => [created, ...prev])
      }
    } catch (err: any) {
      console.error("Submit error", err)
      toast.error(err?.response?.data?.message || "Không thể nộp hồ sơ tình báo, vui lòng thử lại sau.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filtered history list
  const filteredHistory = historyItems.filter((item) => {
    if (activeTab === "PENDING") return item.status === "PENDING"
    if (activeTab === "VERIFIED") return item.status === "VERIFIED"
    return true
  })

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
            <span className="text-2xl font-bold text-slate-900 dark:text-white">38</span>
            <span className="text-[11px] text-slate-400">Hồ sơ STIX</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Tích hợp Blacklist
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">29</span>
            <span className="text-[11px] text-slate-400">Mẫu chuẩn hóa</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Đang thẩm định
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">05</span>
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
                onClick={() => setActiveTab("ALL")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  activeTab === "ALL"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                )}
              >
                Tất cả (38)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("PENDING")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  activeTab === "PENDING"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                )}
              >
                Chờ duyệt (5)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("VERIFIED")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  activeTab === "VERIFIED"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                )}
              >
                Đã tích hợp (29)
              </button>
            </div>

            {/* List items */}
            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {/* Item 1 */}
              <div className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-slate-900 dark:text-white">
                    INTEL-2025-047
                  </span>
                  <span className="rounded bg-blue-50 border border-blue-200 px-1.5 py-0.2 text-[9px] font-bold text-blue-700 dark:bg-blue-950 dark:border-blue-900 dark:text-blue-300">
                    CHỜ THẨM ĐỊNH
                  </span>
                </div>
                <div className="mt-1 text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                  Mạo danh nhân viên điện lực EVN thu tiền điện qua app giả
                </div>
                <div className="mt-1 text-[10px] text-slate-400">
                  Hôm nay 08:30 • 4 Chỉ số IOC
                </div>
              </div>

              {/* Item 2 */}
              <div className="py-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-slate-900 dark:text-white">
                    INTEL-2025-044
                  </span>
                  <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.2 text-[9px] font-bold text-amber-700 dark:bg-amber-950 dark:border-amber-900 dark:text-amber-300">
                    YÊU CẦU BỔ SUNG
                  </span>
                </div>
                <div className="mt-1 text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                  Phishing đầu tư sàn Forex AI lợi nhuận 30%/ngày
                </div>
                <div className="mt-1 text-[10px] text-slate-400">
                  12/01/2025 • Thiếu bằng chứng log SMS
                </div>
              </div>

              {/* Item 3 */}
              <div className="py-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-slate-900 dark:text-white">
                    INTEL-2025-041
                  </span>
                  <span className="rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-300">
                    ĐÃ TÍCH HỢP BLACKLIST
                  </span>
                </div>
                <div className="mt-1 text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                  Tuyển mẫu nhí Tết lừa tiền cọc đa tầng
                </div>
                <div className="mt-1 text-[10px] text-slate-400">
                  10/01/2025 • 7 Chỉ số IOC
                </div>
              </div>

              {/* Item 4 */}
              <div className="py-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-slate-900 dark:text-white">
                    INTEL-2025-039
                  </span>
                  <span className="rounded bg-purple-50 border border-purple-200 px-1.5 py-0.2 text-[9px] font-bold text-purple-700 dark:bg-purple-950 dark:border-purple-900 dark:text-purple-300">
                    ĐÃ DUYỆT TAXONOMY
                  </span>
                </div>
                <div className="mt-1 text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                  Giả mạo nhân viên hỗ trợ nâng hạn mức thẻ tín dụng
                </div>
                <div className="mt-1 text-[10px] text-slate-400">
                  09/01/2025 • 3 Phishing Domain
                </div>
              </div>

              {/* Real items from backend if available */}
              {filteredHistory.map((item) => (
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
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

