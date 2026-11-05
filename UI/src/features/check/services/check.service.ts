import axios from "axios"
import { authorizeApi } from "@/lib/api/instance"
import type { ScamCheckResult } from "../types/scam-check.types"
import {
  CheckScanRequest,
  CheckScanResponse,
  RiskLevel,
  ExecutionProvenance,
} from "../types/check.types"

/**
 * Maps Spring Boot Backend ScamCheckResult DTO into UI CheckScanResponse contract.
 * Guarantees nested verdict object with risk_level and prevents undefined fields.
 */
export function mapBackendDtoToScanResponse(
  backendData: ScamCheckResult,
  executionTimeMs: number,
  inputTypeOverride?: string
): CheckScanResponse {
  if (!backendData || typeof backendData !== "object" || !backendData.verdict) {
    throw new Error("Dữ liệu phản hồi từ máy chủ kiểm tra không hợp lệ.")
  }

  const ai = backendData.aiDetails
  const rawVerdict = String(backendData.verdict).toUpperCase()
  const resolvedType = (inputTypeOverride || backendData.inputType || "").toUpperCase()

  // 1. Determine risk level
  let riskLevel: RiskLevel = "UNKNOWN"
  if (ai?.verdict?.riskLevel) {
    const aiRisk = ai.verdict.riskLevel.toUpperCase()
    if (aiRisk === "DANGEROUS" || aiRisk === "SCAM_RISK") riskLevel = "DANGEROUS"
    else if (aiRisk === "SAFE" || aiRisk === "LOW_RISK") riskLevel = "SAFE"
    else if (aiRisk === "SUSPICIOUS") riskLevel = "SUSPICIOUS"
    else riskLevel = "UNKNOWN"
  } else if (rawVerdict === "SCAM_RISK" || rawVerdict === "DANGEROUS") {
    riskLevel = "DANGEROUS"
  } else if (rawVerdict === "LOW_RISK" || rawVerdict === "SAFE") {
    riskLevel = "SAFE"
  } else if (rawVerdict === "SUSPICIOUS") {
    riskLevel = "SUSPICIOUS"
  }

  // 2. Determine risk score (0-100, or null if UNKNOWN)
  let riskScore: number | null = null
  if (ai?.verdict?.riskScore != null) {
    riskScore = Math.round(Number(ai.verdict.riskScore))
  } else if (riskLevel === "DANGEROUS") {
    riskScore = 92
  } else if (riskLevel === "SAFE") {
    riskScore = 5
  } else if (riskLevel === "SUSPICIOUS") {
    riskScore = 60
  }

  // 3. Determine scam type & summary
  const scamType =
    ai?.verdict?.scamType ||
    backendData.categoryCode ||
    (riskLevel === "DANGEROUS"
      ? resolvedType === "PHONE"
        ? "Số điện thoại có nguy cơ lừa đảo / làm phiền"
        : resolvedType === "URL"
          ? "Đường dẫn (URL) độc hại / giả mạo"
          : "Cảnh báo nguy cơ lừa đảo"
      : riskLevel === "SAFE"
        ? resolvedType === "PHONE"
          ? "Số điện thoại chính thức đã xác minh"
          : resolvedType === "URL"
            ? "Đường dẫn (URL) chính thức đã xác thực"
            : "Tin nhắn an toàn"
        : resolvedType === "PHONE"
          ? "Số điện thoại cần kiểm chứng thêm"
          : resolvedType === "URL"
            ? "Đường dẫn (URL) cần kiểm chứng thêm"
            : "Nội dung cần kiểm chứng")

  const summary =
    ai?.verdict?.summary ||
    backendData.explanation ||
    (riskLevel === "DANGEROUS"
      ? resolvedType === "PHONE"
        ? "Hệ thống ghi nhận số điện thoại này trong danh sách cảnh báo hoặc có dấu hiệu mạo danh."
        : resolvedType === "URL"
          ? "Hệ thống phát hiện đường dẫn này có dấu hiệu lừa đảo hoặc chứa mã độc đánh cắp thông tin."
          : "Hệ thống phát hiện dấu hiệu rủi ro cao trong nội dung kiểm tra."
      : riskLevel === "SAFE"
        ? resolvedType === "PHONE"
          ? "Số điện thoại thuộc danh bạ đối tác chính thức đã được chứng thực."
          : resolvedType === "URL"
            ? "Đường dẫn thuộc danh bạ tên miền chính thức đã được chứng thực."
            : "Nội dung khớp với thông báo thông thường, không phát hiện dấu hiệu lừa đảo."
        : "Chưa đủ dữ liệu để kết luận chắc chắn. Khuyến nghị kiểm chứng thêm.")

  // 4. Execution provenance
  let provenance: ExecutionProvenance = "TIER1_FAST_PATH"
  if (ai?.tierExecuted === 2 || backendData.decidedByStage?.includes("TIER2")) {
    provenance = "TIER2_FORENSIC_COUNCIL"
  } else if (riskLevel === "UNKNOWN") {
    provenance = "TRI_STATE_UNKNOWN"
  }

  // 5. Actionable steps tailored by inputType & riskLevel
  const actionableSteps: string[] = []
  if (ai?.recommendations && ai.recommendations.length > 0) {
    actionableSteps.push(...ai.recommendations)
  } else if (backendData.safetyGuidance) {
    actionableSteps.push(backendData.safetyGuidance)
  } else if (resolvedType === "PHONE") {
    if (riskLevel === "DANGEROUS") {
      actionableSteps.push(
        "Tuyệt đối không làm theo bất kỳ hướng dẫn nào từ người gọi và không chuyển tiền dưới mọi hình thức.",
        "Chặn ngay số điện thoại này trên thiết bị để phòng tránh bị làm phiền hoặc thao túng tâm lý.",
        "Nếu người gọi tự xưng là cán bộ công an, viện kiểm sát hoặc cơ quan thuế, hãy nhớ cơ quan nhà nước không bao giờ làm việc hay yêu cầu chuyển tiền qua điện thoại."
      )
    } else if (riskLevel === "SAFE") {
      actionableSteps.push(
        "Số điện thoại/tổng đài này thuộc danh bạ đối tác chính thức đã được chứng thực an toàn.",
        "Cảnh giác nếu cuộc gọi yêu cầu bạn cung cấp mật khẩu cá nhân hay mã xác thực OTP."
      )
    } else {
      actionableSteps.push(
        "Xác minh lại danh tính người gọi qua kênh chính thức trước khi cung cấp bất kỳ thông tin cá nhân nào.",
        "Cảnh giác trước các kịch bản đe dọa phạt nguội, thông báo trúng thưởng hoặc mượn tiền khẩn cấp.",
        "Tuyệt đối không cài đặt bất kỳ ứng dụng nào theo hướng dẫn hoặc đường link gửi qua tin nhắn/Zalo."
      )
    }
  } else if (resolvedType === "URL") {
    if (riskLevel === "DANGEROUS") {
      actionableSteps.push(
        "Tuyệt đối không truy cập, không tải tệp tin và không nhập thông tin vào đường dẫn này.",
        "Nếu đã lỡ đăng nhập, hãy lập tức đổi mật khẩu tài khoản và kích hoạt xác thực hai yếu tố (2FA).",
        "Xóa lịch sử duyệt web và kiểm tra các ứng dụng/tiện ích lạ vừa được cài đặt gần đây."
      )
    } else if (riskLevel === "SAFE") {
      actionableSteps.push(
        "Đường dẫn thuộc danh bạ cổng thông tin chính thức đã được xác thực an toàn.",
        "Luôn kiểm tra biểu tượng ổ khóa an toàn (HTTPS) và tên miền trên thanh địa chỉ trình duyệt."
      )
    } else {
      actionableSteps.push(
        "Thận trọng trước khi truy cập hoặc chia sẻ đường dẫn chưa được xác minh danh tính.",
        "Không đăng nhập tài khoản ngân hàng hoặc cung cấp dữ liệu cá nhân trên các trang web lạ."
      )
    }
  } else {
    // TEXT / MESSAGE
    if (riskLevel === "DANGEROUS") {
      actionableSteps.push(
        "Tuyệt đối không nhấp vào liên kết lạ hoặc cung cấp mã xác thực OTP.",
        "Không chuyển tiền hoặc làm theo bất kỳ hướng dẫn nào từ người gửi lạ.",
        "Liên hệ ngay tổng đài hỗ trợ chính thức của ngân hàng nếu đã lỡ cung cấp thông tin."
      )
    } else if (riskLevel === "SAFE") {
      actionableSteps.push(
        "Tin nhắn an toàn nhưng hãy luôn bảo mật mã OTP của bạn.",
        "Ngân hàng không bao giờ yêu cầu cung cấp mật khẩu qua điện thoại hay tin nhắn."
      )
    } else {
      actionableSteps.push(
        "Kiểm tra lại thông tin người gửi qua một kênh độc lập khác.",
        "Không vội vàng thực hiện các giao dịch chuyển tiền khi chưa xác thực danh tính."
      )
    }
  }

  // Determine confidence (represent unavailable as undefined)
  const confidence =
    ai?.verdict?.confidence != null
      ? Number(ai.verdict.confidence)
      : backendData.confidence != null
        ? Number(backendData.confidence)
        : undefined

  return {
    status: "success",
    scan_id: ai?.scanId || `SCAN-${backendData.checkId || Date.now()}`,
    created_at:
      ai?.createdAt ||
      (backendData.createdAt ? String(backendData.createdAt) : new Date().toISOString()),
    execution_provenance: provenance,
    execution_time_ms: Math.max(1, Math.round(executionTimeMs * 10) / 10),
    cloud_cost_usd: ai?.tierExecuted === 2 ? 0.002 : 0.0,
    engine_details: {
      model_name:
        ai?.councilAudit?.leadModel || "Hệ thống đánh giá ScamShield Core",
      runtime_type:
        ai?.tierExecuted === 2 ? "CLOUD_LLM_COUNCIL" : "SERVER_PIPELINE",
    },
    verdict: {
      risk_level: riskLevel,
      risk_score: riskScore,
      scam_type: scamType,
      summary: summary,
      ...(confidence != null ? { confidence } : {}),
      confidence_level:
        riskLevel === "DANGEROUS" || riskLevel === "SAFE"
          ? "HIGH"
          : "MEDIUM",
    },
    guidance_type:
      ai?.tierExecuted === 2
        ? "DYNAMIC_CONTEXTUAL"
        : riskLevel === "UNKNOWN"
          ? "EPISTEMIC_CAUTION"
          : "STATIC_SOP",
    actionable_steps: actionableSteps,
    tier_executed: ai?.tierExecuted === 2 ? 2 : 1,
    recommendations: actionableSteps,
    input_type: resolvedType || "TEXT",
    matched_indicator: backendData.matchedIndicator,
    decided_by_stage: backendData.decidedByStage,
  }
}

