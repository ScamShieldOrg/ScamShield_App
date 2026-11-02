import { authorizeApi } from "@/lib/api/instance"
import {
  ModeratorDisputeItem,
  ModeratorDisputeFilterParams,
  DisputeQueueResponseData,
  DisputeVerdictPayload,
} from "../types/moderator-dispute.types"
import { BaseApiResponse } from "../types/moderator.types"
import axios from "axios"

export const MOCK_MODERATOR_DISPUTES: ModeratorDisputeItem[] = [
  {
    id: "AP-2024-0041",
    rawId: 41,
    originalReportId: "CS-2024-1820",
    targetIdentifier: "0383 456 789",
    targetType: "PHONE",
    category: "Lừa đảo việc làm lương cao",
    disputedBy: "lehoangtung_biz",
    disputedAt: "14/01 16:45",
    status: "Đang xét",
    statusCode: "PENDING",
    originalDecision: "Approved",
    disputeReason:
      "Đây là số điện thoại của công ty tuyển dụng hợp pháp tại Hà Nội. Tôi có đầy đủ giấy phép kinh doanh và chứng từ thuế. Yêu cầu thu hồi chỉ số và xóa khỏi blacklist.",
    evidences: [
      { id: "disp-ev-1", name: "business_registration.pdf", type: "pdf" },
      { id: "disp-ev-2", name: "tax_cert.pdf", type: "pdf" },
      { id: "disp-ev-3", name: "contract_sample.jpg", type: "image" },
    ],
    evidenceCount: 3,
  },
  {
    id: "AP-2024-0038",
    rawId: 38,
    originalReportId: "CS-2024-1790",
    targetIdentifier: "thanhcong-invest.vn",
    targetType: "WEBSITE",
    category: "Lừa đảo đầu tư / tài chính",
    disputedBy: "thanhcong_fin_jsc",
    disputedAt: "12/01 09:20",
    status: "Đang xét",
    statusCode: "PENDING",
    originalDecision: "Approved",
    disputeReason:
      "Tên miền đã được cấp phép hoạt động theo quy định của Ủy ban Chứng khoán Nhà nước. Đây là sự cố nhầm lẫn do đối thủ cạnh tranh spam báo cáo.",
    evidences: [
      { id: "disp-ev-4", name: "ssc_license_cert.pdf", type: "pdf" },
      { id: "disp-ev-5", name: "domain_registration.pdf", type: "pdf" },
    ],
    evidenceCount: 2,
  },
  {
    id: "AP-2024-0035",
    rawId: 35,
    originalReportId: "CS-2024-1650",
    targetIdentifier: "1900 636 563",
    targetType: "PHONE",
    category: "Mạo danh công an / cơ quan nhà nước",
    disputedBy: "telecom_partner_vn",
    disputedAt: "10/01 14:00",
    status: "Chấp nhận",
    statusCode: "APPROVED",
    originalDecision: "Rejected",
    disputeReason:
      "Đầu số tổng đài CSKH hợp pháp của đơn vị cung ứng dịch vụ viễn thông, không thuộc quản lý của tổ chức lừa đảo.",
    evidences: [
      { id: "disp-ev-6", name: "mic_telecom_license.pdf", type: "pdf" },
    ],
    evidenceCount: 1,
  },
]

function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data
    return data?.message || data?.error || fallback
  }
  return error instanceof Error ? error.message : fallback
}

/**
 * GET: Lấy danh sách hàng chờ khiếu nại (Dispute Queue) kèm số lượng pendingCount
 */
export async function getModeratorDisputes(
  params?: ModeratorDisputeFilterParams
): Promise<DisputeQueueResponseData> {
  try {
    const queryParams: Record<string, unknown> = {
      page: params?.page ?? 0,
      size: params?.size ?? 10,
      sort: params?.sort || "createdAt,desc",
    }

    if (params?.search && params.search.trim()) {
      queryParams.search = params.search.trim()
    }
    if (params?.status && params.status !== "ALL") {
      queryParams.status = params.status
    }

    const res = await authorizeApi.get<BaseApiResponse<DisputeQueueResponseData>>(
      "/moderator/disputes",
      { params: queryParams }
    )

    if (res.data?.isSuccess && res.data?.data) {
      const responseData = res.data.data
      return {
        items: responseData.items || [],
        pendingCount: responseData.pendingCount ?? 0,
        totalItems: responseData.totalItems ?? (responseData.items?.length || 0),
        currentPage: responseData.currentPage ?? (params?.page ?? 0),
        pageSize: responseData.pageSize ?? 10,
        totalPages: responseData.totalPages ?? 1,
        hasNext: Boolean(responseData.hasNext),
        hasPrevious: Boolean(responseData.hasPrevious),
      }
    }

    throw new Error(res.data?.message || "Không thể tải danh sách kháng nghị")
  } catch (error) {
    console.error("Lỗi khi tải danh sách kháng nghị từ backend:", error)
    throw new Error(
      extractErrorMessage(error, "Không thể tải danh sách kháng nghị từ backend")
    )
  }
}

/**
 * GET: Lấy thông tin chi tiết một ca khiếu nại theo ID hoặc mã hồ sơ (ví dụ: 41 hoặc AP-2024-0041)
 */
export async function getModeratorDisputeById(
  idOrCode: string | number
): Promise<ModeratorDisputeItem> {
  try {
    const res = await authorizeApi.get<BaseApiResponse<ModeratorDisputeItem>>(
      `/moderator/disputes/${idOrCode}`
    )

    if (res.data?.isSuccess && res.data?.data) {
      return res.data.data
    }

    throw new Error(res.data?.message || "Không tìm thấy hồ sơ khiếu nại")
  } catch (error) {
    console.error(`Lỗi khi tải chi tiết khiếu nại ${idOrCode}:`, error)
    throw new Error(extractErrorMessage(error, "Không thể tải chi tiết ca khiếu nại"))
  }
}

/**
 * PUT: Kiểm duyệt viên đưa ra phán quyết kháng nghị (RETRACT: Thu hồi chỉ số / UPHOLD: Duy trì quyết định gốc)
 */
export async function submitDisputeVerdict(
  payload: DisputeVerdictPayload
): Promise<{ success: boolean; message: string; data?: ModeratorDisputeItem }> {
  try {
    const body = {
      verdict: payload.verdict,
      reason: payload.reason,
    }

    const res = await authorizeApi.put<BaseApiResponse<ModeratorDisputeItem>>(
      `/moderator/disputes/${payload.disputeId}`,
      body
    )

    if (res.data?.isSuccess) {
      return {
        success: true,
        message: res.data.message || "Đã lưu phán quyết kháng nghị thành công!",
        data: res.data.data,
      }
    }

    throw new Error(res.data?.message || "Phán quyết kháng nghị thất bại")
  } catch (error) {
    console.error(`Lỗi khi ra phán quyết khiếu nại ${payload.disputeId}:`, error)
    throw new Error(
      extractErrorMessage(error, "Không thể lưu phán quyết kháng nghị")
    )
  }
}
