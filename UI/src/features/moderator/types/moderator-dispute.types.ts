export type DisputeStatus =
  | "Đang xét"
  | "Chấp nhận"
  | "Từ chối"
  | "PENDING"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | string

export type OriginalDecision = "Approved" | "Rejected" | string

export interface DisputeEvidence {
  id: string
  rawId?: number
  name: string
  type: "pdf" | "image" | "video" | string
  url?: string
}

export interface ModeratorDisputeItem {
  id: string
  rawId?: number
  originalReportId: string
  targetIdentifier: string
  targetType?: string
  category: string
  disputedBy: string
  disputedAt: string
  status: DisputeStatus
  statusCode?: string
  originalDecision: OriginalDecision
  disputeReason: string
  evidences: DisputeEvidence[]
  evidenceCount?: number
  assignedTo?: string
  resolvedBy?: string
  resolvedAt?: string
  resolutionReason?: string
}

export interface ModeratorDisputeFilterParams {
  page?: number
  size?: number
  status?: string
  search?: string
  sort?: string
}

export interface DisputeQueueResponseData {
  items: ModeratorDisputeItem[]
  pendingCount: number
  totalItems: number
  currentPage: number
  pageSize: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface DisputeVerdictPayload {
  disputeId: string | number
  verdict: "RETRACT" | "UPHOLD"
  reason: string
}