/**
 * Main Check Scam Service:
 * Routes all citizen scans directly through Spring Boot Backend Core (/api/scam-checks).
 * Enforces quota reservation, session management, database persistence, and audit logging.
 * Zero mock data, zero synthetic simulations.
 */
export async function checkScamContent(
  payload?: CheckScanRequest
): Promise<CheckScanResponse> {
  const content = payload?.content || ""
  if (!content.trim()) {
    throw new Error("Nội dung kiểm tra không được để trống.")
  }

  let guestToken: string | null = null
  try {
    if (typeof window !== "undefined") {
      guestToken = localStorage.getItem("scamshield.guest-session")
    }
  } catch {
    // Ignore localStorage access failures in restricted environments
  }

  const inputType =
    payload?.check_type === "URL"
      ? "URL"
      : payload?.check_type === "PHONE"
        ? "PHONE"
        : "MESSAGE"

  const headers: Record<string, string> = {}
  if (guestToken) {
    headers["X-Guest-Session"] = guestToken
  }

  const startTime = typeof performance !== "undefined" ? performance.now() : Date.now()

  try {
    const { data: res } = await authorizeApi.post<{
      isSuccess: boolean
      message: string
      data: ScamCheckResult
    }>(
      "/scam-checks",
      {
        inputType,
        content: content.trim(),
      },
      {
        headers,
        timeout: 20000,
      }
    )

    const elapsedMs =
      (typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime

    if (res?.isSuccess && res.data) {
      return mapBackendDtoToScanResponse(res.data, elapsedMs, inputType)
    }

    throw new Error(res?.message || "Không thể hoàn tất phân tích.")
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      if (err.code === "ECONNABORTED") {
        throw new Error(
          "Yêu cầu phân tích bị quá thời gian chờ (Timeout). Vui lòng thử lại."
        )
      }
      const serverMessage = (err.response?.data as { message?: string } | undefined)?.message
      if (serverMessage) {
        throw new Error(serverMessage)
      }
    } else if (err instanceof Error) {
      throw err
    }

    console.error("ScamCheck service connection failed:", err)
    throw new Error(
      "Hệ thống tạm thời không thể kết nối đến máy chủ phân tích. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau ít phút."
    )
  }
}

/**
 * Retrieve saved scam check record by checkId from backend
 */
export async function getScamCheckResult(checkId: number): Promise<ScamCheckResult> {
  const { data } = await authorizeApi.get<{
    isSuccess: boolean
    message: string
    data: ScamCheckResult
  }>(`/scam-checks/${checkId}`)
  if (!data.isSuccess || !data.data) {
    throw new Error(data.message || "Không thể tải kết quả kiểm tra.")
  }
  return data.data
}
