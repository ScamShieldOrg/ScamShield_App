"use client"

import { useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
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
import type {
  CheckScanResponse,
  SpecialistVote,
} from "@/features/check/types/check.types"

interface ScamEvidenceCardProps {
  data: CheckScanResponse
}

type EvidenceTab = "signals" | "council" | "technical"

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

  const specRegex = /-\s*\*\*(.*?)\*\*:\s*([\s\S]*?)(?=(?:-\s*\*\*|$))/g
  const specialists: { title: string; model: string; content: string }[] = []
  let m: RegExpExecArray | null

  while ((m = specRegex.exec(bodyRaw)) !== null) {
    const rawRole = m[1].trim()
    const content = m[2].trim().replace(/\*\*/g, "")
    const modelMatch = rawRole.match(/^(.*?)\s*\(([^)]+)\)$/)
    let title = modelMatch ? modelMatch[1].trim() : rawRole
    const model = modelMatch ? modelMatch[2].trim() : ""

    if (/Cyber-Financial|Banking Security|Pháp Y|Tài Chính/i.test(title)) {
      title = "Pháp y Tài chính & Dòng tiền"
    } else if (
      /Psycholinguistic|Slang Profiler|Tâm Lý|Thao Túng/i.test(title)
    ) {
      title = "Tâm lý & Thao túng xã hội"
    } else if (
      /Public Defender|Anti-False-Positive|Biện Hộ|Bảo Vệ/i.test(title)
    ) {
      title = "Phản biện & Chống cảnh báo giả"
    }

    specialists.push({ title, model, content })
  }

  return (
    <div className="mt-3 space-y-3">
      {(verdictText || consensusRate) && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {verdictText && (
            <span className="rounded-md bg-muted px-2 py-0.5 font-semibold text-foreground">
              {verdictText}
            </span>
          )}
          {consensusRate && (
            <span className="rounded-md bg-sky-500/10 px-2 py-0.5 font-medium text-sky-800 tabular-nums dark:text-sky-300">
              Đồng thuận: <strong>{consensusRate}</strong>
            </span>
          )}
        </div>
      )}

      <div className="divide-y divide-border/70 border-t border-border/70">
        {specialists.map((spec, idx) => (
          <div key={idx} className="space-y-1 py-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-foreground">{spec.title}</span>
              {spec.model && (
                <span className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
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

function getStanceMeta(stance?: SpecialistVote["stance"]) {
  if (stance === "SCAM") {
    return {
      label: "Cảnh báo lừa đảo",
      badge: "border-rose-500/25 bg-rose-500/10 text-rose-800 dark:text-rose-200",
    }
  }
  if (stance === "SUSPICIOUS") {
    return {
      label: "Đáng ngờ",
      badge:
        "border-amber-500/25 bg-amber-500/10 text-amber-900 dark:text-amber-200",
    }
  }
  return {
    label: "Góc nhìn giảm nhẹ",
    badge:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  }
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
  const urgencyKeywords = features?.urgency_indicators?.matched_keywords || []
  const detectedUrls = features?.url_analysis?.detected_urls ?? []
  const detectedPhones = features?.phone_analysis?.detected_phones ?? []
  const riskScore = data.verdict.risk_score

  const specialistEntries: {
    id: string
    title: string
    subtitle: string
    icon: typeof Bank
    iconClass: string
    vote: SpecialistVote
    highlightLabel?: string
    highlightText?: string
  }[] = []

  if (council?.cyber_banking_specialist) {
    specialistEntries.push({
      id: "finance",
      title: "An ninh Tài chính & Dòng tiền",
      subtitle: "Rà soát tài khoản thụ hưởng & liên kết ngân hàng",
      icon: Bank,
      iconClass:
        "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
      vote: council.cyber_banking_specialist,
    })
  }
  if (council?.psycho_teencode_specialist) {
    specialistEntries.push({
      id: "psycho",
      title: "Tâm lý & Kịch bản thao túng",
      subtitle: "Phân tích áp lực cảm xúc & ngôn ngữ dẫn dụ",
      icon: Brain,
      iconClass:
        "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      vote: council.psycho_teencode_specialist,
      highlightLabel: "Chiêu thức",
      highlightText: council.psycho_teencode_specialist.manipulation_tactic,
    })
  }
  if (council?.public_defender) {
    specialistEntries.push({
      id: "defender",
      title: "Phản biện & Chống cảnh báo giả",
      subtitle: "Kiểm định góc nhìn khách quan & yếu tố giảm nhẹ",
      icon: Scales,
      iconClass:
        "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      vote: council.public_defender,
      highlightLabel: "Yếu tố giảm nhẹ",
      highlightText: council.public_defender.exculpatory_evidence,
    })
  }

  const isTier2 =
    data.tier_executed === 2 &&
    data.execution_provenance === "TIER2_FORENSIC_COUNCIL" &&
    specialistEntries.length > 0

  const resolvedType = (data.input_type || "").toUpperCase()
  const isPhoneCheck = resolvedType === "PHONE"
  const isUrlCheck = resolvedType === "URL"
  const isBankCheck = resolvedType === "BANK_ACCOUNT"
  const isMessageCheck = !isPhoneCheck && !isUrlCheck && !isBankCheck
  const curatedOnlyCheck = isPhoneCheck || isBankCheck

  const isDirectoryBlacklist =
    Boolean(data.matched_indicator) && data.decided_by_stage === "BLACKLIST"
  const isDirectoryWhitelist =
    (Boolean(data.matched_indicator) && data.decided_by_stage === "WHITELIST") ||
    Boolean(
      features?.url_analysis?.is_in_official_whitelist &&
        detectedUrls.length > 0
    )

  const signalCount =
    1 +
    (!curatedOnlyCheck ? 1 : 0) +
    (!curatedOnlyCheck && (detectedUrls.length > 0 || detectedPhones.length > 0)
      ? 1
      : 0) +
    (isMessageCheck && features?.brand_identity ? 1 : 0)

  const defaultTab: EvidenceTab = isTier2 ? "council" : "signals"
  const [activeTab, setActiveTab] = useState<EvidenceTab>(defaultTab)
  const [openSpecialistId, setOpenSpecialistId] = useState<string | null>(
    specialistEntries[0]?.id ?? null
  )

  const tabs: { id: EvidenceTab; label: string; badge?: string }[] = [
    ...(isTier2
      ? [
          {
            id: "council" as const,
            label: "Chuyên gia AI",
            badge: `${specialistEntries.length}`,
          },
        ]
      : []),
    {
      id: "signals" as const,
      label: "Tín hiệu",
      badge: `${signalCount}`,
    },
    {
      id: "technical" as const,
      label: "Kỹ thuật",
    },
  ]

  const currentTab: EvidenceTab = tabs.some((t) => t.id === activeTab)
    ? activeTab
    : tabs[0].id

  return (
    <motion.section
      aria-label="Chi tiết bằng chứng phân tích"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xs dark:border-white/10"
    >
      {/* Interactive Sliding Tab Bar (Framer Motion layoutId) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 bg-muted/30 px-4 py-2 sm:px-5 dark:border-white/10">
        <div
          role="tablist"
          aria-label="Chuyển xem chi tiết phân tích"
          className="inline-flex items-center gap-1 rounded-lg bg-muted/60 p-1 dark:bg-muted/30"
        >
          {tabs.map((tab) => {
            const selected = currentTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors duration-120 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  selected
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {selected && (
                  <motion.span
                    layoutId={`evidence-tab-pill-${data.scan_id}`}
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 32,
                    }}
                    className="absolute inset-0 rounded-md bg-background shadow-2xs ring-1 ring-border dark:bg-card dark:ring-white/15"
                  />
                )}
                <span className="relative z-10 whitespace-nowrap">
                  {tab.label}
                </span>
                {tab.badge && (
                  <span className="relative z-10 rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {isTier2 && council?.consensus_ratio && (
          <span className="hidden items-center gap-1.5 text-xs font-medium text-sky-700 tabular-nums sm:inline-flex dark:text-sky-300">
            <Scales aria-hidden="true" size={14} weight="bold" />
            <span>
              {council.consensus_ratio.replace(
                /Hội đồng|hội đồng/gi,
                "Chuyên gia AI"
              )}
            </span>
          </span>
        )}
      </div>

      {/* Animated Tab Panel Content */}
      <div className="p-4 sm:p-5">
        <AnimatePresence mode="wait" initial={false}>
          {/* TAB A: INTERACTIVE AI SPECIALIST ACCORDIONS (TIER 2) */}
          {currentTab === "council" && isTier2 && (
            <motion.div
              key="panel-council"
              role="tabpanel"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="divide-y divide-border/70"
            >
              {specialistEntries.map((spec) => {
                const Icon = spec.icon
                const isOpen = openSpecialistId === spec.id
                const stance = getStanceMeta(spec.vote.stance)

                return (
                  <div key={spec.id} className="py-3 first:pt-0 last:pb-0">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() =>
                        setOpenSpecialistId(isOpen ? null : spec.id)
                      }
                      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg py-1 text-left transition-colors duration-120 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-lg border",
                            spec.iconClass
                          )}
                        >
                          <Icon aria-hidden="true" size={17} weight="fill" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">
                            {spec.title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {spec.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={cn(
                            "hidden rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap sm:inline-flex",
                            stance.badge
                          )}
                        >
                          {stance.label}
                        </span>
                        <CaretDown
                          aria-hidden="true"
                          size={15}
                          weight="bold"
                          className={cn(
                            "text-muted-foreground transition-transform duration-150",
                            isOpen && "rotate-180"
                          )}
                        />
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{
                            duration: 0.18,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-2 pt-3 pl-12">
                            {spec.highlightText && (
                              <p className="text-xs font-semibold text-foreground">
                                {spec.highlightLabel}:{" "}
                                <span className="font-normal text-muted-foreground">
                                  {spec.highlightText}
                                </span>
                              </p>
                            )}
                            <p className="max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
                              {spec.vote.rationale}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </motion.div>
          )}

          {/* TAB B: CONCISE CONTEXT-AWARE SIGNALS */}
          {currentTab === "signals" && (
            <motion.div
              key="panel-signals"
              role="tabpanel"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="divide-y divide-border/70"
            >
              {/* Row 1: Directory Lookup */}
              <div className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 flex-1 items-start gap-3">
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
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      Đối chiếu danh bạ an toàn & cảnh báo
                    </p>
                    <p className="max-w-[60ch] text-xs leading-relaxed text-muted-foreground">
                      {isDirectoryBlacklist
                        ? `Trùng khớp danh sách cảnh báo (${data.matched_indicator?.value}).`
                        : isDirectoryWhitelist
                          ? "Trùng khớp danh bạ tổ chức / ngân hàng chính thức đã xác minh."
                          : curatedOnlyCheck
                            ? "Chưa có trong danh sách cảnh báo lẫn danh bạ xác minh (loại này chỉ tra cứu danh bạ, không dùng AI)."
                            : "Chưa nằm trong danh sách đen quốc gia và không thuộc danh bạ cổng chính thức."}
                    </p>
                  </div>
                </div>

                {data.matched_indicator ? (
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
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors duration-120 hover:bg-muted dark:border-white/12"
                  >
                    <span>Danh bạ</span>
                    <ArrowRight aria-hidden="true" size={13} weight="bold" />
                  </Link>
                ) : (
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
                      isDirectoryBlacklist
                        ? "bg-rose-500/10 text-rose-800 dark:text-rose-300"
                        : isDirectoryWhitelist
                          ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isDirectoryBlacklist
                      ? "Cảnh báo"
                      : isDirectoryWhitelist
                        ? "Đã xác minh"
                        : "Chưa ghi nhận"}
                  </span>
                )}
              </div>

              {/* Row 2: Detected URLs / Phones (ONLY for TEXT/URL when present) */}
              {!curatedOnlyCheck &&
                (detectedUrls.length > 0 || detectedPhones.length > 0) && (
                  <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-2 size-2 shrink-0 rounded-full",
                        detectedUrls.length > 0 &&
                          !features?.url_analysis?.is_in_official_whitelist
                          ? "bg-rose-600 dark:bg-rose-400"
                          : "bg-amber-500 dark:bg-amber-400"
                      )}
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-sm font-semibold text-foreground">
                        {isUrlCheck
                          ? "Đánh giá tên miền"
                          : "Liên kết & số điện thoại trích xuất"}
                      </p>

                      {detectedUrls.length > 0 && (
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
                                <Check
                                  aria-hidden="true"
                                  size={13}
                                  weight="bold"
                                />
                                <span>Tên miền chính thống</span>
                              </>
                            ) : (
                              <>
                                <X
                                  aria-hidden="true"
                                  size={13}
                                  weight="bold"
                                />
                                <span>Chưa chứng thực</span>
                              </>
                            )}
                          </span>
                        </div>
                      )}

                      {isMessageCheck && detectedPhones.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <code className="rounded-md bg-amber-500/10 px-2 py-0.5 font-mono font-semibold text-amber-900 dark:text-amber-200">
                            {detectedPhones.join(", ")}
                          </code>
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-300">
                            {features?.phone_analysis?.is_official_hotline ? (
                              <>
                                <Check
                                  aria-hidden="true"
                                  size={13}
                                  weight="bold"
                                />
                                <span>Tổng đài chính thức</span>
                              </>
                            ) : (
                              <>
                                <Warning
                                  aria-hidden="true"
                                  size={13}
                                  weight="bold"
                                />
                                <span>Đầu số cá nhân</span>
                              </>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* Row 3: AI Content Assessment (non-curated only) */}
              {!curatedOnlyCheck && (
                <div className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
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
                    <div className="min-w-0 space-y-1.5">
                      <p className="text-sm font-semibold text-foreground">
                        Phân tích ngữ cảnh & ngôn ngữ AI
                      </p>
                      <p className="max-w-[60ch] text-xs leading-relaxed text-muted-foreground">
                        {isUnknown
                          ? data.unknown_reason === "AI_UNAVAILABLE" ||
                            data.unknown_reason === "AI_INVALID_RESPONSE"
                            ? "Dịch vụ AI chưa phản hồi hợp lệ ở lượt này — vui lòng thử lại sau."
                            : "Chưa đủ độ chắc chắn để khẳng định — nên xác minh độc lập."
                          : isDangerous
                            ? "Cấu trúc ngôn ngữ tương đồng cao với các kịch bản lừa đảo đã ghi nhận."
                            : isSuspicious
                              ? "Phát hiện một số dấu hiệu bất thường cần kiểm chứng thêm."
                              : "Ngữ cảnh bình thường, không phát hiện yếu tố đe dọa hay trục lợi."}
                      </p>

                      {urgencyKeywords.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {urgencyKeywords.map((kw, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center rounded-md border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-800 dark:text-rose-200"
                            >
                              &ldquo;{kw}&rdquo;
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {riskScore != null && (
                    <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-foreground tabular-nums">
                      {riskScore}/100
                    </span>
                  )}
                </div>
              )}

              {/* Row 4: Sender Identity (TEXT only) */}
              {isMessageCheck && features?.brand_identity && (
                <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-2 size-2 shrink-0 rounded-full",
                      features.brand_identity.is_registered_brandname
                        ? "bg-emerald-600 dark:bg-emerald-400"
                        : "bg-amber-500 dark:bg-amber-400"
                    )}
                  />
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {features.brand_identity.is_registered_brandname
                        ? `Đầu số thương hiệu (${features.brand_identity.sender_header})`
                        : `Số gửi chưa định danh (${features.brand_identity.sender_header})`}
                    </p>
                    <p className="max-w-[60ch] text-xs leading-relaxed text-muted-foreground">
                      {features.brand_identity.is_registered_brandname
                        ? "Đầu số đã được nhà mạng tại Việt Nam định danh chính thức."
                        : "Không phải đầu số thương hiệu chính thức của ngân hàng hay cơ quan nhà nước."}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB C: TECHNICAL & AUDIT METADATA */}
          {currentTab === "technical" && (
            <motion.div
              key="panel-technical"
              role="tabpanel"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4 text-xs text-muted-foreground"
            >
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border/70 bg-muted/25 p-3 dark:border-white/10">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <Cpu aria-hidden="true" size={14} className="text-primary" />
                    <span>Mô hình thực thi</span>
                  </dt>
                  <dd className="mt-1 font-mono font-semibold text-foreground">
                    {data.engine_details?.model_name || "ScamShield Core"}
                  </dd>
                </div>

                <div className="rounded-lg border border-border/70 bg-muted/25 p-3 dark:border-white/10">
                  <dt className="text-muted-foreground">Thời gian phản hồi</dt>
                  <dd className="mt-1 font-mono font-semibold text-foreground tabular-nums">
                    {Math.round(data.execution_time_ms)} ms
                  </dd>
                </div>

                <div className="rounded-lg border border-border/70 bg-muted/25 p-3 dark:border-white/10">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <ShieldCheck aria-hidden="true" size={14} />
                    <span>Mã phiên quét</span>
                  </dt>
                  <dd className="mt-1 font-mono font-semibold text-foreground tabular-nums">
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
                    <span>Toàn văn tổng hợp AI</span>
                  </div>
                  <FormattedCouncilSynthesis text={council.final_synthesis} />
                </div>
              )}

              {features?.visobert_token_attribution &&
                features.visobert_token_attribution.length > 0 && (
                  <div className="space-y-2 border-t border-border/70 pt-3">
                    <p className="font-semibold text-foreground">
                      Trọng số từ khóa (ViSoBERT Attention)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {features.visobert_token_attribution.map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 font-mono text-xs"
                        >
                          <span className="text-foreground">
                            &ldquo;{item.token}&rdquo;
                          </span>
                          <span className="rounded bg-rose-500/10 px-1 font-semibold text-rose-700 tabular-nums dark:text-rose-300">
                            +{(item.weight ?? 0).toFixed(2)}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  )
}
