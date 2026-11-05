"use client"

import {
  ShieldCheck,
  ShieldWarning,
  WarningCircle,
  Lightning,
  Scales,
  PhoneCall,
  PhoneSlash,
  GlobeSimple,
} from "@phosphor-icons/react"
import {
  Verdict,
  ExecutionProvenance,
  DeterministicFeatures,
  MatchedIndicatorInfo,
} from "@/features/check/types/check.types"

interface ScamVerdictBannerProps {
  verdict: Verdict
  provenance?: ExecutionProvenance
  executionTimeMs?: number
  cloudCostUsd?: number
  modelName?: string
  features?: DeterministicFeatures
  targetBank?: string | null
  inputType?: string
  matchedIndicator?: MatchedIndicatorInfo | null
  decidedByStage?: string
}

const BANK_HOTLINES: Record<string, { name: string; hotline: string }> = {
  VIETCOMBANK: { name: "Vietcombank", hotline: "1900 54 54 13" },
  BIDV: { name: "BIDV", hotline: "1900 9247" },
  MB: { name: "MB Bank", hotline: "1900 54 54 26" },
  TECHCOMBANK: { name: "Techcombank", hotline: "1800 58 88 22" },
  AGRIBANK: { name: "Agribank", hotline: "1900 55 88 18" },
  ACB: { name: "ACB", hotline: "1900 54 54 86" },
  VPBANK: { name: "VPBank", hotline: "1900 54 54 15" },
}

