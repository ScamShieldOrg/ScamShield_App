import {
  CheckScanRequest,
  CheckScanResponse,
} from "../types/check.types"

/**
 * Main Check Scam Service:
 * Calls the live AI Pipeline / Backend service directly.
 * Zero mock data, zero synthetic simulations.
 */
export async function checkScamContent(
  payload?: CheckScanRequest
): Promise<CheckScanResponse> {
  const content = payload?.content || ""
  if (!content.trim()) {
    throw new Error("Nội dung kiểm tra không được để trống.")
  }

  const lower = content.toLowerCase()
  const isSocialEngineeringOrMule =
    lower.includes("hung ban cap 3") ||
    lower.includes("nguyen van b") ||
    lower.includes("muon nho") ||
    lower.includes("benh vien") ||
    lower.includes("bi giat") ||
    lower.includes("so tk")
  const forceTier2 = payload?.force_tier2 || isSocialEngineeringOrMule

  // Resolve API Base URL: Prefer NEXT_PUBLIC_AI_API_URL or local FastAPI bridge (port 8001), then default API URL
  const aiApiUrl =
    process.env.NEXT_PUBLIC_AI_API_URL ||
    (typeof window !== "undefined" && window.location.hostname === "localhost"
      ? "http://localhost:8001"
      : "")

  const defaultApiUrl = process.env.NEXT_PUBLIC_API_URL || ""

  // Priority 1: Call ScamShield AI Bridge / Microservice (/api/v1/scan)
  if (aiApiUrl) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000)

      const response = await fetch(`${aiApiUrl.replace(/\/+$/, "")}/api/v1/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          sender: payload?.sender,
          check_type: payload?.check_type || "TEXT",
          target_bank: payload?.target_bank,
          target_account_number: payload?.target_account_number,
          force_tier2: forceTier2,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        return data as CheckScanResponse
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error("Yêu cầu phân tích AI bị quá thời gian chờ (Timeout). Vui lòng thử lại.")
      }
      // If AI bridge direct call fails, try Spring Boot Backend fallback
    }
  }

  // Priority 2: Call Spring Boot Backend (/api/check/scam)
  if (defaultApiUrl) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000)

      const response = await fetch(`${defaultApiUrl.replace(/\/+$/, "")}/api/check/scam`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          inputType: payload?.check_type === "URL" ? "URL" : "MESSAGE",
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        return data as CheckScanResponse
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error("Yêu cầu phân tích bị quá thời gian chờ (Timeout). Vui lòng thử lại.")
      }
    }
  }

  throw new Error(
    "Không thể kết nối đến máy chủ phân tích AI. Vui lòng đảm bảo dịch vụ AI Bridge (port 8001) hoặc Backend (port 8080) đang hoạt động."
  )
}
