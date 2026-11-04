"use client"

import { useState } from "react"
import { ScamCheckInput } from "@/components/features/check/scam-check-input"
import { ScamVerdictBanner } from "@/components/features/check/scam-verdict-banner"
import { ScamEvidenceCard } from "@/components/features/check/scam-evidence-card"
import { ScamActionBar } from "@/components/features/check/scam-action-bar"
import { checkScamContent } from "@/features/check/services/check.service"
import {
  CheckScanResponse,
  CheckType,
} from "@/features/check/types/check.types"
import { ShieldCheck, WarningCircle } from "@phosphor-icons/react"

export default function UserCheckPage() {
  const [result, setResult] = useState<CheckScanResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async (content: string, type: CheckType) => {
    if (!content.trim()) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await checkScamContent({
        content: content.trim(),
        check_type: type,
      })
      setResult(data)
    } catch (err: any) {
      setError(
        err?.message ||
          "Không thể hoàn tất phân tích. Vui lòng kiểm tra lại kết nối mạng."
      )
      setResult(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-[#131B2E] dark:text-foreground">
          Kiểm Tra & Phân Tích Tin Nhắn Đáng Ngờ
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Hệ thống phân tích thông minh kết hợp quét nhanh trên thiết bị và phân tích đa chiều từ các chuyên gia AI.
        </p>
      </div>

      {/* Input Section */}
      <ScamCheckInput onAnalyze={handleAnalyze} isLoading={isLoading} />

      {/* Error Alert (Shown when connection/API fails) */}
      {error && (
        <div className="animate-in flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-800 duration-200 fade-in-50 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          <WarningCircle size={20} weight="fill" className="shrink-0 text-rose-600 dark:text-rose-400" />
          <div className="flex-1 space-y-1">
            <p className="font-bold">Lỗi phân tích nội dung:</p>
            <p className="leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Initial Empty State (When no check has been performed yet and not loading) */}
      {!result && !isLoading && !error && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center dark:border-border dark:bg-card/40">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-sky-100 text-[#008CC7] dark:bg-primary/20 dark:text-primary">
            <ShieldCheck size={26} weight="duotone" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
            Sẵn sàng kiểm tra tin nhắn
          </h3>
          <p className="mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
            Nhập nội dung tin nhắn SMS, tin nhắn Zalo hoặc chọn một trong các mẫu thử nghiệm phía trên rồi bấm &ldquo;Phân tích nội dung&rdquo; để bắt đầu.
          </p>
        </div>
      )}

      {/* Result Section (Shown when analysis exists) */}
      {result && (
        <div className="animate-in space-y-6 pt-2 duration-300 fade-in-50">
          {/* High-Risk / Safe / Suspicious / Unknown Verdict Banner with Provenance */}
          <ScamVerdictBanner
            verdict={result.verdict}
            provenance={result.execution_provenance}
            executionTimeMs={result.execution_time_ms}
            cloudCostUsd={result.cloud_cost_usd}
            modelName={result.engine_details?.model_name}
            features={result.deterministic_features}
            targetBank={result.target_bank}
          />

          {/* Evidence Card: Deterministic Features (Tier 1) / Forensic Council (Tier 2) / Epistemic Caution */}
          <ScamEvidenceCard data={result} />

          {/* Bottom Action Buttons */}
          <ScamActionBar scanId={result.scan_id} />
        </div>
      )}
    </div>
  )
}
