import { publicApi } from "@/lib/api/instance"
import {
  GuestLeaderboardData,
  LeaderboardApiResponse,
} from "../types/leaderboard.types"
import axios from "axios"

function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data
    return data?.message || data?.error || fallback
  }
  return error instanceof Error ? error.message : fallback
}

/**
 * Lấy dữ liệu Bảng Vinh Danh Đóng Góp Cộng Đồng cho khách vãng lai và người dùng
 * @param timeRange ALL_TIME | THIS_MONTH | LAST_7_DAYS
 */
export async function getLeaderboard(
  timeRange: string = "THIS_MONTH"
): Promise<GuestLeaderboardData> {
  try {
    const res = await publicApi.get<LeaderboardApiResponse<GuestLeaderboardData>>(
      "/guest/leaderboard",
      {
        params: { timeRange },
      }
    )

    if (res.data?.isSuccess && res.data?.data) {
      return res.data.data
    }

    return {
      stats: [],
      topThree: {},
      rankings: [],
      filters: [],
      activeFilter: timeRange,
    }
  } catch (error) {
    console.error("Lỗi khi tải bảng vinh danh:", error)
    throw new Error(
      extractErrorMessage(error, "Không thể tải dữ liệu bảng vinh danh")
    )
  }
}
