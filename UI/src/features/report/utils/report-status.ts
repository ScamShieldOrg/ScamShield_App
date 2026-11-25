/**
 * Calm Authority status tokens (dot + 10-15% tint bg + 20-25% border + WCAG AA text).
 * Keeps `reportStatusClasses` export stable for all report views.
 */
export const reportStatusClasses: Record<string, string> = {
  PENDING:
    "border-amber-500/25 bg-amber-500/10 text-amber-900 dark:border-amber-400/25 dark:bg-amber-500/15 dark:text-amber-200",
  IN_REVIEW:
    "border-sky-500/25 bg-sky-500/10 text-sky-800 dark:border-sky-400/25 dark:bg-sky-500/15 dark:text-sky-200",
  APPROVED:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-500/15 dark:text-emerald-200",
  REJECTED:
    "border-rose-500/25 bg-rose-500/10 text-rose-800 dark:border-rose-400/25 dark:bg-rose-500/15 dark:text-rose-200",
  WITHDRAWN:
    "border-border bg-muted/60 text-muted-foreground dark:border-white/10 dark:bg-muted/40 dark:text-muted-foreground",
}

export const reportStatusDotClasses: Record<string, string> = {
  PENDING: "bg-amber-500 dark:bg-amber-400",
  IN_REVIEW: "bg-sky-500 dark:bg-sky-400",
  APPROVED: "bg-emerald-500 dark:bg-emerald-400",
  REJECTED: "bg-rose-500 dark:bg-rose-400",
  WITHDRAWN: "bg-muted-foreground/70",
}

export const reportStatusLabels: Record<string, string> = {
  PENDING: "Đang chờ duyệt",
  IN_REVIEW: "Đang kiểm duyệt",
  APPROVED: "Đã chấp nhận",
  REJECTED: "Bị từ chối",
  WITHDRAWN: "Đã thu hồi",
}
