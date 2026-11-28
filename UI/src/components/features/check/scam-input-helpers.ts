import type {
  CheckType,
  DeterministicFeatures,
  RiskLevel,
} from "@/features/check/types/check.types"

export interface TabMeta {
  type: CheckType
  label: string
  shortLabel: string
  placeholder: string
  submitLabel: string
  loadingLabel: string
  scopeNote: string | null
  inputMode: "text" | "url" | "tel" | "numeric"
  isMultiline: boolean
  formatExample: string
}

export type ScenarioTone = "rose" | "amber" | "sky" | "indigo"

export interface QuickScenario {
  id: string
  label: string
  categoryHint: string
  preview: string
  tone: ScenarioTone
  type: CheckType
  sample: string
}

export const QUICK_SCENARIOS: readonly QuickScenario[] = [
  {
    id: "bank-sms",
    label: "SMS giả ngân hàng",
    categoryHint: "Tin nhắn SMS",
    preview:
      "Vietcombank: Tài khoản sẽ bị khóa trong 24h do chưa xác thực sinh trắc học…",
    tone: "rose",
    type: "TEXT",
    sample:
      "Vietcombank: Tai khoan cua quy khach se bi khoa trong 24h do chua xac thuc sinh trac hoc. Truy cap https://vcb-xacthuc-vn.xyz ngay de tranh bi phong toa.",
  },
  {
    id: "phishing-url",
    label: "Liên kết nhận quà lạ",
    categoryHint: "Đường dẫn URL",
    preview: "https://nhanqua-shopee-2026.xyz/claim",
    tone: "amber",
    type: "URL",
    sample: "https://nhanqua-shopee-2026.xyz/claim",
  },
  {
    id: "unknown-phone",
    label: "Số điện thoại nghi vấn",
    categoryHint: "Số điện thoại",
    preview: "0912 345 678 · Đối chiếu danh sách cảnh báo & tổng đài",
    tone: "sky",
    type: "PHONE",
    sample: "0912 345 678",
  },
  {
    id: "bank-account",
    label: "Tài khoản ngân hàng lạ",
    categoryHint: "Số tài khoản",
    preview: "1903 6281 9283 01 · Tra cứu nhanh trước khi chuyển khoản",
    tone: "indigo",
    type: "BANK_ACCOUNT",
    sample: "1903 6281 9283 01",
  },
]

export const CHECK_TAB_ORDER: readonly CheckType[] = [
  "TEXT",
  "URL",
  "PHONE",
  "BANK_ACCOUNT",
]

export const CHECK_TAB_META: Record<CheckType, TabMeta> = {
  TEXT: {
    type: "TEXT",
    label: "Tin nhắn / Văn bản",
    shortLabel: "Tin nhắn",
    placeholder:
      "Dán tin nhắn SMS, đường link, số điện thoại hoặc số tài khoản cần kiểm tra…",
    submitLabel: "Phân tích",
    loadingLabel: "Đang phân tích…",
    scopeNote: null,
    inputMode: "text",
    isMultiline: true,
    formatExample: "Nhập toàn bộ tin nhắn để AI phân tích ngữ cảnh chính xác.",
  },
  URL: {
    type: "URL",
    label: "Đường dẫn (URL)",
    shortLabel: "Đường dẫn",
    placeholder: "Dán địa chỉ website nghi vấn (ví dụ: https://vcb-xacthuc.xyz)…",
    submitLabel: "Kiểm tra liên kết",
    loadingLabel: "Đang kiểm tra…",
    scopeNote: null,
    inputMode: "url",
    isMultiline: false,
    formatExample: "Nhập địa chỉ website hợp lệ (ví dụ: https://example.com).",
  },
  PHONE: {
    type: "PHONE",
    label: "Số điện thoại",
    shortLabel: "Số điện thoại",
    placeholder: "Nhập số điện thoại hoặc tổng đài (ví dụ: 0912 345 678)…",
    submitLabel: "Tra cứu số này",
    loadingLabel: "Đang tra cứu…",
    scopeNote:
      "Đối chiếu trực tiếp trong danh sách cảnh báo và danh bạ tổng đài xác minh.",
    inputMode: "tel",
    isMultiline: false,
    formatExample:
      "Nhập 1 số điện thoại Việt Nam (0912 345 678, +84 912 345 678 hoặc 1800/1900).",
  },
  BANK_ACCOUNT: {
    type: "BANK_ACCOUNT",
    label: "Số tài khoản",
    shortLabel: "Số tài khoản",
    placeholder: "Nhập số tài khoản ngân hàng (6–30 chữ số)…",
    submitLabel: "Tra cứu tài khoản",
    loadingLabel: "Đang tra cứu…",
    scopeNote:
      "Chỉ tra cứu danh sách cảnh báo & danh bạ xác minh — không dùng AI phán đoán.",
    inputMode: "numeric",
    isMultiline: false,
    formatExample:
      "Nhập 6 đến 30 chữ số (có thể cách nhau bằng dấu cách, dấu chấm hoặc gạch nối).",
  },
}

