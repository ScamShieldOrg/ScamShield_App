import axios from "axios"
import { authorizeApi } from "@/lib/api/instance"
import type { ScamCheckResult } from "../types/scam-check.types"
import {
  CheckScanRequest,
  CheckScanResponse,
  DeterministicFeatures,
  RiskLevel,
  ExecutionProvenance,
} from "../types/check.types"

const OFFICIAL_WHITELIST_DOMAINS = [
  "vietcombank.com.vn",
  "bidv.com.vn",
  "vietinbank.vn",
  "agribank.com.vn",
  "techcombank.com",
  "techcombank.com.vn",
  "mbbank.com.vn",
  "acb.com.vn",
  "vpbank.com.vn",
  "tpb.vn",
  "sacombank.com.vn",
  "vib.com.vn",
  "hdbank.com.vn",
  "shb.com.vn",
  "seabank.com.vn",
  "lpbank.com.vn",
  "msb.com.vn",
  "ocb.com.vn",
  "eximbank.com.vn",
  "viettel.com.vn",
  "vietteltelecom.vn",
  "vnpt.com.vn",
  "vinaphone.com.vn",
  "mobifone.vn",
  "dichvucong.gov.vn",
  "chinhphu.vn",
  "mps.gov.vn",
  "sbv.gov.vn",
  "vneid.gov.vn",
]

