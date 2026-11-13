import { validateScamCheck } from "@/features/check/utils/check-validation"
import type { ReportThreatType } from "@/features/report/types/report.types"

const labels: Record<ReportThreatType, string> = {
  PHONE: "Số điện thoại / Hotline",
  WEBSITE: "Website / Đường dẫn",
  BANK_ACCOUNT: "Tài khoản ngân hàng",
}

function matchesType(type: ReportThreatType, content: string): boolean {
  if (type === "WEBSITE") {
    const host = content.replace(/^https?:\/\//i, "").split(/[/?#]/, 1)[0]
    // URL() also accepts abbreviated numeric IPv4 forms such as 12.345678.
    const dottedHost = host.includes(".") && /\p{L}/u.test(host)
    const ipv4 = /^\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?$/.test(host)
    return (
      (dottedHost || ipv4) && !validateScamCheck({ inputType: "URL", content })
    )
  }
  if (type === "PHONE") {
    const phone = content.replace(/[\s.()-]/g, "").replace(/^0084/, "+84")
    return !validateScamCheck({ inputType: "PHONE", content: phone })
  }
  return !validateScamCheck({ inputType: "BANK_ACCOUNT", content })
}

export function getReportTargetTypeWarning(
  selected: ReportThreatType | null,
  input: string
): string | null {
  const content = input.trim()
  if (!selected || !content || matchesType(selected, content)) return null

  const candidates = (Object.keys(labels) as ReportThreatType[]).filter(
    (type) => type !== selected && matchesType(type, content)
  )
  if (candidates.length === 0) return null
  return `Dữ liệu đã nhập có thể thuộc loại ${candidates.map((type) => labels[type]).join(" hoặc ")}. Vui lòng kiểm tra lại loại đối tượng báo cáo.`
}
