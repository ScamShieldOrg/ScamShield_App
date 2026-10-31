import {
  ArrowRight,
  CheckCircle,
  Info,
  ShieldCheck,
  ShieldWarning,
  Sparkle,
  WarningCircle,
} from "@phosphor-icons/react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import type { ScamCheckResult } from "@/features/check/types/scam-check.types"
import { cn } from "@/lib/utils"

const appearances = {
  LOW_RISK: {
    title: "Mức độ rủi ro thấp",
    badge: "Ít dấu hiệu rủi ro",
    Icon: ShieldCheck,
    color: "text-emerald-700 dark:text-emerald-400",
    iconSurface: "border-emerald-600/20 bg-emerald-500/10",
    accent: "from-emerald-600 to-emerald-600/40",
    meter: "bg-emerald-600 dark:bg-emerald-400",
    note: "Rủi ro thấp không bảo đảm an toàn tuyệt đối. Luôn xác minh danh tính và yêu cầu giao dịch qua kênh chính thức.",
  },
  SCAM_RISK: {
    title: "Mức độ rủi ro cao",
    badge: "Nguy hiểm — dừng lại",
    Icon: ShieldWarning,
    color: "text-destructive",
    iconSurface: "border-destructive/20 bg-destructive/10",
    accent: "from-destructive to-destructive/40",
    meter: "bg-destructive",
    note: "Rủi ro cao là dấu hiệu cảnh báo. Kết quả phân tích vẫn có thể sai lệch; hãy đối chiếu với nguồn chính thống.",
  },
  SUSPICIOUS: {
    title: "Có dấu hiệu đáng ngờ",
    badge: "Cần kiểm tra thêm",
    Icon: ShieldWarning,
    color: "text-orange-700 dark:text-orange-400",
    iconSurface: "border-orange-600/20 bg-orange-500/10",
    accent: "from-orange-600 to-orange-600/40",
    meter: "bg-orange-600 dark:bg-orange-400",
    note: "Hãy xác minh yêu cầu qua kênh chính thức trước khi tiếp tục tương tác.",
  },
  UNKNOWN: {
    title: "Chưa đủ cơ sở kết luận",
    badge: "Cần xác minh thêm",
    Icon: WarningCircle,
    color: "text-amber-700 dark:text-amber-400",
    iconSurface: "border-amber-600/20 bg-amber-500/10",
    accent: "from-amber-600 to-amber-600/40",
    meter: "bg-amber-600 dark:bg-amber-400",
    note: "Chưa xác định không có nghĩa là an toàn. Hãy xác minh qua kênh chính thức trước khi chuyển tiền hoặc chia sẻ thông tin.",
  },
}

