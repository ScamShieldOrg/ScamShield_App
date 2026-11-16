export interface BlackItem {
  id: number
  indicatorId: number
  resourceType: string
  title: string
  severity: string
  severityLabel: string
  description: string
  warningCount: number
  confirmedAt: string
  updatedAt: string
}

export type BlackListItem = BlackItem

export interface BlacklistResourceFilterRequest {
  page?: number
  size?: number
  keyword?: string
  resourceType?: string
}

export interface PaginatedBlacklistResponse {
  data: BlackItem[]
  currentPage: number
  totalItems: number
  totalPages: number
  pageSize: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface VerifiedWhitelistIndicator {
  id: number
  resourceType: string
  value: string
  verifiedAt: string | null
}

export interface WhitelistResource {
  id: number
  name: string
  brandName: string
  partnerType: string
  taxId: string | null
  verificationReason: string | null
  legalRepresentative: string | null
  officialHotlines: string[]
  officialDomains: string[]
  smsBrandNames: string[]
  verifiedIndicators: VerifiedWhitelistIndicator[]
  verifiedAt: string | null
}

export interface WhitelistResourceFilterRequest {
  page?: number
  size?: number
  keyword?: string
  sortBy?: "newest" | "name"
}

export interface PaginatedWhitelistResponse {
  data: WhitelistResource[]
  currentPage: number
  totalItems: number
  totalPages: number
  pageSize: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface WhitelistApiResponse {
  isSuccess: boolean
  message: string
  data: PaginatedWhitelistResponse
}

export interface BlacklistApiResponse {
  isSuccess: boolean
  message: string
  data: PaginatedBlacklistResponse
}

