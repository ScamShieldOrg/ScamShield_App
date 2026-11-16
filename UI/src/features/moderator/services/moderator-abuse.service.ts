import { authorizeApi } from "@/lib/api/instance"
import axios from "axios"

export interface CreateAbuseEscalationPayload {
  flagType: "BULK_REPORTING" | "FALSE_REPORTING" | "SPAM" | "HARASSMENT" | "OTHER"
  reason: string
  evidence?: string
  reportIds: number[]
}

export interface ModeratorAbuseEscalationItem {
  id: number
  escalationCode: string
  userId: number
  reportId: number | null
  reportIds: number[]
  createdByUserId: number | null
  createdByName: string | null
  flagType: string
  severity: string
  reason: string
  evidence: string | null
  status: "PENDING" | "DISMISSED" | "OPEN"
  createdAt: string
}

export interface PaginatedResult<T> {
  data: T[]
  totalItems: number
  totalPages: number
  pageSize: number
  currentPage: number
  hasNext: boolean
  hasPrevious: boolean
}

interface ApiResponse<T> {
  isSuccess: boolean
  message: string
  data: T | null
}

export const moderatorAbuseService = {
  async createEscalation(
    userId: number,
    payload: CreateAbuseEscalationPayload
  ): Promise<ModeratorAbuseEscalationItem> {
    try {
      const response = await authorizeApi.post<ApiResponse<ModeratorAbuseEscalationItem>>(
        `/moderator/users/${userId}/abuse-escalations`,
        payload
      )
      if (!response.data.isSuccess || !response.data.data) {
        throw new Error(response.data.message || "Không thể chuyển hồ sơ lạm dụng cho Quản trị viên.")
      }
      return response.data.data
    } catch (error) {
      if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
        throw new Error(error.response?.data?.message || "Không thể kết nối máy chủ.")
      }
      throw error
    }
  },

  async getEscalations(
    userId: number,
    params?: { status?: string; page?: number; size?: number }
  ): Promise<PaginatedResult<ModeratorAbuseEscalationItem>> {
    try {
      const response = await authorizeApi.get<ApiResponse<PaginatedResult<ModeratorAbuseEscalationItem>>>(
        `/moderator/users/${userId}/abuse-escalations`,
        {
          params: {
            status: params?.status,
            page: params?.page ?? 0,
            size: params?.size ?? 20,
          },
        }
      )
      if (!response.data.isSuccess || !response.data.data) {
        throw new Error(response.data.message || "Không thể tải lịch sử hồ sơ lạm dụng.")
      }
      return response.data.data
    } catch (error) {
      if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
        throw new Error(error.response?.data?.message || "Không thể kết nối máy chủ.")
      }
      throw error
    }
  },
}