export function ScamCheckVerdict({ result }: { result: ScamCheckResult }) {
  const appearance =
    result.verdict === "LOW_RISK"
      ? appearances.LOW_RISK
      : result.verdict === "SCAM_RISK"
        ? appearances.SCAM_RISK
        : result.verdict === "SUSPICIOUS"
          ? appearances.SUSPICIOUS
        : appearances.UNKNOWN
  const { Icon } = appearance
  const isVisoBert = result.decidedByStage === "VISOBERT"
  const isAi = isVisoBert || result.decidedByStage === "LLM" || result.decidedByStage === "URL_REPUTATION"
  const confidence =
    result.confidence != null &&
    Number.isFinite(result.confidence) &&
    result.confidence >= 0 &&
    result.confidence <= 1
      ? result.confidence
      : null
  const isUrlReputation = result.decidedByStage === "URL_REPUTATION"
  const isUncertainUrl = isUrlReputation && result.verdict === "UNKNOWN"
  const showConfidence =
    confidence != null && result.verdict !== "UNKNOWN" && !isUrlReputation
  const stage =
    {
      BLACKLIST: "Danh sách cảnh báo đã xác minh",
      WHITELIST: "Thông tin đối tác đã xác minh",
      VISOBERT: "Phân tích AI",
      LLM: "Phân tích AI chuyên sâu",
      URL_REPUTATION: "Đánh giá URL",
      NONE: "Chưa hoàn tất phân tích",
    }[result.decidedByStage] || "Phân tích nội dung"
  const reasons = isAi
    ? []
    : result.reasons.filter(
        (reason) => reason.detail && reason.code !== "AI_SCAN_ID"
      )
  const guidance =
    result.safetyGuidance
      ?.split(/\r?\n/)
      .map((line) => line.trim().replace(/^(?:[-*•]\s+|\d+[.)]\s+)/, ""))
      .filter(Boolean) || []
  const explanationParts = isUrlReputation
    ? result.explanation?.split(/(phishtank|safe_browsing)/gi)
    : null

  return (
    <section
      aria-labelledby="guest-verdict-title"
      className="relative w-full overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-lg shadow-foreground/5"
    >
      <div
        aria-hidden="true"
        className={cn("h-2 bg-linear-to-r", appearance.accent)}
      />
      <div className="space-y-7 p-5 sm:space-y-8 sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase sm:text-sm">
            Kết quả kiểm tra #{result.checkId}
          </p>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-accent px-3 py-1 text-xs font-medium text-accent-foreground sm:text-sm">
            {isAi ? (
              <Sparkle aria-hidden="true" className="size-4 shrink-0" />
            ) : (
              <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
            )}
            {stage}
          </span>
        </div>

        <div className="flex items-start gap-4 sm:gap-5">
          <div
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-2xl border sm:size-18 sm:rounded-3xl",
              appearance.iconSurface,
              appearance.color
            )}
          >
            <Icon
              aria-hidden="true"
              weight="bold"
              className="size-7 sm:size-9"
            />
          </div>
          <div className="min-w-0 space-y-3 pt-1">
            <h2
              id="guest-verdict-title"
              className="font-heading text-2xl leading-tight font-bold tracking-tight sm:text-4xl"
            >
              {isUncertainUrl ? "Chưa thể xác nhận URL an toàn" : appearance.title}
            </h2>
            <span
              className={cn(
                "inline-flex rounded-full border px-3 py-1 text-xs font-medium sm:text-sm",
                appearance.iconSurface,
                appearance.color
              )}
            >
              {isUncertainUrl ? "Cần xác minh trước khi sử dụng" : appearance.badge}
            </span>
          </div>
        </div>

        {isUncertainUrl && (
          <div className="rounded-2xl border border-amber-600/20 bg-amber-500/5 p-5 text-sm leading-relaxed dark:border-amber-400/20 sm:p-6 sm:text-base">
            <h3 className="font-semibold text-amber-800 dark:text-amber-300">
              Kết quả đối chiếu nguồn cảnh báo
            </h3>
            <p className="mt-2 text-muted-foreground">
              Chưa có bằng chứng đủ mạnh để xác định URL này nguy hiểm. Việc không
              khớp danh sách cảnh báo không chứng minh URL an toàn. Hãy mở dịch vụ
              từ ứng dụng hoặc địa chỉ chính thức bạn tự nhập nếu liên kết yêu cầu
              đăng nhập, thanh toán hay cung cấp thông tin cá nhân.
            </p>
          </div>
        )}

        {showConfidence && (
          <div className="space-y-4 rounded-3xl border border-border bg-muted/60 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p
                id="guest-confidence-label"
                className="text-sm font-medium text-muted-foreground sm:text-base"
              >
                Độ tin cậy của kết quả
              </p>
              <p
                className={cn(
                  "font-heading font-bold tabular-nums",
                  "text-3xl sm:text-4xl"
                )}
              >
                {confidence.toLocaleString("vi-VN", {
                  style: "percent",
                  maximumFractionDigits: 1,
                })}
              </p>
            </div>
            <div
              role="meter"
              aria-labelledby="guest-confidence-label"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Number((confidence * 100).toFixed(1))}
              className="h-2.5 overflow-hidden rounded-full bg-border"
            >
              <div
                className={cn("h-full rounded-full", appearance.meter)}
                style={{ width: `${confidence * 100}%` }}
              />
            </div>
          </div>
        )}

        {!isUncertainUrl && result.explanation && (
          <p className="text-sm leading-relaxed break-words whitespace-pre-line sm:text-base">
            {explanationParts
              ? explanationParts.map((part, index) => {
                  const source = part.toLowerCase()
                  if (source !== "phishtank" && source !== "safe_browsing")
                    return part
                  return (
                    <a
                      key={index}
                      href={
                        source === "phishtank"
                          ? "https://phishtank.org/faq.php"
                          : "https://safebrowsing.google.com/"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      aria-label={`Tìm hiểu ${source === "phishtank" ? "PhishTank" : "Google Safe Browsing"} (mở tab mới)`}
                    >
                      {source === "phishtank" ? "PhishTank" : "Google Safe Browsing"}
                    </a>
                  )
                })
              : result.explanation}
          </p>
        )}

        {!isUncertainUrl && (
          <div className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            <Info aria-hidden="true" className="mt-1 size-5 shrink-0" />
            <p>{appearance.note}</p>
          </div>
        )}

        {result.matchedIndicator && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/50 p-5 text-sm">
            <div className="min-w-0">
              <span className="font-semibold">Thông tin đối chiếu: </span>
              <span className="font-mono break-all">
                {result.matchedIndicator.value}
              </span>
            </div>
            {(result.decidedByStage === "BLACKLIST" ||
              result.decidedByStage === "WHITELIST") && (
              <Link
                href={{
                  pathname: "/guest/blacklist",
                  query: {
                    search: result.matchedIndicator.value,
                    tab:
                      result.decidedByStage === "WHITELIST"
                        ? "whitelist"
                        : "blacklist",
                  },
                }}
                className={buttonVariants({ variant: "outline" })}
              >
                Xem trong Tài nguyên{" "}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            )}
          </div>
        )}

        {reasons.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold sm:text-base">
              Cơ sở đánh giá
            </h3>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
              {reasons.map((reason, index) => (
                <li key={`${reason.code}-${index}`} className="break-words">
                  {reason.detail}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.aiDetails && (
          <div className="space-y-5 rounded-2xl border border-border bg-muted/30 p-5">
            <h3 className="font-semibold">Chi tiết phân tích AI</h3>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <p>Điểm rủi ro: <strong>{result.aiDetails.verdict.riskScore == null ? "Chưa xác định" : `${result.aiDetails.verdict.riskScore}/100`}</strong></p>
              {result.aiDetails.verdict.scamType && <p>Phân loại AI: <strong>{result.aiDetails.verdict.scamType}</strong></p>}
            </div>
            {result.aiDetails.radarMetrics && (
              <div>
                <h4 className="mb-3 text-sm font-semibold">Các dấu hiệu rủi ro</h4>
                {isUrlReputation && <p className="mb-3 text-xs text-muted-foreground">Các chỉ số này không phải xác suất URL an toàn.</p>}
                <dl className="space-y-2">
                  {([
                    ["urgency", "Thúc giục khẩn cấp"],
                    ["authority_impersonation", "Giả mạo thẩm quyền"],
                    ["financial_lure", "Dụ dỗ tài chính"],
                    ["suspicious_channel", "Kênh liên hệ đáng ngờ"],
                    ["data_harvesting", "Thu thập dữ liệu"],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-2 text-sm">
                      <dt>{label}</dt><dd className="text-right tabular-nums">{result.aiDetails!.radarMetrics![key]}/100</dd>
                      <div className="col-span-2 h-2 overflow-hidden rounded-full bg-border" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={result.aiDetails!.radarMetrics![key]}>
                        <div className={cn("h-full", appearance.meter)} style={{ width: `${result.aiDetails!.radarMetrics![key]}%` }} />
                      </div>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            {result.aiDetails.councilAudit && (
              <details className="text-sm">
                <summary className="cursor-pointer font-semibold">Thông tin hội đồng đánh giá</summary>
                <div className="mt-3 space-y-2">
                  {result.aiDetails.councilAudit.consensusRatio && <p>Mức đồng thuận: {result.aiDetails.councilAudit.consensusRatio}</p>}
                  {result.aiDetails.councilAudit.leadModel && <p>Mô hình điều phối: {result.aiDetails.councilAudit.leadModel}</p>}
                  {result.aiDetails.councilAudit.earlyExit && <p>Hội đồng kết luận sớm.</p>}
                  {result.aiDetails.councilAudit.defenderIntervened && <p>Có bước phản biện bổ sung.</p>}
                  {result.aiDetails.councilAudit.agents.map((agent, index) => (
                    <p key={`${agent.role}-${index}`}>{agent.role}: {agent.verdict} ({agent.score}/100)</p>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {guidance.length > 0 && (
          <div className="rounded-3xl border border-border bg-muted/40 p-5 sm:p-6">
            <h3 className="mb-4 text-sm font-semibold sm:text-base">
              Khuyến cáo an toàn
            </h3>
            <ul className="space-y-4">
              {guidance.map((item, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 text-sm leading-relaxed sm:text-base"
                >
                  <CheckCircle
                    aria-hidden="true"
                    className={cn("mt-1 size-5 shrink-0", appearance.color)}
                  />
                  <span className="min-w-0 break-words">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
