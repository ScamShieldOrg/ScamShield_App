import { authorizeApi } from "@/lib/api/instance"
import axios from "axios"
import { validateReportFiles } from "@/features/report/utils/report-upload"
import {
  OwnReportDetail,
  UpdateOwnReportPayload,
  RecentReportItem,
  TrackingReportItem,
  ReportSummaryMetrics,
  CreateReportPayload,
  ReportStatusCounts,
  ScamCategoryItem,
  TrackingReportsFilterParams,
  PaginatedTrackingReports,
  ReportStatus,
  ReportThreatType,
} from "../types/report.types"

interface TrackingReportResponse extends Partial<TrackingReportItem> {
  rawId?: number
  createdAt?: string
  evidenceCount?: number
}

interface RecentReportResponse {
  id: number
  reportCode?: string
  targetIdentifier?: string
  threatType?: ReportThreatType
  categoryName?: string
  category?: string
  createdAt?: string
  evidenceCount?: number
  evidences?: unknown[]
  status?: ReportStatus
  rewardPoints?: number
}

export const DEFAULT_SUMMARY_METRICS: ReportSummaryMetrics = {
  totalReports: 0,
  recentReports7Days: 0,
  blacklistedCount: 0,
  queriesProtected: 0,
  accuracyRate: 0,
  rankTitle: "Sentinel Tân Thủ",
  reputationPoints: 0,
  currentTierProgress: 0,
  maxTierPoints: 100,
}

export const DEFAULT_STATUS_COUNTS: ReportStatusCounts = {
  all: 0,
  pending: 0,
  approvedBlacklist: 0,
  mergedDuplicate: 0,
  rejected: 0,
}

/**
 * Lấy thống kê tổng quan (4 metric cards) từ GET /api/user/reports/metrics
 */
export async function getReportSummaryMetrics(): Promise<ReportSummaryMetrics> {
  try {
    const res = await authorizeApi.get("/user/reports/metrics")
    if ((res.data?.isSuccess ?? res.data?.success) && res.data?.data) {
      const d = res.data.data
      return {
        totalReports: Number(d.totalReports || 0),
        recentReports7Days: Number(d.recentReports7Days || 0),
        blacklistedCount: Number(d.blacklistedCount || 0),
        queriesProtected: Number(d.queriesProtected || 0),
        accuracyRate: Number(d.accuracyRate ?? 0),
        rankTitle: d.rankTitle || "Sentinel Tân Thủ",
        reputationPoints: Number(d.reputationPoints || 0),
        currentTierProgress: Number(d.currentTierProgress || 0),
        maxTierPoints: Number(d.maxTierPoints || 100),
      }
    }
  } catch (error) {
    console.warn(
      "Không thể tải thống kê metrics, dùng dữ liệu mặc định:",
      error
    )
  }
  return DEFAULT_SUMMARY_METRICS
}

/**
 * Lấy số lượng báo cáo theo trạng thái từ GET /api/user/reports/status-counts
 */
export async function getReportStatusCounts(): Promise<ReportStatusCounts> {
  try {
    const res = await authorizeApi.get("/user/reports/status-counts")
    if ((res.data?.isSuccess ?? res.data?.success) && res.data?.data) {
      const d = res.data.data
      return {
        all: Number(d.all || 0),
        pending: Number(d.pending || 0),
        approvedBlacklist: Number(d.approvedBlacklist || 0),
        mergedDuplicate: Number(d.mergedDuplicate || 0),
        rejected: Number(d.rejected || 0),
        withdrawn: Number(d.withdrawn || 0),
      }
    }
  } catch (error) {
    console.warn("Không thể tải số lượng trạng thái báo cáo:", error)
  }
  return DEFAULT_STATUS_COUNTS
}

/**
 * Lấy danh sách báo cáo tiến trình phân trang từ GET /api/user/reports/tracking
 */
