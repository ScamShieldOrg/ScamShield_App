"use client"

import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Bank,
  Brain,
  Scales,
  Lightning,
  WarningCircle,
  Info,
  CaretDown,
  Cpu,
  FileText,
} from "@phosphor-icons/react"
import { CheckScanResponse } from "@/features/check/types/check.types"

interface ScamEvidenceCardProps {
  data: CheckScanResponse
}

function FormattedCouncilSynthesis({ text }: { text: string }) {
  // 1. Sanitize any legacy "Hội đồng" and prefixes
  const sanitized = text
    .replace(/Kết luận (?:Hội đồng|Đánh Giá Đa Chiều Từ AI|Đánh Giá Đa Chiều|tổng hợp):\s*\*?\*?\s*/gi, "")
    .replace(/Hội đồng/gi, "Hệ thống AI đa chiều")
    .replace(/hội đồng/gi, "hệ thống AI đa chiều")

  // Check if it follows the structured specialist format (- **)
  const bulletIndex = sanitized.search(/(?:^|\n|\s)-\s*\*\*/)

  if (bulletIndex === -1 && !sanitized.includes("- **")) {
    return (
      <div className="mt-2 rounded-lg border border-border/70 bg-card/60 p-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
        <p className="whitespace-pre-line">{sanitized.replace(/\*\*/g, "")}</p>
      </div>
    )
  }

  const splitIdx = bulletIndex !== -1 ? bulletIndex : sanitized.indexOf("- **")
  const headerRaw = sanitized.substring(0, splitIdx).trim()
  const bodyRaw = sanitized.substring(splitIdx)

  const statusPart = headerRaw.split(/Tỷ lệ đồng thuận/i)[0].trim()
  const verdictText = statusPart.replace(/\*\*/g, "").replace(/\.\s*$/, "").trim()

  const consensusMatch = headerRaw.match(/Tỷ lệ đồng thuận[^:.]*:\s*([\d.]+%\.?)/i)
  const consensusRate = consensusMatch ? consensusMatch[1].replace(/\.$/, "") : ""

  const votingMatch = headerRaw.match(/\((Biểu quyết[^)]+|Kích hoạt[^)]+)\)/i)
  const votingMode = votingMatch ? votingMatch[1].replace(/thành viên/g, "chuyên gia AI") : ""

  const specRegex = /-\s*\*\*(.*?)\*\*:\s*([\s\S]*?)(?=(?:-\s*\*\*|$))/g
  const specialists: { title: string; model: string; content: string; iconType: "bank" | "brain" | "scales" }[] = []
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
      title = "Chuyên gia AI Pháp Y Tài Chính & Dòng Tiền"
      iconType = "bank"
    } else if (/Psycholinguistic|Slang Profiler|Tâm Lý|Thao Túng/i.test(title)) {
      title = "Chuyên gia AI Tâm Lý & Thao Túng Xã Hội"
      iconType = "brain"
    } else if (/Public Defender|Anti-False-Positive|Biện Hộ|Bảo Vệ/i.test(title)) {
      title = "Chuyên gia AI Biện Hộ Khách Quan"
      iconType = "scales"
    }

    specialists.push({ title, model, content, iconType })
  }

  return (
    <div className="mt-2.5 space-y-3 rounded-xl border border-border/80 bg-white/70 p-3.5 shadow-xs dark:bg-card/60">
      {/* 1. Header / Consensus Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Kết luận đa chiều:
          </span>
          {verdictText && (
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800 dark:bg-muted dark:text-slate-200">
              {verdictText}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {consensusRate && (
            <span className="rounded bg-sky-50 px-2 py-0.5 font-medium text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
              Đồng thuận: <strong className="font-bold">{consensusRate}</strong>
            </span>
          )}
          {votingMode && (
            <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-muted dark:text-slate-300">
              {votingMode}
            </span>
          )}
        </div>
      </div>

      {/* 2. Specialists list */}
      <div className="space-y-2">
        {specialists.map((spec, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-border/50 bg-slate-50/70 p-2.5 text-xs transition-colors dark:bg-muted/20"
          >
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                {spec.iconType === "bank" && <Bank size={14} className="text-blue-600 dark:text-blue-400" />}
                {spec.iconType === "brain" && <Brain size={14} className="text-amber-600 dark:text-amber-400" />}
                {spec.iconType === "scales" && <Scales size={14} className="text-emerald-600 dark:text-emerald-400" />}
                <span>{spec.title}</span>
              </div>
              {spec.model && (
                <span className="rounded border border-border/60 bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-600 dark:border-border dark:bg-background dark:text-slate-400">
                  {spec.model}
                </span>
              )}
            </div>
            <p className="leading-relaxed text-slate-700 dark:text-slate-300">
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

  const isTier1 = data.execution_provenance === "TIER1_FAST_PATH" && !data.council_deliberation
  const isTier2 = data.execution_provenance === "TIER2_FORENSIC_COUNCIL" || Boolean(data.council_deliberation)

  const features = data.deterministic_features
  const council = data.council_deliberation
  const steps = data.actionable_steps || data.recommendations || []
  const urgencyKeywords = features?.urgency_indicators?.matched_keywords || []

  // Tone-specific color tokens for numbered badges (Calm, authoritative, not alarming)
  const stepBadgeClass = isDangerous
    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
    : isSafe
      ? "bg-emerald-700 text-white"
      : isSuspicious
        ? "bg-amber-700 text-white"
        : "bg-slate-700 text-white"

  const dotClass = isDangerous
    ? "bg-rose-600"
    : isSafe
      ? "bg-emerald-600"
      : isSuspicious
        ? "bg-amber-600"
        : "bg-slate-500"

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-border dark:bg-card">
      {/* ============================================================== */}
      {/* CASE A: TIER 2 — FORENSIC COUNCIL DEEP DELIBERATION (3 AGENTS) */}
      {/* ============================================================== */}
      {isTier2 && council ? (
        <div className="space-y-4">
          {/* Tier 2 Council Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Scales size={22} weight="bold" className="text-sky-600 dark:text-sky-400" />
              <div>
                <h3 className="font-heading text-sm font-bold text-slate-900 dark:text-foreground">
                  Báo Cáo Phân Tích Chuyên Sâu Từ Các Chuyên Gia AI
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Tự động kích hoạt khi phát hiện dấu hiệu mượn tiền, mạo danh người thân hoặc cần đối soát đa chiều
                </p>
              </div>
            </div>

            <span className="rounded-md bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-900 dark:bg-sky-950 dark:text-sky-300">
              {council.consensus_ratio ? council.consensus_ratio.replace(/Hội đồng|hội đồng/gi, "Chuyên gia AI") : "3/3 Chuyên gia AI đồng thuận"}
            </span>
          </div>

          {/* 3 Specialized Forensic Perspectives (Un-boxed, clean divided rows) */}
          <div className="divide-y divide-border/60">
            {/* 1. Cyber Financial Specialist */}
            {council.cyber_banking_specialist && (
              <div className="flex items-start gap-3.5 py-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  <Bank size={20} weight="fill" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Chuyên Gia AI Pháp Y Tài Chính & Dòng Tiền:
                    </span>
                    <span className="rounded bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-200">
                      RÀ SOÁT TÀI KHOẢN THỤ HƯỞNG
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {council.cyber_banking_specialist.rationale}
                  </p>
                </div>
              </div>
            )}

            {/* 2. Psycholinguistic & Social Engineering Profiler */}
            {council.psycho_teencode_specialist && (
              <div className="flex items-start gap-3.5 py-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  <Brain size={20} weight="fill" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Chuyên Gia AI Tâm Lý & Thao Túng Xã Hội:
                    </span>
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                      BÓC TÁCH KỊCH BẢN DÀN DỰNG
                    </span>
                  </div>
                  {council.psycho_teencode_specialist.manipulation_tactic && (
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                      <strong className="font-bold">Chiêu thức nhận diện:</strong>{" "}
                      {council.psycho_teencode_specialist.manipulation_tactic}
                    </p>
                  )}
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {council.psycho_teencode_specialist.rationale}
                  </p>
                </div>
              </div>
            )}

            {/* 3. Objective Public Defender */}
            {council.public_defender && (
              <div className="flex items-start gap-3.5 py-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <Scales size={20} weight="fill" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Chuyên Gia AI Bảo Vệ Khách Quan:
                    </span>
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      KIỂM ĐỊNH YẾU TỐ VÔ TƯ
                    </span>
                  </div>
                  {council.public_defender.exculpatory_evidence && (
                    <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                      <strong className="font-bold">Yếu tố gỡ tội ghi nhận:</strong>{" "}
                      {council.public_defender.exculpatory_evidence}
                    </p>
                  )}
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {council.public_defender.rationale}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* CASE B: TIER 1 — EDGE FAST-PATH VERIFICATION (~15ms ON DEVICE)  */
        /* ============================================================== */
        <div className="space-y-4">
          {/* Tier 1 Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              {isDangerous && <WarningCircle size={20} weight="fill" className="text-rose-600" />}
              {isSafe && <CheckCircle size={20} weight="fill" className="text-emerald-600" />}
              {isUnknown && <Info size={20} weight="fill" className="text-slate-600 dark:text-slate-400" />}

              <div>
                <h3 className="font-heading text-sm font-bold text-slate-900 dark:text-foreground">
                  {isDangerous && "Bằng chứng rà soát tức thì tại thiết bị"}
                  {isSafe && "Cơ sở xác thực an toàn chính danh tại thiết bị"}
                  {isUnknown && "Đánh giá dữ liệu khách quan tại thiết bị"}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Quét siêu tốc ~{Math.round(data.execution_time_ms)}ms — Bảo mật quyền riêng tư trên thiết bị
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              <Lightning size={14} weight="fill" className="text-amber-500" />
              <span>Xử lý tại chỗ</span>
            </span>
          </div>

          {/* Tier 1 Evidence Checklist */}
          <div className="divide-y divide-border/50 text-sm">
            {/* 1. URL Analysis */}
            {features?.url_analysis && features.url_analysis.detected_urls.length > 0 ? (
              features.url_analysis.is_in_official_whitelist ? (
                <div className="flex items-start gap-3 py-3.5">
                  <div className={`mt-2 size-2 shrink-0 rounded-full ${dotClass}`} />
                  <div className="flex-1 space-y-1">
                    <p className="font-bold text-slate-900 dark:text-white">
                      Tên miền ngân hàng chính thức
                    </p>
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      Đường dẫn{" "}
                      <code className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {features.url_analysis.detected_urls.join(", ")}
                      </code>{" "}
                      thuộc danh bạ cổng điện tử hợp pháp của ngân hàng, đã được Ngân hàng Nhà nước cấp phép xác thực.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 py-3.5">
                  <div className={`mt-2 size-2 shrink-0 rounded-full ${dotClass}`} />
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        Đường dẫn giả mạo cổng ngân hàng
                      </p>
                      <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                        Hệ thống phát hiện liên kết trong tin nhắn có đuôi lạ, máy chủ đặt ở nước ngoài và hoàn toàn KHÔNG thuộc cổng điện tử hợp pháp của ngân hàng.
                      </p>
                    </div>
                    {/* Flat, uncluttered comparative highlight without nested card containers */}
                    <div className="space-y-1.5 pt-1 text-xs">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-bold text-rose-700 dark:text-rose-400">
                          Liên kết trong tin:
                        </span>
                        <code className="font-mono font-bold text-rose-900 dark:text-rose-200">
                          {features.url_analysis.detected_urls.join(", ")}
                        </code>
                        <span className="text-slate-500 dark:text-slate-400">
                          (Đuôi lạ, không thuộc hệ sinh thái ngân hàng)
                        </span>
                      </div>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">
                          Cổng chuẩn Vietcombank:
                        </span>
                        <code className="font-mono font-bold text-emerald-900 dark:text-emerald-200">
                          vietcombank.com.vn
                        </code>
                        <span className="text-slate-500 dark:text-slate-400">
                          (Tên miền quốc gia được NHNN cấp phép chính thức)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            ) : isSafe ? (
              <div className="flex items-start gap-3 py-3.5">
                <div className={`mt-2 size-2 shrink-0 rounded-full ${dotClass}`} />
                <div className="flex-1 space-y-1">
                  <p className="font-bold text-slate-900 dark:text-white">
                    Không phát hiện liên kết web đáng ngờ
                  </p>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    Tin nhắn hoàn toàn không chứa đường link dẫn dụ truy cập ra ngoài ứng dụng hay yêu cầu đăng nhập trang lạ.
                  </p>
                </div>
              </div>
            ) : null}

            {/* 2. Urgency Indicators */}
            {urgencyKeywords.length > 0 ? (
              <div className="flex items-start gap-3 py-3.5">
                <div className={`mt-2 size-2 shrink-0 rounded-full ${dotClass}`} />
                <div className="flex-1 space-y-1.5">
                  <p className="font-bold text-slate-900 dark:text-white">
                    Chiêu trò tâm lý giục giã & đe dọa ép thời gian
                  </p>
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    Tin nhắn sử dụng các từ ngữ gây áp lực tâm lý nhằm khiến bạn hoảng sợ vì nguy cơ bị khóa tài khoản mà làm theo ngay khi chưa kịp xác minh:
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {urgencyKeywords.map((kw, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
                      >
                        &ldquo;{kw}&rdquo;
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : isSafe ? (
              <div className="flex items-start gap-3 py-3.5">
                <div className={`mt-2 size-2 shrink-0 rounded-full ${dotClass}`} />
                <div className="flex-1 space-y-1">
                  <p className="font-bold text-slate-900 dark:text-white">
                    Nội dung chuẩn mực, không có yếu tố đe dọa
                  </p>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    Tin nhắn mang tính chất thông báo giao dịch thông thường, không ép buộc thời gian hay đe dọa khóa dịch vụ.
                  </p>
                </div>
              </div>
            ) : null}

            {/* 3. Sender & Brandname Identity */}
            {features?.brand_identity && (
              <div className="flex items-start gap-3 py-3.5">
                <div className={`mt-2 size-2 shrink-0 rounded-full ${dotClass}`} />
                <div className="flex-1 space-y-1">
                  <p className="font-bold text-slate-900 dark:text-white">
                    {features.brand_identity.is_registered_brandname
                      ? `Kênh gửi chính danh (${features.brand_identity.sender_header})`
                      : "Đầu số cá nhân / Số lạ chưa định danh"}
                  </p>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {features.brand_identity.is_registered_brandname
                      ? "Đầu số thương hiệu đã được các nhà mạng viễn thông tại Việt Nam định danh và bảo vệ chính thức."
                      : `Tin nhắn xuất phát từ số lạ (${features.brand_identity.sender_header}), không phải đầu số thương hiệu chính thức của cơ quan hay doanh nghiệp.`}
                  </p>
                </div>
              </div>
            )}

            {/* 4. Unknown Fallback */}
            {isUnknown && (
              <div className="flex items-start gap-3 py-3.5">
                <div className="mt-2 size-2 shrink-0 rounded-full bg-amber-500" />
                <div className="flex-1 space-y-1">
                  <p className="font-bold text-slate-900 dark:text-white">
                    Nguyên tắc thận trọng: Không đưa ra kết luận vội vã
                  </p>
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    Hệ thống không phát hiện mã độc hoặc liên kết độc hại, nhưng cũng chưa thể xác thực danh tính người gửi. Để bảo vệ bạn không bị hoang mang và không bỏ lỡ cơ hội thực tế, hệ thống từ chối quy chụp bừa bãi.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. WHAT SHOULD I DO NOW? (CALM, DIRECT, NUMBERED GUIDANCE)     */}
      {/* ============================================================== */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <ShieldCheck
            size={20}
            weight="fill"
            className={
              isDangerous
                ? "text-rose-700"
                : isSafe
                  ? "text-emerald-700"
                  : isSuspicious
                    ? "text-amber-700"
                    : "text-slate-700"
            }
          />
          <h3 className="font-heading text-sm font-bold text-slate-900 dark:text-foreground">
            {isDangerous && "3 việc bạn cần làm ngay lúc này để bảo vệ tài khoản"}
            {isSafe && "Lưu ý bảo mật quan trọng khi nhận mã OTP"}
            {isSuspicious && "Các bước kiểm chứng khuyến nghị trước khi chuyển tiền"}
            {isUnknown && "Khuyến nghị phòng ngừa an toàn dành cho bạn"}
          </h3>
        </div>

        {/* Clean, un-nested divided list with accessible 14px text */}
        <div className="divide-y divide-border/60">
          {steps.map((rec, index) => (
            <div key={index} className="flex items-start gap-3.5 py-3">
              <div
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-2xs ${stepBadgeClass}`}
              >
                {index + 1}
              </div>
              <p className="text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-200">
                {rec}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. COLLAPSIBLE FORENSIC INSPECTOR (DEVELOPER / AUDITOR DRAWER) */}
      {/* ============================================================== */}
      <details className="group rounded-xl border border-border/80 bg-slate-50/60 p-4 transition-all dark:bg-muted/30">
        <summary className="flex cursor-pointer items-center justify-between text-xs font-bold text-slate-700 select-none dark:text-slate-300">
          <span className="flex items-center gap-2">
            <Cpu size={16} className="text-[#008CC7]" />
            <span>Thông số kỹ thuật mở rộng (Dành cho kiểm toán viên)</span>
          </span>
          <CaretDown size={14} className="transition-transform group-open:rotate-180 text-slate-500" />
        </summary>

        <div className="mt-3 space-y-3 border-t border-border/60 pt-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div>
              <span className="text-slate-500">Mô hình thực thi:</span>
              <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {data.engine_details?.model_name}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Thời gian phản hồi:</span>
              <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {data.execution_time_ms} ms
              </p>
            </div>
            <div>
              <span className="text-slate-500">Ước tính chi phí Cloud:</span>
              <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                ${data.cloud_cost_usd.toFixed(4)}
              </p>
            </div>
          </div>

          {/* Executive Synthesis Summary (Collapsed into Auditor/Technical Drawer) */}
          {council?.final_synthesis && (
            <div className="border-t border-border/60 pt-2.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                <FileText size={15} className="text-[#008CC7]" />
                <span>Toàn văn kết luận tổng hợp từ hệ thống AI (AI Analysis Synthesis):</span>
              </div>
              <FormattedCouncilSynthesis text={council.final_synthesis} />
            </div>
          )}

          {/* Attention Token Attribution if present */}
          {features?.visobert_token_attribution && features.visobert_token_attribution.length > 0 && (
            <div className="pt-2">
              <span className="mb-1.5 block font-medium text-slate-500">
                Trọng số phân bổ từ khóa (ViSoBERT Attention):
              </span>
              <div className="flex flex-wrap gap-2">
                {features.visobert_token_attribution.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs dark:border-border dark:bg-card"
                  >
                    <span className="font-mono text-slate-800 dark:text-slate-200">"{item.token}"</span>
                    <span className="rounded bg-rose-50 px-1 font-mono text-[11px] font-bold text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                      +{item.weight.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </details>
    </div>
  )
}
