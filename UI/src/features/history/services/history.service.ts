import { authorizeApi } from "@/lib/api/instance"
import {
  HistoryItem,
  ScamCheckRiskCounts,
  ScamCheckHistoryParams,
  ScamCheckHistoryResponse,
  HistoryApiResponse,
} from "../types/history.types"
import axios from "axios"

export const MOCK_HISTORY_ITEMS: HistoryItem[] = [
  {
    id: "1",
    timestamp: "12/05/2025 • 14:28:11",
    ip: "14.161.***.*** (Viettel HN)",
    isRetroactive: true,
    targetType: "PHONE",
    targetValue: "+84 912.443.882",
    snippet:
      '"Thông báo thuê bao sẽ bị khóa chiều sau 2 giờ do vi phạm quy định viễn thông..."',
    category: "Giả Mạo Viễn Thông",
    verdictLabel: "Lừa Đảo Nguy Cơ Cao",
    verdictStatus: "DANGEROUS",
    riskScore: 98,
  },
  {
    id: "2",
    timestamp: "16/05/2025 • 09:14:02",
    ip: "27.72.***.*** (FPT HCM)",
    targetType: "URL",
    targetValue: "https://dichvucong-vneid-capnhat.gov-vn.info/apl...",
    snippet:
      'Link yêu cầu tải file APK "Dịch vụ công Bộ Công An v2.8" giả mạo đánh cắp mã OTP.',
    category: "Giả Mạo VNeID / Malware",
    verdictLabel: "Lừa Đảo Nguy Cơ Cao",
    verdictStatus: "DANGEROUS",
    riskScore: 99,
  },
  {
    id: "3",
    timestamp: "15/05/2025 • 18:40:55",
    ip: "118.69.***.*** (Viettel HCM)",
    targetType: "SMS_BANK",
    targetValue: "SMS Brandname: Vietcombank",
    snippet:
      '"VCB Digibank: QK dang thuc hien giao dich 2,500,000 VND tai he thong POS..."',
    category: "SMS Ngân Hàng Hợp Pháp",
    verdictLabel: "An Toàn Chính Hãng",
    verdictStatus: "SAFE",
    riskScore: 3,
  },
  {
    id: "4",
    timestamp: "14/05/2025 • 21:05:18",
    ip: "113.190.***.*** (VNPT ĐN)",
    targetType: "TELEGRAM",
    targetValue: "Zalo/Telegram: @TuyenDungShopeeMall_HR",
    snippet:
      '"Việc nhẹ làm tại nhà 400k-800k/ngày, duyệt đơn hàng nhận hoa hồng ngay lập tức..."',
    category: "Tuyển Dụng CTV Ảo",
    verdictLabel: "Nghi Vấn Rủi Ro",
    verdictStatus: "SUSPICIOUS",
    riskScore: 68,
  },
  {
    id: "5",
    timestamp: "13/05/2025 • 11:22:40",
    ip: "14.238.***.*** (Viettel HP)",
    targetType: "BANK_ACCOUNT",
    targetValue: "STK: 104889201992 - VPBank (VU HOANG ANH)",
    snippet:
      "Tài khoản cá nhân giao dịch mua bán đồ gia dụng online trên hội nhóm mạng xã hội.",
    category: "Giao Dịch Dân Sự",
    verdictLabel: "Chưa Đủ Dữ Liệu",
    verdictStatus: "UNKNOWN",
    riskScore: 15,
  },
  {
    id: "6",
    timestamp: "11/05/2025 • 08:35:12",
    ip: "14.161.***.*** (Viettel HN)",
    targetType: "TRAFFIC_FINE",
    targetValue: "http://tra-cuu-phatnguoi-c08.top/bienban",
    snippet:
      '"Cục Cảnh sát giao thông thông báo phương tiện 29A-883.xx có biên bản phạt nguội..."',
    category: "Giả Mạo Cảnh Sát Giao Thông",
    verdictLabel: "Lừa Đảo Nguy Cơ Cao",
    verdictStatus: "DANGEROUS",
    riskScore: 97,
  },
  {
    id: "7",
    timestamp: "09/05/2025 • 16:50:33",
    ip: "171.244.***.*** (Viettel ĐN)",
    targetType: "CRYPTO",
    targetValue: "https://binance-vip-asia-trade.cc",
    snippet:
      '"Nạp USDT cam kết lợi nhuận 3.5%/ngày, bảo hiểm vốn 100% bởi quỹ ủy thác..."',
    category: "Sàn Forex / Tiền Ảo",
    verdictLabel: "Lừa Đảo Nguy Cơ Cao",
    verdictStatus: "DANGEROUS",
    riskScore: 99,
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
 * Lấy danh sách lịch sử kiểm tra lừa đảo của người dùng kèm phân trang và thống kê rủi ro
 */
export async function getScamCheckHistory(
  params?: ScamCheckHistoryParams
): Promise<ScamCheckHistoryResponse> {
  try {
    const queryParams: Record<string, unknown> = {
      page: params?.page ?? 0,
      size: params?.size ?? 10,
      timeRange: params?.timeRange || "all",
      scamType: params?.scamType || "all",
      riskStatus: params?.riskStatus || "ALL",
    }

    if (params?.search && params.search.trim()) {
      queryParams.search = params.search.trim()
    }

    const res = await authorizeApi.get<HistoryApiResponse<ScamCheckHistoryResponse>>(
      "/history",
      { params: queryParams }
    )

    if (res.data?.isSuccess && res.data?.data) {
      return res.data.data
    }

    return {
      items: {
        data: [],
        currentPage: 0,
        totalItems: 0,
        totalPages: 0,
        pageSize: 10,
        hasNext: false,
        hasPrevious: false,
      },
      riskCounts: {
        all: 0,
        dangerous: 0,
        suspicious: 0,
        safe: 0,
        unknown: 0,
      },
      periodLabel: "",
    }
  } catch (error) {
    console.error("Lỗi khi tải lịch sử kiểm tra:", error)
    throw new Error(
      extractErrorMessage(error, "Không thể tải lịch sử kiểm tra")
    )
  }
}

/**
 * Lấy số lượng thống kê theo phân loại rủi ro
 */
export async function getRiskCounts(): Promise<ScamCheckRiskCounts> {
  try {
    const res = await authorizeApi.get<HistoryApiResponse<ScamCheckRiskCounts>>(
      "/history/risk-counts"
    )

    if (res.data?.isSuccess && res.data?.data) {
      return res.data.data
    }

    return {
      all: 0,
      dangerous: 0,
      suspicious: 0,
      safe: 0,
      unknown: 0,
    }
  } catch (error) {
    console.error("Lỗi khi tải thống kê rủi ro:", error)
    throw new Error(
      extractErrorMessage(error, "Không thể tải thống kê rủi ro")
    )
  }
}

/**
 * Xóa/ẩn mềm danh sách các bản ghi lịch sử kiểm tra theo IDs
 */
export async function deleteHistoryItems(
  ids: (string | number)[]
): Promise<void> {
  try {
    const numericIds = ids.map((id) => Number(id)).filter((id) => !isNaN(id))
    if (numericIds.length === 0) return

    const res = await authorizeApi.delete<HistoryApiResponse<void>>(
      "/history",
      {
        data: numericIds,
        params: { ids: numericIds.join(",") },
      }
    )

    if (!res.data?.isSuccess && res.status >= 400) {
      throw new Error(res.data?.message || "Xóa lịch sử kiểm tra thất bại")
    }
  } catch (error) {
    console.error("Lỗi khi xóa lịch sử kiểm tra:", error)
    throw new Error(
      extractErrorMessage(error, "Không thể xóa các bản ghi lịch sử đã chọn")
    )
  }
}
