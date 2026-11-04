import {
  CheckScanRequest,
  CheckScanResponse,
} from "../types/check.types"

// Case 1: Phishing Link Mạo danh Ngân hàng & Ép Sinh trắc học (High Risk - Tier 1 Fast-Path)
export const MOCK_CASE_1_PHISHING_FASTPATH: CheckScanResponse = {
  status: "success",
  scan_id: "SCAN-T1-FAST-20261104-01",
  created_at: new Date().toISOString(),
  execution_provenance: "TIER1_FAST_PATH",
  execution_time_ms: 38.2,
  cloud_cost_usd: 0.0,
  engine_details: {
    model_name: "Bộ nhận diện cục bộ (ViSoBERT INT8)",
    runtime_type: "ONNX_INT8_EDGE",
  },
  verdict: {
    risk_level: "DANGEROUS",
    risk_score: 96,
    confidence_level: "HIGH",
    confidence: 0.965,
    scam_type: "Mạo danh liên kết ngân hàng & Đe dọa khóa tài khoản",
    summary:
      "Phát hiện tên miền lừa đảo giả mạo cổng ngân hàng và thủ đoạn đe dọa khóa tài khoản để ép người dùng nhập thông tin bảo mật.",
  },
  deterministic_features: {
    url_analysis: {
      detected_urls: ["https://vcb-sinhtrachoc.top"],
      is_in_official_whitelist: false,
      domain_reputation: "MALICIOUS_SIMILARITY",
    },
    urgency_indicators: {
      matched_keywords: ["trong 24h", "khoa vinh vien", "tam khoa"],
      urgency_score: 95,
    },
    visobert_token_attribution: [
      { token: "vcb-sinhtrachoc.top", weight: 0.48 },
      { token: "bi tam khoa", weight: 0.22 },
      { token: "khoa vinh vien", weight: 0.19 },
    ],
  },
  guidance_type: "STATIC_SOP",
  actionable_steps: [
    "Ngân hàng không gửi đường link qua SMS để yêu cầu cập nhật sinh trắc học theo Quyết định 2345/QĐ-NHNN.",
    "Khuyên bạn không nhấp vào liên kết lạ và không cung cấp mã OTP hay thông tin đăng nhập ngân hàng.",
    "Nếu đã lỡ nhập thông tin: Gọi ngay hotline Vietcombank 1900 54 54 13 để được hỗ trợ kiểm tra tài khoản.",
  ],
  tier_executed: 1,
  recommendations: [
    "Ngân hàng không gửi đường link qua SMS để yêu cầu cập nhật sinh trắc học theo Quyết định 2345/QĐ-NHNN.",
    "Khuyên bạn không nhấp vào liên kết lạ và không cung cấp mã OTP hay thông tin đăng nhập ngân hàng.",
    "Nếu đã lỡ nhập thông tin: Gọi ngay hotline Vietcombank 1900 54 54 13 để được hỗ trợ kiểm tra tài khoản.",
  ],
}

