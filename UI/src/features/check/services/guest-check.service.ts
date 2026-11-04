import { publicApi } from "@/lib/api/instance"
import type {
  GuestCheckRequest,
  GuestCheckResult,
  GuestQuota,
  GuestSession,
} from "../types/guest-check.types"

interface ApiResponse<T> {
  isSuccess: boolean
  message: string
  data: T
}

function unwrap<T>(response: ApiResponse<T>): T {
  if (!response.isSuccess || response.data == null) {
    throw new Error(response.message || "Không thể xử lý yêu cầu.")
  }
  return response.data
}

const STORAGE_KEY = "scamshield.guest-session"
let memoryToken: string | null = null
let sessionRequest: Promise<GuestSession> | null = null

// Deduplicate initialization across mounts, including React Strict Mode.
export function restoreGuestSession(): Promise<GuestSession> {
  if (sessionRequest) return sessionRequest
  let sessionToken = memoryToken
  try {
    sessionToken = localStorage.getItem(STORAGE_KEY) || sessionToken
  } catch {
    // Storage can be unavailable; keep the session for this browser tab.
  }
  sessionRequest = publicApi
    .post<ApiResponse<GuestSession>>("/guest/sessions", { sessionToken })
    .then(({ data }) => {
      const session = unwrap(data)
      memoryToken = session.sessionToken
      try {
        localStorage.setItem(STORAGE_KEY, session.sessionToken)
      } catch {
        // The in-memory token still preserves quota within this tab.
      }
      return session
    })
    .finally(() => {
      sessionRequest = null
    })
  return sessionRequest
}

export async function getGuestQuota(token: string): Promise<GuestQuota> {
  const { data } = await publicApi.get<ApiResponse<GuestQuota>>(
    "/guest/quota",
    {
      headers: { "X-Guest-Session": token },
    }
  )
  return unwrap(data)
}

export async function submitGuestCheck(
  token: string,
  request: GuestCheckRequest
): Promise<GuestCheckResult> {
  const { data } = await publicApi.post<ApiResponse<GuestCheckResult>>(
    "/scam-checks",
    request,
    { headers: { "X-Guest-Session": token }, timeout: 90000 }
  )
  return unwrap(data)
}
