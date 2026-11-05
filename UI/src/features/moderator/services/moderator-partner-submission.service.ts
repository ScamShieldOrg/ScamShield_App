import { authorizeApi } from "@/lib/api/instance"
import { PartnerSubmissionItem } from "@/features/partner/types/partner-submission.types"

export interface ModeratorPartnerQueueCounts {
  all: number
  pending: number
  verified: number
  rejected: number
}

export interface ReviewSubmissionPayload {
  decision: "VERIFY" | "REJECT"
  reason: string
}

export async function getModeratorPartnerQueue(params: {
  status?: string
  page?: number
  size?: number
  search?: string
}): Promise<{
  data: PartnerSubmissionItem[]
  currentPage: number
  totalItems: number
  totalPages: number
}> {
  const res = await authorizeApi.get("/moderator/partner-submissions", {
    params: {
      status: params.status || "ALL",
      page: params.page || 0,
      size: params.size || 10,
      search: params.search,
    },
  })
  return res.data?.data || { data: [], currentPage: 0, totalItems: 0, totalPages: 1 }
}

export async function getModeratorPartnerCounts(): Promise<ModeratorPartnerQueueCounts> {
  const res = await authorizeApi.get("/moderator/partner-submissions/counts")
  const data = res.data?.data
  return {
    all: data?.totalCount ?? data?.all ?? 0,
    pending: data?.pendingCount ?? data?.pending ?? 0,
    verified: data?.verifiedCount ?? data?.verified ?? 0,
    rejected: data?.rejectedCount ?? data?.rejected ?? 0,
  }
}

export async function getModeratorPartnerSubmissionDetail(
  id: number
): Promise<PartnerSubmissionItem> {
  const res = await authorizeApi.get(`/moderator/partner-submissions/${id}`)
  return res.data?.data
}

export async function submitModeratorPartnerDecision(
  id: number,
  payload: ReviewSubmissionPayload
): Promise<PartnerSubmissionItem> {
  const res = await authorizeApi.put(
    `/moderator/partner-submissions/${id}/review`,
    payload
  )
  return res.data?.data
}

export async function downloadModeratorEvidence(id: number): Promise<Blob> {
  const res = await authorizeApi.get(
    `/moderator/partner-submissions/${id}/evidence`,
    { responseType: "blob" }
  )
  return res.data
}

