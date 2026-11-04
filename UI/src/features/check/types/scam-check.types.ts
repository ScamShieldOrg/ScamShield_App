export type ScamCheckInputType = "MESSAGE" | "URL" | "PHONE" | "BANK_ACCOUNT"

export interface ScamCheckRequest {
  inputType: ScamCheckInputType
  content: string
}

export interface ScamCheckResult {
  checkId: number
  verdictId: number
  inputType: string
  status: string
  verdict: string
  decidedByStage: string
  categoryCode: string | null
  confidence: number | null
  explanation: string | null
  safetyGuidance: string | null
  unknownReason: string | null
  matchedIndicator: { id: number; type: string; value: string } | null
  reasons: { code: string; sourceStage: string; detail: string | null }[]
  createdAt: string
  completedAt: string | null
  retentionExpiresAt: string
  aiDetails: {
    scanId: string
    createdAt: string | null
    tierExecuted: 1 | 2
    verdict: {
      riskLevel: "SAFE" | "SUSPICIOUS" | "DANGEROUS" | "UNKNOWN"
      riskScore: number | null
      scamType: string | null
      confidence: number
      summary: string
    }
    radarMetrics: Record<"urgency" | "authority_impersonation" | "financial_lure" | "suspicious_channel" | "data_harvesting", number> | null
    recommendations: string[]
    councilAudit: {
      consensusRatio: string | null
      leadModel: string | null
      earlyExit: boolean
      defenderIntervened: boolean
      agents: { role: string; verdict: string; score: number }[]
    } | null
  } | null
}