const KNOWN_TLDS =
  "com|net|org|info|biz|vn|io|co|me|to|cc|tv|xyz|top|vip|shop|online|site|club|app|link|live|store|asia|tk|ml|ga|cf|gq|icu|cyou|bond|sbs|click|fun|pro|win|bet|best|life|world|today|news|space|website|tech|dev|ly|gl|gd|in|us|uk|cn|ru"

// Full URLs (scheme or www.) match case-insensitively; bare domains require a
// lowercase TLD so missing spaces after a period ("tri.Co", "khac.Do") are not
// miscounted as links.
const MESSAGE_URL_REGEX = new RegExp(
  `[Hh][Tt][Tt][Pp][Ss]?:\\/\\/[^\\s<>"']+|[Ww][Ww][Ww]\\.[^\\s<>"']+|(?<![\\w@.])(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+(?:${KNOWN_TLDS})\\b(?:\\/[^\\s<>"']*)?`,
  "g"
)

const MESSAGE_PHONE_REGEX =
  /(?<!\d)(?:(?:\+84|0)[35789]\d{8}|(?:1800|1900)\d{4,6})(?!\d)/g

const STANDALONE_URL_REGEX = new RegExp(
  `^(?:https?:\\/\\/[^\\s<>"']+|www\\.[^\\s<>"']+|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+(?:${KNOWN_TLDS})(?:\\/[^\\s<>"']*)?)$`,
  "i"
)

const STANDALONE_VN_PHONE_REGEX =
  /^(?:(?:\+84|84|0)(?:3|5|7|8|9)\d{8}|02\d{9}|1[89]00\d{4,6})$/

/**
 * Counts characters, unique URLs, and Vietnamese phone numbers in free-form message text.
 */
export function countMessageEntities(content: string): {
  chars: number
  urls: number
  phones: number
} {
  const chars = content.length
  const urls = new Set(content.match(MESSAGE_URL_REGEX) || []).size
  const phones = (content.match(MESSAGE_PHONE_REGEX) || []).length
  return { chars, urls, phones }
}

/**
 * Infers the most accurate CheckType directly from any pasted or typed string.
 * Used by the Omni-Composer to smoothly auto-detect URL, PHONE, BANK_ACCOUNT, or TEXT.
 */
export function inferCheckTypeFromContent(content: string): CheckType {
  const trimmed = content.trim()
  if (!trimmed || /\r|\n/.test(trimmed)) return "TEXT"

  if (
    !/\s/.test(trimmed) &&
    !trimmed.includes("@") &&
    STANDALONE_URL_REGEX.test(trimmed)
  ) {
    try {
      const parsed = new URL(
        trimmed.includes("://") ? trimmed : `https://${trimmed}`
      )
      if (/^https?:$/.test(parsed.protocol) && parsed.hostname.includes(".")) {
        return "URL"
      }
    } catch {
      // Fall through
    }
  }

  if (/^[+\d\s.()-]+$/.test(trimmed)) {
    const normalizedPhone = trimmed.replace(/[\s.()-]/g, "")
    if (STANDALONE_VN_PHONE_REGEX.test(normalizedPhone)) {
      return "PHONE"
    }

    if (/^[\d\s.-]+$/.test(trimmed)) {
      const digitsOnly = trimmed.replace(/[\s.-]/g, "")
      if (/^\d{6,30}$/.test(digitsOnly)) {
        return "BANK_ACCOUNT"
      }
    }
  }

  return "TEXT"
}

