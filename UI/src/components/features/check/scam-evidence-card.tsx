"use client"

import Link from "next/link"
import {
  ArrowRight,
  Bank,
  Brain,
  CaretDown,
  Check,
  Cpu,
  FileText,
  Scales,
  ShieldCheck,
  Warning,
  X,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import type { CheckScanResponse } from "@/features/check/types/check.types"

interface ScamEvidenceCardProps {
  data: CheckScanResponse
}

function FormattedCouncilSynthesis({ text }: { text: string }) {
  const sanitized = text
    .replace(
      /Kết luận (?:Hội đồng|Đánh Giá Đa Chiều Từ AI|Đánh Giá Đa Chiều|tổng hợp):\s*\*?\*?\s*/gi,
      ""
    )
    .replace(/Hội đồng/gi, "Hệ thống AI đa chiều")
    .replace(/hội đồng/gi, "hệ thống AI đa chiều")

  const bulletIndex = sanitized.search(/(?:^|\n|\s)-\s*\*\*/)

  if (bulletIndex === -1 && !sanitized.includes("- **")) {
    return (
      <p className="mt-2 max-w-[65ch] text-xs leading-relaxed whitespace-pre-line text-foreground/90">
        {sanitized.replace(/\*\*/g, "")}
      </p>
    )
  }

  const splitIdx = bulletIndex !== -1 ? bulletIndex : sanitized.indexOf("- **")
  const headerRaw = sanitized.substring(0, splitIdx).trim()
  const bodyRaw = sanitized.substring(splitIdx)

  const statusPart = headerRaw.split(/Tỷ lệ đồng thuận/i)[0].trim()
  const verdictText = statusPart
    .replace(/\*\*/g, "")
    .replace(/\.\s*$/, "")
    .trim()

  const consensusMatch = headerRaw.match(
    /Tỷ lệ đồng thuận[^:.]*:\s*([\d.]+%\.?)/i
  )
  const consensusRate = consensusMatch
    ? consensusMatch[1].replace(/\.$/, "")
    : ""

  const votingMatch = headerRaw.match(/\((Biểu quyết[^)]+|Kích hoạt[^)]+)\)/i)
  const votingMode = votingMatch
    ? votingMatch[1].replace(/thành viên/g, "chuyên gia AI")
    : ""

  const specRegex = /-\s*\*\*(.*?)\*\*:\s*([\s\S]*?)(?=(?:-\s*\*\*|$))/g
  const specialists: {
    title: string
    model: string
    content: string
    iconType: "bank" | "brain" | "scales"
  }[] = []
  let m: RegExpExecArray | null

  while ((m = specRegex.exec(bodyRaw)) !== null) {
    const rawRole = m[1].trim()
    const content = m[2].trim().replace(/\*\*/g, "")

    const modelMatch = rawRole.match(/^(.*?)\s*\(([^)]+)\)$/)
    let title = rawRole
    let model = ""

    if (modelMatch) {
      title = modelMatch[1].trim()
      model = modelMatch[2].trim()
    }

    let iconType: "bank" | "brain" | "scales" = "bank"
    if (/Cyber-Financial|Banking Security|Pháp Y|Tài Chính/i.test(title)) {
      title = "Pháp y Tài chính & Dòng tiền"
      iconType = "bank"
    } else if (
      /Psycholinguistic|Slang Profiler|Tâm Lý|Thao Túng/i.test(title)
    ) {
      title = "Tâm lý & Thao túng xã hội"
      iconType = "brain"
    } else if (
      /Public Defender|Anti-False-Positive|Biện Hộ|Bảo Vệ/i.test(title)
    ) {
      title = "Phản biện & Chống cảnh báo giả"
      iconType = "scales"
    }

    specialists.push({ title, model, content, iconType })
  }

  return (
    <div className="mt-3 space-y-3">
      {(verdictText || consensusRate || votingMode) && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {verdictText && (
            <span className="rounded-md bg-muted px-2 py-0.5 font-semibold text-foreground">
              {verdictText}
            </span>
          )}
          {consensusRate && (
            <span className="rounded-md bg-sky-500/10 px-2 py-0.5 font-medium text-sky-800 tabular-nums dark:bg-sky-500/15 dark:text-sky-300">
              Đồng thuận: <strong>{consensusRate}</strong>
            </span>
          )}
          {votingMode && (
            <span className="text-muted-foreground">{votingMode}</span>
          )}
        </div>
      )}

      <div className="divide-y divide-border/70 border-t border-border/70">
        {specialists.map((spec, idx) => (
          <div key={idx} className="space-y-1 py-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                {spec.iconType === "bank" && (
                  <Bank
                    aria-hidden="true"
                    size={14}
                    className="text-sky-600 dark:text-sky-400"
                  />
                )}
                {spec.iconType === "brain" && (
                  <Brain
                    aria-hidden="true"
                    size={14}
                    className="text-amber-600 dark:text-amber-400"
                  />
                )}
                {spec.iconType === "scales" && (
                  <Scales
                    aria-hidden="true"
                    size={14}
                    className="text-emerald-600 dark:text-emerald-400"
                  />
                )}
                <span>{spec.title}</span>
              </div>
              {spec.model && (
                <span className="rounded-md border border-border bg-background px-2 py-0.5 font-mono text-xs text-muted-foreground">
                  {spec.model}
                </span>
              )}
            </div>
            <p className="max-w-[65ch] leading-relaxed text-muted-foreground">
              {spec.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ScamEvidenceCard({ data }: ScamEvidenceCardProps) {
  const isDangerous = data.verdict.risk_level === "DANGEROUS"
  const isSafe = data.verdict.risk_level === "SAFE"
  const isSuspicious = data.verdict.risk_level === "SUSPICIOUS"
  const isUnknown =
    data.verdict.risk_level === "UNKNOWN" ||
    data.execution_provenance === "TRI_STATE_UNKNOWN"

  const features = data.deterministic_features
  const council = data.council_deliberation
  const steps = data.actionable_steps || data.recommendations || []
  const urgencyKeywords = features?.urgency_indicators?.matched_keywords || []
  const detectedUrls = features?.url_analysis?.detected_urls ?? []
  const detectedPhones = features?.phone_analysis?.detected_phones ?? []
  const riskScore = data.verdict.risk_score

  const councilVotes = council
    ? [
        council.cyber_banking_specialist,
        council.psycho_teencode_specialist,
        council.public_defender,
      ].filter(Boolean)
    : []
  const hasCouncilReport =
    councilVotes.length > 0 || Boolean(council?.final_synthesis)

  const isTier2 =
    data.tier_executed === 2 &&
    data.execution_provenance === "TIER2_FORENSIC_COUNCIL" &&
    hasCouncilReport

  const resolvedType = (data.input_type || "").toUpperCase()
  const isPhoneCheck = resolvedType === "PHONE"
  const isUrlCheck = resolvedType === "URL"
  const isBankCheck = resolvedType === "BANK_ACCOUNT"
  const isMessageCheck = !isPhoneCheck && !isUrlCheck && !isBankCheck
  const curatedOnlyCheck = isPhoneCheck || isBankCheck

  const stepsTitle = (() => {
    if (isPhoneCheck) {
      if (isDangerous) return "Việc bạn cần làm ngay với số điện thoại này"
      if (isSafe) return "Lưu ý an toàn khi liên hệ qua đầu số này"
      if (isSuspicious) return "Các bước kiểm chứng khi nhận cuộc gọi"
      return "Khuyến nghị phòng ngừa dành cho bạn"
    }
    if (isUrlCheck) {
      if (isDangerous) return "Việc bạn cần làm ngay để bảo vệ thiết bị"
      if (isSafe) return "Lưu ý an toàn khi truy cập đường dẫn này"
      if (isSuspicious) return "Các bước kiểm tra trước khi truy cập"
      return "Khuyến nghị phòng ngừa dành cho bạn"
    }
    if (isBankCheck) {
      if (isDangerous) return "Việc bạn cần làm ngay để bảo vệ tài khoản"
      if (isSafe) return "Lưu ý trước khi chuyển tiền đến tài khoản này"
      if (isSuspicious) return "Các bước kiểm chứng trước khi chuyển tiền"
      return "Khuyến nghị phòng ngừa dành cho bạn"
    }
    if (isDangerous) return "Việc bạn cần làm ngay lúc này"
    if (isSafe) return "Lưu ý bảo mật quan trọng"
    if (isSuspicious) return "Các bước kiểm chứng trước khi giao dịch"
    return "Khuyến nghị phòng ngừa dành cho bạn"
  })()

  const stepMarkerClass = isDangerous
    ? "border-rose-500/25 bg-rose-500/10 text-rose-800 dark:border-rose-400/25 dark:bg-rose-500/15 dark:text-rose-200"
    : isSafe
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-500/15 dark:text-emerald-200"
      : isSuspicious
        ? "border-amber-500/25 bg-amber-500/10 text-amber-900 dark:border-amber-400/25 dark:bg-amber-500/15 dark:text-amber-200"
        : "border-border bg-muted text-foreground"

  const isDirectoryBlacklist =
    Boolean(data.matched_indicator) && data.decided_by_stage === "BLACKLIST"
  const isDirectoryWhitelist =
    (Boolean(data.matched_indicator) && data.decided_by_stage === "WHITELIST") ||
    Boolean(
      features?.url_analysis?.is_in_official_whitelist &&
        detectedUrls.length > 0
    )

  const hasTechnicalDetails = Boolean(
    data.engine_details?.model_name ||
      data.execution_time_ms > 0 ||
      council?.final_synthesis ||
      (features?.visobert_token_attribution &&
        features.visobert_token_attribution.length > 0)
  )

  return (
    <div className="divide-y divide-border/80 overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xs dark:border-white/10 dark:divide-white/10">
      {/* ============================================================== */}
      {/* 1. WORKFLOW FIRST: WHAT SHOULD I DO RIGHT NOW? (14px Readable) */}
      {/* ============================================================== */}
      {steps.length > 0 && (
        <section aria-labelledby="scam-steps-heading" className="p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck
              aria-hidden="true"
              size={20}
              weight="fill"
              className={
                isDangerous
                  ? "text-rose-700 dark:text-rose-400"
                  : isSafe
                    ? "text-emerald-700 dark:text-emerald-400"
                    : isSuspicious
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-muted-foreground"
              }
            />
            <h3
              id="scam-steps-heading"
              className="font-heading text-base font-semibold tracking-[-0.01em] text-foreground"
            >
              {stepsTitle}
            </h3>
          </div>

          <ol className="divide-y divide-border/60">
            {steps.map((step, index) => (
              <li
                key={index}
                className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border text-xs font-semibold tabular-nums",
                    stepMarkerClass
                  )}
                >
                  {index + 1}
                </span>
                <p className="max-w-[65ch] text-sm leading-relaxed text-foreground">
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ============================================================== */}
      {/* 2. SCANNABLE EVIDENCE SUMMARY (Context-Aware by inputType)     */}
      {/* ============================================================== */}
      <section aria-labelledby="scam-evidence-heading" className="p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3
            id="scam-evidence-heading"
            className="font-heading text-base font-semibold tracking-[-0.01em] text-foreground"
          >
            {isTier2
              ? "Nhận định từ các chuyên gia AI"
              : "Cơ sở đánh giá & dấu hiệu phát hiện"}
          </h3>

          {isTier2 && council && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-800 tabular-nums dark:border-sky-400/25 dark:bg-sky-500/15 dark:text-sky-200">
              <Scales aria-hidden="true" size={14} weight="bold" />
              <span>
                {council.consensus_ratio
                  ? council.consensus_ratio.replace(
                      /Hội đồng|hội đồng/gi,
                      "Chuyên gia AI"
                    )
                  : `${councilVotes.length} chuyên gia đã thẩm định`}
              </span>
            </span>
          )}
        </div>

        {/* Single Unified Matched Directory Entry (if matched) */}
        {data.matched_indicator && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-muted/40 p-4 dark:border-white/10">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Đối chiếu danh bạ
                </span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold",
                    data.decided_by_stage === "WHITELIST"
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                      : "border-rose-500/25 bg-rose-500/10 text-rose-800 dark:text-rose-300"
                  )}
                >
                  {data.decided_by_stage === "WHITELIST"
                    ? "Danh bạ xác minh"
                    : "Danh sách cảnh báo"}
                </span>
              </div>
              <p className="font-mono text-sm font-semibold break-all text-foreground">
                {data.matched_indicator.value}
              </p>
            </div>

            <Link
              href={{
                pathname: "/guest/blacklist",
                query: {
                  search: data.matched_indicator.value,
                  tab:
                    data.decided_by_stage === "WHITELIST"
                      ? "whitelist"
                      : "blacklist",
                },
              }}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors duration-120 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:border-white/12"
            >
              <span>Xem trong Danh bạ</span>
              <ArrowRight aria-hidden="true" size={14} weight="bold" />
            </Link>
          </div>
        )}

        {/* CASE A: TIER 2 MULTI-SPECIALIST DELIBERATION */}
        {isTier2 && council ? (
          <div className="space-y-4">
            {(detectedUrls.length > 0 || detectedPhones.length > 0) && (
              <div className="space-y-2 rounded-lg border border-border/80 bg-muted/35 p-4 text-xs dark:border-white/10">
                <p className="font-semibold text-foreground">
                  Thực thể trích xuất trong tin nhắn
                </p>
                {detectedUrls.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">Liên kết:</span>
                    <code
                      className={cn(
                        "rounded-md px-2 py-0.5 font-mono text-xs font-semibold break-all",
                        features?.url_analysis?.is_in_official_whitelist
                          ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                          : "bg-rose-500/10 text-rose-800 dark:text-rose-300"
                      )}
                    >
                      {detectedUrls.join(", ")}
                    </code>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 font-semibold",
                        features?.url_analysis?.is_in_official_whitelist
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-rose-700 dark:text-rose-400"
                      )}
                    >
                      {features?.url_analysis?.is_in_official_whitelist ? (
                        <>
                          <Check aria-hidden="true" size={13} weight="bold" />
                          <span>Thuộc danh bạ chính thức</span>
                        </>
                      ) : (
                        <>
                          <X aria-hidden="true" size={13} weight="bold" />
                          <span>Chưa chứng thực</span>
                        </>
                      )}
                    </span>
                  </div>
                )}
                {detectedPhones.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">
                      Số điện thoại:
                    </span>
                    <code className="rounded-md bg-amber-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-amber-900 dark:text-amber-200">
                      {detectedPhones.join(", ")}
                    </code>
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-300">
                      {features?.phone_analysis?.is_official_hotline ? (
                        <>
                          <Check aria-hidden="true" size={13} weight="bold" />
                          <span>Tổng đài chính thức</span>
                        </>
                      ) : (
                        <>
                          <Warning aria-hidden="true" size={13} weight="bold" />
                          <span>Đầu số cá nhân</span>
                        </>
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="divide-y divide-border/70">
              {council.cyber_banking_specialist && (
                <div className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300">
                    <Bank aria-hidden="true" size={18} weight="fill" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        Góc nhìn An ninh Tài chính & Dòng tiền
                      </p>
                      <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-800 dark:text-rose-300">
                        Rà soát giao dịch
                      </span>
                    </div>
                    <p className="max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
                      {council.cyber_banking_specialist.rationale}
                    </p>
                  </div>
                </div>
              )}

              {council.psycho_teencode_specialist && (
                <div className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                    <Brain aria-hidden="true" size={18} weight="fill" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        Góc nhìn Tâm lý & Kịch bản thao túng
                      </p>
                      <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-900 dark:text-amber-200">
                        Phân tích hành vi
                      </span>
                    </div>
                    {council.psycho_teencode_specialist.manipulation_tactic && (
                      <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                        Chiêu thức nhận diện:{" "}
                        {council.psycho_teencode_specialist.manipulation_tactic}
                      </p>
                    )}
                    <p className="max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
                      {council.psycho_teencode_specialist.rationale}
                    </p>
                  </div>
                </div>
              )}

              {council.public_defender && (
                <div className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    <Scales aria-hidden="true" size={18} weight="fill" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        Góc nhìn Phản biện & Chống cảnh báo giả
                      </p>
                      <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                        Kiểm định khách quan
                      </span>
                    </div>
                    {council.public_defender.exculpatory_evidence && (
                      <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                        Yếu tố giảm nhẹ:{" "}
                        {council.public_defender.exculpatory_evidence}
                      </p>
                    )}
                    <p className="max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
                      {council.public_defender.rationale}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* CASE B: TIER 1 / CURATED LOOKUP — STRICTLY RELEVANT SIGNALS ONLY */
          <div className="divide-y divide-border/70">
            {/* Signal 1: Directory Verification */}
            <div className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
              <span
                aria-hidden="true"
                className={cn(
                  "mt-2 size-2 shrink-0 rounded-full",
                  isDirectoryBlacklist
                    ? "bg-rose-600 dark:bg-rose-400"
                    : isDirectoryWhitelist
                      ? "bg-emerald-600 dark:bg-emerald-400"
                      : "bg-slate-400 dark:bg-slate-500"
                )}
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    Đối chiếu danh bạ an toàn & cảnh báo
                  </p>
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-xs font-semibold",
                      isDirectoryBlacklist
                        ? "bg-rose-500/10 text-rose-800 dark:text-rose-300"
                        : isDirectoryWhitelist
                          ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isDirectoryBlacklist
                      ? "Trùng danh sách cảnh báo"
                      : isDirectoryWhitelist
                        ? "Thuộc danh bạ xác minh"
                        : "Chưa có trong danh bạ"}
                  </span>
                </div>
                <p className="max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
                  {isDirectoryBlacklist
                    ? `Chỉ số (${data.matched_indicator?.value}) đã được cộng đồng hoặc cơ quan chức năng ghi nhận có hành vi lừa đảo.`
                    : isDirectoryWhitelist
                      ? "Thông tin trùng khớp với danh bạ chính thức của tổ chức, ngân hàng đã được xác thực."
                      : curatedOnlyCheck
                        ? "Chưa ghi nhận trong danh sách cảnh báo cũng như danh bạ tổ chức xác minh. Hệ thống chỉ đối chiếu danh bạ cho loại này — chưa có tên không đồng nghĩa an toàn."
                        : "Chưa nằm trong danh sách đen đã xác nhận và không thuộc danh bạ cổng chính thức đã đăng ký."}
                </p>
              </div>
            </div>

            {/* Signal 2: Detected Links / Phones (ONLY for TEXT or URL checks) */}
            {!curatedOnlyCheck && (
              <div className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-2 size-2 shrink-0 rounded-full",
                    detectedUrls.length > 0
                      ? features?.url_analysis?.is_in_official_whitelist
                        ? "bg-emerald-600 dark:bg-emerald-400"
                        : "bg-rose-600 dark:bg-rose-400"
                      : isSafe
                        ? "bg-emerald-600 dark:bg-emerald-400"
                        : "bg-slate-400 dark:bg-slate-500"
                  )}
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {isUrlCheck
                        ? "Kiểm tra tên miền & đường dẫn"
                        : "Liên kết & số điện thoại trong tin nhắn"}
                    </p>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                      {isUrlCheck
                        ? `${detectedUrls.length} đường dẫn`
                        : `${detectedUrls.length} liên kết · ${detectedPhones.length} SĐT`}
                    </span>
                  </div>

                  {detectedUrls.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <code
                        className={cn(
                          "rounded-md px-2 py-0.5 font-mono font-semibold break-all",
                          features?.url_analysis?.is_in_official_whitelist
                            ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                            : "bg-rose-500/10 text-rose-800 dark:text-rose-300"
                        )}
                      >
                        {detectedUrls.join(", ")}
                      </code>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 font-semibold",
                          features?.url_analysis?.is_in_official_whitelist
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-rose-700 dark:text-rose-400"
                        )}
                      >
                        {features?.url_analysis?.is_in_official_whitelist ? (
                          <>
                            <Check aria-hidden="true" size={13} weight="bold" />
                            <span>Tên miền chính thống</span>
                          </>
                        ) : (
                          <>
                            <X aria-hidden="true" size={13} weight="bold" />
                            <span>Tên miền lạ, chưa chứng thực</span>
                          </>
                        )}
                      </span>
                    </div>
                  ) : (
                    isMessageCheck && (
                      <p className="text-sm text-muted-foreground">
                        Không phát hiện đường dẫn website trong tin nhắn.
                      </p>
                    )
                  )}

                  {isMessageCheck && detectedPhones.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <code className="rounded-md bg-amber-500/10 px-2 py-0.5 font-mono font-semibold text-amber-900 dark:text-amber-200">
                        {detectedPhones.join(", ")}
                      </code>
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-300">
                        {features?.phone_analysis?.is_official_hotline ? (
                          <>
                            <Check aria-hidden="true" size={13} weight="bold" />
                            <span>Tổng đài chính thức</span>
                          </>
                        ) : (
                          <>
                            <Warning
                              aria-hidden="true"
                              size={13}
                              weight="bold"
                            />
                            <span>Đầu số cá nhân (không phải tổng đài)</span>
                          </>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Signal 3: Content & Language Analysis (ONLY for non-curated types) */}
            {!curatedOnlyCheck && (
              <div className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-2 size-2 shrink-0 rounded-full",
                    isDangerous
                      ? "bg-rose-600 dark:bg-rose-400"
                      : isSuspicious
                        ? "bg-amber-500 dark:bg-amber-400"
                        : isSafe
                          ? "bg-emerald-600 dark:bg-emerald-400"
                          : "bg-slate-400 dark:bg-slate-500"
                  )}
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      Đánh giá dấu hiệu nội dung bằng AI
                    </p>
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
                        isDangerous
                          ? "bg-rose-500/10 text-rose-800 dark:text-rose-300"
                          : isSuspicious
                            ? "bg-amber-500/10 text-amber-900 dark:text-amber-200"
                            : isSafe
                              ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground"
                      )}
                    >
                      {riskScore != null
                        ? `Điểm rủi ro: ${riskScore}/100`
                        : "Chưa có điểm số"}
                    </span>
                  </div>

                  <p className="max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
                    {isUnknown
                      ? data.unknown_reason === "AI_UNAVAILABLE" ||
                        data.unknown_reason === "AI_INVALID_RESPONSE"
                        ? "Hệ thống phân tích AI tạm thời chưa phản hồi hợp lệ cho lượt này. Vui lòng thử lại sau."
                        : "Hệ thống chưa đủ độ chắc chắn để kết luận. Chưa xác định không đồng nghĩa với an toàn."
                      : isDangerous
                        ? riskScore != null
                          ? `Cấu trúc nội dung tương đồng cao với các mẫu lừa đảo đã ghi nhận (mức rủi ro ${riskScore}/100).`
                          : "Cấu trúc nội dung tương đồng với các mẫu tin nhắn rác hoặc lừa đảo đã ghi nhận."
                        : isSuspicious
                          ? riskScore != null
                            ? `Phát hiện một số dấu hiệu bất thường (mức rủi ro ${riskScore}/100). Nên xác minh thêm qua kênh chính thức.`
                            : "Phát hiện dấu hiệu bất thường trong nội dung. Nên xác minh thêm nguồn gửi."
                          : "Nội dung có cấu trúc thông báo thông thường, không phát hiện dấu hiệu đe dọa hay dẫn dụ."}
                  </p>

                  {urgencyKeywords.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                        Từ ngữ gây áp lực thời gian:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {urgencyKeywords.map((kw, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center rounded-md border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-800 dark:text-rose-200"
                          >
                            &ldquo;{kw}&rdquo;
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Signal 4: Sender Identity (ONLY for TEXT checks when present) */}
            {isMessageCheck && features?.brand_identity && (
              <div className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-2 size-2 shrink-0 rounded-full",
                    features.brand_identity.is_registered_brandname
                      ? "bg-emerald-600 dark:bg-emerald-400"
                      : "bg-amber-500 dark:bg-amber-400"
                  )}
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {features.brand_identity.is_registered_brandname
                      ? `Đầu số thương hiệu chính danh (${features.brand_identity.sender_header})`
                      : "Đầu số cá nhân / chưa định danh"}
                  </p>
                  <p className="max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
                    {features.brand_identity.is_registered_brandname
                      ? "Đầu số thương hiệu đã được các nhà mạng tại Việt Nam định danh chính thức."
                      : `Tin nhắn gửi từ số lạ (${features.brand_identity.sender_header}), không phải đầu số thương hiệu của ngân hàng hay cơ quan nhà nước.`}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ============================================================== */}
      {/* 3. PROGRESSIVE DISCLOSURE: TECHNICAL & AUDIT DRAWER (Collapsed) */}
      {/* ============================================================== */}
      {hasTechnicalDetails && (
        <div className="bg-muted/20 px-5 py-4 sm:px-6">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold text-muted-foreground transition-colors duration-120 select-none hover:text-foreground focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <Cpu aria-hidden="true" size={16} className="text-primary" />
                <span>Chi tiết kỹ thuật & kiểm toán mô hình AI</span>
              </span>
              <CaretDown
                aria-hidden="true"
                size={14}
                weight="bold"
                className="shrink-0 transition-transform duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] group-open:rotate-180"
              />
            </summary>

            <div className="mt-4 space-y-4 border-t border-border/70 pt-4 text-xs text-muted-foreground">
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">Hệ thống thực thi</dt>
                  <dd className="mt-0.5 font-mono font-semibold text-foreground">
                    {data.engine_details?.model_name || "ScamShield Core"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Thời gian phản hồi</dt>
                  <dd className="mt-0.5 font-mono font-semibold text-foreground tabular-nums">
                    {Math.round(data.execution_time_ms)} ms
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Mã phiên kiểm tra</dt>
                  <dd className="mt-0.5 font-mono font-semibold text-foreground tabular-nums">
                    {data.scan_id}
                  </dd>
                </div>
              </dl>

              {council?.final_synthesis && (
                <div className="border-t border-border/70 pt-3">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <FileText
                      aria-hidden="true"
                      size={15}
                      className="text-primary"
                    />
                    <span>Toàn văn tổng hợp đánh giá AI</span>
                  </div>
                  <FormattedCouncilSynthesis text={council.final_synthesis} />
                </div>
              )}

              {features?.visobert_token_attribution &&
                features.visobert_token_attribution.length > 0 && (
                  <div className="space-y-2 border-t border-border/70 pt-3">
                    <p className="font-semibold text-foreground">
                      Trọng số phân bổ từ khóa (ViSoBERT Attention)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {features.visobert_token_attribution.map((item, idx) => (
                        <div
                          key={idx}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs"
                        >
                          <span className="font-mono text-foreground">
                            &ldquo;{item.token}&rdquo;
                          </span>
                          <span className="rounded bg-rose-500/10 px-1 font-mono font-semibold text-rose-700 tabular-nums dark:text-rose-300">
                            +{(item.weight ?? 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </details>
        </div>
      )}
    </div>
  )
}
