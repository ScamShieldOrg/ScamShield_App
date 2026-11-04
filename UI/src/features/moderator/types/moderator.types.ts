export type QueueItemPriority = "URGENT" | "HIGH" | "NORMAL"

export type QueueItemStatus = "Pending" | "In Review" | "Locked" | "Approved" | "Rejected"

export type QueueFilterTab = "ALL" | "PENDING" | "IN_REVIEW" | "LOCKED"

export interface QueueEvidence {
  id: string
  rawId?: number
  name: string
  type: "image" | "video" | "pdf" | string
  url?: string
}

export interface ModeratorReportItem {
  id: string
  rawId?: number
  targetIdentifier: string
  targetType?: string
  category: string
  categoryId?: number
  reportCount: number
  reportedBy: string
  reportedAt: string
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
  isSuccess: boolean
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
