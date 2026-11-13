import { authorizeApi } from "@/lib/api/instance"
import {
  PartnerSubmissionItem,
  PartnerSubmissionCounts,
  SubmitPartnerAlertPayload,
  PaginatedSubmissions,
} from "../types/partner-submission.types"

export async function submitPartnerAlertOrIntel(
  payload: SubmitPartnerAlertPayload,
  file?: File | null
): Promise<PartnerSubmissionItem> {
  if (file) {
    const formData = new FormData()
    // 1. Chuẩn REST multipart của ScamShield: đính kèm JSON Blob "request"
    formData.append(
      "request",
      new Blob([JSON.stringify(payload)], { type: "application/json" })
    )
    // 2. Đồng thời append các field phẳng để tương thích đa dạng bộ giải mã
    formData.append("submissionType", payload.submissionType)
    formData.append("title", payload.title)
    formData.append("description", payload.description)
    if (payload.indicatorType) formData.append("indicatorType", payload.indicatorType)
    if (payload.indicatorValue) formData.append("indicatorValue", payload.indicatorValue)
    if (payload.categoryCode) formData.append("categoryCode", payload.categoryCode)
    if (payload.evidenceFileName) formData.append("evidenceFileName", payload.evidenceFileName)
    if (payload.evidenceUrl) formData.append("evidenceUrl", payload.evidenceUrl)
    formData.append("file", file)

    // Không hardcode Content-Type: multipart/form-data để Axios và trình duyệt tự động đính kèm boundary
    const res = await authorizeApi.post("/partner/submissions", formData)
    return res.data?.data
  }

  const res = await authorizeApi.post("/partner/submissions", payload)
  return res.data?.data
}

export async function getMySubmissions(
  status = "ALL",
  page = 0,
  size = 10
): Promise<PaginatedSubmissions<PartnerSubmissionItem>> {
  const res = await authorizeApi.get("/partner/submissions", {
    params: { status, page, size },
  })
  return res.data?.data
}

export async function getMySubmissionDetail(
  id: number
): Promise<PartnerSubmissionItem> {
  const res = await authorizeApi.get(`/partner/submissions/${id}`)
  return res.data?.data
}

export async function downloadSubmissionEvidence(id: number): Promise<Blob> {
  const res = await authorizeApi.get(`/partner/submissions/${id}/evidence`, {
    responseType: "blob",
  })
  return res.data
}
