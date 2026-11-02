import { authorizeApi } from "@/lib/api/instance"
import {
  ModeratorReportItem,
  ModeratorReportFilterParams,
  ModeratorQueueCounts,
  ModerationDecisionPayload,
  BaseApiResponse,
  PaginatedResult,
} from "../types/moderator.types"
import axios from "axios"

export const MOCK_MODERATOR_QUEUE: ModeratorReportItem[] = [
  {
    id: "CS-2024-1891",
    rawId: 1891,
    targetIdentifier: "0909 123 456",
    category: "Lừa đảo ngân hàng / OTP Phishing",
    reportCount: 47,
    reportedBy: "nguyenthanh_vn",
    reportedAt: "15/01 14:32",
    priority: "URGENT",
    status: "Pending",
    aiScore: 94,
    aiRiskLevel: "SCAM-RISK",
    aiConfidence: "Rất cao (97%)",
    evidenceCompleteness: 85,
    reporterProposal: null,
    evidences: [
      { id: "ev-1", name: "screenshot_1.jpg", type: "image" },
      { id: "ev-2", name: "screenshot_2.jpg", type: "image" },
      { id: "ev-3", name: "recording.mp4", type: "video" },
    ],
    taxonomies: ["Lừa đảo ngân hàng / OTP Phishing"],
    isLocked: false,
  },
  {
    id: "CS-2024-1887",
    rawId: 1887,
    targetIdentifier: "vcb-secure-login.net",
    category: "Giả mạo website ngân hàng",
    reportCount: 128,
    reportedBy: "tran_minh_tech",
    reportedAt: "14/01 09:15",
    priority: "URGENT",
    status: "In Review",
    aiScore: 99,
    aiRiskLevel: "SCAM-RISK",
    aiConfidence: "Gần như tuyệt đối (99%)",
    evidenceCompleteness: 95,
    reporterProposal: "Đề xuất chặn DNS và gắn cờ khẩn cấp trên hệ thống ngân hàng liên minh",
    evidences: [
      { id: "ev-4", name: "phishing_form.png", type: "image" },
      { id: "ev-5", name: "ssl_spoof_detail.pdf", type: "pdf" },
    ],
    taxonomies: ["Giả mạo website ngân hàng", "Lừa đảo ngân hàng / OTP Phishing"],
    isLocked: false,
  },
  {
    id: "CS-2024-1880",
    rawId: 1880,
    targetIdentifier: "0356 789 012",
    category: "Lừa đảo việc làm lương cao",
    reportCount: 12,
    reportedBy: "hoangha_danang",
    reportedAt: "13/01 17:44",
    priority: "HIGH",
    status: "Pending",
    aiScore: 31,
    aiRiskLevel: "SUSPICIOUS",
    aiConfidence: "Trung bình (65%)",
    evidenceCompleteness: 30,
    reporterProposal: null,
    evidences: [
      { id: "ev-6", name: "telegram_chat.png", type: "image" },
    ],
    taxonomies: ["Lừa đảo việc làm lương cao"],
    isLocked: false,
  },
  {
    id: "CS-2024-1879",
    rawId: 1879,
    targetIdentifier: "1800 545 413",
    category: "Lừa đảo ngân hàng / OTP Phishing",
    reportCount: 89,
    reportedBy: "le_thi_mai",
    reportedAt: "13/01 08:30",
    priority: "URGENT",
    status: "Locked",
    aiScore: 78,
    aiRiskLevel: "SCAM-RISK",
    aiConfidence: "Cao (88%)",
    evidenceCompleteness: 60,
    reporterProposal: null,
    evidences: [
      { id: "ev-7", name: "sms_brandname_spoofed.png", type: "image" },
    ],
    taxonomies: ["Lừa đảo ngân hàng / OTP Phishing", "Smishing / SMS lừa đảo"],
    isLocked: true,
  },
  {
    id: "CS-2024-1872",
    rawId: 1872,
    targetIdentifier: "Tuyển dụng gấp 500k/ngày tại nhà",
    category: "Lừa đảo việc làm lương cao",
    reportCount: 34,
    reportedBy: "phamduc_hcm",
    reportedAt: "12/01 11:20",
    priority: "HIGH",
    status: "Pending",
    aiScore: 88,
    aiRiskLevel: "SCAM-RISK",
    aiConfidence: "Cao (91%)",
    evidenceCompleteness: 70,
    reporterProposal: null,
    evidences: [
      { id: "ev-8", name: "facebook_ad_proof.jpg", type: "image" },
      { id: "ev-9", name: "app_task_instructions.pdf", type: "pdf" },
    ],
    taxonomies: ["Lừa đảo việc làm lương cao", "Lừa đảo đầu tư / tài chính"],
    isLocked: false,
  },
  {
    id: "CS-2024-1865",
    rawId: 1865,
    targetIdentifier: "bidv.com.vn/dang-nhap",
    category: "Giả mạo website ngân hàng",
    reportCount: 142,
    reportedBy: "vcb_security_bot",
    reportedAt: "11/01 22:10",
    priority: "URGENT",
    status: "Locked",
    aiScore: 91,
    aiRiskLevel: "SCAM-RISK",
    aiConfidence: "Rất cao (95%)",
    evidenceCompleteness: 42,
    reporterProposal: "Khóa khẩn cấp và cảnh báo toàn mạng lưới liên ngân hàng",
    evidences: [
      { id: "ev-10", name: "domain_whois.txt", type: "pdf" },
    ],
    taxonomies: ["Giả mạo website ngân hàng"],
    isLocked: true,
  },
  {
    id: "CS-2024-1860",
    rawId: 1860,
    targetIdentifier: "1900 123 456",
    category: "Mạo danh công an / cơ quan nhà nước",
    reportCount: 89,
    reportedBy: "an_ninh_mang_hn",
    reportedAt: "11/01 08:05",
    priority: "NORMAL",
    status: "Approved",
    aiScore: 97,
    aiRiskLevel: "SCAM-RISK",
    aiConfidence: "Tuyệt đối (98%)",
    evidenceCompleteness: 80,
    reporterProposal: "Đã xác minh lệnh bắt giả mạo",
    evidences: [
      { id: "ev-11", name: "fake_warrant_letter.jpg", type: "image" },
    ],
    taxonomies: ["Mạo danh công an / cơ quan nhà nước", "Vishing / Cuộc gọi lừa đảo"],
    isLocked: false,
  },
]

