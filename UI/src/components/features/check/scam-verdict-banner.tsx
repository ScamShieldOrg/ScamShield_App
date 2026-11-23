"use client"

import Link from "next/link"
import {
  GlobeSimple,
  Info,
  Lightning,
  ListMagnifyingGlass,
  Megaphone,
  PhoneCall,
  PhoneSlash,
  Scales,
  ShieldCheck,
  ShieldWarning,
  WarningCircle,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import type {
  DeterministicFeatures,
  ExecutionProvenance,
  MatchedIndicatorInfo,
  Verdict,
} from "@/features/check/types/check.types"
import { summarizeCheckedContent } from "./scam-input-helpers"

interface ScamVerdictBannerProps {
  verdict: Verdict
  /** Value reported by the backend — never inferred or defaulted. */
  provenance: ExecutionProvenance
  /** Pass only when actually measured on the caller side. */
  executionTimeMs?: number
  modelName?: string
  features?: DeterministicFeatures
  targetBank?: string | null
  inputType?: string
  matchedIndicator?: MatchedIndicatorInfo | null
  decidedByStage?: string
  /** Guards `/user/...` links so guest users never hit an auth redirect trap. */
  mode?: "guest" | "user"
  /** Raw snippet that produced this result, shown as a subtle context anchor. */
  checkedContent?: string | null
  /** Marks the banner gently when the user has edited input since this scan. */
  isStale?: boolean
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
  provenance,
  executionTimeMs,
  features,
  targetBank,
  inputType = "TEXT",
  matchedIndicator,
  decidedByStage,
  mode = "user",
  checkedContent = null,
  isStale = false,
}: ScamVerdictBannerProps) {
  const isDangerous = verdict.risk_level === "DANGEROUS"
  const isSafe = verdict.risk_level === "SAFE"
  const isSuspicious = verdict.risk_level === "SUSPICIOUS"
  const isUnknown = verdict.risk_level === "UNKNOWN"
  const isAtRisk = isDangerous || isSuspicious

  const resolvedType = (inputType || "").toUpperCase()
  const isPhoneCheck = resolvedType === "PHONE"
  const isUrlCheck = resolvedType === "URL"
  const isBankCheck = resolvedType === "BANK_ACCOUNT"
  const isTextCheck = !isPhoneCheck && !isUrlCheck && !isBankCheck

  const riskScore = verdict.risk_score
  const rawType = (verdict.scam_type || "").toLowerCase()
  const rawSummary = (verdict.summary || "").toLowerCase()
  const snippet = summarizeCheckedContent(checkedContent)

  const hasSuspiciousUrl = Boolean(
    features?.url_analysis?.detected_urls &&
      features.url_analysis.detected_urls.length > 0 &&
      !features.url_analysis.is_in_official_whitelist
  )

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
    if (
      sender.includes("bidv") ||
      rawType.includes("bidv") ||
      rawSummary.includes("bidv")
    ) {
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
    if (
      /\bacb\b/i.test(sender) ||
      rawType.includes("acb") ||
      rawSummary.includes("acb")
    ) {
      return "ACB"
    }
    if (
      sender.includes("vpbank") ||
      rawType.includes("vpbank") ||
      rawSummary.includes("vpbank")
    ) {
      return "VPBANK"
    }
    return null
  })()

  const matchedBankInfo = bankMatched ? BANK_HOTLINES[bankMatched] : null

  const isGamblingOrReward =
    isTextCheck &&
    isAtRisk &&
    (rawType.includes("thưởng") ||
      rawType.includes("code") ||
      rawType.includes("rác") ||
      rawType.includes("cờ bạc") ||
      rawType.includes("khuyến mãi") ||
      rawSummary.includes("thưởng") ||
      rawSummary.includes("cờ bạc"))

  const isEmergencySocialEng =
    isTextCheck &&
    isAtRisk &&
    !isGamblingOrReward &&
    (rawType.includes("cấp cứu") ||
      rawType.includes("mượn tiền") ||
      rawSummary.includes("cấp cứu") ||
      rawSummary.includes("mượn tiền") ||
      rawSummary.includes("giật điện thoại"))

  const isSocialEng =
    isTextCheck &&
    isAtRisk &&
    !isGamblingOrReward &&
    (isEmergencySocialEng ||
      rawType.includes("người quen") ||
      rawType.includes("thao túng"))

  const isPhishing =
    isTextCheck &&
    isAtRisk &&
    !isGamblingOrReward &&
    !isSocialEng &&
    (hasSuspiciousUrl ||
      rawType.includes("link") ||
      rawType.includes("liên kết") ||
      rawType.includes("khóa thẻ") ||
      rawType.includes("khóa tài khoản") ||
      rawType.includes("phishing") ||
      Boolean(matchedBankInfo))

  const isGenericScam =
    isTextCheck &&
    isAtRisk &&
    !isGamblingOrReward &&
    !isSocialEng &&
    !isPhishing

  const hasEnglishLeak =
    rawType.length > 0 &&
    /detected|tier|heuristic|pattern|legitimate|message|forensic|council|fastpath|fast-path/i.test(
      rawType
    )

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
    if (isBankCheck) {
      if (isDangerous) return "Số tài khoản có dấu hiệu lừa đảo"
      if (isSafe) return "Số tài khoản thuộc danh bạ đã xác minh"
      if (isSuspicious) return "Số tài khoản cần kiểm chứng thêm"
      return "Số tài khoản chưa có trong danh bạ xác minh"
    }
    if (isGamblingOrReward) {
      return "Dấu hiệu tin nhắn rác & dụ dỗ nhận thưởng trái phép"
    }
    if (isPhishing) {
      return matchedBankInfo
        ? `Mạo danh liên kết ${matchedBankInfo.name} & đe dọa khóa tài khoản`
        : "Mạo danh liên kết & đe dọa khóa tài khoản"
    }
    if (isSocialEng) {
      return "Thao túng tâm lý & mạo danh người quen mượn tiền khẩn cấp"
    }
    if (isGenericScam) {
      return "Dấu hiệu tin nhắn rác & lừa đảo dụ dỗ người dùng"
    }
    if (isSafe) {
      return "Thông báo biến động số dư & mã OTP chính danh"
    }
    return "Nội dung chưa đủ căn cứ đánh giá"
  })()

  const statusBadgeText = (() => {
    if (isPhoneCheck) {
      if (isDangerous) return "Nguy cơ lừa đảo · Khuyến nghị chặn số"
      if (isSafe) return "Đầu số chính danh · Độ tin cậy cao"
      if (isSuspicious) return "Nghi vấn · Cần cảnh giác khi nghe máy"
      return "Chưa có trong danh bạ · Cần kiểm chứng"
    }
    if (isUrlCheck) {
      if (isDangerous) return "Liên kết độc hại · Không truy cập"
      if (isSafe) return "Tên miền chính thức · Đã xác thực"
      if (isSuspicious) return "Đường dẫn đáng ngờ · Cần kiểm chứng"
      return "Chưa xác minh · Cần thận trọng"
    }
    if (isBankCheck) {
      if (isDangerous) return "Có trong danh sách cảnh báo · Không chuyển tiền"
      if (isSafe) return "Khớp danh bạ xác minh"
      if (isSuspicious) return "Cần kiểm chứng trước khi giao dịch"
      return "Chưa có trong danh bạ · Không đồng nghĩa an toàn"
    }
    if (isDangerous) return "Nguy cơ rủi ro cao · Cần dừng lại"
    if (isSafe) return "Tin nhắn chính danh · Độ tin cậy cao"
    if (isSuspicious) return "Cần lưu ý · Có dấu hiệu mạo danh"
    return "Chưa đủ dữ liệu · Nên kiểm chứng thêm"
  })()

  // Calm, high-contrast semantic tokens (10-15% tinted surfaces, 1px crisp borders)
  const palette = isDangerous
    ? {
        cardBorder: "border-rose-500/25 dark:border-rose-400/25",
        iconBox:
          "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/15 dark:text-rose-300",
        dot: "bg-rose-600 dark:bg-rose-400",
        pill: "border-rose-500/25 bg-rose-500/10 text-rose-800 dark:border-rose-400/25 dark:bg-rose-500/15 dark:text-rose-200",
        callout:
          "border-rose-500/20 bg-rose-500/8 text-rose-950 dark:border-rose-400/20 dark:bg-rose-500/12 dark:text-rose-100",
        calloutIcon: "text-rose-700 dark:text-rose-300",
        scoreText: "text-rose-700 dark:text-rose-400",
      }
    : isSafe
      ? {
          cardBorder: "border-emerald-500/25 dark:border-emerald-400/25",
          iconBox:
            "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/15 dark:text-emerald-300",
          dot: "bg-emerald-600 dark:bg-emerald-400",
          pill: "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-500/15 dark:text-emerald-200",
          callout:
            "border-emerald-500/20 bg-emerald-500/8 text-emerald-950 dark:border-emerald-400/20 dark:bg-emerald-500/12 dark:text-emerald-100",
          calloutIcon: "text-emerald-700 dark:text-emerald-300",
          scoreText: "text-emerald-700 dark:text-emerald-400",
        }
      : isSuspicious
        ? {
            cardBorder: "border-amber-500/30 dark:border-amber-400/25",
            iconBox:
              "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:border-amber-400/25 dark:bg-amber-500/15 dark:text-amber-300",
            dot: "bg-amber-500 dark:bg-amber-400",
            pill: "border-amber-500/25 bg-amber-500/10 text-amber-900 dark:border-amber-400/25 dark:bg-amber-500/15 dark:text-amber-200",
            callout:
              "border-amber-500/25 bg-amber-500/10 text-amber-950 dark:border-amber-400/20 dark:bg-amber-500/12 dark:text-amber-100",
            calloutIcon: "text-amber-700 dark:text-amber-300",
            scoreText: "text-amber-700 dark:text-amber-400",
          }
        : {
            cardBorder: "border-border dark:border-white/12",
            iconBox:
              "border-border bg-muted text-foreground dark:border-white/12",
            dot: "bg-slate-500 dark:bg-slate-400",
            pill: "border-border bg-muted text-foreground dark:border-white/12",
            callout:
              "border-border bg-muted/50 text-foreground dark:border-white/10",
            calloutIcon: "text-muted-foreground",
            scoreText: "text-muted-foreground",
          }

  const riskSignals: string[] = []
  if (hasSuspiciousUrl)
    riskSignals.push("đường dẫn lạ ngoài hệ sinh thái chính thức")
  if ((features?.urgency_indicators?.matched_keywords?.length ?? 0) > 0)
    riskSignals.push("yếu tố thúc ép thời gian")
  if (rawType.includes("mạo danh") || rawType.includes("người quen"))
    riskSignals.push("mạo danh danh tính")

  const riskSignalsDescription =
    riskSignals.length > 0
      ? `Ghi nhận ${riskSignals.length} dấu hiệu rủi ro: ${riskSignals.join(" và ")}.`
      : "Ghi nhận dấu hiệu rủi ro cao từ phân tích nội dung bất thường."

  // Advice callout (strictly static text, never disguised as a button)
  const staticAdvice: { icon: typeof Info; text: string } | null = (() => {
    if (isPhoneCheck) {
      if (isDangerous)
        return {
          icon: PhoneSlash,
          text: "Chặn số điện thoại này trên thiết bị và tuyệt đối không làm theo yêu cầu qua cuộc gọi.",
        }
      if (isSafe)
        return {
          icon: ShieldCheck,
          text: "Đầu số chính danh an toàn — vẫn không chia sẻ mã OTP hay mật khẩu cho bất kỳ ai.",
        }
      if (isSuspicious)
        return {
          icon: WarningCircle,
          text: "Cảnh giác khi nghe máy và tuyệt đối không chuyển tiền theo yêu cầu qua điện thoại.",
        }
      return null
    }
    if (isUrlCheck) {
      if (isDangerous)
        return {
          icon: WarningCircle,
          text: "Tuyệt đối không mở liên kết, không tải tệp tin và không đăng nhập tài khoản tại trang này.",
        }
      if (isSafe)
        return {
          icon: GlobeSimple,
          text: "Tên miền chính danh đã xác thực trong danh bạ an toàn.",
        }
      if (isSuspicious)
        return {
          icon: WarningCircle,
          text: "Thận trọng, không nhập thông tin cá nhân hay tài khoản ngân hàng vào đường dẫn lạ.",
        }
      return null
    }
    if (isBankCheck) {
      if (isDangerous)
        return {
          icon: PhoneCall,
          text: "Dừng giao dịch ngay. Nếu bạn đã lỡ chuyển tiền, hãy gọi tổng đài ngân hàng của bạn để hỗ trợ phong tỏa.",
        }
      if (isSafe)
        return {
          icon: ShieldCheck,
          text: "Số tài khoản khớp danh bạ xác minh — vẫn nên tự kiểm tra lại đúng tên người nhận trước khi chuyển.",
        }
      if (isSuspicious)
        return {
          icon: WarningCircle,
          text: "Kiểm chứng lại người nhận qua một kênh liên lạc độc lập trước khi chuyển tiền.",
        }
      return null
    }
    if (isGamblingOrReward || isGenericScam) {
      return {
        icon: WarningCircle,
        text: "Chặn tin nhắn rác, tuyệt đối không bấm liên kết lạ hay nạp tiền nhận thưởng.",
      }
    }
    if (isPhishing && !matchedBankInfo) {
      return {
        icon: WarningCircle,
        text: "Tuyệt đối không bấm vào liên kết lạ hoặc cung cấp mật khẩu, mã OTP.",
      }
    }
    if (isSocialEng) {
      return {
        icon: PhoneCall,
        text: "Hãy gọi điện trực tiếp bằng số quen thuộc cho người thân để xác thực trước khi chuyển tiền.",
      }
    }
    return null
  })()

  const provenanceLabel =
    provenance === "TIER2_FORENSIC_COUNCIL"
      ? "Chuyên gia AI đa chiều"
      : provenance === "TIER1_FAST_PATH"
        ? isPhoneCheck || isBankCheck
          ? "Tra cứu danh bạ xác minh"
          : "Phân tích nhanh"
        : "Trạng thái thận trọng"

  return (
    <section
      aria-labelledby="scam-verdict-heading"
      className={cn(
        "overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xs transition-[opacity,transform] duration-180 ease-[cubic-bezier(0.16,1,0.3,1)]",
        palette.cardBorder
      )}
    >
      {/* Compact Unified Metadata Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 bg-muted/35 px-4 py-3 text-xs text-muted-foreground sm:px-6 dark:border-white/10">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 font-medium text-foreground">
            {provenance === "TIER2_FORENSIC_COUNCIL" ? (
              <Scales
                aria-hidden="true"
                size={15}
                weight="fill"
                className="text-sky-600 dark:text-sky-400"
              />
            ) : provenance === "TIER1_FAST_PATH" ? (
              <Lightning
                aria-hidden="true"
                size={15}
                weight="fill"
                className="text-amber-600 dark:text-amber-400"
              />
            ) : (
              <WarningCircle
                aria-hidden="true"
                size={15}
                weight="fill"
                className="text-amber-600 dark:text-amber-400"
              />
            )}
            <span>{provenanceLabel}</span>
          </span>

          {matchedIndicator && (
            <>
              <span aria-hidden="true" className="text-border">
                ·
              </span>
              <span className="truncate">
                Khớp{" "}
                <strong className="font-mono font-semibold text-foreground">
                  {matchedIndicator.value}
                </strong>
                {decidedByStage === "WHITELIST"
                  ? " (Danh bạ xác minh)"
                  : decidedByStage === "BLACKLIST"
                    ? " (Danh sách cảnh báo)"
                    : ""}
              </span>
            </>
          )}

          {!matchedIndicator && snippet && (
            <>
              <span aria-hidden="true" className="text-border">
                ·
              </span>
              <span className="max-w-[280px] truncate sm:max-w-[360px]">
                Nội dung: &ldquo;{snippet}&rdquo;
              </span>
            </>
          )}
        </div>

        {executionTimeMs != null && executionTimeMs > 0 && (
          <span className="shrink-0 font-mono text-xs tabular-nums">
            ~{Math.round(executionTimeMs)}ms
          </span>
        )}
      </div>

      {/* Stale Input Context Notice */}
      {isStale && (
        <div
          role="status"
          className="flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-900 sm:px-6 dark:text-amber-200"
        >
          <Info aria-hidden="true" size={14} weight="fill" className="shrink-0" />
          <span>
            Bạn vừa chỉnh sửa nội dung ở trên. Bấm nút kiểm tra lại để cập nhật
            kết quả mới.
          </span>
        </div>
      )}

      {/* Main Verdict Body */}
      <div className="grid grid-cols-1 gap-6 p-5 sm:p-6 md:grid-cols-12">
        {/* Left: Protective Verdict, Reassurance & Real Actions */}
        <div className="flex flex-col justify-between space-y-4 md:col-span-7 lg:col-span-8">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-lg border",
                palette.iconBox
              )}
            >
              {isSafe && (
                <ShieldCheck aria-hidden="true" size={26} weight="fill" />
              )}
              {isDangerous &&
                (isPhoneCheck ? (
                  <PhoneSlash aria-hidden="true" size={26} weight="fill" />
                ) : (
                  <ShieldWarning aria-hidden="true" size={26} weight="fill" />
                ))}
              {isSuspicious && (
                <ShieldWarning aria-hidden="true" size={26} weight="fill" />
              )}
              {isUnknown && (
                <WarningCircle aria-hidden="true" size={26} weight="fill" />
              )}
            </div>

            <div className="min-w-0 space-y-2">
              <h2
                id="scam-verdict-heading"
                className="font-heading text-xl leading-snug font-bold tracking-[-0.02em] text-balance text-foreground"
              >
                {displayScamType}
              </h2>

              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-md border px-3 py-1 text-xs font-semibold",
                  palette.pill
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn("size-2 shrink-0 rounded-full", palette.dot)}
                />
                <span>{statusBadgeText}</span>
              </span>
            </div>
          </div>

          {/* Context-Aware Reassurance Copy */}
          <div className="max-w-[65ch] text-sm leading-relaxed text-foreground/90">
            {isPhoneCheck && isDangerous && (
              <p>
                <strong>
                  Số điện thoại này đã được xác nhận trong danh sách cảnh báo
                  lừa đảo/làm phiền
                </strong>{" "}
                hoặc có dấu hiệu mạo danh. Hãy giữ bình tĩnh, không nghe máy và
                tuyệt đối không chuyển tiền.
              </p>
            )}
            {isPhoneCheck && isSafe && (
              <p>
                Số điện thoại hoặc tổng đài này{" "}
                <strong>
                  thuộc danh bạ đối tác chính thức đã được kiểm chứng
                </strong>
                . Lưu ý không bao giờ chia sẻ mã OTP hay mật khẩu tài khoản cho
                người gọi.
              </p>
            )}
            {isPhoneCheck && isSuspicious && (
              <p>
                Số điện thoại có dấu hiệu nghi vấn hoặc bị báo cáo làm phiền gần
                đây. Hãy cảnh giác trước các cuộc gọi đe dọa phạt nguội, yêu cầu
                cài ứng dụng lạ hoặc đề nghị chuyển tiền.
              </p>
            )}
            {isPhoneCheck && isUnknown && (
              <p>
                <strong>Số điện thoại này chưa có trong danh bạ xác minh.</strong>{" "}
                Chưa xác minh không đồng nghĩa với an toàn — hãy kiểm tra lại
                danh tính người gọi qua kênh liên lạc độc lập do bạn tự tìm.
              </p>
            )}

            {isUrlCheck && isDangerous && (
              <p>
                <strong>
                  Đường dẫn giả mạo hoặc có nguy cơ chứa mã độc đánh cắp tài
                  khoản.
                </strong>{" "}
                Thiết bị của bạn vẫn an toàn nếu bạn chưa mở liên kết và chưa
                nhập thông tin đăng nhập.
              </p>
            )}
            {isUrlCheck && isSafe && (
              <p>
                Đường dẫn{" "}
                <strong>
                  thuộc tên miền cổng thông tin chính thức đã được xác thực
                </strong>
                . Luôn kiểm tra biểu tượng ổ khóa HTTPS khi thực hiện giao dịch
                nhạy cảm.
              </p>
            )}
            {isUrlCheck && isSuspicious && (
              <p>
                Đường dẫn có tên miền lạ hoặc chưa được xác thực trong danh bạ
                an toàn. Tuyệt đối không nhập tài khoản ngân hàng hoặc mật khẩu
                vào trang web này.
              </p>
            )}
            {isUrlCheck && isUnknown && (
              <p>
                Hệ thống chưa đủ dữ liệu để kết luận chắc chắn về đường dẫn này.
                Không mở liên kết nếu được gửi từ người lạ hoặc tin nhắn không
                rõ nguồn gốc.
              </p>
            )}

            {isBankCheck && isDangerous && (
              <p>
                <strong>
                  Số tài khoản này đã có trong danh sách cảnh báo lừa đảo đã
                  được xác minh.
                </strong>{" "}
                Tuyệt đối không chuyển tiền. Nếu đã lỡ chuyển, hãy gọi ngay tổng
                đài ngân hàng và trình báo cơ quan công an.
              </p>
            )}
            {isBankCheck && isSafe && (
              <p>
                Số tài khoản này{" "}
                <strong>khớp với danh bạ đối tác đã xác minh</strong>. Kết quả
                này chỉ xác nhận danh bạ, không thay thế việc bạn tự đối chiếu
                lại thông tin người nhận.
              </p>
            )}
            {isBankCheck && isSuspicious && (
              <p>
                Số tài khoản có báo cáo gần đây hoặc chưa được đối chiếu đầy đủ.
                Hãy kiểm chứng lại người nhận qua kênh liên lạc độc lập trước
                khi chuyển tiền.
              </p>
            )}
            {isBankCheck && isUnknown && (
              <p>
                Số tài khoản{" "}
                <strong>
                  chưa có trong danh sách cảnh báo lẫn danh bạ xác minh
                </strong>
                . Hệ thống chỉ tra cứu danh bạ, nên việc không tìm thấy không
                đồng nghĩa với an toàn.
              </p>
            )}

            {isTextCheck && isGamblingOrReward && (
              <p>
                <strong>
                  Cảnh báo tin nhắn rác mồi chài nhận thưởng hoặc cờ bạc trá
                  hình.
                </strong>{" "}
                Tuyệt đối không bấm vào liên kết lạ, không tải ứng dụng và không
                nạp tiền tham gia.
              </p>
            )}
            {isTextCheck && isGenericScam && (
              <p>
                <strong>
                  Tin nhắn có dấu hiệu lừa đảo hoặc dẫn dụ không an toàn.
                </strong>{" "}
                Hãy cẩn trọng, không làm theo hướng dẫn trong tin và không chia
                sẻ thông tin cá nhân.
              </p>
            )}
            {isTextCheck && isPhishing && (
              <p>
                <strong>Tài khoản của bạn hiện vẫn an toàn</strong> nếu bạn chưa
                nhập mật khẩu hay mã OTP. Hãy bình tĩnh và không nhấp vào liên
                kết trong tin nhắn.
              </p>
            )}
            {isTextCheck && isSocialEng && (
              <p>
                Khuyến nghị bạn <strong>chưa vội chuyển tiền</strong> lúc này.
                Tin nhắn có dấu hiệu thao túng tâm lý hoặc mạo danh người quen
                để đề nghị chuyển tiền gấp.
              </p>
            )}
            {isTextCheck && isSafe && (
              <p>
                Nội dung tin nhắn khớp với thông báo giao dịch thông thường. Lưu
                ý không chia sẻ mã xác thực OTP cho bất kỳ ai.
              </p>
            )}
            {isTextCheck && isUnknown && (
              <p>
                Hệ thống chưa đủ dữ liệu để đưa ra kết luận chắc chắn. Vui lòng
                kiểm chứng lại với người gửi qua một kênh liên lạc quen thuộc.
              </p>
            )}
          </div>

          {/* Static Advice Callout OR Real Interactive Action */}
          <div className="space-y-3 pt-1">
            {isTextCheck && isPhishing && matchedBankInfo && (
              <a
                href={`tel:${matchedBankInfo.hotline.replace(/\s+/g, "")}`}
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md bg-rose-700 px-4 text-sm font-semibold text-white shadow-2xs transition-[background-color,transform] duration-120 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-rose-800 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:bg-rose-600 dark:hover:bg-rose-500"
              >
                <PhoneCall aria-hidden="true" size={18} weight="fill" />
                <span>
                  Gọi tổng đài {matchedBankInfo.name}:{" "}
                  <strong className="font-mono tabular-nums">
                    {matchedBankInfo.hotline}
                  </strong>
                </span>
              </a>
            )}

            {staticAdvice && (
              <div
                className={cn(
                  "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm leading-relaxed",
                  palette.callout
                )}
              >
                <staticAdvice.icon
                  aria-hidden="true"
                  size={18}
                  weight="fill"
                  className={cn("mt-0.5 shrink-0", palette.calloutIcon)}
                />
                <span>{staticAdvice.text}</span>
              </div>
            )}

            {(isPhoneCheck || isBankCheck) && isUnknown && (
              <div className="flex flex-wrap items-center gap-2">
                {mode === "user" && (
                  <Link
                    href="/user/reports/new"
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground transition-opacity duration-120 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <Megaphone aria-hidden="true" size={15} weight="fill" />
                    <span>
                      {isBankCheck
                        ? "Báo cáo số tài khoản này"
                        : "Báo cáo số điện thoại này"}
                    </span>
                  </Link>
                )}
                <Link
                  href="/guest/blacklist"
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-4 text-xs font-semibold text-foreground transition-colors duration-120 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:border-white/12"
                >
                  <ListMagnifyingGlass
                    aria-hidden="true"
                    size={15}
                    weight="bold"
                  />
                  <span>Tra cứu danh sách cảnh báo</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right: Risk Metric Panel */}
        <div className="flex flex-col justify-between space-y-4 border-t border-border/80 pt-5 md:col-span-5 md:border-t-0 md:border-l md:pt-0 md:pl-6 lg:col-span-4 dark:border-white/10">
          <div className="space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-semibold text-muted-foreground">
                Chỉ số nguy cơ
              </span>
              {riskScore !== null ? (
                <div className="flex items-baseline gap-1 tabular-nums">
                  <span
                    className={cn(
                      "font-heading text-3xl leading-none font-bold",
                      palette.scoreText
                    )}
                  >
                    {riskScore}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    / 100
                  </span>
                </div>
              ) : (
                <span className="text-sm font-semibold text-foreground">
                  {isPhoneCheck || isBankCheck
                    ? "Tra cứu danh bạ"
                    : "Chưa chấm điểm"}
                </span>
              )}
            </div>

            {riskScore !== null ? (
              <div
                role="meter"
                aria-label="Chỉ số nguy cơ"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={riskScore}
                className="flex w-full gap-1.5"
              >
                <div
                  className={cn(
                    "h-2 flex-1 rounded-xs",
                    riskScore >= 0 ? "bg-emerald-500" : "bg-muted"
                  )}
                />
                <div
                  className={cn(
                    "h-2 flex-1 rounded-xs",
                    riskScore >= 25 ? "bg-lime-500" : "bg-muted"
                  )}
                />
                <div
                  className={cn(
                    "h-2 flex-1 rounded-xs",
                    riskScore >= 50 ? "bg-amber-500" : "bg-muted"
                  )}
                />
                <div
                  className={cn(
                    "h-2 flex-1 rounded-xs",
                    riskScore >= 75 ? "bg-rose-600" : "bg-muted"
                  )}
                />
              </div>
            ) : (
              <div className="rounded-md border border-border/80 bg-muted/40 px-3 py-2 text-xs text-muted-foreground dark:border-white/10">
                {isPhoneCheck || isBankCheck
                  ? "Loại kiểm tra này đối chiếu trực tiếp danh bạ xác minh, không gán điểm AI."
                  : "Chưa đủ tín hiệu để gán điểm rủi ro số học."}
              </div>
            )}

            {riskScore !== null && (
              <p className={cn("text-xs font-semibold tabular-nums", palette.scoreText)}>
                {riskScore >= 75
                  ? "Mức 75–100: Rủi ro cao"
                  : riskScore >= 50
                    ? "Mức 50–74: Rủi ro trung bình"
                    : riskScore >= 25
                      ? "Mức 25–49: Rủi ro thấp, cần lưu ý"
                      : "Mức 0–24: Độ tin cậy cao"}
              </p>
            )}
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            {isUnknown || riskScore === null
              ? "Hệ thống giữ nguyên tắc thận trọng — từ chối kết luận vội vã khi chưa đủ căn cứ xác thực."
              : isPhoneCheck
                ? isDangerous
                  ? "Số điện thoại đã bị ghi nhận rủi ro cao từ báo cáo cộng đồng hoặc danh sách cảnh báo."
                  : isSafe
                    ? "Đầu số chính thức đã được xác thực trong danh bạ tổ chức."
                    : "Chưa có trong danh sách cảnh báo nhưng đầu số chưa được chứng thực chính danh."
                : isUrlCheck
                  ? isDangerous
                    ? "Tên miền có dấu hiệu giả mạo thương hiệu hoặc chứa nguy cơ đánh cắp thông tin."
                    : isSafe
                      ? "Tên miền thuộc danh bạ cổng điện tử chính thức đã được xác minh."
                      : "Đường dẫn lạ chưa được xác thực, cần thận trọng trước khi truy cập."
                  : isBankCheck
                    ? isDangerous
                      ? "Số tài khoản nằm trong danh sách cảnh báo lừa đảo đã xác minh."
                      : isSafe
                        ? "Số tài khoản khớp với danh bạ đối tác đã xác minh."
                        : "Chỉ đối chiếu danh bạ cảnh báo và danh bạ xác minh, không dùng AI phán đoán."
                    : isSocialEng
                      ? "Hệ thống ghi nhận dấu hiệu tạo tình huống gấp gáp và bất thường về yêu cầu chuyển tiền."
                      : isPhishing
                        ? riskSignalsDescription
                        : riskScore >= 25
                          ? "Nội dung có một vài từ khóa nhạy cảm nhưng không ghi nhận yếu tố trục lợi."
                          : "Mức độ rủi ro rất thấp. Kênh gửi và nội dung không có dấu hiệu lừa đảo."}
          </p>
        </div>
      </div>
    </section>
  )
}
