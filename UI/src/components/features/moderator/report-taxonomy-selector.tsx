"use client"

import { Tag } from "@phosphor-icons/react"
import { MODERATOR_TAXONOMY_TAGS } from "@/features/moderator/types/moderator.types"
import { cn } from "@/lib/utils"

interface ReportTaxonomySelectorProps {
  selectedTags: string[]
  onToggleTag: (tag: string) => void
}

export function ReportTaxonomySelector({
  selectedTags,
  onToggleTag,
}: ReportTaxonomySelectorProps) {
  return (
    <div className="rounded-xl border border-black/10 bg-card p-5 shadow-[0_8px_30px_rgb(15,23,42,0.06),0_1px_2px_rgb(15,23,42,0.04)] dark:border-white/10 dark:shadow-[0_16px_44px_rgb(0,0,0,0.45),inset_0_1px_0_rgb(255,255,255,0.08)]">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Tag aria-hidden="true" size={15} weight="bold" />
        <span>Gắn nhãn phân loại lừa đảo (Taxonomy)</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {MODERATOR_TAXONOMY_TAGS.map((tag) => {
          const isSelected = selectedTags.includes(tag)
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggleTag(tag)}
              className={cn(
                "inline-flex min-h-9 cursor-pointer items-center rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                isSelected
                  ? "border-sky-500/30 bg-sky-500/15 text-sky-900 dark:border-sky-400/30 dark:bg-sky-500/20 dark:text-sky-200"
                  : "border-black/10 bg-background text-foreground hover:bg-muted/60 dark:border-white/10"
              )}
            >
              {tag}
            </button>
          )
        })}
      </div>
    </div>
  )
}
