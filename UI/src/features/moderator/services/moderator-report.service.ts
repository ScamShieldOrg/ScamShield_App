import { authorizeApi } from "@/lib/api/instance"
import axios from "axios"
import type {
  ModeratorReportItem,
  ModeratorReportFilterParams,
  ModeratorQueueCounts,
  ModerationDecisionPayload,
  BaseApiResponse,
  PaginatedResult,
} from "../types/moderator.types"

export class ModerationApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message)
  }
}
function actionError(error: unknown): ModerationApiError {
  if (axios.isAxiosError(error))
    return new ModerationApiError(
      error.response?.data?.message ||
        "Không thể thực hiện thao tác. Vui lòng thử lại.",
      error.response?.status
    )
  return error instanceof ModerationApiError
    ? error
    : new ModerationApiError(
        error instanceof Error ? error.message : "Không thể tải báo cáo"
      )
}
function unpack<T>(body: BaseApiResponse<T>): T {
  if (!(body.isSuccess ?? body.success) || body.data == null)
    throw new ModerationApiError(body.message || "Thao tác thất bại")
  return body.data
}
export function parseReportNumericId(value: string | number): number {
  const match = String(value)
    .trim()
    .match(/^(?:CS-\d{4}-)?([1-9]\d*|0+[1-9]\d*)$/i)
  const id = match ? Number(match[1]) : 0
  if (!Number.isSafeInteger(id) || id <= 0)
    throw new ModerationApiError("Mã báo cáo không hợp lệ")
  return id
}
function normalizeReport(item: ModeratorReportItem): ModeratorReportItem {
  const labels: Record<string, ModeratorReportItem["status"]> = {
    PENDING: "Pending",
    IN_REVIEW: "In Review",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    WITHDRAWN: "Withdrawn",
  }
  return {
    ...item,
    status: labels[String(item.status).toUpperCase()] ?? item.status,
  }
}

export async function getModeratorReportQueue(
  params?: ModeratorReportFilterParams
): Promise<PaginatedResult<ModeratorReportItem>> {
  try {
    const result = unpack(
      (
        await authorizeApi.get<
          BaseApiResponse<PaginatedResult<ModeratorReportItem>>
        >("/moderator/reports", {
          params: {
            page: 0,
            size: 20,
            tab: "ALL",
            sort: "createdAt,desc",
            ...params,
          },
        })
      ).data
    )
    return { ...result, data: result.data.map(normalizeReport) }
  } catch (e) {
    throw actionError(e)
  }
}
export async function getModeratorQueueCounts(): Promise<ModeratorQueueCounts> {
  try {
    return unpack(
      (
        await authorizeApi.get<BaseApiResponse<ModeratorQueueCounts>>(
          "/moderator/reports/counts"
        )
      ).data
    )
  } catch (e) {
    throw actionError(e)
  }
}
export async function getModeratorReportById(
  id: string | number
): Promise<ModeratorReportItem> {
  try {
    return normalizeReport(
      unpack(
        (
          await authorizeApi.get<BaseApiResponse<ModeratorReportItem>>(
            `/moderator/reports/${parseReportNumericId(id)}`
          )
        ).data
      )
    )
  } catch (e) {
    throw actionError(e)
  }
}
export async function startModeratorReportReview(
  id: string | number
): Promise<ModeratorReportItem> {
  try {
    const response = await authorizeApi.post<
      BaseApiResponse<ModeratorReportItem>
    >(`/moderator/reports/${parseReportNumericId(id)}/review`)
    return normalizeReport(unpack(response.data))
  } catch (error) {
    throw actionError(error)
  }
}
export async function submitModerationDecision(
  payload: ModerationDecisionPayload
): Promise<{ success: boolean; message: string; data: ModeratorReportItem }> {
  try {
    const response = (
      await authorizeApi.put<BaseApiResponse<ModeratorReportItem>>(
        `/moderator/reports/${parseReportNumericId(payload.rawId ?? payload.reportId)}`,
        {
          decision: payload.decision,
          reason: payload.reason.trim() || undefined,
          categoryId: payload.categoryId,
        }
      )
    ).data
    const data = normalizeReport(unpack(response))
    return {
      success: true,
      message: response.message || "Đã lưu quyết định",
      data,
    }
  } catch (e) {
    throw actionError(e)
  }
}
