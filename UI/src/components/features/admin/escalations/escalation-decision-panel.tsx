import { useState, type FormEvent } from "react"
import { CheckCircle } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { decisionOptions, type Decision } from "./mock-escalations"

export function EscalationDecisionPanel({
  caseId,
  resolved,
  onSubmit,
}: {
  caseId: string
  resolved: boolean
  onSubmit: (decision: Decision, reason: string) => void
}) {
  const [decision, setDecision] = useState<Decision | null>(null)
  const [reason, setReason] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const valid = decision !== null && reason.trim().length >= 20

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!decision || !valid || resolved) return
    onSubmit(decision, reason.trim())
    setSubmitted(true)
  }

  return (
    <section
      className="min-w-0 self-start rounded-lg border border-border bg-card p-4"
      aria-labelledby="decision-heading"
    >
      <h2 id="decision-heading" className="font-heading text-base font-bold">
        Quyết định của Quản trị viên
      </h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Chọn một hướng xử lý. Trạng thái tài khoản chỉ đổi khi tạm khóa hoặc
        cấm.
      </p>
      {submitted && (
        <p
          role="status"
          className="mt-4 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
        >
          <CheckCircle size={16} weight="fill" aria-hidden="true" />
          Đã lưu quyết định minh họa cho {caseId} trong phiên này.
        </p>
      )}
      {resolved && !submitted && (
        <p
          role="status"
          className="mt-4 rounded-md bg-muted p-3 text-xs text-muted-foreground"
        >
          Hồ sơ này đã được xử lý.
        </p>
      )}
      <form
        onSubmit={handleSubmit}
        className="mt-5 border-t border-border pt-3"
      >
        <fieldset disabled={resolved}>
          <legend className="sr-only">Hướng xử lý tài khoản</legend>
          <div className="space-y-2">
            {decisionOptions.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex min-h-14 cursor-pointer gap-3 rounded-md border p-3 transition-colors",
                  decision === option.value
                    ? "border-ring bg-accent"
                    : "border-border hover:bg-muted/50",
                  resolved && "cursor-not-allowed opacity-60"
                )}
              >
                <input
                  type="radio"
                  name={`decision-${caseId}`}
                  value={option.value}
                  checked={decision === option.value}
                  onChange={() => setDecision(option.value)}
                  className="mt-0.5 size-4 accent-primary"
                />
                <span>
                  <span className="block font-heading text-xs font-bold">
                    {option.label}
                  </span>
                  <span className="mt-1 block text-[11px] leading-4 text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <div className="mt-5 border-t border-border pt-4">
            <label
              htmlFor={`decision-reason-${caseId}`}
              className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase"
            >
              Lý do quyết định <span aria-hidden="true">*</span>
            </label>
            <textarea
              id={`decision-reason-${caseId}`}
              required
              minLength={20}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ghi rõ nội dung đã xác minh và căn cứ cho quyết định. Tối thiểu 20 ký tự."
              rows={4}
              className="mt-2 w-full resize-y rounded-md border border-input bg-background p-3 text-xs leading-5 placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-[10px] font-bold tracking-wide text-amber-700 uppercase dark:text-amber-400">
              Gắn cờ không đồng nghĩa với khóa tài khoản
            </p>
            <p className="mt-2 text-xs leading-5">
              Gắn cờ chỉ ghi nhận dấu hiệu để theo dõi. Tạm khóa hoặc cấm sẽ hạn
              chế quyền truy cập.
            </p>
          </div>
          <button
            type="submit"
            disabled={!valid || resolved}
            className="mt-5 min-h-10 w-full rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
          >
            {valid ? "Lưu quyết định minh họa" : "Chọn hướng xử lý để tiếp tục"}
          </button>
        </fieldset>
      </form>
    </section>
  )
}
