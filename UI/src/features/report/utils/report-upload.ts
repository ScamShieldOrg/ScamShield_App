export const MAX_REPORT_FILES = 5
export const MAX_REPORT_FILE_BYTES = 5 * 1024 * 1024
export const REPORT_FILE_ACCEPT =
  ".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"

const MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  pdf: "application/pdf",
}

export function validateReportFiles(files: readonly File[]): string | null {
  if (files.length === 0) {
    return "Vui lòng đính kèm ít nhất một tệp minh chứng."
  }
  if (files.length > MAX_REPORT_FILES) {
    return `Mỗi báo cáo được đính kèm tối đa ${MAX_REPORT_FILES} tệp.`
  }
  for (const file of files) {
    const extension = file.name.split(".").pop()?.toLowerCase() || ""
    const expectedType = MIME_TYPES[extension]
    if (!expectedType || (file.type && file.type !== expectedType)) {
      return `Tệp “${file.name}” không được hỗ trợ. Vui lòng chọn ảnh PNG, JPG hoặc tài liệu PDF.`
    }
    if (file.size === 0) {
      return `Tệp “${file.name}” đang trống. Vui lòng chọn tệp có nội dung.`
    }
    if (file.size > MAX_REPORT_FILE_BYTES) {
      return `Tệp “${file.name}” vượt quá 5 MB. Vui lòng chọn tệp nhỏ hơn.`
    }
  }
  return null
}

export function formatReportFileSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.ceil(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} MB`
}
