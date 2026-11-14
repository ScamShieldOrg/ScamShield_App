"use client"

import { ModeratorDashboard } from "@/components/features/moderator/moderator-dashboard"

import { useState, useEffect } from "react"
import { toast } from "react-toastify"
import {
  ShieldCheck,
  WarningCircle,
  FileText,
  MagnifyingGlass,
  ArrowRight,
  DownloadSimple,
  CheckCircle,
  XCircle,
  Clock,
  Broadcast,
  User,
  Tag,
  Building,
} from "@phosphor-icons/react"
import {
  getModeratorPartnerQueue,
  getModeratorPartnerCounts,
  getModeratorPartnerSubmissionDetail,
  submitModeratorPartnerDecision,
  downloadModeratorEvidence,
  ModeratorPartnerQueueCounts,
} from "@/features/moderator/services/moderator-partner-submission.service"
import { PartnerSubmissionItem } from "@/features/partner/types/partner-submission.types"
import { cn } from "@/lib/utils"

export default function ModeratorPartnerSubmissionsPage() {
  const [items, setItems] = useState<PartnerSubmissionItem[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<PartnerSubmissionItem | null>(null)
  const [currentTab, setCurrentTab] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [counts, setCounts] = useState<ModeratorPartnerQueueCounts>({
    all: 0,
    pending: 0,
    verified: 0,
    rejected: 0,
  })
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSubmittingDecision, setIsSubmittingDecision] = useState<boolean>(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false)
  const [rejectReason, setRejectReason] = useState<string>("")

  // Load list & counts
  async function loadData() {
    setIsLoading(true)
    try {
      const [queueData, countData] = await Promise.all([
        getModeratorPartnerQueue({
          status: currentTab,
          search: searchQuery.trim() || undefined,
        }),
        getModeratorPartnerCounts(),
      ])

      const list = queueData.data || []
      setItems(list)
      setCounts(countData)

      setSelectedId(previous => list.some(item => item.id === previous) ? previous : null)
    } catch (e: any) {
      console.error("Load queue error", e)
      toast.error("Không thể tải danh sách hàng chờ thẩm định.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [currentTab])

  // Load detail whenever selectedId changes
  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null)
      return
    }

    async function loadDetail() {
      try {
        const detail = await getModeratorPartnerSubmissionDetail(selectedId!)
        setSelectedDetail(detail)
      } catch (e) {
        console.error("Load detail error", e)
      }
    }
    loadDetail()
  }, [selectedId])

  // Handle Verify Decision
  async function handleVerify() {
    if (!selectedId) return
    setIsSubmittingDecision(true)
    try {
      await submitModeratorPartnerDecision(selectedId, {
        decision: "VERIFY",
        reason: "Xác nhận đúng là mối đe dọa / chiến dịch mạo danh thương hiệu.",
      })
      toast.success(
        "Đã phê chuẩn thành công! Chỉ báo đã được ghi vào Blacklist (Confirmed) và phát lệnh cảnh báo."
      )
      await loadData()
    } catch (err: any) {
      console.error("Verify error", err)
      toast.error(err?.response?.data?.message || "Không thể phê chuẩn hồ sơ.")
    } finally {
      setIsSubmittingDecision(false)
    }
  }

  // Handle Reject Decision
  async function handleReject() {
    if (!selectedId) return
    if (!rejectReason.trim()) {
      toast.warning("Vui lòng nhập lý do từ chối.")
      return
    }
    setIsSubmittingDecision(true)
    try {
      await submitModeratorPartnerDecision(selectedId, {
        decision: "REJECT",
        reason: rejectReason.trim(),
      })
      toast.info("Đã từ chối hồ sơ và gửi thông báo lý do đến đối tác.")
      setIsRejectModalOpen(false)
      setRejectReason("")
      await loadData()
    } catch (err: any) {
      console.error("Reject error", err)
      toast.error(err?.response?.data?.message || "Không thể từ chối hồ sơ.")
    } finally {
      setIsSubmittingDecision(false)
    }
  }

  // Download Evidence
  async function handleDownloadEvidence() {
    if (!selectedId) return
    try {
      const blob = await downloadModeratorEvidence(selectedId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = selectedDetail?.evidenceFileName || `evidence-${selectedId}.bin`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Đang tải tệp bằng chứng xuống...")
    } catch (e) {
      console.error("Download error", e)
      toast.error("Không thể tải tệp bằng chứng.")
    }
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
              <ShieldCheck size={20} weight="bold" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Hàng Chờ Thẩm Định Tin Báo Đối Tác (Partner Submissions)
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Xem xét và phê chuẩn các cảnh báo lừa đảo khẩn cấp (Official Alert) và đóng góp tình báo (Threat Intel) từ mạng lưới đối tác C1.
          </p>
        </div>

        {/* Tab filters */}
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setCurrentTab("ALL")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-semibold transition-all",
              currentTab === "ALL"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            )}
          >
            Tất cả ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setCurrentTab("PENDING")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-semibold transition-all",
              currentTab === "PENDING"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            )}
          >
            Chờ duyệt ({counts.pending})
          </button>
          <button
            type="button"
            onClick={() => setCurrentTab("VERIFIED")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-semibold transition-all",
              currentTab === "VERIFIED"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            )}
          >
            Đã duyệt ({counts.verified})
          </button>
          <button
            type="button"
            onClick={() => setCurrentTab("REJECTED")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-semibold transition-all",
              currentTab === "REJECTED"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            )}
          >
            Từ chối ({counts.rejected})
          </button>
        </div>
      </div>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Search box */}
          <div className="relative">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tiêu đề, đối tác hoặc chỉ số..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadData()}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>

          {/* List items */}
          {isLoading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900">
              Đang tải danh sách hàng chờ...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900">
              Không có hồ sơ nào trong hàng chờ này.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => {
                const isSelected = item.id === selectedId
                const isAlert = item.submissionType === "SCAM_ALERT"

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      "cursor-pointer rounded-xl border p-4 transition-all text-left",
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/50 dark:border-indigo-400 dark:bg-indigo-950/40 ring-1 ring-indigo-600 dark:ring-indigo-400"
                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                          {item.submissionCode || `PAL-${item.id}`}
                        </span>
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[9px] font-bold",
                            isAlert
                              ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                          )}
                        >
                          {isAlert ? "CẢNH BÁO KHẨN" : "TÌNH BÁO THREAT"}
                        </span>
                      </div>

                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold",
                          item.status === "VERIFIED"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : item.status === "REJECTED"
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse"
                        )}
                      >
                        {item.status === "VERIFIED"
                          ? "ĐÃ DUYỆT"
                          : item.status === "REJECTED"
                          ? "ĐÃ TỪ CHỐI"
                          : "CHỜ THẨM ĐỊNH"}
                      </span>
                    </div>

                    <h3 className="mt-2 text-xs font-semibold text-slate-900 dark:text-white line-clamp-2">
                      {item.title}
                    </h3>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 pt-2 dark:border-slate-800">
                      <div className="flex items-center gap-1 truncate">
                        <Building size={14} className="shrink-0" />
                        <span className="truncate">{item.partnerLegalName || "Đối tác C1"}</span>
                      </div>
                      <span className="shrink-0">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString("vi-VN") : ""}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right column: Detail & Verdict (7 cols) */}
        <div className="lg:col-span-7">
          {selectedId === null ? <ModeratorDashboard /> : selectedDetail ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
              {/* Header of detail */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                      {selectedDetail.submissionCode || `PAL-${selectedDetail.id}`}
                    </span>
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-[10px] font-bold uppercase",
                        selectedDetail.submissionType === "SCAM_ALERT"
                          ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                      )}
                    >
                      {selectedDetail.submissionType === "SCAM_ALERT" ? "Official Scam Alert" : "Threat Intel"}
                    </span>
                  </div>
                  <h2 className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                    {selectedDetail.title}
                  </h2>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                    <span>Đối tác: <strong>{selectedDetail.partnerLegalName || "VCB Security Sentinel"}</strong></span>
                    <span>•</span>
                    <span>Gửi lúc: {selectedDetail.createdAt ? new Date(selectedDetail.createdAt).toLocaleString("vi-VN") : ""}</span>
                  </div>
                </div>

                <div className="shrink-0">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-bold inline-block",
                      selectedDetail.status === "VERIFIED"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : selectedDetail.status === "REJECTED"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    )}
                  >
                    {selectedDetail.status === "VERIFIED"
                      ? "ĐÃ PHÊ CHUẨN"
                      : selectedDetail.status === "REJECTED"
                      ? "ĐÃ TỪ CHỐI"
                      : "CHỜ THẨM ĐỊNH"}
                  </span>
                </div>
              </div>

              {/* Indicator Metadata Card */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50 space-y-3">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  Thông Tin Đối Tượng & Mục Tiêu Báo Cáo
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">Hình thức vi phạm:</span>
                    <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                      {selectedDetail.indicatorType === "PHONE"
                        ? "Số điện thoại / SMS Brandname"
                        : selectedDetail.indicatorType === "BANK_ACCOUNT"
                        ? "Số tài khoản ngân hàng thụ hưởng"
                        : "Tên miền / Website lừa đảo"}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Đối tượng bị báo cáo (Mục tiêu):</span>
                    <div className="font-mono font-semibold text-red-600 dark:text-red-400 mt-0.5 break-all">
                      {selectedDetail.indicatorValue || "N/A"}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Hình thức tấn công / Phân loại:</span>
                    <div className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                      {selectedDetail.categoryName || selectedDetail.categoryCode || "Mạo danh ngân hàng"}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Trạng thái danh sách đen:</span>
                    <div className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                      {selectedDetail.isConfirmed ? "Đã kích hoạt trong Blacklist" : "Chưa kích hoạt"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">
                  Nội Dung Mô Tả Kịch Bản & Hành Vi
                </h3>
                <div className="rounded-lg border border-slate-200 bg-white p-3.5 text-xs text-slate-800 leading-relaxed dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {selectedDetail.description}
                </div>
              </div>

              {/* Evidence Section */}
              <div className="pt-2">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">
                  Tài Liệu Chứng Cứ Đính Kèm (Evidence)
                </h3>
                {selectedDetail.evidenceFileName ? (
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-800">
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText size={20} className="text-indigo-500 shrink-0" />
                      <div className="truncate">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">
                          {selectedDetail.evidenceFileName}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {selectedDetail.evidenceFileSize
                            ? `${(selectedDetail.evidenceFileSize / 1024).toFixed(0)} KB`
                            : "Tài liệu chứng cứ hợp lệ"}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadEvidence}
                      className="flex items-center gap-1.5 rounded-md bg-white border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-200"
                    >
                      <DownloadSimple size={14} />
                      <span>Tải về xem</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">
                    Hồ sơ gửi dạng dữ liệu kỹ thuật không kèm tệp tin rời.
                  </div>
                )}
              </div>

              {/* Verdict Actions */}
              {selectedDetail.status === "PENDING" ? (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsRejectModalOpen(true)}
                    disabled={isSubmittingDecision}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400 transition-colors"
                  >
                    <XCircle size={16} weight="bold" />
                    <span>Từ chối (Reject)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={isSubmittingDecision}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700 active:bg-emerald-800 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle size={16} weight="bold" />
                    <span>
                      {isSubmittingDecision
                        ? "Đang xử lý..."
                        : "Phê Chuẩn (Verify & Add to Blacklist)"}
                    </span>
                  </button>
                </div>
              ) : (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <div>
                    Người thẩm định: <strong>{selectedDetail.reviewedByName || "Kiểm duyệt viên"}</strong>
                  </div>
                  <div>
                    Thời gian: {selectedDetail.reviewedAt ? new Date(selectedDetail.reviewedAt).toLocaleString("vi-VN") : "N/A"}
                  </div>
                  {selectedDetail.reviewNotes && (
                    <div className="mt-1">
                      Ghi chú / Lý do: <em>"{selectedDetail.reviewNotes}"</em>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900">
              Chọn một hồ sơ ở cột bên trái để xem chi tiết và thẩm định.
            </div>
          )}
        </div>
      </div>

      {/* Reject Reason Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Nhập lý do từ chối hồ sơ
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Lý do này sẽ được ghi vào nhật ký kiểm toán và gửi thông báo trực tiếp đến đối tác.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ví dụ: Chứng cứ ảnh chụp bị mờ, không đủ cơ sở xác thực URL..."
              className="mt-3 w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isSubmittingDecision}
                className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
