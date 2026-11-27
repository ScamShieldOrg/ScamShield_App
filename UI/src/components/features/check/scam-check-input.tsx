"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  ArrowCounterClockwise,
  ArrowUp,
  Bank,
  CaretDown,
  ChatText,
  Check,
  CircleNotch,
  ClipboardText,
  Info,
  Link as LinkIcon,
  Phone,
  Sparkle,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import type { CheckType } from "@/features/check/types/check.types"
import {
  CHECK_TAB_META,
  CHECK_TAB_ORDER,
  QUICK_SCENARIOS,
  countMessageEntities,
  getInlineFormatError,
  inferCheckTypeFromContent,
  type QuickScenario,
} from "./scam-input-helpers"
import { ScamQuotaBadge, type QuotaSnapshot } from "./scam-quota-strip"
import {
  SCAM_CHECK_THEMES,
  type ScamCheckThemeConfig,
} from "./scam-check-theme"

export interface ScamCheckInputProps {
  /** Effective check type (auto-detected by default, or manually pinned). */
  activeTab: CheckType
  onTabChange: (type: CheckType) => void
  /** Per-tab drafts preserved by parent hook. */
  drafts: Record<CheckType, string>
  onDraftChange: (type: CheckType, value: string) => void
  onAnalyze: (content: string, type: CheckType) => void
  isLoading?: boolean
  /** Blocks submitting and explains why when the daily quota is used up. */
  quotaExhausted?: boolean
  /** Increment to smoothly scroll to and focus the composer input. */
  focusSignal?: number
  /** Compact inline quota indicator inside the composer footer. */
  quota?: QuotaSnapshot | null
  quotaLoading?: boolean
  quotaError?: string | null
  onRefreshQuota?: () => void
  /** Shows compact 1-click starter pills beneath the composer when idle. */
  showStarterChips?: boolean
  /** Compact sticky-dock appearance when anchored beneath an active result. */
  compact?: boolean
  /** Active Anti-Scam theme tokens for bezel, CTA, and starter pills. */
  theme?: ScamCheckThemeConfig
}

const TAB_ICONS: Record<CheckType, typeof ChatText> = {
  TEXT: ChatText,
  URL: LinkIcon,
  PHONE: Phone,
  BANK_ACCOUNT: Bank,
}

const MODE_DESCRIPTIONS: Record<CheckType, string> = {
  TEXT: "Phân tích ngữ cảnh SMS, Zalo, email bằng AI",
  URL: "Kiểm tra tên miền giả mạo & liên kết độc hại",
  PHONE: "Tra cứu số di động & tổng đài trong danh bạ",
  BANK_ACCOUNT: "Đối chiếu số tài khoản trong danh sách cảnh báo",
}

const UNDO_TIMEOUT_MS = 7000