const CLIENT_URL_REGEX =
  /https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|(?<![\w@.])(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:com|net|org|info|biz|vn|io|co|me|to|cc|tv|xyz|top|vip|shop|online|site|club|app|link|live|store|asia|tk|ml|ga|cf|gq|icu|cyou|bond|sbs|click|fun|pro|win|bet|best|life|world|today|news|space|website|tech|dev|ly|gl|gd|in|us|uk|cn|ru)\b(?:\/[^\s<>"']*)?/g

const CLIENT_PHONE_REGEX =
  /(?<!\d)(?:(?:\+84|0)[35789]\d{8}|(?:1800|1900)\d{4,6})(?!\d)/g

function extractFallbackFeatures(
  content: string,
  decidedByStage?: string
): DeterministicFeatures | null {
  if (!content || !content.trim()) return null

  const ignored = new Set(["e.g", "i.e", "tp.hcm", "tp.hn"])
  const rawUrls = content.match(CLIENT_URL_REGEX) || []
  const urls = Array.from(
    new Set(
      rawUrls
        .map((m) => m.trim().replace(/[.,;:!?)'"]+$/g, ""))
        .filter(
          (c) =>
            c &&
            !ignored.has(c.toLowerCase()) &&
            !/^\d+\.\d+$/.test(c) &&
            !c.includes("@")
        )
    )
  )

  const rawPhones = content.match(CLIENT_PHONE_REGEX) || []
  const phones = Array.from(new Set(rawPhones.map((p) => p.trim())))

  let isWhitelist = decidedByStage === "WHITELIST"
  if (urls.length > 0 && !isWhitelist && decidedByStage !== "BLACKLIST") {
    isWhitelist = urls.some((u) => {
      try {
        const full = u.includes("://") ? u : `http://${u}`
        const host = new URL(full).hostname.toLowerCase()
        return OFFICIAL_WHITELIST_DOMAINS.some(
          (d) => host === d || host.endsWith(`.${d}`)
        )
      } catch {
        return false
      }
    })
  }

  return {
    url_analysis: {
      detected_urls: urls,
      is_in_official_whitelist: urls.length > 0 ? isWhitelist : true,
      domain_reputation:
        urls.length === 0
          ? "LEGITIMATE"
          : isWhitelist
            ? "LEGITIMATE"
            : "MALICIOUS_SIMILARITY",
    },
    phone_analysis: {
      detected_phones: phones,
      is_official_hotline: phones.some(
        (p) => p.startsWith("1800") || p.startsWith("1900")
      ),
      phone_type: phones.some(
        (p) => p.startsWith("1800") || p.startsWith("1900")
      )
        ? "HOTLINE"
        : phones.length > 0
          ? "PERSONAL_MOBILE"
          : "NONE",
    },
    urgency_indicators: {
      matched_keywords: [],
      urgency_score: 0,
    },
  }
}

/**
 * Vietnamese label used when the backend did not name the scam type itself.
 * BANK_ACCOUNT checks are directory lookups only, so their wording never
 * implies an AI judgement.
 */
function fallbackScamType(riskLevel: RiskLevel, resolvedType: string): string {
  const isPhone = resolvedType === "PHONE"
  const isUrl = resolvedType === "URL"
  const isBank = resolvedType === "BANK_ACCOUNT"

  if (riskLevel === "DANGEROUS") {
    if (isPhone) return "Số điện thoại có nguy cơ lừa đảo / làm phiền"
    if (isUrl) return "Đường dẫn (URL) độc hại / giả mạo"
    if (isBank) return "Số tài khoản có dấu hiệu lừa đảo"
    return "Cảnh báo nguy cơ lừa đảo"
  }
  if (riskLevel === "SAFE") {
    if (isPhone) return "Số điện thoại chính thức đã xác minh"
    if (isUrl) return "Đường dẫn (URL) chính thức đã xác thực"
    if (isBank) return "Số tài khoản thuộc danh bạ đã xác minh"
    return "Tin nhắn an toàn"
  }
  if (isPhone) return "Số điện thoại cần kiểm chứng thêm"
  if (isUrl) return "Đường dẫn (URL) cần kiểm chứng thêm"
  if (isBank) return "Số tài khoản chưa có trong danh bạ xác minh"
  return "Nội dung cần kiểm chứng"
}

/**
 * Vietnamese summary used when the backend returned no explanation.
 * Never claims a tier or an AI verdict that did not run.
 */
function fallbackSummary(riskLevel: RiskLevel, resolvedType: string): string {
  const isPhone = resolvedType === "PHONE"
  const isUrl = resolvedType === "URL"
  const isBank = resolvedType === "BANK_ACCOUNT"

  if (riskLevel === "DANGEROUS") {
    if (isPhone)
      return "Hệ thống ghi nhận số điện thoại này trong danh sách cảnh báo hoặc có dấu hiệu mạo danh."
    if (isUrl)
      return "Hệ thống phát hiện đường dẫn này có dấu hiệu lừa đảo hoặc chứa mã độc đánh cắp thông tin."
    if (isBank)
      return "Hệ thống ghi nhận số tài khoản này trong danh sách cảnh báo lừa đảo đã được xác minh."
    return "Hệ thống phát hiện dấu hiệu rủi ro cao trong nội dung kiểm tra."
  }
  if (riskLevel === "SAFE") {
    if (isPhone)
      return "Số điện thoại thuộc danh bạ đối tác chính thức đã được chứng thực."
    if (isUrl)
      return "Đường dẫn thuộc danh bạ tên miền chính thức đã được chứng thực."
    if (isBank) return "Số tài khoản khớp với danh bạ đối tác đã được xác minh."
    return "Nội dung khớp với thông báo thông thường, không phát hiện dấu hiệu lừa đảo."
  }
  if (isBank)
    return "Số tài khoản chưa có trong danh bạ xác minh. Hệ thống chỉ đối chiếu danh sách cảnh báo và danh bạ đã xác minh, nên hãy kiểm chứng thêm trước khi chuyển tiền."
  return "Chưa đủ dữ liệu để kết luận chắc chắn. Khuyến nghị kiểm chứng thêm."
}

/**
 * Maps Spring Boot Backend ScamCheckResult DTO into UI CheckScanResponse contract.
 * Guarantees nested verdict object with risk_level and prevents undefined fields.
 */
export function mapBackendDtoToScanResponse(
  backendData: ScamCheckResult,
  executionTimeMs: number,
  inputTypeOverride?: string,
  rawInputContent?: string
): CheckScanResponse {
  if (!backendData || typeof backendData !== "object" || !backendData.verdict) {
    throw new Error("Dữ liệu phản hồi từ máy chủ kiểm tra không hợp lệ.")
  }

  const ai = backendData.aiDetails
  const rawVerdict = String(backendData.verdict).toUpperCase()
  const resolvedType = (
    inputTypeOverride ||
    backendData.inputType ||
    ""
  ).toUpperCase()

  // 1. Determine risk level
  let riskLevel: RiskLevel = "UNKNOWN"
  if (ai?.verdict?.riskLevel) {
    const aiRisk = ai.verdict.riskLevel.toUpperCase()
    if (aiRisk === "DANGEROUS" || aiRisk === "SCAM_RISK")
      riskLevel = "DANGEROUS"
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

  // 2. Determine risk score (0-100, or null when the backend did not score it)
  // Never synthesise a score from the risk level: the backend is the only
  // source of truth, so unknown stays unknown in the UI.
  const riskScore: number | null =
    ai?.verdict?.riskScore != null
      ? Math.round(Number(ai.verdict.riskScore))
      : null

  // 3. Determine scam type & summary
  const scamType =
    ai?.verdict?.scamType ||
    backendData.categoryCode ||
    fallbackScamType(riskLevel, resolvedType)

  const summary =
    ai?.verdict?.summary ||
    backendData.explanation ||
    fallbackSummary(riskLevel, resolvedType)

  // 4. Execution provenance — derived only from signals the backend actually
  // reported. Tier 2 is claimed when the forensic council really ran, tier 1
  // only when a curated / AI fast-path decision exists. Anything else stays
  // explicitly unknown instead of being defaulted to a tier.
  const decidedByStage = (backendData.decidedByStage || "").toUpperCase()
  const councilExecuted =
    ai?.tierExecuted === 2 ||
    ai?.councilAudit != null ||
    decidedByStage.includes("TIER2") ||
    decidedByStage.includes("COUNCIL") ||
    decidedByStage.includes("LLM")
  const curatedDecision =
    backendData.matchedIndicator != null ||
    decidedByStage.includes("BLACKLIST") ||
    decidedByStage.includes("WHITELIST") ||
    decidedByStage.includes("VISOBERT") ||
    ai?.tierExecuted === 1

  const provenance: ExecutionProvenance = councilExecuted
    ? "TIER2_FORENSIC_COUNCIL"
    : curatedDecision
      ? "TIER1_FAST_PATH"
      : "TRI_STATE_UNKNOWN"

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

  const council = ai?.councilDeliberation || ai?.council_deliberation || null

  const features =
    ai?.deterministicFeatures ||
    ai?.deterministic_features ||
    (rawInputContent
      ? extractFallbackFeatures(rawInputContent, backendData.decidedByStage)
      : null)

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
    // Pass the persisted check id through so the action bar can deep-link to
    // the report form and the history detail page.
    check_id: Number(backendData.checkId) || 0,
    created_at:
      ai?.createdAt ||
      (backendData.createdAt
        ? String(backendData.createdAt)
        : new Date().toISOString()),
    execution_provenance: provenance,
    // Caller-measured wall-clock duration, passed through unchanged.
    execution_time_ms: executionTimeMs,
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
        riskLevel === "DANGEROUS" || riskLevel === "SAFE" ? "HIGH" : "MEDIUM",
    },
    guidance_type:
      ai?.tierExecuted === 2
        ? "DYNAMIC_CONTEXTUAL"
        : riskLevel === "UNKNOWN"
          ? "EPISTEMIC_CAUTION"
          : "STATIC_SOP",
    actionable_steps: actionableSteps,
    // Only report a tier the backend actually executed; never invent tier 1.
    tier_executed: ai?.tierExecuted,
    recommendations: actionableSteps,
    input_type: resolvedType || "TEXT",
    matched_indicator: backendData.matchedIndicator,
    decided_by_stage: backendData.decidedByStage,
    unknown_reason: backendData.unknownReason,
    council_deliberation: council || undefined,
    deterministic_features: features || undefined,
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

  // BANK_ACCOUNT is a real backend input type: map it explicitly instead of
  // silently degrading it to MESSAGE (account numbers are not AI content).
  const payloadType = payload?.check_type
  const inputType =
    payloadType === "URL" ||
    payloadType === "PHONE" ||
    payloadType === "BANK_ACCOUNT"
      ? payloadType
      : "MESSAGE"

  const headers: Record<string, string> = {}
  if (guestToken) {
    headers["X-Guest-Session"] = guestToken
  }

  const startTime =
    typeof performance !== "undefined" ? performance.now() : Date.now()

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
        // Tier 2 (AI council) runs synchronously server-side; the backend allows
        // up to 60s, so the client must wait longer than that before aborting.
        timeout: 90000,
      }
    )

    const elapsedMs =
      (typeof performance !== "undefined" ? performance.now() : Date.now()) -
      startTime

    if (res?.isSuccess && res.data) {
      return mapBackendDtoToScanResponse(
        res.data,
        elapsedMs,
        inputType,
        content.trim()
      )
    }

    throw new Error(res?.message || "Không thể hoàn tất phân tích.")
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      if (err.code === "ECONNABORTED") {
        throw new Error(
          "Yêu cầu phân tích bị quá thời gian chờ (Timeout). Vui lòng thử lại."
        )
      }
      const serverMessage = (
        err.response?.data as { message?: string } | undefined
      )?.message
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
export async function getScamCheckResult(
  checkId: number
): Promise<ScamCheckResult> {
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
