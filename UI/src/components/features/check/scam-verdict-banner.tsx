"use client"

import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import {
  ArrowRight,
  Info,
  Lightning,
  ListMagnifyingGlass,
  Megaphone,
  PhoneCall,
  Scales,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import type {
  DeterministicFeatures,
  ExecutionProvenance,
  MatchedIndicatorInfo,
  Verdict,
} from "@/features/check/types/check.types"
import { ScamRiskGauge } from "./scam-risk-gauge"
import { ScamAnnotatedMessage } from "./scam-annotated-message"

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
  /** Raw text that produced this result — powers the Interactive Message Inspector. */
  checkedContent?: string | null
  /** Concise actionable steps rendered inside the unified Verdict card. */
  actionableSteps?: string[]
  /** Stable key per scan so interactive highlights reset cleanly on a new check. */
  scanId?: string
  /** Marks the card gently when the user edits input after this scan. */
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
  actionableSteps = [],
  scanId = "scan",
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

  const hasSuspiciousUrl = Boolean(
    features?.url_analysis?.detected_urls &&
      features.url_analysis.detected_urls.length > 0 &&
      !features.url_analysis.is_in_official_whitelist
  )

  const bankMatched = (() => {
    if (targetBank) return targetBank.toUpperCase()
    const sender = features?.brand_identity?.sender_header?.toLowerCase() || ""
    const hay = `${sender} ${rawType} ${rawSummary}`
    if (hay.includes("vcb") || hay.includes("vietcombank")) return "VIETCOMBANK"
    if (hay.includes("bidv")) return "BIDV"
    if (hay.includes("techcombank") || hay.includes("tcb")) return "TECHCOMBANK"
    if (hay.includes("mbbank") || /\bmb\b/i.test(hay)) return "MB"
    if (hay.includes("agribank")) return "AGRIBANK"
    if (/\bacb\b/i.test(hay)) return "ACB"
    if (hay.includes("vpbank")) return "VPBANK"
    return null
  })()

  const matchedBankInfo = bankMatched ? BANK_HOTLINES[bankMatched] : null

  const isGamblingOrReward =
    isTextCheck &&
    isAtRisk &&
    /thưởng|code|rác|cờ bạc|khuyến mãi/i.test(`${rawType} ${rawSummary}`)

  const isSocialEng =
    isTextCheck &&
    isAtRisk &&
    !isGamblingOrReward &&
    /cấp cứu|mượn tiền|giật điện thoại|người quen|thao túng/i.test(
      `${rawType} ${rawSummary}`
    )

  const isPhishing =
    isTextCheck &&
    isAtRisk &&
    !isGamblingOrReward &&
    !isSocialEng &&
    (hasSuspiciousUrl ||
      /link|liên kết|khóa thẻ|khóa tài khoản|phishing/i.test(rawType) ||
      Boolean(matchedBankInfo))

  const hasEnglishLeak =
    rawType.length > 0 &&
    /detected|tier|heuristic|pattern|legitimate|message|forensic|council|fastpath|fast-path/i.test(
      rawType
    )

  const displayTitle = (() => {
    if (verdict.scam_type && !hasEnglishLeak) return verdict.scam_type
    if (isPhoneCheck) {
      if (isDangerous) return "Số điện thoại nằm trong danh sách cảnh báo"
      if (isSafe) return "Đầu số chính thức đã xác minh"
      if (isSuspicious) return "Số điện thoại có dấu hiệu nghi vấn"
      return "Số điện thoại chưa có trong danh bạ"
    }
    if (isUrlCheck) {
      if (isDangerous) return "Đường dẫn giả mạo / nguy cơ độc hại"
      if (isSafe) return "Tên miền chính thức đã xác thực"
      if (isSuspicious) return "Đường dẫn có dấu hiệu đáng ngờ"
      return "Đường dẫn chưa có trong danh bạ xác minh"
    }
    if (isBankCheck) {
      if (isDangerous) return "Số tài khoản có dấu hiệu lừa đảo"
      if (isSafe) return "Số tài khoản thuộc danh bạ xác minh"
      if (isSuspicious) return "Số tài khoản cần kiểm chứng thêm"
      return "Số tài khoản chưa có trong danh bạ"
    }
    if (isGamblingOrReward) return "Tin nhắn rác dụ dỗ nhận thưởng / cờ bạc"
    if (isPhishing) {
      return matchedBankInfo
        ? `Mạo danh ${matchedBankInfo.name} & đe dọa khóa tài khoản`
        : "Mạo danh liên kết & đe dọa khóa tài khoản"
    }
    if (isSocialEng) return "Dấu hiệu thao túng tâm lý & mượn tiền gấp"
    if (isAtRisk) return "Tin nhắn có dấu hiệu lừa đảo"
    if (isSafe) return "Nội dung bình thường, ít dấu hiệu rủi ro"
    return "Chưa đủ căn cứ để kết luận"
  })()

  // ONE concise, non-repetitive sentence per state (cuts ~60% redundant text!)
  const conciseTakeaway = (() => {
    if (isPhoneCheck) {
      if (isDangerous)
        return "Số này đã bị ghi nhận lừa đảo/làm phiền — hãy chặn số và không làm theo yêu cầu qua cuộc gọi."
      if (isSafe)
        return "Khớp danh bạ đối tác chính thức. Vẫn tuyệt đối không cung cấp mã OTP hay mật khẩu."
      if (isSuspicious)
        return "Có dấu hiệu bất thường — hãy tự xác minh lại qua kênh chính thức trước khi nghe theo."
      return "Chưa có trong danh sách cảnh báo lẫn danh bạ xác minh (chưa rõ không đồng nghĩa an toàn)."
    }
    if (isUrlCheck) {
      if (isDangerous)
        return "Thiết bị vẫn an toàn nếu bạn chưa mở liên kết và chưa nhập mật khẩu hay mã OTP."
      if (isSafe)
        return "Tên miền thuộc danh bạ cổng điện tử chính thức — luôn kiểm tra ổ khóa HTTPS khi đăng nhập."
      if (isSuspicious)
        return "Tên miền chưa được chứng thực — không nhập thông tin tài khoản hay mật khẩu vào trang này."
      return "Chưa đủ dữ liệu xác thực — chỉ mở khi bạn chắc chắn nguồn gửi là đáng tin cậy."
    }
    if (isBankCheck) {
      if (isDangerous)
        return "Số tài khoản đã bị xác nhận lừa đảo — tuyệt đối không chuyển tiền."
      if (isSafe)
        return "Khớp danh bạ đối tác xác minh — vẫn tự kiểm tra đúng tên chủ tài khoản trước khi chuyển."
      if (isSuspicious)
        return "Có báo cáo nghi vấn gần đây — hãy xác minh người nhận qua kênh độc lập."
      return "Hệ thống chỉ tra cứu danh bạ — không tìm thấy không đồng nghĩa tài khoản này an toàn."
    }
    if (isPhishing)
      return "Tài khoản của bạn vẫn an toàn nếu chưa bấm link hay nhập OTP — tuyệt đối không làm theo tin nhắn."
    if (isSocialEng)
      return "Chưa vội chuyển tiền — hãy gọi điện trực tiếp bằng số quen thuộc để xác nhận với người thân."
    if (isGamblingOrReward)
      return "Không bấm liên kết lạ, không tải ứng dụng và không nạp tiền để nhận thưởng."
    if (isAtRisk)
      return "Phát hiện nhiều dấu hiệu dẫn dụ bất thường — giữ bình tĩnh và không chia sẻ thông tin cá nhân."
    if (isSafe)
      return "Cấu trúc nội dung thông thường, không phát hiện liên kết độc hại hay yêu cầu trục lợi."
    return "Chưa đủ dữ liệu để khẳng định — hãy đối chiếu trực tiếp qua kênh chính thức."
  })()

  const statusPill = isDangerous
    ? {
        label: "Nguy cơ cao · Dừng lại",
        pill: "border-rose-500/25 bg-rose-500/10 text-rose-800 dark:border-rose-400/25 dark:bg-rose-500/15 dark:text-rose-200",
        dot: "bg-rose-600 dark:bg-rose-400",
        border: "border-rose-500/25 dark:border-rose-400/25",
        stepMarker:
          "border-rose-500/25 bg-rose-500/10 text-rose-800 dark:text-rose-200",
      }
    : isSuspicious
      ? {
          label: "Đáng ngờ · Cần kiểm chứng",
          pill: "border-amber-500/25 bg-amber-500/10 text-amber-900 dark:border-amber-400/25 dark:bg-amber-500/15 dark:text-amber-200",
          dot: "bg-amber-500 dark:bg-amber-400",
          border: "border-amber-500/30 dark:border-amber-400/25",
          stepMarker:
            "border-amber-500/25 bg-amber-500/10 text-amber-900 dark:text-amber-200",
        }
      : isSafe
        ? {
            label: "Độ tin cậy cao",
            pill: "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-500/15 dark:text-emerald-200",
            dot: "bg-emerald-600 dark:bg-emerald-400",
            border: "border-emerald-500/25 dark:border-emerald-400/25",
            stepMarker:
              "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
          }
        : {
            label: "Chưa đủ căn cứ",
            pill: "border-border bg-muted text-foreground dark:border-white/12",
            dot: "bg-slate-500 dark:bg-slate-400",
            border: "border-border dark:border-white/12",
            stepMarker: "border-border bg-muted text-foreground",
          }

  const provenanceLabel =
    provenance === "TIER2_FORENSIC_COUNCIL"
      ? "Chuyên gia AI đa chiều"
      : provenance === "TIER1_FAST_PATH"
        ? isPhoneCheck || isBankCheck
          ? "Tra cứu danh bạ"
          : "Phân tích nhanh"
        : "Thận trọng"

  const visibleSteps = actionableSteps.slice(0, 3)

  return (
    <motion.section
      aria-labelledby="scam-verdict-heading"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "scroll-mt-24 overflow-hidden rounded-xl border bg-card text-card-foreground",
        "shadow-[0_8px_30px_rgb(15,23,42,0.05),0_1px_2px_rgb(15,23,42,0.04)]",
        "dark:shadow-[0_16px_44px_rgb(0,0,0,0.42),inset_0_1px_0_rgb(255,255,255,0.07)]",
        statusPill.border
      )}
    >
      {/* Top Compact Provenance Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground sm:px-6 dark:border-white/10">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
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

      {/* Gentle Stale Notice When Input Changed */}
      <AnimatePresence initial={false}>
        {isStale && (
          <motion.div
            role="status"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.16 }}
            className="overflow-hidden border-b border-amber-500/20 bg-amber-500/10"
          >
            <div className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-amber-900 sm:px-6 dark:text-amber-200">
              <Info
                aria-hidden="true"
                size={14}
                weight="fill"
                className="shrink-0"
              />
              <span>
                Nội dung ở trên đã thay đổi — bấm gửi lại để cập nhật kết quả
                mới.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Verdict Hero Band (Left: Headline + 1 Sentence + CTA | Right: Animated Risk Arc) */}
      <div className="flex flex-col gap-6 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <h2
            id="scam-verdict-heading"
            className="font-heading text-xl leading-snug font-bold tracking-[-0.02em] text-balance text-foreground sm:text-2xl"
          >
            {displayTitle}
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
                statusPill.pill
              )}
            >
              <span
                aria-hidden="true"
                className={cn("size-2 shrink-0 rounded-full", statusPill.dot)}
              />
              <span>{statusPill.label}</span>
            </span>

            {matchedIndicator && (
              <Link
                href={{
                  pathname: "/guest/blacklist",
                  query: {
                    search: matchedIndicator.value,
                    tab:
                      decidedByStage === "WHITELIST"
                        ? "whitelist"
                        : "blacklist",
                  },
                }}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground transition-colors duration-120 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/10"
              >
                <span>Xem danh bạ</span>
                <ArrowRight aria-hidden="true" size={12} weight="bold" />
              </Link>
            )}
          </div>

          <p className="max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
            {conciseTakeaway}
          </p>

          {/* Real Interactive Primary Emergency CTAs ONLY */}
          {isTextCheck && isPhishing && matchedBankInfo && (
            <div className="pt-1">
              <motion.a
                href={`tel:${matchedBankInfo.hotline.replace(/\s+/g, "")}`}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-120 hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:bg-rose-600 dark:hover:bg-rose-500"
              >
                <PhoneCall aria-hidden="true" size={17} weight="fill" className="shrink-0" />
                <span>
                  Gọi tổng đài {matchedBankInfo.name}:{" "}
                  <strong className="font-mono whitespace-nowrap tabular-nums">
                    {matchedBankInfo.hotline}
                  </strong>
                </span>
              </motion.a>
            </div>
          )}

          {(isPhoneCheck || isBankCheck) && isUnknown && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {mode === "user" && (
                <Link
                  href="/user/reports/new"
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground transition-opacity duration-120 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Megaphone aria-hidden="true" size={14} weight="fill" />
                  <span>
                    {isBankCheck ? "Báo cáo tài khoản này" : "Báo cáo số này"}
                  </span>
                </Link>
              )}
              <Link
                href="/guest/blacklist"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-4 text-xs font-semibold text-foreground transition-colors duration-120 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/12"
              >
                <ListMagnifyingGlass
                  aria-hidden="true"
                  size={14}
                  weight="bold"
                />
                <span>Tra cứu danh sách cảnh báo</span>
              </Link>
            </div>
          )}
        </div>

        {/* Right: Tactile Animated SVG Risk Gauge */}
        <div className="flex shrink-0 items-center justify-center border-t border-border/70 pt-4 md:w-44 md:border-t-0 md:border-l md:pt-0 md:pl-6 dark:border-white/10">
          <ScamRiskGauge
            riskScore={riskScore}
            riskLevel={verdict.risk_level}
            isCuratedLookup={isPhoneCheck || isBankCheck}
          />
        </div>
      </div>

      {/* Interactive Annotated Message Inspector (for TEXT) or Compact Target Strip */}
      {checkedContent && checkedContent.trim() && (
        <div className="border-t border-border/80 px-5 py-4 sm:px-6 dark:border-white/10">
          {isTextCheck ? (
            <ScamAnnotatedMessage
              key={scanId}
              rawText={checkedContent}
              features={features}
              riskLevel={verdict.risk_level}
            />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-medium text-muted-foreground">
                Đã kiểm tra:
              </span>
              <code className="rounded-md border border-border/80 bg-muted/40 px-2.5 py-1 font-mono text-sm font-semibold break-all text-foreground dark:border-white/10">
                {checkedContent}
              </code>
            </div>
          )}
        </div>
      )}

      {/* Ultra-Concise Action Checklist (Max 3 Steps, 14px, Staggered Entrance) */}
      {visibleSteps.length > 0 && (
        <div className="border-t border-border/80 bg-muted/20 px-5 py-4 sm:px-6 dark:border-white/10">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck
              aria-hidden="true"
              size={17}
              weight="fill"
              className={
                isDangerous
                  ? "text-rose-700 dark:text-rose-400"
                  : isSuspicious
                    ? "text-amber-700 dark:text-amber-400"
                    : isSafe
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-muted-foreground"
              }
            />
            <h3 className="font-heading text-sm font-semibold text-foreground">
              {isDangerous
                ? "Cần làm ngay"
                : isSuspicious
                  ? "Nên kiểm chứng trước"
                  : isSafe
                    ? "Lưu ý an toàn"
                    : "Khuyến nghị phòng ngừa"}
            </h3>
          </div>

          <ol className="space-y-2">
            {visibleSteps.map((step, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.18,
                  delay: 0.05 + index * 0.04,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="flex items-start gap-3 text-sm leading-relaxed text-foreground"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border text-xs font-semibold tabular-nums",
                    statusPill.stepMarker
                  )}
                >
                  {index + 1}
                </span>
                <span className="max-w-[65ch]">{step}</span>
              </motion.li>
            ))}
          </ol>
        </div>
      )}
    </motion.section>
  )
}
