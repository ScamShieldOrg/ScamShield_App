import type { AdminAccount } from "@/features/admin/services/admin-users"
import { cn } from "@/lib/utils"

const roleStyles = {
  BUSINESS_PARTNER: {
    label: "Đối tác doanh nghiệp",
    color: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  },
  REGISTERED_USER: {
    label: "Người dùng",
    color:
      "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  },
  MODERATOR: {
    label: "Kiểm duyệt viên",
    color: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  },
  ADMINISTRATOR: {
    label: "Quản trị viên",
    color:
      "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  },
}

export function AccountRoleBadge({
  role,
  label,
}: {
  role: AdminAccount["role"]
  label: string
}) {
  const style = roleStyles[role as keyof typeof roleStyles]
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-1 text-[11px] font-medium whitespace-nowrap",
        style?.color ?? "bg-muted text-muted-foreground"
      )}
    >
      {label || style?.label || role}
    </span>
  )
}

export function AccountStatusBadge({
  status,
  label,
  isFlagged,
}: {
  status: AdminAccount["status"]
  label: string
  isFlagged: boolean
}) {
  if (isFlagged) {
    return (
      <div className="flex flex-wrap gap-1">
        <span className="rounded-md bg-red-100 px-2 py-1 text-[11px] font-medium text-red-900 dark:bg-red-950 dark:text-red-200">
          {label || status} · Có cờ
        </span>
        <span className="rounded-md bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Cần kiểm tra
        </span>
      </div>
    )
  }
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-1 text-[11px] font-medium whitespace-nowrap",
        status === "ACTIVE"
          ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
          : "bg-muted text-muted-foreground"
      )}
    >
      {label || status}
    </span>
  )
}
