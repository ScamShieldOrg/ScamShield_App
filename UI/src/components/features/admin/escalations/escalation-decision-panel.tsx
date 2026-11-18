import { useState, type FormEvent } from "react"
import { CheckCircle, CircleNotch } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import {
  ABUSE_DECISION_OPTIONS,
  type AbuseEscalationDecision,
} from "@/features/admin/services/admin-abuse-escalations"

export function EscalationDecisionPanel({
  caseId,
  status,
  userStatus,
  isSubmitting,
  onSubmit,
}: {
  caseId: number | null
  status: string | null
  userStatus?: string | null
  isSubmitting?: boolean
  onSubmit: (decision: AbuseEscalationDecision, reason: string) => Promise<void> | void
}) {
  const [decision, setDecision] = useState<AbuseEscalationDecision | null>(null)
  const [reason, setReason] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const isPending = status === "PENDING"
  const isBanned = userStatus?.toUpperCase() === "BANNED"
  const valid = decision !== null && reason.trim().length >= 20

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!decision || !valid || !isPending || isSubmitting) return
    await onSubmit(decision, reason.trim())
    setSubmitted(true)
  }

  return (
    <section
      className="min-w-0 self-start rounded-lg border border-border bg-card p-4 shadow-xs"
      aria-labelledby="decision-heading"
    >
      <h2 id="decision-heading" className="font-heading text-base font-bold text-foreground">
        Quyết định của Quản trị viên
      </h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Chọn một hướng xử lý. Trạng thái tài khoản chỉ đổi khi tạm khóa hoặc cấm.
      </p>

      {submitted && (
        <p
          role="status"
          className="mt-4 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
        >
          <CheckCircle size={16} weight="fill" className="shrink-0 mt-0.5" aria-hidden="true" />
          <span>Đã lưu quyết định xử lý cho hồ sơ ESC-{String(caseId).padStart(4, "0")}.</span>
        </p>
      )}

      {!isPending && !submitted && status && (
        <p
          role="status"
          className="mt-4 rounded-md bg-muted p-3 text-xs text-muted-foreground"
        >
          Hồ sơ này đã có quyết định xử lý ({status === "OPEN" ? "ĐANG THEO DÕI" : "ĐÃ ĐÓNG"}).
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 border-t border-border pt-3">
        <fieldset disabled={!isPending || isSubmitting || !caseId}>
          <legend className="sr-only">Hướng xử lý tài khoản</legend>
          <div className="space-y-2">
            {ABUSE_DECISION_OPTIONS.map((option) => {
              const isChecked = decision === option.value
              // Don't allow downgrade from BANNED to SUSPEND
              const optionDisabled = isBanned && option.value === "SUSPEND"
              return (
                <label
                  key={option.value}
                  className={cn(
                    "flex min-h-14 cursor-pointer gap-3 rounded-lg border p-3 transition-colors",
                    isChecked
                      ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-xs"
                      : "border-border hover:bg-muted/40",
                    (!isPending || isSubmitting || optionDisabled) &&
                      "cursor-not-allowed opacity-60"
                  )}
                >
                  <input
                    type="radio"
                    name={`decision-${caseId}`}
                    value={option.value}
                    disabled={optionDisabled}
                    checked={isChecked}
                    onChange={() => setDecision(option.value)}
                    className="mt-0.5 size-4 accent-primary text-primary focus:ring-primary"
                  />
                  <span>
                    <span className="block font-heading text-xs font-bold text-foreground">
                      {option.label}
                      {optionDisabled && (
                        <span className="ml-2 text-[10px] font-normal text-destructive">
                          (Không áp dụng cho tài khoản đã cấm)
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <label
                htmlFor={`decision-reason-${caseId}`}
                className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase"
              >
                LÝ DO QUYẾT ĐỊNH <span className="text-destructive" aria-hidden="true">*</span>
              </label>
              {reason.trim().length > 0 && reason.trim().length < 20 && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400">
                  Còn thiếu {20 - reason.trim().length} ký tự
                </span>
              )}
            </div>
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
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              Bắt buộc với mọi quyết định · Lưu vào nhật ký kiểm toán
            </p>
          </div>

          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900/60 dark:bg-amber-950/20">
            <p className="text-[10px] font-bold tracking-wider text-amber-800 dark:text-amber-300 uppercase">
              GẮN CỜ KHÔNG ĐỒNG NGHĨA VỚI KHÓA TÀI KHOẢN
            </p>
            <p className="mt-1 text-[11px] leading-4 text-amber-900/90 dark:text-amber-200/90">
              Gắn cờ chỉ ghi nhận dấu hiệu để theo dõi. Tạm khóa hoặc cấm sẽ hạn chế quyền truy cập.
            </p>
            <p className="mt-2 border-t border-amber-200/60 pt-1.5 text-[10px] text-muted-foreground">
              Nhật ký lưu quyết định, Quản trị viên, lý do và thời điểm.
            </p>
          </div>

          <button
            type="submit"
            disabled={!valid || !isPending || isSubmitting || !caseId}
            className="mt-5 flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
          >
            {isSubmitting && <CircleNotch size={14} className="animate-spin" />}
            {isSubmitting
              ? "Đang lưu quyết định..."
              : valid
              ? "Xác nhận quyết định"
              : "Chọn hướng xử lý để tiếp tục"}
          </button>
        </fieldset>
      </form>
    </section>
  )
}
