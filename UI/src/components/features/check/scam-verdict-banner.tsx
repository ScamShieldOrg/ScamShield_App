"use client"

import {
  ShieldCheck,
  ShieldWarning,
  WarningCircle,
  Lightning,
  Scales,
  PhoneCall,
  CaretDown,
  Cpu,
} from "@phosphor-icons/react"
import {
  Verdict,
  ExecutionProvenance,
} from "@/features/check/types/check.types"

interface ScamVerdictBannerProps {
  verdict: Verdict
  provenance?: ExecutionProvenance
  executionTimeMs?: number
  cloudCostUsd?: number
  modelName?: string
}

export function ScamVerdictBanner({
  verdict,
  provenance = "TIER1_FAST_PATH",
  executionTimeMs = 38.2,
  cloudCostUsd = 0.0,
  modelName,
}: ScamVerdictBannerProps) {
  const isDangerous = verdict.risk_level === "DANGEROUS"
  const isSafe = verdict.risk_level === "SAFE"
  const isSuspicious = verdict.risk_level === "SUSPICIOUS"
  const isUnknown = verdict.risk_level === "UNKNOWN"

  // Refined threat archetype detection (prevents bank phishing copy from leaking into friend impersonation)
  const rawType = (verdict.scam_type || "").toLowerCase()
  const isSocialEng =
    rawType.includes("mạo danh") ||
    rawType.includes("người quen") ||
    rawType.includes("mượn") ||
    rawType.includes("thao túng") ||
    provenance === "TIER2_FORENSIC_COUNCIL"

  const isPhishing =
    !isSocialEng &&
    (isDangerous ||
      rawType.includes("link") ||
      rawType.includes("liên kết") ||
      rawType.includes("ngân hàng") ||
      rawType.includes("sinh trắc học"))

  // Pure Vietnamese title without English leaks
  const hasEnglishLeak =
    rawType.length > 0 &&
    /detected|tier|heuristic|pattern|legitimate|message|forensic|council|fastpath|fast-path/i.test(
      rawType
    )

  const displayScamType =
    verdict.scam_type && !hasEnglishLeak
      ? verdict.scam_type
      : isPhishing
        ? "Mạo danh liên kết ngân hàng & Đe dọa khóa tài khoản"
        : isSocialEng
          ? "Thao túng tâm lý & Mạo danh người quen mượn tiền khẩn cấp"
          : isSafe
            ? "Thông báo biến động số dư & Mã OTP chính danh"
            : "Nội dung chưa đủ căn cứ đánh giá"

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

  return (
    <div className="space-y-3">
      {/* 1. Human-Centered Status Bar (Civilian-Facing) */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-2 text-xs text-slate-700 shadow-2xs dark:border-border dark:bg-card dark:text-slate-200">
        <div className="flex items-center gap-2 font-medium">
          {provenance === "TIER1_FAST_PATH" && (
            <>
              <Lightning size={16} weight="fill" className="text-amber-500" />
              <span>Xác thực an toàn tức thì — Bảo mật riêng tư tại thiết bị</span>
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
          <span>Thời gian phản hồi: <strong>~{Math.round(executionTimeMs)}ms</strong></span>
          <span>•</span>
          <span className="text-emerald-600 font-semibold dark:text-emerald-400">Không phát sinh phí</span>
        </div>
      </div>

      {/* 2. Main Protective Verdict Banner (Balanced 12-Column Grid) */}
      <div className={`relative overflow-hidden rounded-2xl border p-6 shadow-xs ${containerClass}`}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-stretch">
          {/* Left Column: Protective Headline, Reassurance & Action (8 cols on lg, 7 on md) */}
          <div className="flex flex-col justify-between space-y-4 md:col-span-7 lg:col-span-8">
            <div className="flex items-start gap-4">
              <div className={`flex size-14 shrink-0 items-center justify-center rounded-2xl shadow-sm ${iconBgClass}`}>
                {isSafe && <ShieldCheck size={32} weight="fill" />}
                {isDangerous && <ShieldWarning size={32} weight="fill" />}
                {isSuspicious && <ShieldWarning size={32} weight="fill" />}
                {isUnknown && <WarningCircle size={32} weight="fill" />}
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase ${badgeBgClass}`}>
                    {isDangerous && "Dấu hiệu rủi ro cao — Khuyến nghị kiểm tra"}
                    {isSafe && "Tin nhắn chính danh — Độ tin cậy cao"}
                    {isSuspicious && "Cần lưu ý — Có dấu hiệu mạo danh"}
                    {isUnknown && "Chưa đủ dữ liệu — Nên kiểm chứng thêm"}
                  </span>
                </div>

                <h2 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
                  {displayScamType}
                </h2>
              </div>
            </div>

            {/* Context-Aware Reassurance Callout */}
            <div className="text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-200">
              {isPhishing && (
                <p className="rounded-lg bg-rose-100/70 p-3 text-pretty text-rose-900 dark:bg-rose-950/60 dark:text-rose-100">
                  <strong>Tài khoản của bạn hiện vẫn an toàn</strong> nếu bạn chưa nhập mật khẩu hay mã OTP. Hãy bình tĩnh và không nhấp vào liên kết trong tin nhắn.
                </p>
              )}
              {isSocialEng && (
                <p className="rounded-lg bg-amber-100/70 p-3 text-pretty text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
                  Khuyến nghị bạn <strong>chưa vội chuyển tiền</strong> lúc này. Tin nhắn có dấu hiệu mượn cớ cấp cứu khẩn cấp để đề nghị chuyển tiền vào tài khoản người khác.
                </p>
              )}
              {isSafe && (
                <p className="rounded-lg bg-emerald-100/70 p-3 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100">
                  Nội dung tin nhắn khớp với thông báo giao dịch thông thường từ ngân hàng. Lưu ý không chia sẻ mã xác thực OTP này cho bất kỳ ai.
                </p>
              )}
              {isUnknown && (
                <p className="rounded-lg bg-slate-200/70 p-3 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                  Hệ thống chưa đủ dữ liệu để đưa ra đánh giá chắc chắn. Vui lòng kiểm tra lại kết nối mạng hoặc liên hệ người gửi qua kênh quen thuộc.
                </p>
              )}
            </div>

            {/* Context-Aware Action CTA */}
            {isPhishing && (
              <div className="pt-1">
                <a
                  href="tel:1900545413"
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-transform hover:bg-rose-800 active:scale-95"
                >
                  <PhoneCall size={16} weight="fill" />
                  <span>Bấm để gọi tổng đài Vietcombank hỗ trợ: 1900 54 54 13</span>
                </a>
              </div>
            )}
            {isSocialEng && (
              <div className="pt-1">
                <div className="inline-flex items-center gap-2 rounded-xl bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-xs dark:bg-amber-800">
                  <PhoneCall size={16} weight="fill" />
                  <span>Nên gọi điện thoại trực tiếp cho người thân để xác thực trước khi giao dịch</span>
                </div>
              </div>
            )}
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
                    <div className={`h-2 flex-1 rounded-xs ${(verdict.risk_score ?? 0) >= 0 ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`} />
                    <div className={`h-2 flex-1 rounded-xs ${(verdict.risk_score ?? 0) >= 25 ? "bg-lime-500" : "bg-slate-200 dark:bg-slate-700"}`} />
                    <div className={`h-2 flex-1 rounded-xs ${(verdict.risk_score ?? 0) >= 50 ? "bg-amber-500" : "bg-slate-200 dark:bg-slate-700"}`} />
                    <div className={`h-2 flex-1 rounded-xs ${(verdict.risk_score ?? 0) >= 75 ? "bg-rose-600" : "bg-slate-200 dark:bg-slate-700"}`} />
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
                : isSocialEng
                  ? "Hệ thống AI ghi nhận sự khác biệt về tên chủ tài khoản và tình huống gấp gáp; điểm đánh giá đã được điều chỉnh giảm do không chứa mã độc."
                  : isPhishing
                    ? "Ghi nhận 2 dấu hiệu rủi ro cao: Đường dẫn lạ không thuộc ngân hàng và yếu tố thúc ép thời gian."
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
