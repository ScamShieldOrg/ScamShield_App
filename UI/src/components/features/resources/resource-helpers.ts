import type { BlackItem, WhitelistResource } from "@/types/resource"

export type ResourceTab = "blacklist" | "whitelist"
export type ResourceCategoryFilter = "all" | "phone" | "website" | "bank" | "sms"
export type ResourceSortOrder = "newest" | "name" | "reports"
export type ResourcePaginationToken = number | "ellipsis"

export interface WhitelistViewItem {
  id: string
  rawId: number
  name: string
  category: Exclude<ResourceCategoryFilter, "all">
  categoryLabel: string
  description: string
  authority: string
  hotline: string
  website: string
  identifierLabel: string
  identifierValue: string
  verifiedAt: string
  taxId?: string
  legalRepresentative?: string
  verificationReason?: string
}

export interface ResourceTypeMeta {
  iconKey: "url" | "phone" | "bank" | "sms" | "other"
  label: string
  surfaceClass: string
}

export interface SeverityMeta {
  label: string
  dotClass: string
  badgeClass: string
}

export function formatResourceDate(isoString?: string | null): string {
  if (!isoString) return "Chưa cập nhật"
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return isoString
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function toWhitelistViewItem(
  resource: WhitelistResource
): WhitelistViewItem {
  const partnerType = resource.partnerType?.trim()
  const primaryType =
    resource.verifiedIndicators?.[0]?.resourceType?.toUpperCase()
  const category: WhitelistViewItem["category"] =
    primaryType === "PHONE"
      ? "phone"
      : primaryType === "BANK_ACCOUNT"
        ? "bank"
        : primaryType === "SMS"
          ? "sms"
          : "website"

  const identifier =
    resource.smsBrandNames?.[0] ||
    resource.verifiedIndicators?.[0]?.value ||
    resource.brandName ||
    resource.name

  return {
    id: `WL-${resource.id}`,
    rawId: resource.id,
    name: resource.name,
    category,
    categoryLabel:
      partnerType === "BUSINESS"
        ? "Doanh nghiệp"
        : partnerType || "Đơn vị đã xác minh",
    description:
      resource.brandName && resource.brandName !== resource.name
        ? `Thương hiệu: ${resource.brandName}`
        : "Đơn vị chính thức đã được xác minh",
    authority: "Đối tác đã xác minh",
    hotline: resource.officialHotlines?.join(" / ") || "Chưa cập nhật",
    website: resource.officialDomains?.join(" / ") || "Chưa cập nhật",
    identifierLabel: resource.smsBrandNames?.length
      ? "SMS Brandname"
      : "Định danh đã xác minh",
    identifierValue: identifier,
    verifiedAt: formatResourceDate(resource.verifiedAt),
    taxId: resource.taxId ?? undefined,
    legalRepresentative: resource.legalRepresentative ?? undefined,
    verificationReason: resource.verificationReason ?? undefined,
  }
}

export function categoryFilterToResourceType(
  category: ResourceCategoryFilter
): string | undefined {
  switch (category) {
    case "phone":
      return "PHONE"
    case "website":
      return "URL"
    case "bank":
      return "BANK_ACCOUNT"
    case "sms":
      return "SMS"
    case "all":
    default:
      return undefined
  }
}

export function getResourceTypeMeta(
  resourceType?: string | null
): ResourceTypeMeta {
  switch ((resourceType || "").toUpperCase()) {
    case "URL":
    case "WEBSITE":
      return {
        iconKey: "url",
        label: "Website / URL",
        surfaceClass:
          "border-amber-500/20 bg-amber-500/10 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200",
      }
    case "PHONE":
      return {
        iconKey: "phone",
        label: "Số điện thoại",
        surfaceClass:
          "border-rose-500/20 bg-rose-500/10 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200",
      }
    case "BANK_ACCOUNT":
    case "BANK":
      return {
        iconKey: "bank",
        label: "Tài khoản ngân hàng",
        surfaceClass:
          "border-border bg-muted/60 text-foreground dark:border-white/10 dark:bg-muted/40",
      }
    case "SMS":
      return {
        iconKey: "sms",
        label: "SMS Brandname",
        surfaceClass:
          "border-sky-500/20 bg-sky-500/10 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200",
      }
    default:
      return {
        iconKey: "other",
        label: resourceType || "Tài nguyên",
        surfaceClass:
          "border-border bg-muted/60 text-foreground dark:border-white/10 dark:bg-muted/40",
      }
  }
}

/**
 * Calm Authority severity tokens (WCAG AA >= 4.5:1, no solid loud red badges).
 */
export function getSeverityMeta(
  severity?: string | null,
  severityLabel?: string | null
): SeverityMeta {
  const normalized = (severity || "").toUpperCase()
  const label = severityLabel?.trim() || severity || "Cảnh báo"

  if (
    normalized === "CRITICAL" ||
    normalized === "URGENT" ||
    normalized === "HIGH"
  ) {
    return {
      label,
      dotClass: "bg-rose-600 dark:bg-rose-400",
      badgeClass:
        "border-rose-500/25 bg-rose-500/10 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200",
    }
  }

  if (normalized === "MEDIUM" || normalized === "WARNING") {
    return {
      label,
      dotClass: "bg-amber-600 dark:bg-amber-400",
      badgeClass:
        "border-amber-500/25 bg-amber-500/10 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200",
    }
  }

  return {
    label,
    dotClass: "bg-sky-600 dark:bg-sky-400",
    badgeClass:
      "border-sky-500/25 bg-sky-500/10 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200",
  }
}

export function sortBlacklistItems(
  items: BlackItem[],
  sortOrder: ResourceSortOrder
): BlackItem[] {
  const list = [...items]
  if (sortOrder === "name") {
    list.sort((a, b) => (a.title || "").localeCompare(b.title || "", "vi"))
  } else if (sortOrder === "reports") {
    list.sort((a, b) => (b.warningCount ?? 0) - (a.warningCount ?? 0))
  }
  return list
}

export function buildResourcePagination(
  currentPage: number,
  totalPages: number
): ResourcePaginationToken[] {
  const safeTotal = Math.max(1, Math.floor(totalPages))
  const safeCurrent = Math.min(Math.max(1, Math.floor(currentPage)), safeTotal)

  if (safeTotal <= 7) {
    return Array.from({ length: safeTotal }, (_, index) => index + 1)
  }

  const tokens: ResourcePaginationToken[] = [1]
  const start = Math.max(2, safeCurrent - 1)
  const end = Math.min(safeTotal - 1, safeCurrent + 1)

  if (start > 2) tokens.push("ellipsis")
  for (let page = start; page <= end; page += 1) {
    tokens.push(page)
  }
  if (end < safeTotal - 1) tokens.push("ellipsis")
  tokens.push(safeTotal)

  return tokens
}

export function isAbortOrCancelError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const err = error as { name?: string; code?: string }
  return (
    err.name === "CanceledError" ||
    err.name === "AbortError" ||
    err.code === "ERR_CANCELED"
  )
}

export function extractResourceErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (error && typeof error === "object") {
    const axiosLike = error as {
      response?: { data?: { message?: string } }
      message?: string
    }
    const serverMessage = axiosLike.response?.data?.message
    if (typeof serverMessage === "string" && serverMessage.trim()) {
      return serverMessage.trim()
    }
    if (error instanceof Error && error.message.trim()) {
      return error.message.trim()
    }
  }
  return fallback
}
