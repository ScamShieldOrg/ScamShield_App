export type ReportThreatType = "PHONE" | "WEBSITE" | "BANK_ACCOUNT"

export type ReportStatus =
  "PENDING" | "REJECTED" | "APPROVED" | "IN_REVIEW" | "WITHDRAWN"

export interface RecentReportItem {
  id: string
  targetValue: string
  targetType: ReportThreatType
  targetBank?: string
  category: string
  submittedDate: string
  evidenceCount: number
  status: ReportStatus
  rewardPoints: number | null
  rejectionReason?: string
  duplicateRef?: string
}

export interface TrackingReportItem {
  rawId?: number
  id: string
  hashId: string
  targetType: "PHONE" | "BANK" | "WEBSITE" | "TELEGRAM" | "APK"
  targetValue: string
  targetSub: string
  category: string
  submittedDate: string
  slaTime: string
  slaStatus: "completed" | "processing" | "merged" | "withdrawn"
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
  regionCode: string
  threatType: ReportThreatType
  targetIdentifier: string
  category: string
  description: string
  reportedMessage?: string
  attachments: File[]
  isConfirmed: boolean
}

export interface ReportStatusCounts {
  withdrawn?: number
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

export interface OwnReportEvidence {
  fileName?: string | null
  fileHash?: string | null
  id?: number
  fileUrl: string | null
  evidenceType: string
  verificationStatus?: string
  ocrText?: string | null
}

export interface OwnReportDetail {
  id: string
  rawId: number
  targetType: string
  targetValue: string
  category: string
  categoryId: number | null
  regionCode: string | null
  description: string | null
  reportedMessage: string | null
  status: ReportStatus
  createdAt: string
  updatedAt: string
  evidences: OwnReportEvidence[]
  moderationHistory: {
    id: number
    action: string
    reason: string | null
    moderatorName: string | null
    createdAt: string
  }[]
}

export interface UpdateOwnReportPayload {
  description: string
  reportedMessage: string | null
  categoryId: number | null
  regionCode: string | null
  evidences?: {
    fileUrl: string
    evidenceType: string
    fileName?: string | null
    fileHash?: string | null
  }[]
}