/**
 * Detects whether a single-token input pasted into the TEXT tab is actually a
 * standalone URL, Vietnamese phone number, or bank account number.
 */
export function detectSuggestedCheckType(
  content: string,
  activeTab: CheckType
): CheckType | null {
  if (activeTab !== "TEXT") return null
  const inferred = inferCheckTypeFromContent(content)
  return inferred === "TEXT" ? null : inferred
}

/**
 * Lightweight inline validation hint matching `validateScamCheck` rules so the
 * user receives immediate format guidance at the field level.
 */
export function getInlineFormatError(
  content: string,
  activeTab: CheckType
): string | null {
  const trimmed = content.trim()
  if (!trimmed) return null

  if (trimmed.length > 10000) {
    return "Nội dung vượt quá giới hạn 10.000 ký tự."
  }

  if (activeTab === "BANK_ACCOUNT") {
    const cleaned = trimmed.replace(/[\s.-]/g, "")
    if (!/^[0-9]{6,30}$/.test(cleaned)) {
      return "Số tài khoản cần gồm 6 đến 30 chữ số (có thể cách bằng dấu cách, chấm hoặc gạch nối)."
    }
  }

  if (activeTab === "PHONE") {
    let phone = trimmed.replace(/[\s.()-]/g, "")
    if (phone.startsWith("+84")) phone = "0" + phone.slice(3)
    else if (phone.startsWith("84") && phone.length >= 11)
      phone = "0" + phone.slice(2)
    if (!/^(?:0\d{8,10}|1[89]00\d{4,7})$/.test(phone)) {
      return "Số điện thoại chưa đúng định dạng (ví dụ: 0912 345 678, +84 912 345 678 hoặc 1900 1234)."
    }
  }

  if (activeTab === "URL") {
    try {
      const url = new URL(
        trimmed.includes("://") ? trimmed : `https://${trimmed}`
      )
      if (
        !/^https?:$/.test(url.protocol) ||
        !url.hostname.includes(".") ||
        url.username ||
        url.password ||
        /\s/.test(trimmed)
      ) {
        throw new Error()
      }
    } catch {
      return "Đường dẫn chưa hợp lệ (ví dụ: https://example.com hoặc domain.vn)."
    }
  }

  return null
}

/**
 * Truncates long scanned content for compact context chips on the verdict card.
 */
export function summarizeCheckedContent(
  content: string | null | undefined,
  maxLength = 72
): string | null {
  if (!content) return null
  const singleLine = content.replace(/\s+/g, " ").trim()
  if (!singleLine) return null
  if (singleLine.length <= maxLength) return singleLine
  return `${singleLine.slice(0, maxLength - 1)}…`
}

export type AnnotationKind =
  | "plain"
  | "url_danger"
  | "url_safe"
  | "phone_personal"
  | "phone_hotline"
  | "urgency"
  | "token_risk"

export interface AnnotatedSegment {
  id: string
  text: string
  kind: AnnotationKind
  label?: string
  reason?: string
}

