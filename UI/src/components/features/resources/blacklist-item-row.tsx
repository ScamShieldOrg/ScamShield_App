"use client"

import Link from "next/link"
import {
  ArrowRight,
  Broadcast,
  CalendarBlank,
  CreditCard,
  Eye,
  GlobeSimpleX,
  PhoneSlash,
  ShieldSlash,
} from "@phosphor-icons/react"
import type { BlackItem } from "@/types/resource"
import { cn } from "@/lib/utils"
import {
  formatResourceDate,
  getResourceTypeMeta,
  getSeverityMeta,
  type ResourceTypeMeta,
} from "./resource-helpers"

interface BlacklistItemRowProps {
  item: BlackItem
  checkHref: string
  onSelectDetail: (item: BlackItem) => void
}

function ResourceTypeIcon({
  iconKey,
}: {
  iconKey: ResourceTypeMeta["iconKey"]
}) {
  const props = { size: 20, weight: "duotone" as const, "aria-hidden": true }
  switch (iconKey) {
    case "url":
      return <GlobeSimpleX {...props} />
    case "phone":
      return <PhoneSlash {...props} />
    case "bank":
      return <CreditCard {...props} />
    case "sms":
      return <Broadcast {...props} />
    case "other":
    default:
      return <ShieldSlash {...props} />
  }
}

export function BlacklistItemRow({
  item,
  checkHref,
  onSelectDetail,
}: BlacklistItemRowProps) {
  const typeMeta = getResourceTypeMeta(item.resourceType)
  const severityMeta = getSeverityMeta(item.severity, item.severityLabel)

  return (
    <li className="flex flex-col justify-between gap-4 p-4 transition-colors hover:bg-muted/30 sm:p-5 lg:flex-row lg:items-center">
      <div className="flex min-w-0 items-start gap-3.5">
        <div
          className={cn(
            "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg border",
            typeMeta.surfaceClass
          )}
          title={typeMeta.label}
        >
          <ResourceTypeIcon iconKey={typeMeta.iconKey} />
        </div>

        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold break-all text-foreground sm:text-base">
              {item.title}
            </span>

            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold",
                severityMeta.badgeClass
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  severityMeta.dotClass
                )}
              />
              <span>{severityMeta.label}</span>
            </span>

            <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {typeMeta.label}
            </span>
          </div>

          {item.description && (
            <p className="max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <Eye aria-hidden="true" size={14} weight="bold" />
              <strong className="font-semibold text-foreground">
                {(item.warningCount ?? 0).toLocaleString("vi-VN")}
              </strong>{" "}
              lượt cảnh báo
            </span>

            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <CalendarBlank aria-hidden="true" size={14} weight="bold" />
              <span>
                Cập nhật: {formatResourceDate(item.updatedAt || item.confirmedAt)}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
        <button
          type="button"
          onClick={() => onSelectDetail(item)}
          className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-black/10 bg-background px-3.5 text-xs font-semibold text-foreground shadow-2xs transition-colors hover:bg-muted active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/12"
        >
          <span>Chi tiết hồ sơ</span>
          <ArrowRight aria-hidden="true" size={14} weight="bold" />
        </button>

        <Link
          href={checkHref}
          className="inline-flex min-h-10 items-center rounded-lg px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Kiểm tra AI
        </Link>
      </div>
    </li>
  )
}
