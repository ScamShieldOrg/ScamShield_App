export interface LeaderboardStatCard {
  key: string
  label: string
  value: string
  rawValue?: number | null
  sub: string
  icon?: string | null
}

export interface LeaderboardPodiumItem {
  rank: number
  anonymousIdentifier: string
  badge?: string | null
  subtitle?: string | null
  footerLeft?: string | null
  footerRight?: string | null
  avatar?: string | null
  class?: string | null
  rankClass?: string | null
  rankTier?: string | null
  contributions?: number | null
  contributionsFormatted?: string | null
  accuracy?: string | null
}

export interface LeaderboardTopThree {
  rank1?: LeaderboardPodiumItem | null
  rank2?: LeaderboardPodiumItem | null
  rank3?: LeaderboardPodiumItem | null
}

export interface LeaderboardRankingItem {
  rank: string
  rankNumber: number
  avatar: string
  name: string
  class?: string | null
  rankClass?: string | null
  rankTier?: string | null
  score: string
  rawScore?: number | null
  acc: string
  accuracy?: string | null
}

export interface LeaderboardFilterOption {
  id: string
  label: string
  active: boolean
}

export interface GuestLeaderboardData {
  stats: LeaderboardStatCard[]
  topThree: LeaderboardTopThree
  rankings: LeaderboardRankingItem[]
  filters: LeaderboardFilterOption[]
  activeFilter: string
}

export interface LeaderboardApiResponse<T> {
  isSuccess: boolean
  message: string
  data: T
}
