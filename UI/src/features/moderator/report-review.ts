import { reportStatusClasses } from "@/features/report/utils/report-status"
import type {
  ModeratorReportItem,
  QueueItemStatus,
} from "./types/moderator.types"
export const reportStatusLabel: Record<QueueItemStatus, string> = {
  Pending: "Chờ duyệt",
  "In Review": "Đang duyệt",
  Approved: "Đã phê duyệt",
  Rejected: "Đã từ chối",
  Withdrawn: "Đã thu hồi",
}
export const reportStatusClass: Record<QueueItemStatus, string> = {
  Pending: reportStatusClasses.PENDING,
  "In Review": reportStatusClasses.IN_REVIEW,
  Approved: reportStatusClasses.APPROVED,
  Rejected: reportStatusClasses.REJECTED,
  Withdrawn: reportStatusClasses.WITHDRAWN,
}
export function ownsReportReview(item: ModeratorReportItem): boolean {
  return item.status === "In Review" && item.canReview === true
}
export function safeEvidenceUrl(value?: string): string | undefined {
  try {
    const url = new URL(value ?? "")
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined
  } catch {
    return undefined
  }
}
export function reportTargetTypeLabel(type?: string): string {
  return (
    (
      {
        PHONE: "Số điện thoại",
        URL: "Đường dẫn / Website",
        BANK_ACCOUNT: "Tài khoản ngân hàng",
      } as Record<string, string>
    )[type ?? ""] ?? "Chưa xác định loại"
  )
}