interface RawMatch {
  start: number
  end: number
  priority: number
  kind: Exclude<AnnotationKind, "plain">
  label: string
  reason: string
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Splits a checked message into non-overlapping highlighted segments strictly
 * grounded in backend-returned or extracted deterministic features.
 */
export function buildAnnotatedSegments(
  rawText: string,
  features?: DeterministicFeatures,
  riskLevel?: RiskLevel
): AnnotatedSegment[] {
  if (!rawText) return []
  const candidates: RawMatch[] = []

  const addMatches = (
    pattern: RegExp,
    priority: number,
    kind: Exclude<AnnotationKind, "plain">,
    label: string,
    reason: string
  ) => {
    let m: RegExpExecArray | null
    while ((m = pattern.exec(rawText)) !== null) {
      if (m[0].length === 0) break
      candidates.push({
        start: m.index,
        end: m.index + m[0].length,
        priority,
        kind,
        label,
        reason,
      })
    }
  }

  // 1. URLs (highest priority)
  const urls = features?.url_analysis?.detected_urls ?? []
  const isOfficialUrl = Boolean(features?.url_analysis?.is_in_official_whitelist)
  for (const url of urls) {
    const clean = url.trim()
    if (!clean) continue
    addMatches(
      new RegExp(escapeRegExp(clean), "gi"),
      4,
      isOfficialUrl ? "url_safe" : "url_danger",
      isOfficialUrl ? "Tên miền chính thống" : "Liên kết chưa chứng thực",
      isOfficialUrl
        ? "Tên miền thuộc danh bạ tổ chức / ngân hàng chính thức đã xác minh."
        : "Đường dẫn nằm ngoài danh bạ chính thức — kẻ gian thường dùng tên miền na ná ngân hàng để đánh cắp mật khẩu & OTP."
    )
  }

  // 2. Phone numbers
  const phones = features?.phone_analysis?.detected_phones ?? []
  const isOfficialHotline = Boolean(features?.phone_analysis?.is_official_hotline)
  for (const phone of phones) {
    const digits = phone.replace(/\D/g, "")
    if (digits.length < 7) continue
    const flexiblePattern = digits.split("").join("[\\s.\\-()]*")
    const prefix = phone.trim().startsWith("+") ? "\\+?" : ""
    addMatches(
      new RegExp(`${prefix}${flexiblePattern}`, "g"),
      3,
      isOfficialHotline ? "phone_hotline" : "phone_personal",
      isOfficialHotline ? "Đầu số tổng đài" : "Đầu số cá nhân",
      isOfficialHotline
        ? "Đầu số 1800/1900 dạng tổng đài chăm sóc khách hàng."
        : "Số di động cá nhân, không phải đầu số tổng đài chính danh của ngân hàng hay cơ quan nhà nước."
    )
  }

  // 3. Urgency keywords
  const urgencyKeywords = features?.urgency_indicators?.matched_keywords ?? []
  for (const kw of urgencyKeywords) {
    const clean = kw.trim()
    if (clean.length < 2) continue
    addMatches(
      new RegExp(escapeRegExp(clean), "gi"),
      2,
      "urgency",
      "Tạo áp lực thời gian",
      "Cụm từ gây hoảng loạn hoặc thúc ép hành động gấp nhằm khiến người nhận không kịp kiểm chứng."
    )
  }

  // 4. High-weight ViSoBERT attribution tokens (only when risky)
  if (riskLevel && riskLevel !== "SAFE") {
    const tokens = (features?.visobert_token_attribution ?? []).filter(
      (item) => (item.weight ?? 0) >= 0.35 && item.token.trim().length >= 2
    )
    for (const item of tokens) {
      addMatches(
        new RegExp(escapeRegExp(item.token.trim()), "gi"),
        1,
        "token_risk",
        "Từ khóa rủi ro cao",
        `AI đánh giá cụm từ này đóng góp mạnh (+${item.weight.toFixed(2)}) vào dấu hiệu kịch bản lừa đảo.`
      )
    }
  }

  if (candidates.length === 0) {
    return [{ id: "plain-0", text: rawText, kind: "plain" }]
  }

  // Sort by highest priority first, then longest span, then earliest position
  candidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    if (b.end - b.start !== a.end - a.start) return b.end - b.start - (a.end - a.start)
    return a.start - b.start
  })

  // Greedily pick non-overlapping spans
  const accepted: RawMatch[] = []
  for (const cand of candidates) {
    const overlaps = accepted.some(
      (existing) => cand.start < existing.end && cand.end > existing.start
    )
    if (!overlaps) accepted.push(cand)
  }
  accepted.sort((a, b) => a.start - b.start)

  const segments: AnnotatedSegment[] = []
  let cursor = 0
  accepted.forEach((match, idx) => {
    if (match.start > cursor) {
      segments.push({
        id: `plain-${cursor}`,
        text: rawText.slice(cursor, match.start),
        kind: "plain",
      })
    }
    segments.push({
      id: `hl-${idx}-${match.start}`,
      text: rawText.slice(match.start, match.end),
      kind: match.kind,
      label: match.label,
      reason: match.reason,
    })
    cursor = match.end
  })

  if (cursor < rawText.length) {
    segments.push({
      id: `plain-${cursor}`,
      text: rawText.slice(cursor),
      kind: "plain",
    })
  }

  return segments
}
