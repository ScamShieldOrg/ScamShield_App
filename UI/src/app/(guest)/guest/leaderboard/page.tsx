"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import {
  UserFocus,
  ShieldCheck,
  Target,
  Timer,
  Trophy,
  LockKey,
  Shield,
  ListNumbers,
  ArrowUp,
  Crown,
  UserPlus,
  CircleNotch,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { getLeaderboard } from "@/features/leaderboard/services/leaderboard.service"
import {
  GuestLeaderboardData,
  LeaderboardStatCard,
  LeaderboardRankingItem,
  LeaderboardTopThree,
  LeaderboardFilterOption,
} from "@/features/leaderboard/types/leaderboard.types"

// Neutral initial placeholder cards while live data is loading
const INITIAL_STATS: LeaderboardStatCard[] = [
  {
    key: "active_experts",
    label: "CHUYÊN GIA KÍCH HOẠT",
    value: "--",
    sub: "Đang cập nhật...",
    icon: "user_focus",
  },
  {
    key: "neutralized_threats",
    label: "MỐI ĐE DỌA VÔ HIỆU HÓA",
    value: "--",
    sub: "Đang cập nhật...",
    icon: "shield_check",
  },
  {
    key: "accuracy",
    label: "ĐỘ CHÍNH XÁC XÁC MINH",
    value: "--",
    sub: "Đang cập nhật...",
    icon: "target",
  },
  {
    key: "avg_response_time",
    label: "THỜI GIAN PHẢN ỨNG TB",
    value: "--",
    sub: "Đang cập nhật...",
    icon: "timer",
  },
]