// Case 2: Tin nhắn OTP Ngân hàng Hợp pháp (Safe - Tier 1 Fast-Path)
export const MOCK_CASE_2_SAFE_OTP_FASTPATH: CheckScanResponse = {
  status: "success",
  scan_id: "SCAN-T1-SAFE-20261104-02",
  created_at: new Date().toISOString(),
  execution_provenance: "TIER1_FAST_PATH",
  execution_time_ms: 34.1,
  cloud_cost_usd: 0.0,
  engine_details: {
    model_name: "Bộ nhận diện cục bộ (ViSoBERT INT8)",
    runtime_type: "ONNX_INT8_EDGE",
  },
  verdict: {
    risk_level: "SAFE",
    risk_score: 1,
    confidence_level: "HIGH",
    confidence: 0.992,
    scam_type: "Thông báo biến động số dư & Mã OTP chính danh",
    summary:
      "Nằm trong ngưỡng an toàn tuyệt đối. Cấu trúc mã OTP chuẩn Brandname ngân hàng, thông báo biến động chuẩn và không chứa liên kết độc hại.",
  },
  deterministic_features: {
    url_analysis: {
      detected_urls: [],
      is_in_official_whitelist: true,
      domain_reputation: "LEGITIMATE",
    },
    otp_structure: {
      has_otp_pattern: true,
      pattern_matched: "128492 (Chuỗi 6 chữ số hợp chuẩn SmartBanking)",
    },
    brand_identity: {
      sender_header: "VCB",
      is_registered_brandname: true,
    },
    urgency_indicators: {
      matched_keywords: ["TUYET DOI KHONG chia se"],
      urgency_score: 0,
    },
  },
  guidance_type: "STATIC_SOP",
  actionable_steps: [
    "Mã OTP chỉ có giá trị khi chính bạn đang chủ động thao tác giao dịch chuyển tiền.",
    "Nhân viên ngân hàng KHÔNG BAO GIỜ gọi điện yêu cầu cung cấp mã OTP dưới bất kỳ hình thức nào.",
    "Nếu bạn KHÔNG thao tác giao dịch này: Hãy chủ động đổi mật khẩu Digibank ngay lập tức.",
  ],
  tier_executed: 1,
  recommendations: [
    "Mã OTP chỉ có giá trị khi chính bạn đang chủ động thao tác giao dịch chuyển tiền.",
    "Nhân viên ngân hàng KHÔNG BAO GIỜ gọi điện yêu cầu cung cấp mã OTP dưới bất kỳ hình thức nào.",
    "Nếu bạn KHÔNG thao tác giao dịch này: Hãy chủ động đổi mật khẩu Digibank ngay lập tức.",
  ],
}

// Case 3: Thao túng Xã hội / Mượn nợ Người quen Số lạ (Suspicious -> Tier 2 Forensic Council)
export const MOCK_CASE_3_COUNCIL_SUSPICIOUS: CheckScanResponse = {
  status: "success",
  scan_id: "SCAN-T2-COUNCIL-20261104-03",
  created_at: new Date().toISOString(),
  execution_provenance: "TIER2_FORENSIC_COUNCIL",
  execution_time_ms: 1140.0,
  cloud_cost_usd: 0.0032,
  engine_details: {
    model_name: "Hệ thống Chuyên gia AI Đa tác tử",
    runtime_type: "CLOUD_LLM_COUNCIL",
  },
  verdict: {
    risk_level: "DANGEROUS",
    risk_score: 84,
    confidence_level: "HIGH",
    confidence: 0.84,
    scam_type: "Thao túng tâm lý & Mạo danh người quen mượn tiền khẩn cấp",
    summary:
      "Hệ thống AI đa chiều ghi nhận có dấu hiệu mạo danh người quen mượn tiền khẩn cấp và số tài khoản thụ hưởng bất thường mang tên người khác.",
  },
  council_deliberation: {
    cyber_banking_specialist: {
      stance: "SCAM",
      rationale:
        "Mâu thuẫn danh tính cốt lõi: Người gửi xưng tên là 'Hùng' nhưng STK thụ hưởng tại MB lại mang tên 'Nguyen Van B' (Dấu hiệu điển hình của tài khoản thuê mướn / Money Mule).",
      model_used: "gpt-6.1-sol (Primary Maker)",
    },
    psycho_teencode_specialist: {
      stance: "SCAM",
      manipulation_tactic: "Bình phong khẩn cấp bệnh viện + Bị giật điện thoại",
      rationale:
        "Kịch bản 'bị giật điện thoại' là bình phong quen thuộc nhằm hợp thức hóa việc dùng số lạ và ngăn cản nạn nhân gọi điện thoại trực tiếp để đối chất giọng nói.",
      model_used: "gemini-3.8-flash (Primary Checker)",
    },
    public_defender: {
      stance: "SUSPICIOUS",
      exculpatory_evidence:
        "Tin nhắn không chứa liên kết URL độc hại, không đính kèm file mã độc APK. Tuy nhiên mức độ rủi ro mạo danh tài chính quá lớn.",
      rationale:
        "Không có mã độc hay URL lừa đảo. Tuy nhiên xác suất gian lận mạo danh người thân là rất lớn. Khuyến nghị liên hệ xác thực chéo trước khi thực hiện giao dịch.",
      model_used: "gpt-6.1-sol (Public Defender Sovereign Seat)",
    },
    final_synthesis:
      "Các chuyên gia AI đạt mức đồng thuận cao (84/100). Đã áp dụng cơ chế bảo vệ của Public Defender, khuyến nghị người dùng chưa vội chuyển khoản qua tài khoản trung gian.",
    consensus_ratio: "3/3 Chuyên gia AI đồng thuận",
  },
  guidance_type: "DYNAMIC_CONTEXTUAL",
  actionable_steps: [
    "Khuyến nghị CHƯA chuyển tiền vào tài khoản mang tên lạ 'Nguyen Van B'.",
    "Gọi điện thoại trực tiếp vào số cũ của người bạn tên Hùng hoặc người nhà bạn đó để xác minh xem có thực sự vừa bị cướp điện thoại hay không.",
    "Đặt 1 câu hỏi bí mật riêng tư mà chỉ 2 người biết để đối chất nếu đối tượng vẫn tiếp tục giục giã.",
  ],
  tier_executed: 2,
  recommendations: [
    "Khuyến nghị CHƯA chuyển tiền vào tài khoản mang tên lạ 'Nguyen Van B'.",
    "Gọi điện thoại trực tiếp vào số cũ của người bạn tên Hùng hoặc người nhà bạn đó để xác minh xem có thực sự vừa bị cướp điện thoại hay không.",
    "Đặt 1 câu hỏi bí mật riêng tư mà chỉ 2 người biết để đối chất nếu đối tượng vẫn tiếp tục giục giã.",
  ],
}

