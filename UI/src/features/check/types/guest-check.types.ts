export type {
  ScamCheckInputType as GuestInputType,
  ScamCheckRequest as GuestCheckRequest,
  ScamCheckResult as GuestCheckResult,
} from "./scam-check.types"

export interface GuestSession {
  sessionToken: string
  expiresAt: string
}

export interface GuestQuota {
  limit: number
  used: number
  remaining: number
  resetsAt: string
}
