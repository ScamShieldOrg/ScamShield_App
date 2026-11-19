import { authorizeApi } from "@/lib/api/instance"
import axios from "axios"

export interface AdminAbuseEscalationItem {
  id: number
  escalationCode: string
  userId: number
  userCode: string
  fullName: string
  email: string
  userStatus: string
  createdByUserId: number | null
  createdByName: string | null
  flagType: string
  severity: string
  reason: string
  evidence: string | null
  status: "PENDING" | "DISMISSED" | "OPEN"
  reportIds: number[]
  createdAt: string
}

export interface AccountDetails {
  phoneNumber: string | null
  phoneVerified: boolean | null
  reputationPoints: number | null
  joinedAt: string | null
}

export interface ReportActivity {
  windowStart: string
  windowEnd: string
  totalReports: number
  rejectedReports: number
  distinctIndicators: number
  rejectedPercentage: number | null
}

export interface LatestModeration {
  id: number
  action: string
  reason: string
  moderatorUserId: number | null
  moderatorName: string | null
  createdAt: string
}

export interface ReportEvidenceItem {
  id: number
  evidenceType: string | null
  fileName: string | null
  fileUrl: string | null
  ocrText: string | null
  createdAt: string
}

export interface RelatedReportItem {
  id: number
  reportCode: string
  indicatorId: number | null
  targetType: string | null
  targetValue: string | null
  categoryId: number | null
  categoryName: string | null
  status: string
  description: string | null
  reportedMessage: string | null
  createdAt: string
  updatedAt: string
  latestModeration: LatestModeration | null
  evidences: ReportEvidenceItem[]
}

export interface AuditEntryItem {
  id: number
  actorUserId: number | null
  actorName: string | null
  action: string
  previousValue: string | null
  newValue: string | null
  reason: string | null
  createdAt: string
}

export interface AdminAbuseEscalationDetail {
  escalation: AdminAbuseEscalationItem
  accountDetails: AccountDetails
  activity: ReportActivity
  reports: RelatedReportItem[]
  auditTrail: AuditEntryItem[]
}

export interface PaginatedResponse<T> {
  data: T[]
  totalItems: number
  totalPages: number
  pageSize: number
  currentPage: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface ApiResponse<T> {
  isSuccess: boolean
  message: string
  data: T | null
}

export interface AdminAbuseFilterParams {
  status?: "PENDING" | "OPEN" | "DISMISSED" | "ALL"
  search?: string
  sort?: string
  page?: number
  size?: number
}

export type AbuseEscalationDecision = "DISMISS" | "FLAG" | "SUSPEND" | "BAN"

export interface DecideAbuseEscalationPayload {
  decision: AbuseEscalationDecision
  reason: string
}

export interface DecisionOption {
  value: AbuseEscalationDecision
  label: string
  description: string
}

export const ABUSE_DECISION_OPTIONS: DecisionOption[] = [
  {
    value: "DISMISS",
    label: "Bác bỏ báo cáo",
    description: "Không xử lý tài khoản; đóng hồ sơ",
  },
  {
    value: "FLAG",
    label: "Gắn cờ tài khoản",
    description: "Ghi nhận để theo dõi; tài khoản vẫn truy cập được",
  },
  {
    value: "SUSPEND",
    label: "Tạm khóa tài khoản",
    description: "Tạm thời chặn quyền truy cập nền tảng",
  },
  {
    value: "BAN",
    label: "Cấm tài khoản",
    description: "Chặn vĩnh viễn quyền truy cập nền tảng",
  },
]

export function formatDateTime(value?: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date)
}

export function formatDate(value?: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
  }).format(date)
}

export function formatUserStatus(status?: string | null): string {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
      return "ĐANG HOẠT ĐỘNG"
    case "SUSPENDED":
      return "TẠM KHÓA"
    case "BANNED":
      return "ĐÃ CẤM"
    case "INACTIVE":
      return "CHƯA KÍCH HOẠT"
    default:
      return status || "ĐANG HOẠT ĐỘNG"
  }
}

export function formatFlagTypeAlert(flagType?: string | null): {
  title: string
  description: string
} {
  switch (flagType?.toUpperCase()) {
    case "BULK_REPORTING":
      return {
        title: "Phát hiện gửi báo cáo hàng loạt",
        description:
          "Kiểm duyệt viên nghi ngờ tài khoản gửi nhiều báo cáo chất lượng thấp, nhắm đến nhiều đối tượng. Hãy xem lịch sử và bằng chứng trước khi quyết định.",
      }
    case "FALSE_REPORTING":
      return {
        title: "Phát hiện gửi báo cáo sai sự thật",
        description:
          "Kiểm duyệt viên nghi ngờ tài khoản cố ý gửi báo cáo không đúng sự thật nhằm hạ uy tín đối tượng. Hãy xem xét bằng chứng trước khi quyết định.",
      }
    case "SPAM":
      return {
        title: "Phát hiện hành vi spam báo cáo",
        description:
          "Kiểm duyệt viên ghi nhận tài khoản spam nhiều nội dung lặp lại trong thời gian ngắn.",
      }
    default:
      return {
        title: "Nghi vấn lạm dụng chức năng báo cáo",
        description:
          "Kiểm duyệt viên chuyển hồ sơ yêu cầu quản trị viên xem xét và chế tài đối với tài khoản này.",
      }
  }
}

export const adminAbuseEscalationService = {
  async getQueue(params?: AdminAbuseFilterParams): Promise<PaginatedResponse<AdminAbuseEscalationItem>> {
    try {
      const response = await authorizeApi.get<ApiResponse<PaginatedResponse<AdminAbuseEscalationItem>>>(
        "/admin/abuse-escalations",
        {
          params: {
            status: params?.status ?? "PENDING",
            search: params?.search || undefined,
            sort: params?.sort ?? "createdAt,desc",
            page: params?.page ?? 0,
            size: params?.size ?? 20,
          },
        }
      )
      if (!response.data.isSuccess || !response.data.data) {
        throw new Error(response.data.message || "Không thể tải danh sách hồ sơ lạm dụng.")
      }
      return response.data.data
    } catch (error) {
      if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
        throw new Error(error.response?.data?.message || "Không thể kết nối máy chủ.")
      }
      throw error
    }
  },

  async getDetail(id: number): Promise<AdminAbuseEscalationDetail> {
    try {
      const response = await authorizeApi.get<ApiResponse<AdminAbuseEscalationDetail>>(
        `/admin/abuse-escalations/${id}`
      )
      if (!response.data.isSuccess || !response.data.data) {
        throw new Error(response.data.message || "Không thể tải chi tiết hồ sơ.")
      }
      return response.data.data
    } catch (error) {
      if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
        throw new Error(error.response?.data?.message || "Không thể kết nối máy chủ.")
      }
      throw error
    }
  },

  async decide(id: number, payload: DecideAbuseEscalationPayload): Promise<AdminAbuseEscalationItem> {
    try {
      const response = await authorizeApi.put<ApiResponse<AdminAbuseEscalationItem>>(
        `/admin/abuse-escalations/${id}`,
        payload
      )
      if (!response.data.isSuccess || !response.data.data) {
        throw new Error(response.data.message || "Không thể lưu quyết định xử lý.")
      }
      return response.data.data
    } catch (error) {
      if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
        throw new Error(error.response?.data?.message || "Không thể lưu quyết định xử lý.")
      }
      throw error
    }
  },
}
