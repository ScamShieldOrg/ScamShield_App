"use client"

import { useState } from "react"
import { ScamCheckInput } from "@/components/features/check/scam-check-input"
import { ScamVerdictBanner } from "@/components/features/check/scam-verdict-banner"
import { ScamEvidenceCard } from "@/components/features/check/scam-evidence-card"
import { ScamActionBar } from "@/components/features/check/scam-action-bar"
import {
  MOCK_CASE_1_PHISHING_FASTPATH,
  MOCK_CASE_3_COUNCIL_SUSPICIOUS,
  checkScamContent,
} from "@/features/check/services/check.service"
import {
  CheckScanResponse,
  CheckType,
} from "@/features/check/types/check.types"

export default function UserCheckPage() {
  const [result, setResult] = useState<CheckScanResponse | null>(
    MOCK_CASE_1_PHISHING_FASTPATH
  )
  const [isLoading, setIsLoading] = useState(false)

  const handleAnalyze = async (content: string, type: CheckType) => {
    setIsLoading(true)
    try {
      const data = await checkScamContent({
        content,
        check_type: type,
      })
      setResult(data)
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
