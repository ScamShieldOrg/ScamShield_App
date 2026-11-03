export type PartnerSubmissionType = "SCAM_ALERT" | "THREAT_INTEL"

export type PartnerSubmissionStatus = "PENDING" | "VERIFIED" | "REJECTED"

export interface SubmitPartnerAlertPayload {
  submissionType: PartnerSubmissionType
  title: string
  description: string
  indicatorType?: string
  indicatorValue?: string
  categoryCode?: string
  evidenceUrl?: string
  evidenceFileName?: string
  file?: File | null
}

export interface PartnerSubmissionItem {
  id: number
  submissionCode?: string
  submissionType: string
  title: string
  description: string
  indicatorType?: string
  indicatorValue?: string
  normalizedValue?: string
  indicatorId?: number
  indicatorAction?: string
  categoryCode?: string
  categoryName?: string
  status: PartnerSubmissionStatus | string
  evidenceUrl?: string
  evidenceFileName?: string
  evidenceContentType?: string
  evidenceFileSize?: number
  partnerId?: number
  partnerLegalName?: string
  partnerBrandName?: string
  reviewedByName?: string
  reviewedAt?: string
  reviewNotes?: string
  confirmedIndicatorId?: number
  isConfirmed?: boolean
  createdAt: string
  updatedAt?: string
}

export interface PartnerSubmissionCounts {
  all: number
  pending: number
  verified: number
  rejected: number
}

export interface PaginatedSubmissions<T> {
  data: T[]
  currentPage: number
  totalItems: number
  totalPages: number
  pageSize: number
  hasNext: boolean
  hasPrevious: boolean
}

