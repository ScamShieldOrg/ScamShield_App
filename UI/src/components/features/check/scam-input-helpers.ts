import type { CheckType } from "@/features/check/types/check.types"

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
      "Dán nội dung tin nhắn SMS, Zalo, email hoặc lời mời chuyển tiền đáng ngờ...",
    submitLabel: "Phân tích ngay",
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
    placeholder: "Ví dụ: https://vcb-xacthuc.xyz hoặc example.com",
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
    placeholder: "Ví dụ: 0912 345 678, +84 912 345 678 hoặc 1900 545413",
    submitLabel: "Tra cứu số này",
    loadingLabel: "Đang tra cứu…",
    scopeNote:
      "Đối chiếu trực tiếp trong danh sách cảnh báo và danh bạ tổng đài đã xác minh.",
    inputMode: "tel",
    isMultiline: false,
    formatExample:
      "Nhập 1 số điện thoại Việt Nam (0912 345 678, +84 912 345 678 hoặc 1800/1900).",
  },
  BANK_ACCOUNT: {
    type: "BANK_ACCOUNT",
    label: "Số tài khoản",
    shortLabel: "Số tài khoản",
    placeholder: "Ví dụ: 0123 456 789 hoặc 190362819283",
    submitLabel: "Tra cứu tài khoản",
    loadingLabel: "Đang tra cứu…",
    scopeNote:
      "Chỉ tra cứu danh sách cảnh báo và danh bạ xác minh — không dùng AI phán đoán. Chưa có trong danh sách không đồng nghĩa với an toàn.",
    inputMode: "numeric",
    isMultiline: false,
    formatExample:
      "Nhập 6 đến 30 chữ số (có thể cách nhau bằng dấu cách, dấu chấm hoặc gạch nối).",
  },
}

const KNOWN_TLDS =
  "com|net|org|info|biz|vn|io|co|me|to|cc|tv|xyz|top|vip|shop|online|site|club|app|link|live|store|asia|tk|ml|ga|cf|gq|icu|cyou|bond|sbs|click|fun|pro|win|bet|best|life|world|today|news|space|website|tech|dev|ly|gl|gd|in|us|uk|cn|ru"

const MESSAGE_URL_REGEX = new RegExp(
  `https?:\\/\\/[^\\s<>"']+|www\\.[^\\s<>"']+|(?<![\\w@.])(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+(?:${KNOWN_TLDS})\\b(?:\\/[^\\s<>"']*)?`,
  "gi"
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
 * Detects whether a single-token input pasted into the TEXT tab is actually a
 * standalone URL, Vietnamese phone number, or bank account number so the UI can
 * offer a 1-click tab switch without hijacking user intent.
 */
export function detectSuggestedCheckType(
  content: string,
  activeTab: CheckType
): CheckType | null {
  if (activeTab !== "TEXT") return null
  const trimmed = content.trim()
  if (!trimmed || /\r|\n/.test(trimmed)) return null

  // 1. Standalone URL (no spaces, not an email address)
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

  // 2. Standalone phone / hotline (only digits and phone separators)
  if (/^[+\d\s.()-]+$/.test(trimmed)) {
    const normalizedPhone = trimmed.replace(/[\s.()-]/g, "")
    if (STANDALONE_VN_PHONE_REGEX.test(normalizedPhone)) {
      return "PHONE"
    }

    // 3. Standalone bank account (6-30 digits, no '+' or parens)
    if (/^[\d\s.-]+$/.test(trimmed)) {
      const digitsOnly = trimmed.replace(/[\s.-]/g, "")
      if (/^\d{6,30}$/.test(digitsOnly)) {
        return "BANK_ACCOUNT"
      }
    }
  }

  return null
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
