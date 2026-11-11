"use client"

import { useState, useEffect } from "react"
import {
  ShieldWarning,
  Broadcast,
  CheckCircle,
  WarningCircle,
  UploadSimple,
  Trash,
  Eye,
  FileText,
  Clock,
  Sparkle,
  Radio,
  Globe,
  DeviceMobile,
  Bug,
} from "@phosphor-icons/react"
import { toast } from "react-toastify"
import {
  submitPartnerAlertOrIntel,
  getMySubmissions,
} from "@/features/partner/services/partner-submission.service"
import { useAuthStore } from "@/store/auth.store"
import { cn } from "@/lib/utils"

interface AttachedFile {
  id: string
  name: string
  description: string
  sizeText: string
  file?: File
}

export function OfficialAlertForm() {
  const user = useAuthStore((state) => state.user)

  // Attack vector
  const [attackVector, setAttackVector] = useState<string>("bts-fake")
  // Severity
  const [severity, setSeverity] = useState<"urgent" | "high" | "medium">("urgent")

  // Indicators - clean empty initial states
  const [brandnamePhone, setBrandnamePhone] = useState<string>("")
  const [domains, setDomains] = useState<string>("")
  const [muleAccounts, setMuleAccounts] = useState<string>("")
  const [firstObserved, setFirstObserved] = useState<string>("")
  const [lastObserved, setLastObserved] = useState<string>("")
  const [affectedScope, setAffectedScope] = useState<string>("")

  // Scenario description
  const [scenarioDescription, setScenarioDescription] = useState<string>("")

  // Files - empty initial state (no mock files)
  const [files, setFiles] = useState<AttachedFile[]>([])
  const [uploadedRealFile, setUploadedRealFile] = useState<File | null>(null)

  // Agreement
  const [agreementChecked, setAgreementChecked] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Dynamic stats
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0 })

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await getMySubmissions("ALL", 0, 100)
        if (res?.data) {
          const total = res.totalItems || res.data.length
          const approved = res.data.filter((i) => i.status === "VERIFIED").length
          const pending = res.data.filter((i) => i.status === "PENDING").length
          setStats({ total, approved, pending })
        }
      } catch {
        // Keep initial stats
      }
    }
    loadStats()
  }, [])

  // Handle file drop/upload
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadedRealFile(file)
    const sizeInMB = file.size / (1024 * 1024)
    const sizeText =
      sizeInMB >= 1
        ? `${sizeInMB.toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`

    const newFile: AttachedFile = {
      id: String(Date.now()),
      name: file.name,
      description: "Tệp chứng cứ kỹ thuật tải lên",
      sizeText,
      file,
    }
    setFiles([newFile])
    toast.info(`Đã đính kèm tệp: ${file.name}`)
  }

  function handleRemoveFile(id: string) {
    setFiles((prev) => {
      const remaining = prev.filter((f) => f.id !== id)
      const nextReal = remaining.find((f) => f.file)?.file || null
      setUploadedRealFile(nextReal)
      return remaining
    })
  }

  function handlePreviewFile(file: AttachedFile) {
    if (file.file) {
      const url = URL.createObjectURL(file.file)
      window.open(url, "_blank")
    } else {
      toast.info(`Tệp: ${file.name}`)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!agreementChecked) {
      toast.warning("Vui lòng tích xác nhận cam kết tính xác thực trước khi gửi.")
      return
    }

    if (!domains && !brandnamePhone && !muleAccounts) {
      toast.error("Vui lòng cung cấp ít nhất một chỉ báo IOC (tên miền, số điện thoại hoặc số tài khoản).")
      return
    }

    if (scenarioDescription.trim().length > 160) {
      toast.error(`Mô tả kịch bản không được vượt quá 160 ký tự (hiện tại: ${scenarioDescription.trim().length} ký tự).`)
      return
    }

    setIsSubmitting(true)

    // Snapshot draft values at submission time to preserve edits made while pending
    const submittedBrandname = brandnamePhone
    const submittedDomains = domains
    const submittedMuleAccounts = muleAccounts
    const submittedFirstObserved = firstObserved
    const submittedLastObserved = lastObserved
    const submittedAffectedScope = affectedScope
    const submittedScenarioDescription = scenarioDescription
    const submittedFiles = files
    const submittedRealFile = uploadedRealFile
    const submittedAgreement = agreementChecked

    try {
      // Pick representative indicator
      const primaryUrl = domains.split(",")[0]?.trim()
      const primaryIndicator = primaryUrl || brandnamePhone.split(",")[0]?.trim() || muleAccounts

      const title = `[CẢNH BÁO KHẨN] Chiến dịch mạo danh qua ${
        attackVector === "bts-fake"
          ? "SMS Brandname Fake BTS"
          : attackVector === "phishing-web"
            ? "Website Phishing OTP"
            : attackVector === "malware-apk"
              ? "Mã độc APK Ngân Hàng Giả"
              : "Tổng đài mạo danh"
      }`

      const safeDesc = scenarioDescription.trim()
      const payload = {
        submissionType: "SCAM_ALERT" as const,
        title: title.slice(0, 250),
        description: safeDesc,
        indicatorType: primaryUrl ? "URL" : "PHONE",
        indicatorValue: primaryIndicator,
        categoryCode: attackVector === "bts-fake" ? "SMS_BTS" : "PHISHING_PORTAL",
      }

      await submitPartnerAlertOrIntel(payload, uploadedRealFile)

      toast.success("Đã gửi phát lệnh cảnh báo khẩn cấp thành công! Hồ sơ đã được đưa vào luồng C1 Fast-Track.")

      // Clear only fields whose current values still match the submitted draft
      setBrandnamePhone((curr) => (curr === submittedBrandname ? "" : curr))
      setDomains((curr) => (curr === submittedDomains ? "" : curr))
      setMuleAccounts((curr) => (curr === submittedMuleAccounts ? "" : curr))
      setFirstObserved((curr) => (curr === submittedFirstObserved ? "" : curr))
      setLastObserved((curr) => (curr === submittedLastObserved ? "" : curr))
      setAffectedScope((curr) => (curr === submittedAffectedScope ? "" : curr))
      setScenarioDescription((curr) => (curr === submittedScenarioDescription ? "" : curr))
      setFiles((curr) => (curr === submittedFiles ? [] : curr))
      setUploadedRealFile((curr) => (curr === submittedRealFile ? null : curr))
      setAgreementChecked((curr) => (curr === submittedAgreement ? false : curr))

      // Refresh dynamic stats
      try {
        const res = await getMySubmissions("ALL", 0, 100)
        if (res?.data) {
          setStats({
            total: res.totalItems || res.data.length,
            approved: res.data.filter((i) => i.status === "VERIFIED").length,
            pending: res.data.filter((i) => i.status === "PENDING").length,
          })
        }
      } catch {}
    } catch (err: any) {
      console.error("Submit error", err)
      toast.error(err?.response?.data?.message || "Không thể gửi cảnh báo, vui lòng thử lại sau.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-red-600 text-white shadow-xs">
                <Broadcast size={18} weight="bold" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Tạo & Phát Lệnh Cảnh Báo Khẩn Cấp (Official Alert Submission)
              </h1>
            </div>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-4xl leading-relaxed">
              Gửi thông tin chiến dịch mạo danh thương hiệu quy mô lớn đến Cục An ninh mạng (A05), NCSC và mạng lưới cảnh báo cộng đồng. Dữ liệu sẽ được thẩm định nghiệp vụ trước khi phát lệnh chính thức.
            </p>
          </div>

          {/* Stat pills */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
              <span className="text-slate-500">Đã gửi: </span>
              <span className="font-bold text-slate-900 dark:text-white">{stats.total}</span>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 shadow-2xs">
              <span>Đã phê chuẩn: </span>
              <span className="font-bold">{stats.approved}</span>
            </div>
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300 shadow-2xs">
              <span>Đang thẩm định: </span>
              <span className="font-bold">{stats.pending}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Form Left, Fast-Track Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Form: 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1 */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                    1
                  </span>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white">
                    Phân Loại Chiến Dịch & Thương Hiệu Bị Mạo Danh
                  </h2>
                </div>
                <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold tracking-wider text-red-700 dark:bg-red-950 dark:text-red-400">
                  YÊU CẦU BẮT BUỘC
                </span>
              </div>

              {/* Attack Vector 4 cards */}
              <div className="mt-4">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Hình thức mạo danh kỹ thuật (Attack Vector)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Card 1 */}
                  <div
                    onClick={() => setAttackVector("bts-fake")}
                    className={cn(
                      "cursor-pointer rounded-lg border p-3.5 transition-all text-left",
                      attackVector === "bts-fake"
                        ? "border-slate-900 bg-slate-50 dark:border-white dark:bg-slate-800/80 ring-1 ring-slate-900 dark:ring-white"
                        : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                        <Radio size={16} weight="fill" className="text-red-500" />
                        <span>SMS Brandname Giả Mạo</span>
                      </div>
                      <span className="rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
                        BTS GIẢ
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      Trạm thu phát sóng di động giả lập chèn Brandname mạo danh
                    </p>
                  </div>

                  {/* Card 2 */}
                  <div
                    onClick={() => setAttackVector("phishing-web")}
                    className={cn(
                      "cursor-pointer rounded-lg border p-3.5 transition-all text-left",
                      attackVector === "phishing-web"
                        ? "border-slate-900 bg-slate-50 dark:border-white dark:bg-slate-800/80 ring-1 ring-slate-900 dark:ring-white"
                        : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                    )}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                      <Globe size={16} weight="bold" className="text-blue-500" />
                      <span>Tên Miền / Phishing Portal Thu Thập OTP</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      Trang web mạo danh giao diện ngân hàng/tổ chức đánh cắp thông tin & OTP
                    </p>
                  </div>

                  {/* Card 3 */}
                  <div
                    onClick={() => setAttackVector("phone-spoof")}
                    className={cn(
                      "cursor-pointer rounded-lg border p-3.5 transition-all text-left",
                      attackVector === "phone-spoof"
                        ? "border-slate-900 bg-slate-50 dark:border-white dark:bg-slate-800/80 ring-1 ring-slate-900 dark:ring-white"
                        : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                    )}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                      <DeviceMobile size={16} weight="bold" className="text-amber-500" />
                      <span>Số Điện Thoại Mạo Danh</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      Tổng đài giả mạo liên hệ điều tra hoặc phòng chăm sóc khách hàng
                    </p>
                  </div>

                  {/* Card 4 */}
                  <div
                    onClick={() => setAttackVector("malware-apk")}
                    className={cn(
                      "cursor-pointer rounded-lg border p-3.5 transition-all text-left",
                      attackVector === "malware-apk"
                        ? "border-slate-900 bg-slate-50 dark:border-white dark:bg-slate-800/80 ring-1 ring-slate-900 dark:ring-white"
                        : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                    )}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                      <Bug size={16} weight="bold" className="text-purple-500" />
                      <span>Mã Độc / Ứng Dụng Ngân Hàng Giả (APK)</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      Tệp cài đặt chứa Trojan Accessibility Service chiếm quyền kiểm soát điện thoại
                    </p>
                  </div>
                </div>
              </div>

              {/* Severity Level */}
              <div className="mt-5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Mức độ đe dọa & Khẩn cấp (Severity Level)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    onClick={() => setSeverity("urgent")}
                    className={cn(
                      "cursor-pointer rounded-lg border p-3 transition-all",
                      severity === "urgent"
                        ? "border-red-500 bg-red-50/70 dark:bg-red-950/40 text-red-900 dark:text-red-200 ring-1 ring-red-500"
                        : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                    )}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-red-600 dark:text-red-400">
                      <ShieldWarning size={16} weight="fill" />
                      <span>Khẩn cấp</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                      Nguy cơ thất thoát tài sản diện rộng tức thời.
                    </p>
                  </div>

                  <div
                    onClick={() => setSeverity("high")}
                    className={cn(
                      "cursor-pointer rounded-lg border p-3 transition-all",
                      severity === "high"
                        ? "border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 ring-1 ring-amber-500"
                        : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                    )}
                  >
                    <div className="font-bold text-xs text-amber-700 dark:text-amber-400">
                      Nghiêm trọng
                    </div>
                    <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                      Chiến dịch diện rộng nhưng chưa ghi nhận thiệt hại lớn.
                    </p>
                  </div>

                  <div
                    onClick={() => setSeverity("medium")}
                    className={cn(
                      "cursor-pointer rounded-lg border p-3 transition-all",
                      severity === "medium"
                        ? "border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-1 ring-blue-500"
                        : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                    )}
                  >
                    <div className="font-bold text-xs text-blue-700 dark:text-blue-400">
                      Trung bình
                    </div>
                    <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                      Đang thăm dò hoặc số lượng nạn nhân ít.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                <span className="flex size-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                  2
                </span>
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white">
                  Thông Tin Indicator (IOCs) & Phạm Vi Ảnh Hưởng
                </h2>
              </div>

              <div className="mt-4 space-y-4 text-xs">
                {/* Brandname */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Đầu số mạo danh / Brandname
                  </label>
                  <input
                    type="text"
                    value={brandnamePhone}
                    onChange={(e) => setBrandnamePhone(e.target.value)}
                    placeholder="Ví dụ: +84 28 7300 xxxx, VIETCOMBANK (Phát tán qua BTS trạm sóng giả)..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {/* Domains */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Danh sách Tên miền / URL thu thập thông tin nghi vấn
                    </label>
                    <span className="text-[10px] text-slate-400">Phân tách bằng dấu phẩy</span>
                  </div>
                  <input
                    type="text"
                    value={domains}
                    onChange={(e) => setDomains(e.target.value)}
                    placeholder="Ví dụ: vcb-digibank-xacthuc.top, vietcombank-secotp.com..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {/* Mule accounts */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Số tài khoản thụ hưởng dòng tiền lừa đảo (Mule Accounts - nếu có)
                  </label>
                  <input
                    type="text"
                    value={muleAccounts}
                    onChange={(e) => setMuleAccounts(e.target.value)}
                    placeholder="Ví dụ: 0704 2292 8192 11 - NGUYEN VAN B - Ngân hàng TMCP X..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {/* 3 cols: First Observed, Last Observed, Scope */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Ghi nhận lần đầu (First Observed)
                    </label>
                    <input
                      type="datetime-local"
                      value={firstObserved}
                      onChange={(e) => setFirstObserved(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Ghi nhận gần nhất (Last Observed)
                    </label>
                    <input
                      type="datetime-local"
                      value={lastObserved}
                      onChange={(e) => setLastObserved(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Ước tính phạm vi ảnh hưởng
                    </label>
                    <input
                      type="text"
                      value={affectedScope}
                      onChange={(e) => setAffectedScope(e.target.value)}
                      placeholder="Ví dụ: Toàn quốc, Hà Nội & TP.HCM..."
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3 */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                <span className="flex size-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                  3
                </span>
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white">
                  Mô Tả Kịch Bản Lừa Đảo & Cơ Chế Tấn Công
                </h2>
              </div>

              <div className="mt-4">
                <textarea
                  rows={5}
                  value={scenarioDescription}
                  onChange={(e) => setScenarioDescription(e.target.value)}
                  placeholder="Mô tả tóm tắt kịch bản lừa đảo, phương thức phát tán và cơ chế tấn công..."
                  className={`w-full rounded-lg border p-3 text-xs leading-relaxed focus:bg-white focus:outline-none dark:bg-slate-800 dark:text-white ${
                    scenarioDescription.length > 160
                      ? "border-red-500 bg-red-50/30 focus:border-red-600 dark:border-red-500"
                      : "border-slate-200 bg-slate-50 text-slate-900 focus:border-slate-900 dark:border-slate-700"
                  }`}
                />
                <div className="mt-1 flex items-center justify-between text-xs">
                  {scenarioDescription.length > 160 ? (
                    <span className="text-red-500 font-medium">
                      Mô tả kịch bản vượt quá giới hạn 160 ký tự
                    </span>
                  ) : (
                    <span className="text-slate-500">Giới hạn tối đa 160 ký tự</span>
                  )}
                  <span
                    className={
                      scenarioDescription.length > 160
                        ? "text-red-500 font-bold"
                        : "text-slate-400"
                    }
                  >
                    {scenarioDescription.length}/160
                  </span>
                </div>
              </div>
            </div>

            {/* Section 4 */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                    4
                  </span>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white">
                    Hồ Sơ Chứng Cứ Kỹ Thuật (Evidence Attachments)
                  </h2>
                </div>
                <span className="text-[10px] text-slate-500">
                  Hỗ trợ: JPG, PNG, PDF, EML, PCAP (Tối đa 25MB)
                </span>
              </div>

              {/* Upload Dropzone */}
              <div className="mt-4">
                <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-6 text-center hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40 cursor-pointer transition-colors">
                  <UploadSimple size={28} className="text-slate-400" />
                  <span className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Kéo thả tệp chứng cứ hoặc nhấp chuột để tải lên
                  </span>
                  <span className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Gói dữ liệu PCAP, bản chụp màn hình tin nhắn nạn nhân, mã nguồn phishing portal
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>

              {/* Attached file list */}
              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    Tệp đính kèm đã sẵn sàng ({files.length} tệp)
                  </div>
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800/60"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <FileText size={18} className="text-indigo-500 shrink-0" />
                        <div className="truncate">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {file.name}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {file.description} • {file.sizeText}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handlePreviewFile(file)}
                          className="rounded px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          XEM TRƯỚC
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(file.id)}
                          className="rounded p-1 text-slate-400 hover:text-red-500"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Legal Checkbox */}
              <div className="mt-5 rounded-lg bg-amber-50/80 border border-amber-200/80 p-3 dark:bg-amber-950/20 dark:border-amber-900/50">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreementChecked}
                    onChange={(e) => setAgreementChecked(e.target.checked)}
                    className="mt-0.5 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
                    Tôi xác nhận thông tin cảnh báo trên đã qua kiểm tra sơ bộ từ <strong>Đội Ứng Cứu Sự Cố SOC {user?.email ? `(${user.email})` : "Đối Tác"}</strong> và cam kết tính xác thực theo quy chuẩn pháp lý nghiệp vụ an ninh mạng số. Mọi hành vi cố ý báo cáo sai lệch sẽ chịu trách nhiệm theo điều lệ thành viên ScamShield B2B.
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => toast.info("Đã lưu bản nháp vào hệ thống bộ nhớ đệm.")}
                  className="w-full sm:w-auto rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Lưu Bản Nháp (Draft)
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-red-700 active:bg-red-800 transition-all disabled:opacity-50"
                >
                  <Broadcast size={16} weight="bold" />
                  <span>
                    {isSubmitting ? "Đang gửi hồ sơ..." : "GỬI PHÊ DUYỆT CẢNH BÁO (SUBMIT OFFICIAL ALERT)"}
                  </span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Right Sidebar: Fast-Track Process */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Quy Trình Xử Lý Cảnh Báo Khẩn
            </h3>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Chu trình kiểm định đa tầng phối hợp liên ngành nhằm đảm bảo không chặn nhầm tài nguyên hợp pháp.
            </p>

            <div className="mt-4 space-y-4 text-xs">
              {/* Step 1 */}
              <div className="relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-0 before:w-px before:bg-slate-200 dark:before:bg-slate-800">
                <span className="absolute left-0 top-1 flex size-4 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                  1
                </span>
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 dark:text-white">
                    Submitted (Đã tiếp nhận)
                  </div>
                  <span className="rounded bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 text-[9px] font-bold text-indigo-700 dark:bg-indigo-950 dark:border-indigo-900 dark:text-indigo-300">
                    C1 FAST-TRACK
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 leading-snug">
                  Hệ thống cấp mã tham chiếu <strong>ALT-2025-XXXX</strong> mở luồng phân phối vào hàng đợi nghiệp vụ.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-0 before:w-px before:bg-slate-200 dark:before:bg-slate-800">
                <span className="absolute left-0 top-1 flex size-4 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                  2
                </span>
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 dark:text-white">
                    Under Review (Đang thẩm định)
                  </div>
                  <span className="rounded bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 text-[9px] font-bold text-indigo-700 dark:bg-indigo-950 dark:border-indigo-900 dark:text-indigo-300">
                    C1 FAST-TRACK
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 leading-snug">
                  Điều tra viên A05 & Kỹ sư NCSC rà soát IOC, đối chiếu DNS/Sandbox và lịch sử lừa đảo quốc gia.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative pl-6">
                <span className="absolute left-0 top-1 flex size-4 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                  3
                </span>
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 dark:text-white">
                    Broadcast Alert (Phát lệnh)
                  </div>
                  <span className="rounded bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 text-[9px] font-bold text-indigo-700 dark:bg-indigo-950 dark:border-indigo-900 dark:text-indigo-300">
                    C1 FAST-TRACK
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 leading-snug">
                  Kích hoạt lệnh đẩy thông báo khẩn qua App ScamShield, API DNS Viễn thông và mạng lưới 40+ ngân hàng.
                </p>
              </div>
            </div>

            {/* SLA Note */}
            <div className="mt-6 flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-100 dark:border-slate-700">
              <Clock size={16} className="text-slate-400 shrink-0" />
              <span>
                Thời gian xử lý trung bình: <strong>10 phút</strong> đối với đối tác C1.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
