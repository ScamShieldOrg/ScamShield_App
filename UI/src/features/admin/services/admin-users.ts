import axios from "axios"
import { authorizeApi } from "@/lib/api/instance"

export interface AdminAccount {
  id: number
  userCode: string
  fullName: string
  email: string
  role: string
  roleLabel: string
  joinedAt: string | null
  reportCount: number
  status: string
  statusLabel: string
  isFlagged: boolean
  isRateLimited: boolean
  flagReasons: string[]
}

export interface AdminUserPage {
  items: AdminAccount[]
  totalAccounts: number
  flaggedAccountsCount: number
  currentPage: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

interface ApiResponse<T> {
  isSuccess: boolean
  message: string
  data: T | null
}

export function formatAccountDate(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(date)
}

export const adminUsers = {
  async list(search: string, page: number): Promise<AdminUserPage> {
    try {
      const response = await authorizeApi.get<ApiResponse<AdminUserPage>>(
        "/admin/users",
        { params: { search: search || undefined, page, size: 10 } }
      )
      if (!response.data.isSuccess || !response.data.data) {
        throw new Error(response.data.message || "Không thể tải tài khoản.")
      }
      return response.data.data
    } catch (error) {
      if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
        throw new Error(
          error.response?.data?.message || "Không thể kết nối máy chủ."
        )
      }
      throw error
    }
  },
}
