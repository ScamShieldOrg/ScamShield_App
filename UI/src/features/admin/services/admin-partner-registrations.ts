import axios from "axios"
import { authorizeApi } from "@/lib/api/instance"

export type PartnerReviewStatus = "PENDING" | "VERIFIED" | "REJECTED"

export interface PartnerRegistrationItem {
  id: number
  legalName: string
  taxCode: string
  corporateEmail: string
  representativeNameAndTitle: string
  officialDomain: string
  officialHotline: string
  smsBrandName: string
  verificationStatus: PartnerReviewStatus
  createdAt: string
  reviewedAt: string | null
}

export interface PartnerDocumentMetadata {
  id: number
  documentType: string
  fileName: string
  contentType: string
  fileSize: number
}

export interface PartnerRegistrationDetail extends PartnerRegistrationItem {
  userId: number
  contactPhone: string
  legalRepresentative: boolean
  reviewedBy: string | null
  reviewReason: string | null
  businessVerification: {
    outcome: string
    checkedAt: string
    xinvoice: {
      status: string
      legalName: string | null
      taxCode: string | null
      businessStatus: string | null
      activityStatus: string
    }
    formNameVsXinvoice: string
    formTaxCodeVsXinvoice: string
    ocrEnabled: boolean
    documents: { fileName: string; status: string }[]
  } | null
  documents: PartnerDocumentMetadata[]
}

export interface PartnerRegistrationCounts {
  pending: number
  verified: number
  rejected: number
}

export interface PartnerRegistrationPage {
  data: PartnerRegistrationItem[]
  currentPage: number
  totalItems: number
  totalPages: number
  pageSize: number
  hasNext: boolean
  hasPrevious: boolean
}

interface ApiResponse<T> {
  isSuccess: boolean
  message: string
  data: T
}

interface DocumentContent extends PartnerDocumentMetadata {
  contentBase64: string
}

export class PartnerReviewApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message)
  }
}

async function unwrap<T>(
  promise: Promise<{ data: ApiResponse<T> }>
): Promise<T> {
  try {
    const response = (await promise).data
    if (!response.isSuccess || response.data == null) {
      throw new PartnerReviewApiError(
        response.message || "Không thể tải dữ liệu."
      )
    }
    return response.data
  } catch (error) {
    if (error instanceof PartnerReviewApiError) throw error
    if (axios.isAxiosError(error)) {
      throw new PartnerReviewApiError(
        error.response?.data?.message || "Không thể kết nối máy chủ.",
        error.response?.status
      )
    }
    throw error
  }
}

const basePath = "/admin/partner-registrations"

export const adminPartnerRegistrations = {
  list(search: string, status: PartnerReviewStatus | null, page: number) {
    return unwrap<PartnerRegistrationPage>(
      authorizeApi.get(basePath, {
        params: {
          search: search || undefined,
          status: status || undefined,
          page,
          size: 10,
        },
      })
    )
  },
  counts() {
    return unwrap<PartnerRegistrationCounts>(
      authorizeApi.get(`${basePath}/counts`)
    )
  },
  detail(id: number) {
    return unwrap<PartnerRegistrationDetail>(
      authorizeApi.get(`${basePath}/${id}`)
    )
  },
  review(
    id: number,
    verificationStatus: "VERIFIED" | "REJECTED",
    reason?: string
  ) {
    return unwrap<PartnerRegistrationDetail>(
      authorizeApi.patch(`${basePath}/${id}`, { verificationStatus, reason })
    )
  },
  document(partnerId: number, documentId: number) {
    return unwrap<DocumentContent>(
      authorizeApi.get(`${basePath}/${partnerId}/documents/${documentId}`, {
        timeout: 30000,
      })
    )
  },
}
