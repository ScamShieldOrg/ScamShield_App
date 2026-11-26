"use client"

import type { KeyboardEvent } from "react"
import { motion } from "motion/react"
import {
  ArrowCounterClockwise,
  ArrowsDownUp,
  Bank,
  Broadcast,
  CaretDown,
  Globe,
  MagnifyingGlass,
  PhoneCall,
  ShieldCheck,
  ShieldWarning,
  SquaresFour,
  X,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { ExpandableIconButton } from "@/components/shared/expandable-icon-action"
import type {
  ResourceCategoryFilter,
  ResourceSortOrder,
  ResourceTab,
} from "./resource-helpers"

const TABS: {
  id: ResourceTab
  label: string
  Icon: typeof ShieldWarning
}[] = [
  {
    id: "blacklist",
    label: "Danh sách đen",
    Icon: ShieldWarning,
  },
  {
    id: "whitelist",
    label: "Đã xác minh",
    Icon: ShieldCheck,
  },
]

const CATEGORY_OPTIONS: {
  id: ResourceCategoryFilter
  label: string
}[] = [
  { id: "all", label: "Tất cả loại" },
  { id: "phone", label: "Số điện thoại" },
  { id: "website", label: "Website / URL" },
  { id: "bank", label: "Tài khoản ngân hàng" },
  { id: "sms", label: "SMS Brandname" },
]

function SelectedCategoryIcon({
  category,
}: {
  category: ResourceCategoryFilter
}) {
  const props = {
    "aria-hidden": true as const,
    size: 16,
    weight: "bold" as const,
    className:
      "pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground",
  }
  switch (category) {
    case "phone":
      return <PhoneCall {...props} />
    case "website":
      return <Globe {...props} />
    case "bank":
      return <Bank {...props} />
    case "sms":
      return <Broadcast {...props} />
    case "all":
    default:
      return <SquaresFour {...props} />
  }
}

interface ResourcesTabSwitcherProps {
  activeTab: ResourceTab
  onTabChange: (tab: ResourceTab) => void
  blacklistTotal?: number
  whitelistTotal?: number
}

export function ResourcesTabSwitcher({
  activeTab,
  onTabChange,
  blacklistTotal,
  whitelistTotal,
}: ResourcesTabSwitcherProps) {
  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return
    event.preventDefault()
    const nextIndex = (index + 1) % TABS.length
    onTabChange(TABS[nextIndex].id)
    const buttons =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]'
      )
    buttons?.[nextIndex]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label="Chọn danh bạ tài nguyên"
      className="inline-grid w-full shrink-0 grid-cols-2 gap-1 rounded-full border border-black/10 bg-muted/50 p-1 sm:inline-flex sm:w-auto dark:border-white/10"
    >
      {TABS.map((tab, index) => {
        const isActive = activeTab === tab.id
        const Icon = tab.Icon
        const count = tab.id === "blacklist" ? blacklistTotal : whitelistTotal

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(e) => handleTabKeyDown(e, index)}
            className={cn(
              "relative inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors duration-120 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              isActive
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isActive && (
              <motion.span
                layoutId="resources-active-tab"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-primary shadow-xs"
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              <Icon aria-hidden="true" size={15} weight="bold" />
              <span>{tab.label}</span>
              {typeof count === "number" && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                    isActive
                      ? "bg-primary-foreground/15 text-primary-foreground"
                      : "bg-background/80 text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

interface ResourcesFilterBarProps {
  activeTab: ResourceTab
  searchQuery: string
  onSearchChange: (value: string) => void
  selectedCategory: ResourceCategoryFilter
  onCategoryChange: (category: ResourceCategoryFilter) => void
  sortOrder: ResourceSortOrder
  onSortOrderChange: (order: ResourceSortOrder) => void
  hasActiveFilters: boolean
  onResetFilters: () => void
}

export function ResourcesFilterBar({
  activeTab,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  sortOrder,
  onSortOrderChange,
  hasActiveFilters,
  onResetFilters,
}: ResourcesFilterBarProps) {
  return (
    <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
      {/* Search Input */}
      <div className="relative min-w-0 flex-1">
        <label htmlFor="resources-search-input" className="sr-only">
          Tìm kiếm trong danh bạ tài nguyên
        </label>
        <MagnifyingGlass
          aria-hidden="true"
          size={17}
          weight="bold"
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id="resources-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && searchQuery) {
              e.preventDefault()
              onSearchChange("")
            }
          }}
          placeholder={
            activeTab === "blacklist"
              ? "Tìm số điện thoại, đường dẫn, tài khoản ngân hàng..."
              : "Tìm ngân hàng, doanh nghiệp, hotline hoặc tên miền chính thức..."
          }
          className="min-h-10 w-full rounded-lg border border-black/10 bg-card py-2 pr-9 pl-10 text-sm text-foreground shadow-2xs placeholder:text-muted-foreground/80 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/10"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Xóa từ khóa tìm kiếm"
            className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <X aria-hidden="true" size={14} weight="bold" />
          </button>
        )}
      </div>

      {/* Category Select (Blacklist only) + Sort Select + Reset */}
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
        {activeTab === "blacklist" && (
          <div className="relative min-w-0 flex-1 sm:w-48 sm:flex-none">
            <label htmlFor="resources-category-select" className="sr-only">
              Lọc theo loại tài nguyên
            </label>
            <SelectedCategoryIcon category={selectedCategory} />
            <select
              id="resources-category-select"
              value={selectedCategory}
              onChange={(e) =>
                onCategoryChange(e.target.value as ResourceCategoryFilter)
              }
              className="min-h-10 w-full cursor-pointer appearance-none rounded-lg border border-black/10 bg-card py-2 pr-9 pl-10 text-sm font-medium text-foreground shadow-2xs transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/10"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <CaretDown
              aria-hidden="true"
              size={14}
              weight="bold"
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
            />
          </div>
        )}

        <div className="relative min-w-0 flex-1 sm:w-52 sm:flex-none">
          <label htmlFor="resources-sort-select" className="sr-only">
            Sắp xếp danh sách
          </label>
          <ArrowsDownUp
            aria-hidden="true"
            size={15}
            weight="bold"
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <select
            id="resources-sort-select"
            value={sortOrder}
            onChange={(e) =>
              onSortOrderChange(e.target.value as ResourceSortOrder)
            }
            className="min-h-10 w-full cursor-pointer appearance-none rounded-lg border border-black/10 bg-card py-2 pr-9 pl-10 text-sm font-medium text-foreground shadow-2xs transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/10"
          >
            <option value="newest">Mới cập nhật nhất</option>
            <option value="name">Theo tên / giá trị (A–Z)</option>
            {activeTab === "blacklist" && (
              <option value="reports">Lượt cảnh báo nhiều nhất</option>
            )}
          </select>
          <CaretDown
            aria-hidden="true"
            size={14}
            weight="bold"
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
          />
        </div>

        {hasActiveFilters && (
          <ExpandableIconButton
            onClick={onResetFilters}
            icon={
              <ArrowCounterClockwise
                aria-hidden="true"
                size={16}
                weight="bold"
              />
            }
            label="Đặt lại bộ lọc"
            variant="outline"
          />
        )}
      </div>
    </div>
  )
}
