import type { PartnerReviewStatus } from "@/features/admin/services/admin-partner-registrations"
import { cn } from "@/lib/utils"

const statusStyles: Record<
  PartnerReviewStatus,
  { label: string; className: string }
> = {
  VERIFIED: {
    label: "Đã phê duyệt",
    className:
      "bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0] dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
  },
  PENDING: {
    label: "Đang chờ",
    className:
      "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  },
  REJECTED: {
    label: "Đã từ chối",
    className:
      "bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0] dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  },
}

export function WhitelistStatusBadge({
  status,
  className,
}: {
  status: PartnerReviewStatus
  className?: string
}) {
  const config = statusStyles[status]

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
