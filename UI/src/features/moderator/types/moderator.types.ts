export type QueueItemPriority = "URGENT" | "HIGH" | "NORMAL"

export type QueueItemStatus =
  "Pending" | "In Review" | "Approved" | "Rejected" | "Withdrawn"

export type QueueFilterTab =
  "ALL" | "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "WITHDRAWN"

export interface QueueEvidence {
  id: string
  rawId?: number
  name: string
  type: "image" | "video" | "pdf" | string
  duplicateCheckAvailable?: boolean
  duplicateCount?: number
  analysisStatus?:
    "PENDING" | "COMPLETED" | "PARTIAL" | "FAILED" | "NOT_ANALYZED"
  analysisMessage?: string | null
  analyzedAt?: string | null
  imageFingerprintAvailable?: boolean
  ocrTextAvailable?: boolean
  similarEvidenceCount?: number
  similarEvidences?: {
    evidenceId: number
    reportId: number
    reportStatus: string
    createdAt: string | null
    reportUpdatedAt?: string | null
    sameReporter: boolean
    matchTypes: string[]
    imageSimilarity: number | null
    textSimilarity: number | null
  }[]
  duplicates?: {
    evidenceId: number
    reportId: number
    reportStatus: string
    createdAt: string | null
    reportUpdatedAt?: string | null
    sameReporter: boolean
  }[]
  url?: string
}

export interface ModeratorReportItem {
  indicatorContext?: {
    blacklistStatus: string | null
    reports: number
    approvedReports?: number
    rejectedReports?: number
    disputes: number
    firstSeenAt: string | null
    lastSeenAt: string | null
  } | null
  reporterContext?: {
    email: string | null
    phoneNumber: string | null
    reputationPoints: number | null
    joinedAt: string | null
    reports: number
    approvedReports: number
    decidedReports: number
    disputes: number
    approvedDisputes: number
    decidedDisputes: number
    abuseFlags: number
    openFlags: number
  } | null
  id: string
  rawId?: number
  targetIdentifier: string
  targetType?: string
  description?: string | null
  reportedMessage?: string | null
  category: string
  categoryId?: number
  reportCount: number
  reportedBy: string
  reportedAt: string
  processedAt?: string | null
  priority: QueueItemPriority
  status: QueueItemStatus
  aiScore?: number | null
  aiRiskLevel?: "SCAM-RISK" | "SUSPICIOUS" | "SAFE" | string | null
  aiConfidence?: string | null
  evidenceCompleteness: number
  reporterProposal?: string | null
  evidences: QueueEvidence[]
  taxonomies: string[]
  isLocked?: boolean
  canReview?: boolean
  assignedToMe?: boolean
  whitelisted?: boolean
  whitelistMatches?: {
    whitelistEntryId: number
    partnerId: number
    legalName: string
    verifiedAt: string | null
  }[]
}

export interface ModeratorReportFilterParams {
  page?: number
  size?: number
  tab?: QueueFilterTab | string
  search?: string
  priority?: QueueItemPriority | string
  sort?: string
}

export interface ModeratorQueueCounts {
  all: number
  pending: number
  inReview: number
  locked: number
}

export interface ModerationDecisionPayload {
  reportId: string | number
  rawId?: number
  decision: "APPROVE" | "REJECT"
  reason: string
  categoryId?: number
  selectedTaxonomies?: string[]
}

export interface BaseApiResponse<T> {
  isSuccess?: boolean
  success?: boolean
  message: string
  data: T
}

export interface PaginatedResult<T> {
  data: T[]
  currentPage: number
  totalItems: number
  totalPages: number
  pageSize: number
  hasNext: boolean
  hasPrevious: boolean
}

export const MODERATOR_TAXONOMY_TAGS = [
  "Lừa đảo ngân hàng / OTP Phishing",
  "Mạo danh công an / cơ quan nhà nước",
  "Lừa đảo việc làm lương cao",
  "Lừa đảo đầu tư / tài chính",
  "Giả mạo website ngân hàng",
  "Lừa đảo thương mại điện tử",
  "Mạo danh người thân / họ hàng",
  "Lottery / Trúng thưởng giả",
  "SIM Swap / Chiếm đoạt tài khoản",
  "Vishing / Cuộc gọi lừa đảo",
  "Smishing / SMS lừa đảo",
  "Deepfake / Lừa đảo giả mạo AI",
  "Khác",
] as const