export async function getTrackingReports(
  params?: TrackingReportsFilterParams
): Promise<PaginatedTrackingReports> {
  try {
    const res = await authorizeApi.get("/user/reports/tracking", {
      params: {
        search: params?.search || undefined,
        status:
          params?.status && params.status !== "ALL" ? params.status : undefined,
        categoryId: params?.categoryId || undefined,
        days: params?.days || undefined,
        page: params?.page ?? 0,
        size: params?.size ?? 10,
        sort: params?.sort || "createdAt,desc",
      },
    })

    if ((res.data?.isSuccess ?? res.data?.success) && res.data?.data) {
      const pageData = res.data.data
      const rawList: TrackingReportResponse[] = Array.isArray(pageData.data)
        ? pageData.data
        : []
      const items: TrackingReportItem[] = rawList.map((item) => ({
        rawId: item.rawId,
        id: item.id || (item.rawId ? `#RPT-${item.rawId}` : "#RPT-0000"),
        hashId: item.hashId || "---",
        targetType: item.targetType || "PHONE",
        targetValue: item.targetValue || "",
        targetSub: item.targetSub || "",
        category: item.category || "Chưa phân loại",
        submittedDate:
          item.submittedDate ||
          (item.createdAt
            ? new Date(item.createdAt).toLocaleString("vi-VN")
            : "Vừa xong"),
        slaTime: item.slaTime || "Đang xử lý",
        slaStatus: item.slaStatus || "processing",
        evidenceBadge:
          item.evidenceBadge ||
          (item.evidenceCount
            ? `${item.evidenceCount} bằng chứng`
            : "Không có"),
        status: item.status || "PENDING",
      }))

      return {
        items,
        currentPage: pageData.currentPage ?? 0,
        totalItems: pageData.totalItems ?? items.length,
        totalPages: pageData.totalPages ?? 1,
        pageSize: pageData.pageSize ?? 10,
        hasNext: Boolean(pageData.hasNext),
        hasPrevious: Boolean(pageData.hasPrevious),
      }
    }
  } catch (error) {
    console.warn("Không thể tải danh sách theo dõi tiến trình:", error)
  }

  return {
    items: [],
    currentPage: 0,
    totalItems: 0,
    totalPages: 1,
    pageSize: 10,
    hasNext: false,
    hasPrevious: false,
  }
}

/**
 * Lấy danh mục thủ đoạn lừa đảo từ GET /api/user/reports/categories
 */
export async function getReportCategories(): Promise<ScamCategoryItem[]> {
  try {
    const res = await authorizeApi.get("/user/reports/categories")
    if (
      (res.data?.isSuccess ?? res.data?.success) &&
      Array.isArray(res.data?.data)
    ) {
      return res.data.data
    }
  } catch (error) {
    console.warn("Không thể tải danh mục thủ đoạn:", error)
  }
  return []
}

/**
 * Xuất file CSV đối soát từ GET /api/user/reports/export-csv
 */
export async function exportTrackingReportsCsv(
  params?: TrackingReportsFilterParams
): Promise<Blob> {
  const res = await authorizeApi.get("/user/reports/export-csv", {
    params: {
      search: params?.search || undefined,
      status:
        params?.status && params.status !== "ALL" ? params.status : undefined,
      categoryId: params?.categoryId || undefined,
      days: params?.days || undefined,
    },
    responseType: "blob",
  })
  return res.data
}

export interface SubmitReportResponse {
  success: boolean
  reportId: string
  message: string
  evidenceCount: number
  rewardPoints: number
}

/**
 * Submit the JSON request and original evidence files together as multipart.
 * The API base URL already includes /api.
 */
export async function submitScamReport(
  payload: CreateReportPayload,
  onUploadProgress?: (percentage: number) => void
): Promise<SubmitReportResponse> {
  const fileError = validateReportFiles(payload.attachments)
  if (fileError) throw new Error(fileError)

  const formData = new FormData()
  formData.append(
    "request",
    new Blob(
      [
        JSON.stringify({
          threatType: payload.threatType,
          targetIdentifier: payload.targetIdentifier.trim(),
          category: payload.category,
          regionCode: payload.regionCode,
          description: payload.description.trim(),
          reportedMessage: payload.reportedMessage?.trim()
            ? payload.reportedMessage
            : undefined,
          isConfirmed: payload.isConfirmed,
        }),
      ],
      { type: "application/json" }
    )
  )
  payload.attachments.forEach((file) =>
    formData.append("files", file, file.name)
  )

  try {
    const res = await authorizeApi.post("/reports", formData, {
      // Remove the Axios JSON default; the browser supplies the multipart boundary.
      headers: { "Content-Type": undefined },
      timeout: 120_000,
      onUploadProgress: (event) => {
        if (event.total && onUploadProgress) {
          onUploadProgress(
            Math.min(100, Math.round((event.loaded * 100) / event.total))
          )
        }
      },
    })
    const data = res.data?.data
    if (res.data?.isSuccess !== true) {
      throw new Error(
        res.data?.message || "Không thể gửi báo cáo. Vui lòng thử lại."
      )
    }
    if (!data?.id || typeof data.id !== "number") {
      throw new Error(
        "Chưa nhận được xác nhận lưu báo cáo. Vui lòng kiểm tra Báo cáo của tôi trước khi gửi lại."
      )
    }

    return {
      success: true,
      reportId: data.reportCode || `#RPT-${data.id}`,
      message: res.data?.message || "Gửi báo cáo lừa đảo thành công!",
      evidenceCount: data.evidenceCount ?? payload.attachments.length,
      rewardPoints: data.rewardPoints ?? 0,
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        throw new Error(
          "Tải tệp mất quá nhiều thời gian. Vui lòng kiểm tra Báo cáo của tôi trước khi gửi lại."
        )
      }
      if (!error.response) {
        throw new Error(
          "Mất kết nối khi gửi báo cáo. Vui lòng kiểm tra mạng và Báo cáo của tôi trước khi gửi lại."
        )
      }
      const status = error.response.status
      if (status === 413)
        throw new Error(
          "Dung lượng tệp đính kèm vượt giới hạn của máy chủ. Vui lòng giảm dung lượng và thử lại."
        )
      if (status === 401)
        throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.")
      if (status >= 500)
        throw new Error(
          "Máy chủ chưa thể lưu báo cáo hoặc tệp đính kèm. Vui lòng thử lại sau."
        )
      const message = error.response.data?.message
      if (
        typeof message === "string" &&
        /[Đđ\u00c0-\u1ef9]/.test(message) &&
        !/<[^>]+>/.test(message)
      ) {
        throw new Error(message)
      }
      throw new Error(
        "Không thể gửi báo cáo và tệp đính kèm. Vui lòng thử lại."
      )
    }
    throw error
  }
}

