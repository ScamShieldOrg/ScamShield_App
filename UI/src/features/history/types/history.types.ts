export type TargetType =
  | "PHONE"
  | "URL"
  | "SMS_BANK"
  | "TELEGRAM"
  | "BANK_ACCOUNT"
  | "TRAFFIC_FINE"
  | "CRYPTO"
  | string

export type HistoryRiskStatus = "DANGEROUS" | "SUSPICIOUS" | "SAFE" | "UNKNOWN"

export interface HistoryItem {
  id: string
  timestamp: string
  createdAt?: string
  ip: string
  isRetroactive?: boolean
  targetType: TargetType
  targetValue: string
  targetDetail?: string | null
  snippet: string
  category: string
  verdictLabel: string
  verdictStatus: HistoryRiskStatus
  riskScore: number
}

export interface HistoryFilterState {
  searchQuery: string
  timeRange: string
  scamType: string
  riskStatus: "ALL" | HistoryRiskStatus
}

export interface ScamCheckRiskCounts {
  all: number
  dangerous: number
  suspicious: number
  safe: number
  unknown: number
}

export interface ScamCheckHistoryParams {
  search?: string
  timeRange?: "7_days" | "30_days" | "90_days" | "all" | string
  scamType?: "all" | "telecom" | "malware" | "banking" | "forex" | string
  riskStatus?: "ALL" | HistoryRiskStatus | string
  page?: number // 0-based index for backend
  size?: number
}

export interface PaginatedData<T> {
  data: T[]
  currentPage: number
  totalItems: number
  totalPages: number
  pageSize: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface ScamCheckHistoryResponse {
  items: PaginatedData<HistoryItem>
  riskCounts: ScamCheckRiskCounts
  periodLabel: string
}

export interface HistoryApiResponse<T> {
  isSuccess: boolean
  message: string
  data: T
}