export function ScamCheckInput({
  activeTab,
  onTabChange,
  drafts,
  onDraftChange,
  onAnalyze,
  isLoading = false,
  quotaExhausted = false,
  focusSignal = 0,
  quota = null,
  quotaLoading = false,
  quotaError = null,
  onRefreshQuota,
  showStarterChips = true,
  compact = false,
  theme = SCAM_CHECK_THEMES["shield-emerald"],
}: ScamCheckInputProps) {
  const fieldId = useId()
  const errorId = useId()
  const noteId = useId()
  const menuId = useId()

  const formRef = useRef<HTMLFormElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const modeButtonRef = useRef<HTMLButtonElement>(null)
  const menuContainerRef = useRef<HTMLDivElement>(null)

  // Auto-detect mode is active by default so users can paste anything freely.
  const [manualModePinned, setManualModePinned] = useState(false)
  const [modeMenuOpen, setModeMenuOpen] = useState(false)
  const [clipboardError, setClipboardError] = useState<string | null>(null)
  const [showInlineValidation, setShowInlineValidation] = useState(false)
  const [undoSnapshot, setUndoSnapshot] = useState<{
    tab: CheckType
    value: string
  } | null>(null)

  const content = drafts[activeTab] ?? ""
  const trimmedContent = content.trim()
  const tabMeta = CHECK_TAB_META[activeTab]
  const ActiveIcon = TAB_ICONS[activeTab]

  // Auto-resize textarea cleanly like Claude Web (compact dock: 42-140px, hero: 72-220px)
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    const minHeight = compact ? 42 : 72
    const maxHeight = compact ? 140 : 220
    const nextHeight = Math.min(maxHeight, Math.max(minHeight, el.scrollHeight))
    el.style.height = `${nextHeight}px`
  }, [content, activeTab, compact])

  // Auto-expire Undo bar
  useEffect(() => {
    if (!undoSnapshot) return
    const timer = window.setTimeout(() => setUndoSnapshot(null), UNDO_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [undoSnapshot])

  // Close mode selector on outside click or Escape
  useEffect(() => {
    if (!modeMenuOpen) return
    const handlePointerDown = (event: MouseEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(event.target as Node)
      ) {
        setModeMenuOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setModeMenuOpen(false)
        modeButtonRef.current?.focus()
      }
    }
    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [modeMenuOpen])

  // Scroll & focus when parent triggers "Kiểm tra nội dung khác"
  useEffect(() => {
    if (focusSignal <= 0) return
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    textareaRef.current?.focus()
  }, [focusSignal])

  const entities = useMemo(
    () => (activeTab === "TEXT" ? countMessageEntities(content) : null),
    [activeTab, content]
  )

  const inlineFormatError = useMemo(
    () => getInlineFormatError(content, activeTab),
    [activeTab, content]
  )

  const visibleInlineError = showInlineValidation ? inlineFormatError : null
  const canSubmit =
    Boolean(trimmedContent) &&
    !isLoading &&
    !quotaExhausted &&
    !(showInlineValidation && inlineFormatError)

  const applyInputChange = (nextValue: string) => {
    setClipboardError(null)
    if (nextValue.length > 0 && undoSnapshot) {
      setUndoSnapshot(null)
    }

    let targetTab = activeTab
    if (!manualModePinned) {
      targetTab = nextValue.trim() ? inferCheckTypeFromContent(nextValue) : "TEXT"
    }

    if (targetTab !== activeTab) {
      onDraftChange(targetTab, nextValue)
      onDraftChange(activeTab, "")
      onTabChange(targetTab)
    } else {
      onDraftChange(activeTab, nextValue)
    }

    if (showInlineValidation && !getInlineFormatError(nextValue, targetTab)) {
      setShowInlineValidation(false)
    }
  }

  const handleSelectMode = (nextMode: CheckType | "AUTO") => {
    setModeMenuOpen(false)
    setClipboardError(null)
    setShowInlineValidation(false)

    if (nextMode === "AUTO") {
      setManualModePinned(false)
      const inferred = trimmedContent
        ? inferCheckTypeFromContent(trimmedContent)
        : "TEXT"
      if (inferred !== activeTab) {
        onDraftChange(inferred, content)
        onDraftChange(activeTab, "")
        onTabChange(inferred)
      }
      textareaRef.current?.focus()
      return
    }

    setManualModePinned(true)
    if (nextMode !== activeTab) {
      // Carry current text along seamlessly if user switches mode manually
      if (content && !(drafts[nextMode] ?? "").trim()) {
        onDraftChange(nextMode, content)
        onDraftChange(activeTab, "")
      }
      onTabChange(nextMode)
    }
    textareaRef.current?.focus()
  }

  const handlePaste = async () => {
    setClipboardError(null)
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        applyInputChange(text)
        textareaRef.current?.focus()
      }
    } catch {
      setClipboardError(
        "Trình duyệt chưa cấp quyền đọc bộ nhớ tạm. Hãy bấm vào ô nhập và dán bằng Ctrl+V."
      )
    }
  }

  const handleClear = () => {
    if (!content) return
    setUndoSnapshot({ tab: activeTab, value: content })
    onDraftChange(activeTab, "")
    if (!manualModePinned && activeTab !== "TEXT") {
      onTabChange("TEXT")
    }
    setClipboardError(null)
    setShowInlineValidation(false)
    textareaRef.current?.focus()
  }

  const handleUndoClear = () => {
    if (!undoSnapshot) return
    onDraftChange(undoSnapshot.tab, undoSnapshot.value)
    if (undoSnapshot.tab !== activeTab) {
      onTabChange(undoSnapshot.tab)
    }
    setUndoSnapshot(null)
    window.requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const handleSelectScenario = (scenario: QuickScenario) => {
    setManualModePinned(false)
    setClipboardError(null)
    setShowInlineValidation(false)
    setUndoSnapshot(null)
    if (scenario.type !== activeTab) {
      onDraftChange(activeTab, "")
      onTabChange(scenario.type)
    }
    onDraftChange(scenario.type, scenario.sample)
    window.requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const triggerSubmit = () => {
    if (!trimmedContent || isLoading || quotaExhausted) return
    if (inlineFormatError) {
      setShowInlineValidation(true)
      return
    }
    onAnalyze(trimmedContent, activeTab)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    triggerSubmit()
  }

  const handleFieldKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Z on an empty box restores recently cleared text
    if (
      (e.ctrlKey || e.metaKey) &&
      e.key.toLowerCase() === "z" &&
      !content &&
      undoSnapshot
    ) {
      e.preventDefault()
      handleUndoClear()
      return
    }

    // Enter submits immediately for single-value modes (URL / PHONE / BANK_ACCOUNT)
    if (
      !tabMeta.isMultiline &&
      e.key === "Enter" &&
      !e.shiftKey &&
      !e.nativeEvent.isComposing
    ) {
      e.preventDefault()
      triggerSubmit()
      return
    }

    // Ctrl+Enter / Cmd+Enter submits from any mode (including multiline TEXT)
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault()
      triggerSubmit()
    }
  }

  const autoDetectedActive = !manualModePinned && Boolean(trimmedContent)
  const isMonoMode = activeTab === "PHONE" || activeTab === "BANK_ACCOUNT"
  const describedBy = [
    visibleInlineError ? errorId : null,
    tabMeta.scopeNote ? noteId : null,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className={cn(compact ? "space-y-2" : "space-y-4")}>
      {/* Two-Layer Tactile Bezel Shell */}
      <div
        className={cn(
          "rounded-2xl border transition-[border-color,box-shadow,background-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
          compact
            ? "border-black/10 bg-background/85 p-1 shadow-[0_12px_36px_rgb(15,23,42,0.14)] backdrop-blur-xl dark:border-white/12 dark:bg-card/85 dark:shadow-[0_16px_44px_rgb(0,0,0,0.58)]"
            : cn("p-1.5", theme.composerBezel),
          theme.composerFocus,
          visibleInlineError &&
            "border-rose-500/45 focus-within:border-rose-500/65 focus-within:shadow-[0_0_0_3px_rgba(244,63,94,0.14)]"
        )}
      >
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          aria-busy={isLoading}
          noValidate
          className={cn(
            "scroll-mt-24 rounded-xl border bg-card text-card-foreground transition-[border-color] duration-180 ease-[cubic-bezier(0.16,1,0.3,1)]",
            "border-black/8 dark:border-white/10 dark:bg-card/95 dark:shadow-[inset_0_1px_0_rgb(255,255,255,0.06)]",
            visibleInlineError && "border-rose-500/50"
          )}
        >
          <fieldset disabled={isLoading} className="min-w-0">
            <legend className="sr-only">Nhập nội dung cần kiểm tra lừa đảo</legend>

            {/* Main Seamless Prompt Area (Claude Web Style) */}
            <div
              className={cn(
                compact
                  ? "px-3.5 pt-3 pb-1.5 sm:px-4"
                  : "px-4 pt-4 pb-2 sm:px-5 sm:pt-5"
              )}
            >
              <label htmlFor={fieldId} className="sr-only">
                {tabMeta.label}
              </label>

              <textarea
                ref={textareaRef}
                id={fieldId}
                rows={compact ? 1 : 2}
                value={content}
                inputMode={tabMeta.inputMode}
                spellCheck={!isMonoMode && activeTab !== "URL"}
                onChange={(e) => applyInputChange(e.target.value)}
                onBlur={() => {
                  if (trimmedContent && inlineFormatError) {
                    setShowInlineValidation(true)
                  }
                }}
                onKeyDown={handleFieldKeyDown}
                aria-invalid={Boolean(visibleInlineError)}
                aria-describedby={describedBy || undefined}
                placeholder={
                  compact
                    ? "Dán tin nhắn, đường link, SĐT hoặc STK khác để kiểm tra tiếp…"
                    : manualModePinned
                      ? tabMeta.placeholder
                      : CHECK_TAB_META.TEXT.placeholder
                }
                className={cn(
                  "w-full resize-none bg-transparent text-sm leading-relaxed text-foreground caret-primary selection:bg-primary/15 placeholder:text-muted-foreground/75 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:text-[15px]",
                  isMonoMode && trimmedContent && "font-mono tracking-tight"
                )}
              />

            {/* Inline Status / Validation / Undo / Scope Messages */}
            <AnimatePresence initial={false}>
              {visibleInlineError && (
                <motion.p
                  key="inline-error"
                  id={errorId}
                  role="alert"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-2 flex items-start gap-2 text-xs font-medium text-rose-700 dark:text-rose-400"
                >
                  <WarningCircle
                    aria-hidden="true"
                    size={15}
                    weight="fill"
                    className="mt-0.5 shrink-0"
                  />
                  <span>{visibleInlineError}</span>
                </motion.p>
              )}

              {undoSnapshot && !content && (
                <motion.div
                  key="undo-bar"
                  role="status"
                  aria-live="polite"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2 text-xs text-foreground dark:border-white/10"
                >
                  <span>Đã xóa nội dung vừa nhập.</span>
                  <button
                    type="button"
                    onClick={handleUndoClear}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-background px-3 py-1 text-xs font-semibold text-foreground ring-1 ring-border transition-colors duration-120 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:ring-white/15"
                  >
                    <ArrowCounterClockwise
                      aria-hidden="true"
                      size={13}
                      weight="bold"
                    />
                    <span>Hoàn tác</span>
                  </button>
                </motion.div>
              )}

              {clipboardError && (
                <motion.p
                  key="clipboard-error"
                  role="alert"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="mt-2 flex items-start gap-2 text-xs font-medium text-rose-700 dark:text-rose-400"
                >
                  <WarningCircle
                    aria-hidden="true"
                    size={15}
                    weight="fill"
                    className="mt-0.5 shrink-0"
                  />
                  <span>{clipboardError}</span>
                </motion.p>
              )}

              {tabMeta.scopeNote && (
                <motion.p
                  key="scope-note"
                  id={noteId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="mt-2 flex items-start gap-2 text-xs text-muted-foreground"
                >
                  <Info
                    aria-hidden="true"
                    size={14}
                    weight="bold"
                    className="mt-0.5 shrink-0"
                  />
                  <span>{tabMeta.scopeNote}</span>
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Sleek Bottom Control Bar */}
          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-2",
              compact
                ? "px-3 pt-1 pb-2.5 sm:px-3.5"
                : "px-3 pt-2 pb-3 sm:px-4 sm:pb-4"
            )}
          >
            {/* Left Controls: Auto-Detected Mode Pill + Paste / Clear + Entity Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <div ref={menuContainerRef} className="relative">
                <button
                  ref={modeButtonRef}
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={modeMenuOpen}
                  aria-controls={menuId}
                  onClick={() => setModeMenuOpen((prev) => !prev)}
                  className={cn(
                    "inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-[background-color,border-color,color] duration-120 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50",
                    autoDetectedActive && activeTab !== "TEXT"
                      ? theme.modeActiveChip
                      : "border-border bg-muted/50 text-foreground hover:bg-muted dark:border-white/10"
                  )}
                >
                  <ActiveIcon
                    aria-hidden="true"
                    size={15}
                    weight="fill"
                    className={cn(
                      "shrink-0",
                      autoDetectedActive && activeTab !== "TEXT"
                        ? "text-sky-600 dark:text-sky-300"
                        : "text-primary"
                    )}
                  />
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={`${activeTab}-${manualModePinned}`}
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -3 }}
                      transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                      className="whitespace-nowrap"
                    >
                      {autoDetectedActive && activeTab !== "TEXT"
                        ? `Tự nhận diện: ${tabMeta.shortLabel}`
                        : tabMeta.shortLabel}
                    </motion.span>
                  </AnimatePresence>
                  <CaretDown
                    aria-hidden="true"
                    size={12}
                    weight="bold"
                    className={cn(
                      "text-muted-foreground transition-transform duration-150",
                      modeMenuOpen && "rotate-180"
                    )}
                  />
                </button>

                {/* Spring Mode Selector Popover (opens upward when docked at bottom) */}
                <AnimatePresence>
                  {modeMenuOpen && (
                    <motion.div
                      id={menuId}
                      role="listbox"
                      aria-label="Chọn loại nội dung kiểm tra"
                      initial={{ opacity: 0, y: compact ? 6 : -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: compact ? 4 : -4, scale: 0.98 }}
                      transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                      className={cn(
                        "absolute left-0 z-40 w-72 overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg dark:border-white/12",
                        compact ? "bottom-full mb-2" : "top-full mt-2"
                      )}
                    >
                      <button
                        type="button"
                        role="option"
                        aria-selected={!manualModePinned}
                        onClick={() => handleSelectMode("AUTO")}
                        className={cn(
                          "flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors duration-120 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring",
                          !manualModePinned && "bg-muted/70"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Sparkle
                            aria-hidden="true"
                            size={15}
                            weight="fill"
                            className="text-sky-600 dark:text-sky-400"
                          />
                          <div>
                            <p className="font-semibold text-foreground">
                              Tự động nhận diện
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Tự phân loại khi bạn dán nội dung
                            </p>
                          </div>
                        </div>
                        {!manualModePinned && (
                          <Check
                            aria-hidden="true"
                            size={14}
                            weight="bold"
                            className="shrink-0 text-primary"
                          />
                        )}
                      </button>

                      <div className="my-1 h-px bg-border/80 dark:bg-white/10" />

                      {CHECK_TAB_ORDER.map((type) => {
                        const Icon = TAB_ICONS[type]
                        const meta = CHECK_TAB_META[type]
                        const selected = manualModePinned && activeTab === type
                        return (
                          <button
                            key={type}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onClick={() => handleSelectMode(type)}
                            className={cn(
                              "flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors duration-120 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring",
                              selected && "bg-muted/70"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <Icon
                                aria-hidden="true"
                                size={15}
                                weight={selected ? "fill" : "regular"}
                                className="shrink-0 text-muted-foreground"
                              />
                              <div>
                                <p className="font-semibold text-foreground">
                                  {meta.label}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {MODE_DESCRIPTIONS[type]}
                                </p>
                              </div>
                            </div>
                            {selected && (
                              <Check
                                aria-hidden="true"
                                size={14}
                                weight="bold"
                                className="shrink-0 text-primary"
                              />
                            )}
                          </button>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                type="button"
                onClick={() => void handlePaste()}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-muted-foreground transition-[color,background-color] duration-120 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ClipboardText aria-hidden="true" size={15} weight="bold" />
                <span>Dán</span>
                <kbd className="ml-0.5 hidden rounded border border-border/90 bg-muted/80 px-1.5 py-0.5 font-mono text-xs leading-none text-muted-foreground shadow-[0_1px_0_rgba(15,23,42,0.12)] sm:inline-block dark:border-white/15 dark:bg-white/[0.06] dark:shadow-[0_1px_0_rgba(0,0,0,0.45)]">
                  Ctrl V
                </kbd>
              </button>

              <AnimatePresence initial={false}>
                {content.length > 0 && (
                  <motion.button
                    key="clear-btn"
                    type="button"
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    transition={{ duration: 0.12 }}
                    onClick={handleClear}
                    className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-[color,background-color] duration-120 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <Trash aria-hidden="true" size={15} weight="bold" />
                    <span className="hidden sm:inline">Xóa</span>
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Live Detected Entity Chips (only when detected in message text) */}
              {activeTab === "TEXT" &&
                entities &&
                (entities.urls > 0 || entities.phones > 0) && (
                  <div
                    role="status"
                    aria-atomic="true"
                    className="hidden items-center gap-1.5 text-xs tabular-nums sm:flex"
                  >
                    {entities.urls > 0 && (
                      <span className="rounded-md bg-sky-500/10 px-2 py-0.5 font-medium whitespace-nowrap text-sky-800 dark:bg-sky-500/15 dark:text-sky-300">
                        {entities.urls} liên kết
                      </span>
                    )}
                    {entities.phones > 0 && (
                      <span className="rounded-md bg-amber-500/10 px-2 py-0.5 font-medium whitespace-nowrap text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                        {entities.phones} SĐT
                      </span>
                    )}
                  </div>
                )}
            </div>

            {/* Right Controls: Inline Quota Badge + Tactile Shortcut Keycap + Send Button */}
            <div className="ml-auto flex items-center gap-2">
              {onRefreshQuota && (
                <ScamQuotaBadge
                  quota={quota}
                  isLoading={quotaLoading}
                  isBusy={isLoading}
                  error={quotaError}
                  onRefresh={onRefreshQuota}
                />
              )}

              {!compact && (
                <span
                  aria-hidden="true"
                  className="hidden items-center gap-1 text-xs text-muted-foreground md:inline-flex"
                >
                  {tabMeta.isMultiline ? (
                    <>
                      <kbd className="rounded border border-border/90 bg-muted/80 px-1.5 py-0.5 font-mono text-xs leading-none text-muted-foreground shadow-[0_1px_0_rgba(15,23,42,0.12)] dark:border-white/15 dark:bg-white/[0.06] dark:shadow-[0_1px_0_rgba(0,0,0,0.45)]">
                        Ctrl
                      </kbd>
                      <span>+</span>
                      <kbd className="rounded border border-border/90 bg-muted/80 px-1.5 py-0.5 font-mono text-xs leading-none text-muted-foreground shadow-[0_1px_0_rgba(15,23,42,0.12)] dark:border-white/15 dark:bg-white/[0.06] dark:shadow-[0_1px_0_rgba(0,0,0,0.45)]">
                        Enter
                      </kbd>
                    </>
                  ) : (
                    <kbd className="rounded border border-border/90 bg-muted/80 px-1.5 py-0.5 font-mono text-xs leading-none text-muted-foreground shadow-[0_1px_0_rgba(15,23,42,0.12)] dark:border-white/15 dark:bg-white/[0.06] dark:shadow-[0_1px_0_rgba(0,0,0,0.45)]">
                      Enter
                    </kbd>
                  )}
                </span>
              )}

              <motion.button
                type="submit"
                disabled={!canSubmit}
                whileHover={canSubmit ? { scale: 1.02 } : undefined}
                whileTap={canSubmit ? { scale: 0.96 } : undefined}
                transition={{ type: "spring", stiffness: 450, damping: 28 }}
                title={
                  quotaExhausted
                    ? "Bạn đã dùng hết lượt kiểm tra hôm nay"
                    : !trimmedContent
                      ? "Dán hoặc nhập nội dung để kiểm tra"
                      : `${tabMeta.submitLabel} (${tabMeta.isMultiline ? "Ctrl+Enter" : "Enter"})`
                }
                aria-label={
                  isLoading
                    ? tabMeta.loadingLabel
                    : quotaExhausted
                      ? "Hết lượt hôm nay"
                      : tabMeta.submitLabel
                }
                className={cn(
                  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full text-sm font-semibold transition-[background-color,color,opacity,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed",
                  compact ? "h-9 px-4" : "h-10 px-5",
                  canSubmit
                    ? theme.ctaButton
                    : "bg-muted text-muted-foreground opacity-70"
                )}
              >
                {isLoading ? (
                  <span
                    aria-hidden="true"
                    className="inline-flex motion-safe:animate-spin"
                  >
                    <CircleNotch size={16} weight="bold" />
                  </span>
                ) : (
                  <ArrowUp aria-hidden="true" size={16} weight="bold" />
                )}
                <span>
                  {isLoading
                    ? tabMeta.loadingLabel
                    : quotaExhausted
                      ? "Hết lượt"
                      : tabMeta.submitLabel}
                </span>
              </motion.button>
            </div>
          </div>
        </fieldset>
      </form>
      </div>

      {/* Compact 1-Click Starter Pills (Classic Pill Layout, Idle Only) */}
      <AnimatePresence initial={false}>
        {showStarterChips && !compact && !trimmedContent && !isLoading && (
          <motion.div
            key="starter-chips"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap items-center justify-center gap-2"
          >
            <span className="text-xs font-medium text-muted-foreground">
              Thử nhanh:
            </span>
            {QUICK_SCENARIOS.map((scenario, idx) => {
              const Icon = TAB_ICONS[scenario.type]
              return (
                <motion.button
                  key={scenario.id}
                  type="button"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.16,
                    delay: idx * 0.03,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleSelectScenario(scenario)}
                  className={cn(
                    "inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-black/10 bg-white/85 px-3.5 py-1.5 text-xs font-medium text-foreground/80 shadow-2xs transition-[border-color,color,background-color] duration-120 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/12 dark:bg-card/85 dark:text-foreground/85",
                    theme.pillHover
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    size={14}
                    weight="bold"
                    className={cn("shrink-0", theme.pillIcon)}
                  />
                  <span className="whitespace-nowrap">{scenario.label}</span>
                </motion.button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
