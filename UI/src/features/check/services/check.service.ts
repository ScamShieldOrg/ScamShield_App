import { authorizeApi } from "@/lib/api/instance"
import { useAuthStore } from "@/store/auth.store"
import type {
  ScamCheckRequest,
  ScamCheckResult,
} from "../types/scam-check.types"

export async function checkScamContent(
  payload: ScamCheckRequest
): Promise<ScamCheckResult> {
  if (!useAuthStore.getState().token) {
    throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.")
  }
  const { data } = await authorizeApi.post<{
    isSuccess: boolean
    message: string
    data: ScamCheckResult
  }>("/scam-checks", payload, { timeout: 90000 })
  if (!data.isSuccess || !data.data)
    throw new Error(data.message || "Chưa thể phân tích nội dung.")
  return data.data
}

export async function getScamCheckResult(checkId: number): Promise<ScamCheckResult> {
  const { data } = await authorizeApi.get<{
    isSuccess: boolean
    message: string
    data: ScamCheckResult
  }>(`/scam-checks/${checkId}`)
  if (!data.isSuccess || !data.data)
    throw new Error(data.message || "Không thể tải kết quả kiểm tra.")
  return data.data
}
