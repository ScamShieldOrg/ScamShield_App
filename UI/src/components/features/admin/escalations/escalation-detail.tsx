import { CircleNotch } from "@phosphor-icons/react"
import {
  type AdminAbuseEscalationDetail,
  formatDate,
  formatDateTime,
  formatFlagTypeAlert,
  formatUserStatus,
} from "@/features/admin/services/admin-abuse-escalations"

function MetricCard({
  label,
  value,
  context,
  tone,
}: {
  label: string
  value: string
  context: string
  tone?: "danger" | "warning"
}) {
  return (
    <div className="rounded-lg bg-muted/40 p-3.5 border border-border/50">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p
        className={`mt-1 font-heading text-2xl sm:text-3xl font-extrabold tracking-tight ${
          tone === "danger"
            ? "text-destructive"
            : tone === "warning"
            ? "text-amber-700 dark:text-amber-400"
            : "text-foreground"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">{context}</p>
    </div>
  )
}

export function EscalationDetail({
  detail,
  isLoading,
}: {
  detail: AdminAbuseEscalationDetail | null
  isLoading?: boolean
}) {
  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-xl border border-border bg-card p-8">
        <CircleNotch size={28} className="animate-spin text-primary" />
        <span className="ml-3 text-xs text-muted-foreground">Đang tải chi tiết hồ sơ...</span>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="flex h-96 items-center justify-center rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
        Vui lòng chọn một hồ sơ từ danh sách bên trái để xem chi tiết.
      </div>
    )
  }

  const { escalation, accountDetails, activity, reports } = detail
  const alertInfo = formatFlagTypeAlert(escalation.flagType)

  const reportsCount = reports?.length || 0
  const useActivityWindow = activity.totalReports > 0 && activity.totalReports >= reportsCount

  const totalReportsCount = useActivityWindow ? activity.totalReports : reportsCount
  const rejectedReportsCount = useActivityWindow
    ? activity.rejectedReports
    : reports?.filter(
        (r) =>
          r.status === "REJECTED" ||
          r.status === "WITHDRAWN" ||
          r.latestModeration?.action === "REJECT" ||
          Boolean(r.latestModeration?.reason)
      ).length || 0

  const distinctTargetsCount = useActivityWindow
    ? activity.distinctIndicators
    : new Set(reports?.map((r) => r.targetValue || r.indicatorId).filter(Boolean)).size ||
      reportsCount

  const rejectionRate =
    useActivityWindow &&
    activity.rejectedPercentage !== null &&
    activity.rejectedPercentage !== undefined
      ? Math.round(Number(activity.rejectedPercentage))
      : totalReportsCount > 0
      ? Math.round((rejectedReportsCount / totalReportsCount) * 100)
      : 0

  return (
    <div className="min-w-0 space-y-4">
      {/* Alert banner */}
      <section
        className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900/80 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200"
        aria-labelledby="escalation-alert-heading"
      >
        <h2
          id="escalation-alert-heading"
          className="font-heading text-sm font-bold text-amber-900 dark:text-amber-300"
        >
          {alertInfo.title}
        </h2>
        <p className="mt-1 text-xs leading-5 text-amber-900/90 dark:text-amber-200/90">
          {alertInfo.description}
        </p>
      </section>

      {/* Tài khoản bị xem xét */}
      <section
        className="rounded-lg border border-border bg-card p-4 shadow-xs"
        aria-labelledby="account-heading"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="account-heading" className="font-heading text-sm font-bold text-foreground">
            Tài khoản bị xem xét
          </h2>
          <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
            {formatUserStatus(escalation.userStatus)}
          </span>
        </div>
        <p className="mt-2 font-heading text-lg font-bold tracking-tight text-foreground">
          {escalation.fullName}
        </p>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
          {escalation.userCode || `U-${String(escalation.userId).padStart(5, "0")}`} · {escalation.email}
        </p>
        <div className="mt-3.5 flex flex-wrap justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
          <span>Tham gia ngày {formatDate(accountDetails?.joinedAt)}</span>
          <span>Điểm uy tín · {accountDetails?.reputationPoints ?? "—"}</span>
        </div>
      </section>

      {/* Hoạt động gửi báo cáo */}
      <section
        className="rounded-lg border border-border bg-card p-4 shadow-xs"
        aria-labelledby="signals-heading"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="signals-heading" className="font-heading text-sm font-bold text-foreground">
            Hoạt động gửi báo cáo
          </h2>
          <span className="font-mono text-[10px] font-semibold tracking-wider text-muted-foreground">
            {useActivityWindow ? "24 GIỜ QUA" : "TỔNG HỢP HỒ SƠ"}
          </span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <MetricCard
            label="Báo cáo đã gửi"
            value={String(totalReportsCount)}
            context={useActivityWindow ? "Trong 24 giờ qua" : `${totalReportsCount} báo cáo trong hệ thống`}
            tone="danger"
          />
          <MetricCard
            label="Bị từ chối / trùng lặp"
            value={`${rejectionRate}%`}
            context={`${rejectedReportsCount}/${totalReportsCount} báo cáo`}
            tone="warning"
          />
          <MetricCard
            label="Đối tượng khác nhau"
            value={String(distinctTargetsCount)}
            context={`${distinctTargetsCount} đối tượng`}
          />
        </div>
      </section>

      {/* Bằng chứng báo cáo liên quan */}
      <section
        className="rounded-lg border border-border bg-card p-4 shadow-xs"
        aria-labelledby="evidence-heading"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="evidence-heading" className="font-heading text-sm font-bold text-foreground">
            Bằng chứng báo cáo liên quan
          </h2>
          <span className="font-mono text-[10px] text-muted-foreground">
            {reportsCount}/{Math.max(reportsCount, totalReportsCount)} báo cáo liên quan
          </span>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-xs">
            <thead className="border-y border-border text-[10px] tracking-wider text-muted-foreground uppercase">
              <tr>
                <th scope="col" className="w-32 py-2.5 font-semibold">
                  MÃ BÁO CÁO
                </th>
                <th scope="col" className="py-2.5 font-semibold">
                  ĐỐI TƯỢNG
                </th>
                <th scope="col" className="w-64 py-2.5 font-semibold">
                  KẾT QUẢ DUYỆT
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {reports && reports.length > 0 ? (
                reports.map((report) => {
                  const modResult = report.latestModeration?.reason
                    ? `Từ chối: ${report.latestModeration.reason}`
                    : report.status === "REJECTED"
                    ? "Từ chối"
                    : report.status === "APPROVED"
                    ? "Đã xác nhận"
                    : report.status || "Chờ xử lý"
                  return (
                    <tr key={report.id} className="hover:bg-muted/30 transition-colors">
                      <th scope="row" className="py-3 font-mono font-medium text-foreground">
                        {report.reportCode || `RPT-${report.id}`}
                      </th>
                      <td className="py-3 pr-3 text-foreground/90 font-medium">
                        {report.targetValue || "Đối tượng báo cáo"}
                      </td>
                      <td className="py-3">
                        <span
                          className={`font-medium ${
                            report.status === "REJECTED"
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-muted-foreground"
                          }`}
                        >
                          {modResult}
                        </span>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-muted-foreground">
                    Không có báo cáo liên quan đính kèm.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Nội dung kiểm duyệt viên chuyển */}
      <section
        className="rounded-lg border border-border bg-card p-4 shadow-xs"
        aria-labelledby="handoff-heading"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="handoff-heading" className="font-heading text-sm font-bold text-foreground">
            Nội dung kiểm duyệt viên chuyển
          </h2>
          <span className="rounded-full bg-muted border border-border px-2.5 py-0.5 text-[9px] font-bold tracking-wider text-muted-foreground uppercase">
            CHUYỂN ADMIN XEM XÉT
          </span>
        </div>
        <blockquote className="mt-3 rounded-md bg-muted/30 p-3.5 border-l-2 border-primary text-xs leading-relaxed text-foreground font-medium">
          “{escalation.reason}”
        </blockquote>
        <p className="mt-3 font-mono text-[10px] text-muted-foreground">
          {escalation.createdByName || "Kiểm duyệt viên"} · Kiểm duyệt viên ·{" "}
          {formatDateTime(escalation.createdAt)}
        </p>
      </section>
    </div>
  )
}
