import type { Escalation } from "./mock-escalations"

function Metric({
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
    <div className="rounded-md bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-1 font-heading text-2xl font-bold ${tone === "danger" ? "text-destructive" : tone === "warning" ? "text-amber-700 dark:text-amber-400" : "text-foreground"}`}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">{context}</p>
    </div>
  )
}

export function EscalationDetail({ item }: { item: Escalation }) {
  const rejectionRate = Math.round((item.rejected / item.reports) * 100)

  return (
    <div className="min-w-0 space-y-4">
      <section
        className="rounded-lg border border-amber-200 bg-amber-100/80 p-4 dark:border-amber-900 dark:bg-amber-950/30"
        aria-labelledby="escalation-alert-heading"
      >
        <h2
          id="escalation-alert-heading"
          className="font-heading text-sm font-bold text-amber-800 dark:text-amber-300"
        >
          {item.alert}
        </h2>
        <p className="mt-1 text-xs leading-5 text-foreground">
          Kiểm duyệt viên nghi ngờ tài khoản gửi nhiều báo cáo chất lượng thấp,
          nhắm đến nhiều đối tượng. Hãy xem lịch sử và bằng chứng trước khi
          quyết định.
        </p>
      </section>

      <section
        className="rounded-lg border border-border bg-card p-4"
        aria-labelledby="account-heading"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 id="account-heading" className="font-heading text-sm font-bold">
            Tài khoản bị xem xét
          </h2>
          <span className="rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300 px-3 py-1 text-[10px] font-semibold">
            ĐANG HOẠT ĐỘNG
          </span>
        </div>
        <p className="mt-2 font-heading text-lg font-bold">{item.name}</p>
        <p className="mt-1 font-mono text-xs break-all text-muted-foreground">
          {item.userId} · {item.email}
        </p>
        <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
          <span>Tham gia ngày {item.joinedAt}</span>
          <span>Điểm uy tín · {item.reputation}</span>
        </div>
      </section>

      <section
        className="rounded-lg border border-border bg-card p-4"
        aria-labelledby="signals-heading"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="signals-heading" className="font-heading text-sm font-bold">
            Hoạt động gửi báo cáo
          </h2>
          <span className="font-mono text-[10px] tracking-wide text-muted-foreground">
            24 GIỜ QUA
          </span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Metric
            label="Báo cáo đã gửi"
            value={String(item.reports)}
            context={item.reportContext}
            tone="danger"
          />
          <Metric
            label="Bị từ chối / trùng lặp"
            value={`${rejectionRate}%`}
            context={`${item.rejected}/${item.reports} báo cáo`}
            tone="warning"
          />
          <Metric
            label="Đối tượng khác nhau"
            value={String(item.targets)}
            context={`${item.verifiedTargets} tổ chức đã xác minh`}
          />
        </div>
      </section>

      <section
        className="rounded-lg border border-border bg-card p-4"
        aria-labelledby="evidence-heading"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="evidence-heading" className="font-heading text-sm font-bold">
            Bằng chứng báo cáo liên quan
          </h2>
          <span className="font-mono text-[10px] text-muted-foreground">
            {item.evidence.length}/{item.reports} báo cáo liên quan
          </span>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-xs">
            <thead className="border-y border-border text-[10px] tracking-wide text-muted-foreground uppercase">
              <tr>
                <th scope="col" className="w-28 py-2 font-semibold">
                  Mã báo cáo
                </th>
                <th scope="col" className="py-2 font-semibold">
                  Đối tượng
                </th>
                <th scope="col" className="w-56 py-2 font-semibold">
                  Kết quả duyệt
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {item.evidence.map((report) => (
                <tr key={report.id}>
                  <th scope="row" className="py-3 font-mono font-medium">
                    {report.id}
                  </th>
                  <td className="py-3 pr-3">{report.target}</td>
                  <td className="py-3 text-muted-foreground">
                    {report.result}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className="rounded-lg border border-border bg-card p-4"
        aria-labelledby="handoff-heading"
      >
        <div className="flex flex-wrap justify-between gap-2">
          <h2 id="handoff-heading" className="font-heading text-sm font-bold">
            Nội dung kiểm duyệt viên chuyển
          </h2>
        </div>
        <blockquote className="mt-3 text-xs leading-5">
          “{item.moderatorNote}”
        </blockquote>
        <p className="mt-3 font-mono text-[10px] text-muted-foreground">
          {item.moderator} · Kiểm duyệt viên · {item.submittedAt}
        </p>
      </section>
    </div>
  )
}
