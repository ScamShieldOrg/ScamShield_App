import { CheckCircle, Lightning, UsersThree } from "@phosphor-icons/react"
import type { ScamCheckResult } from "@/features/check/types/scam-check.types"
import { cn } from "@/lib/utils"

type CouncilAudit = NonNullable<
  NonNullable<ScamCheckResult["aiDetails"]>["councilAudit"]
>

interface ParsedBullet {
  roleKey: string
  rawRole: string
  detail: string
}

interface ParsedCouncilExplanation {
  hasCouncilMarkup: boolean
  headline: string | null
  paragraphs: string[]
  bullets: ParsedBullet[]
}

const AGENT_ROLE_LABELS: Record<string, string> = {
  "cyber-financial & banking security analyst":
    "Chuyên gia An ninh Tài chính & Ngân hàng",
  "psycholinguistic & vietnamese slang profiler":
    "Chuyên gia Ngôn ngữ & Tâm lý giao tiếp",
  "public defender & anti-false-positive advocate":
    "Chuyên gia Phản biện & Chống cảnh báo giả",
}

function formatAgentRole(role: string): string {
  const cleaned = role.replace(/\s*\([^)]*\)\s*$/, "").trim()
  const key = cleaned.toLowerCase()
  if (AGENT_ROLE_LABELS[key]) return AGENT_ROLE_LABELS[key]
  if (key.includes("cyber-financial") || key.includes("banking")) {
    return "Chuyên gia An ninh Tài chính & Ngân hàng"
  }
  if (key.includes("psycholinguistic") || key.includes("slang")) {
    return "Chuyên gia Ngôn ngữ & Tâm lý giao tiếp"
  }
  if (key.includes("public defender") || key.includes("false-positive")) {
    return "Chuyên gia Phản biện & Chống cảnh báo giả"
  }
  return cleaned || "Chuyên gia AI"
}

function getAgentVerdictBadge(verdict: string) {
  const normalized = verdict.trim().toUpperCase()
  if (normalized === "SAFE" || normalized === "LOW_RISK") {
    return {
      label: "An toàn",
      className:
        "border-emerald-600/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    }
  }
  if (normalized === "SUSPICIOUS") {
    return {
      label: "Đáng ngờ",
      className:
        "border-orange-600/20 bg-orange-500/10 text-orange-700 dark:text-orange-400",
    }
  }
  if (
    normalized === "DANGEROUS" ||
    normalized === "SCAM_RISK" ||
    normalized === "SCAM" ||
    normalized === "HIGH_RISK"
  ) {
    return {
      label: "Rủi ro cao",
      className: "border-destructive/20 bg-destructive/10 text-destructive",
    }
  }
  return {
    label: "Cần xác minh",
    className:
      "border-amber-600/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  }
}

function stripInlineMarkdown(value: string): string {
  return value.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*\*/g, "").trim()
}

export function parseCouncilExplanation(
  explanation: string | null
): ParsedCouncilExplanation {
  if (!explanation) {
    return {
      hasCouncilMarkup: false,
      headline: null,
      paragraphs: [],
      bullets: [],
    }
  }

  let hasCouncilMarkup = false
  let headline: string | null = null
  const paragraphs: string[] = []
  const bullets: ParsedBullet[] = []

  const lines = explanation
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  for (const line of lines) {
    const headlineMatch = line.match(
      /^\*{0,2}Kết luận Hội đồng:?\*{0,2}\s*(.+)$/i
    )
    if (headlineMatch) {
      hasCouncilMarkup = true
      const cleaned = stripInlineMarkdown(headlineMatch[1])
        .replace(/^[✓✔⚠🚨✗❌\uFE0F\s:-]+/, "")
        .replace(
          /\s*\((?:LOW[-_\s]?RISK|HIGH[-_\s]?RISK|MEDIUM[-_\s]?RISK|SAFE|SUSPICIOUS|DANGEROUS|UNKNOWN)\)\.?\s*$/i,
          ""
        )
        .replace(/\.$/, "")
        .trim()
      if (cleaned) headline = cleaned
      continue
    }

    if (/^\*{0,2}Tỷ lệ đồng thuận/i.test(line)) {
      hasCouncilMarkup = true
      continue
    }

    const bulletMatch = line.match(
      /^[-*•]\s*\*{0,2}(.+?)(?::\*{0,2}|\*{0,2}:)\s*(.+)$/
    )
    if (bulletMatch) {
      const rawLabel = stripInlineMarkdown(bulletMatch[1])
      const rawRole = rawLabel.replace(/\s*\([^)]*\)\s*$/, "").trim()
      const detail = stripInlineMarkdown(bulletMatch[2])
      if (/\*\*|\([^)]*\)/.test(bulletMatch[1])) {
        hasCouncilMarkup = true
      }
      bullets.push({
        roleKey: rawRole.toLowerCase(),
        rawRole,
        detail,
      })
      continue
    }

    const cleanedLine = stripInlineMarkdown(line)
    if (!cleanedLine) continue
    if (bullets.length > 0 && !/^[-*•]\s+/.test(line)) {
      bullets[bullets.length - 1].detail += ` ${cleanedLine}`
    } else {
      paragraphs.push(cleanedLine)
    }
  }

  return { hasCouncilMarkup, headline, paragraphs, bullets }
}

