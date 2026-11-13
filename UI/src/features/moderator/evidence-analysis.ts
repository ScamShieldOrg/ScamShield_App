export function similarityPercentage(score: number | null | undefined): string {
  if (
    typeof score !== "number" ||
    !Number.isFinite(score) ||
    score < 0 ||
    score > 1
  )
    return "Chưa có dữ liệu"
  return new Intl.NumberFormat("vi-VN", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(score)
}

export const analysisStatusLabels = {
  PENDING: "Đang chờ phân tích",
  COMPLETED: "Đã phân tích",
  PARTIAL: "Phân tích chưa đầy đủ",
  FAILED: "Phân tích thất bại",
  NOT_ANALYZED: "Chưa phân tích",
}
