export type CheckType = "TEXT" | "URL" | "PHONE" | "BANK_ACCOUNT"

export type RiskLevel = "SAFE" | "SUSPICIOUS" | "DANGEROUS" | "UNKNOWN"

export type ExecutionProvenance =
  "TIER1_FAST_PATH" | "TIER2_FORENSIC_COUNCIL" | "TRI_STATE_UNKNOWN"

export type RuntimeType =
  | "ONNX_INT8_EDGE"
  | "CLOUD_LLM_COUNCIL"
  | "OFFLINE_FALLBACK"
  | "SERVER_PIPELINE"

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW"

export type GuidanceType =
  "STATIC_SOP" | "DYNAMIC_CONTEXTUAL" | "EPISTEMIC_CAUTION"

export interface CheckScanRequest {
  content: string
  sender?: string
  check_type?: CheckType
  target_bank?: string | null
  target_account_number?: string | null
  force_tier2?: boolean
}

export interface Verdict {
  risk_level: RiskLevel
  risk_score: number | null // 0 - 100, or null if UNKNOWN
  confidence_level?: ConfidenceLevel
  scam_type: string
  summary: string
  confidence?: number
}

export interface DeterministicFeatures {
  url_analysis?: {
    detected_urls: string[]
    is_in_official_whitelist: boolean
    domain_reputation: "LEGITIMATE" | "SUSPICIOUS_TLD" | "MALICIOUS_SIMILARITY"
  }
  phone_analysis?: {
    detected_phones: string[]
    is_official_hotline: boolean
    phone_type: "HOTLINE" | "PERSONAL_MOBILE" | "NONE"
  }
  otp_structure?: {
    has_otp_pattern: boolean
    pattern_matched: string
  }
  brand_identity?: {
    sender_header: string
    is_registered_brandname: boolean
  }
  urgency_indicators?: {
    matched_keywords: string[]
    urgency_score: number
  }
  visobert_token_attribution?: {
    token: string
    weight: number
  }[]
}

export interface SpecialistVote {
  stance: "SCAM" | "BENIGN" | "SUSPICIOUS"
  rationale: string
  manipulation_tactic?: string
  exculpatory_evidence?: string
  confidence?: number
  model_used?: string
}

export interface CouncilDeliberation {
  cyber_banking_specialist?: SpecialistVote
  psycho_teencode_specialist?: SpecialistVote
  public_defender?: SpecialistVote
  final_synthesis?: string
  consensus_ratio?: string
}

export interface MatchedIndicatorInfo {
  id: number
  type: string
  value: string
}

export interface EngineDetails {
  model_name: string
  runtime_type: RuntimeType
}

export interface CheckScanResponse {
  status: "success" | "error"
  scan_id: string
  /** Numeric backend check id; deep links to history/report need it. */
  check_id: number
  created_at: string
  execution_provenance: ExecutionProvenance
  /** Caller-measured wall-clock duration of the scan request, in ms. */
  execution_time_ms: number
  engine_details: EngineDetails
  verdict: Verdict
  deterministic_features?: DeterministicFeatures
  council_deliberation?: CouncilDeliberation
  guidance_type: GuidanceType
  actionable_steps: string[]
  target_bank?: string | null
  target_account_number?: string | null
  input_type?: CheckType | string
  matched_indicator?: MatchedIndicatorInfo | null
  decided_by_stage?: string
  unknown_reason?: string | null
  // Backwards compatibility / optional fields
  tier_executed?: 1 | 2
  recommendations?: string[]
}
