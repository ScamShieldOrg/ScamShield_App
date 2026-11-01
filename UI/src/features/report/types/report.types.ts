export type ReportThreatType = "PHONE" | "WEBSITE" | "BANK_ACCOUNT"

export type ReportStatus =
  "APPROVED_BLACKLIST" | "PENDING" | "MERGED_DUPLICATE" | "REJECTED"

export interface RecentReportItem {
  id: string
  targetValue: string
  targetType: ReportThreatType
  targetBank?: string
  category: string
  submittedDate: string
  evidenceCount: number
  status: ReportStatus
  rewardPoints: number
  rejectionReason?: string
  duplicateRef?: string
}

export interface TrackingReportItem {
  id: string
  hashId: string
  targetType: "PHONE" | "BANK" | "WEBSITE" | "TELEGRAM" | "APK"
  targetValue: string
  targetSub: string
  category: string
  submittedDate: string
  slaTime: string
  slaStatus: "completed" | "processing" | "merged"
  evidenceBadge: string
  status: ReportStatus
}

export interface ReportSummaryMetrics {
  totalReports: number
  recentReports7Days: number
  blacklistedCount: number
  queriesProtected: number
  accuracyRate: number
  rankTitle: string
  reputationPoints: number
  currentTierProgress: number
  maxTierPoints: number
}

export interface CreateReportPayload {
  threatType: ReportThreatType
  targetIdentifier: string
  category: string
  description: string
  reportedMessage?: string
  attachments: File[]
  isConfirmed: boolean
}

export interface ReportStatusCounts {
  all: number
  pending: number
  approvedBlacklist: number
  mergedDuplicate: number
  rejected: number
}

export interface ScamCategoryItem {
  id: number
  code: string
  name: string
  description?: string
}

export interface TrackingReportsFilterParams {
  search?: string
  status?: string
  categoryId?: number
  days?: number
  page?: number
  size?: number
  sort?: string
}

export interface PaginatedTrackingReports {
  items: TrackingReportItem[]
  currentPage: number
  totalItems: number
  totalPages: number
  pageSize: number
  hasNext: boolean
  hasPrevious: boolean
}