// Case 4: Không Đủ Dữ Liệu & Rớt Mạng Cloud (Epistemic Caution: Tri-State UNKNOWN)
export const MOCK_CASE_4_UNKNOWN_OFFLINE: CheckScanResponse = {
  status: "success",
  scan_id: "SCAN-T1-UNKNOWN-20261104-04",
  created_at: new Date().toISOString(),
  execution_provenance: "TRI_STATE_UNKNOWN",
  execution_time_ms: 42.5,
  cloud_cost_usd: 0.0,
  engine_details: {
    model_name: "ViSoBERT INT8 Edge (Offline Circuit Breaker)",
    runtime_type: "OFFLINE_FALLBACK",
  },
  verdict: {
    risk_level: "UNKNOWN",
    risk_score: null,
    confidence_level: "LOW",
    confidence: 0.45,
    scam_type: "Nội Dung Chưa Đủ Căn Cứ Đánh Giá An Toàn",
    summary:
      "Dữ liệu hiện tại chưa đủ cơ sở chứng minh tin nhắn có yếu tố lừa đảo hay an toàn. Hệ thống giữ nguyên tắc thận trọng để tránh kết luận vội vàng.",
  },
  deterministic_features: {
    url_analysis: {
      detected_urls: [],
      is_in_official_whitelist: true,
      domain_reputation: "LEGITIMATE",
    },
    brand_identity: {
      sender_header: "Chưa đăng ký Brandname",
      is_registered_brandname: false,
    },
    urgency_indicators: {
      matched_keywords: [],
      urgency_score: 15,
    },
  },
  guidance_type: "EPISTEMIC_CAUTION",
  actionable_steps: [
    "Hãy tự nhớ lại xem gần đây bạn có thực sự nộp hồ sơ xin việc ở đâu hay không.",
    "Nếu gọi lại: Lưu ý không đọc số CCCD, không cung cấp mã OTP, và không nộp bất kỳ khoản tiền đặt cọc nào trước khi được phỏng vấn trực tiếp.",
    "Thử kiểm tra lại kết nối mạng Internet và bấm Phân tích lại để hệ thống AI phân tích sâu hơn.",
  ],
  tier_executed: 1,
  recommendations: [
    "Hãy tự nhớ lại xem gần đây bạn có thực sự nộp hồ sơ xin việc ở đâu hay không.",
    "Nếu gọi lại: Lưu ý không đọc số CCCD, không cung cấp mã OTP, và không nộp bất kỳ khoản tiền đặt cọc nào trước khi được phỏng vấn trực tiếp.",
    "Thử kiểm tra lại kết nối mạng Internet và bấm Phân tích lại để hệ thống AI phân tích sâu hơn.",
  ],
}

