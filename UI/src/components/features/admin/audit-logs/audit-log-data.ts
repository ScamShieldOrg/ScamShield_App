export interface AuditLogEntry {
  id: number
  actorUserId: number | null
  actorName: string | null
  action: string
  entityType: string
  entityId: number | null
  previousValue: string | null
  newValue: string | null
  reason: string
  createdAt: string
}

export const ACTION_LABELS: Record<string, string> = {
  UPDATE_ROLE: "Thay đổi vai trò",
  UPDATE_STATUS: "Thay đổi trạng thái tài khoản",
  MODERATION_APPROVE: "Duyệt báo cáo",
  MODERATION_REJECT: "Từ chối báo cáo",
  IN_REVIEW: "Tiếp nhận kiểm duyệt",
  CREATE_ABUSE_ESCALATION: "Tạo hồ sơ lạm dụng",
  DECIDE_ABUSE_ESCALATION_DISMISS: "Bác bỏ nghi vấn lạm dụng",
  REVIEW_PARTNER_REGISTRATION: "Thẩm định đăng ký đối tác",
  CREATE_SCAM_CATEGORY: "Tạo phân loại lừa đảo",
  UPDATE_SCAM_CATEGORY: "Cập nhật phân loại lừa đảo",
  WITHDRAW_OWN_REPORT: "Thu hồi báo cáo",
  VERIFY_PARTNER_SUBMISSION: "Xác minh cảnh báo đối tác",
}

export const ENTITY_LABELS: Record<string, string> = {
  USER: "Tài khoản",
  REPORT: "Báo cáo",
  ABUSE_FLAG: "Hồ sơ lạm dụng",
  PARTNER_PROFILE: "Hồ sơ đối tác",
  SCAM_CATEGORY: "Phân loại lừa đảo",
  PARTNER_OFFICIAL_ALERT: "Cảnh báo đối tác",
}

const examples = [
  [
    "UPDATE_ROLE",
    "USER",
    "REGISTERED_USER",
    "MODERATOR",
    "Phân công kiểm duyệt viên phụ trách tiếp nhận và xác minh báo cáo mới.",
  ],
  [
    "UPDATE_STATUS",
    "USER",
    "ACTIVE",
    "SUSPENDED",
    "Tạm khóa tài khoản sau khi đối chiếu chuỗi báo cáo trùng lặp. Các bằng chứng đã được kiểm tra, tài khoản đã nhận thông báo yêu cầu bổ sung thông tin nhưng tiếp tục gửi nội dung thiếu căn cứ. Quản trị viên sẽ xem xét mở lại sau khi nhận được giải trình phù hợp.",
  ],
  [
    "MODERATION_APPROVE",
    "REPORT",
    "IN_REVIEW",
    "APPROVED",
    "Đã xác minh chứng cứ mạo danh ngân hàng và đường dẫn thu thập mã OTP.",
  ],
  [
    "MODERATION_REJECT",
    "REPORT",
    "IN_REVIEW",
    "REJECTED",
    "Chứng cứ chưa đủ để xác nhận hành vi lừa đảo; đã hướng dẫn bổ sung.",
  ],
  [
    "IN_REVIEW",
    "REPORT",
    "PENDING",
    "IN_REVIEW",
    "Tiếp nhận báo cáo để kiểm tra nội dung và bằng chứng đính kèm.",
  ],
  [
    "CREATE_ABUSE_ESCALATION",
    "ABUSE_FLAG",
    null,
    "PENDING",
    "Chuyển hồ sơ nghi vấn lạm dụng để quản trị viên đánh giá.",
  ],
  [
    "DECIDE_ABUSE_ESCALATION_DISMISS",
    "ABUSE_FLAG",
    "PENDING",
    "DISMISSED",
    "Không xác nhận hành vi lạm dụng sau khi đối chiếu báo cáo liên quan.",
  ],
  [
    "REVIEW_PARTNER_REGISTRATION",
    "PARTNER_PROFILE",
    "PENDING",
    "VERIFIED",
    "Đã đối chiếu giấy phép và thông tin pháp nhân do đối tác cung cấp.",
  ],
  [
    "CREATE_SCAM_CATEGORY",
    "SCAM_CATEGORY",
    null,
    '{"code":"GIA_DANH_NGAN_HANG","name":"Mạo danh ngân hàng","isActive":true}',
    "Bổ sung danh mục cho báo cáo mạo danh ngân hàng.",
  ],
  [
    "UPDATE_SCAM_CATEGORY",
    "SCAM_CATEGORY",
    '{"name":"Lừa đảo việc làm","isActive":true}',
    '{"name":"Lừa đảo việc làm, CTV","isActive":true}',
    "Cập nhật tên phân loại để bao quát thủ đoạn tuyển cộng tác viên.",
  ],
  [
    "WITHDRAW_OWN_REPORT",
    "REPORT",
    "PENDING",
    "WITHDRAWN",
    "Người gửi chủ động thu hồi để bổ sung bằng chứng trước kiểm duyệt.",
  ],
  [
    "VERIFY_PARTNER_SUBMISSION",
    "PARTNER_OFFICIAL_ALERT",
    "PENDING",
    "VERIFIED",
    "Đã xác minh cảnh báo mạo danh thương hiệu từ doanh nghiệp.",
  ],
] as const

// Fixed Vietnam-offset dates make sample ordering independent of the host clock.
export const AUDIT_LOGS: AuditLogEntry[] = Array.from(
  { length: 24 },
  (_, index) => {
    const [action, entityType, previousValue, newValue, reason] =
      examples[index % examples.length]
    return {
      id: 1001 + index,
      actorUserId: index === 3 ? null : (index % 3) + 1,
      actorName:
        index === 3
          ? null
          : ["Nguyễn Minh Anh", "Trần Mai Phương", "Lê Hoàng Nam"][index % 3],
      action: index === 23 ? "LEGACY_REVIEW_NOTE" : action,
      entityType,
      entityId: index === 23 ? null : 201 + index,
      previousValue: index === 23 ? null : previousValue,
      newValue: index === 23 ? null : newValue,
      reason,
      createdAt: `2026-11-${String(17 + Math.floor(index / 4)).padStart(2, "0")}T${index % 4 < 2 ? "00:00:00" : "23:59:59"}+07:00`,
    }
  }
)

export function actionLabel(action: string) {
  return ACTION_LABELS[action] ?? action
}
export function entityLabel(entity: string) {
  return ENTITY_LABELS[entity] ?? entity
}
export const UNKNOWN_ACTOR = "Không có thông tin người thực hiện"

export function formatAuditTime(timestamp: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(timestamp))
}

export function formatAuditValue(value: string | null) {
  if (value === null) return "Không có"
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}
