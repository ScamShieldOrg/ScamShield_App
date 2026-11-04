"use client"

import { useUserScamCheck } from "@/features/check/hooks/use-user-scam-check"
import { ScamCheckInput } from "./scam-check-input"
import { ScamCheckVerdict } from "./scam-check-verdict"

export function UserScamCheck() {
  const {
    result,
    error,
    isLoading,
    analyze,
  } = useUserScamCheck()
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
        Kiểm Tra Lừa Đảo Chuyên Sâu
      </h1>
      <ScamCheckInput
        onAnalyze={() => void analyze()}
        isLoading={isLoading}
      />
      <div
        role="status"
        aria-live="polite"
        className={isLoading ? "text-sm text-muted-foreground" : "sr-only"}
      >
        {isLoading
          ? "Đang phân tích nội dung. Vui lòng chờ kết quả…"
          : result
            ? `Đã có kết quả kiểm tra số ${result.checkId}. ${result.verdict === "LOW_RISK" ? "Mức độ rủi ro thấp." : result.verdict === "SCAM_RISK" ? "Mức độ rủi ro cao." : result.verdict === "SUSPICIOUS" ? "Có dấu hiệu đáng ngờ." : "Chưa đủ cơ sở kết luận."}`
            : ""}
      </div>
      {isLoading && (
        <div
          aria-hidden="true"
          className="space-y-4 rounded-3xl border border-border bg-card p-6 motion-safe:animate-pulse"
        >
          <div className="h-7 w-1/2 rounded bg-muted" />
          <div className="h-24 rounded-2xl bg-muted" />
          <div className="h-16 rounded-2xl bg-muted" />
        </div>
      )}
      {result && <ScamCheckVerdict result={result} />}
      {!result && !isLoading && !error && (
        <p className="text-center text-sm text-muted-foreground">
          Nhập nội dung và chọn Phân tích để xem kết quả.
        </p>
      )}
    </div>
  )
}