/**
 * Lấy danh sách báo cáo cá nhân từ API backend /api/reports/my-reports
 */
export async function getMyReports(): Promise<RecentReportItem[]> {
  try {
    const res = await authorizeApi.get<{
      isSuccess: boolean
      data: RecentReportResponse[]
    }>("/reports/my-reports")
    if (res.data?.isSuccess && Array.isArray(res.data?.data)) {
      return res.data.data.map((item) => ({
        id: item.reportCode || (item.id ? `#RPT-${item.id}` : "#RPT-0000"),
        targetValue: item.targetIdentifier || "",
        targetType: item.threatType || "PHONE",
        category: item.categoryName || item.category || "Chưa phân loại",
        submittedDate: item.createdAt
          ? new Date(item.createdAt).toLocaleString("vi-VN")
          : "Vừa xong",
        evidenceCount: item.evidenceCount || (item.evidences?.length ?? 0),
        status: item.status || "PENDING",
        rewardPoints: item.rewardPoints || 0,
      }))
    }
  } catch (error: unknown) {
    console.error("Lỗi khi tải danh sách báo cáo cá nhân:", error)
    throw error
  }

  return []
}

export class ReportActionError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message)
  }
}

function reportActionError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 409)
      return new ReportActionError(
        "Báo cáo đã bắt đầu được kiểm duyệt hoặc đã thu hồi. Trạng thái đã được cập nhật.",
        409
      )
    if (error.response?.status === 404)
      return new Error(
        "Không tìm thấy báo cáo hoặc bạn không có quyền truy cập."
      )
    if (error.response?.status === 401)
      return new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.")
    return new Error(
      error.response?.data?.message ||
        "Không thể xử lý báo cáo. Vui lòng thử lại."
    )
  }
  return error instanceof Error ? error : new Error("Không thể xử lý báo cáo.")
}

export async function getOwnReport(id: number): Promise<OwnReportDetail> {
  try {
    const { data } = await authorizeApi.get(`/user/reports/${id}`)
    if (!(data.isSuccess ?? data.success) || !data.data)
      throw new Error(data.message || "Không thể tải báo cáo.")
    return data.data
  } catch (error) {
    throw reportActionError(error)
  }
}

export async function updateOwnReport(
  id: number,
  payload: UpdateOwnReportPayload
): Promise<OwnReportDetail> {
  try {
    const { data } = await authorizeApi.put(`/user/reports/${id}`, payload)
    if (!(data.isSuccess ?? data.success) || !data.data)
      throw new Error(data.message || "Không thể cập nhật báo cáo.")
    return data.data
  } catch (error) {
    throw reportActionError(error)
  }
}

export async function withdrawOwnReport(id: number): Promise<void> {
  try {
    const { data } = await authorizeApi.delete(`/user/reports/${id}`)
    if (!(data.isSuccess ?? data.success))
      throw new Error(data.message || "Không thể thu hồi báo cáo.")
  } catch (error) {
    throw reportActionError(error)
  }
}

export async function uploadOwnReportEvidence(files: File[]) {
  const validation = validateReportFiles(files)
  if (validation) throw new Error(validation)
  return Promise.all(
    files.map(async (file) => {
      const extension = file.name.split(".").pop()!.toLowerCase()
      const contentType =
        extension === "pdf"
          ? "application/pdf"
          : extension === "png"
            ? "image/png"
            : "image/jpeg"
      const { data } = await authorizeApi.post("/reports/presigned-url", {
        fileName: file.name,
        contentType,
      })
      if (
        !(data.isSuccess ?? data.success) ||
        !data.data?.uploadUrl ||
        !data.data?.fileUrl
      )
        throw new Error("Không thể khởi tạo tải bằng chứng.")
      await axios.put(data.data.uploadUrl, file, {
        headers: { "Content-Type": contentType },
        timeout: 120000,
      })
      return {
        fileUrl: data.data.fileUrl as string,
        fileName: file.name,
        evidenceType: extension === "jpeg" ? "JPG" : extension.toUpperCase(),
      }
    })
  )
}