export function ScamVerdictBanner({
  verdict,
  provenance = "TIER1_FAST_PATH",
  executionTimeMs = 38.2,
  cloudCostUsd = 0.0,
  features,
  targetBank,
  inputType = "TEXT",
}: ScamVerdictBannerProps) {
  const isDangerous = verdict.risk_level === "DANGEROUS"
  const isSafe = verdict.risk_level === "SAFE"
  const isSuspicious = verdict.risk_level === "SUSPICIOUS"
  const isUnknown = verdict.risk_level === "UNKNOWN"
  const isAtRisk = isDangerous || isSuspicious

  const resolvedType = (inputType || "").toUpperCase()
  const isPhoneCheck = resolvedType === "PHONE"
  const isUrlCheck = resolvedType === "URL"
  const isTextCheck = !isPhoneCheck && !isUrlCheck

  // Structured signals from API response
  const rawType = (verdict.scam_type || "").toLowerCase()
  const rawSummary = (verdict.summary || "").toLowerCase()

  const hasSuspiciousUrl = Boolean(
    features?.url_analysis?.detected_urls &&
      features.url_analysis.detected_urls.length > 0 &&
      !features.url_analysis.is_in_official_whitelist
  )

  // Map identified bank if present
  const bankMatched = (() => {
    if (targetBank) return targetBank.toUpperCase()
    const sender = features?.brand_identity?.sender_header?.toLowerCase() || ""
    if (
      sender.includes("vcb") ||
      sender.includes("vietcombank") ||
      rawType.includes("vietcombank") ||
      rawSummary.includes("vietcombank")
    ) {
      return "VIETCOMBANK"
    }
    if (sender.includes("bidv") || rawType.includes("bidv") || rawSummary.includes("bidv")) {
      return "BIDV"
    }
    if (
      sender.includes("techcombank") ||
      sender.includes("tcb") ||
      rawType.includes("techcombank") ||
      rawSummary.includes("techcombank")
    ) {
      return "TECHCOMBANK"
    }
    if (
      sender.includes("mbbank") ||
      /\bmb\b/i.test(sender) ||
      rawType.includes("mb bank") ||
      rawSummary.includes("mb bank")
    ) {
      return "MB"
    }
    if (
      sender.includes("agribank") ||
      rawType.includes("agribank") ||
      rawSummary.includes("agribank")
    ) {
      return "AGRIBANK"
    }
    if (/\bacb\b/i.test(sender) || rawType.includes("acb") || rawSummary.includes("acb")) {
      return "ACB"
    }
    if (sender.includes("vpbank") || rawType.includes("vpbank") || rawSummary.includes("vpbank")) {
      return "VPBANK"
    }
    return null
  })()

  const matchedBankInfo = bankMatched ? BANK_HOTLINES[bankMatched] : null

  // Social engineering threat: strictly only for non-safe verdicts with interpersonal impersonation/manipulation in TEXT checks
  const isSocialEng =
    isTextCheck &&
    isAtRisk &&
    (rawType.includes("người quen") ||
      rawType.includes("mượn tiền") ||
      rawType.includes("thao túng") ||
      rawType.includes("tâm lý") ||
      (!hasSuspiciousUrl &&
        (rawType.includes("mạo danh") ||
          (provenance === "TIER2_FORENSIC_COUNCIL" &&
            !rawType.includes("link") &&
            !rawType.includes("liên kết")))))

  // Phishing threat: strictly only for non-safe verdicts targeting credentials or links in TEXT checks
  const isPhishing =
    isTextCheck &&
    isAtRisk &&
    !isSocialEng &&
    (hasSuspiciousUrl ||
      rawType.includes("link") ||
      rawType.includes("liên kết") ||
      rawType.includes("phishing") ||
      rawType.includes("giả mạo cổng") ||
      Boolean(matchedBankInfo) ||
      isDangerous)

  // Pure Vietnamese title without English leaks
  const hasEnglishLeak =
    rawType.length > 0 &&
    /detected|tier|heuristic|pattern|legitimate|message|forensic|council|fastpath|fast-path/i.test(
      rawType
    )

  // Dynamic Display Scam Type tailored by inputType
  const displayScamType = (() => {
    if (verdict.scam_type && !hasEnglishLeak) {
      return verdict.scam_type
    }
    if (isPhoneCheck) {
      if (isDangerous) return "Số điện thoại có nguy cơ lừa đảo / làm phiền"
      if (isSafe) return "Số điện thoại / Tổng đài chính thức đã xác minh"
      if (isSuspicious) return "Số điện thoại có dấu hiệu nghi vấn / làm phiền"
      return "Số điện thoại chưa có trong danh bạ xác minh"
    }
    if (isUrlCheck) {
      if (isDangerous) return "Đường dẫn (URL) độc hại / giả mạo"
      if (isSafe) return "Đường dẫn (URL) chính thức đã xác thực an toàn"
      if (isSuspicious) return "Đường dẫn (URL) có dấu hiệu đáng ngờ"
      return "Đường dẫn (URL) chưa có trong danh bạ xác minh"
    }
    // TEXT checks
    if (isPhishing) {
      return matchedBankInfo
        ? `Mạo danh liên kết ${matchedBankInfo.name} & Đe dọa khóa tài khoản`
        : "Mạo danh liên kết & Đe dọa khóa tài khoản"
    }
    if (isSocialEng) {
      return "Thao túng tâm lý & Mạo danh người quen mượn tiền khẩn cấp"
    }
    if (isSafe) {
      return "Thông báo biến động số dư & Mã OTP chính danh"
    }
    return "Nội dung chưa đủ căn cứ đánh giá"
  })()

  // Badge text tailored by inputType
  const badgeText = (() => {
    if (isPhoneCheck) {
      if (isDangerous) return "Dấu hiệu số điện thoại lừa đảo — Khuyến nghị chặn số"
      if (isSafe) return "Đầu số chính danh — Độ tin cậy cao"
      if (isSuspicious) return "Số điện thoại nghi vấn — Cần cảnh giác khi nghe máy"
      return "Số điện thoại chưa xác minh — Nên kiểm chứng thêm"
    }
    if (isUrlCheck) {
      if (isDangerous) return "Dấu hiệu liên kết độc hại — Tuyệt đối không truy cập"
      if (isSafe) return "Tên miền chính thức — Đã xác thực an toàn"
      if (isSuspicious) return "Đường dẫn đáng ngờ — Cần kiểm chứng nguồn gửi"
      return "Đường dẫn chưa xác minh — Cần thận trọng"
    }
    // TEXT checks
    if (isDangerous) return "Dấu hiệu rủi ro cao — Khuyến nghị kiểm tra"
    if (isSafe) return "Tin nhắn chính danh — Độ tin cậy cao"
    if (isSuspicious) return "Cần lưu ý — Có dấu hiệu mạo danh"
    return "Chưa đủ dữ liệu — Nên kiểm chứng thêm"
  })()

  // Refined chromatic palette focusing on calm authority rather than alarm fatigue
  const containerClass = isDangerous
    ? "border-rose-200 bg-rose-50/70 dark:border-rose-900/40 dark:bg-rose-950/25"
    : isSafe
      ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/25"
      : isSuspicious
        ? "border-amber-200 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/25"
        : "border-slate-300 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/40"

  const iconBgClass = isDangerous
    ? "bg-rose-600 text-white dark:bg-rose-600"
    : isSafe
      ? "bg-emerald-600 text-white dark:bg-emerald-600"
      : isSuspicious
        ? "bg-amber-600 text-white dark:bg-amber-600"
        : "bg-slate-700 text-white dark:bg-slate-700"

  const badgeBgClass = isDangerous
    ? "bg-rose-700 text-white"
    : isSafe
      ? "bg-emerald-700 text-white"
      : isSuspicious
        ? "bg-amber-700 text-white"
        : "bg-slate-700 text-white"

  const scoreTextClass = isDangerous
    ? "text-rose-700 dark:text-rose-400"
    : isSafe
      ? "text-emerald-700 dark:text-emerald-400"
      : isSuspicious
        ? "text-amber-700 dark:text-amber-400"
        : "text-slate-600 dark:text-slate-400"

  // Dynamic risk signals description based on verified features
  const riskSignals: string[] = []
  if (hasSuspiciousUrl) riskSignals.push("đường dẫn lạ ngoài hệ sinh thái chính thức")
  if ((features?.urgency_indicators?.matched_keywords?.length ?? 0) > 0)
    riskSignals.push("yếu tố thúc ép thời gian")
  if (rawType.includes("mạo danh") || rawType.includes("người quen"))
    riskSignals.push("mạo danh danh tính")

  const riskSignalsDescription =
    riskSignals.length > 0
      ? `Ghi nhận ${riskSignals.length} dấu hiệu rủi ro: ${riskSignals.join(" và ")}.`
      : "Ghi nhận dấu hiệu rủi ro cao từ phân tích nội dung bất thường."

  return (
    <div className="space-y-3">
      {/* 1. Human-Centered Status Bar (Civilian-Facing) */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-2 text-xs text-slate-700 shadow-2xs dark:border-border dark:bg-card dark:text-slate-200">
        <div className="flex items-center gap-2 font-medium">
          {provenance === "TIER1_FAST_PATH" && (
            <>
              <Lightning size={16} weight="fill" className="text-amber-500" />
              <span>Xác thực an toàn tức thì — Bảo mật riêng tư</span>
            </>
          )}
          {provenance === "TIER2_FORENSIC_COUNCIL" && (
            <>
              <Scales size={16} weight="fill" className="text-sky-600 dark:text-sky-400" />
              <span>Chuyên gia AI đa chiều — Phân tích đối soát tài chính & hành vi</span>
            </>
          )}
          {provenance === "TRI_STATE_UNKNOWN" && (
            <>
              <WarningCircle size={16} weight="fill" className="text-amber-500" />
              <span>Trạng thái thận trọng: Cần đối soát trực tiếp, tránh kết luận vội vã</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-muted-foreground">
          <span>
            Thời gian phản hồi: <strong>~{Math.round(executionTimeMs)}ms</strong>
          </span>
          <span>•</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            Không phát sinh phí
          </span>
        </div>
      </div>

      {/* 2. Main Protective Verdict Banner (Balanced 12-Column Grid) */}
      <div className={`relative overflow-hidden rounded-2xl border p-6 shadow-xs ${containerClass}`}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-stretch">
          {/* Left Column: Protective Headline, Reassurance & Action */}
          <div className="flex flex-col justify-between space-y-4 md:col-span-7 lg:col-span-8">
            <div className="flex items-start gap-4">
              <div
                className={`flex size-14 shrink-0 items-center justify-center rounded-2xl shadow-sm ${iconBgClass}`}
              >
                {isSafe && <ShieldCheck size={32} weight="fill" />}
                {isDangerous && (isPhoneCheck ? <PhoneSlash size={32} weight="fill" /> : <ShieldWarning size={32} weight="fill" />)}
                {isSuspicious && <ShieldWarning size={32} weight="fill" />}
                {isUnknown && <WarningCircle size={32} weight="fill" />}
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase ${badgeBgClass}`}
                  >
                    {badgeText}
                  </span>
                </div>

                <h2 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
                  {displayScamType}
                </h2>
              </div>
            </div>

            {/* Context-Aware Reassurance Callout (Tailored by inputType) */}
            <div className="text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-200">
              {/* --- PHONE CHECK REASSURANCE --- */}
              {isPhoneCheck && isDangerous && (
                <p className="rounded-lg bg-rose-100/70 p-3 text-pretty text-rose-900 dark:bg-rose-950/60 dark:text-rose-100">
                  <strong>Số điện thoại này đã được xác nhận trong danh sách cảnh báo lừa đảo/làm phiền</strong> hoặc có dấu hiệu mạo danh. Hãy cẩn trọng, không nghe máy, không làm theo bất kỳ hướng dẫn nào và tuyệt đối không chuyển tiền.
                </p>
              )}
              {isPhoneCheck && isSafe && (
                <p className="rounded-lg bg-emerald-100/70 p-3 text-pretty text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100">
                  Số điện thoại hoặc tổng đài này <strong>thuộc danh bạ đối tác chính thức đã được kiểm chứng an toàn</strong>. Lưu ý không bao giờ chia sẻ mã xác thực OTP hay mật khẩu tài khoản cho người gọi.
                </p>
              )}
              {isPhoneCheck && isSuspicious && (
                <p className="rounded-lg bg-amber-100/70 p-3 text-pretty text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
                  Số điện thoại có dấu hiệu nghi vấn hoặc bị báo cáo làm phiền gần đây. Hãy cẩn trọng trước các cuộc gọi đe dọa phạt nguội, yêu cầu cài ứng dụng lạ hoặc đề nghị nộp tiền.
                </p>
              )}
              {isPhoneCheck && isUnknown && (
                <p className="rounded-lg bg-slate-200/70 p-3 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                  Số điện thoại chưa có trong danh bạ xác minh chính thức. Hãy chủ động gác máy và kiểm tra lại danh tính người gọi qua các kênh liên lạc tin cậy độc lập.
                </p>
              )}

              {/* --- URL CHECK REASSURANCE --- */}
              {isUrlCheck && isDangerous && (
                <p className="rounded-lg bg-rose-100/70 p-3 text-pretty text-rose-900 dark:bg-rose-950/60 dark:text-rose-100">
                  <strong>Đường dẫn website giả mạo hoặc có nguy cơ chứa mã độc đánh cắp tài khoản.</strong> Thiết bị của bạn vẫn an toàn nếu bạn chưa truy cập liên kết hoặc chưa nhập thông tin đăng nhập.
                </p>
              )}
              {isUrlCheck && isSafe && (
                <p className="rounded-lg bg-emerald-100/70 p-3 text-pretty text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100">
                  Đường dẫn <strong>thuộc tên miền cổng thông tin chính thức đã được chứng thực an toàn</strong>. Luôn kiểm tra biểu tượng ổ khóa HTTPS khi thực hiện các giao dịch nhạy cảm.
                </p>
              )}
              {isUrlCheck && isSuspicious && (
                <p className="rounded-lg bg-amber-100/70 p-3 text-pretty text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
                  Đường dẫn có cấu trúc tên miền lạ hoặc chưa được chứng thực trong danh bạ an toàn. Tuyệt đối không nhập thông tin tài khoản ngân hàng hoặc mật khẩu vào trang web này.
                </p>
              )}
              {isUrlCheck && isUnknown && (
                <p className="rounded-lg bg-slate-200/70 p-3 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                  Hệ thống chưa đủ dữ liệu để kết luận chắc chắn về đường dẫn này. Không mở liên kết nếu được gửi từ người lạ hoặc qua tin nhắn quảng cáo không rõ nguồn gốc.
                </p>
              )}

              {/* --- TEXT CHECK REASSURANCE --- */}
              {isTextCheck && isPhishing && (
                <p className="rounded-lg bg-rose-100/70 p-3 text-pretty text-rose-900 dark:bg-rose-950/60 dark:text-rose-100">
                  <strong>Tài khoản của bạn hiện vẫn an toàn</strong> nếu bạn chưa nhập mật khẩu hay mã OTP. Hãy bình tĩnh và không nhấp vào liên kết trong tin nhắn.
                </p>
              )}
              {isTextCheck && isSocialEng && (
                <p className="rounded-lg bg-amber-100/70 p-3 text-pretty text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
                  Khuyến nghị bạn <strong>chưa vội chuyển tiền</strong> lúc này. Tin nhắn có dấu hiệu mượn cớ cấp cứu khẩn cấp để đề nghị chuyển tiền vào tài khoản người khác.
                </p>
              )}
              {isTextCheck && isSafe && (
                <p className="rounded-lg bg-emerald-100/70 p-3 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100">
                  Nội dung tin nhắn khớp với thông báo giao dịch thông thường từ ngân hàng. Lưu ý không chia sẻ mã xác thực OTP này cho bất kỳ ai.
                </p>
              )}
              {isTextCheck && isUnknown && (
                <p className="rounded-lg bg-slate-200/70 p-3 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                  Hệ thống chưa đủ dữ liệu để đưa ra đánh giá chắc chắn. Vui lòng kiểm tra lại kết nối mạng hoặc liên hệ người gửi qua kênh quen thuộc.
                </p>
              )}
            </div>

            {/* Context-Aware Action CTA (Tailored by inputType) */}
            <div className="pt-1">
              {isPhoneCheck && isDangerous && (
                <div className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-xs">
                  <PhoneSlash size={16} weight="fill" />
                  <span>
                    Khuyến cáo: Chặn số điện thoại này trên thiết bị và tuyệt đối không làm theo yêu cầu qua cuộc gọi
                  </span>
                </div>
              )}
              {isPhoneCheck && isSafe && (
                <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs">
                  <ShieldCheck size={16} weight="fill" />
                  <span>
                    Đầu số chính danh an toàn — Luôn giữ bảo mật mã OTP cá nhân
                  </span>
                </div>
              )}
              {isPhoneCheck && isSuspicious && (
                <div className="inline-flex items-center gap-2 rounded-xl bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-xs dark:bg-amber-800">
                  <WarningCircle size={16} weight="fill" />
                  <span>
                    Khuyến cáo: Cảnh giác khi nghe máy, tuyệt đối không chuyển tiền dưới mọi hình thức
                  </span>
                </div>
              )}

              {isUrlCheck && isDangerous && (
                <div className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-xs">
                  <WarningCircle size={16} weight="fill" />
                  <span>
                    Khuyến cáo: Tuyệt đối không bấm vào liên kết lạ hoặc tải tệp tin từ trang web này
                  </span>
                </div>
              )}
              {isUrlCheck && isSafe && (
                <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs">
                  <GlobeSimple size={16} weight="bold" />
                  <span>
                    Website chính danh đã xác thực an toàn trong danh bạ
                  </span>
                </div>
              )}
              {isUrlCheck && isSuspicious && (
                <div className="inline-flex items-center gap-2 rounded-xl bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-xs dark:bg-amber-800">
                  <WarningCircle size={16} weight="fill" />
                  <span>
                    Khuyến cáo: Thận trọng, không đăng nhập thông tin cá nhân vào liên kết lạ
                  </span>
                </div>
              )}

              {isTextCheck && isPhishing && (
                matchedBankInfo ? (
                  <a
                    href={`tel:${matchedBankInfo.hotline.replace(/\s+/g, "")}`}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-transform hover:bg-rose-800 active:scale-95"
                  >
                    <PhoneCall size={16} weight="fill" />
                    <span>
                      Bấm để gọi tổng đài {matchedBankInfo.name} hỗ trợ: {matchedBankInfo.hotline}
                    </span>
                  </a>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-xs">
                    <WarningCircle size={16} weight="fill" />
                    <span>
                      Khuyến cáo: Tuyệt đối không bấm vào liên kết lạ hoặc cung cấp thông tin bảo mật
                    </span>
                  </div>
                )
              )}

              {isTextCheck && isSocialEng && (
                <div className="inline-flex items-center gap-2 rounded-xl bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-xs dark:bg-amber-800">
                  <PhoneCall size={16} weight="fill" />
                  <span>
                    Nên gọi điện thoại trực tiếp cho người thân để xác thực trước khi giao dịch
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Dedicated Metric Gauge Panel (Balanced 4 or 5 cols) */}
          <div className="flex flex-col justify-between border-t border-border/60 pt-4 md:col-span-5 md:border-t-0 md:border-l md:pl-6 md:pt-0 lg:col-span-4">
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Chỉ số nguy cơ
                </span>
                <div className="flex items-baseline gap-1">
                  <span className={`font-heading text-3xl font-extrabold ${scoreTextClass}`}>
                    {verdict.risk_score !== null ? verdict.risk_score : "N/A"}
                  </span>
                  {verdict.risk_score !== null && (
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      / 100
                    </span>
                  )}
                </div>
              </div>

              {/* Flat Segmented Bar (Full width across metric column) */}
              <div className="my-2.5 flex w-full gap-1.5">
                {isUnknown ? (
                  <div className="h-2 w-full rounded-xs bg-slate-300 dark:bg-slate-700" />
                ) : (
                  <>
                    <div
                      className={`h-2 flex-1 rounded-xs ${(verdict.risk_score ?? 0) >= 0 ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`}
                    />
                    <div
                      className={`h-2 flex-1 rounded-xs ${(verdict.risk_score ?? 0) >= 25 ? "bg-lime-500" : "bg-slate-200 dark:bg-slate-700"}`}
                    />
                    <div
                      className={`h-2 flex-1 rounded-xs ${(verdict.risk_score ?? 0) >= 50 ? "bg-amber-500" : "bg-slate-200 dark:bg-slate-700"}`}
                    />
                    <div
                      className={`h-2 flex-1 rounded-xs ${(verdict.risk_score ?? 0) >= 75 ? "bg-rose-600" : "bg-slate-200 dark:bg-slate-700"}`}
                    />
                  </>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-bold ${scoreTextClass}`}>
                  {isUnknown || verdict.risk_score === null
                    ? "Vùng N/A: Chưa Thể Kết Luận"
                    : (verdict.risk_score ?? 0) >= 75
                      ? "Vùng 75–100: Mức Độ Rủi Ro Cao"
                      : (verdict.risk_score ?? 0) >= 50
                        ? "Vùng 50–74: Rủi Ro Trung Bình / Cần Kiểm Chứng"
                        : (verdict.risk_score ?? 0) >= 25
                          ? "Vùng 25–49: Rủi Ro Thấp / Cần Lưu Ý"
                          : "Vùng 0–24: Mức Độ Tin Cậy Cao"}
                </span>
              </div>
            </div>

            {/* Civilian-Facing Score Rationale (Context-Aware) */}
            <p className="mt-3 text-xs text-pretty leading-relaxed text-slate-700 dark:text-slate-300">
              {isUnknown || verdict.risk_score === null
                ? "Chưa đủ cơ sở dữ liệu xác thực danh tính. Hệ thống từ chối kết luận vội vã theo nguyên tắc thận trọng để bảo vệ người dùng."
                : isPhoneCheck
                  ? isDangerous
                    ? "Số điện thoại đã bị định danh rủi ro cao từ báo cáo cộng đồng hoặc danh sách cảnh báo viễn thông."
                    : isSafe
                      ? "Đầu số thương hiệu chính thức đã được xác thực bảo vệ từ các nhà mạng viễn thông."
                      : "Chưa ghi nhận báo cáo lừa đảo nhưng đầu số chưa được cấp chứng nhận chính danh."
                  : isUrlCheck
                    ? isDangerous
                      ? "Tên miền có dấu hiệu lừa đảo, giả mạo thương hiệu hoặc máy chủ độc hại."
                      : isSafe
                        ? "Tên miền đã được Ngân hàng Nhà nước và các đối tác chính thức xác minh an toàn."
                        : "Đường dẫn lạ chưa được xác thực, cần thận trọng khi truy cập."
                    : isSocialEng
                      ? "Hệ thống AI ghi nhận sự khác biệt về tên chủ tài khoản và tình huống gấp gáp; điểm đánh giá đã được điều chỉnh giảm do không chứa mã độc."
                      : isPhishing
                        ? riskSignalsDescription
                        : (verdict.risk_score ?? 0) >= 25
                          ? "Giao dịch thông thường có một vài từ khóa nhạy cảm nhưng không có yếu tố trục lợi."
                          : "Mức độ rủi ro rất thấp. Kênh gửi tin đã được xác thực chính thức, không có liên kết đáng ngờ ra ngoài."}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
