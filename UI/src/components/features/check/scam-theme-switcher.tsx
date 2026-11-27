"use client"

import { useEffect, useId, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { CaretUpDown, Check, Palette } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import {
  SCAM_CHECK_THEMES,
  SCAM_CHECK_THEME_ORDER,
  useScamCheckTheme,
  type ScamCheckThemeId,
} from "./scam-check-theme"

interface ScamThemePickerProps {
  variant?: "sidebar-expanded" | "sidebar-collapsed" | "header-compact"
  className?: string
}

export function ScamThemePicker({
  variant = "sidebar-expanded",
  className,
}: ScamThemePickerProps) {
  const { themeId, theme, selectTheme } = useScamCheckTheme()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  const handleSelect = (next: ScamCheckThemeId) => {
    selectTheme(next)
    setOpen(false)
    buttonRef.current?.focus()
  }

  const opensUpward =
    variant === "sidebar-expanded" || variant === "sidebar-collapsed"

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {variant === "sidebar-expanded" && (
        <button
          ref={buttonRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-full border border-border/80 bg-muted/40 px-3 text-xs font-medium text-foreground transition-colors duration-120 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className={cn(
                "size-2.5 shrink-0 rounded-full ring-2 ring-black/10 dark:ring-white/20",
                theme.swatch
              )}
            />
            <span className="truncate font-semibold">{theme.shortLabel}</span>
          </span>
          <CaretUpDown
            aria-hidden="true"
            size={14}
            weight="bold"
            className="shrink-0 text-muted-foreground"
          />
        </button>
      )}

      {variant === "sidebar-collapsed" && (
        <button
          ref={buttonRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={`Chọn bảng màu (${theme.shortLabel})`}
          title={`Bảng màu: ${theme.shortLabel}`}
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full border border-border/80 bg-muted/40 text-muted-foreground transition-colors duration-120 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/10"
        >
          <span
            aria-hidden="true"
            className={cn(
              "size-3.5 rounded-full ring-2 ring-black/10 dark:ring-white/25",
              theme.swatch
            )}
          />
        </button>
      )}

      {variant === "header-compact" && (
        <button
          ref={buttonRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={`Chọn bảng màu (${theme.shortLabel})`}
          title={`Bảng màu: ${theme.shortLabel}`}
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-black/10 bg-card px-3 text-xs font-semibold text-foreground shadow-2xs transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/12"
        >
          <span
            aria-hidden="true"
            className={cn(
              "size-2.5 shrink-0 rounded-full ring-1 ring-black/15 dark:ring-white/25",
              theme.swatch
            )}
          />
          <Palette
            aria-hidden="true"
            size={15}
            weight="bold"
            className="text-muted-foreground sm:hidden"
          />
          <span className="hidden whitespace-nowrap sm:inline">
            {theme.shortLabel}
          </span>
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            role="listbox"
            aria-label="Chọn bảng màu Anti-Scam"
            initial={{ opacity: 0, y: opensUpward ? 6 : -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: opensUpward ? 4 : -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "absolute z-50 w-60 overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl dark:border-white/12",
              variant === "sidebar-expanded" && "bottom-full left-0 mb-2 w-full",
              variant === "sidebar-collapsed" && "bottom-0 left-full ml-2.5",
              variant === "header-compact" && "top-full right-0 mt-2"
            )}
          >
            <p className="px-2.5 pt-1 pb-1.5 text-xs font-medium text-muted-foreground">
              Bảng màu chống lừa đảo
            </p>
            <div className="space-y-0.5">
              {SCAM_CHECK_THEME_ORDER.map((id) => {
                const item = SCAM_CHECK_THEMES[id]
                const selected = id === themeId
                return (
                  <button
                    key={id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => handleSelect(id)}
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors duration-120 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring",
                      selected && "bg-muted/80"
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-3 shrink-0 rounded-full ring-2 ring-black/10 dark:ring-white/20",
                          item.swatch
                        )}
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-foreground">
                          {item.shortLabel}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      </span>
                    </span>
                    {selected && (
                      <Check
                        aria-hidden="true"
                        size={14}
                        weight="bold"
                        className="shrink-0 text-foreground"
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
