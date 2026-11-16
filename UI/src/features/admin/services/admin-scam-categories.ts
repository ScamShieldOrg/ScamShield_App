import axios from "axios"
import { authorizeApi } from "@/lib/api/instance"

export interface AdminScamCategory {
  id: number
  code: string
  name: string
  description: string
  isActive: boolean
  version: number
  approvedReportCount: number
}

interface ApiResponse<T> {
  isSuccess: boolean
  message: string
  data: T
}

export class ScamCategoryApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message)
  }
}

async function unwrap<T>(
  promise: Promise<{ data: ApiResponse<T> }>
): Promise<T> {
  try {
    const response = (await promise).data
    if (!response.isSuccess || response.data == null) {
      throw new ScamCategoryApiError(
        response.message || "Không thể tải dữ liệu."
      )
    }
    return response.data
  } catch (error) {
    if (error instanceof ScamCategoryApiError) throw error
    if (axios.isAxiosError(error)) {
      throw new ScamCategoryApiError(
        error.response?.data?.message || "Không thể kết nối máy chủ.",
        error.response?.status
      )
    }
    throw error
  }
}

const basePath = "/admin/scam-categories"

export const adminScamCategories = {
  list() {
    return unwrap<AdminScamCategory[]>(authorizeApi.get(basePath))
  },
  create(payload: { name: string; description: string }) {
    return unwrap<AdminScamCategory>(authorizeApi.post(basePath, payload))
  },
  update(
    id: number,
    payload: {
      name: string
      description: string
      isActive: boolean
      version: number
    }
  ) {
    return unwrap<AdminScamCategory>(
      authorizeApi.put(`${basePath}/${id}`, payload)
    )
  },
}
