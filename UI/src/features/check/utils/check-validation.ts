import type { ScamCheckRequest } from "../types/scam-check.types"

export function normalizeScamCheckRequest(
  request: ScamCheckRequest
): ScamCheckRequest {
  return { ...request, content: request.content.trim() }
}

export function validateScamCheck({
  inputType,
  content,
}: ScamCheckRequest): string | null {
  if (!content.trim()) return "Vui lòng nhập nội dung cần kiểm tra."
  if (content.length > 10000)
    return "Nội dung không được vượt quá 10.000 ký tự."
  if (
    inputType === "BANK_ACCOUNT" &&
    !/^[0-9]{6,30}$/.test(content.replace(/[\s.-]/g, ""))
  ) {
    return "Số tài khoản phải có từ 6 đến 30 chữ số."
  }
  if (inputType === "PHONE") {
    // Match Core's phone normalization and accepted lengths.
    let phone = content.replace(/[\s.()-]/g, "")
    if (phone.startsWith("+84")) phone = "0" + phone.slice(3)
    else if (phone.startsWith("84") && phone.length >= 11)
      phone = "0" + phone.slice(2)
    if (!/^(?:0\d{8,10}|1[89]00\d{4,7})$/.test(phone)) {
      return "Số điện thoại chưa đúng định dạng. Ví dụ: 0912 345 678, +84 912 345 678 hoặc hotline 1900 1234. Khi dùng +84 hoặc 84, bỏ số 0 ở đầu; chỉ nhập một số mỗi lần."
    }
  }
  if (inputType === "URL") {
    try {
      const url = new URL(
        content.includes("://") ? content : `https://${content}`
      )
      if (
        !/^https?:$/.test(url.protocol) ||
        !url.hostname.includes(".") ||
        url.username ||
        url.password ||
        /\s/.test(content)
      )
        throw new Error()
    } catch {
      return "Vui lòng nhập địa chỉ website hợp lệ (ví dụ: https://example.com)."
    }
  }
  return null
}
