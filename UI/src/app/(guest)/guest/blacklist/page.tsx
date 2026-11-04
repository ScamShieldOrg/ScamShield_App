"use client"

import { Suspense, useState, useMemo, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import axios from "axios"
import {
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  ShieldWarningIcon,
  CheckCircleIcon,
  WarningCircleIcon,
  GlobeIcon,
  PhoneCallIcon,
  BuildingsIcon,
  CertificateIcon,
  ShieldPlusIcon,
  ArrowRightIcon,
  XIcon,
  CaretDownIcon,
  InfoIcon,
  CopyIcon,
  CheckIcon,
  CreditCardIcon,
  BroadcastIcon,
  PhoneSlashIcon,
  GlobeSimpleXIcon,
  ShieldSlashIcon,
  EyeIcon,
  CalendarBlankIcon,
  SirenIcon,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { resourceService } from "@/features/resources/services/resource.service"
import { BlackItem, WhitelistResource } from "@/types/resource"

type TabType = "blacklist" | "whitelist"
type CategoryFilter = "all" | "phone" | "website" | "bank" | "sms"
type SortOrder = "newest" | "name" | "reports"

interface WhitelistItem {
  id: string
  name: string
  category: "phone" | "website" | "bank" | "sms"
  categoryLabel: string
  description: string
  authority: string
  hotline: string
  hotlineLabel: string
  website: string
  websiteLabel: string
  identifierLabel: string
  identifierValue: string
  identifierColor?: string
  verificationBadge: string
  verifiedAt: string
  taxId?: string
  legalRepresentative?: string
  securityCert?: string
}

function toWhitelistItem(resource: WhitelistResource): WhitelistItem {
  const type = resource.verifiedIndicators[0]?.resourceType?.toUpperCase()
  const category =
    type === "PHONE"
      ? "phone"
      : type === "BANK_ACCOUNT"
        ? "bank"
        : type === "SMS"
          ? "sms"
          : "website"
  const identifier =
    resource.smsBrandNames[0] ||
    resource.verifiedIndicators[0]?.value ||
    resource.brandName

  return {
    id: `WL-${resource.id}`,
    name: resource.name,
    category,
    categoryLabel:
      resource.partnerType === "BUSINESS"
        ? "DOANH NGHIỆP"
        : resource.partnerType,
    description:
      resource.brandName !== resource.name
        ? `Thương hiệu: ${resource.brandName}`
        : "Đơn vị đã xác minh",
    authority: "Đối tác đã xác minh",
    hotline: resource.officialHotlines.join(" / ") || "Chưa cập nhật",
    hotlineLabel: "Hotline chính thức",
    website: resource.officialDomains.join(" / ") || "Chưa cập nhật",
    websiteLabel: "Tên miền chính thức",
    identifierLabel: resource.smsBrandNames.length
      ? "SMS Brandname"
      : "Định danh đã xác minh",
    identifierValue: identifier,
    verificationBadge: "Đã xác minh",
    verifiedAt: formatDate(resource.verifiedAt ?? undefined),
    taxId: resource.taxId ?? undefined,
    legalRepresentative: resource.legalRepresentative ?? undefined,
  }
}

function formatDate(isoString?: string): string {
  if (!isoString) return "—"
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return isoString
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch {
    return isoString
  }
}

function getResourceIcon(resourceType: string) {
  switch (resourceType?.toUpperCase()) {
    case "URL":
    case "WEBSITE":
      return <GlobeSimpleXIcon size={20} weight="bold" />
    case "PHONE":
      return <PhoneSlashIcon size={20} weight="bold" />
    case "BANK_ACCOUNT":
    case "BANK":
      return <CreditCardIcon size={20} weight="bold" />
    case "SMS":
      return <BroadcastIcon size={20} weight="bold" />
    default:
      return <ShieldSlashIcon size={20} weight="bold" />
  }
}

function getResourceTypeLabel(resourceType: string): string {
  switch (resourceType?.toUpperCase()) {
    case "URL":
    case "WEBSITE":
      return "WEBSITE / URL"
    case "PHONE":
      return "SỐ ĐIỆN THOẠI"
    case "BANK_ACCOUNT":
    case "BANK":
      return "TÀI KHOẢN NGÂN HÀNG"
    case "SMS":
      return "SMS BRANDNAME"
    default:
      return resourceType || "TÀI NGUYÊN"
  }
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages: (number | "...")[] = []
  pages.push(1)
  if (current > 3) {
    pages.push("...")
  }
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  if (current < total - 2) {
    pages.push("...")
  }
  pages.push(total)
  return pages
}

export default function GuestBlacklistPage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-6 text-sm text-muted-foreground">
          Đang tải tài nguyên…
        </p>
      }
    >
      <GuestBlacklistSearch />
    </Suspense>
  )
}

function GuestBlacklistSearch() {
  const searchParams = useSearchParams()
  const search = searchParams.get("search") || ""
  const tab: TabType =
    searchParams.get("tab") === "whitelist" ? "whitelist" : "blacklist"
  return (
    <GuestBlacklistContent
      key={JSON.stringify([tab, search])}
      initialSearch={search}
      initialTab={tab}
    />
  )
}