function formatConsensusSummary(
  verdict: string,
  councilAudit: CouncilAudit | null,
  fallbackCount: number
): string | null {
  const agents = councilAudit?.agents ?? []
  if (agents.length > 0) {
    const safeCount = agents.filter((agent) => {
      const v = agent.verdict.trim().toUpperCase()
      return v === "SAFE" || v === "LOW_RISK"
    }).length
    const riskyCount = agents.filter((agent) => {
      const v = agent.verdict.trim().toUpperCase()
      return (
        v === "DANGEROUS" ||
        v === "SUSPICIOUS" ||
        v === "SCAM_RISK" ||
        v === "SCAM" ||
        v === "HIGH_RISK"
      )
    }).length

    if (verdict === "LOW_RISK" && safeCount > 0) {
      return `${safeCount}/${agents.length} chuyên gia đánh giá an toàn`
    }
    if (riskyCount > 0) {
      return `${riskyCount}/${agents.length} chuyên gia cảnh báo rủi ro`
    }
    return `${agents.length} chuyên gia đã thẩm định`
  }

  const ratioMatch = councilAudit?.consensusRatio?.match(/^(\d+)\s*\/\s*(\d+)$/)
  if (ratioMatch) {
    const flagged = Number(ratioMatch[1])
    const total = Number(ratioMatch[2])
    if (total > 0) {
      if (verdict === "LOW_RISK" && flagged === 0) {
        return `${total}/${total} chuyên gia đánh giá an toàn`
      }
      return `${flagged}/${total} chuyên gia cảnh báo rủi ro`
    }
  }

  if (fallbackCount > 0) {
    return `${fallbackCount} chuyên gia phân tích`
  }

  return null
}

interface ScamCouncilSummaryProps {
  verdict: string
  parsed: ParsedCouncilExplanation
  councilAudit: CouncilAudit | null
  accentColorClass: string
  accentSurfaceClass: string
}

export function ScamCouncilSummary({
  verdict,
  parsed,
  councilAudit,
  accentColorClass,
  accentSurfaceClass,
}: ScamCouncilSummaryProps) {
  const agents = councilAudit?.agents ?? []
  const matchedBulletIndexes = new Set<number>()

  const specialistItems = agents.map((agent) => {
    const normalizedRole = agent.role
      .replace(/\s*\([^)]*\)\s*$/, "")
      .trim()
      .toLowerCase()
    const bulletIndex = parsed.bullets.findIndex(
      (bullet, idx) =>
        !matchedBulletIndexes.has(idx) &&
        (bullet.roleKey === normalizedRole ||
          bullet.roleKey.includes(normalizedRole) ||
          normalizedRole.includes(bullet.roleKey))
    )
    if (bulletIndex >= 0) matchedBulletIndexes.add(bulletIndex)
    return {
      title: formatAgentRole(agent.role),
      verdict: agent.verdict,
      score: agent.score,
      detail: bulletIndex >= 0 ? parsed.bullets[bulletIndex].detail : null,
    }
  })

  parsed.bullets.forEach((bullet, idx) => {
    if (!matchedBulletIndexes.has(idx)) {
      specialistItems.push({
        title: formatAgentRole(bullet.rawRole),
        verdict: "",
        score: Number.NaN,
        detail: bullet.detail,
      })
    }
  })

  const consensusLabel = formatConsensusSummary(
    verdict,
    councilAudit,
    specialistItems.length
  )

  return (
    <div className="space-y-5 rounded-3xl border border-border bg-muted/40 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <UsersThree
              aria-hidden="true"
              weight="duotone"
              className={cn("size-5 shrink-0", accentColorClass)}
            />
            <h3 className="text-base font-semibold text-foreground">
              Hội đồng thẩm định đa tác tử
            </h3>
          </div>
          {parsed.headline && (
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Kết luận: <span className={accentColorClass}>{parsed.headline}</span>
            </p>
          )}
        </div>

        {consensusLabel && (
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
              accentSurfaceClass,
              accentColorClass
            )}
          >
            {consensusLabel}
          </span>
        )}
      </div>

      {parsed.paragraphs.length > 0 && (
        <div className="space-y-2 text-sm leading-relaxed text-foreground sm:text-base">
          {parsed.paragraphs.map((paragraph, index) => (
            <p key={index} className="break-words">
              {paragraph}
            </p>
          ))}
        </div>
      )}

      {specialistItems.length > 0 && (
        <ul className="grid gap-3" aria-label="Đánh giá từ các chuyên gia AI">
          {specialistItems.map((item, index) => {
            const badge = item.verdict ? getAgentVerdictBadge(item.verdict) : null
            const hasScore = Number.isFinite(item.score)
            return (
              <li
                key={`${item.title}-${index}`}
                className="rounded-2xl border border-border bg-card p-4 shadow-2xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {item.title}
                  </p>
                  {(badge || hasScore) && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {badge && (
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-0.5 font-medium",
                            badge.className
                          )}
                        >
                          {badge.label}
                        </span>
                      )}
                      {hasScore && (
                        <span className="text-muted-foreground tabular-nums">
                          Điểm rủi ro:{" "}
                          <strong className="font-semibold text-foreground">
                            {item.score.toLocaleString("vi-VN", {
                              maximumFractionDigits: 1,
                            })}
                            /100
                          </strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {item.detail && (
                  <p className="mt-2 text-sm leading-relaxed break-words text-muted-foreground">
                    {item.detail}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {(councilAudit?.defenderIntervened || councilAudit?.earlyExit) && (
        <div className="flex flex-wrap gap-2 pt-1 text-xs text-muted-foreground">
          {councilAudit.defenderIntervened && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-1">
              <CheckCircle
                aria-hidden="true"
                className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
              />
              Đã qua bước phản biện chống cảnh báo giả
            </span>
          )}
          {councilAudit.earlyExit && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-1">
              <Lightning aria-hidden="true" className="size-3.5 shrink-0" />
              Kết luận sớm do các chuyên gia đồng thuận rõ ràng
            </span>
          )}
        </div>
      )}
    </div>
  )
}