export default function GuestLeaderboardPage() {
  const [data, setData] = useState<GuestLeaderboardData | null>(null)
  const [activeFilterId, setActiveFilterId] = useState<string>("THIS_MONTH")
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch leaderboard data with race condition handling
  useEffect(() => {
    let ignore = false
    setIsLoading(true)
    setError(null)

    getLeaderboard(activeFilterId)
      .then((res) => {
        if (!ignore) {
          setData(res)
          if (res.activeFilter) {
            setActiveFilterId(res.activeFilter)
          }
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error("Failed to load guest leaderboard:", err)
          setError("Không thể tải dữ liệu vinh danh từ máy chủ. Vui lòng thử lại sau.")
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [activeFilterId])

  const stats = data?.stats && data.stats.length > 0 ? data.stats : INITIAL_STATS
  const topThree = data?.topThree ?? {}
  const rankings = data?.rankings ?? []
  const filters: LeaderboardFilterOption[] =
    data?.filters && data.filters.length > 0
      ? data.filters
      : [
          { id: "ALL_TIME", label: "Mọi lúc", active: activeFilterId === "ALL_TIME" },
          { id: "THIS_MONTH", label: "Tháng này", active: activeFilterId === "THIS_MONTH" },
          { id: "LAST_7_DAYS", label: "7 ngày qua", active: activeFilterId === "LAST_7_DAYS" },
        ]

  return (
    <div className="flex flex-col items-center w-full min-h-screen pb-20 bg-slate-50/50 dark:bg-transparent">
      <div className="w-full max-w-6xl mx-auto px-4 pt-8">
        <HeroSection stats={stats} isLoading={isLoading && !data} />
        <LeaderboardSection
          activeFilterId={activeFilterId}
          onSelectFilter={(id) => setActiveFilterId(id)}
          filters={filters}
          topThree={topThree}
          rankings={rankings}
          isLoading={isLoading}
          error={error}
        />
        <CTASection />
      </div>
    </div>
  )
}

function getStatIcon(iconKey?: string | null) {
  switch (iconKey?.toLowerCase()) {
    case "user_focus":
      return UserFocus
    case "shield_check":
      return ShieldCheck
    case "target":
      return Target
    case "timer":
      return Timer
    default:
      return ShieldCheck
  }
}

function HeroSection({
  stats,
  isLoading,
}: {
  stats: LeaderboardStatCard[]
  isLoading: boolean
}) {
  return (
    <section className="w-full mb-12">
      <div className="bg-white dark:bg-slate-900 rounded-lg p-8 md:p-12 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-slate-800">
        <div className="mb-10">
          <h1 className="text-3xl md:text-[34px] font-bold text-slate-900 dark:text-white tracking-tight mb-2">
            Bảng Vinh Danh Đóng Góp Cộng Đồng
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            Tôn vinh các cá nhân & tổ chức tích cực tham gia phát hiện, ngăn chặn lừa đảo trực tuyến.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => {
            const Icon = getStatIcon(stat.icon)
            const isExpert = stat.key === "ACTIVE_EXPERTS" || stat.sub?.startsWith("+")
            const isThreat = stat.key === "THREATS_NEUTRALIZED"

            return (
              <div
                key={stat.key || idx}
                className="bg-indigo-100/50 dark:bg-indigo-900/20 rounded-lg p-5 border border-indigo-100/80 dark:border-indigo-800/50 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest leading-snug max-w-[130px]">
                    {stat.label}
                  </span>
                  <Icon weight="light" className="text-slate-400 dark:text-slate-500 text-xl" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                  {isLoading ? "--" : stat.value}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {isExpert && <ArrowUp weight="bold" className="text-blue-500" />}
                  {isThreat && <ShieldCheck weight="bold" className="text-blue-500" />}
                  <span className={isThreat ? "text-slate-600 dark:text-slate-300" : ""}>
                    {stat.sub}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

interface LeaderboardSectionProps {
  activeFilterId: string
  onSelectFilter: (id: string) => void
  filters: LeaderboardFilterOption[]
  topThree: LeaderboardTopThree
  rankings: LeaderboardRankingItem[]
  isLoading: boolean
  error: string | null
}

function LeaderboardSection({
  activeFilterId,
  onSelectFilter,
  filters,
  topThree,
  rankings,
  isLoading,
  error,
}: LeaderboardSectionProps) {
  const rank1 = topThree?.rank1
  const rank2 = topThree?.rank2
  const rank3 = topThree?.rank3

  // Honest display when podium entries are not present yet
  const rank1Name = rank1?.anonymousIdentifier || "Chưa có dữ liệu"
  const rank1Subtitle = rank1 ? (rank1.subtitle || "Định danh xác thực cấp cao") : "Đang chờ người đóng góp"
  const rank1Badge = rank1?.badge || "HẠNG NHẤT TOÀN QUỐC"
  const rank1FooterLeft = rank1 ? (rank1.footerLeft || "An toàn tuyệt đối (Zero PII)") : "Zero PII"
  const rank1FooterRight = rank1 ? (rank1.footerRight || "#VN-01") : "--"

  const rank2Name = rank2?.anonymousIdentifier || "Chưa có dữ liệu"
  const rank2Subtitle = rank2 ? (rank2.subtitle || "Khu vực ẩn danh") : "Đang chờ người đóng góp"
  const rank2FooterLeft = rank2 ? (rank2.footerLeft || "Mã hóa PII") : "Mã hóa PII"
  const rank2FooterRight = rank2 ? (rank2.footerRight || "Top --%") : "--"

  const rank3Name = rank3?.anonymousIdentifier || "Chưa có dữ liệu"
  const rank3Subtitle = rank3 ? (rank3.subtitle || "Khu vực ẩn danh") : "Đang chờ người đóng góp"
  const rank3FooterLeft = rank3 ? (rank3.footerLeft || "Mã hóa PII") : "Mã hóa PII"
  const rank3FooterRight = rank3 ? (rank3.footerRight || "Top --%") : "--"

  return (
    <section className="w-full mb-12">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Bảng Vinh Danh
          </h2>
          {isLoading && (
            <CircleNotch size={20} className="animate-spin text-indigo-600 dark:text-indigo-400" />
          )}
        </div>
        <div className="flex items-center bg-indigo-50 dark:bg-indigo-900/30 p-1 rounded-full border border-indigo-100 dark:border-indigo-800/50">
          {filters.map((filter) => {
            const isActive = activeFilterId.toUpperCase() === filter.id.toUpperCase()
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => onSelectFilter(filter.id)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer",
                  isActive
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                {filter.label}
              </button>
            )
          })}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300">
          {error}
        </div>
      )}

      {/* Top 3 Cards */}
      <div
        className={cn(
          "grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 items-end transition-opacity duration-200",
          isLoading ? "opacity-60 pointer-events-none" : "opacity-100"
        )}
      >
        {/* Rank 2 */}
        <div className="bg-white dark:bg-slate-900 rounded-lg p-6 border-x border-b border-slate-100 dark:border-slate-800 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] border-t-[4px] border-t-indigo-200 dark:border-t-indigo-800 relative order-2 md:order-1 h-[90%]">
          <div className="flex justify-between items-start mb-6">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <Trophy weight="fill" className="text-slate-400 dark:text-slate-600 text-xl" />
          </div>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-[#0F172A] flex items-center justify-center shrink-0">
              <Shield weight="fill" className="text-white text-lg" />
            </div>
            <div>
              <h3 className={cn("text-base font-bold", rank2 ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500 italic")}>
                {rank2Name}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {rank2Subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <LockKey weight="bold" className="text-slate-400" size={14} /> {rank2FooterLeft}
            </div>
            <span className="text-[11px] font-bold text-slate-900 dark:text-white">{rank2FooterRight}</span>
          </div>
        </div>

        {/* Rank 1 */}
        <div className="bg-white dark:bg-slate-900 rounded-lg p-7 border-x border-b border-slate-100 dark:border-slate-800 shadow-xl border-t-[6px] border-t-slate-900 dark:border-t-slate-700 relative order-1 md:order-2 z-10 transform md:-translate-y-4">
          <div className="absolute top-0 right-6 -translate-y-1/2">
            <div className="bg-slate-900 dark:bg-slate-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 uppercase tracking-widest">
              <Crown weight="fill" className="text-yellow-400" /> {rank1Badge}
            </div>
          </div>

          <div className="flex justify-between items-start mb-6 mt-2">
            <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-lg">
              1
            </div>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center shrink-0 relative">
              <ShieldCheck weight="fill" className="text-cyan-400 text-2xl" />
            </div>
            <div>
              <h3 className={cn("text-lg font-bold", rank1 ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500 italic")}>
                {rank1Name}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                <LockKey weight="bold" size={12} /> {rank1Subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
              <ShieldCheck weight="bold" size={14} /> {rank1FooterLeft}
            </div>
            <span className="text-[11px] font-mono font-bold text-slate-400">{rank1FooterRight}</span>
          </div>
        </div>

        {/* Rank 3 */}
        <div className="bg-white dark:bg-slate-900 rounded-lg p-6 border-x border-b border-slate-100 dark:border-slate-800 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] border-t-[4px] border-t-slate-500 dark:border-t-slate-600 relative order-3 h-[90%]">
          <div className="flex justify-between items-start mb-6">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <Trophy weight="fill" className="text-slate-400 dark:text-slate-600 text-xl" />
          </div>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
              <Shield weight="light" className="text-indigo-500 dark:text-indigo-400 text-lg" />
            </div>
            <div>
              <h3 className={cn("text-base font-bold", rank3 ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500 italic")}>
                {rank3Name}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {rank3Subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <LockKey weight="bold" className="text-slate-400" size={14} /> {rank3FooterLeft}
            </div>
            <span className="text-[11px] font-bold text-slate-900 dark:text-white">{rank3FooterRight}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg pb-4 overflow-hidden border border-slate-100 dark:border-slate-800 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)]">
        <div className="flex items-center bg-indigo-100/50 dark:bg-indigo-700/20 gap-2 p-6 pb-4">
          <ListNumbers weight="bold" className="text-slate-600 dark:text-slate-400 text-xl" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Bảng Xếp Hạng Đóng Góp (Hạng 4 – 10)</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-indigo-200/50 dark:bg-indigo-900/20 border-y border-indigo-100 dark:border-indigo-800/50">
                <th className="py-3.5 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">THỨ HẠNG</th>
                <th className="py-3.5 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">MÃ ĐỊNH DANH ẨN DANH</th>
                <th className="py-3.5 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap text-center">CẤP BẬC</th>
                <th className="py-3.5 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap text-right">SỐ ĐÓNG GÓP</th>
                <th className="py-3.5 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap text-right">ĐỘ CHÍNH XÁC</th>
              </tr>
            </thead>
            <tbody>
              {rankings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 px-6 text-center text-xs text-slate-400">
                    Chưa có dữ liệu xếp hạng cho khoảng thời gian này.
                  </td>
                </tr>
              ) : (
                rankings.map((row, i) => {
                  const rankClassDisplay = row.rankClass || row.class || "XÁC THỰC VÀNG"
                  const accDisplay = row.acc || row.accuracy || "--"

                  return (
                    <tr
                      key={row.name + i}
                      className="border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group"
                    >
                      <td className="py-4 px-6 text-[11px] font-bold text-slate-900 dark:text-slate-300">
                        #{row.rank}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-400 text-[10px] font-bold">
                            {row.avatar}
                          </div>
                          <span className="text-[13px] font-bold text-slate-900 dark:text-slate-200 font-mono tracking-tight">
                            {row.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span
                          className={cn(
                            "text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider whitespace-nowrap inline-block",
                            "bg-indigo-100/70 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                          )}
                        >
                          {rankClassDisplay}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-[13px] font-bold text-slate-900 dark:text-slate-200 text-right">
                        {row.score}
                      </td>
                      <td className="py-4 px-6 text-[13px] font-bold text-slate-900 dark:text-slate-200 text-right">
                        {accDisplay}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function CTASection() {
  return (
    <section className="w-full mb-12">
      <div className="bg-[#09090B] dark:bg-slate-900 rounded-2xl p-8 md:p-10 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8 border dark:border-slate-800">
        <div className="max-w-xl text-center lg:text-left">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-3">Tham gia bảo vệ cộng đồng trực tuyến</h2>
          <p className="text-sm text-slate-400 font-medium leading-relaxed">
            Đóng góp phát hiện mối đe dọa với cam kết ẩn danh hoàn toàn (Zero PII) và nhận điểm uy tín kỹ thuật số.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto flex-col sm:flex-row">
          <Link
            href="/register"
            className="w-full sm:w-auto bg-white hover:bg-slate-100 text-[#09090B] font-bold text-sm px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <UserPlus weight="bold" size={18} />
            Đăng ký
          </Link>
          <a
            href="#zero-pii"
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors border border-slate-700"
          >
            <Shield weight="bold" size={18} />
            Quy chuẩn Zero PII
          </a>
        </div>
      </div>
    </section>
  )
}