function GuestBlacklistContent({
  initialSearch,
  initialTab,
}: {
  initialSearch: string
  initialTab: TabType
}) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("all")
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest")
  const [currentPage, setCurrentPage] = useState(1)

  // API State for Blacklist
  const [blacklistData, setBlacklistData] = useState<BlackItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [totalRecords, setTotalRecords] = useState<number>(0)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [hasNextPage, setHasNextPage] = useState<boolean>(false)
  const [whitelistData, setWhitelistData] = useState<WhitelistItem[]>([])
  const [whitelistLoading, setWhitelistLoading] = useState(false)
  const [whitelistError, setWhitelistError] = useState<string | null>(null)
  const [whitelistTotalRecords, setWhitelistTotalRecords] = useState(0)
  const [whitelistTotalPages, setWhitelistTotalPages] = useState(1)

  // Modals & Details
  const [selectedItemForDetail, setSelectedItemForDetail] =
    useState<WhitelistItem | null>(null)
  const [selectedBlacklistItem, setSelectedBlacklistItem] =
    useState<BlackItem | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => {
      setCopiedKey(null)
    }, 2000)
  }

  // Fetch Blacklist Data from backend using publicApi
  useEffect(() => {
    if (activeTab !== "blacklist") return

    let isMounted = true
    const controller = new AbortController()

    const fetchBlacklist = async () => {
      setIsLoading(true)
      setError(null)

      try {
        let resourceTypeParam: string | undefined = undefined
        if (selectedCategory === "phone") resourceTypeParam = "PHONE"
        else if (selectedCategory === "website") resourceTypeParam = "URL"
        else if (selectedCategory === "bank") resourceTypeParam = "BANK_ACCOUNT"
        else if (selectedCategory === "sms") resourceTypeParam = "SMS"

        const res = await resourceService.getBlackList(
          {
            page: Math.max(0, currentPage - 1),
            size: 5,
            keyword: searchQuery.trim() || undefined,
            resourceType: resourceTypeParam,
          },
          controller.signal
        )

        if (isMounted) {
          setBlacklistData(res.data || [])
          setTotalRecords(res.totalItems || 0)
          setTotalPages(Math.max(1, res.totalPages || 1))
          setHasNextPage(Boolean(res.hasNext))
        }
      } catch (err: unknown) {
        if (
          axios.isCancel(err) ||
          (err as { name?: string })?.name === "CanceledError"
        ) {
          return
        }
        if (isMounted) {
          if (axios.isAxiosError(err)) {
            setError(
              err.response?.data?.message ||
                "Không thể kết nối đến máy chủ danh sách đen"
            )
          } else {
            setError("Đã xảy ra lỗi khi tải dữ liệu")
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    const timeoutId = setTimeout(
      () => {
        fetchBlacklist()
      },
      searchQuery.trim() ? 350 : 0
    )

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [activeTab, currentPage, searchQuery, selectedCategory])

  useEffect(() => {
    if (activeTab !== "whitelist") return

    let isMounted = true
    const controller = new AbortController()
    const timeoutId = setTimeout(
      async () => {
        setWhitelistLoading(true)
        setWhitelistError(null)
        try {
          const result = await resourceService.getWhiteList(
            {
              page: currentPage - 1,
              size: 5,
              keyword: searchQuery,
              sortBy: sortOrder === "name" ? "name" : "newest",
            },
            controller.signal
          )
          if (isMounted) {
            setWhitelistData(result.data.map(toWhitelistItem))
            setWhitelistTotalRecords(result.totalItems)
            setWhitelistTotalPages(Math.max(1, result.totalPages))
          }
        } catch (err: unknown) {
          if (axios.isCancel(err)) return
          if (isMounted) {
            setWhitelistError(
              axios.isAxiosError(err)
                ? err.response?.data?.message || "Không thể tải danh sách trắng"
                : "Đã xảy ra lỗi khi tải danh sách trắng"
            )
          }
        } finally {
          if (isMounted) setWhitelistLoading(false)
        }
      },
      searchQuery.trim() ? 350 : 0
    )

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [activeTab, currentPage, searchQuery, sortOrder])

  // Sort displayed Blacklist data
  const displayedBlacklist = useMemo(() => {
    const list = [...blacklistData]
    if (sortOrder === "name") {
      list.sort((a, b) => (a.title || "").localeCompare(b.title || ""))
    } else if (sortOrder === "reports") {
      list.sort((a, b) => (b.warningCount ?? 0) - (a.warningCount ?? 0))
    }
    return list
  }, [blacklistData, sortOrder])

  const handlePageChange = (newPage: number) => {
    const pageCount =
      activeTab === "whitelist" ? whitelistTotalPages : totalPages
    if (newPage >= 1 && newPage <= pageCount) {
      setCurrentPage(newPage)
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 380, behavior: "smooth" })
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8FF] text-foreground dark:bg-background">
      {/* Top Ambient Glow & Header Section */}
      <section className="relative overflow-hidden border-b border-[#E2E7FF]/70 bg-[#F2F3FF] px-4 pt-10 pb-16 sm:px-6 lg:px-8 dark:border-border/60 dark:bg-muted/30">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 left-1/2 h-[360px] w-[720px] -translate-x-1/2 rounded-full bg-[#DBE1FF]/40 blur-[32px] dark:bg-primary/10"
        />

        <div className="relative mx-auto max-w-6xl">
          <div className="max-w-3xl space-y-3">
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-[#131B2E] sm:text-4xl lg:text-5xl dark:text-foreground">
              Tra cứu tài nguyên
            </h1>
            <p className="text-base leading-relaxed text-[#45464D] sm:text-lg dark:text-muted-foreground">
              Tra cứu tức thì danh bạ cảnh báo các đầu số, tên miền lừa đảo
              (Blacklist) và danh sách liên lạc, website chính thống đã được xác
              thực.
            </p>
          </div>
        </div>
      </section>

      {/* Main Directory Operations Container */}
      <div className="relative mx-auto -mt-8 max-w-6xl space-y-6 px-4 pb-24 sm:px-6 lg:px-8">
        {/* Segmented Master Controls & Search Hub Card */}
        <div className="rounded-2xl border border-[#E2E7FF] bg-white p-6 shadow-xs dark:border-border dark:bg-card">
          {/* Top Row: Segmented Tab Switchers */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex rounded-xl bg-[#F2F3FF] p-1 dark:bg-muted">
              {/* Tab: Blacklist */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab("blacklist")
                  setCurrentPage(1)
                }}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
                  activeTab === "blacklist"
                    ? "bg-white text-[#131B2E] shadow-xs dark:bg-card dark:text-foreground"
                    : "text-[#45464D] hover:text-[#131B2E] dark:text-muted-foreground dark:hover:text-foreground"
                )}
              >
                <WarningCircleIcon
                  size={18}
                  weight="fill"
                  className={cn(
                    activeTab === "blacklist"
                      ? "text-[#BA1A1A] dark:text-destructive"
                      : "text-[#BA1A1A]/70"
                  )}
                />
                <span>Danh Sách Đen (Blacklist)</span>
                <span className="rounded-full bg-[#FFDAD6] px-2 py-0.5 text-[11px] font-bold tracking-wide text-[#93000A] dark:bg-destructive/20 dark:text-destructive">
                  {totalRecords > 0 ? totalRecords.toLocaleString() : "..."}
                </span>
              </button>

              {/* Tab: Whitelist */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab("whitelist")
                  setCurrentPage(1)
                  setWhitelistLoading(true)
                  if (sortOrder === "reports") {
                    setSortOrder("newest")
                  }
                }}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
                  activeTab === "whitelist"
                    ? "bg-white text-[#131B2E] shadow-xs dark:bg-card dark:text-foreground"
                    : "text-[#45464D] hover:text-[#131B2E] dark:text-muted-foreground dark:hover:text-foreground"
                )}
              >
                <ShieldCheckIcon
                  size={18}
                  weight="fill"
                  className={cn(
                    activeTab === "whitelist"
                      ? "text-[#059669] dark:text-emerald-400"
                      : "text-[#059669]/70"
                  )}
                />
                <span>Danh Sách Trắng (Whitelist)</span>
                <span className="rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-bold tracking-wide text-[#047857] dark:bg-emerald-950/40 dark:text-emerald-400">
                  {whitelistTotalRecords.toLocaleString()}
                </span>
              </button>
            </div>

            {/* Quick Helper Text */}
            <div className="hidden text-xs text-[#45464D] sm:block dark:text-muted-foreground">
              {activeTab === "whitelist" ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                  <CheckCircleIcon size={14} weight="fill" />
                  Dữ liệu định danh chính thống từ cơ quan nhà nước & tổ chức uy
                  tín
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                  <WarningCircleIcon size={14} weight="fill" />
                  Cơ sở dữ liệu cảnh báo gian lận & tội phạm công nghệ cao
                </span>
              )}
            </div>
          </div>

          {/* Search Field */}
          <div className="mt-5">
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute left-4 text-[#45464D] dark:text-muted-foreground">
                <MagnifyingGlassIcon size={20} weight="bold" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Tìm kiếm số điện thoại, tên miền URL, đơn vị, Brandname..."
                className="h-14 w-full rounded-xl border border-[#E2E7FF] bg-white pr-12 pl-12 text-sm text-[#131B2E] placeholder-[#76767E] transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden dark:border-border dark:bg-background dark:text-foreground dark:placeholder:text-muted-foreground"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("")
                    setCurrentPage(1)
                  }}
                  className="absolute right-4 rounded-full p-1 text-[#45464D] hover:bg-[#F2F3FF] dark:text-muted-foreground dark:hover:bg-muted"
                  aria-label="Xóa tìm kiếm"
                >
                  <XIcon size={16} weight="bold" />
                </button>
              )}
            </div>
          </div>

          {/* Filters & Sort Controls Row */}
          <div className="mt-4 flex flex-col gap-4 pt-1 sm:flex-row sm:items-center sm:justify-between">
            {/* Filter Tags - Only displayed in Blacklist tab */}
            {activeTab === "blacklist" && (
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { key: "all", label: "Tất cả loại hình" },
                    { key: "phone", label: "Số điện thoại" },
                    { key: "website", label: "Website / Domain" },
                    { key: "bank", label: "Tài khoản ngân hàng" },
                    { key: "sms", label: "SMS Brandname" },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.key)
                      setCurrentPage(1)
                    }}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                      selectedCategory === cat.key
                        ? "bg-[#131A33] text-white shadow-xs dark:bg-primary dark:text-primary-foreground"
                        : "bg-[#F2F3FF] text-[#45464D] hover:bg-[#E2E7FF] hover:text-[#131B2E] dark:bg-muted dark:text-muted-foreground dark:hover:bg-muted/80 dark:hover:text-foreground"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            )}

            {/* Sort Dropdown */}
            <div
              className={cn(
                "flex items-center gap-2 text-xs font-semibold text-[#45464D] dark:text-muted-foreground",
                activeTab === "whitelist" && "sm:ml-auto"
              )}
            >
              <span>SẮP XẾP:</span>
              <div className="relative">
                <select
                  value={sortOrder}
                  onChange={(e) => {
                    setSortOrder(e.target.value as SortOrder)
                    setCurrentPage(1)
                  }}
                  className="appearance-none rounded-lg border border-[#E2E7FF] bg-white py-1.5 pr-8 pl-3 text-xs font-medium text-[#131B2E] focus:border-primary focus:outline-hidden dark:border-border dark:bg-background dark:text-foreground"
                >
                  <option value="newest">Mới cập nhật nhất</option>
                  <option value="name">Theo tên (A - Z)</option>
                  {activeTab === "blacklist" && (
                    <option value="reports">Lượt cảnh báo nhiều nhất</option>
                  )}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[#45464D] dark:text-muted-foreground">
                  <CaretDownIcon size={14} weight="bold" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section: TAB 1 - BLACKLIST CONTENT (CONNECTED TO API) */}
        {activeTab === "blacklist" && (
          <div className="space-y-3">
            {/* Loading Indicator */}
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((idx) => (
                  <div
                    key={idx}
                    className="flex animate-pulse flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-xs lg:flex-row lg:items-center dark:border-border dark:bg-card"
                  >
                    <div className="flex w-full items-start gap-3.5">
                      <div className="size-11 shrink-0 rounded-xl bg-slate-200 dark:bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-48 rounded bg-slate-200 dark:bg-muted" />
                        <div className="h-3 w-3/4 rounded bg-slate-100 dark:bg-muted/60" />
                        <div className="h-3 w-1/3 rounded bg-slate-100 dark:bg-muted/60" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-dashed border-red-200 bg-red-50/50 p-12 text-center dark:border-destructive/30 dark:bg-destructive/10">
                <WarningCircleIcon
                  size={48}
                  className="mx-auto text-destructive opacity-80"
                />
                <h3 className="mt-3 text-base font-bold text-destructive">
                  {error}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => p)}
                  className="mt-4 inline-flex items-center rounded-lg bg-[#131A33] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#131A33]/90 dark:bg-primary dark:text-primary-foreground"
                >
                  Thử lại
                </button>
              </div>
            ) : displayedBlacklist.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#C6C6CE] bg-white p-12 text-center dark:border-border dark:bg-card">
                <WarningCircleIcon
                  size={48}
                  className="mx-auto text-muted-foreground opacity-40"
                />
                <h3 className="mt-3 text-base font-bold text-[#131B2E] dark:text-foreground">
                  Không tìm thấy cảnh báo nào phù hợp
                </h3>
                <p className="mt-1 text-sm text-[#45464D] dark:text-muted-foreground">
                  Thử tìm kiếm với số điện thoại, URL hoặc tên tài khoản khác.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("")
                    setSelectedCategory("all")
                    setCurrentPage(1)
                  }}
                  className="mt-4 inline-flex items-center rounded-lg bg-[#131A33] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#131A33]/90 dark:bg-primary dark:text-primary-foreground"
                >
                  Đặt lại bộ lọc
                </button>
              </div>
            ) : (
              displayedBlacklist.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-xs transition-all hover:shadow-md lg:flex-row lg:items-center dark:border-border dark:bg-card"
                >
                  {/* Left: Icon and Core Target Information */}
                  <div className="flex items-start gap-3.5">
                    {/* Icon Box */}
                    <div
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-xl",
                        item.resourceType === "SMS"
                          ? "bg-[#FFF6E5] text-[#D97706] dark:bg-amber-950/40 dark:text-amber-400"
                          : "bg-[#FFEAEA] text-[#D83A56] dark:bg-rose-950/40 dark:text-rose-400"
                      )}
                    >
                      {getResourceIcon(item.resourceType)}
                    </div>

                    {/* Information Area */}
                    <div className="space-y-1">
                      {/* Line 1: Target + Threat Level + Resource Type Tag */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold text-[#131B2E] sm:text-lg dark:text-foreground">
                          {item.title}
                        </span>

                        {/* Threat Level Badge */}
                        <span
                          className={cn(
                            "rounded px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase",
                            item.severity === "CRITICAL" ||
                              item.severity === "URGENT"
                              ? "bg-[#B31D1D] text-white"
                              : item.severity === "HIGH"
                                ? "bg-[#FFE4E6] text-[#9F1239] dark:bg-rose-950/50 dark:text-rose-300"
                                : "bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950/50 dark:text-amber-300"
                          )}
                        >
                          {item.severityLabel || item.severity}
                        </span>

                        {/* Resource Type Tag */}
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 uppercase dark:bg-muted dark:text-muted-foreground">
                          {getResourceTypeLabel(item.resourceType)}
                        </span>
                      </div>

                      {/* Line 2: Description */}
                      <p className="text-xs leading-relaxed text-[#45464D] dark:text-muted-foreground">
                        {item.description}
                      </p>

                      {/* Line 3: Meta Statistics Row */}
                      <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-[#64748B] dark:text-slate-400">
                        <span className="inline-flex items-center gap-1.5">
                          <EyeIcon
                            size={14}
                            className="text-[#64748B] dark:text-slate-400"
                          />
                          <span className="font-semibold text-[#1E293B] dark:text-slate-200">
                            {(item.warningCount ?? 0).toLocaleString()}
                          </span>{" "}
                          lượt cảnh báo
                        </span>

                        <span className="inline-flex items-center gap-1.5">
                          <CalendarBlankIcon
                            size={14}
                            className="text-[#64748B] dark:text-slate-400"
                          />
                          Cập nhật:{" "}
                          {formatDate(item.updatedAt || item.confirmedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Action Button */}
                  <div className="shrink-0 pt-2 lg:pt-0">
                    <button
                      type="button"
                      onClick={() => setSelectedBlacklistItem(item)}
                      className="rounded-lg bg-[#EEF2FF] px-4 py-2 text-xs font-semibold text-[#4338CA] transition hover:bg-[#E0E7FF] dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
                    >
                      Chi tiết cảnh báo
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Bottom Bar: Separated Pages & Report CTA Button */}
            <div className="mt-5 flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-[#F8FAFC] p-3 sm:flex-row sm:items-center sm:justify-between dark:border-border dark:bg-card/60">
              {/* Left: Record summary & Page indicator */}
              <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                <span>
                  Đang hiển thị {displayedBlacklist.length} trên tổng số{" "}
                  {totalRecords.toLocaleString()} bản ghi
                </span>
                <span className="mx-2 text-slate-400">•</span>
                <span>
                  Trang {currentPage} /{" "}
                  {Math.max(1, totalPages).toLocaleString()}
                </span>
              </div>

              {/* Right: Pagination Navigation & Report CTA */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 text-xs">
                  <button
                    type="button"
                    disabled={currentPage <= 1 || isLoading}
                    onClick={() => handlePageChange(currentPage - 1)}
                    className="rounded px-2.5 py-1 text-slate-500 hover:text-slate-900 disabled:opacity-40 disabled:hover:text-slate-500 dark:text-slate-400 dark:hover:text-white"
                  >
                    Trước
                  </button>

                  {/* Dynamic page numbers */}
                  {getPageNumbers(currentPage, totalPages).map((p, idx) =>
                    p === "..." ? (
                      <span key={`dots-${idx}`} className="px-1 text-slate-400">
                        ...
                      </span>
                    ) : (
                      <button
                        key={`page-${p}`}
                        type="button"
                        disabled={isLoading}
                        onClick={() => handlePageChange(Number(p))}
                        className={cn(
                          "flex size-7 items-center justify-center rounded-md text-xs font-bold transition-colors",
                          currentPage === p
                            ? "bg-[#0B132B] text-white dark:bg-foreground dark:text-background"
                            : "text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-muted"
                        )}
                      >
                        {p}
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    disabled={
                      currentPage >= totalPages || !hasNextPage || isLoading
                    }
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="rounded px-2.5 py-1 font-medium text-slate-700 hover:text-slate-900 disabled:opacity-40 disabled:hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
                  >
                    Sau
                  </button>
                </div>

                {/* Red CTA Button: Report new scam target */}
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#A31D1D] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#8B1818] active:scale-95"
                >
                  <SirenIcon size={14} weight="fill" />
                  <span>Báo cáo đối tượng mới</span>
                </Link>
              </div>
            </div>

            {/* Warning Alert Note */}
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-300">
              <div className="flex items-start gap-2.5">
                <InfoIcon
                  size={18}
                  weight="fill"
                  className="mt-0.5 shrink-0 text-amber-600"
                />
                <div className="space-y-1">
                  <p className="font-bold">
                    Lưu ý bảo mật từ Trung tâm Giám sát Không gian mạng:
                  </p>
                  <p className="leading-relaxed">
                    Không bao giờ cung cấp mã OTP, mật khẩu tài khoản ngân hàng
                    hoặc chuyển tiền vào các số tài khoản cá nhân theo yêu cầu
                    của người lạ qua điện thoại hoặc mạng xã hội. Nếu phát hiện
                    dấu hiệu lừa đảo, hãy báo cáo ngay cho cơ quan chức năng
                    hoặc gửi báo cáo tại ScamShield VN.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Section: TAB 2 - WHITELIST CONTENT */}
        {activeTab === "whitelist" && (
          <div className="space-y-4">
            {whitelistLoading ? (
              <div className="rounded-xl border border-[#E2E7FF] bg-white p-8 text-center text-sm text-[#45464D] dark:border-border dark:bg-card dark:text-muted-foreground">
                Đang tải danh sách...
              </div>
            ) : whitelistError ? (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-white p-8 text-center text-sm text-red-700 dark:border-destructive/30 dark:bg-card dark:text-destructive"
              >
                {whitelistError}
              </div>
            ) : whitelistData.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#C6C6CE] bg-white p-12 text-center dark:border-border dark:bg-card">
                <ShieldCheckIcon
                  size={48}
                  className="mx-auto text-muted-foreground opacity-40"
                />
                <h3 className="mt-3 text-base font-bold text-[#131B2E] dark:text-foreground">
                  Không tìm thấy đơn vị nào phù hợp
                </h3>
                <p className="mt-1 text-sm text-[#45464D] dark:text-muted-foreground">
                  Thử tìm kiếm với từ khóa khác.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("")
                  }}
                  className="mt-4 inline-flex items-center rounded-lg bg-[#131A33] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#131A33]/90 dark:bg-primary dark:text-primary-foreground"
                >
                  Đặt lại tìm kiếm
                </button>
              </div>
            ) : (
              whitelistData.map((item) => (
                <div
                  key={item.id}
                  className="group flex flex-col justify-between gap-4 rounded-xl border border-[#E2E7FF] bg-white p-4 shadow-xs transition-all hover:border-[#CAD4FF] hover:shadow-md lg:flex-row lg:items-center dark:border-border dark:bg-card dark:hover:border-primary/40"
                >
                  {/* Left: Organization Identity Info */}
                  <div className="flex items-start gap-4 lg:w-[35%]">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#ECFDF5] text-[#059669] dark:bg-emerald-950/40 dark:text-emerald-400">
                      {item.category === "phone" ? (
                        <BroadcastIcon size={20} weight="bold" />
                      ) : item.category === "bank" ? (
                        <CreditCardIcon size={20} weight="bold" />
                      ) : item.category === "website" &&
                        item.categoryLabel.includes("CƠ QUAN") ? (
                        <BuildingsIcon size={20} weight="bold" />
                      ) : (
                        <ShieldCheckIcon size={20} weight="bold" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-heading text-base font-bold tracking-tight text-[#131B2E] sm:text-lg dark:text-foreground">
                          {item.name}
                        </h3>
                        <span className="rounded bg-[#D1FAE5] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#065F46] uppercase dark:bg-emerald-900/40 dark:text-emerald-300">
                          {item.categoryLabel}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-xs leading-relaxed text-[#45464D] dark:text-muted-foreground">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-1.5 pt-1 text-[11px] font-bold text-[#45464D] dark:text-muted-foreground">
                        <CertificateIcon
                          size={14}
                          weight="fill"
                          className="text-emerald-600 dark:text-emerald-400"
                        />
                        <span>{item.authority}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Key Verification Attributes (3 columns on background) */}
                  <div className="grid grid-cols-1 gap-2 rounded-lg bg-[#F2F3FF] p-2.5 sm:grid-cols-3 sm:gap-4 lg:w-[42%] dark:bg-muted/50">
                    {/* Hotline */}
                    <div className="space-y-0.5">
                      <span className="block text-[11px] font-bold text-[#45464D] dark:text-muted-foreground">
                        {item.hotlineLabel}
                      </span>
                      <span className="block font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">
                        {item.hotline}
                      </span>
                    </div>

                    {/* Official Website */}
                    <div className="space-y-0.5">
                      <span className="block text-[11px] font-bold text-[#45464D] dark:text-muted-foreground">
                        {item.websiteLabel}
                      </span>
                      <span className="block truncate font-mono text-sm font-medium text-[#131B2E] dark:text-foreground">
                        {item.website}
                      </span>
                    </div>

                    {/* Specific Identity */}
                    <div className="space-y-0.5">
                      <span className="block text-[11px] font-bold text-[#45464D] dark:text-muted-foreground">
                        {item.identifierLabel}
                      </span>
                      <span
                        className={cn(
                          "block truncate text-sm font-bold",
                          item.identifierColor ||
                            "text-[#131B2E] dark:text-foreground"
                        )}
                      >
                        {item.identifierValue}
                      </span>
                    </div>
                  </div>

                  {/* Right: Verified Badge & Action Button */}
                  <div className="flex flex-col items-center justify-between gap-3 pt-2 sm:pt-0 lg:w-[20%] lg:justify-end">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF5] px-2.5 py-1 text-xs font-semibold text-[#047857] dark:bg-emerald-950/40 dark:text-emerald-400">
                      <CheckCircleIcon size={14} weight="fill" />
                      {item.verificationBadge}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedItemForDetail(item)}
                      className="rounded-lg bg-[#EAEDFF] px-3.5 py-1.5 text-xs font-semibold text-[#131B2E] transition-colors hover:bg-[#D5DCFF] dark:bg-primary/20 dark:text-foreground dark:hover:bg-primary/30"
                    >
                      Chi tiết thẩm định
                    </button>
                  </div>
                </div>
              ))
            )}

            {!whitelistLoading &&
              !whitelistError &&
              whitelistTotalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-3 text-sm text-[#45464D] dark:text-muted-foreground">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                    className="rounded-lg border border-[#E2E7FF] px-3 py-1.5 disabled:opacity-40 dark:border-border"
                  >
                    Trước
                  </button>
                  <span>
                    Trang {currentPage} / {whitelistTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= whitelistTotalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="rounded-lg border border-[#E2E7FF] px-3 py-1.5 disabled:opacity-40 dark:border-border"
                  >
                    Tiếp
                  </button>
                </div>
              )}

            {/* B2B Call-to-action Banner (Registration Whitelist) */}
            <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-xl border border-[#CAD4FF] bg-[#E2E7FF] p-6 shadow-xs md:flex-row md:items-center dark:border-primary/20 dark:bg-primary/10">
              <div className="flex items-center gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#131A33] text-white dark:bg-primary dark:text-primary-foreground">
                  <ShieldPlusIcon size={24} weight="fill" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-[#131B2E] sm:text-xl dark:text-foreground">
                    Đăng ký Whitelist Doanh Nghiệp & Đơn vị Chính thức
                  </h3>
                  <p className="mt-1 text-sm text-[#45464D] dark:text-muted-foreground">
                    Bảo vệ thương hiệu, xác thực số hotline và
                    tên miền chính thức để phòng tránh tội phạm mạng mạo danh.
                  </p>
                </div>
              </div>
              <Link
                href="/login"
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#131A33] px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#131A33]/90 dark:bg-primary dark:text-primary-foreground"
              >
                <span>Nộp hồ sơ thẩm định tổ chức</span>
                <ArrowRightIcon size={16} weight="bold" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Blacklist Investigation Detail Modal */}
      {selectedBlacklistItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-xl rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl dark:border-destructive/30 dark:bg-card">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-[#FFEAEA] text-[#D83A56] dark:bg-rose-950/40 dark:text-rose-400">
                  <ShieldWarningIcon size={24} weight="fill" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-lg font-bold text-[#131B2E] dark:text-foreground">
                      Hồ Sơ Cảnh Báo Vi Phạm
                    </h3>
                    <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 uppercase dark:bg-destructive/30 dark:text-rose-300">
                      {selectedBlacklistItem.severityLabel ||
                        selectedBlacklistItem.severity}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mã hồ sơ: BL-{selectedBlacklistItem.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBlacklistItem(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Đóng"
              >
                <XIcon size={18} weight="bold" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="mt-4 space-y-4 text-xs">
              {/* Target Banner */}
              <div className="rounded-xl border border-rose-100 bg-[#FFF5F5] p-3.5 dark:border-destructive/20 dark:bg-destructive/10">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-wider text-rose-800 uppercase dark:text-rose-400">
                    ĐỐI TƯỢNG BỊ TỐ CÁO
                  </span>
                  <span className="rounded bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-rose-700 shadow-xs dark:bg-card dark:text-rose-300">
                    {(selectedBlacklistItem.warningCount ?? 0).toLocaleString()}{" "}
                    lượt báo cáo
                  </span>
                </div>
                <p className="mt-1 font-mono text-base font-bold text-[#BA1A1A] sm:text-lg dark:text-rose-400">
                  {selectedBlacklistItem.title}
                </p>
              </div>

              {/* Technical Dossier Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-2.5">
                  <span className="block text-[10px] text-muted-foreground">
                    Loại hình tài nguyên
                  </span>
                  <span className="mt-0.5 block font-bold text-foreground">
                    {getResourceTypeLabel(selectedBlacklistItem.resourceType)}
                  </span>
                </div>
                <div className="rounded-lg border border-border p-2.5">
                  <span className="block text-[10px] text-muted-foreground">
                    Mức độ cảnh báo
                  </span>
                  <span className="mt-0.5 block font-bold text-foreground">
                    {selectedBlacklistItem.severityLabel ||
                      selectedBlacklistItem.severity}
                  </span>
                </div>
                <div className="rounded-lg border border-border p-2.5">
                  <span className="block text-[10px] text-muted-foreground">
                    Thời điểm xác nhận
                  </span>
                  <span className="mt-0.5 block font-bold text-foreground">
                    {formatDate(selectedBlacklistItem.confirmedAt)}
                  </span>
                </div>
                <div className="rounded-lg border border-border p-2.5">
                  <span className="block text-[10px] text-muted-foreground">
                    Thời điểm cập nhật mới nhất
                  </span>
                  <span className="mt-0.5 block font-bold text-foreground">
                    {formatDate(selectedBlacklistItem.updatedAt)}
                  </span>
                </div>
              </div>

              {/* Technical Blocking Evidence */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-border dark:bg-muted/40">
                <span className="block text-[10px] font-bold tracking-wider text-slate-600 uppercase dark:text-slate-400">
                  Trạng thái kiểm duyệt
                </span>
                <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {selectedBlacklistItem.description}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4">
              <button
                type="button"
                onClick={() => setSelectedBlacklistItem(null)}
                className="rounded-lg bg-[#131A33] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#131A33]/90 dark:bg-primary dark:text-primary-foreground"
              >
                Đóng hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Detail Modal (Whitelist) */}
      {selectedItemForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl border border-[#E2E7FF] bg-white p-6 shadow-xl dark:border-border dark:bg-card">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#E2E7FF] pb-4 dark:border-border">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#ECFDF5] text-[#059669] dark:bg-emerald-950/40 dark:text-emerald-400">
                  <ShieldCheckIcon size={22} weight="fill" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-[#131B2E] dark:text-foreground">
                    Hồ sơ Thẩm định Định danh
                  </h3>
                  <p className="text-xs text-[#45464D] dark:text-muted-foreground">
                    Mã xác thực: {selectedItemForDetail.id.toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItemForDetail(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-[#F2F3FF] hover:text-foreground dark:hover:bg-muted"
                aria-label="Đóng"
              >
                <XIcon size={18} weight="bold" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="mt-4 space-y-4 text-xs">
              <div className="rounded-xl bg-[#F2F3FF] p-3.5 dark:bg-muted/40">
                <span className="block text-[10px] font-bold tracking-wider text-[#45464D] uppercase dark:text-muted-foreground">
                  TỔ CHỨC ĐƯỢC XÁC THỰC
                </span>
                <p className="mt-0.5 text-sm font-bold text-[#131B2E] dark:text-foreground">
                  {selectedItemForDetail.name}
                </p>
                <p className="mt-1 text-xs text-[#45464D] dark:text-muted-foreground">
                  {selectedItemForDetail.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-[#E2E7FF] p-2.5 dark:border-border">
                  <span className="block text-[10px] text-[#45464D] dark:text-muted-foreground">
                    Trạng thái
                  </span>
                  <span className="mt-0.5 font-bold text-[#131B2E] dark:text-foreground">
                    {selectedItemForDetail.authority}
                  </span>
                </div>
                <div className="rounded-lg border border-[#E2E7FF] p-2.5 dark:border-border">
                  <span className="block text-[10px] text-[#45464D] dark:text-muted-foreground">
                    Ngày phê chuẩn
                  </span>
                  <span className="mt-0.5 font-bold text-[#131B2E] dark:text-foreground">
                    {selectedItemForDetail.verifiedAt}
                  </span>
                </div>
                <div className="rounded-lg border border-[#E2E7FF] p-2.5 dark:border-border">
                  <span className="block text-[10px] text-[#45464D] dark:text-muted-foreground">
                    Mã số thuế / Pháp lý
                  </span>
                  <span className="mt-0.5 font-mono font-bold text-[#131B2E] dark:text-foreground">
                    {selectedItemForDetail.taxId || "Đang cập nhật"}
                  </span>
                </div>
                <div className="rounded-lg border border-[#E2E7FF] p-2.5 dark:border-border">
                  <span className="block text-[10px] text-[#45464D] dark:text-muted-foreground">
                    Chứng thư số bảo mật
                  </span>
                  <span className="mt-0.5 truncate font-bold text-[#131B2E] dark:text-foreground">
                    {selectedItemForDetail.securityCert || "Chưa có thông tin"}
                  </span>
                </div>
              </div>

              {/* Verified Communications Channels */}
              <div className="space-y-2">
                <span className="block text-[11px] font-bold text-[#131B2E] dark:text-foreground">
                  KÊNH LIÊN HỆ ĐÃ ĐƯỢC BẢO HỘ PHÁP LÝ
                </span>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between rounded-lg bg-emerald-50/70 px-3 py-2 text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300">
                    <div className="flex items-center gap-2">
                      <PhoneCallIcon size={16} weight="bold" />
                      <span className="font-mono font-bold">
                        {selectedItemForDetail.hotline}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(selectedItemForDetail.hotline, "hotline")
                      }
                      className="inline-flex items-center gap-1 text-[11px] font-semibold hover:underline"
                    >
                      {copiedKey === "hotline" ? (
                        <>
                          <CheckIcon size={12} weight="bold" /> Đã sao chép
                        </>
                      ) : (
                        <>
                          <CopyIcon size={12} /> Sao chép
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-emerald-50/70 px-3 py-2 text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300">
                    <div className="flex items-center gap-2">
                      <GlobeIcon size={16} weight="bold" />
                      <span className="font-mono font-medium">
                        {selectedItemForDetail.website}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(selectedItemForDetail.website, "website")
                      }
                      className="inline-flex items-center gap-1 text-[11px] font-semibold hover:underline"
                    >
                      {copiedKey === "website" ? (
                        <>
                          <CheckIcon size={12} weight="bold" /> Đã sao chép
                        </>
                      ) : (
                        <>
                          <CopyIcon size={12} /> Sao chép
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-6 flex justify-end gap-2 border-t border-[#E2E7FF] pt-4 dark:border-border">
              <button
                type="button"
                onClick={() => setSelectedItemForDetail(null)}
                className="rounded-lg bg-[#131A33] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#131A33]/90 dark:bg-primary dark:text-primary-foreground"
              >
                Đóng thông tin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