const isMockFallbackEnabled = (): boolean => {
  return process.env.NEXT_PUBLIC_ENABLE_MODERATOR_MOCK === "true"
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data
    return data?.message || data?.error || fallback
  }
  return error instanceof Error ? error.message : fallback
}

export function parseReportNumericId(idOrCode: string | number): number {
  if (typeof idOrCode === "number") return idOrCode
  if (!idOrCode) return 0
  const parts = String(idOrCode).trim().split("-")
  const lastPart = parts[parts.length - 1]
  const cleaned = lastPart.replace(/\D/g, "")
  const parsed = Number(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * GET: Lấy danh sách hàng đợi xét duyệt báo cáo lừa đảo (phân trang + lọc theo tab, search, priority)
 */
export async function getModeratorReportQueue(
  params?: ModeratorReportFilterParams
): Promise<PaginatedResult<ModeratorReportItem>> {
  try {
    const queryParams: Record<string, unknown> = {
      page: params?.page ?? 0,
      size: params?.size ?? 20,
      tab: params?.tab || "ALL",
      sort: params?.sort || "createdAt,desc",
    }

    if (params?.search && params.search.trim()) {
      queryParams.search = params.search.trim()
    }
    if (params?.priority) {
      queryParams.priority = params.priority
    }

    const res = await authorizeApi.get<BaseApiResponse<PaginatedResult<ModeratorReportItem>>>(
      "/moderator/reports",
      { params: queryParams }
    )

    if (res.data?.isSuccess && res.data?.data) {
      return res.data.data
    }

    throw new Error(res.data?.message || "Không thể tải hàng đợi báo cáo")
  } catch (error) {
    console.error("Lỗi khi tải hàng đợi báo cáo từ backend:", error)
    if (isMockFallbackEnabled()) {
      const tab = params?.tab || "ALL"
      let list = [...MOCK_MODERATOR_QUEUE]
      if (tab === "PENDING") list = list.filter((i) => i.status === "Pending")
      if (tab === "IN_REVIEW") list = list.filter((i) => i.status === "In Review")
      if (tab === "LOCKED") list = list.filter((i) => i.isLocked || i.status === "Locked")

      if (params?.search && params.search.trim()) {
        const q = params.search.trim().toLowerCase()
        list = list.filter(
          (i) =>
            i.id.toLowerCase().includes(q) ||
            i.targetIdentifier.toLowerCase().includes(q) ||
            i.category.toLowerCase().includes(q) ||
            i.reportedBy.toLowerCase().includes(q)
        )
      }

      return {
        data: list,
        currentPage: 0,
        totalItems: list.length,
        totalPages: 1,
        pageSize: 20,
        hasNext: false,
        hasPrevious: false,
      }
    }

    throw new Error(
      extractErrorMessage(error, "Không thể tải hàng đợi báo cáo từ backend")
    )
  }
}

/**
 * GET: Lấy số lượng thống kê theo từng tab trong hàng đợi kiểm duyệt
 */
export async function getModeratorQueueCounts(): Promise<ModeratorQueueCounts> {
  try {
    const res = await authorizeApi.get<BaseApiResponse<ModeratorQueueCounts>>(
      "/moderator/reports/counts"
    )

    if (res.data?.isSuccess && res.data?.data) {
      return res.data.data
    }

    throw new Error(res.data?.message || "Không thể tải số lượng hàng đợi kiểm duyệt")
  } catch (error) {
    console.error("Lỗi khi tải số lượng hàng đợi kiểm duyệt:", error)
    if (isMockFallbackEnabled()) {
      return {
        all: MOCK_MODERATOR_QUEUE.length,
        pending: MOCK_MODERATOR_QUEUE.filter((i) => i.status === "Pending").length,
        inReview: MOCK_MODERATOR_QUEUE.filter((i) => i.status === "In Review").length,
        locked: MOCK_MODERATOR_QUEUE.filter((i) => i.isLocked || i.status === "Locked").length,
      }
    }

    throw new Error(
      extractErrorMessage(error, "Không thể tải số lượng hàng đợi kiểm duyệt từ backend")
    )
  }
}

/**
 * GET: Lấy thông tin chi tiết một ca báo cáo lừa đảo theo ID
 */
export async function getModeratorReportById(
  id: string | number
): Promise<ModeratorReportItem> {
  const numericId = parseReportNumericId(id)

  try {
    const res = await authorizeApi.get<BaseApiResponse<ModeratorReportItem>>(
      `/moderator/reports/${numericId}`
    )

    if (res.data?.isSuccess && res.data?.data) {
      return res.data.data
    }

    throw new Error(res.data?.message || "Không tìm thấy hồ sơ báo cáo")
  } catch (error) {
    console.error(`Lỗi khi tải chi tiết báo cáo ID ${id}:`, error)
    if (isMockFallbackEnabled()) {
      const foundMock = MOCK_MODERATOR_QUEUE.find(
        (m) => m.id === String(id) || m.rawId === numericId
      )
      if (foundMock) return foundMock
    }

    throw new Error(extractErrorMessage(error, "Không thể tải chi tiết hồ sơ báo cáo"))
  }
}

/**
 * PUT: Kiểm duyệt viên ra quyết định thẩm định ca báo cáo (Phê duyệt / Từ chối)
 */
export async function submitModerationDecision(
  payload: ModerationDecisionPayload
): Promise<{ success: boolean; message: string; data?: ModeratorReportItem }> {
  const numericId = payload.rawId ?? parseReportNumericId(payload.reportId)

  try {
    const body = {
      decision: payload.decision,
      reason: payload.reason,
      categoryId: payload.categoryId,
    }

    const res = await authorizeApi.put<BaseApiResponse<ModeratorReportItem>>(
      `/moderator/reports/${numericId}`,
      body
    )

    if (res.data?.isSuccess) {
      return {
        success: true,
        message: res.data.message || `Đã thẩm định thành công hồ sơ ${payload.reportId}!`,
        data: res.data.data,
      }
    }

    throw new Error(res.data?.message || "Xác nhận quyết định kiểm duyệt thất bại")
  } catch (error) {
    console.error(`Lỗi khi ra quyết định báo cáo ${payload.reportId}:`, error)
    throw new Error(
      extractErrorMessage(error, "Không thể ghi nhận quyết định kiểm duyệt")
    )
  }
}
