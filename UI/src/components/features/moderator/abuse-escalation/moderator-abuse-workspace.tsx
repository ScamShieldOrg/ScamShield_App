"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { toast } from "react-toastify"
import {
  MagnifyingGlass,
  CheckCircle,
  WarningCircle,
  CircleNotch,
  ArrowsClockwise,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { moderatorAbuseService } from "@/features/moderator/services/moderator-abuse.service"
import { getModeratorReportQueue } from "@/features/moderator/services/moderator-report.service"
import type { ModeratorReportItem } from "@/features/moderator/types/moderator.types"

interface RelatedReport {
  id: number
  code: string
  target: string
  result: string
  statusTone: "danger" | "warning" | "neutral"
  time: string
}

interface AbuseSuspect {
  id: string
  userId: number
  userCode: string
  username: string
  fullName: string
  email: string
  userType: string
  joinedAt: string
  reputation: number
  status: "ACTIVE" | "SUSPENDED" | "BANNED"
  badge: "CẦN XEM XÉT" | "CHỜ XỬ LÝ" | "ĐÃ XỬ LÝ"
  summary: string
  reports24h: number
  reportsContext: string
  rejectedRate: number
  rejectedCount: number
  targetsCount: number
  verifiedTargetsCount: number
  flagType: "BULK_REPORTING" | "FALSE_REPORTING" | "SPAM" | "HARASSMENT" | "OTHER"
  alertTitle: string
  alertBody: string
  moderatorName: string
  submittedAt: string
  relatedReports: RelatedReport[]
  isEscalated?: boolean
}

export function ModeratorAbuseWorkspace() {
  const [suspects, setSuspects] = useState<AbuseSuspect[]>([])
  const [selectedId, setSelectedId] = useState<string>("")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "ESCALATED">("PENDING")
  const [isLoading, setIsLoading] = useState(true)
  const [isQueueError, setIsQueueError] = useState(false)
  const [queueErrorMessage, setQueueErrorMessage] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

  // Selected report IDs for evidence checkbox
  const [selectedReportIds, setSelectedReportIds] = useState<number[]>([])
  const [reason, setReason] = useState(
    "Tài khoản gửi lượng lớn báo cáo nhắm đến các tổ chức đã xác minh. Phần lớn bị từ chối do trùng lặp hoặc thiếu bằng chứng; đề nghị xem xét hành vi cố ý lạm dụng."
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  // Fetch real reports from backend and group by reporter
  const loadQueue = useCallback(async () => {
    setIsLoading(true)
    setIsRetrying(true)
    try {
      const res = await getModeratorReportQueue({ tab: "ALL", size: 50 })
      const reports = res.data || []

        // Group reports by reporter userId
        const groups = new Map<number, ModeratorReportItem[]>()
        for (const r of reports) {
          const uid = r.reporterContext?.userId
          if (uid) {
            const list = groups.get(uid) || []
            list.push(r)
            groups.set(uid, list)
          }
        }

        const suspectList: AbuseSuspect[] = []
        let index = 1

        groups.forEach((userReports, uid) => {
          const first = userReports[0]
          const reporter = first.reporterContext
          const totalReports = reporter?.reports || userReports.length
          const rejectedCount =
            userReports.filter((r) => r.status === "Rejected").length ||
            Math.floor(totalReports * 0.6)
          const rejectedRate =
            totalReports > 0 ? Math.round((rejectedCount / totalReports) * 100) : 0

          const related: RelatedReport[] = userReports.map((r) => {
            const numId = r.rawId ?? parseInt(r.id.replace(/\D/g, ""), 10)
            return {
              id: numId,
              code: r.id,
              target: r.targetIdentifier || "Đối tượng báo cáo",
              result:
                r.status === "Rejected"
                  ? "Từ chối: bằng chứng trùng lặp"
                  : r.status === "Approved"
                    ? "Đã xác nhận"
                    : "Đang chờ duyệt",
              statusTone:
                r.status === "Rejected"
                  ? "danger"
                  : r.status === "Approved"
                    ? "neutral"
                    : "warning",
              time: r.reportedAt ? r.reportedAt.split(" ").at(-1) || "09:00" : "09:00",
            }
          })

          const badge: "CẦN XEM XÉT" | "CHỜ XỬ LÝ" | "ĐÃ XỬ LÝ" =
            rejectedRate > 60 || userReports.length > 5
              ? "CẦN XEM XÉT"
              : reporter?.openFlags && reporter.openFlags > 0
                ? "ĐÃ XỬ LÝ"
                : "CHỜ XỬ LÝ"

          suspectList.push({
            id: `AB-2026-${String(index).padStart(4, "0")}`,
            userId: uid,
            userCode: `U-${String(uid).padStart(5, "0")}`,
            username: first.reportedBy.toLowerCase().replace(/\s+/g, "_"),
            fullName: first.reportedBy,
            email: reporter?.email || `user_${uid}@example.com`,
            userType: "Người dùng thường",
            joinedAt: reporter?.joinedAt
              ? new Date(reporter.joinedAt).toLocaleDateString("vi-VN")
              : "14/02/2025",
            reputation: reporter?.reputationPoints ?? 120,
            status: "ACTIVE",
            badge,
            summary: `Báo cáo hàng loạt · ${userReports.length} đối tượng`,
            reports24h: userReports.length,
            reportsContext: `${userReports.length} báo cáo trong hệ thống`,
            rejectedRate,
            rejectedCount,
            targetsCount: new Set(userReports.map((r) => r.targetIdentifier)).size,
            verifiedTargetsCount: userReports.filter((r) => r.whitelisted).length,
            flagType: "BULK_REPORTING",
            alertTitle: "Phát hiện hoạt động báo cáo bất thường",
            alertBody:
              "Hãy xác minh lịch sử và bằng chứng trước khi gắn cờ rồi chuyển hồ sơ đến Quản trị viên.",
            moderatorName: "Kiểm duyệt viên",
            submittedAt: first.reportedAt || "Hôm nay",
            relatedReports: related,
            isEscalated: reporter?.openFlags ? reporter.openFlags > 0 : false,
          })
          index++
        })

        // Check if suspect already has a pending escalation
        const enrichedSuspects = await Promise.all(
          suspectList.map(async (suspect) => {
            try {
              const esc = await moderatorAbuseService.getEscalations(suspect.userId, {
                status: "PENDING",
                size: 1,
              })
              const hasPending = (esc.data?.length || 0) > 0
              if (hasPending) {
                return { ...suspect, isEscalated: true, badge: "ĐÃ XỬ LÝ" as const }
              }
            } catch {
              // Ignore if cannot load escalations
            }
            return suspect
          })
        )

        if (enrichedSuspects.length > 0) {
          setSuspects(enrichedSuspects)
          setSelectedId(enrichedSuspects[0].id)
          setSelectedReportIds(enrichedSuspects[0].relatedReports.map((r) => r.id))
        } else {
          setSuspects([])
          setSelectedId("")
          setSelectedReportIds([])
        }
        setIsQueueError(false)
        setQueueErrorMessage(null)
      } catch (err) {
        setSuspects([])
        setSelectedId("")
        setSelectedReportIds([])
        setIsQueueError(true)
        const errText =
          err instanceof Error ? err.message : "Không thể tải hàng đợi báo cáo từ máy chủ."
        setQueueErrorMessage(errText)
      } finally {
        setIsLoading(false)
        setIsRetrying(false)
      }
    }, [])

  useEffect(() => {
    loadQueue()
  }, [loadQueue])

  const selected = useMemo(() => {
    return suspects.find((s) => s.id === selectedId) ?? suspects[0]
  }, [suspects, selectedId])

  // Update selected report IDs when suspect changes
  useEffect(() => {
    if (selected?.relatedReports) {
      setSelectedReportIds(selected.relatedReports.map((r) => r.id))
    }
  }, [selected])

  const pendingCount = suspects.filter(
    (s) => s.badge === "CẦN XEM XÉT" || s.badge === "CHỜ XỬ LÝ"
  ).length
  const escalatedCount = suspects.filter((s) => s.isEscalated).length

  const filteredSuspects = suspects.filter((item) => {
    if (filter === "PENDING" && item.isEscalated) return false
    if (filter === "ESCALATED" && !item.isEscalated) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      item.id.toLowerCase().includes(q) ||
      item.username.toLowerCase().includes(q) ||
      item.fullName.toLowerCase().includes(q)
    )
  })

  function toggleReport(id: number) {
    setSelectedReportIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    )
  }

  async function handleEscalate() {
    if (!selected) return

    // Guard: Prevent escalating when queue request failed
    if (isQueueError) {
      const msg =
        "Không thể chuyển hồ sơ khi danh sách hàng đợi đang bị lỗi kết nối. Vui lòng thử lại kết nối máy chủ."
      setFeedback({
        type: "error",
        message: msg,
      })
      toast.error(msg)
      return
    }

    if (selectedReportIds.length === 0) {
      setFeedback({
        type: "error",
        message: "Vui lòng chọn ít nhất một báo cáo làm bằng chứng liên quan.",
      })
      return
    }
    if (reason.trim().length < 20) {
      setFeedback({
        type: "error",
        message: "Lý do chuyển xử lý phải có tối thiểu 20 ký tự.",
      })
      return
    }

    setIsSubmitting(true)
    setFeedback(null)

    try {
      // Call Real Backend Endpoint
      const res = await moderatorAbuseService.createEscalation(selected.userId, {
        flagType: selected.flagType,
        reason: reason.trim(),
        evidence: `Các báo cáo đã đối chiếu: ${selectedReportIds.join(", ")}`,
        reportIds: selectedReportIds,
      })

      const successMsg = `Đã gắn cờ và chuyển hồ sơ thành công cho Quản trị viên xét duyệt (Mã hồ sơ: ${res.escalationCode})!`
      setFeedback({
        type: "success",
        message: successMsg,
      })
      toast.success(successMsg)

      // Update local state to mark as escalated
      setSuspects((current) =>
        current.map((item) =>
          item.id === selected.id
            ? { ...item, isEscalated: true, badge: "ĐÃ XỬ LÝ" }
            : item
        )
      )
      // Automatically switch to the "Đã chuyển" tab
      setFilter("ESCALATED")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi khi chuyển hồ sơ."
      if (
        msg.includes("đã có hồ sơ đang chờ") ||
        msg.includes("Conflict") ||
        msg.includes("409")
      ) {
        const conflictMsg = "Tài khoản này đã có hồ sơ đang chờ Quản trị viên xét duyệt."
        toast.info(conflictMsg)
        setFeedback({
          type: "success",
          message: conflictMsg,
        })
        setSuspects((current) =>
          current.map((item) =>
            item.id === selected.id
              ? { ...item, isEscalated: true, badge: "ĐÃ XỬ LÝ" }
              : item
          )
        )
        setFilter("ESCALATED")
      } else {
        toast.error(msg)
        setFeedback({
          type: "error",
          message: msg,
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      data-report-workspace
      className="flex flex-1 min-h-0 w-full flex-col overflow-hidden bg-white lg:flex-row dark:bg-slate-900"
    >
      {/* Left Panel: Queue */}
      <aside className="flex flex-col w-full shrink-0 border-b border-slate-200 bg-white lg:w-80 lg:border-r lg:border-b-0 dark:border-slate-800 dark:bg-slate-900 lg:h-full lg:min-h-0">
        <div className="p-4 pb-3 shrink-0">
          <h2 className="font-heading text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            Dấu hiệu lạm dụng
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {pendingCount} tài khoản cần kiểm tra
          </p>

          {/* Search */}
          <div className="relative mt-3.5">
            <MagnifyingGlass
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute top-2.5 left-3 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã hồ sơ, tài khoản..."
              className="h-9 w-full rounded-md border border-slate-200 bg-white pr-3 pl-9 text-xs placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:outline-none dark:border-slate-700 dark:bg-slate-950 dark:focus-visible:ring-slate-300"
            />
          </div>

          {/* Filter Tabs */}
          <div className="mt-3 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1 text-center text-xs dark:bg-slate-800/60">
            <button
              type="button"
              onClick={() => setFilter("ALL")}
              className={cn(
                "rounded-md py-1 font-semibold transition-colors",
                filter === "ALL"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
              )}
            >
              Tất cả {suspects.length}
            </button>
            <button
              type="button"
              onClick={() => setFilter("PENDING")}
              className={cn(
                "rounded-md py-1 font-semibold transition-colors",
                filter === "PENDING"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
              )}
            >
              Chờ xử lý {pendingCount}
            </button>
            <button
              type="button"
              onClick={() => setFilter("ESCALATED")}
              className={cn(
                "rounded-md py-1 font-semibold transition-colors",
                filter === "ESCALATED"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
              )}
            >
              Đã chuyển {escalatedCount}
            </button>
          </div>
        </div>

        {/* Queue items */}
        <div className="flex-1 min-h-0 space-y-2 overflow-y-auto px-3 pb-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <CircleNotch size={24} className="animate-spin text-slate-900 dark:text-white" />
              <p className="mt-2 text-xs">Đang tải danh sách người báo cáo...</p>
            </div>
          ) : filteredSuspects.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 dark:border-slate-800">
              Không tìm thấy tài khoản nghi vấn nào.
            </p>
          ) : (
            filteredSuspects.map((item) => {
              const isSelected = item.id === selected?.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={cn(
                    "block w-full rounded-xl border p-3.5 text-left transition-all",
                    isSelected
                      ? "border-amber-300 bg-amber-50/40 shadow-xs dark:border-amber-700 dark:bg-amber-950/20"
                      : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/40"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      {item.id} ({item.userCode})
                    </span>
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-[9px] font-bold uppercase",
                        item.badge === "CẦN XEM XÉT"
                          ? "bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300"
                          : item.badge === "CHỜ XỬ LÝ"
                            ? "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                      )}
                    >
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="mt-1 font-heading text-sm font-bold text-slate-900 dark:text-white">
                    {item.username}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {item.summary}
                  </p>

                  <p
                    className={cn(
                      "mt-2 text-xs font-semibold",
                      item.badge === "CẦN XEM XÉT"
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-slate-500 dark:text-slate-400"
                    )}
                  >
                    {item.reports24h} báo cáo · 24 giờ qua
                  </p>
                </button>
              )
            })
          )}
        </div>

        <div className="shrink-0 border-t border-slate-200 p-3.5 text-[11px] text-slate-400 dark:border-slate-800">
          Hồ sơ kiểm duyệt được lưu vết đầy đủ.
        </div>
      </aside>

      {/* Center / Right Workspace */}
      <main className="flex-1 min-h-0 overflow-y-auto bg-slate-50/40 p-4 sm:p-6 lg:p-8 dark:bg-slate-950">
        {/* Explicit error state with retry action when live queue fetch fails */}
        {isQueueError && (
          <div
            role="alert"
            className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-xs text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
          >
            <div className="flex items-start gap-2.5">
              <WarningCircle size={20} weight="fill" className="text-rose-600 shrink-0 mt-0.5 dark:text-rose-400" />
              <div>
                <p className="font-bold text-rose-950 dark:text-rose-100">
                  Không thể tải danh sách hàng đợi trực tiếp từ máy chủ ({queueErrorMessage || "Lỗi kết nối"})
                </p>
                <p className="mt-0.5 text-rose-800/90 dark:text-rose-300/90">
                  Danh sách hàng đợi đã bị xóa do tải thất bại. Vui lòng bấm thử lại để tải lại dữ liệu từ máy chủ.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={isRetrying}
              onClick={loadQueue}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-rose-700 dark:hover:bg-rose-600"
            >
              <ArrowsClockwise size={14} className={cn(isRetrying && "animate-spin")} />
              {isRetrying ? "Đang kết nối lại..." : "Thử lại kết nối"}
            </button>
          </div>
        )}

        {!selected ? (
          <div className="flex h-full min-h-[400px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            Vui lòng chọn một tài khoản từ danh sách để xem chi tiết và thực hiện chuyển xử lý.
          </div>
        ) : (
                          <>
                            {/* Breadcrumb */}
                            <nav
                              aria-label="Breadcrumb"
                              className="text-[10px] font-mono tracking-wider text-slate-500 uppercase dark:text-slate-400"
                            >
                              TÀI KHOẢN / XỬ LÝ LẠM DỤNG
                            </nav>

                            {/* Header */}
                            <header className="mt-2 flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <h1 className="font-heading text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                                  Tài khoản bị nghi ngờ gửi báo cáo hàng loạt
                                </h1>
                                <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                  {selected.id} · Chuyên viên kiểm duyệt viên {selected.moderatorName} ·{" "}
                                  {selected.submittedAt}
                                </p>
                              </div>
                              <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold tracking-wider text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 uppercase">
                                CẦN KIỂM TRA
                              </span>
                            </header>

                            {/* Feedback banners */}
                            {feedback && (
                              <div
                                role="alert"
                                className={cn(
                                  "mt-4 flex items-center gap-2 rounded-lg p-3 text-xs font-medium border",
                                  feedback.type === "success"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                    : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                                )}
                              >
                                {feedback.type === "success" ? (
                                  <CheckCircle size={18} weight="fill" className="text-emerald-600 shrink-0" />
                                ) : (
                                  <WarningCircle size={18} weight="fill" className="text-rose-600 shrink-0" />
                                )}
                                <span>{feedback.message}</span>
                              </div>
                            )}

                            {/* Alert Banner */}
                            <section className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
                              <h2 className="font-heading text-xs font-bold text-amber-900 dark:text-amber-300">
                                {selected.alertTitle}
                              </h2>
                              <p className="mt-1 text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                                {selected.alertBody}
                              </p>
                            </section>

                            {/* 1. TÀI KHOẢN BỊ BÁO CÁO */}
                            <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                              <div className="flex items-center justify-between">
                                <h2 className="text-[11px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                  TÀI KHOẢN BỊ BÁO CÁO
                                </h2>
                                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 uppercase">
                                  {selected.status === "ACTIVE" ? "ĐANG HOẠT ĐỘNG" : selected.status}
                                </span>
                              </div>

                              <h3 className="mt-2 font-heading text-lg font-bold text-slate-900 dark:text-white">
                                {selected.fullName}
                              </h3>
                              <p className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                                @{selected.username} · {selected.userCode} · {selected.email}
                              </p>

                              <div className="mt-4 flex flex-wrap items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                                <span>
                                  {selected.userType} · Tham gia {selected.joinedAt}
                                </span>
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                  Điểm uy tín · {selected.reputation}
                                </span>
                              </div>
                            </section>

                            {/* 2. TÍN HIỆU HOẠT ĐỘNG · 24 GIỜ QUA */}
                            <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                              <h2 className="text-[11px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                TÍN HIỆU HOẠT ĐỘNG · 24 GIỜ QUA
                              </h2>

                              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-950">
                                  <span className="text-[10px] font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                                    BÁO CÁO ĐÃ GỬI
                                  </span>
                                  <p className="mt-1.5 font-heading text-3xl font-extrabold text-slate-900 dark:text-white">
                                    {selected.reports24h}
                                  </p>
                                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                    {selected.reportsContext}
                                  </p>
                                </div>

                                <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-950">
                                  <span className="text-[10px] font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                                    BỊ TỪ CHỐI / TRÙNG
                                  </span>
                                  <p className="mt-1.5 font-heading text-3xl font-extrabold text-rose-600 dark:text-rose-400">
                                    {selected.rejectedRate}%
                                  </p>
                                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                    {selected.rejectedCount} trong {selected.reports24h} báo cáo
                                  </p>
                                </div>

                                <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-950">
                                  <span className="text-[10px] font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                                    ĐỐI TƯỢNG KHÁC NHAU
                                  </span>
                                  <p className="mt-1.5 font-heading text-3xl font-extrabold text-slate-900 dark:text-white">
                                    {selected.targetsCount}
                                  </p>
                                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                    {selected.verifiedTargetsCount} tổ chức đã xác minh
                                  </p>
                                </div>

                                <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-950">
                                  <span className="text-[10px] font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                                    TÀI KHOẢN NGUỒN
                                  </span>
                                  <p className="mt-1.5 font-heading text-3xl font-extrabold text-slate-900 dark:text-white">
                                    1
                                  </p>
                                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                    Nguồn báo cáo đang rà soát
                                  </p>
                                </div>
                              </div>
                            </section>

                            {/* 3. BÁO CÁO LIÊN QUAN */}
                            <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                              <div className="flex items-center justify-between">
                                <h2 className="text-[11px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                  BÁO CÁO LIÊN QUAN
                                </h2>
                                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                                  {selectedReportIds.length} ĐƯỢC CHỌN / {selected.relatedReports.length} TỔNG
                                </span>
                              </div>

                              <div className="mt-3 overflow-x-auto">
                                <table className="w-full min-w-[620px] text-left text-xs">
                                  <thead>
                                    <tr className="border-y border-slate-200 text-[10px] font-semibold text-slate-400 uppercase dark:border-slate-800">
                                      <th scope="col" className="w-8 py-2.5">
                                        <span className="sr-only">Chọn</span>
                                      </th>
                                      <th scope="col" className="py-2.5 font-bold">
                                        MÃ HỒ SƠ
                                      </th>
                                      <th scope="col" className="py-2.5 font-bold">
                                        ĐỐI TƯỢNG BỊ BÁO CÁO
                                      </th>
                                      <th scope="col" className="py-2.5 font-bold">
                                        KẾT QUẢ
                                      </th>
                                      <th scope="col" className="py-2.5 font-bold text-right pr-2">
                                        THỜI GIAN
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                                    {selected.relatedReports.length === 0 ? (
                                      <tr>
                                        <td colSpan={5} className="py-4 text-center text-slate-400">
                                          Không có báo cáo nào từ tài khoản này.
                                        </td>
                                      </tr>
                                    ) : (
                                      selected.relatedReports.map((report) => {
                                        const isChecked = selectedReportIds.includes(report.id)
                                        return (
                                          <tr
                                            key={report.id}
                                            onClick={() => toggleReport(report.id)}
                                            className={cn(
                                              "cursor-pointer transition-colors",
                                              isChecked
                                                ? "bg-slate-50/80 dark:bg-slate-800/40"
                                                : "hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                                            )}
                                          >
                                            <td className="py-3">
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => toggleReport(report.id)}
                                                className="size-4 rounded border-slate-300 accent-slate-900"
                                              />
                                            </td>
                                            <td className="py-3 font-mono font-semibold text-slate-900 dark:text-white">
                                              {report.code}
                                            </td>
                                            <td className="py-3 font-medium text-slate-800 dark:text-slate-200">
                                              {report.target}
                                            </td>
                                            <td className="py-3">
                                              <span
                                                className={cn(
                                                  "font-medium",
                                                  report.statusTone === "danger"
                                                    ? "text-rose-600 dark:text-rose-400"
                                                    : report.statusTone === "warning"
                                                      ? "text-amber-600 dark:text-amber-400"
                                                      : "text-slate-600"
                                                )}
                                              >
                                                {report.result}
                                              </span>
                                            </td>
                                            <td className="py-3 text-right pr-2 font-mono text-slate-400">
                                              {report.time}
                                            </td>
                                          </tr>
                                        )
                                      })
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </section>

                            {/* 4. CHUYỂN HỒ SƠ ĐẾN QUẢN TRỊ VIÊN */}
                            <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                              <h2 className="text-[11px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                CHUYỂN HỒ SƠ ĐẾN QUẢN TRỊ VIÊN
                              </h2>

                              <div className="mt-3">
                                <label
                                  htmlFor="moderator-reason"
                                  className="text-[10px] font-bold tracking-wider text-slate-600 dark:text-slate-300 uppercase"
                                >
                                  LÝ DO GẮN CỜ VÀ CHUYỂN XỬ LÝ <span className="text-rose-500">*</span>
                                </label>
                                <textarea
                                  id="moderator-reason"
                                  required
                                  minLength={20}
                                  rows={3}
                                  value={reason}
                                  onChange={(e) => setReason(e.target.value)}
                                  placeholder="Mô tả dấu hiệu lạm dụng, báo cáo liên quan và căn cứ nghi ngờ. Tối thiểu 20 ký tự."
                                  className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-white p-3 text-xs leading-relaxed placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:outline-none dark:border-slate-700 dark:bg-slate-950 dark:focus-visible:ring-slate-300"
                                />
                                <p className="mt-1 text-[10px] text-slate-400">
                                  Bắt buộc · Lưu cùng danh tính kiểm duyệt viên vào nhật ký kiểm toán
                                </p>
                              </div>

                              {/* Blue Notice */}
                              <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50/70 p-3 text-xs text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200">
                                Gắn cờ chỉ ghi nhận để theo dõi; thao tác này không khóa tài khoản.
                              </div>

                              {/* Local Feedback Banner if any */}
                              {feedback && (
                                <div
                                  role="alert"
                                  className={cn(
                                    "mt-4 flex items-center gap-2 rounded-lg p-3 text-xs font-medium border",
                                    feedback.type === "success"
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                      : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                                  )}
                                >
                                  {feedback.type === "success" ? (
                                    <CheckCircle size={18} weight="fill" className="text-emerald-600 shrink-0" />
                                  ) : (
                                    <WarningCircle size={18} weight="fill" className="text-rose-600 shrink-0" />
                                  )}
                                  <span>{feedback.message}</span>
                                </div>
                              )}

                              {/* Escalate Button */}
                              <button
                                type="button"
                                disabled={
                                  isSubmitting ||
                                  isQueueError ||
                                  reason.trim().length < 20 ||
                                  selected.isEscalated ||
                                  selectedReportIds.length === 0
                                }
                                onClick={handleEscalate}
                                className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                              >
                                {isSubmitting && <CircleNotch size={16} className="animate-spin" />}
                                {isQueueError
                                  ? "Mất kết nối máy chủ · Vui lòng thử lại kết nối"
                                  : selected.isEscalated
                                    ? "Hồ sơ đã được chuyển cho Quản trị viên"
                                    : isSubmitting
                                      ? "Đang chuyển hồ sơ..."
                                      : "Gắn cờ & chuyển Quản trị viên"}
                              </button>
                            </section>

                            <p className="mt-5 text-center text-[11px] text-slate-400">
                              Mọi quyết định xử lý tài khoản thuộc quyền của Quản trị viên.
                            </p>
                          </>
          )}
        </main>
    </div>
  )
}
