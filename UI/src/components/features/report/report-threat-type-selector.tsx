"use client"

import { Bank, CheckCircle, Circle, Globe, Phone } from "@phosphor-icons/react"
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
        label: "Số điện thoại",
        subLabel: "Cuộc gọi hoặc tin nhắn",
        icon: Phone,
      },
      {
        type: "WEBSITE",
        label: "Website",
        subLabel: "Trang giả mạo hoặc đường dẫn lừa đảo",
        icon: Globe,
      },
      {
        type: "BANK_ACCOUNT",
        label: "Tài khoản ngân hàng",
        subLabel: "Số tài khoản nhận tiền",
        icon: Bank,
      },
    ]

  return (
    <div
      role="group"
      aria-label="Loại đối tượng báo cáo"
      aria-describedby={invalid ? "report-threat-type-error" : undefined}
      className="grid grid-cols-1 gap-2.5 md:grid-cols-3"
    >
      {options.map((option) => {
        const Icon = option.icon
        const isSelected = selectedType === option.type
        const SelectionIcon = isSelected ? CheckCircle : Circle

        return (
          <button
            key={option.type}
            type="button"
            aria-pressed={isSelected}
            data-invalid={invalid || undefined}
            onClick={() => onSelect(option.type)}
            className={cn(
              "flex min-h-16 min-w-0 cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none md:min-h-28 md:flex-wrap md:items-start md:content-start xl:flex-nowrap xl:items-center data-[invalid=true]:border-destructive",
              isSelected
                ? "border-sky-600 bg-sky-50 ring-1 ring-sky-600/30 dark:border-sky-500 dark:bg-sky-950/60 dark:ring-sky-500/30"
                : "border-input bg-background enabled:hover:border-ring/50 enabled:hover:bg-muted/40"
            )}
          >
            <div
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-lg transition-colors motion-reduce:transition-none",
                isSelected
                  ? "bg-sky-700 text-white dark:bg-sky-300 dark:text-sky-950"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Icon size={20} aria-hidden="true" />
            </div>

            <div className="min-w-0 flex-1 md:order-3 md:basis-full xl:order-none xl:basis-auto">
              <p className="text-sm leading-snug font-semibold text-foreground">
                {option.label}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {option.subLabel}
              </p>
            </div>
            <SelectionIcon
              size={18}
              weight={isSelected ? "fill" : "regular"}
              aria-hidden="true"
              className={cn("ml-auto shrink-0", isSelected ? "text-sky-700 dark:text-sky-300" : "text-muted-foreground")}
            />
          </button>
        )
      })}
    </div>
  )
}
