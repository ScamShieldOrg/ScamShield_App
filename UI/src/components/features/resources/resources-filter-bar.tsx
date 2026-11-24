"use client"

import type { KeyboardEvent } from "react"
import { motion } from "motion/react"
import {
  ArrowCounterClockwise,
  CaretDown,
  MagnifyingGlass,
  ShieldCheck,
  ShieldWarning,
  X,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import type {
  ResourceCategoryFilter,
  ResourceSortOrder,
  ResourceTab,
} from "./resource-helpers"

interface ResourcesFilterBarProps {
  activeTab: ResourceTab
  onTabChange: (tab: ResourceTab) => void
  searchQuery: string
  onSearchChange: (value: string) => void
  selectedCategory: ResourceCategoryFilter
  onCategoryChange: (category: ResourceCategoryFilter) => void
  sortOrder: ResourceSortOrder
  onSortOrderChange: (order: ResourceSortOrder) => void
  blacklistTotal?: number
  whitelistTotal?: number
  hasActiveFilters: boolean
  onResetFilters: () => void
}

const TABS: {
  id: ResourceTab
  label: string
  description: string
  Icon: typeof ShieldWarning
}[] = [
  {
    id: "blacklist",
    label: "Danh sách cảnh báo (Blacklist)",
    description: "Số điện thoại, tên miền & tài khoản đã xác minh rủi ro",
    Icon: ShieldWarning,
  },
  {
    id: "whitelist",
    label: "Danh bạ xác minh (Whitelist)",
    description: "Hotline, tên miền & thương hiệu chính thống",
    Icon: ShieldCheck,
  },
]

const CATEGORY_OPTIONS: { id: ResourceCategoryFilter; label: string }[] = [
  { id: "all", label: "Tất cả loại" },
  { id: "phone", label: "Số điện thoại" },
  { id: "website", label: "Website / URL" },
  { id: "bank", label: "Tài khoản ngân hàng" },
  { id: "sms", label: "SMS Brandname" },
]

export function ResourcesFilterBar({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  sortOrder,
  onSortOrderChange,
  blacklistTotal,
  whitelistTotal,
  hasActiveFilters,
  onResetFilters,
}: ResourcesFilterBarProps) {
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
    <div className="space-y-4 rounded-xl border border-black/10 bg-card p-4 shadow-[0_8px_30px_rgb(15,23,42,0.06),0_1px_2px_rgb(15,23,42,0.04)] sm:p-5 dark:border-white/10 dark:shadow-[0_16px_44px_rgb(0,0,0,0.45),inset_0_1px_0_rgb(255,255,255,0.08)]">
      {/* Top Row: Sliding Tab Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Chọn danh bạ tài nguyên"
          className="inline-grid w-full grid-cols-1 gap-1.5 rounded-xl border border-border/70 bg-muted/40 p-1 sm:inline-flex sm:w-auto"
        >
          {TABS.map((tab, index) => {
            const isActive = activeTab === tab.id
            const Icon = tab.Icon
            const count =
              tab.id === "blacklist" ? blacklistTotal : whitelistTotal

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
                  "relative inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors duration-120 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
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
                    className="absolute inset-0 rounded-lg bg-primary shadow-xs"
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-2">
                  <Icon aria-hidden="true" size={16} weight="bold" />
                  <span>{tab.label}</span>
                  {typeof count === "number" && (
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums",
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

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ArrowCounterClockwise aria-hidden="true" size={14} weight="bold" />
            <span>Đặt lại bộ lọc</span>
          </button>
        )}
      </div>

      {/* Middle Row: Search & Sort */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="relative md:col-span-8">
          <label htmlFor="resources-search-input" className="sr-only">
            Tìm kiếm trong danh bạ tài nguyên
          </label>
          <MagnifyingGlass
            aria-hidden="true"
            size={18}
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
                ? "Nhập số điện thoại, đường dẫn, số tài khoản cần tra cứu..."
                : "Nhập tên ngân hàng, doanh nghiệp, hotline hoặc tên miền chính thức..."
            }
            className="min-h-10 w-full rounded-lg border border-black/10 bg-background py-2 pr-10 pl-10 text-sm text-foreground placeholder:text-muted-foreground/80 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/12 dark:bg-background/60"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Xóa từ khóa tìm kiếm"
              className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <X aria-hidden="true" size={15} weight="bold" />
            </button>
          )}
        </div>

        <div className="relative md:col-span-4">
          <label htmlFor="resources-sort-select" className="sr-only">
            Sắp xếp danh sách
          </label>
          <select
            id="resources-sort-select"
            value={sortOrder}
            onChange={(e) =>
              onSortOrderChange(e.target.value as ResourceSortOrder)
            }
            className="min-h-10 w-full cursor-pointer appearance-none rounded-lg border border-black/10 bg-background py-2 pr-9 pl-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/12 dark:bg-background/60"
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
      </div>

      {/* Category Filter Pills (Blacklist only) */}
      {activeTab === "blacklist" && (
        <div
          role="group"
          aria-label="Lọc theo loại tài nguyên"
          className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-3"
        >
          {CATEGORY_OPTIONS.map((option) => {
            const isSelected = selectedCategory === option.id
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onCategoryChange(option.id)}
                className={cn(
                  "inline-flex min-h-9 cursor-pointer items-center rounded-md border px-3 text-xs font-semibold transition-colors duration-120 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                    : "border-black/10 bg-background text-foreground/85 hover:bg-muted dark:border-white/10"
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
