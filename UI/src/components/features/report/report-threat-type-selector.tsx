"use client"

import { Phone, Globe, Bank } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { ReportThreatType } from "@/features/report/types/report.types"

interface ReportThreatTypeSelectorProps {
  selectedType: ReportThreatType | null
  onSelect: (type: ReportThreatType) => void
  invalid?: boolean
}

export function ReportThreatTypeSelector({
  selectedType,
  onSelect,
  invalid = false,
}: ReportThreatTypeSelectorProps) {
  const options: {
    type: ReportThreatType
    label: string
    subLabel: string
    icon: typeof Phone
  }[] = [
    {
      type: "PHONE",
      label: "Số điện thoại / Hotline",
      subLabel: "Cuộc gọi, SMS đe dọa",
      icon: Phone,
    },
    {
      type: "WEBSITE",
      label: "Website / Link giả",
      subLabel: "Trang mạo danh, phishing",
      icon: Globe,
    },
    {
      type: "BANK_ACCOUNT",
      label: "Tài khoản ngân hàng",
      subLabel: "STK thụ hưởng nhận tiền",
      icon: Bank,
    },
  ]

  return (
    <div
      role="group"
      aria-label="Loại đối tượng báo cáo"
      aria-describedby={invalid ? "report-threat-type-error" : undefined}
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
    >
      {options.map((option) => {
        const Icon = option.icon
        const isSelected = selectedType === option.type

        return (
          <button
            key={option.type}
            type="button"
            aria-pressed={isSelected}
            data-invalid={invalid || undefined}
            onClick={() => onSelect(option.type)}
            className={cn(
              "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-left transition-[background-color,border-color,transform] duration-120 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[invalid=true]:border-rose-500/60",
              isSelected
                ? "border-primary bg-primary/10 ring-1 ring-primary/25 dark:bg-primary/15"
                : "border-black/10 bg-background hover:bg-muted/50 dark:border-white/10"
            )}
          >
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Icon
                aria-hidden="true"
                size={20}
                weight={isSelected ? "fill" : "regular"}
              />
            </div>

            <div className="min-w-0 space-y-0.5">
              <p className="truncate text-sm font-semibold text-foreground">
                {option.label}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {option.subLabel}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
