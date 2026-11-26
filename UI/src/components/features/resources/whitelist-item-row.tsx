"use client"

import {
  Buildings,
  CalendarBlank,
  Check,
  Copy,
  Eye,
  Globe,
  PhoneCall,
  ShieldCheck,
} from "@phosphor-icons/react"
import type { WhitelistViewItem } from "./resource-helpers"
import { ExpandableIconButton } from "@/components/shared/expandable-icon-action"

interface WhitelistItemRowProps {
  item: WhitelistViewItem
  copiedKey: string | null
  onCopy: (text: string, key: string) => void
  onSelectDetail: (item: WhitelistViewItem) => void
}

export function WhitelistItemRow({
  item,
  copiedKey,
  onCopy,
  onSelectDetail,
}: WhitelistItemRowProps) {
  const hotlineCopyKey = `${item.id}-hotline`
  const websiteCopyKey = `${item.id}-website`

  return (
    <li className="flex flex-col justify-between gap-4 p-4 transition-colors hover:bg-muted/30 sm:p-5 lg:flex-row lg:items-center">
      <div className="flex min-w-0 items-start gap-3.5">
        <div
          className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200"
          aria-hidden="true"
        >
          <Buildings size={20} weight="duotone" />
        </div>

        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-base font-bold tracking-[-0.015em] text-foreground">
              {item.name}
            </h3>

            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
              <ShieldCheck aria-hidden="true" size={13} weight="fill" />
              <span>Đã xác minh</span>
            </span>

            <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {item.categoryLabel}
            </span>
          </div>

          <p className="max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
            {item.description}
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {item.hotline !== "Chưa cập nhật" && (
              <button
                type="button"
                onClick={() => onCopy(item.hotline, hotlineCopyKey)}
                className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                title="Bấm để sao chép hotline"
              >
                <PhoneCall
                  aria-hidden="true"
                  size={14}
                  weight="bold"
                  className="text-emerald-700 dark:text-emerald-400"
                />
                <span className="font-mono whitespace-nowrap tabular-nums">
                  {item.hotline}
                </span>
                {copiedKey === hotlineCopyKey ? (
                  <Check
                    aria-hidden="true"
                    size={13}
                    weight="bold"
                    className="text-emerald-700 dark:text-emerald-400"
                  />
                ) : (
                  <Copy
                    aria-hidden="true"
                    size={13}
                    className="text-muted-foreground"
                  />
                )}
              </button>
            )}

            {item.website !== "Chưa cập nhật" && (
              <button
                type="button"
                onClick={() => onCopy(item.website, websiteCopyKey)}
                className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                title="Bấm để sao chép tên miền"
              >
                <Globe
                  aria-hidden="true"
                  size={14}
                  weight="bold"
                  className="text-sky-700 dark:text-sky-400"
                />
                <span className="font-mono break-all">{item.website}</span>
                {copiedKey === websiteCopyKey ? (
                  <Check
                    aria-hidden="true"
                    size={13}
                    weight="bold"
                    className="text-emerald-700 dark:text-emerald-400"
                  />
                ) : (
                  <Copy
                    aria-hidden="true"
                    size={13}
                    className="text-muted-foreground"
                  />
                )}
              </button>
            )}

            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
              <CalendarBlank aria-hidden="true" size={14} weight="bold" />
              <span>Xác minh: {item.verifiedAt}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center lg:justify-end">
        <ExpandableIconButton
          onClick={() => onSelectDetail(item)}
          icon={<Eye aria-hidden="true" size={16} weight="bold" />}
          label="Hồ sơ xác minh"
          variant="outline"
        />
      </div>
    </li>
  )
}
