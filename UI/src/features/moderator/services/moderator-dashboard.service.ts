import { authorizeApi } from "@/lib/api/instance"
import type { BaseApiResponse } from "@/features/moderator/types/moderator.types"

export interface DecisionCounts {
  accepted: number
  rejected: number
  total: number
}

export interface ModeratorDashboardData {
  reports: DecisionCounts
  disputes: DecisionCounts
  partnerSubmissions: DecisionCounts
}

export async function getModeratorDashboard(signal: AbortSignal) {
  const { data } = await authorizeApi.get<
    BaseApiResponse<ModeratorDashboardData>
  >("/moderator/dashboard", { signal })
  if (!(data.isSuccess ?? data.success) || !data.data) {
    throw new Error("Không thể tải tổng quan kiểm duyệt.")
  }
  return data.data
}
