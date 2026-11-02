"use client"

import { useEffect, useState, type ReactNode } from "react"
import {
  Buildings,
  ChatCircleText,
  Globe,
  HourglassMedium,
  MagnifyingGlass,
  Phone,
  X,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import {
  adminPartnerRegistrations,
  type PartnerRegistrationCounts,
  type PartnerRegistrationItem,
  type PartnerRegistrationPage,
  type PartnerReviewStatus,
} from "@/features/admin/services/admin-partner-registrations"
import { cn } from "@/lib/utils"
import { WhitelistReviewDialog } from "./whitelist-review-dialog"
import { WhitelistStatusBadge } from "./whitelist-status-badge"

type FilterOption = "all" | PartnerReviewStatus

const filters: { key: FilterOption; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "PENDING", label: "Đang chờ" },
  { key: "VERIFIED", label: "Đã phê duyệt" },
  { key: "REJECTED", label: "Đã từ chối" },
]

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(
    new Date(value)
  )
}

function Identifier({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
      <span className="text-primary">{icon}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className="ml-auto truncate font-mono text-xs font-semibold"
        title={value}
      >
        {value || "—"}
      </span>
    </div>
  )
}

export function AdminWhitelistDashboard() {
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<FilterOption>("all")
  const [page, setPage] = useState(0)
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<PartnerRegistrationPage | null>(null)
  const [counts, setCounts] = useState<PartnerRegistrationCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search.trim() !== query) {
        setLoading(true)
        setPage(0)
        setQuery(search.trim())
      }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [search, query])

  useEffect(() => {
    let active = true
    adminPartnerRegistrations
      .list(query, filter === "all" ? null : filter, page)
      .then((data) => {
        if (!active) return
        setResult(data)
        setError(null)
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Không thể tải hồ sơ đối tác."
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [query, filter, page, revision])

  useEffect(() => {
    let active = true
    adminPartnerRegistrations
      .counts()
      .then((data) => {
        if (active) setCounts(data)
      })
      .catch(() => {
        if (active) setCounts(null)
      })
    return () => {
      active = false
    }
  }, [revision])

  function refresh() {
    setLoading(true)
    setRevision((value) => value + 1)
  }

  function changeFilter(next: FilterOption) {
    setFilter(next)
    setPage(0)
    setLoading(true)
  }

  const items: PartnerRegistrationItem[] = result?.data ?? []

  return (
    <section
      aria-labelledby="whitelist-heading"
      className="mx-auto max-w-screen-2xl space-y-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1
            id="whitelist-heading"
            className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl"
          >
            Whitelist Chính thức
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <HourglassMedium size={14} weight="fill" aria-hidden="true" />
            {counts
              ? `${counts.pending} hồ sơ đang chờ phê duyệt`
              : "Hồ sơ đăng ký đối tác"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-64">
            <MagnifyingGlass
              size={15}
              className="pointer-events-none absolute top-3 left-3 text-muted-foreground"
              aria-hidden="true"
            />
            <label htmlFor="admin-whitelist-search" className="sr-only">
              Tìm hồ sơ đối tác
            </label>
            <input
              id="admin-whitelist-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm tên, MST, email, chỉ số..."
              className="h-9 w-full rounded-lg border border-input bg-card pr-8 pl-9 text-xs placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Xóa tìm kiếm"
                onClick={() => setSearch("")}
                className="absolute top-1 right-1 size-7"
              >
                <X size={12} />
              </Button>
            )}
          </div>
          <div
            role="group"
            aria-label="Lọc theo trạng thái hồ sơ"
            className="flex flex-wrap items-center gap-1.5"
          >
            {filters.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={filter === option.key}
                onClick={() => changeFilter(option.key)}
                className={cn(
                  "rounded-full px-3.5 py-1 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  filter === option.key
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {option.label}
                {option.key === "PENDING" && counts && counts.pending > 0
                  ? ` (${counts.pending})`
                  : ""}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-card p-6 text-sm"
        >
          <p>{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="mt-3"
          >
            Thử lại
          </Button>
        </div>
      ) : loading ? (
        <div
          role="status"
          aria-busy="true"
          className="space-y-3"
          aria-label="Đang tải hồ sơ"
        >
          {[0, 1, 2].map((value) => (
            <div
              key={value}
              className="h-32 animate-pulse rounded-xl border border-border bg-muted/40"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 py-14 text-center">
          <Buildings size={40} className="mx-auto text-muted-foreground/50" />
          <p className="mt-3 text-sm font-semibold">Không tìm thấy hồ sơ nào</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Thử thay đổi từ khóa hoặc bộ lọc.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className={cn(
                "rounded-xl border bg-card p-4 transition-shadow hover:shadow-xs",
                item.verificationStatus === "PENDING"
                  ? "border-amber-200 dark:border-amber-800"
                  : "border-border"
              )}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground">
                    Hồ sơ #{item.id} · Gửi {formatDate(item.createdAt)}
                  </p>
                  <h2 className="mt-1 font-heading text-base font-bold">
                    {item.legalName}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    MST {item.taxCode} · {item.corporateEmail}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Người đăng ký: {item.representativeNameAndTitle}
                  </p>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-start">
                  <WhitelistStatusBadge status={item.verificationStatus} />
                  <WhitelistReviewDialog item={item} onUpdated={refresh} />
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <Identifier
                  icon={<Globe size={15} />}
                  label="Domain"
                  value={item.officialDomain}
                />
                <Identifier
                  icon={<Phone size={15} />}
                  label="Hotline"
                  value={item.officialHotline}
                />
                <Identifier
                  icon={<ChatCircleText size={15} />}
                  label="SMS"
                  value={item.smsBrandName}
                />
              </div>
            </article>
          ))}
        </div>
      )}

      {!error && result && result.totalPages > 1 && (
        <nav
          aria-label="Phân trang hồ sơ"
          className="flex items-center justify-end gap-3 text-xs"
        >
          <span>
            Trang {result.currentPage + 1} / {result.totalPages} ·{" "}
            {result.totalItems} hồ sơ
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!result.hasPrevious || loading}
            onClick={() => {
              setPage((value) => value - 1)
              setLoading(true)
            }}
          >
            Trước
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!result.hasNext || loading}
            onClick={() => {
              setPage((value) => value + 1)
              setLoading(true)
            }}
          >
            Tiếp
          </Button>
        </nav>
      )}
    </section>
  )
}
