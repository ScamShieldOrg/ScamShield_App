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
      label: "Tài khoản ngân hàng (STK)",
      subLabel: "STK thụ hưởng nhận tiền",
      icon: Bank,
    },
  ]

  return (
    <div
      role="group"
      aria-label="Loại đe dọa"
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
              "flex cursor-pointer items-center gap-3.5 rounded-xl border p-3.5 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[invalid=true]:border-destructive",
              isSelected
                ? "border-[#0B132B] bg-[#E2E7FF]/50 ring-1 ring-[#0B132B]/30 dark:border-primary dark:bg-primary/10 dark:ring-primary/40"
                : "border-[#C6C6CE]/50 bg-white hover:bg-[#FAF8FF] dark:border-border dark:bg-card dark:hover:bg-muted/40"
            )}
          >
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                isSelected
                  ? "bg-[#0B132B] text-white dark:bg-primary dark:text-primary-foreground"
                  : "bg-[#F2F3FF] text-[#45464D] dark:bg-muted dark:text-muted-foreground"
              )}
            >
              <Icon size={20} weight={isSelected ? "fill" : "regular"} />
            </div>

            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-[#131B2E] dark:text-foreground">
                {option.label}
              </p>
              <p className="truncate text-[11px] text-[#45464D] dark:text-muted-foreground">
                {option.subLabel}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