// Map for quick reference
export const MOCK_USE_CASES = {
  CASE_1_PHISHING_FASTPATH: MOCK_CASE_1_PHISHING_FASTPATH,
  CASE_2_SAFE_OTP_FASTPATH: MOCK_CASE_2_SAFE_OTP_FASTPATH,
  CASE_3_COUNCIL_SUSPICIOUS: MOCK_CASE_3_COUNCIL_SUSPICIOUS,
  CASE_4_UNKNOWN_OFFLINE: MOCK_CASE_4_UNKNOWN_OFFLINE,
}

// Backwards-compatible alias for existing code
export const MOCK_HIGH_RISK_RESULT = MOCK_CASE_1_PHISHING_FASTPATH

/**
 * Intelligent Mock matcher: returns the corresponding canon use case based on input text keywords.
 */
export function getMockResponseForContent(content: string): CheckScanResponse {
  const lower = content.toLowerCase()

  if (
    lower.includes("vcb-sinhtrachoc") ||
    lower.includes("sinh trac hoc") ||
    lower.includes("tam khoa") ||
    lower.includes("qd 2345") ||
    lower.includes("khoa vinh vien")
  ) {
    return MOCK_CASE_1_PHISHING_FASTPATH
  }

  if (
    lower.includes("ma xac thuc") ||
    lower.includes("otp") ||
    lower.includes("smartbanking") ||
    lower.includes("tuyet doi khong")
  ) {
    return MOCK_CASE_2_SAFE_OTP_FASTPATH
  }

  if (
    lower.includes("hung ban cap 3") ||
    lower.includes("benh vien") ||
    lower.includes("giat") ||
    lower.includes("nguyen van b") ||
    lower.includes("muon nho")
  ) {
    return MOCK_CASE_3_COUNCIL_SUSPICIOUS
  }

  if (
    lower.includes("ung tuyen") ||
    lower.includes("ho so") ||
    lower.includes("goi lai") ||
    lower.includes("ranh thi goi")
  ) {
    return MOCK_CASE_4_UNKNOWN_OFFLINE
  }

  // Default fallback
  return MOCK_CASE_1_PHISHING_FASTPATH
}

/**
 * Main Check Scam Service:
 * Attempts to call the Live Python FastAPI Bridge if configured and online;
 * otherwise gracefully falls back to the canonical verified 4 Use Cases mock dataset.
 */
export async function checkScamContent(
  payload?: CheckScanRequest
): Promise<CheckScanResponse> {
  const content = payload?.content || ""
  const lower = content.toLowerCase()
  const isSocialEngineeringOrMule =
    lower.includes("hung ban cap 3") ||
    lower.includes("nguyen van b") ||
    lower.includes("muon nho") ||
    lower.includes("benh vien") ||
    lower.includes("bi giat") ||
    lower.includes("so tk")
  const forceTier2 = payload?.force_tier2 || isSocialEngineeringOrMule

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== "undefined" && window.location.hostname === "localhost"
      ? "http://localhost:8001"
      : null)

  if (apiUrl) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const response = await fetch(`${apiUrl}/api/v1/scan`, {
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
    } catch {
      // Live API Bridge not available or timed out; fall back gracefully to local deterministic mocks
    }
  }

  // Local Mock Simulation with realistic latency
  await new Promise((resolve) => setTimeout(resolve, 350))
  return getMockResponseForContent(content)
}
